<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Compra;
use App\Models\CostoHistorial;
use App\Models\Cuenta;
use App\Models\Moneda;
use App\Models\MovimientoFinanciero;
use App\Models\Producto;
use App\Models\Proveedor;
use App\Notifications\MovimientoFinancieroNotification;
use App\Services\NotificationService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;

class TransaccionController extends Controller
{
    /**
     * Lista fija de motivos de anulación — compartida por Gasto/Ingreso/Transferencia
     * (este controller) y Remesa (RemesaController::MOTIVOS_ANULACION, misma lista
     * duplicada a propósito: no hay abstracción compartida entre módulos de anulación en
     * este proyecto, ver Compra/Venta).
     */
    public const MOTIVOS_ANULACION = ['error_monto', 'error_entidad', 'duplicado', 'error_tipo_operacion', 'solicitud_cliente', 'otros'];

    /**
     * Vista principal de transacciones.
     */
    public function index()
    {
        // Origen: vendedor solo ve sus cuentas asignadas personales; destino: cuentas asignadas a cualquier usuario
        if (auth()->user()->role === 'vendedor') {
            $cuentasOrigen = auth()->user()->cuentas()->where('tipo_titular', 'personal')->with('moneda')->get();
            $cuentasDestino = Cuenta::with('moneda')->whereHas('users')->get();
        } else {
            $cuentasOrigen = Cuenta::with('moneda')->get();
            $cuentasDestino = Cuenta::with('moneda')->get();
        }

        $clientes = Cliente::all();
        $proveedores = Proveedor::all();

        // ✅ Obtener monedas activas
        $monedasActivas = Moneda::where('estado', true)->get();

        return Inertia::render('Transacciones/Index', [
            'cuentasOrigen' => $cuentasOrigen,
            'cuentasDestino' => $cuentasDestino,
            'clientes' => $clientes,
            'proveedores' => $proveedores,
            'monedasActivas' => $monedasActivas,
            'userRole' => auth()->user()->role ?? 'vendedor',
        ]);
    }

    // =======================================================

    // Mostrar detalles de una transacción específica
    public function show(MovimientoFinanciero $movimiento)
    {
        // ✅ Validar que el vendedor solo pueda ver sus transacciones
        if (auth()->user()->role === 'vendedor') {
            $cuentasAsignadas = auth()->user()->cuentas()->pluck('id')->toArray();

            // Verificar si la transacción involucra alguna de sus cuentas asignadas
            $involucraCuentaAsignada = in_array($movimiento->cuenta_origen_id, $cuentasAsignadas) ||
                in_array($movimiento->cuenta_destino_id, $cuentasAsignadas);

            // Si no es admin y no involucra sus cuentas, denegar acceso
            if (! $involucraCuentaAsignada && auth()->user()->role !== 'admin') {
                abort(403, 'No tiene permiso para ver esta transacción.');
            }
        }

        // ✅ Cargar TODAS las relaciones necesarias de forma eager
        $movimiento->load([
            'user',
            'turnoVendedor',
            'tipoMovimiento',
            'cuentaOrigen.moneda',
            'cuentaDestino.moneda',
            'clienteOrigen',
            'clienteDestino',
            'proveedorDestino',
        ]);

        // ✅ Calcular diferencias de saldo si los datos existen
        $detallesOrigen = null;
        $detallesDestino = null;

        // Construir detalles del ORIGEN
        if ($movimiento->cuenta_origen_id || $movimiento->cliente_origen_id) {
            $detallesOrigen = [
                'tipo' => $movimiento->cuenta_origen_id ? 'cuenta' : 'cliente',
                'nombre' => $movimiento->nombreOrigen,
                'moneda' => $movimiento->moneda_origen ?? $movimiento->moneda,
                'tiene_datos_historicos' => $movimiento->saldo_anterior_origen !== null,
                'saldo_anterior' => $movimiento->saldo_anterior_origen,
                'saldo_posterior' => $movimiento->saldo_posterior_origen,
                'monto_operacion' => -1 * abs($movimiento->monto), // Negativo porque sale dinero
                'saldo_actual' => $movimiento->cuentaOrigen?->saldo_cuenta ??
                    $movimiento->clienteOrigen?->deuda_pago_cliente,
            ];
        }

        // Construir detalles del DESTINO
        if ($movimiento->cuenta_destino_id || $movimiento->cliente_destino_id || $movimiento->proveedor_destino_id) {
            $tipoDestino = 'cuenta';
            $saldoActual = null;

            if ($movimiento->cuenta_destino_id) {
                $tipoDestino = 'cuenta';
                $saldoActual = $movimiento->cuentaDestino?->saldo_cuenta;
            } elseif ($movimiento->cliente_destino_id) {
                $tipoDestino = 'cliente';
                $saldoActual = $movimiento->clienteDestino?->deuda_pago_cliente;
            } elseif ($movimiento->proveedor_destino_id) {
                $tipoDestino = 'proveedor';
                $saldoActual = $movimiento->proveedorDestino?->saldo_proveedor;
            }

            $detallesDestino = [
                'tipo' => $tipoDestino,
                'nombre' => $movimiento->nombreDestino,
                'moneda' => $movimiento->moneda_destino ?? $movimiento->moneda,
                'tiene_datos_historicos' => $movimiento->saldo_anterior_destino !== null,
                'saldo_anterior' => $movimiento->saldo_anterior_destino,
                'saldo_posterior' => $movimiento->saldo_posterior_destino,
                'monto_operacion' => abs($movimiento->monto), // Positivo porque entra dinero
                'saldo_actual' => $saldoActual,
            ];
        }

        return Inertia::render('Transacciones/Show', [
            'movimiento' => $movimiento,
            'detallesOrigen' => $detallesOrigen,
            'detallesDestino' => $detallesDestino,
            'userRole' => auth()->user()->role ?? 'vendedor',
        ]);
    }

    // =======================================================
    // === ANULACIÓN de Gasto/Ingreso/Transferencia ===
    // =======================================================

    /**
     * Anula un Gasto, Ingreso o Transferencia — revierte el efecto en saldo de cada
     * entidad tocada (origen y/o destino) y marca el movimiento como 'cancelado' con
     * motivo obligatorio. Abierto a cualquier rol (vendedor incluido) — mismo criterio
     * de cuentas asignadas que ya aplica al crear el movimiento; cliente/proveedor no
     * tienen ese chequeo hoy en ningún módulo de Transacciones (hueco ya reportado, no
     * se introduce uno nuevo acá).
     */
    public function anular(Request $request, MovimientoFinanciero $movimiento)
    {
        if ($movimiento->estado === 'cancelado') {
            return back()->withErrors(['estado' => 'Esta operación ya está anulada.']);
        }

        if (auth()->user()->role === 'vendedor') {
            $cuentasAsignadas = auth()->user()->cuentas()->pluck('id')->toArray();
            $cuentaOrigenAjena = $movimiento->cuenta_origen_id && ! in_array($movimiento->cuenta_origen_id, $cuentasAsignadas);
            $cuentaDestinoAjena = $movimiento->cuenta_destino_id && ! in_array($movimiento->cuenta_destino_id, $cuentasAsignadas);
            if ($cuentaOrigenAjena || $cuentaDestinoAjena) {
                abort(403, 'No tiene permiso para anular una operación sobre una cuenta que no tiene asignada.');
            }
        }

        // Movimientos anteriores al registro de saldo_anterior/posterior (2026-08-01) no
        // tienen snapshot — revertir "a ciegas" sería adivinar el monto exacto. Se
        // rechaza en vez de arriesgar una reversión incorrecta.
        $sinSnapshotOrigen = $movimiento->cuenta_origen_id || $movimiento->cliente_origen_id;
        $sinSnapshotDestino = $movimiento->cuenta_destino_id || $movimiento->cliente_destino_id || $movimiento->proveedor_destino_id;
        if (($sinSnapshotOrigen && $movimiento->saldo_anterior_origen === null) ||
            ($sinSnapshotDestino && $movimiento->saldo_anterior_destino === null)) {
            return back()->withErrors(['estado' => 'Esta operación es anterior al registro de saldos y no se puede anular automáticamente.']);
        }

        $request->validate([
            'motivo_anulacion' => 'required|string|in:'.implode(',', self::MOTIVOS_ANULACION),
            'detalle_anulacion' => 'required_if:motivo_anulacion,otros|nullable|string|max:1000',
        ]);

        DB::transaction(function () use ($movimiento, $request) {
            if ($movimiento->saldo_anterior_origen !== null) {
                $delta = (float) $movimiento->saldo_anterior_origen - (float) $movimiento->saldo_posterior_origen;
                $this->revertirEntidad($movimiento->cuenta_origen_id, $movimiento->cliente_origen_id, null, $delta);
            }
            if ($movimiento->saldo_anterior_destino !== null) {
                $delta = (float) $movimiento->saldo_anterior_destino - (float) $movimiento->saldo_posterior_destino;
                $this->revertirEntidad($movimiento->cuenta_destino_id, $movimiento->cliente_destino_id, $movimiento->proveedor_destino_id, $delta);
            }

            $movimiento->update([
                'estado' => 'cancelado',
                'motivo_anulacion' => $request->motivo_anulacion,
                'detalle_anulacion' => $request->detalle_anulacion,
            ]);
        });

        try {
            $movimiento->load(['user', 'cuentaOrigen', 'clienteOrigen', 'cuentaDestino', 'clienteDestino', 'proveedorDestino']);
            $notificationService = new NotificationService;
            $datosNotificacion = $notificationService->prepararDatosMovimientoFinanciero($movimiento);
            $usuariosParaNotificar = $notificationService->getUsuariosParaNotificar($datosNotificacion);
            Notification::send($usuariosParaNotificar, new MovimientoFinancieroNotification($movimiento, null, null, true));
        } catch (Exception $e) {
            Log::error('Error enviando notificación de anulación: '.$e->getMessage());
        }

        return Redirect::route('transacciones.show', $movimiento->id)->with('success', 'Operación anulada con éxito.');
    }

    /**
     * Revierte el delta de saldo de una entidad (cuenta/cliente/proveedor) — $delta ya
     * viene con el signo correcto a aplicar directamente con increment(), que también
     * decrementa si el valor es negativo. Aplicar el delta (no restaurar al snapshot
     * exacto) es lo que hace la reversión segura aunque hayan ocurrido otras
     * operaciones sobre la misma entidad después de esta.
     */
    private function revertirEntidad(?int $cuentaId, ?int $clienteId, ?int $proveedorId, float $delta): void
    {
        if ($cuentaId) {
            Cuenta::whereKey($cuentaId)->lockForUpdate()->first()?->increment('saldo_cuenta', $delta);
        } elseif ($clienteId) {
            Cliente::whereKey($clienteId)->lockForUpdate()->first()?->increment('deuda_pago_cliente', $delta);
        } elseif ($proveedorId) {
            Proveedor::whereKey($proveedorId)->lockForUpdate()->first()?->increment('saldo_proveedor', $delta);
        }
    }

    // =======================================================
    // === MÉTODO NUEVO: GASTOS POR TRANSPORTACIÓN ===
    // =======================================================

    /**
     * Registrar Gasto por Transportación y distribuir entre productos de una compra
     */
    public function gastoTransportacion(Request $request)
    {
        $request->validate([
            'compra_id' => 'required|exists:compras,id',
            'cuenta_id' => 'required|exists:cuentas,id',
            'monto' => 'required|numeric|min:0.01',
            'moneda' => 'required|string|in:CUP',
            'comentario' => 'nullable|string|max:255',
            'tasa_cambio_aplicada' => 'nullable|numeric|min:0.0001',
            'distribucion_tipo' => 'required|string|in:proporcional,igualitario,manual',
            'distribucion_productos' => 'nullable|array',
            'distribucion_productos.*.producto_id' => 'required|exists:productos,id',
            'distribucion_productos.*.monto_usd' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();

        try {
            $compra = Compra::with('productos')->findOrFail($request->compra_id);
            $cuenta = Cuenta::with('moneda')->findOrFail($request->cuenta_id);

            // ✅ Validar que el vendedor tenga acceso a esta cuenta
            if (auth()->user()->role === 'vendedor') {
                $cuentasAsignadas = auth()->user()->cuentas()->pluck('id')->toArray();
                if (! in_array($cuenta->id, $cuentasAsignadas)) {
                    throw new Exception('No tiene permiso para operar con esta cuenta.');
                }
            }

            // Validar que la cuenta sea CUP
            if ($cuenta->moneda->codigo_moneda !== 'CUP') {
                throw new Exception('Solo se pueden usar cuentas en CUP para gastos de transportación.');
            }

            // Validar saldo suficiente
            if ($cuenta->saldo_cuenta < $request->monto) {
                throw new Exception('Saldo insuficiente en la cuenta.');
            }

            $tasa_cambio = $request->tasa_cambio_aplicada ?? $cuenta->moneda->tasa_cambio;
            $montoTotalUSD = $request->monto / $tasa_cambio;

            // Diferentes métodos de distribución
            $distribuciones = $this->distribuirTransportacion(
                $compra,
                $montoTotalUSD,
                $request->distribucion_tipo,
                $request->distribucion_productos ?? []
            );

            // Registrar el movimiento financiero
            $movimiento = MovimientoFinanciero::create([
                'user_id' => auth()->id(),
                'tipo_movimiento_id' => 1,
                'cuenta_origen_id' => $cuenta->id,
                'cliente_origen_id' => null,
                'cuenta_destino_id' => null,
                'cliente_destino_id' => null,
                'proveedor_destino_id' => null,
                'monto' => $request->monto,
                'moneda' => 'CUP',
                'tasa_cambio_aplicada' => $tasa_cambio,
                'descripcion' => $request->comentario ?? "Gasto por transportación - Compra #{$compra->id}",
                'fecha_operacion' => now(),
                'estado' => 'completado',
            ]);

            // Actualizar costos de productos
            foreach ($distribuciones as $distribucion) {
                $producto = Producto::find($distribucion['producto_id']);
                $nuevoCosto = $producto->precio_compra_producto + $distribucion['monto_usd'];

                CostoHistorial::create([
                    'product_id' => $producto->id,
                    'old_cost_usd' => $producto->precio_compra_producto,
                    'new_cost_usd' => $nuevoCosto,
                    'comentario' => 'Ajuste por gasto de transportación.',
                ]);

                $producto->update(['precio_compra_producto' => $nuevoCosto]);

                // Actualizar ganancias de vendedores
                app(ProductoVendedorController::class)
                    ->actualizarGananciaPorCambioCosto($producto->id);
            }

            // Descontar de la cuenta
            $cuenta->decrement('saldo_cuenta', $request->monto);

            DB::commit();

            // Notificar a usuarios relevantes del gasto de transportación
            try {
                $notificationService = new NotificationService;
                $datosNotificacion = $notificationService->prepararDatosGastoTransportacion($movimiento, $cuenta->id);
                $usuariosParaNotificar = $notificationService->getUsuariosParaNotificar($datosNotificacion);

                // Debug: Log para verificar usuarios
                Log::info('Usuarios para notificar (gasto transportación): '.$usuariosParaNotificar->pluck('id')->implode(','));
                Log::info('Total usuarios notificados: '.$usuariosParaNotificar->count());

                // Cargar relaciones necesarias para la notificación
                $movimiento->load(['user', 'cuentaOrigen']);

                Notification::send($usuariosParaNotificar, new MovimientoFinancieroNotification($movimiento, 'gasto'));

                Log::info('Notificación de gasto transportación enviada exitosamente');
            } catch (Exception $e) {
                Log::error('Error enviando notificación de gasto transportación: '.$e->getMessage());
                Log::error('Stack trace: '.$e->getTraceAsString());
            }

            return Redirect::back()->with(
                'success',
                "✅ Gasto por transportación de {$request->monto} CUP distribuido entre ".
                    count($distribuciones).' productos.'
            );
        } catch (Exception $e) {
            DB::rollBack();
            Log::error('Error en gasto por transportación: '.$e->getMessage());

            return Redirect::back()->with('error', '❌ Error: '.$e->getMessage());
        }
    }

    /**
     * Distribuye el monto de transportación entre productos
     */
    private function distribuirTransportacion(Compra $compra, float $montoTotalUSD, string $tipo, array $distribucionManual = []): array
    {
        // 'proporcional'/'igualitario' reparten por producto, no por línea — si el mismo producto
        // tiene varias líneas en esta compra (distintos almacenes/colores), no debe pesar el doble.
        $productos = $compra->productos->unique('id')->values();
        $distribuciones = [];

        switch ($tipo) {
            case 'proporcional':
                $costoTotal = $productos->sum('precio_compra_producto');
                foreach ($productos as $producto) {
                    $porcentaje = $producto->precio_compra_producto / $costoTotal;
                    $montoUSD = $montoTotalUSD * $porcentaje;
                    $distribuciones[] = [
                        'producto_id' => $producto->id,
                        'monto_usd' => $montoUSD,
                    ];
                }
                break;

            case 'igualitario':
                $montoPorProducto = $montoTotalUSD / $productos->count();
                foreach ($productos as $producto) {
                    $distribuciones[] = [
                        'producto_id' => $producto->id,
                        'monto_usd' => $montoPorProducto,
                    ];
                }
                break;

            case 'manual':
                foreach ($distribucionManual as $item) {
                    $distribuciones[] = [
                        'producto_id' => $item['producto_id'],
                        'monto_usd' => $item['monto_usd'],
                    ];
                }
                $sumaManual = collect($distribucionManual)->sum('monto_usd');
                if (abs($sumaManual - $montoTotalUSD) > 0.01) {
                    throw new Exception('La distribución manual no coincide con el monto total.');
                }
                break;
        }

        return $distribuciones;
    }
}
