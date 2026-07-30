# 📊 Contexto Completo del Proyecto: `almacen.tienda`

> **Generado**: 30 de Julio de 2026  
> **Sistema**: Almacén Tienda - ERP & POS Multi-Almacén / Multi-Divisa

---

## 1. 📌 Propósito y Visión General

**`almacen.tienda`** es un sistema ERP de gestión empresarial integral de **Inventario, Punto de Venta (POS), Finanzas Multi-Divisa, Compras y Logística de Mensajería**, diseñado para empresas que operan en entornos multi-almacén y multi-moneda (con soporte optimizado para tasas de cambio fluctuantes como USD, CUP, MLC, EUR, etc.).

Además de la gestión administrativa interna, el proyecto cuenta con:
1. **API Pública para Comercio Electrónico**: Exposición de catálogo de productos por almacén con documentación OpenAPI/Swagger integrada.
2. **Integración con Telegram Bot**: Permite vincular cuentas de usuario, recibir alertas inmediatas (bajo stock, solicitudes de ventas especiales) y ejecutar aprobaciones administrativas directamente mediante Webhooks.

---

## 🛠️ 2. Stack Tecnológico

### Backend
* **Framework**: [Laravel 12.x](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/composer.json#L16) (PHP 8.2+)
* **Autenticación & Permisos**: Laravel Sanctum, Spatie Permission (Roles & Permissions RBAC).
* **Base de Datos**: MySQL / MariaDB (con 94+ migraciones con restricciones de integridad y tracking de saldos).
* **Integraciones y Herramientas**:
  * `irazasyed/telegram-bot-sdk`: Bot de Telegram y Webhooks.
  * `maatwebsite/excel`: Exportaciones e importaciones masivas a Excel.
  * `barryvdh/laravel-dompdf`: Generación de facturas y reportes en PDF.
  * `milon/barcode`: Generación de códigos de barras (EAN13, Code128, etc.).
  * `pestphp/pest`: Testing automatizado.

### Frontend
* **Framework UI**: [React 19](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/package.json#L69) + TypeScript + [Inertia.js 2.0](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/package.json#L29) (Single-Page App basada en renderizado impulsado desde el backend).
* **Estilos & Componentes UI**: Tailwind CSS v4, Radix UI Primitives, Lucide Icons.
* **Visualización & Animación**: Recharts (gráficos interactivos), Framer Motion / Motion, Sonner (notificaciones toast).
* **Bundler & Tooling**: Vite 7.x, ESLint 9, Prettier.

---

## 🏛️ 3. Módulos de Negocio y Dominio de Datos

### 📦 1. Gestión de Inventario Multi-Almacén
* **Catálogo de Productos**: [Producto.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/Producto.php) soporta atributos como color, categorías, códigos de barras múltiples ([ProductoCodigo.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/ProductoCodigo.php)), precios de costo y venta.
* **Control por Almacén**: [AlmacenProducto.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/AlmacenProducto.php) gestiona existencias locales, stock mínimo/máximo y **cantidad en tránsito**.
* **Transferencias y Movimientos**: [MovimientosController.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Http/Controllers/MovimientosController.php) y [Movimiento.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/Movimiento.php) registran traslados de mercancía entre almacenes con estados (Pendiente, En Tránsito, Recibido, Rechazado).
* **Auditoría e Historial**: Registro de cambios de costo ([HistorialPrecioCosto.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/HistorialPrecioCosto.php)) y movimientos de stock ([HistorialStock.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/HistorialStock.php)).

### 🛒 2. Punto de Venta (POS) y Ventas
* **Controlador Principal**: [VentaController.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Http/Controllers/VentaController.php) (~98 KB de lógica de negocio).
* **Cobro Multi-Divisa**: Un cliente puede pagar una sola venta combinando distintas monedas/métodos (ej. parte en efectivo CUP, parte en transferencia USD) vía [PagoVenta.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/PagoVenta.php).
* **Ventas Especiales & Aprobaciones**: Si un vendedor intenta aplicar un precio inferior al base o condiciones especiales, la venta entra en estado de aprobación administrativa (notificable vía Telegram/Web).
* **Comisiones y Roles de Venta**: Soporta comisiones para vendedores ([ProductoVendedor.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/ProductoVendedor.php)) y gestores de venta.
* **Servicio de Mensajería / Entregas a Domicilio**: Registro de destinatarios ([DestinatarioVenta.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/DestinatarioVenta.php)) y asignación de mensajeros con cálculo de tarifas de envío e impacto en caja.
* **Reversión y Anulación**: La anulación de ventas revierte atómicamente el inventario deducido y reintegra los saldos en las cuentas financieras impactadas.

### 💰 3. Módulo Financiero y Multi-Moneda
* **Monedas y Tasas**: Soporte para múltiples divisas ([Moneda.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/Moneda.php)) con registro de tasas oficiales y paralelas ([TasaCambio.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/TasaCambio.php), [TasaCambioMLC.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/TasaCambioMLC.php)) e historial ([HistorialTasaCambio.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/HistorialTasaCambio.php)).
* **Cuentas Financieras**: Cuentas asociadas a divisas específicas ([Cuenta.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/Cuenta.php)), clasificadas por titulares (Bancos, Efectivo, Mensajeros, Gestores).
* **Movimientos y Remesas**: Registro de ingresos, gastos, transferencias entre cuentas y remesas vía [MovimientoFinanciero.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/MovimientoFinanciero.php) con trazabilidad de balance antes y después de cada transacción.
* **Análisis de Diferencia Cambiaria**: Cálculo automático de ganancias/pérdidas cambiarias sobre ventas y transacciones.

### 🚚 4. Gestión de Compras y Distribución de Costos (Landed Costs)
* **Proveedores y Compras**: Gestión de catálogo de proveedores ([Proveedor.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/Proveedor.php)) y recepción de órdenes de compra ([Compra.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/Compra.php)).
* **Distribución de Costos Adicionales**: Módulo [CostDistribution.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/CostDistribution.php) para prorratear gastos asociados a compras (aranceles, flete, importación) sobre los productos recibidos, actualizando con precisión el costo real landed unitario.

### 💵 5. Arqueos y Cierres de Caja
* **Controlador Principal**: [CierreCajaController.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Http/Controllers/CierreCajaController.php) (~94 KB).
* **Arqueos de Caja Diarios**: Registro de aperturas, ventas del turno, pagos en efectivo/transferencia por moneda, retiros/descuadres, comisiones de gestores y snapshots de cobros de mensajeros.
* **Aprobación de Cierres**: El administrador revisa y aprueba los cierres conciliando descuadres e integrándolos con la contabilidad global.

### 👥 6. Usuarios, Roles y Asignación de Almacenes
* **Roles Spatie**: `Admin`, `Moderator`, `Vendor`.
* **Restricción de Acceso**: Un usuario de tipo `Vendor` o `Moderator` se asocia a almacenes específicos ([UserAlmacen.php](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Models/UserAlmacen.php)) y a cuentas financieras autorizadas ([UserCuenta](file:///mnt/datos/APP_CREATED/PHP/almacen.tienda/database/migrations/2025_11_03_215300_create_user_cuentas_table.php)), limitando lo que puede operar y consultar.

---

## 📁 4. Organización del Proyecto

```
almacen.tienda/
├── app/
│   ├── Http/Controllers/       # 27+ Controladores (Venta, CierreCaja, Producto, Admin, etc.)
│   │   ├── Api/                # CatalogoPublicoController (API para e-commerce)
│   │   ├── Auth/               # Autenticación Laravel Breeze / Fortify
│   │   └── Settings/           # Configuración de perfil y usuario
│   ├── Models/                 # 37 Modelos Eloquent (Venta, Producto, Almacen, Moneda, etc.)
│   ├── Services/               # DashboardStatsService, NotificationService
│   ├── Exports/ & Imports/     # Clases Maatwebsite Excel
│   └── Notifications/          # Notificaciones Web & Telegram
├── database/
│   ├── migrations/             # 94+ Migraciones con evolución histórica del esquema
│   └── seeders/                # Seeders de inicialización (Roles, Monedas, Admin, etc.)
├── docs/
│   └── context-antigravity/    # Documentación completa de contexto
│       └── contexto_completo.md
├── resources/js/
│   ├── pages/                  # Vistas Inertia.js (React) organizadas por dominio:
│   │   ├── Productos/          # Gestión de catálogo, códigos y costos
│   │   ├── Comprar/            # Punto de Venta (POS) e interfaz de facturación
│   │   ├── Cierres/            # Formulario de arqueo y lista de cierres de caja
│   │   ├── Almacenes/          # Gestión de almacenes y transferencias
│   │   ├── Cuentas/            # Control de saldos y movimientos financieros
│   │   ├── Dashboard/          # Gráficos de ventas, comparativas y alertas
│   │   └── Ecommerce/          # Vistas públicas o de integración de tienda online
│   ├── components/             # Componentes UI (Radix, Modales, Form-inputs, Tabla tanstack)
│   └── layouts/                # Layouts principal (Sidebar, Header, Notificaciones)
├── routes/                     # Rutas divididas modularmente:
│   ├── web.php                 # Entradas principales y middleware auth
│   ├── crud/                   # Rutas de catálogos (productos, categorías, almacenes, etc.)
│   ├── acciones/               # Rutas de flujo (compras, transacciones, remesas, reportes)
│   ├── shop/                   # Rutas de Punto de Venta (POS)
│   └── api.php                 # Endpoints públicos (/api/tienda/...)
```

---

## 🔄 5. Flujos de Trabajo Destacados

1. **Flujo de Venta en Punto de Venta (POS)**:
   $$\text{Búsqueda Producto (Barcode/Nombre)} \rightarrow \text{Selección Almacén} \rightarrow \text{Desglose Multi-Pago (USD/CUP/MLC)} \rightarrow \text{Deducción Stock Local} \rightarrow \text{Registro Ganancia Cambiaria}$$

2. **Flujo de Arqueo y Cierre de Caja**:
   $$\text{Apertura Turno} \rightarrow \text{Operaciones del Día} \rightarrow \text{Arqueo Efectivo/Digital} \rightarrow \text{Generación Snapshot Mensajeros/Gestores} \rightarrow \text{Envío a Aprobación Admin}$$

3. **Flujo de Distribución de Costos de Importación**:
   $$\text{Registro Orden de Compra} \rightarrow \text{Asignación Gastos Adicionales (Flete/Arancel)} \rightarrow \text{Prorrateo Costo landed} \rightarrow \text{Actualización Historial Costos}$$

4. **Flujo de Notificaciones y Telegram**:
   $$\text{Evento Sistema (Ej: Solicitud Venta Especial / Bajo Stock)} \rightarrow \text{NotificationService} \rightarrow \text{Telegram Webhook (Bot)} \rightarrow \text{Respuesta / Aprobación por Botón Callback}$$
