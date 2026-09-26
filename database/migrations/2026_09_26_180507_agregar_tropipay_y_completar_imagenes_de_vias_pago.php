<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Imágenes que ya existen en `public/projects/metodos_pago/`.
     *
     * @var array<int, string>
     */
    private array $conImagen = ['paypal', 'stripe', 'qvapay'];

    /**
     * Run the migrations.
     *
     * - PayPal, Stripe y QvaPay estaban en el catálogo sin imagen: ahora la tienen.
     * - TropiPay entra con su imagen y se habilita en las monedas que no son CUP (USD y EUR).
     * - Western Union, MoneyGram y Google Pay entran al catálogo SIN imagen y sin asignar a ninguna moneda:
     *   se activan por moneda desde su pantalla de edición. Mientras no tengan imagen el CRUD muestra un ícono;
     *   en cuanto se guarde `public/projects/metodos_pago/{slug}.webp` aparece solo (ver ViaPago::imagenUrl()).
     */
    public function up(): void
    {
        $ahora = now();

        foreach ($this->conImagen as $slug) {
            DB::table('vias_pago')->where('slug', $slug)->update(['imagen' => $slug, 'updated_at' => $ahora]);
        }

        $orden = (int) DB::table('vias_pago')->max('orden');

        DB::table('vias_pago')->insert([
            ['slug' => 'tropipay', 'nombre' => 'TropiPay', 'imagen' => 'tropipay', 'ambito' => 'internacional', 'orden' => ++$orden, 'activo' => true, 'created_at' => $ahora, 'updated_at' => $ahora],
            ['slug' => 'westernunion', 'nombre' => 'Western Union', 'imagen' => null, 'ambito' => 'internacional', 'orden' => ++$orden, 'activo' => true, 'created_at' => $ahora, 'updated_at' => $ahora],
            ['slug' => 'moneygram', 'nombre' => 'MoneyGram', 'imagen' => null, 'ambito' => 'internacional', 'orden' => ++$orden, 'activo' => true, 'created_at' => $ahora, 'updated_at' => $ahora],
            ['slug' => 'googlepay', 'nombre' => 'Google Pay', 'imagen' => null, 'ambito' => 'internacional', 'orden' => ++$orden, 'activo' => true, 'created_at' => $ahora, 'updated_at' => $ahora],
        ]);

        $tropipayId = DB::table('vias_pago')->where('slug', 'tropipay')->value('id');

        foreach (DB::table('monedas')->where('codigo_moneda', '!=', 'CUP')->pluck('id') as $monedaId) {
            DB::table('moneda_via_pago')->insert(['moneda_id' => $monedaId, 'via_pago_id' => $tropipayId]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('vias_pago')->whereIn('slug', ['tropipay', 'westernunion', 'moneygram', 'googlepay'])->delete();
        DB::table('vias_pago')->whereIn('slug', $this->conImagen)->update(['imagen' => null, 'updated_at' => now()]);
    }
};
