<?php

use App\Models\Producto;
use App\Models\ProductoCodigo;

/**
 * Regresión 2026-09-28: dos fichas del mismo producto (mismo nombre/marca/modelo/capacidad —
 * el caso típico de la duplicación de fichas por precio) con una capacidad de 5+ dígitos
 * generaban el código de barras IDÉNTICO siempre, porque la parte fija ya llegaba a los 14
 * caracteres y no quedaba ningún dígito al azar. Encontrado en 5 productos reales.
 */
function fichaConCapacidadLarga(): Producto
{
    return Producto::factory()->create([
        'nombre_producto' => 'VENTILADOR',
        'marca_producto' => 'F6',
        'modelo_producto' => 'RECARGABLE',
        'capacidad_producto' => '20000 MAH',
    ]);
}

test('generarCodigoBarras siempre deja dígitos al azar, aunque la parte fija por sí sola llegue a 14 caracteres', function () {
    $producto = fichaConCapacidadLarga();

    $codigo = ProductoCodigo::generarCodigoBarras($producto);

    expect(strlen($codigo))->toBe(14);
    // La parte fija (nombre+marca+modelo+capacidad) se recorta a 10 — el resto es al azar.
    // "F6" pierde el dígito (el generador solo toma letras de la marca) y queda "FXX".
    expect(substr($codigo, 0, 10))->toBe('VENFXXREC2');
});

test('dos fichas del mismo producto casi nunca generan el mismo código (la parte al azar cambia)', function () {
    $a = fichaConCapacidadLarga();
    $b = fichaConCapacidadLarga();

    $codigos = collect(range(1, 20))->map(fn () => ProductoCodigo::generarCodigoBarras($a))->unique();

    // No es 100% imposible que rand() repita alguna vez en 20 tiros, pero sí que TODAS sean iguales.
    expect($codigos->count())->toBeGreaterThan(1);
    expect($b->id)->not->toBe($a->id);
});

test('generarYGuardarDefault garantiza unicidad aunque el azar colisione: reintenta hasta encontrar uno libre', function () {
    $a = fichaConCapacidadLarga();
    $b = fichaConCapacidadLarga();

    // Fuerza la colisión: el próximo código que generaría el azar para $b ya existe.
    mt_srand(1234);
    $siguienteCodigo = ProductoCodigo::generarCodigoBarras($b);
    mt_srand(1234);

    ProductoCodigo::create([
        'producto_id' => $a->id,
        'codigo_barras' => $siguienteCodigo,
        'cantidad' => 1,
        'es_default' => true,
    ]);

    $creado = ProductoCodigo::generarYGuardarDefault($b, 5);

    expect($creado->codigo_barras)->not->toBe($siguienteCodigo);
    expect(ProductoCodigo::where('codigo_barras', $creado->codigo_barras)->count())->toBe(1);
});
