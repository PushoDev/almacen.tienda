<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Envío de dinero entre cuentas que espera confirmación. Un vendedor que transfiere a una cuenta que no es
 * suya no acredita al instante: el dinero sale del origen y queda en tránsito hasta que el destino (o un
 * admin/moderador) confirma lo que llegó. Ver App\Services\TransferenciaPendienteService.
 */
class TransferenciaPendiente extends Model
{
    use HasFactory;

    public const ESTADO_EN_TRANSITO = 'en_transito';

    public const ESTADO_RECIBIDO = 'recibido';

    public const ESTADO_RECIBIDO_PARCIAL = 'recibido_parcial';

    public const ESTADO_RECHAZADO = 'rechazado';

    public const ESTADO_ANULADO = 'anulado';

    protected $table = 'transferencias_pendientes';

    protected $fillable = [
        'user_id',
        'turno_vendedor_id',
        'cuenta_origen_id',
        'cuenta_destino_id',
        'monto',
        'moneda',
        'monto_destino',
        'moneda_destino',
        'tasa_cambio_aplicada',
        'tasa_oficial_en_momento',
        'ganancia_perdida_cambiaria',
        'saldo_anterior_origen',
        'saldo_posterior_origen',
        'estado',
        'comentario',
        'monto_recibido',
        'monto_acreditado',
        'diferencia',
        'confirmado_por',
        'fecha_confirmacion',
        'diferencia_resuelta_por',
        'diferencia_resuelta_en',
        'diferencia_nota',
        'movimiento_financiero_id',
    ];

    protected $casts = [
        'monto' => 'double',
        'monto_destino' => 'double',
        'tasa_cambio_aplicada' => 'double',
        'tasa_oficial_en_momento' => 'double',
        'ganancia_perdida_cambiaria' => 'double',
        'saldo_anterior_origen' => 'double',
        'saldo_posterior_origen' => 'double',
        'monto_recibido' => 'double',
        'monto_acreditado' => 'double',
        'diferencia' => 'double',
        'fecha_confirmacion' => 'datetime',
        'diferencia_resuelta_en' => 'datetime',
    ];

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function confirmador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmado_por');
    }

    public function cuentaOrigen(): BelongsTo
    {
        return $this->belongsTo(Cuenta::class, 'cuenta_origen_id');
    }

    public function cuentaDestino(): BelongsTo
    {
        return $this->belongsTo(Cuenta::class, 'cuenta_destino_id');
    }

    public function movimientoFinanciero(): BelongsTo
    {
        return $this->belongsTo(MovimientoFinanciero::class);
    }

    public function seguimientos(): HasMany
    {
        return $this->hasMany(TransferenciaPendienteSeguimiento::class);
    }

    /**
     * Envíos que el usuario puede ver: admin y moderador todos; un vendedor los que envió él o los que
     * salen de / llegan a alguna de sus cuentas (para poder confirmarlos).
     *
     * @param  Builder<TransferenciaPendiente>  $query
     */
    public function scopeVisiblesPara(Builder $query, User $user): void
    {
        if (in_array($user->role, ['admin', 'moderador'])) {
            return;
        }

        $cuentasIds = $user->cuentas()->pluck('cuentas.id');

        $query->where(function (Builder $query) use ($user, $cuentasIds) {
            $query->where('user_id', $user->id)
                ->orWhereIn('cuenta_origen_id', $cuentasIds)
                ->orWhereIn('cuenta_destino_id', $cuentasIds);
        });
    }

    /**
     * Conteos de los widgets: lo que sigue abierto y es visible para el usuario — los envíos en tránsito, los que
     * esperan SU confirmación y las diferencias por resolver.
     *
     * @return array{en_transito: int, por_confirmar: int, con_diferencia: int}
     */
    public static function totalesPara(User $usuario): array
    {
        $enTransito = static::query()->visiblesPara($usuario)->where('estado', self::ESTADO_EN_TRANSITO)->get();

        return [
            'en_transito' => $enTransito->count(),
            'por_confirmar' => $enTransito->filter(fn (self $envio) => $envio->puedeRecibir($usuario))->count(),
            'con_diferencia' => static::query()->visiblesPara($usuario)
                ->where('estado', self::ESTADO_RECIBIDO_PARCIAL)
                ->whereNull('diferencia_resuelta_en')
                ->count(),
        ];
    }

    /**
     * Aviso "hay dinero en tránsito" que se muestra bajo el encabezado de las pantallas donde se mira el dinero:
     * cuántos envíos siguen abiertos, cuántos espera confirmar este usuario y cuánto es en total, separado por
     * moneda (no se puede sumar USD con CUP sin convertir). Solo cuenta lo que el usuario puede ver.
     *
     * @return array{total: int, por_confirmar: int, montos: array<int, array{moneda: string, monto: float}>}
     */
    public static function resumenAbiertosPara(User $usuario): array
    {
        $abiertos = static::query()->visiblesPara($usuario)->where('estado', self::ESTADO_EN_TRANSITO)->get(['id', 'user_id', 'cuenta_destino_id', 'monto', 'moneda']);

        return [
            'total' => $abiertos->count(),
            'por_confirmar' => $abiertos->filter(fn (self $envio) => $envio->puedeRecibir($usuario))->count(),
            'montos' => $abiertos->groupBy('moneda')
                ->map(fn ($grupo, $moneda) => ['moneda' => (string) $moneda, 'monto' => round((float) $grupo->sum('monto'), 2)])
                ->values()
                ->all(),
        ];
    }

    /**
     * Dinero que viaja ahora mismo en todo el sistema, por código de moneda y en USD (monto de origen entre la tasa
     * de la moneda de la cuenta de origen). Es el único cálculo del "en tránsito" que se suma al capital de admin y
     * moderador en Dashboard, Logística y Cuentas: ese dinero ya salió del origen y todavía no está en el destino,
     * así que ninguna cuenta lo cuenta.
     *
     * @return array{total_usd: float, cantidad: int, por_codigo: array<string, array{monto: float, equivalente_usd: float}>}
     */
    public static function resumenEnTransitoGlobal(): array
    {
        $filas = static::query()
            ->where('transferencias_pendientes.estado', self::ESTADO_EN_TRANSITO)
            ->join('cuentas', 'cuentas.id', '=', 'transferencias_pendientes.cuenta_origen_id')
            ->join('monedas', 'monedas.id', '=', 'cuentas.moneda_id')
            ->get(['transferencias_pendientes.monto', 'monedas.codigo_moneda', 'monedas.tasa_cambio']);

        $porCodigo = [];
        foreach ($filas as $fila) {
            $tasa = (float) $fila->tasa_cambio;
            $codigo = (string) $fila->codigo_moneda;
            $porCodigo[$codigo]['monto'] = ($porCodigo[$codigo]['monto'] ?? 0.0) + $fila->monto;
            $porCodigo[$codigo]['equivalente_usd'] = ($porCodigo[$codigo]['equivalente_usd'] ?? 0.0) + ($tasa > 0 ? $fila->monto / $tasa : 0.0);
        }

        $porCodigo = array_map(fn (array $moneda) => [
            'monto' => round($moneda['monto'], 2),
            'equivalente_usd' => round($moneda['equivalente_usd'], 2),
        ], $porCodigo);

        return [
            'total_usd' => round(array_sum(array_column($porCodigo, 'equivalente_usd')), 2),
            'cantidad' => $filas->count(),
            'por_codigo' => $porCodigo,
        ];
    }

    public function estaEnTransito(): bool
    {
        return $this->estado === self::ESTADO_EN_TRANSITO;
    }

    public function tieneDiferenciaPorResolver(): bool
    {
        return $this->estado === self::ESTADO_RECIBIDO_PARCIAL && $this->diferencia > 0 && $this->diferencia_resuelta_en === null;
    }

    /**
     * Qué puede hacer el usuario con este envío: confirmar o rechazar (quien tiene la cuenta destino, o
     * admin/moderador), anular (quien lo envió, o admin/moderador) y resolver una diferencia (admin/moderador).
     *
     * @return array{confirmar: bool, rechazar: bool, anular: bool, resolver_diferencia: bool}
     */
    public function permisosPara(User $user): array
    {
        $enTransito = $this->estaEnTransito();

        return [
            'confirmar' => $enTransito && $this->puedeRecibir($user),
            'rechazar' => $enTransito && $this->puedeRecibir($user),
            'anular' => $enTransito && $this->puedeAnular($user),
            'resolver_diferencia' => $this->esGlobal($user) && $this->tieneDiferenciaPorResolver(),
        ];
    }

    /**
     * Quien tiene la cuenta destino (de cualquier nivel de acceso) o admin/moderador puede confirmar o
     * rechazar. No mira el estado: eso lo decide el servicio con bloqueo.
     */
    public function puedeRecibir(User $user): bool
    {
        return $this->esGlobal($user) || $user->cuentas()->where('cuentas.id', $this->cuenta_destino_id)->exists();
    }

    /**
     * Quien lo envió o admin/moderador puede anularlo mientras siga en tránsito.
     */
    public function puedeAnular(User $user): bool
    {
        return $this->esGlobal($user) || $this->user_id === $user->id;
    }

    public function esGlobal(User $user): bool
    {
        return in_array($user->role, ['admin', 'moderador']);
    }

    /**
     * Nombre de quien dejó el seguimiento más reciente de ese estado. Requiere `seguimientos.usuario` cargado.
     */
    public function registradoPor(string $estado): ?string
    {
        return $this->seguimientos->where('estado', $estado)->sortByDesc('id')->first()?->usuario?->name;
    }
}
