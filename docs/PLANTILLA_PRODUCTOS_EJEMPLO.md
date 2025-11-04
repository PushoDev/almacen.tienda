# 📋 Plantilla de Importación de Productos - Ejemplo

Esta es una plantilla de ejemplo para la importación de productos. Descargala como Excel o CSV y úsala como referencia.

## ✅ Estructura Correcta

La siguiente tabla muestra el formato exacto que debe tener tu archivo:

| nombre_producto | marca | modelo | capacidad | categoria | precio_compra | cantidad |
|---|---|---|---|---|---|---|
| Refrigeradora Samsung | Samsung | RS25J500D | 500L | REFRIGERACION | 1200.50 | 5 |
| Televisor LG OLED | LG | OLED65BXPUA | 65 pulgadas | AUDIOVISUALES | 2500.00 | 3 |
| Laptop Dell XPS | Dell | XPS13 | 512GB SSD | TELEFONOS/TABLETS | 1500.00 | 10 |
| Horno Electrolux | Electrolux | EOD20E7SX | 76L | COCINA | 800.00 | 2 |
| Aire Acondicionado Midea | Midea | MWH-07CRNAA8 | 7000 BTU | MISCELANEAS | 450.00 | 8 |
| Bicicleta Mountain Bike | Huffy | 26 Rockrider | 26 pulgadas | CICLOMOTORES | 350.00 | 15 |
| Mochila Nike | Nike | BA5081 | 30L | ACCESORIOS | 120.00 | 20 |

---

## 📝 Instrucciones Detalladas

### Columnas Requeridas

#### 1. **nombre_producto** (OBLIGATORIO)
- Nombre del producto
- Máximo 255 caracteres
- No puede estar vacío
- Ejemplo: "Laptop Dell XPS"

#### 2. **categoria** (OBLIGATORIO)
- Categoría del producto
- Máximo 255 caracteres
- Si no existe, se crea automáticamente
- Se recomienda usar categorías existentes:
  - COCINA
  - REFRIGERACION
  - AUDIOVISUALES
  - CICLOMOTORES
  - ACCESORIOS
  - MISCELANEAS
  - TELEFONOS/TABLETS

#### 3. **precio_compra** (OBLIGATORIO)
- Precio de compra en USD
- Debe ser un número válido
- Mínimo: 0
- Separador decimal: . (punto)
- Ejemplo: 1500.00 o 500 o 99.99

#### 4. **cantidad** (OBLIGATORIO)
- Cantidad de productos en el almacén
- Debe ser un número entero (sin decimales)
- Mínimo: 0
- Ejemplo: 10 o 5 o 0

### Columnas Opcionales

#### 5. **marca** (OPCIONAL)
- Marca del fabricante
- Máximo 255 caracteres
- Puede estar vacío o tener "N/A"
- Ejemplo: "Dell", "Samsung", "LG"

#### 6. **modelo** (OPCIONAL)
- Modelo específico del producto
- Máximo 255 caracteres
- Puede estar vacío o tener "N/A"
- Ejemplo: "XPS13", "RS25J500D", "65BXPUA"

#### 7. **capacidad** (OPCIONAL)
- Capacidad o especificación técnica
- Máximo 255 caracteres
- Puede estar vacío o tener "N/A"
- Ejemplo: "512GB SSD", "500L", "65 pulgadas"

---

## ❌ Errores Comunes a Evitar

### ❌ Error 1: Columnas en Orden Incorrecto
**MALO:**
```
categoria | nombre_producto | precio_compra | cantidad
```

**BUENO:**
```
nombre_producto | categoria | precio_compra | cantidad
```

### ❌ Error 2: Encabezados Diferentes
**MALO:**
```
Producto | Tipo | Precio | Cant
```

**BUENO:**
```
nombre_producto | categoria | precio_compra | cantidad
```

### ❌ Error 3: Formato de Precio Incorrecto
**MALO:**
```
1.500,00 (punto como separador de miles)
$ 1500 (con símbolo)
1500, (coma como decimal)
```

**BUENO:**
```
1500.00 (punto como decimal)
1500 (número entero)
99.99
```

### ❌ Error 4: Cantidad con Decimales
**MALO:**
```
10.5 (número con decimales)
```

**BUENO:**
```
10 (número entero)
```

### ❌ Error 5: Celdas Vacías en Campos Obligatorios
**MALO:**
```
Laptop Dell | | 1500.00 | 10
```

**BUENO:**
```
Laptop Dell | Electrónicos | 1500.00 | 10
```

---

## 🔄 Casos de Uso Práctica

### Caso 1: Productos Simples
```
nombre_producto | categoria | precio_compra | cantidad
Monitor LG 27" | AUDIOVISUALES | 350.00 | 5
Teclado Logitech | ACCESORIOS | 80.00 | 12
```

### Caso 2: Productos Con Especificaciones Completas
```
nombre_producto | marca | modelo | capacidad | categoria | precio_compra | cantidad
Laptop HP Pavilion | HP | 15-ec0013dx | 256GB SSD | TELEFONOS/TABLETS | 899.00 | 3
Split Gree 12000BTU | Gree | GWH12QE-K3DNA1A | 12000 BTU | MISCELANEAS | 650.00 | 2
```

### Caso 3: Actualizar Stock Existente
```
nombre_producto | marca | modelo | categoria | precio_compra | cantidad
Laptop Dell XPS | Dell | XPS13 | TELEFONOS/TABLETS | 1500.00 | 15
Refrigeradora Samsung | Samsung | RS25J500D | REFRIGERACION | 1200.50 | 8
```

---

## 📥 Cómo Crear el Archivo

### Opción 1: Usando Microsoft Excel
1. Abre Microsoft Excel
2. En la primera fila, agrega los encabezados:
   - `nombre_producto`
   - `marca`
   - `modelo`
   - `capacidad`
   - `categoria`
   - `precio_compra`
   - `cantidad`
3. En las filas siguientes, completa los datos
4. Guarda como `productos.xlsx`

### Opción 2: Usando Google Sheets
1. Ve a https://sheets.google.com
2. Crea una nueva hoja de cálculo
3. Agrega los encabezados y datos
4. Descarga como Excel: Archivo → Descargar → Excel (.xlsx)

### Opción 3: Usando LibreOffice Calc
1. Abre LibreOffice Calc
2. Crea la tabla con los datos
3. Guarda como `productos.ods` o `productos.xlsx`

---

## 🎯 Checklist Antes de Importar

- [ ] El archivo tiene formato .xlsx o .xls
- [ ] El archivo pesa menos de 5 MB
- [ ] La primera fila contiene exactamente estos encabezados:
  - nombre_producto
  - categoria
  - precio_compra
  - cantidad
  - marca (opcional)
  - modelo (opcional)
  - capacidad (opcional)
- [ ] Todos los campos obligatorios tienen valores
- [ ] Los precios usan punto (.) como decimal
- [ ] Las cantidades son números enteros
- [ ] No hay espacios adicionales en los datos
- [ ] El almacén de destino está correctamente seleccionado

---

## 💡 Tips Útiles

### Tip 1: Validar Antes de Importar
- Abre el archivo en Excel
- Verifica que los datos se ven correctos
- Prueba con pocos registros primero

### Tip 2: Usar Caracteres Especiales
- Acentos: á, é, í, ó, ú (está permitido)
- Espacios: está permitido
- Símbolos especiales: evita @, #, $, %

### Tip 3: Categorías Recomendadas
Usa estas categorías para consistencia:
- COCINA
- REFRIGERACION
- AUDIOVISUALES
- CICLOMOTORES
- ACCESORIOS
- MISCELANEAS
- TELEFONOS/TABLETS
- O crea las tuyas propias

### Tip 4: Códigos de Barras
- Se generan automáticamente
- No necesitas agregarlos en el archivo
- Se pueden regenerar después

### Tip 5: Importaciones Grandes
- Para > 1000 productos, divide en varios archivos
- Importa almacén por almacén
- Esto evita timeouts

---

## 📞 Contacto y Soporte

Si tienes problemas:
1. Descarga nuevamente la plantilla
2. Verifica el formato exactamente
3. Prueba con menos datos
4. Revisa los logs del sistema

---

**Versión de Plantilla:** 1.0
**Última actualización:** Enero 2025
