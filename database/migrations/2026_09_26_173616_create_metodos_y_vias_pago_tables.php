<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Catálogo de métodos de pago (efectivo / transferencia) y de vías de pago (los canales que se
     * usan dentro de una transferencia: Zelle, EnZona, Transfermóvil…). Cada moneda elige cuáles admite
     * en su CRUD (ver `moneda_metodo_pago` y `moneda_via_pago`). `imagen` es el slug del archivo en
     * `public/projects/metodos_pago/{imagen}.webp`; una vía sin imagen se muestra solo con texto.
     */
    public function up(): void
    {
        Schema::create('metodos_pago', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 30)->unique();
            $table->string('nombre', 60);
            $table->string('imagen', 60)->nullable();
            $table->unsignedSmallInteger('orden')->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        Schema::create('vias_pago', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 30)->unique();
            $table->string('nombre', 60);
            $table->string('imagen', 60)->nullable();
            // 'cuba' (EnZona, Transfermóvil) o 'internacional': define las vías que se sugieren por defecto
            // al crear una moneda (CUP → cuba; las demás → internacional).
            $table->string('ambito', 20)->default('internacional');
            $table->unsignedSmallInteger('orden')->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });

        $ahora = now();

        DB::table('metodos_pago')->insert([
            ['slug' => 'transferencia', 'nombre' => 'Transferencia', 'imagen' => 'transferencia', 'orden' => 1, 'activo' => true, 'created_at' => $ahora, 'updated_at' => $ahora],
            ['slug' => 'efectivo', 'nombre' => 'Efectivo', 'imagen' => 'efectivo', 'orden' => 2, 'activo' => true, 'created_at' => $ahora, 'updated_at' => $ahora],
        ]);

        // Las mismas 10 vías que tenía la lista fija de PaymentForm.tsx (PAYMENT_VIAS).
        $vias = [
            ['zelle', 'Zelle', null, 'internacional'],
            ['cashapp', 'CashApp', null, 'internacional'],
            ['square', 'Square', null, 'internacional'],
            ['visa', 'Visa', null, 'internacional'],
            ['mastercard', 'MasterCard', null, 'internacional'],
            ['stripe', 'Stripe', null, 'internacional'],
            ['paypal', 'Paypal', null, 'internacional'],
            ['qvapay', 'QvaPay', null, 'internacional'],
            ['enzona', 'EnZona', 'enzona', 'cuba'],
            ['transfermovil', 'Transfermóvil', 'transfermovil', 'cuba'],
        ];

        DB::table('vias_pago')->insert(array_map(
            fn (array $via, int $i) => [
                'slug' => $via[0], 'nombre' => $via[1], 'imagen' => $via[2], 'ambito' => $via[3],
                'orden' => $i + 1, 'activo' => true, 'created_at' => $ahora, 'updated_at' => $ahora,
            ],
            $vias,
            array_keys($vias),
        ));
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vias_pago');
        Schema::dropIfExists('metodos_pago');
    }
};
