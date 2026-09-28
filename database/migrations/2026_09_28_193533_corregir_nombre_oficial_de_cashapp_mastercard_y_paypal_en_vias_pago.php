<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * `vias_pago.nombre` se sembró con una capitalización distinta a la marca oficial en 3 filas
     * (encontrado al conectar este catálogo con `CatalogoTarjetasService`, que ya tenía la marca
     * correcta a mano para las mismas 3 cuentas): "CashApp" → "Cash App", "MasterCard" →
     * "Mastercard" (la marca se renombró así desde 2016), "Paypal" → "PayPal". Las otras 6 vías
     * compartidas (Zelle, Square, Visa, Stripe, QvaPay, TropiPay) ya coincidían.
     *
     * @var array<string, string> slug => nombre anterior => nombre oficial
     */
    private array $nombres = [
        'cashapp' => 'Cash App',
        'mastercard' => 'Mastercard',
        'paypal' => 'PayPal',
    ];

    /**
     * @var array<string, string> slug => nombre anterior (para el rollback)
     */
    private array $nombresAnteriores = [
        'cashapp' => 'CashApp',
        'mastercard' => 'MasterCard',
        'paypal' => 'Paypal',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->nombres as $slug => $nombre) {
            DB::table('vias_pago')->where('slug', $slug)->update(['nombre' => $nombre, 'updated_at' => now()]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach ($this->nombresAnteriores as $slug => $nombre) {
            DB::table('vias_pago')->where('slug', $slug)->update(['nombre' => $nombre, 'updated_at' => now()]);
        }
    }
};
