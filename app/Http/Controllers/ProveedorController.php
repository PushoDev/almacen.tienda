<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use App\Models\MovimientoFinanciero;
use App\Models\Proveedor;
use App\Models\Remesa;
use App\Services\DetalleOperacionService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProveedorController extends Controller
{
    public function __construct(private DetalleOperacionService $detalleOperacionService) {}

    /**
     * Display a listing of the resource.
     * Listado de Proveedores
     */
    public function index()
    {
        // withCount evita N+1 — una sola query agregada en vez de una por proveedor
        // para mostrar cuántas compras tiene cada uno en el listado.
        $proveedores = Proveedor::withCount('compras')->get();

        $totalFondo = $proveedores->where('saldo_proveedor', '>', 0)->sum('saldo_proveedor');
        $totalDeuda = $proveedores->where('saldo_proveedor', '<', 0)->sum('saldo_proveedor');
        $conDeuda = $proveedores->where('saldo_proveedor', '<', 0)->count();
        $conFondo = $proveedores->where('saldo_proveedor', '>', 0)->count();
        $neutro = $proveedores->filter(fn ($p) => is_null($p->saldo_proveedor) || (float) $p->saldo_proveedor === 0.0)->count();

        $resumen = [
            'total_proveedores' => $proveedores->count(),
            'total_fondo' => round((float) $totalFondo, 2),
            'total_deuda' => round(abs((float) $totalDeuda), 2),
            'balance_neto' => round((float) $totalFondo + (float) $totalDeuda, 2),
            'por_estado' => [
                'fondo' => ['cantidad' => $conFondo, 'saldo' => round((float) $totalFondo, 2)],
                'deuda' => ['cantidad' => $conDeuda, 'saldo' => round(abs((float) $totalDeuda), 2)],
                'neutro' => ['cantidad' => $neutro, 'saldo' => 0],
            ],
        ];

        return Inertia::render('Proveedores/index', [
            'proveedores' => $proveedores,
            'resumen' => $resumen,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     * Ruta para crear un nuevo proveedor
     */
    public function create()
    {
        return Inertia::render('Proveedores/Create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Validamos los datos del formulario
        $request->validate([
            'nombre_proveedor' => ['required', 'string', 'max:255'],
            'telefono_proveedor' => ['required', 'string', 'unique:proveedors,telefono_proveedor'],
            'correo_proveedor' => ['nullable', 'email', 'unique:proveedors,correo_proveedor'],
            'localidad_proveedor' => ['required', 'string'],
            'notas_proveedor' => ['nullable', 'string'],
            'saldo_proveedor' => ['nullable', 'numeric', 'min:-9999999', 'max:9999999'],
        ]);

        // Nuevo proveedor en la base de datos
        Proveedor::create([
            'nombre_proveedor' => $request->nombre_proveedor,
            'telefono_proveedor' => $request->telefono_proveedor,
            'correo_proveedor' => $request->correo_proveedor,
            'localidad_proveedor' => $request->localidad_proveedor,
            'notas_proveedor' => $request->notas_proveedor,
            'saldo_proveedor' => $request->saldo_proveedor ?? 0,
        ]);

        // Redirigimos al usuario a la lista de proveedores
        return redirect()->route('proveedores.index')->with('success', 'Proveedor creado exitosamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Proveedor $proveedor)
    {
        // Cargar compras del proveedor con relaciones
        $compras = Compra::with([
            'proveedor',
            'cliente',
            'usuario',
            'productos' => function ($query) {
                $query->withPivot('cantidad', 'precio', 'almacen_id');
            },
            'productos.categoria',
            'pagos.cuenta',
            'pagos.cliente',
        ])
            ->where('proveedor_id', $proveedor->id)
            ->orderBy('fecha_compra', 'desc')
            ->get();

        // es_parcial no es una columna real — setAttribute() la deja en $attributes para que
        // viaje en el toArray()/JSON de Inertia sin necesitar $appends en el modelo (eso
        // dispararía el accessor, y por tanto la relación 'pagos', en otros controladores que
        // serializan Compra sin precargarla — ver DistribucionCostosController/ReporteController).
        $compras->each(function (Compra $compra) {
            $compra->setAttribute('es_parcial', $compra->es_parcial);
            $compra->detalle = $this->detalleOperacionService->detalleCompra($compra);
        });

        // Cargar transacciones financieras relacionadas con el proveedor (SOLO como destino)
        $transacciones = MovimientoFinanciero::with([
            'user',
            'cuentaOrigen',
            'cuentaDestino',
            'clienteOrigen',
            'clienteDestino',
            'proveedorDestino',
            'tipoMovimiento',
        ])
            ->where('proveedor_destino_id', $proveedor->id)
            ->orderBy('fecha_operacion', 'desc')
            ->get();
        $transacciones->each(function (MovimientoFinanciero $mov) {
            $mov->detalle = $this->detalleOperacionService->detalleMovimiento($mov);
        });

        // Remesas donde este proveedor participó (entrada o salida) — Remesa es
        // admin/moderador-only (mismo criterio que Compras), vendedor no ve esta sección.
        $esAdminOModerador = in_array(auth()->user()->role, ['admin', 'moderador']);
        $remesas = collect();
        if ($esAdminOModerador) {
            $remesas = Remesa::with([
                'user', 'turnoVendedor', 'mensajeroCuenta',
                'entradaCuenta', 'entradaCliente',
                'salidaCuenta', 'salidaCliente',
            ])
                ->where('entrada_proveedor_id', $proveedor->id)
                ->orWhere('salida_proveedor_id', $proveedor->id)
                ->orderByDesc('fecha_operacion')
                ->get();

            $remesas->each(function (Remesa $remesa) use ($proveedor) {
                // entrada_proveedor_id o salida_proveedor_id === $proveedor->id por
                // definición de esta consulta — se reutiliza la misma instancia en vez de
                // una query extra por fila.
                if ($remesa->entrada_proveedor_id === $proveedor->id) {
                    $remesa->setRelation('entradaProveedor', $proveedor);
                }
                if ($remesa->salida_proveedor_id === $proveedor->id) {
                    $remesa->setRelation('salidaProveedor', $proveedor);
                }
                $remesa->detalle = $this->detalleOperacionService->detalleRemesa($remesa);
            });
        }

        // Calcular estadísticas
        $estadisticas = [
            'total_compras' => $compras->count(),
            'monto_total_compras' => $compras->sum('total_compra'),
            'total_transacciones' => $transacciones->count(),
            'monto_total_ingresos' => $transacciones->sum('monto'), // Solo ingresos (proveedor como destino)
            'saldo_actual' => $proveedor->saldo_proveedor,
        ];

        return Inertia::render('Proveedores/Show', [
            'proveedor' => $proveedor,
            'compras' => $compras,
            'transacciones' => $transacciones,
            'remesas' => $remesas,
            'estadisticas' => $estadisticas,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Proveedor $proveedor)
    {
        return Inertia::render('Proveedores/Edit', [
            'proveedor' => $proveedor,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Proveedor $proveedor)
    {
        // Validamos los datos del formulario
        $request->validate([
            'nombre_proveedor' => [
                'required',
                'string',
                'max:255',
                'unique:proveedors,nombre_proveedor,'.$proveedor->id,
            ],
            'telefono_proveedor' => [
                'required',
                'string',
                'unique:proveedors,telefono_proveedor,'.$proveedor->id,
            ],
            'correo_proveedor' => [
                'nullable',
                'email',
                'unique:proveedors,correo_proveedor,'.$proveedor->id,
            ],
            'localidad_proveedor' => ['required', 'string'],
            'notas_proveedor' => ['nullable', 'string'],
            'saldo_proveedor' => ['nullable', 'numeric', 'min:-9999999', 'max:9999999'],
        ]);

        // Actualizar el proveedor en la base de datos
        $proveedor->update([
            'nombre_proveedor' => $request->nombre_proveedor,
            'telefono_proveedor' => $request->telefono_proveedor,
            'correo_proveedor' => $request->correo_proveedor,
            'localidad_proveedor' => $request->localidad_proveedor,
            'notas_proveedor' => $request->notas_proveedor,
            'saldo_proveedor' => $request->saldo_proveedor,
        ]);

        // Redirigimos al usuario a la lista de proveedores
        return redirect()->route('proveedores.index')->with('success', 'Proveedor actualizado exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Proveedor $proveedor)
    {
        if (auth()->user()->role !== 'admin') {
            return redirect()->back()->with('error', 'ud no tiene acceso para esta acción');
        }

        // Mismo criterio que Clientes/Cuentas: saldo distinto de cero bloquea el borrado.
        if ((float) $proveedor->saldo_proveedor !== 0.0) {
            return back()->withErrors([
                'proveedor' => 'No se puede eliminar este proveedor porque tiene saldo pendiente. Primero debe liquidarlo a $0.00.',
            ]);
        }

        // Propio de Proveedores: compras.proveedor_id tiene onDelete('cascade') — un
        // proveedor en $0.00 (ya liquidado) puede seguir teniendo años de historial de
        // compras real. Sin este chequeo, borrar el proveedor borraría ese historial en
        // cascada y en silencio, sin ningún error que lo delate.
        $totalCompras = $proveedor->compras()->count();
        if ($totalCompras > 0) {
            return back()->withErrors([
                'proveedor' => "No se puede eliminar este proveedor porque tiene {$totalCompras} ".
                    ($totalCompras === 1 ? 'compra registrada asociada.' : 'compras registradas asociadas.'),
            ]);
        }

        try {
            $proveedor->delete();
        } catch (QueryException $e) {
            // Red de seguridad: movimientos_financieros.proveedor_destino_id no tiene
            // cascade, así que cualquier movimiento histórico bloquea el borrado con FK.
            if ((int) $e->getCode() === 23000) {
                return back()->withErrors([
                    'proveedor' => 'No se puede eliminar este proveedor porque tiene movimientos financieros asociados.',
                ]);
            }

            throw $e;
        }

        return redirect()->route('proveedores.index')->with('success', 'Proveedor eliminado exitosamente.');
    }

    /**
     * Actualizar el saldo del proveedor
     */
    public function actualizarSaldo(Request $request, Proveedor $proveedor)
    {
        $request->validate([
            'monto' => ['required', 'numeric', 'min:-9999999', 'max:9999999'],
            'concepto' => ['nullable', 'string', 'max:255'],
        ]);

        $montoAnterior = $proveedor->saldo_proveedor;
        $proveedor->actualizarSaldo($request->monto);

        return redirect()->back()->with('success', [
            'message' => 'Saldo actualizado exitosamente.',
            'monto_anterior' => $montoAnterior,
            'monto_nuevo' => $proveedor->saldo_proveedor,
            'diferencia' => $request->monto,
        ]);
    }

    /**
     * Mostrar proveedores con deuda (saldo negativo) - dinero perdido
     */
    public function conDeuda()
    {
        return Inertia::render('Proveedores/ConDeuda', [
            'proveedores' => Proveedor::conSaldoNegativo()->get(),
        ]);
    }

    /**
     * Mostrar proveedores con fondo (saldo positivo)
     */
    public function conFondo()
    {
        return Inertia::render('Proveedores/ConFondo', [
            'proveedores' => Proveedor::conSaldoPositivo()->get(),
        ]);
    }

    /**
     * Resetear saldo a cero
     */
    public function resetearSaldo(Proveedor $proveedor)
    {
        $saldoAnterior = $proveedor->saldo_proveedor;
        $proveedor->update(['saldo_proveedor' => 0]);

        return redirect()->back()->with('success', [
            'message' => 'Saldo reseteado a cero exitosamente.',
            'saldo_anterior' => $saldoAnterior,
        ]);
    }
}
