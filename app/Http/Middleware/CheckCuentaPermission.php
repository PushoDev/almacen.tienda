<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class CheckCuentaPermission
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if (!$user->isAdmin()) {
            if ($request->wantsJson() || $request->header('X-Inertia')) {
                return response()->json(['message' => 'Forbidden'], 403);
            }
            abort(403);
        }

        return $next($request);
    }
}
