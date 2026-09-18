<?php

use App\Http\Middleware\CheckAlmacenPermission;
use App\Http\Middleware\CheckCuentaPermission;
use App\Http\Middleware\EnsureUserIsAdmin;
use App\Http\Middleware\EnsureUserIsAdminOnly;
use App\Http\Middleware\EnsureUserIsModerator;
use App\Http\Middleware\EnsureUserIsVendor;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RequireTurnoActivo;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleCors::class,
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            // CheckAlmacenPermission::class,
        ]);

        /**
         *  Registrar middlewares personalizados
         */
        $middleware->alias([
            'admin' => EnsureUserIsAdmin::class,
            'admin.only' => EnsureUserIsAdminOnly::class,
            'moderator' => EnsureUserIsModerator::class,
            'vendor' => EnsureUserIsVendor::class,
            'check.cuenta.permission' => CheckCuentaPermission::class,
            'requiere.turno' => RequireTurnoActivo::class,
        ]);
    })
    ->withSchedule(function (Schedule $schedule) {
        // Cierra el snapshot de comparación mensual del dashboard (Tabla 2) al inicio de cada mes.
        // Nota: este proyecto no tenía ningún scheduler registrado hasta ahora — para que esto
        // corra en producción hace falta confirmar que el cron `* * * * * php artisan schedule:run`
        // esté configurado en el servidor. AdminController::index() tiene una red de seguridad que
        // hace el mismo cierre en el primer acceso del mes nuevo si este comando no llegó a correr.
        $schedule->command('comparacion:cerrar-mes')->monthlyOn(1, '00:00');
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            // 419 (token CSRF vencido) solo ocurre en un envío de formulario (POST/PUT/PATCH/DELETE) —
            // volver a la misma pantalla con un flash es mejor UX que una página completa: el usuario
            // no pierde lo que estaba llenando. Sigue la recomendación oficial de Inertia para este caso.
            if ($response->getStatusCode() === 419) {
                return back()->with(['error' => 'Tu sesión expiró. Por favor, intenta de nuevo.']);
            }

            if (! app()->environment(['local', 'testing']) && in_array($response->getStatusCode(), [403, 404, 500, 503])) {
                return Inertia::render('errors/Error', [
                    'status' => $response->getStatusCode(),
                    'authenticated' => $request->user() !== null,
                ])
                    ->toResponse($request)
                    ->setStatusCode($response->getStatusCode());
            }

            return $response;
        });
    })->create();
