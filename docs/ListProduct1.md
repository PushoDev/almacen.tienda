Perfecto, tranquilo 😄. Entiendo lo que necesitas:

> **Quieres ver los productos que están en un almacén específico (el que seleccionas), junto con la cantidad total de cada producto que ha entrado por compras, y mostrarlos en tu frontend en React + TypeScript.**

Vamos a hacerlo simple, directo y sin vueltas.

---

## ✅ Lo que tienes:

- Un modelo `Almacen`.
- Un modelo `Compra`.
- Un modelo `Producto`.
- Una tabla pivote `compra_producto` que tiene:
  - `compra_id`
  - `producto_id`
  - `cantidad`

---

## 🧠 Lo que necesitas:

Cuando el usuario entra a `/almacenes/123`, quieres mostrar una lista de todos los **productos** asociados a ese almacén, basándote en las **compras** realizadas y la **tabla compra_producto**.

---

## 🔧 Paso 1: Agregar método en el modelo `Almacen`

Abre tu modelo: `app/Models/Almacen.php`

Y agrega este método:

```php
use Illuminate\Support\Facades\DB;

public function getProductosConCantidad()
{
    return DB::table('compra_producto')
        ->join('compras', 'compra_producto.compra_id', '=', 'compras.id')
        ->join('productos', 'compra_producto.producto_id', '=', 'productos.id')
        ->where('compras.almacen_id', $this->id)
        ->select(
            'productos.id',
            'productos.nombre_producto as nombre',
            DB::raw('SUM(compra_producto.cantidad) as cantidad_total')
        )
        ->groupBy('productos.id', 'productos.nombre_producto')
        ->orderBy('nombre')
        ->get();
}
```

---

## 🔁 Paso 2: Actualiza el controlador `show`

En `AlmacenController.php`:

```php
public function show(Almacen $almacen)
{
    $productos = $almacen->getProductosConCantidad();

    return Inertia::render('Almacenes/Show', [
        'almacen' => $almacen,
        'productos' => $productos,
    ]);
}
```

---

## 📦 Respuesta JSON que obtienes

Esto te devuelve un array como este:

```json
[
  {
    "id": 1,
    "nombre": "Leche",
    "cantidad_total": 50
  },
  {
    "id": 2,
    "nombre": "Pan",
    "cantidad_total": 100
  }
]
```

---

## 🎯 Paso 3: En tu frontend (React + TypeScript)

Suponiendo que estás en `resources/js/Pages/Almacenes/Show.tsx`, haz esto:

```tsx
import { PageProps } from '@/types';
import { Almacen, ProductoConCantidad } from '@/interfaces';

interface Props extends PageProps {
    almacen: Almacen;
    productos: ProductoConCantidad[];
}

const Show: React.FC<Props> = ({ almacen, productos }) => {
    return (
        <div>
            <h1>{almacen.nombre_almacen}</h1>

            <h2>Productos Disponibles</h2>

            <table>
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cantidad Total</th>
                    </tr>
                </thead>
                <tbody>
                    {productos.length > 0 ? (
                        productos.map((p) => (
                            <tr key={p.id}>
                                <td>{p.nombre}</td>
                                <td>{p.cantidad_total}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={2}>No hay productos registrados.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Show;
```

Y define tu interfaz en `resources/js/interfaces.ts`:

```ts
export interface ProductoConCantidad {
    id: number;
    nombre: string;
    cantidad_total: number;
}
```

---

## ✅ Listo.

Ahora sí:

- Vas a `/almacenes/1` y ves los productos del almacén 1.
- Conoces cuántos productos han entrado por compras.
- Y lo muestras en tu frontend en React + TypeScript sin complicaciones.

---

## ¿Qué sigue?

¿Quieres que agreguemos:

- [ ] Paginación para cuando tengas muchos productos?
- [ ] Filtros por nombre de producto?
- [ ] Exportar a Excel?
- [ ] Usar relaciones en lugar de Query Builder?

Dime qué necesitas ahora 👇
