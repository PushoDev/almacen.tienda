<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // return $next($request);
        // Verificar si el usuario está autenticado y su rol es 'admin'
        if (Auth::check() && in_array(Auth::user()->role, ['admin', 'moderador'])) {
            return $next($request);
        }

        // Si no es 'admin', devolver JSON en peticiones Inertia/AJAX o redirigir en peticiones normales
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
