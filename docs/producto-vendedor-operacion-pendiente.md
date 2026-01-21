# 📝 OPERACIÓN PENDIENTE - PRODUCTO VENDEDOR

## **CONTEXTO ACTUAL:**

He analizado el controlador `ProductoVendedorController.php` y el modelo `ProductoVendedor.php` del sistema de inventario.

## **SISTEMA IDENTIFICADO:**

- **Controlador**: Gestiona precios de venta personalizados por vendedor y almacén
- **Modelo**: Pivot con clave compuesta (producto_id + user_id + almacen_id)
- **Funcionalidad**: Cada vendedor puede tener precios diferentes para el mismo producto según el almacén

## **CARACTERÍSTICAS CLAVE:**

### 1. **Precios Personalizados**

- Cada vendedor puede establecer precios diferentes para el mismo producto
- Los precios varían según el almacén donde se encuentra el producto
- Control individual de ganancias por vendedor/almacén

### 2. **Estructura de Datos**

- **Modelo**: `ProductoVendedor` extends `Pivot`
- **Clave primaria compuesta**: `producto_id` + `user_id` + `almacen_id`
- **Campos**: `precio_venta`, `venta_ganancia`
- **Relaciones**: Producto, User (vendedor), Almacen

### 3. **Funcionalidades del Controlador**

#### `index()`

- Muestra productos con precios de vendedor, agrupados por almacén
- Filtra por rol (admin/moderador ven todo, vendedor solo sus almacenes)
- Calcula si tiene precio establecido y muestra stock disponible

#### `update()`

- Actualiza precio y ganancia por producto/almacén
- Validación de permisos por usuario y almacén
- Registro automático en `PrecioHistorial` si el precio cambia
- Cálculo automático de ganancia: `precio_venta - precio_compra_producto`

#### `actualizarGananciaPorCambioCosto($productoId)`

- Recalcula todas las ganancias cuando cambia el costo base de un producto
- Afecta a todos los vendedores que tienen ese producto configurado
- Operación transaccional con rollback en caso de error

#### `historial($productoId)`

- Muestra historial completo de cambios de precios
- Incluye usuario, almacén, precios anterior/nuevo, acción, fecha
- Renderiza vista `Reportes/Report/HistorialPrecios`

### 4. **Seguridad y Control**

- Validación de roles (admin, moderador, vendedor)
- Restricción por almacenes asignados a vendedores
- Métodos `create()`, `store()`, `show()`, `edit()`, `destroy()` deshabilitados

### 5. **Integraciones**

- Usa `PrecioHistorial` para auditoría de cambios
- Conexión con modelos `Producto`, `Almacen`, `User`
- Respuestas JSON para actualizaciones vía AJAX

## **ESTADO ACTUAL:**

- ✅ Análisis completado
- ⏳ Próximo paso pendiente por definir

## **ARCHIVOS CLAVE:**

```
app/Http/Controllers/ProductoVendedorController.php
app/Models/ProductoVendedor.php
app/Models/PrecioHistorial.php
```

## **TABLA PRINCIPAL:**

```sql
producto_vendedors
- producto_id (PK)
- user_id (PK)
- almacen_id (PK)
- precio_venta (decimal, 2)
- venta_ganancia (decimal, 2)
- created_at
- updated_at
```

## **PRÓXIMA ACCIÓN REQUERIDA:**

[El usuario indicará qué quiere hacer con este sistema]

## **NOTAS ADICIONALES:**

- Sistema usa Laravel 12 con Inertia.js y React 19
- Base de datos con relaciones many-to-many-through
- Estructura tipo E-commerce con múltiples almacenes
- Control granular de precios por vendedor/ubicación

---

**Fecha: 2026-01-20 21:24**
**Estado: Pendiente por definir siguiente paso**
