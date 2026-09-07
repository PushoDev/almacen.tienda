<?php

use App\Models\Almacen;
use App\Models\Categoria;
use App\Models\Cliente;
use App\Models\Cuenta;
use App\Models\Moneda;
use App\Models\User;

// Sincronizado con producción el 2026-09-01, y recortado a arranque limpio el 2026-09-07
// (pedido explícito del cliente para el `migrate:fresh --seed` real en producción) — verifica
// que el seeder deje exactamente lo que el cliente pidió: 11 usuarios con sus roles, un único
// almacén de arranque, sin categorías (se importan desde Excel), sin cuentas base, y solo las
// 3 monedas USD/CUP/EUR (sin MLC).

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

test('el seeder crea un único almacén de arranque, "ALMACEN DE SALIDA"', function () {
    $this->seed();

    expect(Almacen::count())->toBe(1);
    $this->assertDatabaseHas('almacens', ['nombre_almacen' => 'ALMACEN DE SALIDA', 'tipo_almacen' => 'almacen']);
});

test('el seeder ya no crea categorías — se importan desde Excel', function () {
    $this->seed();

    expect(Categoria::count())->toBe(0);
});

test('el seeder ya no crea los clientes de ejemplo', function () {
    $this->seed();

    expect(Cliente::count())->toBe(0);
});

test('el seeder crea solo las 3 monedas USD/CUP/EUR, sin MLC, y ninguna cuenta base', function () {
    $this->seed();

    expect(Moneda::count())->toBe(3);
    $this->assertDatabaseHas('monedas', ['codigo_moneda' => 'USD', 'principal' => true]);
    $this->assertDatabaseHas('monedas', ['codigo_moneda' => 'CUP']);
    $this->assertDatabaseHas('monedas', ['codigo_moneda' => 'EUR']);
    $this->assertDatabaseMissing('monedas', ['codigo_moneda' => 'MLC']);

    expect(Cuenta::count())->toBe(0);
});
