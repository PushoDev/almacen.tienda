# 📊 Guía de Importación y Exportación de Productos

## 📋 Descripción General

Esta guía explica cómo usar las funcionalidades de importación y exportación de productos en el sistema de gestión de almacén.

## 🚀 Características Principales

### ✅ Exportación de Productos
- Exporta los productos de un almacén específico a un archivo Excel
- Incluye información completa del producto (nombre, marca, modelo, precio, cantidad, etc.)
- El archivo se descarga automáticamente con nombre descriptivo
- Genera reportes con valores totales por almacén

**Características:**
- Filtrado automático por almacén seleccionado
- Encabezados formateados con estilos profesionales
- Incluye cantidad específica del almacén (no total)
- Calcula valor total por producto
- Identifica productos con stock bajo

### ✅ Importación de Productos
- Carga productos desde un archivo Excel
- Selección del almacén de destino
- Creación automática de nuevos productos
- Actualización de productos existentes
- Generación automática de códigos de barras
- Manejo robusto de errores con validación completa

**Características:**
- Validación de archivo (formato y tamaño)
- Validación de datos en cada fila
- Categorías automáticas (crea si no existen)
- Soporte Drag & Drop
- Estadísticas de importación
- Logs detallados de cada operación

---

## 💾 Formato del Archivo Excel

### Columnas Obligatorias
| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| nombre_producto | Texto | Nombre del producto | Laptop Dell XPS |
| categoria | Texto | Categoría del producto | Electrónicos |
| precio_compra | Número | Precio de compra en USD | 1500.00 |
| cantidad | Número Entero | Cantidad en el almacén | 10 |

### Columnas Opcionales
| Columna | Tipo | Descripción | Ejemplo |
|---------|------|-------------|---------|
| marca | Texto | Marca del fabricante | Dell |
| modelo | Texto | Modelo específico | XPS 13 |
| capacidad | Texto | Capacidad o especificación | 512GB SSD |

### Ejemplo de Fila Completa
```
nombre_producto          | marca  | modelo   | capacidad | categoria      | precio_compra | cantidad
Refrigeradora Samsung    | Samsung| RS25J500D| 500L      | REFRIGERACION  | 1200.50      | 5
```

---

## 🔧 Cómo Usar

### Exportar Productos

1. **Acceder a la Gestión de Productos**
   - Navega a `Resumen General → Productos`

2. **Seleccionar el Almacén**
   - En la barra superior, en el selector de almacén
   - Elige el almacén del cual deseas exportar productos

3. **Hacer Clic en Exportar**
   - Botón verde "Exportar" en la barra de herramientas
   - Se descargará automáticamente el archivo Excel

4. **Archivo Generado**
   - Nombre: `productos-almacen-nombre-YYYY-MM-DD-HH-MM-SS.xlsx`
   - Contiene todos los productos del almacén seleccionado

### Importar Productos

1. **Acceder a la Gestión de Productos**
   - Navega a `Resumen General → Productos`

2. **Abrir el Modal de Importación**
   - Haz clic en el botón azul "Importar"
   - Se abrirá un modal con opciones

3. **Seleccionar Almacén**
   - Elige el almacén donde deseas importar los productos
   - Los productos se asignarán a este almacén

4. **Seleccionar Archivo**
   - **Opción 1:** Arrastra un archivo Excel sobre el área punteada
   - **Opción 2:** Haz clic en el área para abrir el explorador de archivos
   - El archivo se debe cambiar o hacer clic nuevamente para cambiar de archivo

5. **Iniciar Importación**
   - Haz clic en "Importar Productos"
   - El sistema validará y procesará el archivo
   - Aparecerá un indicador de progreso ("Importando...")

6. **Resultado**
   - Notificación de éxito con estadísticas
   - Se recargan los productos automáticamente
   - Puedes ver los nuevos productos en la lista

---

## ⚙️ Validaciones y Comportamiento

### Durante la Importación

**Validaciones de Archivo:**
- ✅ Debe ser formato Excel (.xlsx o .xls)
- ✅ Tamaño máximo: 5 MB
- ✅ Debe tener la estructura correcta

**Validaciones de Datos:**
- ✅ Nombre del producto: obligatorio, máx. 255 caracteres
- ✅ Categoría: obligatoria, máx. 255 caracteres
- ✅ Precio de compra: número válido ≥ 0
- ✅ Cantidad: número entero ≥ 0
- ✅ Marca, modelo, capacidad: opcionales

### Comportamiento de Productos

**Nuevo Producto:**
- Se crea con los datos proporcionados
- Se genera código de barras automáticamente
- Se asigna al almacén con la cantidad especificada
- Se crea la categoría si no existe

**Producto Existente:**
- Se busca por: nombre, marca y modelo
- Se actualiza: categoría y precio de compra
- Se actualiza/crea relación con el almacén
- Conserva el código de barras existente

### Categorías

- Si la categoría NO existe: se crea automáticamente
- Si la categoría SÍ existe: se usa la existente
- Las categorías importadas tienen descripción "Importado desde Excel"

---

## 📊 Estadísticas de Importación

Después de importar, recibirás un resumen con:

```
✓ Importación completada correctamente.
• Productos creados: X
• Productos actualizados: Y
• Total procesado: Z
⚠ Filas omitidas: W (si las hay)
```

**Logs Detallados:**
- Todos los eventos se registran en `storage/logs/laravel.log`
- Cada producto creado/actualizado es registrado
- Los errores incluyen contexto completo

---

## 🛠️ Casos de Uso

### Caso 1: Importar Nuevo Inventario
1. Prepara un archivo Excel con los nuevos productos
2. Ve a Productos → Importar
3. Selecciona el almacén de destino
4. Carga el archivo
5. El sistema crea los productos automáticamente

### Caso 2: Actualizar Precios
1. Exporta los productos del almacén
2. Modifica los precios en Excel
3. Importa el archivo de vuelta
4. Los precios se actualizan automáticamente

### Caso 3: Transferir Stock
1. Exporta productos del almacén A
2. Modifica las cantidades
3. Importa en el almacén B
4. Ambos almacenes tendrán los mismos productos con sus cantidades

---

## ⚠️ Troubleshooting

### Error: "El almacén especificado no existe"
**Solución:** 
- Asegúrate de que el almacén seleccionado existe
- Recarga la página e intenta de nuevo

### Error: "El archivo debe ser de tipo Excel"
**Solución:**
- Verifica que el archivo tenga extensión .xlsx o .xls
- Algunos archivos PDF o CSV no funcionarán

### Error: "Tamaño de archivo demasiado grande"
**Solución:**
- El archivo no debe superar 5 MB
- Divide tu importación en varios archivos más pequeños

### Los productos se crean pero sin stock
**Solución:**
- Verifica que la columna "cantidad" tenga valores numéricos
- Asegúrate de que los valores sean ≥ 0

### Los productos no aparecen después de importar
**Solución:**
- Recarga la página (F5)
- Verifica que el almacén de destino sea correcto
- Revisa los logs en `storage/logs/laravel.log`

---

## 📁 Archivos Modificados

### Backend (PHP)
- **`app/Exports/ProductoExport.php`** - Exportación con filtrado por almacén
- **`app/Imports/ProductoImport.php`** - Importación con validación mejorada
- **`app/Http/Controllers/ProductoController.php`** - Métodos export() e import()
- **`routes/crud/productos.php`** - Rutas de import/export

### Frontend (React/TypeScript)
- **`resources/js/pages/Productos/Index.tsx`** - Modal y funciones mejoradas

---

## 🔐 Seguridad

- ✅ Validación server-side en todas las importaciones
- ✅ Transacciones de base de datos (rollback en caso de error)
- ✅ Validación de archivo (tipo y tamaño)
- ✅ Sanitización de datos
- ✅ Logs de auditoría de todas las operaciones
- ✅ Permisos de autenticación requeridos

---

## 📝 Notas Importantes

1. **Códigos de Barras:**
   - Se generan automáticamente al crear productos
   - Se pueden regenerar en la vista individual del producto
   - Cada código es único en el sistema

2. **Stock:**
   - El stock es específico por almacén
   - Un mismo producto puede tener diferentes cantidades en diferentes almacenes
   - La importación actualiza solo el almacén seleccionado

3. **Categorías:**
   - Las categorías se crean automáticamente si no existen
   - No se pueden duplicar nombres de categorías
   - Se pueden administrar desde Configuración → Categorías

4. **Performance:**
   - Para archivos > 1000 filas, la importación puede tardar
   - El sistema procesa en lotes de 100 filas
   - No cierres la pestaña hasta ver la confirmación

---

## 📞 Soporte

Para problemas o sugerencias:
1. Revisa los logs: `storage/logs/laravel.log`
2. Descarga la plantilla: Botón "Plantilla" en la página
3. Verifica que los datos cumplan el formato especificado
4. Contacta al administrador del sistema

---

**Última actualización:** Enero 2025
**Versión:** 1.0
