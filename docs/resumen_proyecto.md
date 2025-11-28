# Resumen del Proyecto: almacen.tienda

## Descripción General

**almacen.tienda** es un sistema de gestión de inventario desarrollado con Laravel y React, que permite gestionar productos, almacenes, ventas y compras en múltiples monedas. Es una aplicación web moderna que soporta múltiples almacenes y puntos de venta, con funcionalidades de importación/exportación de productos, manejo financiero y reportes detallados.

## Arquitectura del Proyecto

### Backend (Laravel)
- **Framework**: Laravel 12.x (PHP 8.2+)
- **Patrón de Arquitectura**: MVC con controladores RESTful
- **Autenticación**: Laravel Breeze con soporte para autenticación, registro y verificación de email
- **ORM**: Eloquent para manejo de datos y relaciones
- **API**: Controladores que retornan vistas Inertia.js

### Frontend (React)
- **Framework**: React 18+ con TypeScript
- **Framework SSR**: Inertia.js para integración con Laravel
- **Estado**: Manejo con hooks de React y props de Inertia
- **Estilos**: Tailwind CSS con componentes Radix UI
- **Rutas**: Sistema de rutas de Laravel que se integra con React

## Estructura de Directorios

```
almacen.tienda/
├── app/                    # Código de la aplicación Laravel
│   ├── Http/Controllers/  # Controladores MVC
│   ├── Models/            # Modelos Eloquent
│   └── ...
├── database/              # Migraciones, semillas, factories
│   └── migrations/        # Migraciones de base de datos
├── resources/             # Assets frontend
│   └── js/pages/          # Componentes React por página
├── routes/                # Archivos de rutas de Laravel
└── docs/                  # Documentación
```

## Componentes Clave

### 1. Base de Datos (Migraciones)

La estructura de base de datos incluye las siguientes entidades principales:

- **Usuarios (users)**: Gestión de autenticación y roles
- **Almacenes (almacens)**: Soporte para múltiples almacenes, puntos de venta y transporte
- **Productos (productos)**: Información de productos con imágenes, códigos de barras y categorías
- **Categorías (categorias)**: Clasificación de productos
- **Proveedores (proveedors)**: Gestión de proveedores
- **Clientes (clientes)**: Gestión de clientes
- **Compras (compras)**: Registro de compras a proveedores
- **Ventas (ventas)**: Registro de ventas a clientes
- **Inventario (almacen_producto)**: Stock por producto y almacén
- **Monedas (monedas)**: Soporte para múltiples monedas con tasas de cambio
- **Cuentas (cuentas)**: Gestión financiera
- **Movimientos (movimientos)**: Transacciones de inventario

### 2. Lógica de Negocio (Controladores)

#### Controladores Principales:
- **ProductoController**: Gestión de productos con funcionalidades de importación/exportación
- **VentaController**: Gestión de ventas, incluyendo cálculo de ganancias en múltiples monedas
- **CompraController**: Gestión de compras a proveedores
- **AlmacenController**: Gestión de múltiples almacenes
- **TransaccionController**: Distribución manual de costos y otras transacciones financieras
- **ReporteController**: Generación de reportes financieros e inventarios

#### Características Importantes:
- **Soporte Multi-moneda**: Integración de tasas de cambio y conversión automática
- **Importación/Exportación**: Funcionalidades para manejar grandes volúmenes de productos mediante archivos Excel
- **Seguimiento de Inventario**: Sistema de historial de stock y movimientos
- **Ganancias Cambiarias**: Cálculo automático de ganancias/pérdidas por fluctuaciones monetarias

### 3. Modelos (Eloquent)

#### Modelos Principales:
- **Producto**: Con relaciones a categorías, almacenes y precios históricos
- **Almacen**: Soporte para diferentes tipos (almacén, punto de venta, transporte)
- **Venta**: Con detalles de venta, pagos y cálculos de ganancia
- **Compra**: Con productos comprados y pagos
- **Moneda**: Gestión de tasas de cambio y conversión
- **Usuario**: Con capacidades de acceso a múltiples almacenes

### 4. Interfaz de Usuario (React)

#### Componentes Principales:
- **Dashboard**: Panel de control con métricas clave
- **Productos**: CRUD completo con importación/exportación
- **Ventas**: Sistema de punto de venta con soporte multi-moneda
- **Compras**: Gestión de compras a proveedores
- **Almacenes**: Gestión de múltiples almacenes
- **Reportes**: Informes detallados sobre inventario, ventas y finanzas
- **Configuración**: Perfil de usuario, contraseña, apariencia

#### Características del UI:
- **Diseño Responsivo**: Compatible con móviles, tablets y escritorio
- **Componentes Modernos**: Uso de Radix UI con Tailwind CSS
- **Experiencia de Usuario Rica**: Interacciones sin recargas de página gracias a Inertia.js
- **Soporte para Dark Mode**: Alternancia entre modos claro y oscuro

## Funcionalidades Principales

### 1. Gestión de Inventarios
- Seguimiento de stock en múltiples almacenes
- Historial de movimientos de inventario
- Control de productos en tránsito
- Reporte de stock bajo

### 2. Gestión Comercial
- Ventas con soporte para múltiples monedas
- Compras a proveedores
- Gestión de clientes y proveedores
- Sistemas de pagos y cuentas por cobrar/pagar

### 3. Finanzas
- Soporte para múltiples monedas con tasas de cambio
- Cálculo automático de ganancias/pérdidas cambiarias
- Distribución de costos adicionales
- Reportes financieros detallados

### 4. Análisis y Reportes
- Reportes de inventario por almacén
- Análisis de ventas por periodo y vendedor
- Reportes de ganancias y gastos
- Estadísticas de productos más vendidos/comprados

### 5. Importación/Exportación
- Importación de productos mediante archivos Excel
- Validación de datos durante la importación
- Exportación filtrada de productos con estadísticas
- Soporte para archivos de gran volumen

## Tecnologías Utilizadas

### Backend:
- Laravel 12.x
- PHP 8.2+
- MySQL (con soporte para SQLite)
- Laravel Excel para importación/exportación
- Laravel PDF para generación de reportes

### Frontend:
- React 18+
- TypeScript
- Inertia.js
- Vite
- Tailwind CSS
- Radix UI
- Recharts para visualización de datos

## Características Técnicas

- **Arquitectura**: Basada en MVC con separación clara de capas
- **API**: Integración con Inertia.js para comunicación eficiente
- **Seguridad**: Autenticación, autorización, validación de entradas
- **Rendimiento**: Consultas optimizadas, índices en base de datos
- **Internacionalización**: Soporte para múltiples idiomas
- **Accesibilidad**: Componentes con soporte para lectores de pantalla

## Casos de Uso

El sistema es ideal para:
- Empresas con múltiples almacenes o puntos de venta
- Comercios que operan en múltiples monedas
- Empresas que necesitan control detallado de inventario
- Organizaciones que requieren reportes financieros y de inventario
- Negocios con procesos de compra y venta complejos

## Conclusión

**almacen.tienda** es una solución integral de gestión de inventario y comercio que combina las capacidades de Laravel para el backend con React para una interfaz de usuario moderna y receptiva. La arquitectura del sistema permite una gestión eficiente de inventarios, ventas y finanzas, especialmente en entornos multi-almacén y multimoneda.