<?php

namespace Database\Seeders;

use App\Models\Almacen;
use App\Models\Cuenta;
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
                'tasa_cambio' => 540.0,
                'commission' => 0,
                'estado' => true,
                'principal' => false,
            ],
            [
                'codigo_moneda' => 'MLC',
                'nombre_moneda' => 'Moneda Libremente Convertible',
                'simbolo_moneda' => 'MLC',
                'tasa_cambio' => 1.85,
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

        // ========== CUENTAS MONETARIAS POR DEFECTO ==========
        $codigosMoneda = Moneda::whereIn('codigo_moneda', ['USD', 'CUP', 'EUR'])
            ->get()
            ->keyBy('codigo_moneda');

        $basesCuentas = [
            'BEJUCAL',
            'LA SALUD',
            'QUIVICAN',
            'MANZANILLO 1',
            'MANZANILLO 2',
        ];

        foreach ($basesCuentas as $base) {
            foreach ($codigosMoneda as $codigo => $moneda) {
                $nombreCuenta = "{$base} {$codigo}";
                Cuenta::firstOrCreate(
                    ['nombre_cuenta' => $nombreCuenta],
                    [
                        'saldo_cuenta' => 0,
                        'tipo_moneda' => $codigo,
                        'tipo_cuenta' => 'permanentes',
                        'moneda_id' => $moneda->id,
                        'notas_cuenta' => null,
                        'tipo' => 'efectivo',
                        'estado' => 'activa',
                    ]
                );
            }
        }
        // ========== FIN CUENTAS MONETARIAS POR DEFECTO ==========

        // Almacenes reales (sincronizado con producción — ver Fase de limpieza 2026-09-01)
        $almacenes = [
            [
                'nombre_almacen' => 'ALMACEN MANZANILLO',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+53 5 1234567',
                'correo_almacen' => 'manzanillo@glorietashop.com',
                'provincia_almacen' => 'Granma',
                'ciudad_almacen' => 'Manzanillo',
                'notas_almacen' => 'Almacén principal de Manzanillo, mas conocido como Acopio',
            ],
            [
                'nombre_almacen' => 'TIENDA MANZANILLO 1',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 7654321',
                'correo_almacen' => 'tiendamanzanillo1@glorietashop.com',
                'provincia_almacen' => 'Granma',
                'ciudad_almacen' => 'Manzanillo',
                'notas_almacen' => 'Punto de venta en Manzanillo, Calle Marti como referencia',
            ],
            [
                'nombre_almacen' => 'TIENDA MANZANILLO 2',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 5 7654322',
                'correo_almacen' => 'tiendamanzanillo2@glorietashop.com',
                'provincia_almacen' => 'Granma',
                'ciudad_almacen' => 'Manzanillo',
                'notas_almacen' => 'Punto de venta en Manzanillo, En el frente al telecentro de TV Golfovision',
            ],
            [
                'nombre_almacen' => 'BEJUCAL ALMACEN',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+53 5 5555555',
                'correo_almacen' => 'quivican@glorieta.com',
                'provincia_almacen' => 'Mayabeque',
                'ciudad_almacen' => 'Quivicán',
                'notas_almacen' => 'Almacén regional de Quivicán',
            ],
            [
                'nombre_almacen' => 'LA SALUD ALMACEN',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '+53 53564121',
                'correo_almacen' => 'tiendalasalud@glorietashop.com',
                'provincia_almacen' => 'Mayabeque',
                'ciudad_almacen' => 'Cotorro',
                'notas_almacen' => 'Punto de venta en El Cotorro',
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
                'nombre_almacen' => 'TIENDA SAN JOSE',
                'tipo_almacen' => 'punto_venta',
                'telefono_almacen' => '123456788',
                'correo_almacen' => 'sanjose.tienda@glorietashop.com',
                'provincia_almacen' => 'MAYABEQUE',
                'ciudad_almacen' => 'SAN JOSE',
                'notas_almacen' => null,
            ],
            [
                'nombre_almacen' => 'ALMACEN ALI EXPRESS',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+56789456231',
                'correo_almacen' => 'ali.express@almacen.com',
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => null,
            ],
            [
                'nombre_almacen' => 'AMAZON ALMACEN',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+6789123456',
                'correo_almacen' => 'amazon.almacen@glorietashop.com',
                'provincia_almacen' => 'USA',
                'ciudad_almacen' => null,
                'notas_almacen' => null,
            ],
            [
                'nombre_almacen' => 'CHINA ALMACEN',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+7891234567',
                'correo_almacen' => 'china.almacen@glorietashop.com',
                'provincia_almacen' => 'CHINA',
                'ciudad_almacen' => null,
                'notas_almacen' => 'CHINA ALMACEN',
            ],
            [
                'nombre_almacen' => 'DANIEL ALMACEN',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+8912345678',
                'correo_almacen' => 'daniel.almacen@glorietashop.com',
                'provincia_almacen' => 'USA',
                'ciudad_almacen' => null,
                'notas_almacen' => null,
            ],
            [
                'nombre_almacen' => 'DAYLIN ALMACEN',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+9123456789',
                'correo_almacen' => 'daylin.almacen@glorietashop.com',
                'provincia_almacen' => 'MAYABEQUE',
                'ciudad_almacen' => null,
                'notas_almacen' => 'DAYLIN ALMACEN',
            ],
            [
                'nombre_almacen' => 'DESTINY ALMACEN',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+1234567892',
                'correo_almacen' => 'destiny.almacen@glorietashop.com',
                'provincia_almacen' => 'USA',
                'ciudad_almacen' => null,
                'notas_almacen' => 'DESTINY ALMACEN',
            ],
            [
                'nombre_almacen' => 'EBAY ALMACEN',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+23456789122',
                'correo_almacen' => 'ebay.almacen@glorietashop.com',
                'provincia_almacen' => 'USA',
                'ciudad_almacen' => null,
                'notas_almacen' => 'EBAY ALMACEN',
            ],
            [
                'nombre_almacen' => 'EDNEY ALMACEN',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+34567891233',
                'correo_almacen' => 'ednay.almacen@glorietashop.com',
                'provincia_almacen' => 'USA',
                'ciudad_almacen' => null,
                'notas_almacen' => 'EDNEY ALMACEN',
            ],
            [
                'nombre_almacen' => 'COTORRO ALMACEN',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+567891234566',
                'correo_almacen' => 'cotorro.almacen@glorietashop.com',
                'provincia_almacen' => 'MAYABEQUE',
                'ciudad_almacen' => 'COTORRO',
                'notas_almacen' => null,
            ],
            [
                'nombre_almacen' => 'MECO ALMACEN',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+789134567',
                'correo_almacen' => 'meco.almacen@glorietashop.com',
                'provincia_almacen' => 'MAYABEQUE',
                'ciudad_almacen' => null,
                'notas_almacen' => 'MECO ALMACEN',
            ],
            [
                'nombre_almacen' => 'OFICINA ALMACEN',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+234567891232',
                'correo_almacen' => 'oficina.almacen@glorietashop.com',
                'provincia_almacen' => 'MAYABEQUE',
                'ciudad_almacen' => null,
                'notas_almacen' => 'OFICINA ALMACEN',
            ],
            [
                'nombre_almacen' => 'SAN ANTONIO ALMACEN',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+561234567896',
                'correo_almacen' => 'sanantonio@glorietashop.com',
                'provincia_almacen' => 'MAYABEQUE',
                'ciudad_almacen' => null,
                'notas_almacen' => 'SAN ANTONIO ALMACEN',
            ],
            [
                'nombre_almacen' => 'CARLITIN ALMACEN',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+5612345665789',
                'correo_almacen' => 'carlitin.almacen@glorietashop.com',
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'CARLITIN ALMACEN',
            ],
            [
                'nombre_almacen' => 'TALLER BEJUCAL ALMACEN',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+1231234567',
                'correo_almacen' => 'taller.ejucal@glorietashop.com',
                'provincia_almacen' => 'MAYABEQUE',
                'ciudad_almacen' => null,
                'notas_almacen' => 'TALLER BEJUCAL ALMACEN',
            ],
            [
                'nombre_almacen' => 'QUIVICAN ALMACEN',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+123123456745',
                'correo_almacen' => 'quivican.almacen@glorietashop.com',
                'provincia_almacen' => 'MAYABEQUE',
                'ciudad_almacen' => null,
                'notas_almacen' => null,
            ],
            [
                'nombre_almacen' => 'ROTURA ALMACEN',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '+66556532',
                'correo_almacen' => 'roturas.almacen@glorietashop.com',
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => 'ESTE ES EL ALMACEN DON SE IMPORTAN Y SE ENVIAN PRODUCTOS CON DEFECTOS',
            ],
            [
                'nombre_almacen' => 'CONTENEDOR 1',
                'tipo_almacen' => 'almacen',
                'telefono_almacen' => '12345789',
                'correo_almacen' => null,
                'provincia_almacen' => null,
                'ciudad_almacen' => null,
                'notas_almacen' => null,
            ],
        ];

        foreach ($almacenes as $almacen) {
            Almacen::firstOrCreate(
                ['nombre_almacen' => $almacen['nombre_almacen']],
                $almacen
            );
        }

        // Insertar categorías (sincronizado con producción — ver Fase de limpieza 2026-09-01)
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
                'nombre_categoria' => 'LAVANDERÍA',
                'descripcion_categoria' => 'Lavadoras, Secadoras',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'CLIMATIZACIÓN',
                'descripcion_categoria' => 'Aire acondicionado, ventiladores, etc',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'TECNOLOGÍA',
                'descripcion_categoria' => 'Celulares, Tablets, Memorias SD/USB, Laptop, etc',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'TRANSPORTE',
                'descripcion_categoria' => 'Bicicletas, Motorinas, Equipos para transporte',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'FERRETERÍA',
                'descripcion_categoria' => 'Herramientas, materiales de construcción, etc',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'RESPALDO DE ENERGÍA',
                'descripcion_categoria' => 'Paneles Solares, Baterías, Cargadores Solares, etc',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'ACCESORIOS',
                'descripcion_categoria' => 'Mochilas, Carteras, Bolsos, etc',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'CELULAR',
                'descripcion_categoria' => 'Importado desde Excel',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'AUDIO-VISUALES',
                'descripcion_categoria' => 'Importado desde Excel',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'UTILES DEL HOGAR',
                'descripcion_categoria' => 'Importado desde Excel',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'OTROS',
                'descripcion_categoria' => 'Importado desde Excel',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'JUGUETERIA',
                'descripcion_categoria' => 'Importado desde Excel',
                'activar_categoria' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'nombre_categoria' => 'TRASPORTE',
                'descripcion_categoria' => 'Importado desde Excel',
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
    }
}
