# Pendiente: Herramienta de detección y fusión de productos duplicados

> Herramienta independiente (no afecta la importación) para escanear la BD, detectar productos duplicados y fusionarlos manualmente con promedio de precios.

---

## Endpoints

### `GET /listado-productos/duplicados` — Detectar duplicados

Agrupa productos por `(nombre_producto, marca_producto, modelo_producto, capacidad_producto, color_producto)` y devuelve los que tienen `COUNT > 1`.

Respuesta:
```json
{
  "success": true,
  "total_grupos": 12,
  "grupos": [
    {
      "clave": "CONECTOR | — | MC4",
      "cantidad_total": 189,
      "precio_promedio": 0.44,
      "productos": [
        { "id": 316, "nombre": "CONECTOR", "precio_compra": 0.38, "cantidad_total": 169, "almacenes": [...], "codigos_barras": [...] },
        { "id": 999, "nombre": "CONECTOR", "precio_compra": 0.50, "cantidad_total": 20, "almacenes": [...], "codigos_barras": [...] }
      ]
    }
  ]
}
```

### `POST /listado-productos/fusionar-duplicados` — Fusionar

Request:
```json
{ "producto_conservar_id": 316, "producto_eliminar_id": 999 }
```

Lógica:
1. Sumar cantidades del eliminado al conservado en `almacen_producto`
2. Transferir códigos de barras únicos del eliminado al conservado
3. Recalcular precio promedio ponderado: `(precio_A * cant_A + precio_B * cant_B) / (cant_A + cant_B)`
4. Eliminar relaciones y el producto duplicado
5. Todo dentro de `DB::transaction()`

---

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `routes/crud/productos.php` | +2 rutas nuevas |
| `app/Http/Controllers/ProductoController.php` | +2 métodos: `duplicados()`, `fusionarDuplicados()` |
| `resources/js/pages/Productos/Index.tsx` | +botón 🧹 en toolbar, +modal de duplicados, +estados, +import `GitMerge` |

---

## Frontend

### Botón en barra de filtros (junto a import/export)
- Icono: `GitMerge` de lucide-react (color ámbar)
- Tooltip: "Limpiar duplicados"
- onClick: fetch a `route('productos.duplicados')`

### Modal de duplicados
- Título: "🧹 Limpiar productos duplicados"
- Muestra: "Se encontraron X grupos de productos duplicados"
- Lista expandible por grupo:
  - Cabecera: `▼ CONECTOR | — | MC4 (2 productos, 189 unds)`
  - Productos del grupo: ID, precio, almacenes, códigos
  - Precio promedio sugerido
  - Botón "Fusionar → Conservar ID X" por grupo
- Botón "Cerrar"

### Acción de fusión
- Confirmación antes de fusionar
- POST a `route('productos.fusionar')`
- Toast de éxito/error
- Recargar lista de duplicados después de fusionar

---

## Consideraciones

- El `cantidad_total` es un **accesor** que suma del pivot, no es columna real
- No hay unique constraint en BD para el grupo de campos, la detección es por agrupación SQL
- La fusión transfiere cantidades, códigos de barras y promedia precio, **no** transfiere relaciones con vendedores (`producto_vendedors`) — eso quedaría inconsistente y habría que decidir cómo manejarlo
- El `scopeStockBajo` usa `cantidad_total < 5` (no 3 como en el frontend que dice "menos de 3")
