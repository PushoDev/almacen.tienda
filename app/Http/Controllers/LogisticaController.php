<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Services\DashboardStatsService;
use App\Services\ResumenAlmacenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class LogisticaController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(DashboardStatsService $dashboardStatsService)
    {
        $user = Auth::user();
        if (! $user) {
            return redirect()->route('login');
        }

        $stats = $dashboardStatsService->getLogisticaStats($user);

        // Lista para el selector de "Resumen por Almacén" — solo admin/moderador (mismo criterio que
        // el resto de los resúmenes financieros de esta pantalla).
        $stats['almacenesLista'] = in_array($user->role, ['admin', 'moderador'], true)
            ? Almacen::orderBy('nombre_almacen')->get(['id', 'nombre_almacen'])
            : [];

        return Inertia::render('Logistica/Index', $stats);
    }

    /**
     * Resumen de un almacén (valor, precios, estado del stock, ventas por día) para la tarjeta
     * "Resumen por Almacén". Se pide bajo demanda al elegir el almacén, no junto con la página.
     */
    public function resumenAlmacen(Almacen $almacen, ResumenAlmacenService $resumenAlmacen): JsonResponse
    {
        return response()->json($resumenAlmacen->resumen($almacen));
    }
}
