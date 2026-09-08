<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireTurnoActivo
{
    /**
     * Rutas exceptuadas aunque el usuario no tenga turno capturado hoy: la propia captura
     * de turno (si no, nunca podría capturarlo) y logout (un usuario bloqueado debe poder
     * salir de la sesión).
     */
    private const RUTAS_EXCEPTUADAS = [
        'turno-vendedor.store',
        'logout',
    ];

    /**
     * Solo bloquea escrituras (POST/PUT/PATCH/DELETE) para moderador/vendedor sin turno de
     * hoy — las páginas (GET) siempre renderizan; el bloqueo visual real lo hace el diálogo
     * global del frontend sobre la prop compartida `turno.requiereCaptura`.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || in_array($request->route()?->getName(), self::RUTAS_EXCEPTUADAS)) {
            return $next($request);
        }

        if (in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE']) && $user->requiereCapturaTurno()) {
            if ($request->wantsJson() || $request->header('X-Inertia')) {
                return response()->json(['message' => 'Debes capturar tu turno antes de continuar.'], 403);
            }

            abort(403, 'Debes capturar tu turno antes de continuar.');
        }

        return $next($request);
    }
}
