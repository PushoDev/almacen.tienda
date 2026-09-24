<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdminOnly
{
    /**
     * A diferencia de EnsureUserIsAdmin (que también permite 'moderador'), este
     * middleware exige estrictamente el rol 'admin'. Usado en Compras porque el
     * negocio decidió que, por ahora, ni moderador ni vendedor deben registrar compras.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check() && Auth::user()->role === 'admin') {
            return $next($request);
        }

        if ($request->wantsJson() || $request->header('X-Inertia')) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // Sin sesión: al login. Con sesión pero sin el rol: al inicio con un aviso (el frontend lo muestra).
        if (! Auth::check()) {
            return redirect()->route('login');
        }

        return redirect()->route('dashboard')->with('error', 'No tienes permiso para acceder a esa sección.');
    }
}
