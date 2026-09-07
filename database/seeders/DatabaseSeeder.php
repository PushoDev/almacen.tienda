<?php

namespace Database\Seeders;

use App\Models\Almacen;
use App\Models\Moneda;
use App\Models\User; // AGREGAR ESTA LÍNEA
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Usuario Development
        User::factory()->create([
            'name' => 'Luis Alberto',
            'email' => 'desarrollo@glorietashop.com',
            'password' => Hash::make('guisa290**'),
            'role' => 'admin',
        ]);
        // Nuevos usuarios administradores
        User::factory()->create([
            'name' => 'Lazaro Tabares',
            'email' => 'administrador.gral@glorietashop.com',
            'password' => Hash::make('lazaro2025'),
            'role' => 'admin',
        ]);
        User::factory()->create([
            'name' => 'Angel Sanchez',
            'email' => 'administrador@glorietashop.com',
            'password' => Hash::make('angel2025'),
            'role' => 'admin',
        ]);
        User::factory()->create([
            'name' => 'Gestion 1',
            'email' => 'soporte.general@glorietashop.com',
            'password' => Hash::make('auditoria2025'),
            'role' => 'admin',
        ]);
        // Usuarios Vendedores
        User::factory()->create([
            'name' => 'Bejucal',
            'email' => 'bejucal.pventa@glorietashop.com',
            'password' => Hash::make('bejucal2025'),
            'role' => 'vendedor',
        ]);
        User::factory()->create([
            'name' => 'La Salud',
            'email' => 'lasalud.pventa@glorietashop.com',
            'password' => Hash::make('lasalud2025'),
            'role' => 'vendedor',
        ]);
        User::factory()->create([
            'name' => 'Quivican',
            'email' => 'quivican.pventa@glorietashop.com',
            'password' => Hash::make('quivican2025'),
            'role' => 'vendedor',
        ]);
        User::factory()->create([
            'name' => 'Manzanillo 1',
            'email' => 'manzanillo1.pventa@glorietashop.com',
            'password' => Hash::make('manzanillo12025'),
            'role' => 'vendedor',
        ]);
        User::factory()->create([
            'name' => 'Manzanillo 2',
            'email' => 'manzanillo2.pventa@glorietashop.com',
            'password' => Hash::make('manzanillo22025'),
            'role' => 'vendedor',
        ]);
        User::factory()->create([
            'name' => 'Venta Oficina',
            'email' => 'oficina.vendor@glorietashop.com',
            'password' => Hash::make('oficina2025'),
            'role' => 'vendedor',
        ]);
        User::factory()->create([
            'name' => 'Gestion 2',
            'email' => 'gestion2.general@glorietashop.com',
            'password' => Hash::make('gestion22025'),
            'role' => 'moderador',
        ]);

        // ========== MONEDA POR DEFECTO — solo USD/CUP/EUR (sin MLC, sin cuentas base:
        // arranque limpio de producción, pedido explícito del cliente 2026-09-07) ==========
        Moneda::firstOrCreate(
            ['codigo_moneda' => 'USD'],
            [
                'nombre_moneda' => 'Dólar Estadounidense',
                'simbolo_moneda' => 'USD',
                'tasa_cambio' => 1.0,
                'commission' => 0,
                'estado' => true,
                'principal' => true,
            ]
        );
        $monedas = [
            [
                'codigo_moneda' => 'CUP',
                'nombre_moneda' => 'Peso Cubano MN',
                'simbolo_moneda' => 'CUP',
                'tasa_cambio' => 540.0,
                'commission' => 0,
                'estado' => true,
                'principal' => false,
            ],
            [
                'codigo_moneda' => 'EUR',
                'nombre_moneda' => 'Moneda Euro, Europea',
                'simbolo_moneda' => 'EUR',
                'tasa_cambio' => 1.0,
                'commission' => 0,
                'estado' => true,
                'principal' => false,
            ],
        ];

        foreach ($monedas as $moneda) {
            Moneda::firstOrCreate(
                ['codigo_moneda' => $moneda['codigo_moneda']],
                $moneda
            );
        }
        // ========== FIN MONEDA POR DEFECTO ==========

        // Almacén único de arranque — el cliente crea los reales desde la interfaz.
        Almacen::firstOrCreate(
            ['nombre_almacen' => 'ALMACEN DE SALIDA'],
            [
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '00000000',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => null,
            ]
        );

        // Sin categorías — se importan desde Excel (pedido explícito del cliente 2026-09-07).
        // Sin cuentas base — el cliente las crea a mano desde la interfaz cuando las necesite.

        // Datos Movimientos financieros
        DB::table('tipos_movimiento_financiero')->insert([
            [
                'id' => 1,
                'nombre' => 'Gasto Operativo',
                'efecto' => 'egreso',
                'descripcion' => 'Movimientos que reducen el saldo de una cuenta (Ej: Compras, Pagos de Servicios).',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 2,
                'nombre' => 'Ingreso por Venta',
                'efecto' => 'ingreso',
                'descripcion' => 'Movimientos que aumentan el saldo de una cuenta (Ej: Ventas, Depósitos).',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 3,
                'nombre' => 'Transferencia Interna',
                'efecto' => 'egreso', // Aunque es un movimiento doble, lo clasificamos por el efecto que inicia (el egreso).
                'descripcion' => 'Movimiento entre dos cuentas internas (origen y destino).',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 4,
                'nombre' => 'Pago de Deuda',
                'efecto' => 'egreso',
                'descripcion' => 'Movimiento para reducir la deuda de una cuenta de pasivo.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
