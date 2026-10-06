<?php

namespace App\Services;

use App\Models\Cuenta;
use App\Models\MovimientoFinanciero;
use App\Models\TransferenciaPendiente;
use App\Models\User;
use App\Notifications\TransferenciaPendienteNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Ciclo de vida de un envío de dinero que espera confirmación: enviar (el dinero sale del origen),
 * confirmar (se acredita lo que llegó), rechazar o anular (el dinero vuelve al origen) y resolver la
 * diferencia cuando llegó menos de lo enviado. Toda acción que cambia un envío re-lee su estado con
 * `lockForUpdate` para que un doble clic o dos pestañas no lo apliquen dos veces.
 */
class TransferenciaPendienteService
{
    /**
     * Registra el envío: descuenta el monto del origen y queda en tránsito. Debe llamarse dentro de una
     * transacción, con las dos cuentas ya bloqueadas (`lockForUpdate`).
     *
     * @param  array{monto: float, moneda: string, monto_destino: float, moneda_destino: string, tasa_cambio_aplicada: float|null, tasa_oficial_en_momento: float|null, ganancia_perdida_cambiaria: float}  $calculo
     */
    public function enviar(User $emisor, Cuenta $origen, Cuenta $destino, array $calculo, ?string $comentario): TransferenciaPendiente
    {
        $saldoAnterior = (float) $origen->saldo_cuenta;
        $origen->decrement('saldo_cuenta', $calculo['monto']);

        $envio = TransferenciaPendiente::create([
            'user_id' => $emisor->id,
            'turno_vendedor_id' => $emisor->turnoActivo()?->id,
            'cuenta_origen_id' => $origen->id,
            'cuenta_destino_id' => $destino->id,
            'monto' => $calculo['monto'],
            'moneda' => $calculo['moneda'],
            'monto_destino' => $calculo['monto_destino'],
            'moneda_destino' => $calculo['moneda_destino'],
            'tasa_cambio_aplicada' => $calculo['tasa_cambio_aplicada'],
            'tasa_oficial_en_momento' => $calculo['tasa_oficial_en_momento'],
            'ganancia_perdida_cambiaria' => $calculo['ganancia_perdida_cambiaria'],
            'saldo_anterior_origen' => $saldoAnterior,
            'saldo_posterior_origen' => $saldoAnterior - $calculo['monto'],
            'estado' => TransferenciaPendiente::ESTADO_EN_TRANSITO,
            'comentario' => $comentario,
        ]);

        $this->registrarSeguimiento($envio, $emisor, TransferenciaPendiente::ESTADO_EN_TRANSITO, $comentario ?: 'Envío registrado, pendiente de confirmación.');

        $this->notificar(
            $envio,
            "{$emisor->name} envió {$envio->monto} {$envio->moneda} a la cuenta {$destino->nombre_cuenta}: pendiente de confirmación.",
            $this->usuariosDelDestino($envio)->merge($this->usuariosGlobales())->reject(fn (User $u) => $u->id === $emisor->id)
        );

        return $envio;
    }

    /**
     * Confirma lo que llegó. Se acredita al destino la parte proporcional del monto convertido; si llegó menos
     * de lo enviado, la diferencia queda "por resolver" para admin/moderador. Genera la transferencia normal
     * (tipo 3) que ven Rastreo y los reportes.
     *
     * @throws \DomainException
     */
    public function confirmar(TransferenciaPendiente $envio, User $usuario, float $montoRecibido, ?string $observaciones): TransferenciaPendiente
    {
        return DB::transaction(function () use ($envio, $usuario, $montoRecibido, $observaciones) {
            $this->bloquearEnTransito($envio);

            $montoRecibido = round($montoRecibido, 2);

            if ($montoRecibido <= 0) {
                throw new \DomainException('La cantidad recibida debe ser mayor que cero; si no llegó nada, rechaza el envío.');
            }

            if ($montoRecibido > $envio->monto + 0.004) {
                throw new \DomainException("No se puede recibir más de lo enviado ({$envio->monto} {$envio->moneda}).");
            }

            $llegoCompleto = abs($montoRecibido - $envio->monto) < 0.005;
            $acreditado = $llegoCompleto ? $envio->monto_destino : round($envio->monto_destino * $montoRecibido / $envio->monto, 2);
            $diferencia = $llegoCompleto ? 0.0 : round($envio->monto - $montoRecibido, 2);

            $destino = Cuenta::with('moneda')->lockForUpdate()->findOrFail($envio->cuenta_destino_id);
            $saldoAnteriorDestino = (float) $destino->saldo_cuenta;
            $destino->increment('saldo_cuenta', $acreditado);

            $movimiento = MovimientoFinanciero::create([
                'user_id' => $envio->user_id,
                'turno_vendedor_id' => $envio->turno_vendedor_id,
                'tipo_movimiento_id' => 3,
                'cuenta_origen_id' => $envio->cuenta_origen_id,
                'cuenta_destino_id' => $envio->cuenta_destino_id,
                'monto' => $envio->monto,
                'moneda' => $envio->moneda,
                'tasa_cambio_aplicada' => $envio->tasa_cambio_aplicada ?? 1.0,
                'tasa_oficial_en_momento' => $envio->tasa_oficial_en_momento,
                'ganancia_perdida_cambiaria' => $envio->ganancia_perdida_cambiaria,
                'descripcion' => $this->descripcionDelMovimiento($envio, $usuario, $montoRecibido),
                'fecha_operacion' => now(),
                'estado' => 'completado',
                'saldo_anterior_origen' => $envio->saldo_anterior_origen,
                'saldo_posterior_origen' => $envio->saldo_posterior_origen,
                'moneda_origen' => $envio->moneda,
                'saldo_anterior_destino' => $saldoAnteriorDestino,
                'saldo_posterior_destino' => $saldoAnteriorDestino + $acreditado,
                'moneda_destino' => $envio->moneda_destino,
            ]);

            $estado = $llegoCompleto ? TransferenciaPendiente::ESTADO_RECIBIDO : TransferenciaPendiente::ESTADO_RECIBIDO_PARCIAL;

            $envio->update([
                'estado' => $estado,
                'monto_recibido' => $montoRecibido,
                'monto_acreditado' => $acreditado,
                'diferencia' => $diferencia,
                'confirmado_por' => $usuario->id,
                'fecha_confirmacion' => now(),
                'movimiento_financiero_id' => $movimiento->id,
            ]);

            $nota = $llegoCompleto
                ? 'Recepción confirmada completa.'
                : "Llegaron {$montoRecibido} de {$envio->monto} {$envio->moneda} (diferencia: {$diferencia}).";
            $this->registrarSeguimiento($envio, $usuario, $estado, trim($nota.' '.$observaciones));

            $this->notificar(
                $envio,
                "{$usuario->name} confirmó el envío #{$envio->id}: ".($llegoCompleto ? 'llegó completo.' : "llegaron {$montoRecibido} de {$envio->monto} {$envio->moneda}."),
                $this->usuariosInteresados($envio)->reject(fn (User $u) => $u->id === $usuario->id)
            );

            return $envio->refresh();
        });
    }

    /**
     * Quien debía recibir el dinero lo rechaza: vuelve íntegro a la cuenta de origen.
     *
     * @throws \DomainException
     */
    public function rechazar(TransferenciaPendiente $envio, User $usuario, string $observaciones): TransferenciaPendiente
    {
        return $this->devolverAlOrigen($envio, $usuario, TransferenciaPendiente::ESTADO_RECHAZADO, $observaciones, 'rechazó');
    }

    /**
     * Quien lo envió (o admin/moderador) lo anula mientras sigue en tránsito: el dinero vuelve al origen.
     *
     * @throws \DomainException
     */
    public function anular(TransferenciaPendiente $envio, User $usuario, string $observaciones): TransferenciaPendiente
    {
        return $this->devolverAlOrigen($envio, $usuario, TransferenciaPendiente::ESTADO_ANULADO, $observaciones, 'anuló');
    }

    /**
     * Admin/moderador cierra una diferencia (llegó menos de lo enviado) dejando constancia de qué se hizo.
     *
     * @throws \DomainException
     */
    public function resolverDiferencia(TransferenciaPendiente $envio, User $usuario, string $nota): TransferenciaPendiente
    {
        return DB::transaction(function () use ($envio, $usuario, $nota) {
            $actual = TransferenciaPendiente::whereKey($envio->id)->lockForUpdate()->first();

            if (! $actual || ! $actual->tieneDiferenciaPorResolver()) {
                throw new \DomainException('Este envío no tiene una diferencia por resolver.');
            }

            $actual->update([
                'diferencia_resuelta_por' => $usuario->id,
                'diferencia_resuelta_en' => now(),
                'diferencia_nota' => $nota,
            ]);

            $this->registrarSeguimiento($actual, $usuario, 'diferencia_resuelta', $nota);

            return $actual->refresh();
        });
    }

    /**
     * @throws \DomainException
     */
    private function devolverAlOrigen(TransferenciaPendiente $envio, User $usuario, string $estadoFinal, string $observaciones, string $verbo): TransferenciaPendiente
    {
        return DB::transaction(function () use ($envio, $usuario, $estadoFinal, $observaciones, $verbo) {
            $this->bloquearEnTransito($envio);

            Cuenta::lockForUpdate()->findOrFail($envio->cuenta_origen_id)->increment('saldo_cuenta', $envio->monto);

            $envio->update([
                'estado' => $estadoFinal,
                'confirmado_por' => $usuario->id,
                'fecha_confirmacion' => now(),
            ]);

            $this->registrarSeguimiento($envio, $usuario, $estadoFinal, $observaciones);

            $this->notificar(
                $envio,
                "{$usuario->name} {$verbo} el envío #{$envio->id}: el dinero volvió a la cuenta de origen.",
                $this->usuariosInteresados($envio)->reject(fn (User $u) => $u->id === $usuario->id)
            );

            return $envio->refresh();
        });
    }

    /**
     * Re-lee el estado del envío con bloqueo y confirma que sigue en tránsito: con dos peticiones a la vez
     * (doble clic, o confirmar contra anular) las dos pasarían la revisión del modelo cargado al inicio y
     * solo la primera debe actuar. Al terminar, `$envio` queda con los valores actuales de la fila.
     *
     * @throws \DomainException
     */
    private function bloquearEnTransito(TransferenciaPendiente $envio): void
    {
        $estado = TransferenciaPendiente::whereKey($envio->id)->lockForUpdate()->value('estado');

        if ($estado !== TransferenciaPendiente::ESTADO_EN_TRANSITO) {
            throw new \DomainException('Este envío ya fue procesado.');
        }

        $envio->refresh();
    }

    private function registrarSeguimiento(TransferenciaPendiente $envio, User $usuario, string $estado, ?string $observaciones): void
    {
        $envio->seguimientos()->create([
            'estado' => $estado,
            'observaciones' => $observaciones,
            'user_id' => $usuario->id,
        ]);
    }

    private function descripcionDelMovimiento(TransferenciaPendiente $envio, User $confirmador, float $montoRecibido): string
    {
        $base = "Envío #{$envio->id} confirmado por {$confirmador->name}";
        $base .= abs($montoRecibido - $envio->monto) < 0.005
            ? ": {$envio->monto} {$envio->moneda}."
            : ": llegaron {$montoRecibido} de {$envio->monto} {$envio->moneda}.";

        return $envio->comentario ? "{$envio->comentario} — {$base}" : $base;
    }

    /**
     * @return Collection<int, User>
     */
    private function usuariosGlobales(): Collection
    {
        return User::whereIn('role', ['admin', 'moderador'])->get();
    }

    /**
     * @return Collection<int, User>
     */
    private function usuariosDelDestino(TransferenciaPendiente $envio): Collection
    {
        return User::whereHas('cuentas', fn ($query) => $query->where('cuentas.id', $envio->cuenta_destino_id))->get();
    }

    /**
     * Quien envió, quienes tienen la cuenta destino y admin/moderador.
     *
     * @return Collection<int, User>
     */
    private function usuariosInteresados(TransferenciaPendiente $envio): Collection
    {
        return $this->usuariosDelDestino($envio)
            ->merge($this->usuariosGlobales())
            ->push($envio->usuario)
            ->unique('id');
    }

    /**
     * @param  Collection<int, User>  $usuarios
     */
    private function notificar(TransferenciaPendiente $envio, string $mensaje, Collection $usuarios): void
    {
        try {
            Notification::send($usuarios->unique('id'), new TransferenciaPendienteNotification($envio, $mensaje));
        } catch (\Throwable $e) {
            Log::error("Error notificando el envío pendiente #{$envio->id}: ".$e->getMessage());
        }
    }
}
