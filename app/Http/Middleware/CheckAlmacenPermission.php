<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckAlmacenPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $almacenId = $request->route('almacen');
        if (! Auth::user()->almacenes->contains($almacenId) && ! Auth::user()->isAdmin()) {
            if ($request->wantsJson() || $request->header('X-Inertia')) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            abort(403);
        }

        return $next($request);
        // return $next($request);
    }
}
