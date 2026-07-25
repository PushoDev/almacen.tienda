# Pendiente: Herramienta de detección y fusión de productos duplicados

> **Prioridad: Alta** — Herramienta independiente (no afecta la importación) para escanear la BD, detectar productos duplicados y fusionarlos manualmente con promedio de precios.

---

## Endpoints

### `GET /listado-productos/duplicados` — Detectar duplicados

Agrupa productos por `(nombre_producto, marca_producto, modelo_producto)` y devuelve los que tienen `COUNT > 1`.

**Nuevo:** Cada grupo incluye `campos_variables` — lista de campos que difieren entre los productos del grupo (excluyendo `color` y `precio_compra`), con los valores únicos encontrados.

Respuesta:
```json
{
  "success": true,
  "total_grupos": 12,
  "grupos": [
    {
      "clave": "BICICLETA REYAN NIAGARA HOMBRE",
      "cantidad_total": 26,
      "precio_promedio": 151.50,
      "productos": [...],
      "campos_variables": [
        { "campo": "capacidad_producto", "valores": ["26\"", "26´´", "26¨"] },
        { "campo": "categoria", "valores": ["TRANSPORTE", "TRASPORTE"] }
      ]
    }
  ]
}
```

### `POST /listado-productos/fusionar-duplicados` — Normalizar y Fusionar

Request:
```json
{
  "producto_conservar_id": 530,
  "productos_eliminar_ids": [553, 501],
  "valores_canonicos": {
    "capacidad_producto": "26\"",
    "categoria_id": 5
  }
}
```

Lógica:
1. Actualizar `valores_canonicos` en TODOS los productos del grupo (conservar + eliminar)
2. Sumar cantidades del eliminado al conservado en `almacen_producto`
3. Transferir códigos de barras únicos del eliminado al conservado
4. Recalcular precio promedio ponderado
5. Eliminar relaciones y productos duplicados
6. Todo dentro de `DB::transaction()`

---

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `routes/crud/productos.php` | +2 rutas (ya implementadas) |
| `app/Http/Controllers/ProductoController.php` | Modificar `duplicados()` para incluir `campos_variables`. Modificar `fusionarDuplicados()` para aceptar múltiples IDs + valores canónicos |
| `resources/js/pages/Productos/Index.tsx` | +botón 🧹, +Modal 1 (exploración), +Modal 2 (normalización + fusión) |

---

## Frontend — Dos modales

### Modal 1 — Exploración de grupos
- Botón 🧹 en toolbar ámbar
- Título: "🧹 Limpiar productos duplicados"
- "Se encontraron X grupos de productos duplicados"
- Lista expandible por grupo:
  - Cabecera: `▶ BICICLETA REYAN NIAGARA HOMBRE (3 productos, 26 unds)`
  - Expandido: productos del grupo (ID, precio, almacenes)
  - Botón: **"🔧 Normalizar y Fusionar"** → abre Modal 2
- Botón "Cerrar"

### Modal 2 — Normalización + Fusión (por grupo)
- Título: "🔧 Normalizar y fusionar — BICICLETA REYAN NIAGARA HOMBRE"
- Selector: **"Conservar producto"** → dropdown con los IDs del grupo (sugerido: el de mayor cantidad)
- **Campos variables** (solo los que difieren, excluyendo color y precio):
  - Cada campo con input editable + valor más frecuente como placeholder/sugerencia
  - Ej: Capacidad → `[26"        ]` con hint "Valores actuales: 26", 26´´, 26¨"
- **Resumen de fusión:**
  - Cantidades por almacén antes → después
  - Precio promedio ponderado
- Botones:
  - **"Solo normalizar"** — actualiza campos sin fusionar
  - **"🧬 Normalizar y Fusionar"** — normaliza + fusiona + elimina duplicados

---

## Consideraciones

- Color no se normaliza (variante legítima del producto)
- Precio no se normaliza, se promedia ponderado al fusionar
- `cantidad_total` es un **accesor** que suma del pivot, no es columna real
- No hay unique constraint en BD para la agrupación
- La fusión **no** transfiere relaciones con vendedores (`producto_vendedors`)
