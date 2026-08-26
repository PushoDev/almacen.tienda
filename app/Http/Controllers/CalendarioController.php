<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class CalendarioController extends Controller
{
    /**
     * Display the Calendario de Historial page.
     */
    public function index()
    {
        return Inertia::render('Calendario/Index');
    }
}
