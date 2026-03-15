# API Pública - Catálogo de Tienda

Esta documentación describe la API pública disponible en `GET /api/tienda/...` para consumir el catálogo de productos, almacenes y categorías desde una aplicación frontend (React, Vue, mobile, etc.).

> 📌 Esta API no requiere autenticación y está diseñada para uso público (catálogo / ecommerce simple). Usa throttling (60 solicitudes por minuto) y cache interno.

---

## 🔍 Documentación interactiva (Swagger)

La documentación automática en Swagger UI está disponible en:

- **Swagger UI:** `GET /api/tienda/docs`
- **OpenAPI (JSON):** `GET /api/tienda/docs/openapi.json`

Usa esto para explorar endpoints y ver ejemplos de request/response.

---

## 🧭 Endpoints principales

### 1) Listar almacenes (puntos de venta)

**GET** `/api/tienda/almacenes`

#### Parámetros
Ninguno.

#### Respuesta (200)
```json
[
  {
    "id": 1,
    "nombre": "Almacén Centro",
    "ciudad": "Caracas",
    "direccion": "Av. Principal #123",
    "telefono": "5491123456789",
    "whatsapp_url": "https://wa.me/5491123456789?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20los%20productos%20disponibles.",
    "slug": "almacen-centro"
  }
]
```

> ✅ Este endpoint incluye `whatsapp_url` listo para usar desde el frontend.

---

### 2) Detalle de un almacén

**GET** `/api/tienda/almacenes/{id}`

#### Parámetros de ruta
- `id` (integer) – ID del almacén.

#### Respuesta (200)
```json
{
  "id": 1,
  "nombre": "Almacén Centro",
  "ciudad": "Caracas",
  "provincia": "Distrito Capital",
  "direccion": "Av. Principal #123",
  "telefono": "5491123456789",
  "whatsapp_url": "https://wa.me/5491123456789?text=Hola%2C%20quiero%20ver%20los%20productos%20disponibles%20en%20Almac%C3%A9n%20Centro.",
  "slug": "almacen-centro"
}
```

> Si el `id` no existe, devuelve **404**.

---

### 3) Productos por almacén (paginado)

**GET** `/api/tienda/almacenes/{id}/productos`

#### Parámetros de ruta
- `id` (integer) – ID del almacén.

#### Query params (opcional)
- `q`: texto para buscar por nombre o código.
- `categoria_id`: filtra por categoría.
- `marca`: filtra por marca.
- `precio_min`: filtra precio mínimo.
- `precio_max`: filtra precio máximo.
- `etiquetas`: búsqueda por palabras clave (separadas por comas).
- `order_by`: `nombre`, `precio`, `stock`.
- `order_dir`: `asc`, `desc`.
- `per_page`: cantidad por página (default 20).

#### Respuesta (200)
```json
{
  "current_page": 1,
  "data": [
    {
      "id": 123,
      "nombre": "Producto Ejemplo",
      "slug": "producto-ejemplo",
      "precio_venta": 199.99,
      "stock": 12,
      "imagen_principal": "https://.../productos/imagen.jpg",
      "categoria": {
        "id": 7,
        "nombre": "Bebidas"
      },
      "descripcion_corta": "Descripción breve...",
      "whatsapp_url": "https://wa.me/5491123456789?text=Hola%2C%20quiero%20comprar%20el%20producto%20Producto%20Ejemplo"
    }
  ],
  "almacen": {
    "id": 1,
    "nombre": "Almacén Centro",
    "telefono": "5491123456789",
    "whatsapp_url": "https://wa.me/5491123456789?text=Hola%2C%20quiero%20comprar%20productos%20del%20almac%C3%A9n%20Almac%C3%A9n%20Centro."
  },
  "first_page_url": "...",
  "from": 1,
  "last_page": 3,
  "last_page_url": "...",
  "links": [ ... ],
  "next_page_url": "...",
  "path": "...",
  "per_page": 20,
  "prev_page_url": null,
  "to": 20,
  "total": 56
}
```

> ✅ Nota: la respuesta incluye la metadata del almacén (teléfono + whatsapp_url), que puede usarse para botones de “Comprar ahora” globales.

---

### 4) Detalle de producto

**GET** `/api/tienda/productos/{id}`

#### Parámetros de ruta
- `id` (integer) – ID del producto.

#### Respuesta (200)
```json
{
  "id": 123,
  "nombre": "Producto Ejemplo",
  "slug": "producto-ejemplo",
  "precio_venta": 199.99,
  "stock": 32,
  "imagen_principal": "https://.../productos/imagen.jpg",
  "categoria": {
    "id": 7,
    "nombre": "Bebidas"
  },
  "descripcion_corta": "Descripción breve...",
  "codigo": "ABC123"
}
```

> Si el producto no existe o está inactivo devuelve **404**.

---

### 5) Stock del producto por almacén

**GET** `/api/tienda/productos/{id}/stock`

#### Parámetros de ruta
- `id` (integer) – ID del producto.

#### Respuesta (200)
```json
[
  {
    "almacen_id": 1,
    "almacen_nombre": "Almacén Centro",
    "stock": 12
  },
  {
    "almacen_id": 2,
    "almacen_nombre": "Almacén Norte",
    "stock": 3
  }
]
```

---

### 6) Categorías

**GET** `/api/tienda/categorias`

#### Respuesta (200)
```json
[
  { "id": 7, "nombre": "LAVADORA SECADORA" },
  { "id": 9, "nombre": "REFRIGERADOR DE DOS PUERTAS" }
]
```

---

## 🧪 Ejemplos de uso con `curl`

**Obtener productos del almacén 1 (página 1)**
```bash
curl "http://localhost/api/tienda/almacenes/1/productos?per_page=20"
```

**Buscar productos con texto**
```bash
curl "http://localhost/api/tienda/productos?q=leche&order_by=precio&order_dir=asc"
```

**Abrir WhatsApp con el producto**
- Usa el campo `whatsapp_url` de la respuesta para construir un botón "Comprar ahora".

---

## 🔧 Notas para frontend

- La API admite **CORS** y usa throttling para evitar abuso (60 req/min). Si necesitas más, avísame y podemos ajustar.
- Todos los endpoints devuelven JSON.
- En caso de error de validación, se devuelve status **422** con un objeto `errors`.
- En caso de `not found` devuelve **404** con `{ "message": "..." }`.

---

## ✅ Recomendaciones de implementación (frontend)

- Usa **paginación** (`next_page_url`, `prev_page_url`) para cargar más productos.
- Usa `whatsapp_url` en botones para “Comprar ahora”, en lugar de generar la URL manualmente.
- Si necesitas mostrar catálogo por almacén, consume primero `/api/tienda/almacenes`, luego `/api/tienda/almacenes/{id}/productos`.

---

Este documento es la guía rápida para desarrollar una app frontend sobre el catálogo público. Si querés puedo generar un archivo interactivo adicional (Swagger + Postman collection) con ejemplos listos para importar.

---
Creado y desarrollado por: Luis A. Guisado - PushoDev
Portfolio: [https://pushodev.vercel.app](https://pushodev.vercel.app) | GitHub: [https://github.com/PushoDev](https://github.com/PushoDev)
