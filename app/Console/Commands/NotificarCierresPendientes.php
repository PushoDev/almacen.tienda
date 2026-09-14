<?php

namespace App\Console\Commands;

use App\Models\CierreCaja;
use App\Models\User;
use App\Notifications\CierresPendientesNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

class NotificarCierresPendientes extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:notificar-cierres-pendientes';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Notifica a los admins qué usuarios moderador/vendedor no han registrado su Cierre de Caja hoy';

    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        $pendientes = User::whereIn('role', ['moderador', 'vendedor'])
            ->get()
            ->reject(fn (User $user) => CierreCaja::where('user_id', $user->id)
                ->whereDate('fecha_cierre', today())
                ->exists()
            );

        if ($pendientes->isEmpty()) {
            $this->info('Todos los usuarios moderador/vendedor ya registraron su cierre hoy.');

            return;
        }

        $admins = User::where('role', 'admin')->get();
        Notification::send($admins, new CierresPendientesNotification($pendientes));

        $this->info("Notificados {$admins->count()} admin(s) sobre {$pendientes->count()} usuario(s) sin cierre hoy.");
    }
}
