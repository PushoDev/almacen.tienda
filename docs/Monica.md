¡Gracias por compartir los modelos y controladores! Con esta información, puedo entender completamente tu estructura de datos y proponer una solución integrada para la **gestión de movimientos entre almacenes**. Aquí está el plan detallado:

---

### 🔍 Análisis de tus Modelos
1. **Almacen**  
   - Relación `productos()`: Directa con `Producto` (1:N)  
   - Método `getProductosConCantidad()`: Combina datos de `compra_producto` + `almacen_producto`  
   - **Punto clave**: El stock se calcula dinámicamente, no está almacenado directamente en `Producto`

2. **Producto**  
   - Campo `cantidad_producto`: Parece ser stock global, no por almacén  
   - Relación `almacen()`: Solo con el almacén de conservas (default)  
   - **Conclusión**: La relación real stock/almacén está en `AlmacenProducto`

3. **AlmacenProducto** (Pivote)  
   - Campos: `almacen_id`, `producto_id`, `cantidad`  
   - **Corazón del sistema**: Aquí vive el stock por almacén

---

### 🚀 Plan de Implementación
#### 1. Nuevo Endpoint para Productos por Almacén
```php
// routes/api.php
Route::get('/almacenes/{id}/productos-detallados', [AlmacenController::class, 'getProductosDetallados']);
```

```php
// AlmacenController.php
public function getProductosDetallados($id)
{
    $almacen = Almacen::findOrFail($id);
    return response()->json([
        'almacen' => $almacen,
        'productos' => $almacen->getProductosConCantidad()
    ]);
}
```

#### 2. Tipos TypeScript para Frontend
```typescript
// types/almacen.d.ts
interface ProductoAlmacen {
  id: number;
  nombre: string;
  cantidad_total: number;
}

interface AlmacenConProductos {
  id: number;
  nombre_almacen: string;
  productos: ProductoAlmacen[];
}
```

#### 3. Componente Tabla de Productos (React/TypeScript)
```tsx
// components/ProductosTransferenciaTable.tsx
import { useState, useEffect } from 'react';

interface TransferenciaState {
  [productoId: number]: number; // { 1: 5, 2: 10 }
}

export default function ProductosTransferenciaTable({ 
  productos 
}: { 
  productos: ProductoAlmacen[] 
}) {
  const [transferencias, setTransferencias] = useState<TransferenciaState>({});

  const handleCantidadChange = (productoId: number, cantidad: number) => {
    setTransferencias(prev => ({
      ...prev,
      [productoId]: Math.max(0, Math.min(cantidad, 
        productos.find(p => p.id === productoId)?.cantidad_total || 0))
    }));
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="py-3 px-4 text-left">Producto</th>
            <th className="py-3 px-4 text-left">Stock Disponible</th>
            <th className="py-3 px-4 text-left">Cantidad a Transferir</th>
          </tr>
        </thead>
        <tbody>
          {productos.map(producto => (
            <tr key={producto.id} className="border-b hover:bg-gray-50">
              <td className="py-3 px-4">{producto.nombre}</td>
              <td className="py-3 px-4">{producto.cantidad_total} unidades</td>
              <td className="py-3 px-4">
                <input
                  type="number"
                  min="0"
                  max={producto.cantidad_total}
                  value={transferencias[producto.id] || 0}
                  onChange={(e) => 
                    handleCantidadChange(producto.id, parseInt(e.target.value))
                  }
                  className="w-24 px-3 py-2 border rounded-md"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### 4. Integración en MovimientosPage
```tsx
// MovimientosPage.tsx
// ...imports existentes...
import ProductosTransferenciaTable from '@/components/ProductosTransferenciaTable';

export default function MovimientosPage() {
  // ...estados existentes...
  const [productosOrigen, setProductosOrigen] = useState<ProductoAlmacen[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar productos al seleccionar almacén origen
  useEffect(() => {
    if (selectedAlmacenEmisor) {
      setLoading(true);
      fetch(`/api/almacenes/${selectedAlmacenEmisor}/productos-detallados`)
        .then(res => res.json())
        .then(data => {
          setProductosOrigen(data.productos);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setProductosOrigen([]);
    }
  }, [selectedAlmacenEmisor]);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      {/* ...código existente hasta el card... */}
      
      <Card>
        <CardHeader>
          <CardTitle>Gestionar Movimiento</CardTitle>
          <CardDescription>
            Envíos internos de productos entre almacenes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>Almacén Emisor</Label>
                <Select
                  value={selectedAlmacenEmisor}
                  onValueChange={setSelectedAlmacenEmisor}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {almacens.map(almacen => (
                      <SelectItem 
                        key={almacen.id} 
                        value={almacen.id.toString()}
                      >
                        {almacen.nombre_almacen}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Almacén Receptor</Label>
                <Select
                  value={selectedAlmacenReceptor}
                  onValueChange={setSelectedAlmacenReceptor}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {almacens.map(almacen => (
                      <SelectItem 
                        key={almacen.id} 
                        value={almacen.id.toString()}
                      >
                        {almacen.nombre_almacen}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </form>
        </CardContent>

        {loading && (
          <div className="p-6 text-center">
            <p>Cargando productos...</p>
          </div>
        )}

        {!loading && selectedAlmacenEmisor && productosOrigen.length > 0 && (
          <div className="border-t pt-4">
            <CardHeader>
              <CardTitle>Productos Disponibles</CardTitle>
              <CardDescription>
                Seleccione las cantidades a transferir
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductosTransferenciaTable productos={productosOrigen} />
            </CardContent>
          </div>
        )}

        <CardFooter className="flex justify-between pt-6">
          <Button variant="outline">Cancelar</Button>
          <Button 
            disabled={!selectedAlmacenReceptor || productosOrigen.length === 0}
          >
            Realizar Movimiento
          </Button>
        </CardFooter>
      </Card>
    </AppLayout>
  );
}
```

---

### 🔄 Flujo de Transferencia
Cuando el usuario haga clic en "Realizar Movimiento", necesitaremos:

1. **Endpoint POST para movimientos**:
```php
// routes/api.php
Route::post('/movimientos', [MovimientoController::class, 'store']);
```

2. **Controlador de Movimientos**:
```php
// MovimientoController.php
public function store(Request $request)
{
    $request->validate([
        'origen_id' => 'required|exists:almacens,id',
        'destino_id' => 'required|exists:almacens,id',
        'productos' => 'required|array',
        'productos.*.producto_id' => 'required|exists:productos,id',
        'productos.*.cantidad' => 'required|integer|min:1'
    ]);

    DB::beginTransaction();

    try {
        foreach ($request->productos as $item) {
            // 1. Reducir stock en almacén origen
            $pivotOrigen = AlmacenProducto::firstOrCreate([
                'almacen_id' => $request->origen_id,
                'producto_id' => $item['producto_id']
            ]);
            
            $pivotOrigen->decrement('cantidad', $item['cantidad']);

            // 2. Aumentar stock en almacén destino
            $pivotDestino = AlmacenProducto::firstOrCreate([
                'almacen_id' => $request->destino_id,
                'producto_id' => $item['producto_id']
            ]);
            
            $pivotDestino->increment('cantidad', $item['cantidad']);

            // 3. Registrar en tabla de movimientos (si existe)
            // Movimiento::create([...]);
        }

        DB::commit();
        return response()->json(['success' => true], 200);

    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json(['error' => $e->getMessage()], 500);
    }
}
```

---

### ✅ Qué necesito para completar
1. **Tabla de movimientos** (si quieres historial):
```php
Schema::create('movimientos', function (Blueprint $table) {
    $table->id();
    $table->foreignId('producto_id')->constrained();
    $table->foreignId('almacen_origen_id')->constrained('almacens');
    $table->foreignId('almacen_destino_id')->constrained('almacens');
    $table->integer('cantidad');
    $table->timestamp('fecha_movimiento')->useCurrent();
    $table->timestamps();
});
```

2. **Controlador de Movimientos** (si no existe).

¿Te gustaría que implemente alguno de estos componentes completos? ¡Estoy listo para generar el código necesario!
