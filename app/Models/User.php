<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'avatar',
        'role',
        'telegram_chat_id',
        'telegram_link_token',
    ];

    protected $appends = ['avatar_url'];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => 'string',
        ];
    }

    /**
     * Undocumented function
     * ✅ Relación muchos a muchos con Almacen
     *
     * @return void
     */
    public function almacenes()
    {
        return $this->belongsToMany(Almacen::class, 'user_almacens')
            ->using(UserAlmacen::class);
    }

    /**
     * Undocumented function
     * Relación con productos y precios personalizados
     *
     * @return void
     */
    public function productos()
    {
        return $this->belongsToMany(Producto::class, 'producto_vendedors')
            ->using(ProductoVendedor::class)
            ->withPivot('precio_venta', 'venta_ganancia');
    }

    /**
     * Undocumented function
     * ✅ Relación muchos a muchos con Cuentas
     *
     * @return void
     */
    public function cuentas()
    {
        return $this->belongsToMany(Cuenta::class, 'user_cuentas')->withPivot('acceso');
    }

    /**
     * Cuentas con acceso completo: las únicas cuyo saldo ve el vendedor y desde las que puede operar.
     * Las de acceso `cobro` solo sirven para recibir pagos de ventas.
     */
    public function cuentasCompletas(): BelongsToMany
    {
        return $this->cuentas()->wherePivot('acceso', Cuenta::ACCESO_COMPLETO);
    }

    /**
     * Cuentas que este usuario puede usar como propias: admin y moderador tienen acceso a todas (no se les
     * asigna ninguna en `user_cuentas`), y un vendedor solo las asignadas con acceso completo.
     */
    public function cuentasUsables(): Builder|BelongsToMany
    {
        return $this->isAdmin() || $this->isModerator() ? Cuenta::query() : $this->cuentasCompletas();
    }

    public function puedeUsarCuenta(int $cuentaId): bool
    {
        return $this->cuentasUsables()->where('cuentas.id', $cuentaId)->exists();
    }

    /**
     * Cuentas "propias" de este usuario para elegir como origen/destino en Gasto, Ingreso,
     * Transferencia, Transacciones y Distribución de Costos: admin y moderador ven TODAS las
     * cuentas (acceso global, sin filas en `user_cuentas` — igual que `cuentasUsables()`); un
     * vendedor ve las que tiene asignadas, sin distinguir todavía el nivel de acceso (`completo`/
     * `cobro`) — eso es un paso aparte, pendiente de confirmar con el cliente.
     *
     * Único punto de verdad para el patrón repetido `role === 'vendedor' ? cuentas() :
     * Cuenta::all()` que existía copiado en varios controladores — evita que alguno se quede
     * comparando solo `cuentas()` y termine mostrándole al admin/moderador una lista vacía (ya
     * pasó una vez con la comisión de venta, ver `cuentasUsables()`).
     */
    public function cuentasPropias(): Builder|BelongsToMany
    {
        return $this->isAdmin() || $this->isModerator() ? Cuenta::query() : $this->cuentas();
    }

    public function getAvatarUrlAttribute(): ?string
    {
        if (! $this->avatar) {
            return null;
        }

        return asset($this->avatar);
    }

    public function routeNotificationForTelegram(): ?string
    {
        return $this->telegram_chat_id;
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isModerator(): bool
    {
        return $this->role === 'moderador';
    }

    /**
     * Log append-only de quién atendió bajo esta cuenta (feature "Atendido por" / Turnos).
     */
    public function turnosVendedor()
    {
        return $this->hasMany(TurnoVendedor::class);
    }

    /**
     * Fila más reciente de turnosVendedor() para este usuario, o null si nunca capturó ninguna.
     */
    public function turnoActivo(): ?TurnoVendedor
    {
        return $this->turnosVendedor()->latest('iniciado_en')->first();
    }

    /**
     * true si este usuario necesita capturar/confirmar el turno: solo aplica a
     * moderador/vendedor (admin nunca). Dos condiciones independientes disparan la captura:
     * (1) el turno activo no es de hoy (cada día exige al menos una confirmación), o
     * (2) hubo un login nuevo desde la última captura — las cuentas son compartidas por
     * punto de venta, no por persona, así que un cambio de turno a mitad del día (logout +
     * login de otra persona) debe volver a preguntar aunque ya se haya confirmado hoy mismo.
     * La bandera de sesión la arma AuthenticatedSessionController::store() en cada login y
     * la limpia TurnoVendedorController::store() al capturar.
     */
    public function requiereCapturaTurno(): bool
    {
        if (! in_array($this->role, ['moderador', 'vendedor'])) {
            return false;
        }

        if (session('turno_pendiente_confirmacion', false)) {
            return true;
        }

        $activo = $this->turnoActivo();

        return $activo === null || ! $activo->iniciado_en->isToday();
    }
}
