# Herramienta de detección y fusión de productos duplicados — ✅ IMPLEMENTADA

> **Prioridad: Alta** — Herramienta independiente (no afecta la importación) para escanear la BD, detectar productos duplicados y fusionarlos manualmente con promedio de precios.
> **Implementada el 2026-07-25**

---

## Endpoints

### `GET /listado-productos/duplicados` — Detectar duplicados

Agrupa productos por `(nombre_producto, marca_producto, modelo_producto, capacidad_normalizada, color_producto)` y devuelve los que tienen `COUNT > 1`.

**Normalización de capacidad:** Se limpian los caracteres unicode `U+00B4 (´)` y `U+00A8 (¨)` y `"` mediante `REPLACE(capacidad_producto, UNHEX('C2B4'), '')` y `UNHEX('C2A8')` en SQL. Así `26"`, `26´´`, `26¨` se normalizan a `26` y se agrupan juntos, pero `16"` y `20"` quedan en grupos distintos.

Cada grupo incluye `campos_variables` — lista de campos que difieren entre los productos del grupo (excluyendo `color` y `precio_compra`), con los valores únicos encontrados y un `valor_sugerido` (el más frecuente).

Respuesta:
```json
{
  "success": true,
  "total_grupos": 2,
  "grupos": [
    {
      "clave": "BICICLETA REYAN NIAGARA HOMBRE (26)",
      "cantidad_total": 15,
      "precio_promedio": 151.50,
      "productos": [...],
      "campos_variables": [
        { "campo": "capacidad", "valores": ["26\"", "26´´", "26¨"], "valor_sugerido": "26\"" },
        { "campo": "categoria_id", "valores": [5, 6], "valor_sugerido": 5 }
      ]
    }
  ]
}
```

### `POST /listado-productos/normalizar-duplicados` — Solo normalizar

Request:
```json
{
  "productos_ids": [501, 530, 553],
  "valores_canonicos": {
    "capacidad_producto": "26\"",
    "categoria_id": 5
  }
}
```

Lógica:
1. Actualizar `valores_canonicos` en TODOS los productos indicados
2. Todo dentro de `DB::transaction()`

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
