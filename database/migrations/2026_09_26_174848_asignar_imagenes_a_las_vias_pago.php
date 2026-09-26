<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Vías internacionales que ya tienen imagen en el catálogo de tarjetas (`public/projects/card_interacionales/`):
     * se reutilizan en vez de copiarlas. Una `imagen` con carpeta apunta a `public/projects/{imagen}.webp`.
     * Stripe, PayPal y QvaPay no tienen imagen todavía y se muestran solo con su nombre.
     *
     * @var array<string, string>
     */
    private array $imagenes = [
        'zelle' => 'card_interacionales/Zelle',
        'cashapp' => 'card_interacionales/CashApp',
        'square' => 'card_interacionales/Square',
        'visa' => 'card_interacionales/Visa',
        'mastercard' => 'card_interacionales/Mastercard',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        foreach ($this->imagenes as $slug => $imagen) {
            DB::table('vias_pago')->where('slug', $slug)->update(['imagen' => $imagen, 'updated_at' => now()]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('vias_pago')->whereIn('slug', array_keys($this->imagenes))->update(['imagen' => null, 'updated_at' => now()]);
    }
};
