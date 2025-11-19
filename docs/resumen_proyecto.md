# Resumen del Proyecto: Almacen.Tienda

## 1. Propósito Principal

La aplicación es un sistema de Planificación de Recursos Empresariales (ERP) integral, diseñado para la gestión de inventario, ventas, compras y finanzas de un negocio minorista o mayorista. Funciona como un sistema centralizado para administrar todas las operaciones, incluyendo un catálogo de productos público y un backend seguro para la administración.

## 2. Pila Tecnológica

- **Backend:** Laravel (PHP)
- **Frontend:** React (TypeScript)
- **Arquitectura:** Aplicación monolítica con el backend y frontend acoplados a través de **Inertia.js**.
- **Estilos y UI:** Tailwind CSS, con componentes de Radix UI y Headless UI.
- **Librerías Clave:**
    - `spatie/laravel-permission`: Para la gestión de roles y permisos.
    - `maatwebsite/excel`: Para la importación y exportación de datos (ej. productos).
    - `barryvdh/laravel-dompdf`: Para la generación de reportes en PDF.

## 3. Características Principales

El esquema de la base de datos, definido por las migraciones en `database/migrations`, revela un sistema robusto con las siguientes funcionalidades:

- **Gestión de Inventario:**
    - Múltiples almacenes (`almacenes`).
    - Jerarquía de productos y categorías (`productos`, `categorias`).
    - Seguimiento de stock y transferencias entre almacenes (`movimientos`).

- **Módulo de Ventas:**
    - Gestión de ventas y clientes (`ventas`, `clientes`).
    - Procesamiento de pagos de ventas (`pago_ventas`).
    - Sistema tipo Punto de Venta (POS).

- **Módulo de Compras:**
    - Gestión de compras a proveedores (`compras`, `proveedores`).
    - Seguimiento de pagos de compras (`compra_pago`).

- **Módulo Financiero:**
    - Administración de cuentas financieras (`cuentas`).
    - Soporte para múltiples monedas y tasas de cambio (`monedas`, `tasa_cambios`).
    - Registro de transacciones (`transaccion_cuentas`).

- **Funcionalidades Avanzadas:**
    - Historial de costos y precios (`costo_historials`, `precio_historials`).
    - Sistema de distribución de costos para prorratear gastos adicionales en las compras.

## 4. Estructura del Proyecto

El proyecto sigue una organización estándar de Laravel, con algunas convenciones notables:

- **Rutas:** Las rutas web (`routes/web.php`) están modularizadas, separando la lógica del catálogo de E-commerce (`EcommerceController`), el panel de administración (`AdminController`) y los reportes (`ReporteController`). Además, las operaciones se dividen en directorios:
    - `routes/crud/`: Para la gestión básica de entidades.
    - `routes/acciones/`: Para lógica de negocio más compleja (ej. procesar una venta).
- **Frontend:** El código fuente del frontend se encuentra en `resources/js`, estructurado en componentes, páginas y layouts de React, siguiendo el patrón común en aplicaciones con Inertia.js.

Este resumen proporciona una base sólida para cualquier desarrollo futuro en el proyecto.
