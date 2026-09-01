<?php

use App\Models\Almacen;
use App\Models\Categoria;
use App\Models\Cliente;
use App\Models\Cuenta;
use App\Models\Moneda;
use App\Models\User;

// Sincronizado con producción el 2026-09-01 (limpieza previa a un `migrate:fresh --seed`
// en producción) — verifica que el seeder deje exactamente lo que el cliente pidió:
// 11 usuarios con sus roles, 24 almacenes, 15 categorías, monedas y cuentas base.

test('el seeder crea exactamente los 11 usuarios reales con sus roles correctos', function () {
    $this->seed();

    expect(User::count())->toBe(11);

    $roles = [
        'desarrollo@glorietashop.com' => 'admin',
        'administrador.gral@glorietashop.com' => 'admin',
        'administrador@glorietashop.com' => 'admin',
        'soporte.general@glorietashop.com' => 'admin',
        'bejucal.pventa@glorietashop.com' => 'vendedor',
        'lasalud.pventa@glorietashop.com' => 'vendedor',
        'quivican.pventa@glorietashop.com' => 'vendedor',
        'manzanillo1.pventa@glorietashop.com' => 'vendedor',
        'manzanillo2.pventa@glorietashop.com' => 'vendedor',
        'oficina.vendor@glorietashop.com' => 'vendedor',
        'gestion2.general@glorietashop.com' => 'moderador',
    ];

    foreach ($roles as $email => $role) {
        $this->assertDatabaseHas('users', ['email' => $email, 'role' => $role]);
    }

    // El nombre del usuario soporte.general se corrigió para coincidir con producción
    // (el seeder decía "Auditoria Glorieta", en producción es "Gestion 1").
    expect(User::where('email', 'soporte.general@glorietashop.com')->value('name'))->toBe('Gestion 1');
});

test('el seeder crea exactamente los 24 almacenes reales de producción', function () {
    $this->seed();

    expect(Almacen::count())->toBe(24);

    // Nombres reales que en algún momento se escribieron distinto en el seeder viejo
    // (ej. "ALMACEN BEJUCAL" vs "BEJUCAL ALMACEN") — confirma que se usó el nombre real.
    $this->assertDatabaseHas('almacens', ['nombre_almacen' => 'BEJUCAL ALMACEN', 'tipo_almacen' => 'almacen']);
    $this->assertDatabaseHas('almacens', ['nombre_almacen' => 'LA SALUD ALMACEN', 'tipo_almacen' => 'punto_venta']);
    $this->assertDatabaseHas('almacens', ['nombre_almacen' => 'ROTURA ALMACEN']);
    $this->assertDatabaseHas('almacens', ['nombre_almacen' => 'ALMACEN ALI EXPRESS']);
    $this->assertDatabaseHas('almacens', ['nombre_almacen' => 'CONTENEDOR 1']);

    // El "ALMACEN ROTURAS" (con S) que creaba el seeder viejo ya no existe.
    $this->assertDatabaseMissing('almacens', ['nombre_almacen' => 'ALMACEN ROTURAS']);
});

test('el seeder crea exactamente las 15 categorías reales de producción', function () {
    $this->seed();

    expect(Categoria::count())->toBe(15);

    $this->assertDatabaseHas('categorias', ['nombre_categoria' => 'CELULAR']);
    $this->assertDatabaseHas('categorias', ['nombre_categoria' => 'AUDIO-VISUALES']);
    $this->assertDatabaseHas('categorias', ['nombre_categoria' => 'TRASPORTE']);
    $this->assertDatabaseHas('categorias', ['nombre_categoria' => 'JUGUETERIA']);
    $this->assertDatabaseHas('categorias', ['nombre_categoria' => 'OTROS']);

    // Ya no existen: "USO PERSONAL" (ya no está en producción) ni "AUDIOVISUALES"
    // sin guión (en producción es "AUDIO-VISUALES", con guión).
    $this->assertDatabaseMissing('categorias', ['nombre_categoria' => 'USO PERSONAL']);
    $this->assertDatabaseMissing('categorias', ['nombre_categoria' => 'AUDIOVISUALES']);
});

test('el seeder ya no crea los clientes de ejemplo', function () {
    $this->seed();

    expect(Cliente::count())->toBe(0);
});

test('el seeder crea las monedas y las cuentas base sin cambios', function () {
    $this->seed();

    expect(Moneda::count())->toBe(4);
    // 5 sucursales × 3 monedas (USD/CUP/EUR) = 15 cuentas base, sin cambios en esta limpieza.
    expect(Cuenta::count())->toBe(15);
    $this->assertDatabaseHas('cuentas', ['nombre_cuenta' => 'BEJUCAL USD']);
});
