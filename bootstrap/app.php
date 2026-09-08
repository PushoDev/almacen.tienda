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
        //
    })->create();
