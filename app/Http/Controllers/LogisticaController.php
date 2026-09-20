<?php

namespace App\Http\Controllers;

use App\Services\DashboardStatsService;
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

        return Inertia::render('Logistica/Index', $stats);
    }
}
