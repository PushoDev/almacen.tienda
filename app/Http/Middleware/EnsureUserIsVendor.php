<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsVendor
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // return $next($request);
        // Verificar si el usuario está autenticado y su rol es 'vendedor'
        if (Auth::check() && Auth::user()->role === 'vendedor') {
            return $next($request);
        }

        // Si no es 'vendedor', redirigir al dashboard de admin
        return redirect()->route('dashboard');
    }
}
