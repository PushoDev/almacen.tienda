¡Claro! Vamos a implementar la funcionalidad de **movimientos entre almacenes** paso a paso. Basándonos en tus migraciones existentes, necesitaremos:

---

### 1. **Nueva Migración para Movimientos**
Crearemos una tabla `movimientos` para registrar cada traslado:

```php
// database/migrations/2025_05_28_XXXXXX_create_movimientos_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateMovimientosTable extends Migration {
    public function up() {
        Schema::create('movimientos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos'); // Relación con productos
            $table->foreignId('almacen_origen_id')->constrained('almacens'); // Almacén de origen
            $table->foreignId('almacen_destino_id')->constrained('almacens'); // Almacén de destino
            $table->integer('cantidad');
            $table->text('notas')->nullable();
            $table->timestamps();
        });
    }
}
```

*Importante:* Actualiza la tabla `almacen_producto` (pivot) para reflejar el stock en tiempo real:
```php
// En tu migración existente 2025_05_27_220636_create_almacen_producto_table.php
Schema::create('almacen_producto', function (Blueprint $table) {
    ...
    $table->integer('stock')->default(0); // Asegúrate que este campo exista
});
```

---

### 2. **Modelos y Relaciones**
**a. Modelo `Movimiento` (app/Models/Movimiento.php):**
```php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Movimiento extends Model {
    protected $fillable = ['producto_id', 'almacen_origen_id', 'almacen_destino_id', 'cantidad', 'notas'];

    public function producto() {
        return $this->belongsTo(Producto::class);
    }

    public function almacenOrigen() {
        return $this->belongsTo(Almacen::class, 'almacen_origen_id');
    }

    public function almacenDestino() {
        return $this->belongsTo(Almacen::class, 'almacen_destino_id');
    }
}
```

**b. Actualiza el Modelo `Almacen`** para incluir la relación con productos:
```php
// app/Models/Almacen.php
public function productos() {
    return $this->belongsToMany(Producto::class)->withPivot('stock');
}
```

---

### 3. **Lógica de Traslado en un Service**
Crea un servicio para manejar la transacción segura (evitar inconsistencias):

```php
// app/Services/MovimientoService.php

namespace App\Services;

use App\Models\Movimiento;
use Illuminate\Support\Facades\DB;

class MovimientoService {
    public function trasladarProducto(array $data) {
        return DB::transaction(function () use ($data) {
            // 1. Crear el movimiento
            $movimiento = Movimiento::create($data);

            // 2. Actualizar stock en almacenes
            // Origen: Restar cantidad
            DB::table('almacen_producto')
                ->where('almacen_id', $data['almacen_origen_id'])
                ->where('producto_id', $data['producto_id'])
                ->decrement('stock', $data['cantidad']);

            // Destino: Sumar cantidad
            DB::table('almacen_producto')
                ->where('almacen_id', $data['almacen_destino_id'])
                ->where('producto_id', $data['producto_id'])
                ->increment('stock', $data['cantidad']);

            return $movimiento;
        });
    }
}
```

---

### 4. **Controlador (MovimientoController)**
```php
// app/Http/Controllers/MovimientoController.php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMovimientoRequest;
use App\Services\MovimientoService;
use Inertia\Inertia;

class MovimientoController extends Controller {
    public function create() {
        return Inertia::render('Movimientos/Create', [
            'almacenes' => \App\Models\Almacen::all(),
            'productos' => \App\Models\Producto::with('almacenes')->get()
        ]);
    }

    public function store(StoreMovimientoRequest $request, MovimientoService $service) {
        $movimiento = $service->trasladarProducto($request->validated());
        return redirect()->route('movimientos.index')->with('success', 'Movimiento registrado!');
    }
}
```

---

### 5. **Formulario React/TypeScript**
```tsx
// resources/js/Pages/Movimientos/Create.tsx

import { useForm } from '@inertiajs/react';
import { Almacen, Producto } from '@/types';

interface Props {
    almacenes: Almacen[];
    productos: Producto[];
}

const CreateMovimiento: React.FC<Props> = ({ almacenes, productos }) => {
    const { data, setData, post, processing, errors } = useForm({
        producto_id: '',
        almacen_origen_id: '',
        almacen_destino_id: '',
        cantidad: 0,
        notas: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/movimientos');
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* Selector de Producto */}
            <select 
                value={data.producto_id} 
                onChange={(e) => setData('producto_id', e.target.value)}
            >
                <option value="">Seleccionar Producto</option>
                {productos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
            </select>

            {/* Almacenes Origen/Destino */}
            <div className="grid grid-cols-2 gap-4">
                <select 
                    value={data.almacen_origen_id}
                    onChange={(e) => setData('almacen_origen_id', e.target.value)}
                >
                    <option value="">Almacén Origen</option>
                    {almacenes.map((a) => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                </select>

                <select 
                    value={data.almacen_destino_id}
                    onChange={(e) => setData('almacen_destino_id', e.target.value)}
                >
                    <option value="">Almacén Destino</option>
                    {almacenes.map((a) => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                </select>
            </div>

            {/* Cantidad y Notas */}
            <input 
                type="number" 
                value={data.cantidad}
                onChange={(e) => setData('cantidad', parseInt(e.target.value))}
                min="1"
            />

            <button type="submit" disabled={processing}>
                {processing ? 'Procesando...' : 'Trasladar'}
            </button>
        </form>
    );
};
```

---

### 6. **Validación en Laravel**
```php
// app/Http/Requests/StoreMovimientoRequest.php

public function rules() {
    return [
        'producto_id' => 'required|exists:productos,id',
        'almacen_origen_id' => 'required|different:almacen_destino_id|exists:almacens,id',
        'almacen_destino_id' => 'required|exists:almacens,id',
        'cantidad' => 'required|integer|min:1',
        'notas' => 'nullable|string'
    ];
}
```

---

### 7. **Rutas (routes/web.php)**
```php
Route::resource('movimientos', MovimientoController::class)
    ->only(['create', 'store']);
```

---

### ✅ **Pruebas Clave**
1. Verifica que el stock en `almacen_producto` se actualice correctamente.
2. Asegúrate de que no se permitan movimientos con almacenes iguales.
3. Valida que la cantidad no supere el stock disponible en el almacén de origen.

¿Necesitas ayuda con algún componente específico o ajustes en la lógica? 😊
