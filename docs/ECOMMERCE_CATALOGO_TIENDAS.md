# Sistema de Catálogo de Tiendas (E-commerce)

## 📋 Descripción

Sistema de e-commerce con catálogo de tiendas que permite a los clientes:
1. Ver un modal selector de almacenes tipo "punto-venta" al entrar a `/`
2. Seleccionar su tienda preferida
3. Ver productos disponibles en esa tienda específica
4. Mantener la selección en la sesión del usuario

## 🏗️ Arquitectura

### Backend (PHP/Laravel)

#### Controlador: `EcommerceController`
Ubicado en: `app/Http/Controllers/EcommerceController.php`

**Métodos principales:**

- `getPuntosVenta()` - Obtiene todos los almacenes tipo "punto-venta"
  - Endpoint: `GET /api/ecommerce/puntos-venta`
  - Retorna: Array de almacenes con campos: id, nombre_almacen, ciudad_almacen, provincia_almacen, telefono_almacen, correo_almacen

- `setAlmacenSesion(Request $request)` - Establece el almacén seleccionado en sesión
  - Endpoint: `POST /api/ecommerce/almacen/select`
  - Request: `{ "almacen_id": number }`
  - Almacena en: `session('almacen_seleccionado')`

- `getAlmacenSesion()` - Obtiene el almacén seleccionado actualmente
  - Endpoint: `GET /api/ecommerce/almacen/actual`
  - Retorna: Datos del almacén o null si no hay selección

- `getProductosAlmacen()` - Obtiene productos disponibles en el almacén seleccionado
  - Endpoint: `GET /api/ecommerce/almacen/productos`
  - Retorna: Array paginado de productos del almacén

- `index()` - Renderiza la página principal del ecommerce
  - Endpoint: `GET /`
  - Props: `{ almacenSeleccionado, hasSelection }`

### Frontend (React/TypeScript)

#### Componentes:

1. **StoreSelector.tsx**
   - Modal elegante para seleccionar tienda
   - Muestra lista de almacenes disponibles
   - Permite cambiar entre tiendas
   - Indicador visual del almacén seleccionado
   - Dark mode soportado

2. **StoreHeader.tsx**
   - Header sticky con información de la tienda
   - Botón para cambiar de tienda
   - Muestra ubicación y datos del almacén
   - Responsive design

3. **Index.tsx** (Ecommerce Page)
   - Página principal del catálogo
   - Integración con componentes selector y header
   - Grid de productos
   - Estados de carga y vacío
   - Carrito (preparado para expansión futura)

## 🔄 Flujo de Uso

```
1. Usuario accede a /
   ↓
2. Si no hay almacén en sesión:
   - Se muestra StoreSelector (modal)
3. Usuario selecciona almacén
   - Request POST a /api/ecommerce/almacen/select
   - Almacén se guarda en sesión
   - Modal se cierra
4. Se cargan productos del almacén
   - GET /api/ecommerce/almacen/productos
5. Se muestra catálogo con:
   - Header con tienda seleccionada
   - Grid de productos
   - Opción de cambiar tienda
```

## 📡 Endpoints API

### Public Endpoints (Sin autenticación)

```
GET /api/ecommerce/puntos-venta
- Obtiene lista de almacenes tipo "punto-venta"

POST /api/ecommerce/almacen/select
- Selecciona un almacén (lo guarda en sesión)
- Body: { "almacen_id": number }

GET /api/ecommerce/almacen/actual
- Obtiene almacén seleccionado actualmente

GET /api/ecommerce/almacen/productos
- Obtiene productos del almacén en sesión
- Requiere almacén en sesión
```

## 🎨 Componentes UI

- **Modal/Dialog**: Para selector de tiendas
- **Cards**: Para mostrar productos
- **Button**: Acciones principales
- **Icons**: Lucide React (MapPin, Phone, Mail, etc.)
- **Animations**: Fade in, Zoom, Transitions smooth

## 🔐 Seguridad

- Token CSRF en todas las peticiones POST
- Validación de almacén_id en backend
- Sesión del usuario como garantía
- Modelo Almacen con relación a Producto

## 📊 Base de Datos

### Tabla: almacens
```sql
- id (PK)
- nombre_almacen
- tipo_almacen (ej: "punto-venta")
- telefono_almacen
- correo_almacen
- provincia_almacen
- ciudad_almacen
- notas_almacen
- nombre_responsable
- apellido_responsable
- carnet_responsable
- telefono_responsable
```

### Relaciones
- `Almacen` hasMany `Producto` (mediante almacen_producto)
- `Almacen` belongsToMany `User`

## 🚀 Características Actuales

✅ Selector de almacenes en modal  
✅ Persistencia en sesión  
✅ Grid de productos responsivo  
✅ Dark mode soporte  
✅ Estados de carga  
✅ Header sticky con información  
✅ Cambio de tienda desde cualquier momento  

## 🔮 Próximas Características (Roadmap)

- [ ] Carrito de compras
- [ ] Carrito persistente en localStorage
- [ ] Sistema de favoritos
- [ ] Búsqueda y filtros de productos
- [ ] Categorías de productos
- [ ] Reseñas y calificaciones
- [ ] Historial de compras
- [ ] Integración de pagos
- [ ] Notificaciones
- [ ] Mobile app

## 🛠️ Desarrollo

### Agregar nuevo producto al catálogo:

1. Asegúrate de que el producto esté relacionado al almacén
2. El producto debe tener `activo = true`
3. La imagen debe estar en el campo `imagen_producto`

### Personalizar el selector de tiendas:

Edita `resources/js/Components/Ecommerce/StoreSelector.tsx` para cambiar:
- Estilos
- Campos mostrados
- Animaciones
- Filtros

### Extender el catálogo:

En `resources/js/Pages/Ecommerce/Index.tsx` puedes agregar:
- Filtros de productos
- Búsqueda
- Ordenamiento
- Paginación

## 📝 Notas

- La sesión se limpia cuando el usuario se desconecta
- El selector siempre está disponible desde el header
- Los productos se cargan bajo demanda (sin precarga)
- Compatible con localStorage para análisis de comportamiento
