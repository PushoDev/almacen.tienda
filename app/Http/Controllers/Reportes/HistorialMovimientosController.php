<?php

namespace App\Http\Controllers\Reportes;

use App\Http\Controllers\Controller;
use App\Models\Almacen;
use App\Models\Movimiento;
use App\Models\MovimientoDetalle;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class HistorialMovimientosController extends Controller
{
    /**
     * Historial completo de movimientos de inventario entre almacenes, con filtros. Lo ven todos
     * los roles: un vendedor solo ve los que salen de o llegan a sus almacenes (`visiblesPara`).
     * La pantalla de trabajo diario (`/movimientos`) muestra solo lo reciente y lo abierto.
     */
    public function __invoke(Request $request): Response
    {
        $filtros = $request->validate([
            'estado' => ['nullable', 'in:pendiente_confirmacion,en_transito,recibido_parcial,recibido_completo,rechazado,cancelado'],
            'almacen_origen_id' => ['nullable', 'integer', 'exists:almacens,id'],
            'almacen_destino_id' => ['nullable', 'integer', 'exists:almacens,id'],
            'sentido' => ['nullable', 'in:salientes,entrantes'],
            'desde' => ['nullable', 'date'],
            'hasta' => ['nullable', 'date', 'after_or_equal:desde'],
            'buscar' => ['nullable', 'string', 'max:100'],
        ]);

        $user = Auth::user();
        $userAlmacenesIds = in_array($user->role, ['admin', 'moderador']) ? [] : $user->almacenes()->pluck('almacens.id')->toArray();

        $consulta = Movimiento::visiblesPara($user)->filtrar($filtros, $userAlmacenesIds);

        $movimientos = (clone $consulta)
            ->with([
                'almacenOrigen:id,nombre_almacen',
                'almacenDestino:id,nombre_almacen',
                'usuario:id,name',
                'detalles.producto:id,nombre_producto,marca_producto,modelo_producto,capacidad_producto,color_producto',
                'seguimientos.usuario:id,name',
            ])
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(15)
            ->withQueryString()
            ->through(function (Movimiento $movimiento) {
                $movimiento->setAttribute('enviado_por', $movimiento->registradoPor('en_transito'));
                $movimiento->setAttribute('recibido_por', $movimiento->registradoPor(['recibido_completo', 'recibido_parcial']));
                $movimiento->setAttribute('rechazado_por', $movimiento->registradoPor('rechazado'));
                $movimiento->unsetRelation('seguimientos');

                return $movimiento;
            });

        return Inertia::render('Reportes/Report/HistorialMovimientos', [
            'movimientos' => $movimientos,
            'totales' => $this->totales($consulta),
            'almacenes' => Almacen::select('id', 'nombre_almacen')->orderBy('nombre_almacen')->get(),
            'esVendedor' => ! in_array($user->role, ['admin', 'moderador']),
            'filtros' => [
                'estado' => $filtros['estado'] ?? '',
                'almacen_origen_id' => $filtros['almacen_origen_id'] ?? '',
                'almacen_destino_id' => $filtros['almacen_destino_id'] ?? '',
                'sentido' => $filtros['sentido'] ?? '',
                'desde' => $filtros['desde'] ?? '',
                'hasta' => $filtros['hasta'] ?? '',
                'buscar' => $filtros['buscar'] ?? '',
            ],
            'estados' => [
                'pendiente_confirmacion' => 'Pendiente Confirmación',
                'en_transito' => 'En Tránsito',
                'recibido_parcial' => 'Recibido Parcial',
                'recibido_completo' => 'Recibido Completo',
                'rechazado' => 'Rechazado',
                'cancelado' => 'Cancelado',
            ],
        ]);
    }

    /**
     * Totales de TODO lo que cumple los filtros (no solo la página): cuántos movimientos, cuántas
     * unidades en cada etapa y cuántos por estado.
     *
     * @param  Builder<Movimiento>  $consulta
     * @return array{movimientos: int, unidades_solicitadas: int, unidades_despachadas: int, unidades_recibidas: int, por_estado: array<string, int>, parciales: array{movimientos: int, unidades_faltantes: int}}
     */
    private function totales(Builder $consulta): array
    {
        $unidades = MovimientoDetalle::whereIn('movimiento_id', (clone $consulta)->select('movimientos.id'))
            ->selectRaw('COALESCE(SUM(cantidad_solicitada), 0) as solicitadas, COALESCE(SUM(cantidad_despachada), 0) as despachadas, COALESCE(SUM(cantidad_recibida), 0) as recibidas')
            ->first();

        $porEstado = (clone $consulta)
            ->reorder()
            ->selectRaw('estado, COUNT(*) as total')
            ->groupBy('estado')
            ->pluck('total', 'estado')
            ->map(fn ($total) => (int) $total)
            ->all();

        $unidadesFaltantes = MovimientoDetalle::whereIn('movimiento_id', (clone $consulta)->where('estado', 'recibido_parcial')->select('movimientos.id'))
            ->selectRaw('COALESCE(SUM(cantidad_despachada - COALESCE(cantidad_recibida, 0)), 0) as faltantes')
            ->value('faltantes');

        return [
            'movimientos' => array_sum($porEstado),
            'unidades_solicitadas' => (int) $unidades->solicitadas,
            'unidades_despachadas' => (int) $unidades->despachadas,
            'unidades_recibidas' => (int) $unidades->recibidas,
            'por_estado' => $porEstado,
            'parciales' => [
                'movimientos' => $porEstado['recibido_parcial'] ?? 0,
                'unidades_faltantes' => (int) $unidadesFaltantes,
            ],
        ];
    }
}
