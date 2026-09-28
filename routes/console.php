<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Aviso diario a admins de qué moderador/vendedor no ha registrado su Cierre de Caja hoy.
Schedule::command('app:notificar-cierres-pendientes')->dailyAt('21:00');

// Backup de la base de datos cada 6 horas: local (últimas 30 copias) + Telegram + Google Drive.
Schedule::command('backup:database')->everySixHours()->withoutOverlapping();
