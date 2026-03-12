# Plantilla para Importar Productos desde Excel

## Estructura de columnas

La primera fila debe tener los encabezados exactamente como se muestra:

| Columna             | Requerido | Descripción                 | Ejemplo              |
| ------------------- | --------- | --------------------------- | -------------------- |
| **nombre_producto** | ✅ Sí     | Nombre del producto         | "Samsung Galaxy S24" |
| **categoria**       | ✅ Sí     | Nombre de la categoría      | "Celulares"          |
| **precio_compra**   | ✅ Sí     | Precio de compra (número)   | 450.00               |
| **cantidad**        | ✅ Sí     | Cantidad a agregar (entero) | 10                   |
| **marca**           | ❌ No     | Marca del producto          | "Samsung"            |
| **modelo**          | ❌ No     | Modelo del producto         | "S24 Ultra"          |
| **capacidad**       | ❌ No     | Capacidad/Tamaño            | "256GB"              |

---

## Ejemplo de datos

| nombre_producto    | categoria    | precio_compra | cantidad | marca    | modelo    | capacidad |
| ------------------ | ------------ | ------------- | -------- | -------- | --------- | --------- |
| Samsung Galaxy S24 | Celulares    | 450.00        | 10       | Samsung  | S24 Ultra | 256GB     |
| iPhone 15 Pro      | Celulares    | 800.00        | 5        | Apple    | 15 Pro    | 128GB     |
| Laptop HP Pavilion | Computadoras | 550.00        | 3        | HP       | Pavilion  | 15.6"     |
| Mouse Inalámbrico  | Accesorios   | 15.00         | 20       | Logitech | MX Master | -         |
| Teclado Mecánico   | Accesorios   | 45.00         | 8        | Corsair  | K70       | RGB       |

---

## Notas Importantes

1. **La primera fila debe ser el encabezado** con los nombres de columna exactos
2. **Los números deben ser formato número** (no texto con símbolos de moneda)
3. **Las categorías se crean automáticamente** si no existen
4. **La cantidad se SUMA** al stock existente, no reemplaza
5. **Los productos se identifican** por nombre + marca + modelo

---

## Errores comunes a evitar

| Error                | Solución                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Fila omitida         | Verificar que `nombre_producto`, `categoria`, `precio_compra` y `cantidad` tengan valores |
| Números como texto   | Asegurarse de que precio y cantidad sean números, no texto                                |
| Kategoría vacía      | La categoría es obligatoria                                                               |
| Cantidad con decimal | La cantidad debe ser número entero                                                        |

---

## Formato del archivo

- **Extensión**: `.xlsx` o `.xls` (Excel)
- **Codificación**: UTF-8 (para caracteres especiales como ñ, tildes, etc.)
