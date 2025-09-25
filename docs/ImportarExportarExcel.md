# 📋 Documentación: Flujo de Importación/Exportación de Productos

## 🔄 Secuencia Completa del Usuario

### **1. Llegada a la Vista de Productos**
```
URL: /productos
```
**Lo que ve el usuario:**
- Lista completa de productos en tabla
- Panel de estadísticas (total productos, stock bajo, valores)
- Filtros (búsqueda, categoría, stock bajo)
- **Botones de acción:** Plantilla | Importar | Exportar
- Selector de almacén (por defecto: Almacén 1)

---

### **2. FLUJO DE IMPORTACIÓN (Primera Prioridad del Usuario)**

#### **Paso 1: Preparar el archivo Excel**
```
El usuario necesita un archivo con formato específico:
```
**Columnas requeridas:**
- `nombre_producto` (obligatorio)
- `marca` (opcional)
- `codigo` (opcional, único)
- `categoria` (obligatorio)
- `precio_compra` (obligatorio, numérico)
- `cantidad` (obligatorio, entero)
- `imagen` (opcional)

**Ejemplo de datos:**
```excel
nombre_producto | marca    | codigo   | categoria | precio_compra | cantidad | imagen
Laptop HP       | HP       | LP-HP001 | Tecnología| 1500.00       | 10       |
Mouse Logitech  | Logitech | M-LOG001 | Accesorios| 25.50         | 5        |
```

#### **Paso 2: Hacer clic en "Importar"**
```
Acción: Click en botón "Importar" (ícono 📤)
```
**Resultado:** Se abre el modal de importación

#### **Paso 3: Configurar importación en el modal**
```
El usuario debe:
1. Seleccionar almacén destino (dropdown con lista de almacenes)
2. Seleccionar archivo Excel (.xlsx o .xls)
   - Opción A: Arrastrar y soltar archivo
   - Opción B: Click en área para seleccionar archivo
```

#### **Paso 4: Confirmar importación**
```
Acción: Click en botón "Importar" del modal
```

#### **Paso 5: Procesamiento en segundo plano**
```
Sistema realiza:
✓ Validación de archivo (formato, tamaño < 2MB)
✓ Validación de datos (columnas requeridas, tipos de datos)
✓ Procesamiento fila por fila
✓ Asignación automática al almacén seleccionado
```

#### **Paso 6: Resultado de la importación**
**Éxito:**
- ✅ Notificación: "Productos importados y asignados al almacén correctamente"
- 🔄 La tabla se actualiza automáticamente con nuevos productos
- 📊 Estadísticas se recalculan

**Error:**
- ❌ Notificación con descripción del error
- 📝 Ejemplo: "Error en fila 3: El código YA001 ya existe"

---

### **3. FLUJO DE EXPORTACIÓN (Después de Importar)**

#### **Paso 1: Seleccionar almacén a exportar**
```
Acción: Usar dropdown de almacenes (junto a botones)
- Por defecto: Almacén 1
- Opciones: Todos los almacenes disponibles
```

#### **Paso 2: Hacer clic en "Exportar"**
```
Acción: Click en botón "Exportar" (ícono 📥)
```

#### **Paso 3: Descarga automática**
```
Resultado inmediato:
✓ Descarga automática del archivo: `productos-almacen-1-2024-01-15.xlsx`
✓ Notificación: "Exportación iniciada"
```

#### **Paso 4: Archivo generado**
**Contenido del Excel exportado:**
```excel
ID | Nombre Producto | Marca | Código | Categoría | Precio Compra | Cantidad | Imagen | Stock Total | ¿Stock Bajo?
1  | Laptop HP       | HP    | LP-HP001| Tecnología| 1500.00       | 10       | ...    | 10          | NO
2  | Mouse Logitech  | Logitech| M-LOG001| Accesorios| 25.50         | 5        | ...    | 5           | NO
```

---

## 🎯 Casos de Uso Típicos

### **Caso 1: Migración inicial de productos**
```
Usuario nuevo que quiere cargar todos sus productos
```
1. Descargar plantilla (botón "Plantilla")
2. Llenar plantilla con todos los productos
3. Seleccionar "Almacén 1" como destino
4. Importar archivo completo
5. Verificar que todos los productos aparecen en la tabla

### **Caso 2: Actualización masiva de precios**
```
Usuario quiere actualizar precios de varios productos
```
1. Exportar productos actuales (para tener backup)
2. Modificar columna "precio_compra" en el Excel exportado
3. Importar el mismo archivo modificado
4. Sistema actualiza productos existentes (por código)

### **Caso 3: Traspaso entre almacenes**
```
Usuario quiere mover productos de un almacén a otro
```
1. Exportar desde almacén origen
2. Modificar columna "cantidad" a 0 en almacén origen (via edición individual)
3. Importar el archivo al almacén destino con nuevas cantidades

---

## ⚠️ Validaciones y Restricciones

### **Durante Importación:**
| Campo | Validación | Mensaje Error |
|-------|------------|---------------|
| nombre_producto | Requerido, máximo 255 chars | "Nombre del producto es obligatorio" |
| categoria | Requerido | "Categoría es obligatoria" |
| precio_compra | Numérico, ≥ 0 | "Precio debe ser número positivo" |
| cantidad | Entero, ≥ 0 | "Cantidad debe ser número entero" |
| codigo | Único en sistema | "El código YA001 ya existe" |

### **Límites del Sistema:**
- ✅ **Tamaño archivo:** Máximo 2MB
- ✅ **Formatos soportados:** .xlsx, .xls
- ✅ **Filas máximas:** 10,000 por lote
- ✅ **Almacenes:** Deben existir en la base de datos

---

## 🔄 Comportamiento con Datos Existentes

### **Productos Nuevos:**
```
Si el código NO existe en el sistema:
✓ Se crea nuevo producto
✓ Se asigna al almacén seleccionado
✓ Se establece la cantidad especificada
```

### **Productos Existentes:**
```
Si el código YA existe en el sistema:
✓ Se actualizan los datos (nombre, marca, precio, categoría)
✓ Se actualiza la cantidad EN EL ALMACÉN ESPECIFICADO
✓ No se afectan otros almacenes
```

---

## 🎨 Elementos Visuales en la Interfaz

### **Antes de Importar:**
- 🔷 Botón "Importar" - Color secundario
- 📋 Modal con instrucciones claras
- 🎯 Selector de almacén visible

### **Durante Importación:**
- ⏳ Cursor de carga en el botón
- 🔄 Animación en el modal
- 📊 Barra de progreso (si es archivo grande)

### **Después de Importar:**
- ✅ Notificación verde de éxito
- 📈 Estadísticas actualizadas
- 🆕 Productos nuevos en la tabla

### **Durante Exportación:**
- ⬇️ Descarga automática del navegador
- 💾 Nombre de archivo con fecha y almacén
- 📊 Notificación de confirmación

---

## 🚨 Manejo de Errores

### **Errores Comunes y Soluciones:**
| Error | Causa | Solución |
|-------|-------|----------|
| "Formato de archivo no válido" | Archivo no es Excel | Usar .xlsx o .xls |
| "Tamaño de archivo excede 2MB" | Archivo muy grande | Dividir en varios archivos |
| "Fila 5: Categoría es obligatoria" | Dato faltante | Completar columna categoría |
| "El código LP-HP001 ya existe" | Código duplicado | Usar código único o dejar vacío |

---

## 📊 Métricas y Seguimiento

### **Después de Importación Exitosa:**
- ✅ **Productos creados:** X nuevos
- 🔄 **Productos actualizados:** Y existentes
- 📦 **Almacén afectado:** Nombre del almacén
- ⏱️ **Tiempo de procesamiento:** Z segundos

### **En Exportación:**
- 📄 **Total productos exportados:** N
- 🏪 **Almacén exportado:** Nombre del almacén
- 📏 **Tamaño archivo:** T MB

---

¿Te gustaría que profundice en algún aspecto específico del flujo o necesitas que ajuste alguna parte de la documentación?
