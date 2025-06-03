### **Diagnóstico del Problema de Doble Clic en Movimientos**
El problema de "doble clic" probablemente se debe a que el **frontend envía IDs de almacenes como strings** en lugar de integers, lo que provoca un fallo en la validación del backend en el primer intento. Aquí está la solución paso a paso:

---

### **1. Corregir el Enviar de IDs como Números (No Strings)**
El frontend actual usa `useState<string | null>()` para `almacenEmisorId` y `almacenReceptorId`, lo que hace que los valores se envíen como strings (ej: `"1"`) en lugar de integers (`1`). El backend espera integers según la validación:

```php
'almacen_origen_id' => ['required', 'exists:almacens,id'],
```

#### **Solución: Convierte los IDs a números antes de enviar**
Actualiza el `handleSubmit` para asegurar que los IDs sean números:

```tsx
const handleSubmit = () => {
    if (!almacenEmisorId || !almacenReceptorId) {
        alert('Debes seleccionar un almacén emisor y un almacén receptor.');
        return;
    }

    const almacenOrigenIdNum = parseInt(almacenEmisorId);
    const almacenReceptorIdNum = parseInt(almacenReceptorId);

    const productosTrasladados = productosEmisor
        .map((producto) => {
            const cantidadInput = document.getElementById(`cantidad-${producto.producto_id}`) as HTMLInputElement;
            const cantidad = parseInt(cantidadInput?.value || '0');
            return cantidad > 0 ? { producto_id: producto.producto_id, cantidad } : null;
        })
        .filter((item) => item !== null);

    if (productosTrasladados.length === 0) {
        alert('Debes especificar al menos una cantidad a trasladar.');
        return;
    }

    fetch('/movimientos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
        },
        body: JSON.stringify({
            almacen_origen_id: almacenOrigenIdNum,
            almacen_destino_id: almacenReceptorIdNum,
            productos: productosTrasladados,
        }),
    })
        .then((res) => res.json())
        .then((data) => {
            alert(data.message || 'Movimiento registrado exitosamente.');
            setProductosEmisor([]); // Limpiar la tabla
        })
        .catch((err) => {
            console.error('Error al registrar el movimiento:', err);
            alert('Error al registrar el movimiento.');
        });
};
```

---

### **2. Actualizar el Manejo de Selección de Almacenes**
Asegúrate de que los IDs de almacenes se almacenen como números desde el principio:

```tsx
const [almacenEmisorId, setAlmacenEmisorId] = useState<number | null>(null);
const [almacenReceptorId, setAlmacenReceptorId] = useState<number | null>(null);
```

Y en los handlers de selección:

```tsx
const handleAlmacenEmisorChange = (value: string) => {
    const id = parseInt(value);
    setAlmacenEmisorId(id);
    fetch(`/movimientos/almacenes/${id}/productos`)
        .then((res) => res.json())
        .then((data) => setProductosEmisor(data))
        .catch((err) => console.error(err));
};

// Y para el receptor:
<Select onValueChange={(value) => setAlmacenReceptorId(parseInt(value))}>
```

---

### **3. Validación de Stock en el Frontend (Opcional)**
Para evitar errores en el backend, puedes validar que las cantidades no excedan el stock disponible antes de enviar:

```tsx
const handleSubmit = () => {
    if (!almacenEmisorId || !almacenReceptorId) {
        alert('Debes seleccionar un almacén emisor y un almacén receptor.');
        return;
    }

    const productosTrasladados = productosEmisor
        .map((producto) => {
            const cantidadInput = document.getElementById(`cantidad-${producto.producto_id}`) as HTMLInputElement;
            const cantidad = parseInt(cantidadInput?.value || '0');
            if (cantidad > producto.cantidad_total) {
                alert(`Cantidad excede el stock disponible para ${producto.nombre_producto}`);
                return null;
            }
            return cantidad > 0 ? { producto_id: producto.producto_id, cantidad } : null;
        })
        .filter((item) => item !== null);

    if (productosTrasladados.length === 0) {
        alert('Debes especificar al menos una cantidad a trasladar.');
        return;
    }

    // Proceder con el fetch...
};
```

---

### **4. Manejo de Errores en el Backend (Mejora Adicional)**
En el controlador, agrega una validación explícita para asegurar que los IDs sean enteros:

```php
$request->validate([
    'almacen_origen_id' => ['required', 'integer', 'exists:almacens,id'],
    'almacen_destino_id' => ['required', 'integer', 'exists:almacens,id', 'different:almacen_origen_id'],
    'productos' => ['required', 'array', 'min:1'],
    'productos.*.producto_id' => ['required', 'integer', 'exists:productos,id'],
    'productos.*.cantidad' => ['required', 'integer', 'min:1'],
]);
```

---

### **Resultado Esperado**
Con estos cambios:
- El primer clic enviará los datos correctamente con IDs numéricos.
- Se evitarán errores de validación en el backend.
- El movimiento se registrará en un solo intento.

¿Necesitas ayuda adicional con el frontend o el backend? 😊
