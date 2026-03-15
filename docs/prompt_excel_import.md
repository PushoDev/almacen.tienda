# Prompt para generar Excel de importación de productos

Crea un archivo Excel (.xlsx) con las siguientes características:

## Encabezados (Fila 1)

El archivo debe tener las siguientes columnas:

- **nombre_producto** (obligatorio)
- **categoria** (obligatorio)
- **precio_compra** (obligatorio)
- **cantidad** (obligatorio)
- **marca** (opcional)
- **modelo** (opcional)
- **capacidad** (opcional)

## Datos de ejemplo (Fila 2 en adelante)

Incluye 10-15 productos de ejemplo varietyados, por ejemplo:

| nombre_producto       | categoria      | precio_compra | cantidad | marca    | modelo       | capacidad |
| --------------------- | -------------- | ------------- | -------- | -------- | ------------ | --------- |
| Laptop HP Pavilion 15 | Electrónica    | 15000         | 5        | HP       | Pavilion 15  | 512GB     |
| Mouse Inalámbrico     | Accesorios     | 250           | 20       | Logitech | M170         | -         |
| Teclado Mecánico      | Electrónica    | 1200          | 8        | Corsair  | K70          | -         |
| Monitor 24 pulgadas   | Electrónica    | 4500          | 3        | Samsung  | S24F350      | -         |
| USB 32GB              | Almacenamiento | 150           | 50       | Kingston | DataTraveler | 32GB      |
| Pasta Dental          | Higiene        | 45            | 100      | Colgate  | Total        | -         |
| Café Molido 500g      | Alimentos      | 180           | 30       | Nescafé  | Clasico      | 500g      |
| Jabón Líquido         | Higiene        | 65            | 80       | Dove     | Original     | 500ml     |
| Cuaderno              | Oficina        | 35            | 200      | Scribe   | College      | 100 hojas |
| Bolígrafo Azul        | Oficina        | 8             | 500      | Pilot    | G2           | -         |

## Formato

- Usa la primera fila para encabezados
- Los datos numéricos (precio_compra, cantidad) deben ser valores, no texto
- Guarda el archivo como: `plantilla_importacion_productos.xlsx`
