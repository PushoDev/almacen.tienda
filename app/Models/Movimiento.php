<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Movimiento extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'almacen_origen_id',
        'almacen_destino_id',
        'user_id',
        'usuario_aprobacion_id',
        'tipo_movimiento',
        'estado',
        'observaciones',
        'guia_transporte',
        'transportista',
        'fecha_aprobacion',
        'fecha_envio',
        'fecha_recepcion',
        'requiere_prorrateo',
        'prorrateo_decision',
        'prorrateo_decidido_por',
        'prorrateo_decidido_en',
    ];

    protected $casts = [
        'fecha_aprobacion' => 'datetime',
        'fecha_envio' => 'datetime',
        'fecha_recepcion' => 'datetime',
        'requiere_prorrateo' => 'boolean',
        'prorrateo_decidido_en' => 'datetime',
    ];

    /**
     * Movimientos que el usuario puede ver: admin y moderador todos; un vendedor solo los que
     * salen de alguno de sus almacenes o llegan a alguno (misma regla con la que se decide a
     * quién se le notifica un movimiento, ver MovimientoStockNotification).
     *
     * @param  Builder<Movimiento>  $query
     */
    public function scopeVisiblesPara(Builder $query, User $user): void
    {
        if (in_array($user->role, ['admin', 'moderador'])) {
            return;
        }

        $almacenesIds = $user->almacenes()->pluck('almacens.id');

        $query->where(function (Builder $query) use ($almacenesIds) {
            $query->whereIn('almacen_origen_id', $almacenesIds)
                ->orWhereIn('almacen_destino_id', $almacenesIds);
        });
    }

    /**
     * Filtros del historial de movimientos (reporte).
     *
     * @param  Builder<Movimiento>  $query
     * @param  array{estado?: ?string, almacen_origen_id?: ?int, almacen_destino_id?: ?int, sentido?: ?string, desde?: ?string, hasta?: ?string, buscar?: ?string}  $filtros
     * @param  array<int, int>  $userAlmacenesIds  almacenes del usuario (vacío para admin y moderador), base de "sentido"
     */
    public function scopeFiltrar(Builder $query, array $filtros, array $userAlmacenesIds = []): void
    {
        $query
            ->when($filtros['estado'] ?? null, fn (Builder $query, string $estado) => $query->where('estado', $estado))
            ->when($filtros['almacen_origen_id'] ?? null, fn (Builder $query, int $id) => $query->where('almacen_origen_id', $id))
            ->when($filtros['almacen_destino_id'] ?? null, fn (Builder $query, int $id) => $query->where('almacen_destino_id', $id))
            ->when($userAlmacenesIds && ($filtros['sentido'] ?? null) === 'salientes', fn (Builder $query) => $query->whereIn('almacen_origen_id', $userAlmacenesIds))
            ->when($userAlmacenesIds && ($filtros['sentido'] ?? null) === 'entrantes', fn (Builder $query) => $query->whereIn('almacen_destino_id', $userAlmacenesIds))
            ->when($filtros['desde'] ?? null, fn (Builder $query, string $desde) => $query->whereDate('created_at', '>=', $desde))
            ->when($filtros['hasta'] ?? null, fn (Builder $query, string $hasta) => $query->whereDate('created_at', '<=', $hasta))
            ->when(trim($filtros['buscar'] ?? '') !== '', function (Builder $query) use ($filtros) {
                $termino = trim($filtros['buscar']);

                $query->where(function (Builder $query) use ($termino) {
                    if (ctype_digit(ltrim($termino, '#'))) {
                        $query->orWhere('id', (int) ltrim($termino, '#'));
                    }

                    $query->orWhereHas('usuario', fn (Builder $usuario) => $usuario->where('name', 'like', "%{$termino}%"))
                        ->orWhereHas('detalles.producto', fn (Builder $producto) => $producto
                            ->where('nombre_producto', 'like', "%{$termino}%")
                            ->orWhere('marca_producto', 'like', "%{$termino}%")
                            ->orWhere('modelo_producto', 'like', "%{$termino}%")
                            ->orWhere('codigo_producto', 'like', "%{$termino}%"));
                });
            });
    }

    /**
     * Lo que se trabaja en el día a día: lo creado en los últimos `$dias` días (contando hoy) más
     * todo movimiento aún sin cerrar (pendiente o en tránsito), por viejo que sea — uno en tránsito
     * no puede desaparecer de donde se recibe.
     *
     * @param  Builder<Movimiento>  $query
     */
    public function scopeRecientesOAbiertos(Builder $query, int $dias = 3): void
    {
        $query->where(function (Builder $query) use ($dias) {
            $query->where('created_at', '>=', now()->subDays($dias - 1)->startOfDay())
                ->orWhereIn('estado', ['pendiente_confirmacion', 'en_transito']);
        });
    }

    /**
     * Nombre de quien dejó el seguimiento más reciente de ese estado (o de alguno de esos estados).
     * Requiere `seguimientos.usuario` cargado para no consultar por cada movimiento.
     *
     * @param  string|array<int, string>  $estados
     */
    public function registradoPor(string|array $estados): ?string
    {
        return $this->seguimientos
            ->whereIn('estado', (array) $estados)
            ->sortByDesc('id')
            ->first()
            ?->usuario
            ?->name;
    }

    public function almacenOrigen(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_origen_id');
    }

    public function almacenDestino(): BelongsTo
    {
        return $this->belongsTo(Almacen::class, 'almacen_destino_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function usuarioAprobacion(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_aprobacion_id');
    }

    public function usuarioDecisionProrrateo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prorrateo_decidido_por');
    }

    public function detalles(): HasMany
    {
        return $this->hasMany(MovimientoDetalle::class);
    }

    public function seguimientos(): HasMany
    {
        return $this->hasMany(MovimientoSeguimiento::class);
    }
}
