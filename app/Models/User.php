<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
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
    ];

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
     * @return void
     */
    public function productos()
    {
        return $this->belongsToMany(Producto::class, 'producto_vendedors')
            ->using(ProductoVendedor::class)
            ->withPivot('precio_venta', 'importe_ganancia');
    }
}
