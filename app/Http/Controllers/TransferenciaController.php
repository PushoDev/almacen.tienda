<?php

namespace App\Http\Controllers;

use App\Models\Cuenta;
use App\Models\Cliente;
use App\Models\Proveedor;
use App\Models\Moneda;
use App\Models\MovimientoFinanciero;
use App\Notifications\MovimientoFinancieroNotification;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\ValidationException;

class TransferenciaController extends Controller
{
    public function formData()
    {
        if (auth()->user()->role === 'vendedor') {
            $cuentasOrigen = auth()->user()->cuentas()->with('moneda')->get();
        } else {
            $cuentasOrigen = Cuenta::with('moneda')->get();
        }
        $cuentasDestino = $cuentasOrigen;
        $clientes = Cliente::all();
        $proveedores = Proveedor::all();
        $monedasActivas = Moneda::where('estado', true)->get();

        return response()->json([
            'cuentasOrigen' => $cuentasOrigen,
            'cuentasDestino' => $cuentasDestino,
            'clientes' => $clientes,
            'proveedores' => $proveedores,
            'monedasActivas' => $monedasActivas,
        ]);
    }

    public function store(Request $request)
    {
        $monedasValidas = $this->obtenerCodigosMonedasActivas();

        $request->validate([
            'origen_tipo' => 'required|string|in:cuenta,cliente',
            'origen_id' => 'required|integer',
            'destino_tipo' => 'required|string|in:cuenta,cliente,proveedor',
            'destino_id' => 'required|integer',
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|string|in:' . implode(',', $monedasValidas),
            'comentario' => 'nullable|string|max:255',
            'tasa_cambio_aplicada' => 'nullable|numeric|min:0.0001',
        ]);

        if ($request->origen_tipo === $request->destino_tipo && (int)$request->origen_id === (int)$request->destino_id) {
            return Redirect::back()->withErrors([
                'destino_id' => 'El origen y el destino no pueden ser la misma entidad.'
            ])->withInput();
        }

        DB::beginTransaction();

        try {
            $origen = $this->obtenerEntidadConMoneda($request->origen_tipo, $request->origen_id);
            $destino = $this->obtenerEntidadConMoneda($request->destino_tipo, $request->destino_id);

            $this->validarAccesoVendedor($origen, $request->origen_tipo);

            if (auth()->user()->role === 'vendedor' && $request->destino_tipo === 'cuenta') {
                $cuentasAsignadas = auth()->user()->cuentas()->pluck('id')->toArray();
                if (!in_array((int)$request->destino_id, $cuentasAsignadas)) {
                    throw new \Exception('No tiene permiso para transferir a esta cuenta.');
                }
            }

            $monedaOrigen = $this->obtenerMonedaEntidad($origen, $request->origen_tipo);
            $monedaDestino = $this->obtenerMonedaEntidad($destino, $request->destino_tipo);

            if ($monedaOrigen->codigo_moneda !== $request->moneda) {
                throw new \Exception("La moneda del origen ({$monedaOrigen->codigo_moneda}) no coincide con la moneda de la transacción ({$request->moneda}).");
            }

            $montoOrigen = (float)$request->monto;
            $montoDestino = $this->calcularMontoConvertido($montoOrigen, $monedaOrigen, $monedaDestino, $request->tasa_cambio_aplicada, $request->origen_tipo, $request->destino_tipo);
            $tasaCambioAplicada = $this->obtenerTasaCambioFinal($monedaOrigen, $monedaDestino, $request->tasa_cambio_aplicada, $request->origen_tipo, $request->destino_tipo);

            // Ganancia/pérdida cambiaria: si la tasa aplicada le da al destino MÁS de
            // lo que le hubiera dado la tasa oficial, la agencia entregó de más → eso
            // es una PÉRDIDA (negativo). Si le da MENOS, la agencia se quedó con la
            // diferencia → GANANCIA (positivo). Por eso es "oficial − real", no al
            // revés. Mismo sentido que VentaController usa para su propia
            // ganancia_perdida_cambiaria (verificado con un ejemplo numérico antes de
            // aplicar). Solo tiene sentido cuando hay conversión de moneda real — para
            // el resto da 0 de forma natural.
            $montoDestinoOficial = $this->calcularMontoConvertido($montoOrigen, $monedaOrigen, $monedaDestino, null, $request->origen_tipo, $request->destino_tipo);
            $tasaOficialEnMomento = $this->obtenerTasaCambioFinal($monedaOrigen, $monedaDestino, null, $request->origen_tipo, $request->destino_tipo);
            $diferenciaMonedaDestino = $montoDestinoOficial - $montoDestino;
            $tasaUsdMonedaDestino = $monedaDestino->codigo_moneda === 'USD' ? 1.0 : (float) $monedaDestino->tasa_cambio;
            $gananciaPerdidaCambiaria = $tasaUsdMonedaDestino > 0
                ? round($diferenciaMonedaDestino / $tasaUsdMonedaDestino, 2)
                : 0.0;

            $saldoAnteriorOrigen = $this->obtenerSaldoEntidad($origen, $request->origen_tipo);
            $saldoAnteriorDestino = $this->obtenerSaldoEntidad($destino, $request->destino_tipo);

            $this->realizarDebito($origen, $request->origen_tipo, $montoOrigen);
            $this->realizarCredito($destino, $request->destino_tipo, $montoDestino);

            $saldoPosteriorOrigen = $saldoAnteriorOrigen - $montoOrigen;
            $saldoPosteriorDestino = $saldoAnteriorDestino + $montoDestino;

            $origenNombre = $this->obtenerNombreEntidad($origen, $request->origen_tipo);
            $destinoNombre = $this->obtenerNombreEntidad($destino, $request->destino_tipo);

            $movimiento = MovimientoFinanciero::create([
                'user_id' => auth()->id(),
                'tipo_movimiento_id' => 3,
                'cuenta_origen_id' => $request->origen_tipo === 'cuenta' ? $origen->id : null,
                'cliente_origen_id' => $request->origen_tipo === 'cliente' ? $origen->id : null,
                'cuenta_destino_id' => $request->destino_tipo === 'cuenta' ? $destino->id : null,
                'cliente_destino_id' => $request->destino_tipo === 'cliente' ? $destino->id : null,
                'proveedor_destino_id' => $request->destino_tipo === 'proveedor' ? $destino->id : null,
                'monto' => $montoOrigen,
                'moneda' => $request->moneda,
                'tasa_cambio_aplicada' => $tasaCambioAplicada,
                'tasa_oficial_en_momento' => $tasaOficialEnMomento,
                'ganancia_perdida_cambiaria' => $gananciaPerdidaCambiaria,
                'descripcion' => $request->comentario ?? "Transferencia: {$montoOrigen} {$monedaOrigen->codigo_moneda} → {$montoDestino} {$monedaDestino->codigo_moneda} ({$origenNombre} → {$destinoNombre})",
                'fecha_operacion' => now(),
                'estado' => 'completado',
                'saldo_anterior_origen' => $saldoAnteriorOrigen,
                'saldo_posterior_origen' => $saldoPosteriorOrigen,
                'moneda_origen' => $monedaOrigen->codigo_moneda,
                'saldo_anterior_destino' => $saldoAnteriorDestino,
                'saldo_posterior_destino' => $saldoPosteriorDestino,
                'moneda_destino' => $monedaDestino->codigo_moneda,
            ]);

            DB::commit();

            try {
                $notificationService = new NotificationService();
                $datosNotificacion = $notificationService->prepararDatosTransferencia($movimiento);
                $usuariosParaNotificar = $notificationService->getUsuariosParaNotificar($datosNotificacion);

                Log::info('Usuarios para notificar (transferencia): ' . $usuariosParaNotificar->pluck('id')->implode(','));

                $movimiento->load(['user', 'cuentaOrigen', 'cuentaDestino', 'clienteOrigen', 'clienteDestino', 'proveedorDestino']);

                Notification::send($usuariosParaNotificar, new MovimientoFinancieroNotification($movimiento, 'transferencia'));
            } catch (\Exception $e) {
                Log::error('Error enviando notificación de transferencia: ' . $e->getMessage());
            }

            $mensajeExito = $monedaOrigen->codigo_moneda === $monedaDestino->codigo_moneda
                ? "✅ Transferencia de {$montoOrigen} {$monedaOrigen->codigo_moneda} registrada con éxito."
                : "✅ Transferencia de {$montoOrigen} {$monedaOrigen->codigo_moneda} → {$montoDestino} {$monedaDestino->codigo_moneda} registrada con éxito (Tasa: {$tasaCambioAplicada}).";

            return Redirect::route('transacciones.show', $movimiento->id)->with('success', $mensajeExito);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar transferencia: ' . $e->getMessage());
            throw ValidationException::withMessages(['message' => [$e->getMessage()]]);
        }
    }

    // --- Helpers de monedas ---

    private function obtenerCodigosMonedasActivas(): array
    {
        return Moneda::where('estado', true)
            ->pluck('codigo_moneda')
            ->unique()
            ->toArray();
    }

    private function obtenerMonedaPorCodigo(string $codigo): Moneda
    {
        $moneda = Moneda::where('codigo_moneda', $codigo)
            ->where('estado', true)
            ->orderBy('tasa_cambio', 'desc')
            ->first();

        if (!$moneda) {
            throw new \Exception("La moneda {$codigo} no está disponible o no existe.");
        }

        return $moneda;
    }

    // --- Helpers de entidades ---

    private function obtenerEntidadConMoneda(string $tipo, int $id)
    {
        switch ($tipo) {
            case 'cuenta':
                return Cuenta::with('moneda')->lockForUpdate()->findOrFail($id);
            case 'cliente':
                return Cliente::lockForUpdate()->findOrFail($id);
            case 'proveedor':
                return Proveedor::lockForUpdate()->findOrFail($id);
            default:
                throw new \Exception("Tipo de entidad no válido: {$tipo}");
        }
    }

    private function obtenerMonedaEntidad($entidad, string $tipo): Moneda
    {
        switch ($tipo) {
            case 'cuenta':
                return $entidad->moneda;
            case 'cliente':
            case 'proveedor':
                return $this->obtenerMonedaPorCodigo('USD');
            default:
                throw new \Exception("Tipo de entidad no válido para obtener moneda: {$tipo}");
        }
    }

    private function obtenerSaldoEntidad($entidad, string $tipo): float
    {
        switch ($tipo) {
            case 'cuenta':
                return (float)$entidad->saldo_cuenta;
            case 'cliente':
                return (float)$entidad->deuda_pago_cliente;
            case 'proveedor':
                return (float)$entidad->saldo_proveedor;
            default:
                return 0.0;
        }
    }

    private function obtenerNombreEntidad($entidad, string $tipo): string
    {
        switch ($tipo) {
            case 'cuenta':
                return "Cuenta: {$entidad->nombre_cuenta}";
            case 'cliente':
                return "Cliente: {$entidad->nombre_cliente}";
            case 'proveedor':
                return "Proveedor: {$entidad->nombre_proveedor}";
            default:
                return "Entidad desconocida";
        }
    }

    // --- Validaciones ---

    private function validarAccesoVendedor($entidad, string $tipo): void
    {
        if (auth()->user()->role === 'vendedor' && $tipo === 'cuenta') {
            $cuentasAsignadas = auth()->user()->cuentas()->pluck('id')->toArray();
            if (!in_array($entidad->id, $cuentasAsignadas)) {
                throw new \Exception('No tiene permiso para operar con esta cuenta.');
            }
            if (($entidad->tipo_titular ?? '__sin_asignar__') !== 'personal') {
                throw new \Exception('No puede usar una cuenta externa o sin asignar como origen.');
            }
        }
    }

    // --- Operaciones de saldo ---

    private function realizarDebito($entidad, string $tipo, float $monto): void
    {
        switch ($tipo) {
            case 'cuenta':
                $entidad->decrement('saldo_cuenta', $monto);
                break;
            case 'cliente':
                $entidad->decrement('deuda_pago_cliente', $monto);
                break;
        }
    }

    private function realizarCredito($entidad, string $tipo, float $monto): void
    {
        switch ($tipo) {
            case 'cuenta':
                $entidad->increment('saldo_cuenta', $monto);
                break;
            case 'cliente':
                $entidad->increment('deuda_pago_cliente', $monto);
                break;
            case 'proveedor':
                $entidad->increment('saldo_proveedor', $monto);
                break;
        }
    }

    // --- Cálculos de tasas ---

    private function calcularMontoConvertido(float $montoOrigen, Moneda $monedaOrigen, Moneda $monedaDestino, ?float $tasaPersonalizada, string $origenTipo, string $destinoTipo): float
    {
        $origenEsCuenta = $origenTipo === 'cuenta';
        $destinoEsCuenta = $destinoTipo === 'cuenta';

        if ($monedaOrigen->codigo_moneda === $monedaDestino->codigo_moneda) {
            return $montoOrigen;
        }

        if (!$origenEsCuenta && !$destinoEsCuenta) {
            return $montoOrigen;
        }

        $tasaOrigen = $origenEsCuenta ? $monedaOrigen->tasa_cambio : 1.0;
        $tasaDestino = $destinoEsCuenta ? $monedaDestino->tasa_cambio : 1.0;

        if ($tasaOrigen <= 0) {
            throw new \Exception("La tasa de cambio para {$monedaOrigen->codigo_moneda} no es válida.");
        }
        if ($tasaDestino <= 0) {
            throw new \Exception("La tasa de cambio para {$monedaDestino->codigo_moneda} no es válida.");
        }

        if ($tasaPersonalizada && $tasaPersonalizada > 0) {
            if ($origenEsCuenta && $monedaOrigen->codigo_moneda !== 'USD') {
                $tasaOrigen = $tasaPersonalizada;
            } else {
                $tasaDestino = $tasaPersonalizada;
            }
        }

        $montoEnUsd = $montoOrigen / $tasaOrigen;
        return round($montoEnUsd * $tasaDestino, 2);
    }

    private function obtenerTasaCambioFinal(Moneda $monedaOrigen, Moneda $monedaDestino, ?float $tasaPersonalizada, string $origenTipo, string $destinoTipo): float
    {
        if ($monedaOrigen->codigo_moneda === $monedaDestino->codigo_moneda) {
            return 1.0;
        }

        if ($tasaPersonalizada && $tasaPersonalizada > 0) {
            return $tasaPersonalizada;
        }

        $origenEsCuenta = $origenTipo === 'cuenta';
        $tasaOrigen = $origenEsCuenta ? $monedaOrigen->tasa_cambio : 1.0;
        $tasaDestino = $monedaDestino->tasa_cambio;

        if ($origenEsCuenta && $monedaOrigen->codigo_moneda !== 'USD') {
            return $tasaOrigen;
        }

        return $tasaDestino;
    }
}
