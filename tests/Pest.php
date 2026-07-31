<?php

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind a different classes or traits.
|
*/

pest()->extend(Tests\TestCase::class)
    ->use(Illuminate\Foundation\Testing\RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

use App\Models\Cuenta;
use App\Models\Moneda;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Crea (o reutiliza) una Moneda activa con el código y tasa dados.
 * `tasa` se interpreta como "X unidades de esta moneda = 1 USD".
 */
function crearMoneda(string $codigo, float $tasa = 1, bool $principal = false): Moneda
{
    return Moneda::firstOrCreate(
        ['codigo_moneda' => $codigo],
        ['nombre_moneda' => $codigo, 'simbolo_moneda' => $codigo, 'tasa_cambio' => $tasa, 'estado' => true, 'principal' => $principal]
    );
}

function crearMonedaUsd(): Moneda
{
    return crearMoneda('USD', 1, true);
}

/**
 * Crea una Cuenta en la moneda dada. Si se pasa $propietario, la asigna
 * vía el pivot user_cuentas (requerido para los checks de permiso de vendedor).
 */
function crearCuentaEnMoneda(Moneda $moneda, float $saldo = 1000, ?User $propietario = null): Cuenta
{
    $cuenta = Cuenta::create([
        'nombre_cuenta' => 'Cuenta ' . uniqid(),
        'saldo_cuenta' => $saldo,
        'tipo_cuenta' => 'permanentes',
        'tipo' => 'banco',
        'moneda_id' => $moneda->id,
        'estado' => 'activa',
    ]);

    if ($propietario) {
        $propietario->cuentas()->attach($cuenta->id);
    }

    return $cuenta;
}

/**
 * `tipo_movimiento_id` en `movimientos_financieros` es FK contra
 * `tipos_movimiento_financiero`. No hay seeder en el proyecto para ese
 * catálogo (convención de la app: 1=Gasto, 2=Ingreso, 3=Transferencia),
 * así que los tests que dependen de movimientos financieros lo insertan
 * manualmente con este helper.
 */
function crearTiposMovimientoFinanciero(): void
{
    if (DB::table('tipos_movimiento_financiero')->count() > 0) {
        return;
    }

    DB::table('tipos_movimiento_financiero')->insert([
        ['id' => 1, 'nombre' => 'Gasto', 'efecto' => 'egreso', 'created_at' => now(), 'updated_at' => now()],
        ['id' => 2, 'nombre' => 'Ingreso', 'efecto' => 'ingreso', 'created_at' => now(), 'updated_at' => now()],
        ['id' => 3, 'nombre' => 'Transferencia', 'efecto' => 'egreso', 'created_at' => now(), 'updated_at' => now()],
    ]);
}
