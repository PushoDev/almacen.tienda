# 🧪 Guía de Prueba - Sistema de Catálogo de Tiendas

## ✅ Pre-requisitos

1. Asegúrate de que existan almacenes con `tipo_almacen = 'punto-venta'` en tu BD
2. Estos almacenes deben tener productos relacionados en `almacen_producto`
3. Los productos deben tener `activo = true`

## 🚀 Pasos de Prueba

### 1. Prueba la ruta principal
```
Accede a: http://tu-app.local/
Resultado esperado: 
- Se muestra el modal "Selecciona tu Tienda"
- Aparece lista de almacenes tipo punto-venta
```

### 2. Prueba el selector de tiendas
```
Acción: Haz clic en una tienda
Resultado esperado:
- Modal se cierra suavemente
- Aparece header con tienda seleccionada
- Se cargan productos de esa tienda
- Grid muestra productos disponibles
```

### 3. Prueba cambio de tienda
```
Acción: Haz clic en botón "Cambiar" en el header
Resultado esperado:
- Se abre nuevamente el modal
- Anterior tienda aparece seleccionada
- Puedes elegir otra tienda
- Productos se actualizan
```

### 4. Prueba persistencia en sesión
```
Acción: 
- Selecciona una tienda
- Recarga la página (F5)
- Ve a otra ruta y regresa a /
Resultado esperado:
- La tienda seleccionada se mantiene
- Productos cargan correctamente
- No se pide seleccionar tienda nuevamente
```

### 5. Prueba endpoints API directamente
```
// Obtener puntos de venta
GET http://tu-app.local/api/ecommerce/puntos-venta

// Seleccionar almacén
POST http://tu-app.local/api/ecommerce/almacen/select
Body: { "almacen_id": 1 }

// Obtener almacén actual
GET http://tu-app.local/api/ecommerce/almacen/actual

// Obtener productos del almacén
GET http://tu-app.local/api/ecommerce/almacen/productos
```

## 🎯 Casos de Uso

### Caso 1: Cliente nuevo
```
1. Accede a /
2. Ve el modal con tiendas
3. Selecciona su tienda
4. Ve productos disponibles
5. (Próximamente) Agrega al carrito
```

### Caso 2: Cliente que regresa
```
1. Accede a /
2. Su tienda anterior está seleccionada
3. Puede ver productos inmediatamente
4. O cambiar a otra tienda
```

### Caso 3: Sin tiendas disponibles
```
1. Si no hay almacenes tipo "punto-venta"
2. Modal muestra: "No hay tiendas disponibles"
3. Se sugiere volver más tarde
```

## 📱 Prueba Responsive

Verifica en diferentes tamaños:
- Mobile (375px)
- Tablet (768px)
- Desktop (1920px)

## 🌙 Prueba Dark Mode

1. Abre DevTools (F12)
2. Busca: `html class="dark"`
3. Verifica que los colores cambien correctamente
4. Modal debe verse bien en ambos temas

## 🔍 Debug

### Si el modal no aparece:
```
Abre la consola del navegador (F12)
Verifica que no haya errores JavaScript
Comprueba que /api/ecommerce/puntos-venta retorna datos
```

### Si los productos no cargan:
```
- Verifica que almacen esté en sesión
- Comprueba que hay productos en almacen_producto
- Revisa que activo = 1 en productos
```

### Si la sesión no persiste:
```
- Verifica cookies están habilitadas
- Comprueba que SESSION_DRIVER en .env = database
- Limpia tabla sessions si es necesario
```

## 📊 Tabla de Prueba

| Caso | Acción | Resultado Esperado | Estado |
|------|--------|------------------|--------|
| Modal abre | Accede a / | Modal visible | ✅ |
| Lista tiendas | API /puntos-venta | Array con tiendas | ✅ |
| Selecciona tienda | POST /almacen/select | Guarda en sesión | ✅ |
| Cierra modal | Selecciona tienda | Animación suave | ✅ |
| Carga productos | POST exitoso | Grid de productos | ✅ |
| Cambiar tienda | Click "Cambiar" | Modal abre nuevo | ✅ |
| Persistencia | Recarga página | Tienda se mantiene | ✅ |
| Dark mode | Toggle tema | Estilos actualizan | ✅ |

## 🎨 Elementos a Verificar

- [ ] Modal aparece centered
- [ ] Cards de tiendas son clickeables
- [ ] Íconos se muestran correctamente
- [ ] Grid de productos es responsive
- [ ] Precios se muestran correctamente
- [ ] Botones tienen hover effect
- [ ] Animaciones son smooth
- [ ] No hay console errors
- [ ] Token CSRF funciona
- [ ] Dark mode funciona

## 🔄 Flujo Completo de Test

1. Limpia sesión: `session()->flush()`
2. Accede a `/`
3. Verifica modal
4. Selecciona tienda
5. Verifica productos
6. Cambia tienda
7. Verifica nuevos productos
8. Recarga página
9. Verifica persistencia
10. Abre DevTools
11. Verifica sin errores

## ✨ Notas

- Si productos no tienen imagen, se muestra ícono placeholder
- Los precios vienen de `precio_venta_actualizado`
- El grid es de 4 columnas en desktop, 2 en tablet, 1 en mobile
- Modal tiene backdrop blur para mejor UX
