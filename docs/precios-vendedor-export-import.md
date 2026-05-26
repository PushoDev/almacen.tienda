# Precios por Vendedor — Export/Import Excel + Mejoras UI

**Fecha:** 2026-05-24  
**Rama:** `arreglar-cuentas-proveedor-clientes`

---

## Resumen de lo implementado hoy

### 1. Dashboard — Ocultar tabla para vendedores
- `resources/js/pages/dashboard.tsx`
- La tabla "Comparación Mensual" (Tabla 2) ya **no se muestra para el rol `vendedor`**
- El grid se hace de 1 columna cuando el vendedor está activo, sin espacio en blanco

---

### 2. Columna `comision` en `producto_vendedors`
- Migración: `database/migrations/2026_05_24_000000_add_comision_to_producto_vendedors_table.php`
- Campo: `comision DECIMAL(8,2) DEFAULT 0.00` después de `venta_ganancia`
- **Ya ejecutada** (`php artisan migrate`)

---

### 3. Arquitectura de precios por usuario (cambio importante)

Antes: todos los precios se guardaban en `user_id = 1` (admin).  
Ahora: **cada usuario guarda en su propia fila** (`user_id = user->id`).

**Regla en el controlador:**
```php
$saveUserId = in_array($user->role, ['admin', 'moderador']) ? 1 : $user->id;
```

**En el `index()` se usan dos LEFT JOINs con COALESCE:**
- `pv_admin` → fila del admin (precio de referencia)
- `pv_user`  → fila del usuario logueado (si existe, prevalece)
- Si el vendedor tiene su propio precio → se muestra el suyo
- Si no → se muestra el del admin como fallback

**Comisión:** cada usuario define la suya al asignar precio. No depende del admin.

---

### 4. Modal "Ver precios de vendedores" (solo admin/moderador)

Endpoint: `GET /disponibles/{producto}/precios-vendedores/{almacen}`  
Muestra tabla con todos los usuarios que asignaron precio:

| Columna       | Descripción                                      |
|---------------|--------------------------------------------------|
| Vendedor      | Nombre + avatar con inicial. Admin en rojo       |
| Email         | Email del usuario                                |
| Precio Venta  | El precio que fijó ese usuario                   |
| Ganancia      | precio_venta − precio_compra                     |
| Comisión Real | `comision` que el usuario guardó en su fila      |
| Margen Neto   | ganancia − comision_real                         |
| Última Act.   | Timestamp formateado                             |

Header del modal también muestra: Precio Admin + Comisión Fija del admin.

---

### 5. Mejoras en `Productos/Vendor/Index.tsx`

#### Tabla limpia (sin Marca/Modelo/Capacidad como columnas)
- Esas columnas se **movieron al tooltip** del nombre del producto
- El tooltip también muestra la **imagen del producto** (si existe) en la parte superior
- Precio Compra y Ganancia visibles solo con `canViewSensitiveData` (admin/mod)

#### Paginación con componente oficial
- Reemplazados los botones "Anterior/Siguiente" por el componente `<Pagination>` con elipsis
- Función `getPageNumbers()` maneja la lógica de ellipsis para > 7 páginas

#### `canViewSensitiveData`
- El controlador envía `'canViewSensitiveData' => in_array($user->role, ['admin', 'moderador'])`
- Controla visibilidad de: columna Precio Compra, columna Ganancia, tooltip P. Compra, modal Costo Base

---

### 6. Export/Import Excel de precios

#### Archivos creados
| Archivo | Descripción |
|---------|-------------|
| `app/Exports/PreciosVendedorExport.php` | Genera el Excel con columnas protegidas |
| `app/Imports/PreciosVendedorImport.php` | Lee el Excel e importa precios |

#### Rutas agregadas en `routes/crud/productos.php`
```php
Route::get('/disponibles/almacen/{almacen}/exportar', [..., 'exportExcel']);
Route::post('/disponibles/almacen/{almacen}/importar', [..., 'importExcel']);
```

#### Estructura del Excel exportado
| Col | Nombre       | Estado        | Notas                          |
|-----|--------------|---------------|--------------------------------|
| A   | ID           | Oculta y bloqueada | Clave para el import      |
| B   | Producto     | Bloqueada     | Solo lectura                   |
| C   | Categoría    | Bloqueada     | Solo lectura                   |
| D   | Precio Venta | **Editable**  | Fondo amarillo. Puede estar vacío |
| E   | Comisión     | **Editable**  | Fondo amarillo. Puede estar vacío |
| F   | (nota)       | Solo lectura  | Instrucciones de uso           |
| G   | almacen_id   | Oculta        | Para validación futura         |

- Hoja protegida con contraseña: `almacen_precios`
- Si ya tiene precio en el sistema, se exporta con ese valor (editable)

#### Lógica del import
- Identifica producto por **columna A (ID)** — nunca por nombre
- Celdas vacías en D y E → se ignoran (no sobreescribe)
- Celdas con valor → actualiza y registra en `PrecioHistorial` si el precio cambió
- `accion` en historial: `'Importación Excel - Almacén ID X'`
- Devuelve: `actualizados`, `omitidos`, `errores[]`
- Si hubo actualizaciones → la página se recarga automáticamente en 2 segundos

#### Permisos
- Admin y Moderador → pueden exportar/importar cualquier almacén
- Vendedor → solo sus almacenes asignados

---

## Pendiente / Ideas futuras

- [ ] Validar que el `almacen_id` de la columna G del Excel coincida con el almacén seleccionado antes de importar (previene que alguien importe el Excel de un almacén en otro)
- [ ] Exportar PDF con vista de precios del almacén (botón ya en la UI, sin implementar)
- [ ] Notificación al admin cuando un vendedor importa precios masivamente (similar a `CambioPrecioVendedorNotification`)
