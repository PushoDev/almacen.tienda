<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Cuenta;
use App\Models\Moneda;
use App\Models\MovimientoFinanciero;
use App\Models\Proveedor;
use App\Notifications\MovimientoFinancieroNotification;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\ValidationException;

class IngresoController extends Controller
{
    public function formData()
    {
        if (auth()->user()->role === 'vendedor') {
            $cuentasDestino = auth()->user()->cuentas()->with('moneda')->get();
        } else {
            $cuentasDestino = Cuenta::with('moneda')->get();
        }
        $clientes = Cliente::all();
        $proveedores = Proveedor::all();

        return response()->json([
            'cuentasDestino' => $cuentasDestino,
            'clientes' => $clientes,
            'proveedores' => $proveedores,
        ]);
    }

    public function store(Request $request)
    {
        $monedasValidas = $this->obtenerCodigosMonedasActivas();

        $request->validate([
            'destino_tipo' => 'required|string|in:cuenta,cliente,proveedor',
            'destino_id' => 'required|integer',
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|string|in:'.implode(',', $monedasValidas),
            'comentario' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();

        try {
            $movimientoData = [
                'user_id' => auth()->id(),
                'turno_vendedor_id' => auth()->user()->turnoActivo()?->id,
                'tipo_movimiento_id' => 2,
                'monto' => $request->monto,
                'moneda' => $request->moneda,
                'tasa_cambio_aplicada' => 1.0,
                'descripcion' => $request->comentario,
                'fecha_operacion' => now(),
                'estado' => 'completado',
                'cuenta_origen_id' => null,
                'cliente_origen_id' => null,
                'cuenta_destino_id' => null,
                'cliente_destino_id' => null,
                'proveedor_destino_id' => null,
            ];

            if ($request->destino_tipo === 'cuenta') {
                $destino = Cuenta::with('moneda')->lockForUpdate()->findOrFail($request->destino_id);

                if (auth()->user()->role === 'vendedor') {
                    $cuentasAsignadas = auth()->user()->cuentas()->pluck('id')->toArray();
                    if (! in_array($destino->id, $cuentasAsignadas)) {
                        throw new \Exception('No tiene permiso para operar con esta cuenta.');
                    }
                }

                if ($destino->moneda->codigo_moneda !== $request->moneda) {
                    throw new \Exception("La moneda de la cuenta ({$destino->moneda->codigo_moneda}) no coincide con la transacción ({$request->moneda}).");
                }

                $saldoAnterior = $destino->saldo_cuenta;
                $saldoPosterior = $saldoAnterior + $request->monto;

                $destino->increment('saldo_cuenta', $request->monto);

                $movimientoData['cuenta_destino_id'] = $destino->id;
                $movimientoData['descripcion'] = $request->comentario ?? "Ingreso a cuenta: {$destino->nombre_cuenta}";
                $movimientoData['saldo_anterior_destino'] = $saldoAnterior;
                $movimientoData['saldo_posterior_destino'] = $saldoPosterior;
                $movimientoData['moneda_destino'] = $destino->moneda->codigo_moneda;
            } elseif ($request->destino_tipo === 'cliente') {
                $destino = Cliente::lockForUpdate()->findOrFail($request->destino_id);

                $saldoAnterior = $destino->deuda_pago_cliente;
                $saldoPosterior = $saldoAnterior + $request->monto;

                $destino->increment('deuda_pago_cliente', $request->monto);

                $movimientoData['cliente_destino_id'] = $destino->id;
                $movimientoData['descripcion'] = $request->comentario ?? "Ingreso a cliente: {$destino->nombre_cliente}";
                $movimientoData['saldo_anterior_destino'] = $saldoAnterior;
                $movimientoData['saldo_posterior_destino'] = $saldoPosterior;
                $movimientoData['moneda_destino'] = 'USD';
            } else {
                $destino = Proveedor::lockForUpdate()->findOrFail($request->destino_id);

                $saldoAnterior = $destino->saldo_proveedor;
                $saldoPosterior = $saldoAnterior + $request->monto;

                $destino->increment('saldo_proveedor', $request->monto);

                $movimientoData['proveedor_destino_id'] = $destino->id;
                $movimientoData['descripcion'] = $request->comentario ?? "Ingreso a proveedor: {$destino->nombre_proveedor}";
                $movimientoData['saldo_anterior_destino'] = $saldoAnterior;
                $movimientoData['saldo_posterior_destino'] = $saldoPosterior;
                $movimientoData['moneda_destino'] = 'USD';
            }

            $movimiento = MovimientoFinanciero::create($movimientoData);

            DB::commit();

            try {
                $notificationService = new NotificationService;
                $datosNotificacion = $notificationService->prepararDatosMovimientoFinanciero($movimiento);
                $usuariosParaNotificar = $notificationService->getUsuariosParaNotificar($datosNotificacion);

                Log::info('Usuarios para notificar (ingreso): '.$usuariosParaNotificar->pluck('id')->implode(','));

                $movimiento->load(['user', 'cuentaDestino', 'clienteDestino', 'proveedorDestino']);

                Notification::send($usuariosParaNotificar, new MovimientoFinancieroNotification($movimiento, 'ingreso'));
            } catch (\Exception $e) {
                Log::error('Error enviando notificación de ingreso: '.$e->getMessage());
            }

            return Redirect::route('transacciones.show', $movimiento->id)
                ->with('success', "✅ Ingreso de {$request->monto} {$request->moneda} registrado con éxito.");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar ingreso: '.$e->getMessage());
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
}
