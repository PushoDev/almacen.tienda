# Tarea Pendiente: Sistema de Precios por Almacén

## 📋 Resumen de la Tarea

Implementar un sistema de precios de venta donde el **administrador** pueda establecer precios base para todos los productos por almacén, y los **vendedores** puedan modificar sus precios individuales, manteniendo el precio del administrador como predeterminado si el vendedor no especifica uno.

## 🎯 Objetivo

Crear una jerarquía de precios:

1. **Precio Admin**: Precio base establecido por administrador
2. **Precio Vendedor**: Precio personalizado (opcional) por vendedor
3. **Prioridad**: Si el vendedor tiene precio → usarlo, si no → usar precio admin

## 📁 Archivos Analizados

### Modelo `ProductoVendedor.php`

- ✅ Modelo pivot configurado con clave compuesta: `['producto_id', 'user_id', 'almacen_id']`
- ✅ Campos: `precio_venta`, `venta_ganancia`
- ✅ Relaciones con Producto, User y Almacen

### Controller `ProductoVendedorController.php`

- ✅ Métodos existentes: `index()`, `update()`, `preciosPorVendedor()`
- ✅ Control de acceso por rol y almacén
- ✅ Registro en historial de precios

## 🔧 Tareas a Realizar Mañana

### 1. Modificar Modelo `ProductoVendedor`

- [ ] Añadir campo `precio_admin` (opcional: DECIMAL 8,2)
- [ ] Añadir campo `ganancia_admin` (opcional: DECIMAL 8,2)
- [ ] Actualizar `$fillable` para incluir nuevos campos
- [ ] Actualizar `$casts` para nuevos campos

### 2. Crear Nuevo Controller/Métodos

- [ ] Método para que **admin** establezca precios base por producto/almacén
- [ ] Modificar lógica de `index()` para mostrar precio admin si vendedor no tiene precio
- [ ] Modificar `update()` para diferenciar entre precio admin y vendedor

### 3. Modificar Lógica de Consulta en Controller

- [ ] En `index()`:
    ```php
    // Lógica actual vs nueva
    $precioFinal = $producto->precio_venta ?? $producto->precio_admin ?? 0;
    $gananciaFinal = $producto->venta_ganancia ?? $producto->ganancia_admin ?? 0;
    ```

### 4. Actualizar Base de Datos

- [ ] Crear migración para añadir campos a tabla `producto_vendedors`
- [ ] Script de migración para datos existentes (opcional)

### 5. Interfaz de Usuario (Frontend)

- [ ] Vista para administrador: "Asignar Precios Base"
- [ ] En vista actual de vendedor: mostrar "(Precio Admin)" cuando no tiene precio propio
- [ ] Indicadores visuales para diferenciar precios admin vs vendedor

### 6. Lógica de Prioridad

```php
// Ejemplo de lógica a implementar
public function obtenerPrecioFinal($producto, $userId, $almacenId) {
    $precioVendedor = $producto->vendedores()
        ->where('user_id', $userId)
        ->where('almacen_id', $almacenId)
        ->whereNotNull('precio_venta')
        ->first();

    if ($precioVendedor) {
        return [
            'precio' => $precioVendedor->precio_venta,
            'ganancia' => $precioVendedor->venta_ganancia,
            'tipo' => 'vendedor'
        ];
    }

    $precioAdmin = $producto->vendedores()
        ->where('user_id', null) // O un ID especial para admin
        ->where('almacen_id', $almacenId)
        ->whereNotNull('precio_admin')
        ->first();

    return $precioAdmin ? [
        'precio' => $precioAdmin->precio_admin,
        'ganancia' => $precioAdmin->ganancia_admin,
        'tipo' => 'admin'
    ] : ['precio' => 0, 'ganancia' => 0, 'tipo' => 'ninguno'];
}
```

## 💡 Consideraciones

### 🔄 Flujo de Trabajo

1. **Admin** establece precios base para todos los productos por almacén
2. **Vendedor** ve precios base como referencia
3. **Vendedor** puede modificar su precio personal (si se permite)
4. **Sistema** muestra precio personal si existe, sino muestra precio admin

### 🎨 Indicadores Visuales Sugeridos

- 🏷️ Etiqueta "(Admin)" para precios de administrador
- 🎨 Color diferente para precios propios vs precios admin
- ✅ Check cuando vendedor tiene precio personal
- ⚠️ Alerta cuando vendedor no tiene precio personal

### 🔐 Seguridad

- [ ] Validar que solo admin pueda modificar precios base
- [ ] Mantener control de acceso actual para vendedores
- [ ] Registrar cambios de precios base en historial

---

**Status**: 📝 Pendiente para mañana
**Prioridad**: 🔴 Alta
**Tiempo estimado**: 2-3 horas
