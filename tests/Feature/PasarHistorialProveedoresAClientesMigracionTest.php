<?php

use App\Models\Cliente;
use App\Models\MovimientoFinanciero;
use App\Models\Proveedor;
use App\Models\Remesa;
use App\Models\User;
use Illuminate\Support\Facades\DB;

function ejecutarMigracionHistorialProveedoresAClientes(): void
{
    $migracion = require base_path('database/migrations/2026_10_21_154612_pasar_historial_de_proveedores_a_clientes.php');
    $migracion->up();
}

function remesaDeProveedorDePrueba(array $overrides): Remesa
{
    return Remesa::create(array_merge([
        'user_id' => User::factory()->admin()->create()->id,
        'entrada_tipo' => 'cuenta',
        'entrada_monto' => 100,
        'entrada_moneda' => 'USD',
        'entrada_saldo_anterior' => 0,
        'entrada_saldo_posterior' => 100,
        'salida_tipo' => 'cuenta',
        'salida_monto' => 90,
        'salida_moneda' => 'USD',
        'salida_saldo_anterior' => 500,
        'salida_saldo_posterior' => 410,
        'fecha_operacion' => now(),
    ], $overrides));
}

test('los movimientos y remesas de un proveedor pasan al cliente del mismo nombre sin tocar saldos', function () {
    crearTiposMovimientoFinanciero();

    $cliente = Cliente::factory()->create(['nombre_cliente' => 'MEDARDO', 'deuda_pago_cliente' => -500]);
    $proveedor = Proveedor::factory()->create(['nombre_proveedor' => 'MEDARDO', 'saldo_proveedor' => -500]);

    $movimiento = MovimientoFinanciero::factory()->ingreso()->create([
        'cuenta_destino_id' => null,
        'proveedor_destino_id' => $proveedor->id,
        'saldo_anterior_destino' => -500,
        'saldo_posterior_destino' => -440,
    ]);
    $remesaEntrada = remesaDeProveedorDePrueba(['entrada_tipo' => 'proveedor', 'entrada_proveedor_id' => $proveedor->id]);
    $remesaSalida = remesaDeProveedorDePrueba(['salida_tipo' => 'proveedor', 'salida_proveedor_id' => $proveedor->id]);

    ejecutarMigracionHistorialProveedoresAClientes();

    expect($movimiento->fresh())
        ->cliente_destino_id->toBe($cliente->id)
        ->proveedor_destino_id->toBeNull()
        ->and((float) $movimiento->fresh()->saldo_anterior_destino)->toBe(-500.0)
        ->and((float) $movimiento->fresh()->saldo_posterior_destino)->toBe(-440.0)
        ->and($remesaEntrada->fresh())
        ->entrada_tipo->toBe('cliente')
        ->entrada_cliente_id->toBe($cliente->id)
        ->entrada_proveedor_id->toBeNull()
        ->and($remesaSalida->fresh())
        ->salida_tipo->toBe('cliente')
        ->salida_cliente_id->toBe($cliente->id)
        ->salida_proveedor_id->toBeNull()
        ->and((float) $cliente->fresh()->deuda_pago_cliente)->toBe(-500.0)
        ->and((float) DB::table('proveedors')->where('id', $proveedor->id)->value('saldo_proveedor'))->toBe(-500.0);
});

test('el sufijo PROVEEDOR no impide encontrar al cliente del mismo nombre', function () {
    crearTiposMovimientoFinanciero();

    $cliente = Cliente::factory()->create(['nombre_cliente' => 'ALBERTO']);
    $proveedor = Proveedor::factory()->create(['nombre_proveedor' => 'ALBERTO PROVEEDOR']);
    $movimiento = MovimientoFinanciero::factory()->ingreso()->create(['cuenta_destino_id' => null, 'proveedor_destino_id' => $proveedor->id]);

    ejecutarMigracionHistorialProveedoresAClientes();

    expect($movimiento->fresh()->cliente_destino_id)->toBe($cliente->id);
});

test('un proveedor sin cliente equivalente conserva su historial y no se crea ningún cliente', function () {
    crearTiposMovimientoFinanciero();

    $proveedor = Proveedor::factory()->create(['nombre_proveedor' => 'SIN CLIENTE']);
    $movimiento = MovimientoFinanciero::factory()->ingreso()->create(['cuenta_destino_id' => null, 'proveedor_destino_id' => $proveedor->id]);
    $clientesAntes = Cliente::count();

    ejecutarMigracionHistorialProveedoresAClientes();

    expect($movimiento->fresh())
        ->proveedor_destino_id->toBe($proveedor->id)
        ->cliente_destino_id->toBeNull()
        ->and(Cliente::count())->toBe($clientesAntes);
});
