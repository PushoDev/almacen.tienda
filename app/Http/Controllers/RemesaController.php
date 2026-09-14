<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Cuenta;
use App\Models\Moneda;
use App\Models\Proveedor;
use App\Models\Remesa;
use App\Models\User;
use App\Notifications\RemesaNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class RemesaController extends Controller
{
    /**
     * Lista fija de motivos de anulación — misma lista que
     * TransaccionController::MOTIVOS_ANULACION, duplicada a propósito (sin abstracción
     * compartida entre módulos de anulación en este proyecto, ver Compra/Venta).
     */
    public const MOTIVOS_ANULACION = ['error_monto', 'error_entidad', 'duplicado', 'error_tipo_operacion', 'solicitud_cliente', 'otros'];

    /**
     * Datos para el formulario de Remesa (admin/moderador ven todas las cuentas —
     * la ruta ya está gateada al middleware 'admin', no hay restricción de vendedor aquí).
     */
    public function formData()
    {
        return response()->json([
            'cuentas' => Cuenta::with('moneda')->get(),
            'clientes' => Cliente::all(),
            'proveedores' => Proveedor::all(),
        ]);
    }

    public function show(Remesa $remesa)
    {
        $remesa->load([
            'user',
            'turnoVendedor',
            'entradaCuenta.moneda',
            'entradaCliente',
            'entradaProveedor',
            'salidaCuenta.moneda',
            'salidaCliente',
            'salidaProveedor',
            'mensajeroCuenta.moneda',
        ]);

        $detallesEntrada = [
            'tipo' => $remesa->entrada_tipo,
            'nombre' => $remesa->nombre_entrada,
            'moneda' => $remesa->entrada_moneda,
            'monto_operacion' => (float) $remesa->entrada_monto,
            'saldo_anterior' => (float) $remesa->entrada_saldo_anterior,
            'saldo_posterior' => (float) $remesa->entrada_saldo_posterior,
            'saldo_actual' => $this->saldoActualEntidad($remesa->entrada_tipo, $remesa->entradaCuenta, $remesa->entradaCliente, $remesa->entradaProveedor),
        ];

        $detallesSalida = [
            'tipo' => $remesa->salida_tipo,
            'nombre' => $remesa->nombre_salida,
            'moneda' => $remesa->salida_moneda,
            'monto_operacion' => -1 * abs((float) $remesa->salida_monto),
            'saldo_anterior' => (float) $remesa->salida_saldo_anterior,
            'saldo_posterior' => (float) $remesa->salida_saldo_posterior,
            'saldo_actual' => $this->saldoActualEntidad($remesa->salida_tipo, $remesa->salidaCuenta, $remesa->salidaCliente, $remesa->salidaProveedor),
        ];

        $detallesMensajero = null;
        if ($remesa->mensajero_cuenta_id) {
            $detallesMensajero = [
                'tipo' => 'cuenta',
                'nombre' => $remesa->mensajeroCuenta?->nombre_cuenta,
                'moneda' => $remesa->mensajero_moneda,
                'monto_operacion' => -1 * abs((float) $remesa->mensajero_monto),
                'saldo_anterior' => (float) $remesa->mensajero_saldo_anterior,
                'saldo_posterior' => (float) $remesa->mensajero_saldo_posterior,
                'saldo_actual' => $remesa->mensajeroCuenta?->saldo_cuenta !== null ? (float) $remesa->mensajeroCuenta->saldo_cuenta : null,
            ];
        }

        return Inertia::render('Transacciones/RemesaShow', [
            'remesa' => $remesa,
            'detallesEntrada' => $detallesEntrada,
            'detallesSalida' => $detallesSalida,
            'detallesMensajero' => $detallesMensajero,
        ]);
    }

    /**
     * Saldo actual (en vivo) de la entidad involucrada, según su tipo — para detectar en
     * el detalle si hubo movimientos posteriores a esta remesa (mismo criterio que
     * TransaccionController::show()).
     */
    private function saldoActualEntidad(string $tipo, ?Cuenta $cuenta, ?Cliente $cliente, ?Proveedor $proveedor): ?float
    {
        return match ($tipo) {
            'cuenta' => $cuenta?->saldo_cuenta !== null ? (float) $cuenta->saldo_cuenta : null,
            'cliente' => $cliente?->deuda_pago_cliente !== null ? (float) $cliente->deuda_pago_cliente : null,
            'proveedor' => $proveedor?->saldo_proveedor !== null ? (float) $proveedor->saldo_proveedor : null,
            default => null,
        };
    }

    /**
     * Anula una Remesa — revierte las 3 patas (entrada/salida/mensajero) y marca
     * `estado='anulada'` con motivo obligatorio. Admin/moderador-only, igual que el
     * resto de esta feature (la ruta ya está gateada al middleware 'admin').
     */
    public function anular(Request $request, Remesa $remesa)
    {
        if ($remesa->estado === 'anulada') {
            return back()->withErrors(['estado' => 'Esta remesa ya está anulada.']);
        }

        $request->validate([
            'motivo_anulacion' => 'required|string|in:'.implode(',', self::MOTIVOS_ANULACION),
            'detalle_anulacion' => 'required_if:motivo_anulacion,otros|nullable|string|max:1000',
        ]);

        DB::transaction(function () use ($remesa, $request) {
            $entrada = $this->resolverEntidad($remesa->entrada_tipo, $this->idEntidad($remesa, 'entrada'));
            $this->aplicarEgreso($entrada, $remesa->entrada_tipo, (float) $remesa->entrada_monto);

            $salida = $this->resolverEntidad($remesa->salida_tipo, $this->idEntidad($remesa, 'salida'));
            $this->aplicarIngreso($salida, $remesa->salida_tipo, (float) $remesa->salida_monto);

            if ($remesa->mensajero_cuenta_id) {
                $mensajeroCuenta = Cuenta::lockForUpdate()->findOrFail($remesa->mensajero_cuenta_id);
                $mensajeroCuenta->increment('saldo_cuenta', (float) $remesa->mensajero_monto);
            }

            $remesa->update([
                'estado' => 'anulada',
                'motivo_anulacion' => $request->motivo_anulacion,
                'detalle_anulacion' => $request->detalle_anulacion,
            ]);
        });

        $this->notificarAdminModerador($remesa->fresh(['user', 'mensajeroCuenta']), anulada: true);

        return Redirect::route('transacciones.remesa.show', $remesa->id)->with('success', 'Remesa anulada con éxito.');
    }

    /**
     * Notifica por Telegram (y base de datos) a admin/moderador — única audiencia real de
     * Remesa en todo el sistema, ver RemesaNotification::via() para el chequeo de rol.
     */
    private function notificarAdminModerador(Remesa $remesa, bool $anulada): void
    {
        try {
            $usuarios = User::whereIn('role', ['admin', 'moderador'])->get();
            Notification::send($usuarios, new RemesaNotification($remesa, $anulada));
        } catch (\Exception $e) {
            Log::error('Error enviando notificación de remesa: '.$e->getMessage());
        }
    }

    /**
     * Id de la entidad de entrada/salida de una Remesa, según su tipo — helper para
     * anular(), que necesita volver a resolver la entidad real (con lockForUpdate) a
     * partir de las 3 columnas FK posibles.
     */
    private function idEntidad(Remesa $remesa, string $lado): int
    {
        $tipo = $lado === 'entrada' ? $remesa->entrada_tipo : $remesa->salida_tipo;

        return match ($tipo) {
            'cuenta' => $lado === 'entrada' ? $remesa->entrada_cuenta_id : $remesa->salida_cuenta_id,
            'cliente' => $lado === 'entrada' ? $remesa->entrada_cliente_id : $remesa->salida_cliente_id,
            'proveedor' => $lado === 'entrada' ? $remesa->entrada_proveedor_id : $remesa->salida_proveedor_id,
        };
    }

    public function store(Request $request)
    {
        $monedasValidas = $this->obtenerCodigosMonedasActivas();

        $request->validate([
            'entrada_tipo' => 'required|string|in:cuenta,cliente,proveedor',
            'entrada_id' => 'required|integer',
            'entrada_monto' => 'required|numeric|min:0.01',
            'salida_tipo' => 'required|string|in:cuenta,cliente,proveedor',
            'salida_id' => 'required|integer',
            'salida_monto' => 'required|numeric|min:0.01',
            'mensajero_cuenta_id' => 'nullable|integer|exists:cuentas,id|required_with:mensajero_monto',
            'mensajero_monto' => 'nullable|numeric|min:0.01|required_with:mensajero_cuenta_id',
            'notas' => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();

        try {
            $entrada = $this->resolverEntidad($request->entrada_tipo, $request->entrada_id);
            $salida = $this->resolverEntidad($request->salida_tipo, $request->salida_id);

            $entradaSaldoAnterior = $this->saldoDeEntidad($entrada, $request->entrada_tipo);
            $this->aplicarIngreso($entrada, $request->entrada_tipo, $request->entrada_monto);
            $entradaSaldoPosterior = $entradaSaldoAnterior + $request->entrada_monto;

            $salidaSaldoAnterior = $this->saldoDeEntidad($salida, $request->salida_tipo);
            $this->aplicarEgreso($salida, $request->salida_tipo, $request->salida_monto);
            $salidaSaldoPosterior = $salidaSaldoAnterior - $request->salida_monto;

            $remesaData = [
                'user_id' => auth()->id(),
                'turno_vendedor_id' => auth()->user()->turnoActivo()?->id,
                'entrada_tipo' => $request->entrada_tipo,
                'entrada_cuenta_id' => $request->entrada_tipo === 'cuenta' ? $entrada->id : null,
                'entrada_cliente_id' => $request->entrada_tipo === 'cliente' ? $entrada->id : null,
                'entrada_proveedor_id' => $request->entrada_tipo === 'proveedor' ? $entrada->id : null,
                'entrada_monto' => $request->entrada_monto,
                'entrada_moneda' => $this->monedaDeEntidad($entrada, $request->entrada_tipo),
                'entrada_saldo_anterior' => $entradaSaldoAnterior,
                'entrada_saldo_posterior' => $entradaSaldoPosterior,
                'salida_tipo' => $request->salida_tipo,
                'salida_cuenta_id' => $request->salida_tipo === 'cuenta' ? $salida->id : null,
                'salida_cliente_id' => $request->salida_tipo === 'cliente' ? $salida->id : null,
                'salida_proveedor_id' => $request->salida_tipo === 'proveedor' ? $salida->id : null,
                'salida_monto' => $request->salida_monto,
                'salida_moneda' => $this->monedaDeEntidad($salida, $request->salida_tipo),
                'salida_saldo_anterior' => $salidaSaldoAnterior,
                'salida_saldo_posterior' => $salidaSaldoPosterior,
                'notas' => $request->notas,
                'fecha_operacion' => now(),
            ];

            if ($request->filled('mensajero_cuenta_id')) {
                $mensajeroCuenta = Cuenta::with('moneda')->lockForUpdate()->findOrFail($request->mensajero_cuenta_id);

                $mensajeroSaldoAnterior = (float) $mensajeroCuenta->saldo_cuenta;
                $mensajeroCuenta->decrement('saldo_cuenta', $request->mensajero_monto);
                $mensajeroSaldoPosterior = $mensajeroSaldoAnterior - $request->mensajero_monto;

                $remesaData['mensajero_cuenta_id'] = $mensajeroCuenta->id;
                $remesaData['mensajero_monto'] = $request->mensajero_monto;
                $remesaData['mensajero_moneda'] = $mensajeroCuenta->moneda->codigo_moneda;
                $remesaData['mensajero_saldo_anterior'] = $mensajeroSaldoAnterior;
                $remesaData['mensajero_saldo_posterior'] = $mensajeroSaldoPosterior;
            }

            $remesa = Remesa::create($remesaData);

            DB::commit();

            $this->notificarAdminModerador($remesa->load(['user', 'mensajeroCuenta']), anulada: false);

            return Redirect::route('transacciones.remesa.show', $remesa->id)
                ->with('success', "Remesa registrada con éxito (Entrada: {$request->entrada_monto} {$remesa->entrada_moneda}, Salida: {$request->salida_monto} {$remesa->salida_moneda}).");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar remesa: '.$e->getMessage());
            throw ValidationException::withMessages(['message' => [$e->getMessage()]]);
        }
    }

    private function obtenerCodigosMonedasActivas(): array
    {
        return Moneda::where('estado', true)
            ->pluck('codigo_moneda')
            ->unique()
            ->toArray();
    }

    private function resolverEntidad(string $tipo, int $id)
    {
        return match ($tipo) {
            'cuenta' => Cuenta::with('moneda')->lockForUpdate()->findOrFail($id),
            'cliente' => Cliente::lockForUpdate()->findOrFail($id),
            'proveedor' => Proveedor::lockForUpdate()->findOrFail($id),
            default => throw new \Exception("Tipo de entidad no válido: {$tipo}"),
        };
    }

    private function monedaDeEntidad($entidad, string $tipo): string
    {
        return $tipo === 'cuenta' ? $entidad->moneda->codigo_moneda : 'USD';
    }

    private function saldoDeEntidad($entidad, string $tipo): float
    {
        return (float) match ($tipo) {
            'cuenta' => $entidad->saldo_cuenta,
            'cliente' => $entidad->deuda_pago_cliente,
            'proveedor' => $entidad->saldo_proveedor,
        };
    }

    private function aplicarIngreso($entidad, string $tipo, float $monto): void
    {
        match ($tipo) {
            'cuenta' => $entidad->increment('saldo_cuenta', $monto),
            'cliente' => $entidad->increment('deuda_pago_cliente', $monto),
            'proveedor' => $entidad->increment('saldo_proveedor', $monto),
        };
    }

    private function aplicarEgreso($entidad, string $tipo, float $monto): void
    {
        match ($tipo) {
            'cuenta' => $entidad->decrement('saldo_cuenta', $monto),
            'cliente' => $entidad->decrement('deuda_pago_cliente', $monto),
            'proveedor' => $entidad->decrement('saldo_proveedor', $monto),
        };
    }
}
