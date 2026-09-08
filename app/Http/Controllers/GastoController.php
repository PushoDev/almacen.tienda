<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Cuenta;
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

class GastoController extends Controller
{
    public function store(Request $request)
    {
        $monedasValidas = $this->obtenerCodigosMonedasActivas();

        $request->validate([
            'origen_tipo' => 'required|string|in:cuenta,cliente',
            'origen_id' => 'required|integer',
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|string|in:'.implode(',', $monedasValidas),
            'comentario' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();

        try {
            $movimientoData = [
                'user_id' => auth()->id(),
                'turno_vendedor_id' => auth()->user()->turnoActivo()?->id,
                'tipo_movimiento_id' => 1,
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

            if ($request->origen_tipo === 'cuenta') {
                $origen = Cuenta::with('moneda')->lockForUpdate()->findOrFail($request->origen_id);

                if (auth()->user()->role === 'vendedor') {
                    $cuentasAsignadas = auth()->user()->cuentas()->pluck('id')->toArray();
                    if (! in_array($origen->id, $cuentasAsignadas)) {
                        throw new \Exception('No tiene permiso para operar con esta cuenta.');
                    }

                    if (($origen->tipo_titular ?? '__sin_asignar__') !== 'personal') {
                        throw new \Exception('No puede realizar gastos desde una cuenta externa o sin asignar.');
                    }
                }

                if ($origen->moneda->codigo_moneda !== $request->moneda) {
                    throw new \Exception("La moneda de la cuenta ({$origen->moneda->codigo_moneda}) no coincide con la transacción ({$request->moneda}).");
                }

                $saldoAnterior = $origen->saldo_cuenta;
                $saldoPosterior = $saldoAnterior - $request->monto;

                $origen->decrement('saldo_cuenta', $request->monto);

                $movimientoData['cuenta_origen_id'] = $origen->id;
                $movimientoData['descripcion'] = $request->comentario ?? "Gasto desde cuenta: {$origen->nombre_cuenta}";
                $movimientoData['saldo_anterior_origen'] = $saldoAnterior;
                $movimientoData['saldo_posterior_origen'] = $saldoPosterior;
                $movimientoData['moneda_origen'] = $origen->moneda->codigo_moneda;
            } else {
                $origen = Cliente::lockForUpdate()->findOrFail($request->origen_id);

                $saldoAnterior = $origen->deuda_pago_cliente;
                $saldoPosterior = $saldoAnterior - $request->monto;

                $origen->decrement('deuda_pago_cliente', $request->monto);

                $movimientoData['cliente_origen_id'] = $origen->id;
                $movimientoData['descripcion'] = $request->comentario ?? "Gasto desde cliente: {$origen->nombre_cliente}";
                $movimientoData['saldo_anterior_origen'] = $saldoAnterior;
                $movimientoData['saldo_posterior_origen'] = $saldoPosterior;
                $movimientoData['moneda_origen'] = 'USD';
            }

            $movimiento = MovimientoFinanciero::create($movimientoData);

            DB::commit();

            try {
                $notificationService = new NotificationService;
                $datosNotificacion = $notificationService->prepararDatosMovimientoFinanciero($movimiento);
                $usuariosParaNotificar = $notificationService->getUsuariosParaNotificar($datosNotificacion);

                Log::info('Usuarios para notificar (gasto): '.$usuariosParaNotificar->pluck('id')->implode(','));

                $movimiento->load(['user', 'cuentaOrigen', 'clienteOrigen']);

                Notification::send($usuariosParaNotificar, new MovimientoFinancieroNotification($movimiento, 'gasto'));
            } catch (\Exception $e) {
                Log::error('Error enviando notificación de gasto: '.$e->getMessage());
            }

            return Redirect::route('transacciones.show', $movimiento->id)
                ->with('success', "✅ Gasto de {$request->monto} {$request->moneda} registrado con éxito.");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar gasto: '.$e->getMessage());
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
