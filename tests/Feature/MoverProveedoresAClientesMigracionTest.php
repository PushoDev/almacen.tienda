<?php

use App\Models\Cliente;
use App\Models\Compra;
use App\Models\Proveedor;
use Illuminate\Support\Facades\DB;

function ejecutarMigracionProveedoresAClientes(): void
{
    $migracion = require base_path('database/migrations/2026_10_14_162650_mover_proveedores_con_uso_a_clientes.php');
    $migracion->up();
}

test('el proveedor con sufijo PROVEEDOR se une al cliente del mismo nombre y no se duplica', function () {
    $cliente = Cliente::factory()->create(['nombre_cliente' => 'ALBERTO', 'deuda_pago_cliente' => -100]);
    $proveedor = Proveedor::factory()->create(['nombre_proveedor' => 'ALBERTO PROVEEDOR', 'saldo_proveedor' => 0]);
    $compra = Compra::factory()->create(['proveedor_id' => $proveedor->id, 'cliente_id' => null]);
    $clientesAntes = Cliente::count();

    ejecutarMigracionProveedoresAClientes();

    expect($compra->fresh()->cliente_id)->toBe($cliente->id)
        ->and($compra->fresh()->proveedor_id)->toBeNull()
        ->and(Cliente::count())->toBe($clientesAntes)
        ->and((float) $cliente->fresh()->deuda_pago_cliente)->toBe(-100.0);
});

test('un proveedor con compras y saldo crea su cliente y le pasa el saldo con el mismo signo', function () {
    $proveedor = Proveedor::factory()->create(['nombre_proveedor' => 'MEDARDO', 'saldo_proveedor' => -23909.70]);
    $compra = Compra::factory()->create(['proveedor_id' => $proveedor->id, 'cliente_id' => null]);

    ejecutarMigracionProveedoresAClientes();

    $cliente = Cliente::where('nombre_cliente', 'MEDARDO')->first();

    expect($cliente)->not->toBeNull()
        ->and((float) $cliente->deuda_pago_cliente)->toBe(-23909.70)
        ->and($compra->fresh()->cliente_id)->toBe($cliente->id)
        ->and((float) DB::table('proveedors')->where('id', $proveedor->id)->value('saldo_proveedor'))->toBe(-23909.70);
});

test('un proveedor sin compras ni saldo no se convierte en cliente', function () {
    Proveedor::factory()->create(['nombre_proveedor' => 'LINYI', 'saldo_proveedor' => 0]);

    ejecutarMigracionProveedoresAClientes();

    expect(Cliente::where('nombre_cliente', 'LINYI')->exists())->toBeFalse();
});
