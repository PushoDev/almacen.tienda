<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Almacen;
use App\Models\Cliente;
use App\Models\Moneda; // AGREGAR ESTA LÍNEA
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

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
            'email' => 'pushodevs@posglorietashop.com',
            'password' => Hash::make('guisa290**'),
            'role' => 'admin',
        ]);
        // Nuevos usuarios administradores
        User::factory()->create([
            'name' => 'Lazaro',
            'email' => 'lazaro2025@posglorietashop.com',
            'password' => Hash::make('lazaro2025'),
            'role' => 'admin',
        ]);
        User::factory()->create([
            'name' => 'Angel',
            'email' => 'angel2025@posglorietashop.com',
            'password' => Hash::make('angel2025'),
            'role' => 'admin',
        ]);
        User::factory()->create([
            'name' => 'Aylin',
            'email' => 'aylin2025@posglorietashop.com',
            'password' => Hash::make('aylin2025'),
            'role' => 'admin',
        ]);
        // Usuarios Vendedores
        User::factory()->create([
            'name' => 'Aismaray',
            'email' => 'icha8506@posglorietashop.com',
            'password' => Hash::make('icha8506'),
            'role' => 'vendedor',
        ]);
        User::factory()->create([
            'name' => 'Manuel',
            'email' => 'manuel2025@posglorietashop.com',
            'password' => Hash::make('manuel2025'),
            'role' => 'vendedor',
        ]);
        User::factory()->create([
            'name' => 'Yusi',
            'email' => 'yusi2025@posglorietashop.com',
            'password' => Hash::make('yusi2025'),
            'role' => 'vendedor',
        ]);

        // ========== AGREGAR MONEDA POR DEFECTO ==========
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
        // Nueva Moneda
        $monedas = [
            [
                'codigo_moneda' => 'CUP',
                'nombre_moneda' => 'Peso Cubano MN',
                'simbolo_moneda' => 'CUP',
                'tasa_cambio' => 450.0,
                'commission' => 0,
                'estado' => true,
                'principal' => false,
            ]
        ];

        foreach ($monedas as $moneda) {
            Moneda::firstOrCreate(
                ['codigo_moneda' => $moneda['codigo_moneda']],
                $moneda
            );
        }
        // ========== FIN MONEDA POR DEFECTO ==========

        // Crear el almacén predeterminado
        Almacen::firstOrCreate(
            ['nombre_almacen' => 'ALMACEN ROTURAS'],
            [
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+53 5 5423017',
                'correo_almacen' => 'conservasindistro@glorieta.com',
                'provincia_almacen' => 'Mayabeque',
                'ciudad_almacen' => 'Mariel',
                'notas_almacen' => 'Este es el almacén predeterminado para roturas u otras funciones.',
            ]
        );
        // Nuevos almacenes
        $almacenes = [
            [
                'nombre_almacen' => 'ALMACEN MANZANILLO',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+53 5 1234567',
                'correo_almacen' => 'manzanillo@glorietashop.com',
                'provincia_almacen' => 'Granma',
                'ciudad_almacen' => 'Manzanillo',
                'notas_almacen' => 'Almacén principal de Manzanillo',
            ],
            [
                'nombre_almacen' => 'TIENDA MANZANILLO',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 7654321',
                'correo_almacen' => 'tiendamanzanillo@glorietashop.com',
                'provincia_almacen' => 'Granma',
                'ciudad_almacen' => 'Manzanillo',
                'notas_almacen' => 'Punto de venta en Manzanillo',
            ],
            [
                'nombre_almacen' => 'ALMACEN BEJUCAL',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+53 5 5555555',
                'correo_almacen' => 'quivican@glorieta.com',
                'provincia_almacen' => 'Mayabeque',
                'ciudad_almacen' => 'Quivicán',
                'notas_almacen' => 'Almacén regional de Quivicán',
            ],
            [
                'nombre_almacen' => 'TIENDA QUIVICAN',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 5555556',
                'correo_almacen' => 'quivican@glorietashop.com',
                'provincia_almacen' => 'Mayabeque',
                'ciudad_almacen' => 'Quivicán',
                'notas_almacen' => 'Punto de Venta en Quivicán',
            ],
            [
                'nombre_almacen' => 'TIENDA FLORIDA',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 5555557',
                'correo_almacen' => 'tendaflorida@glorietashop.com',
                'provincia_almacen' => 'Camaguey',
                'ciudad_almacen' => 'Florida',
                'notas_almacen' => 'Punto de Venta en Florida',
            ],
            [
                'nombre_almacen' => 'TIENDA LA SALUO',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 53564121',
                'correo_almacen' => 'tiendalasalud@glorietashop.com',
                'provincia_almacen' => 'Mayabeque',
                'ciudad_almacen' => 'Cotorro',
                'notas_almacen' => 'Punto de venta en El Cotorro',
            ],
            // === Inventario por almacén (docs/inventario_por_almacen) ===
            [
                'nombre_almacen' => 'ALMACEN DAILY',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+53 5 6000001',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Almacén (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN DESTINY',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+53 5 6000002',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Almacén (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN ELDY',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+53 5 6000003',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Almacén (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN PANAMA',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+53 5 6000004',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Almacén (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN SACO',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+53 5 6000005',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Almacén (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN TITO',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+53 5 6000006',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Almacén (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN YADIER',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+53 5 6000007',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Almacén (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN DAYLIN',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 7000001',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Punto de venta (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN EDNEY',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 7000002',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Punto de venta (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN JUGUETERIA MANZANILLO',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 7000003',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Punto de venta (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN LA SALUD',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 7000004',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Punto de venta (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN MANZA TIANDA',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 7000005',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Punto de venta (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN MECO TIA',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 7000006',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Punto de venta (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN OFICINA',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 7000007',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Punto de venta (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN QUIVICAN TIENDA',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 7000008',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Punto de venta (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN RIGO COTORRO',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 7000009',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Punto de venta (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN ROSY ELECTRICO',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 7000010',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Punto de venta (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN SAN ANTONIO',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 7000011',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Punto de venta (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN TELEFONOS Y COVERS',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 7000012',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Punto de venta (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'ALMACEN YUSI',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 7000013',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Punto de venta (según inventario_por_almacen).',
            ],
            [
                'nombre_almacen' => 'DAILY PANAMA',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 7000014',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'Punto de venta (según inventario_por_almacen).',
            ],
        ];

        foreach ($almacenes as $almacen) {
            Almacen::firstOrCreate(
                ['nombre_almacen' => $almacen['nombre_almacen']],
                $almacen
            );
        }

        // Insertar categorías
        DB::table('categorias')->insert([
            [
                'nombre_categoria' => 'COCINA',
                'descripcion_categoria' => 'Equipos de Cocina, cafeteras, hornillas, hornos, etc',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'REFRIGERACION',
                'descripcion_categoria' => 'Refrigeración, Neveras',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'CELULARES',
                'descripcion_categoria' => 'Celulares, Tablets, Memorias SD/USB, Laptop, etc',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'AUDIOVISUALES',
                'descripcion_categoria' => 'Smartv, Cajitas, Equipos audiovisuales',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'CICLOMOTORES',
                'descripcion_categoria' => 'Bicicletas, Motorinas, etc',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'MISCELANEAS',
                'descripcion_categoria' => 'Split, Plantas, Motores, Turbinas, etc',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'ACCESORIOS',
                'descripcion_categoria' => 'Mochilas, Adornos para el hogar',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

        ]);

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

        // Clientes Asociados al Sistema por default
        $clientes = [
            [
                'nombre_cliente' => 'CLIENTE ASOCIADO MANZANILLO',
                'tipo_cliente' => 'asociado',
                'deuda_pago_cliente' => 0,
                'telefono_cliente' => '+53 55572430',
                'direccion_cliente' => 'Dirección Manzanillo',
                'ciudad_cliente' => 'Manzanillo',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_cliente' => 'CLIENTE ASOCIADO QUIVICAN',
                'tipo_cliente' => 'asociado',
                'deuda_pago_cliente' => 0,
                'telefono_cliente' => '+53 52696901',
                'direccion_cliente' => 'Dirección Quivicán',
                'ciudad_cliente' => 'Quivicán',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_cliente' => 'CLIENTE ASOCIADO FLORIDA',
                'tipo_cliente' => 'asociado',
                'deuda_pago_cliente' => 0,
                'telefono_cliente' => '+53 56142247',
                'direccion_cliente' => 'Dirección Florida',
                'ciudad_cliente' => 'Florida',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_cliente' => 'CLIENTE ASOCIADO LA SALUD',
                'tipo_cliente' => 'asociado',
                'deuda_pago_cliente' => 0,
                'telefono_cliente' => '+53 50331881',
                'direccion_cliente' => 'Dirección Havana',
                'ciudad_cliente' => 'Ciudad Habana',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($clientes as $cliente) {
            Cliente::firstOrCreate(
                ['nombre_cliente' => $cliente['nombre_cliente']],
                $cliente
            );
        }
    }
}
