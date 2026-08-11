# Documentación — almacen.tienda

> **ERP multi-almacén** · POS · Logística · Finanzas multi-moneda (USD/CUP/MLC)
> Laravel 12 · React 19 · Inertia v2 · Tailwind v4 · TypeScript 5.9

---

## Session Checkpoint

| Campo | Valor |
|---|---|---|
| Rama activa | `feature/desarrollo-caliente` |
| Última sesión | 2026-08-10 — **Compras: formulario de alta perfeccionado + 3 bugs de UX + migración de `compra_producto`**. Autocompletado de productos existentes (stock/costo por almacén antes de sobreescribir), formulario reorganizado en 3 grupos visuales, tabla del carrito rediseñada, y `compra_producto` pasó a `id` autoincremental (ya no fusiona líneas del mismo producto en una compra). 3 bugs de UX arreglados: Combobox roto por mouse en "Editar Producto", clientes desincronizados entre selectores, errores de validación solo visibles en el índice 0 del carrito. Nuevo patrón documentado: `docs/patron-dialog-formulario-grande.md`. Suite completa: 140/140. Pendiente, pausado a propósito: reemplazar el paso de pago por `PaymentForm`/`PaymentList` (patrón ya usado en Ventas). Detalle completo en `ESTADO_DESARROLLO.md` (historial 2026-08-10). |
| Estado general | 12/12 módulos base estables. Compras: formulario de alta y carrito pulidos, 3 bugs de UX cerrados, 1 pendiente grande (paso de pago) pausado por decisión explícita del cliente. Módulo Reportes sin cambios desde el 2026-08-06 (Rastreo de Operaciones Fases 0-3,5,7-9 cerradas; quedan Fase 4/6 baja prioridad; los otros 14 reportes sin tocar). Suite de tests: 140 tests, 140 passed (0 fallos — el intermitente de Faker de la sesión anterior no se repitió) |
| Próximo paso | El usuario decide: retomar Compras (paso de pago `PaymentForm`/`PaymentList`, o los items de integridad de datos parqueados — sin control de rol en `CompraController`, costo sin auditoría, rutas muertas), seguir con alguno de los 14 reportes pendientes, o arrancar la actualización de la suite de tests. Ver "🎯 Lista de tareas priorizada" abajo para el resto del backlog histórico (Cuentas `ajustarSaldo`, Combobox en `Vendor/Index.tsx`, doble reversión de stock en `anularVenta`) |

### ✅ Bugs resueltos recientemente

| ID | Método | Descripción | Estado |
|---|---|---|---|
| **B1** | `guardarDistribucion` | Devuelve `saldo_disponible` desde `saldo_cuenta` correctamente | ✅ Resuelto |
| **B2** | `aprobarVenta` | Guardia XOR `&& !$venta->es_venta_gestor` implementada | ✅ Resuelto |
| **B3** | `procesarVenta` | `foreach ($validatedData['pagos'] ?? []` con null coalescing | ✅ Resuelto |
| **B6** | `MovimientosController::rechazar()` | Duplicaba stock fantasma al rechazar un movimiento en tránsito | ✅ Resuelto (2026-07-31) |
| **B7** | Migraciones enum `estado` (movimientos) | Gateadas solo a MySQL — rotas en SQLite (default del quickstart) | ✅ Resuelto (2026-07-31) |
| **B8** | `TransferenciaController::store()` | Vendedor podía transferir a cuenta de otro vendedor (check sin filtrar por usuario) | ✅ Resuelto (2026-07-31) |
| **B9** | `CuentaController::obtenerHistorialVentas()` | `mergeBindings()` + `->where()` sobre subquery UNION cruda corrompía el orden de bindings — el filtro por tipo devolvía filas de otro tipo | ✅ Resuelto (2026-08-01) |

### 🐛 Bugs activos pendientes

| ID | Método | Descripción | Archivo |
|---|---|---|---|
| **B4** | `AlmacenController@edit` | Selector cuenta mensajero mezcla USD/CUP/MLC → puede romper lógica | `AlmacenController` |
| **B5** | Config mensajero | Está en `Almacenes/Edit`, debería estar en `Empleados/Edit` | UX |

### Features pendientes

| ID | Descripción | Prioridad |
|---|---|---|
| **F1** | Selector XOR visual `[PV] / [Gestor]` en panel de distribución | Alta |
| **F2** | Display mensajero multi-moneda completo (soporte cualquier moneda, no solo USD/CUP) | Media |
| **F3** | Mover config cuenta mensajero de `Almacenes/Edit` a `Empleados/Edit` | Media |
| **F4** | `ganancia_real_total` muestra 0 en algunos casos — separar cálculo correctamente | Media |
| **F5** | Selector de paginación (10/15/25/50/100) en listado de productos | Baja |
| ~~**F6**~~ | ~~Herramienta de detección y fusión de productos duplicados con promedio de precios~~ | ~~Alta~~ ✅ 2026-07-25 |

---

## Snapshot del proyecto

| Métrica | Valor |
|---|---|---|
| Backend | PHP 8.2+, Laravel 12 |
| Frontend | React 19, Inertia v2, Vite 7, Tailwind v4 |
| Modelos | 37 |
| Controladores | 39 (27 raíz incl. `Controller.php` base + 12 en subdirectorios: 1 Api, 8 Auth, 2 Settings, 1 Reportes — `Reportes\RastreoOperacionesController`, primero de una extracción incremental fuera de `ReporteController`) |
| Migraciones | 99 |
| Páginas frontend | 118 únicas (17 reportes, 9 auth/settings, ~92 operacionales) |
| Middlewares | 7 (solo 3 aplicados a rutas reales: `HandleInertiaRequests`, `HandleAppearance`, `check.cuenta.permission`; `EnsureUserIsAdmin/Moderator/Vendor` registradas como alias pero sin uso, `CheckAlmacenPermission` ni registrada) |
| Notificaciones | 7 (5 encoladas: Cambio, CierreCaja, MovimientoStock, VentaCreada, MovimientoFinanciero) |
| Comandos artisan | 5 |
| Servicios | 2 (`DashboardStatsService` — 8+ métodos públicos/privados para resúmenes, `NotificationService`) |
| Exports/Imports Excel | 3 exports, 2 imports |
| Roles | `admin` / `moderador` / `vendedor` |
| Monedas | USD (base), CUP, MLC |
| Paquetes clave | `spatie/laravel-permission`, `inertiajs/inertia-laravel`, `irazasyed/telegram-bot-sdk`, `maatwebsite/excel`, `milon/barcode`, `barryvdh/laravel-dompdf` |

---

## Lectura obligatoria antes de tocar código

| Documento | Por qué leerlo |
|---|---|
| [context.md](context.md) | Contexto completo: dominio, entidades, roles, lógica de negocio |
| [ESTADO_DESARROLLO.md](ESTADO_DESARROLLO.md) | Qué está hecho, qué bugs existen, qué falta — **actualizar siempre** |
| [guia-desarrollo.md](guia-desarrollo.md) | Cómo levantar el proyecto, comandos, entorno |

---

## Por módulo

### Ventas y POS
| Documento | Contenido |
|---|---|
| [ventas/flujos-venta.md](ventas/flujos-venta.md) | Flujos completos: normal, especial, gestor, mensajero |
| [ventas/contexto-actual.md](ventas/contexto-actual.md) | Estado actual del código de ventas, métodos del controlador, campos clave |
| [flujos-financieros-comision-mensajero.md](flujos-financieros-comision-mensajero.md) | Cómo funcionan los flujos financieros paralelos (comisión, mensajero, gestor) |
| [comision-vendedor-gestor-2026-05-25.md](comision-vendedor-gestor-2026-05-25.md) | Implementación del tracking de comisiones — fórmulas y cambios |

### Cierre de Caja
| Documento | Contenido |
|---|---|
| [ventas/pendiente-cierre-caja.md](ventas/pendiente-cierre-caja.md) | Estado actual del cierre, problemas resueltos, features añadidos |
| [comparativa-cierres.md](comparativa-cierres.md) | Explicación de la sección de comparativa con cierre anterior |
| [PLAN_Actualizar_Show_Cierres.md](PLAN_Actualizar_Show_Cierres.md) | Plan original para actualizar la vista Show del cierre |

### Mensajero
| Documento | Contenido |
|---|---|
| [pendiente-arreglar-mensajero.md](pendiente-arreglar-mensajero.md) | Ajustes pendientes del flujo de mensajero |

### Bot de Telegram
| Documento | Contenido |
|---|---|
| [TELEGRAM_BOT_PLAN.md](TELEGRAM_BOT_PLAN.md) | Plan completo de implementación con código, paso a paso |

### Base de Datos
| Documento | Contenido |
|---|---|---|
| [base-de-datos.md](base-de-datos.md) | Tablas principales, campos clave y relaciones |
| [backup/](./backup/) | Backups: local (`backup_20260725_*`) y dump remoto importado (`u706356131_gestion.sql`) |

### Logística
| Documento | Contenido |
|---|---|
| [context.md](context.md) | Sección `Página de Logística` y `DashboardStatsService` con detalle de cada método y cards |

### Productos
| Documento | Contenido |
|---|---|
| [codebar-ventas-y-fixes-2026-05-21.md](codebar-ventas-y-fixes-2026-05-21.md) | Sistema de códigos de barras y fixes de ventas |
| [plantilla-importar-productos.md](plantilla-importar-productos.md) | Cómo funciona la importación masiva de productos |
| [precios-vendedor-export-import.md](precios-vendedor-export-import.md) | Export/import de precios por vendedor vía Excel |

### Arquitectura y API
| Documento | Contenido |
|---|---|
| [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md) | Diagrama de arquitectura del sistema |
| [API_PUBLIC_CATALOG.md](API_PUBLIC_CATALOG.md) | Endpoints de la API pública de catálogo (sin auth) |
| [TECHNICAL_ANALYSIS.md](TECHNICAL_ANALYSIS.md) | Análisis técnico del stack y patrones |

### Usuarios y Settings
| Documento | Contenido |
|---|---|
| [guia-desarrollo.md](guia-desarrollo.md) | Perfil, contraseña, apariencia, vinculación Telegram |
| [context.md](context.md) | Sección `Usuarios` con roles y asignación de almacenes/cuentas |

### Remesas
| Documento | Contenido |
|---|---|
| [context.md](context.md) | N/A — página básica `/remesas` |

### Otros
| Documento | Contenido |
|---|---|
| [cambios-cliente-proveedor.md](cambios-cliente-proveedor.md) | Cambios en el módulo de clientes/proveedores |
| [newforsale.md](newforsale.md) | Nuevas features para ventas |
| [arreglos-pendientes/Propuesta-CierreCaja.md](arreglos-pendientes/Propuesta-CierreCaja.md) | Propuesta original que originó los cambios de Cierre de Caja del 2026-07-30 |
| [sections/](./sections/) | Notas de sesión sueltas (`session-ses_*.md`, `analisisTasa.md`) — no indexadas individualmente, consultar solo si se busca contexto histórico puntual |
| [code/](./code/) | Snippets/notas técnicas puntuales: `export-pdf.md`, `report-pdf.md`, `vendor.md` |
| [context-antigravity/contexto_completo.md](context-antigravity/contexto_completo.md) | Contexto generado para otra herramienta (Antigravity) — puede estar desalineado con `context.md`, usar `context.md` como fuente principal |

---

## Convenciones del proyecto

- **Nombres en español**: modelos, columnas, rutas, vistas, variables.
- **Roles**: `admin` > `moderador` > `vendedor` — filtrar siempre con `in_array($user->role, [...])`.
- **Transacciones DB**: toda operación crítica usa `DB::beginTransaction()` con rollback.
- **Stock al crear**: el stock se descuenta al *crear* la venta (reserva), no al aprobar.
- **Financiero al aprobar**: saldos de cuentas y deudas de clientes solo se mueven al aprobar.
- **Mensajero es pass-through**: nunca incluir en cálculos de comisión ni cambiarios.
- **XOR comisión**: gestor Y vendedor son mutuamente excluyentes por venta.

---

## Comandos rápidos

```bash
php artisan migrate              # aplicar migraciones
php artisan migrate:status       # ver estado de cada migración
php artisan test                 # ejecutar tests (Pest)
php artisan route:list           # listar todas las rutas
php artisan config:clear         # limpiar caché de configuración
php artisan cache:clear          # limpiar caché de aplicación
composer dump-autoload           # regenerar autoload después de crear clase

npm run dev                      # frontend con hot reload (Vite)
npm run build                    # build de producción
npm run types                    # validar tipos TypeScript
npm run lint                     # corregir estilo de código
npm run format                   # formatear código con Prettier
```

---

## Archivos clave por módulo

| Módulo | Controlador | Modelos | Páginas frontend |
|---|---|---|---|
| **Ventas POS** | `app/Http/Controllers/VentaController.php` (2053 L) | `Venta`, `VentaDetalle`, `PagoVenta`, `DestinatarioVenta` | `Vendor/Index`, `Vendor/Show`, `Vendor/Listado` |
| **Cierres** | `CierreCajaController.php` (~1943 L) | `CierreCaja` | `Cierres/Index`, `Cierres/Create`, `Cierres/Show` |
| **Compras** | `CompraController.php` (791 L) | `Compra`, `CompraProducto`, `CompraPago` | `Comprar/Index`, `Comprar/Show` |
| **Productos** | `ProductoController.php` (807 L) | `Producto`, `ProductoCodigo`, `Categoria` | `Productos/Index`, `Productos/Show`, `Productos/Edit` |
| **Precios vendedor** | `ProductoVendedorController.php` (421 L) | `ProductoVendedor`, `PrecioHistorial` | `Productos/Vendor/*` (4 páginas) |
| **Movimientos stock** | `MovimientosController.php` (584 L) | `Movimiento`, `MovimientoDetalle`, `MovimientoSeguimiento` | `Movimientos/Index`, `Movimientos/Show` |
| **Finanzas** | `TransaccionController.php`, `GastoController.php`, `IngresoController.php`, `TransferenciaController.php` | `MovimientoFinanciero`, `Cuenta`, `Moneda`, `TransaccionCuenta` | `Transacciones/*` (7+ páginas) |
| **Reportes** | `ReporteController.php` (728 L, 14 de 15 reportes) + `Reportes/RastreoOperacionesController.php` (623 L, 1er reporte extraído) | — | `Reportes/Report/*` (16 vistas) + `Reportes/Index.tsx` (menú) |
| **Telegram Bot** | `TelegramWebhookController.php` (497 L) | — | `routes/api.php` (webhook) |
| **Dashboard** | `AdminController.php` (545 L) | `TasaCambio`, `TasaCambioMLC`, `HistorialTasaCambio` | `dashboard.tsx` |
| **Logística** | `LogisticaController.php` (25 L) | — (usa `DashboardStatsService`) | `Logistica/*` (Index, Create, Edit, Show, +layouts) |
| **Transacciones** | `TransaccionController.php`, `GastoController.php`, `IngresoController.php`, `TransferenciaController.php` | `MovimientoFinanciero`, `TransaccionCuenta` | `Transacciones/*` (7+ páginas) |
| **Usuarios** | `UserController.php`, `UserAlmacenController.php` | `User`, `UserAlmacen` | `Empleados/*` (4 páginas) |

---

## Al iniciar una nueva sesión

1. Leer este `INDEX.md` (sesión checkpoint + snapshot)
2. Leer `ESTADO_DESARROLLO.md` (bugs y features actualizados)
3. Leer `context.md` si se necesita contexto general
4. Continuar desde el **Próximo paso** en Session Checkpoint
5. Al terminar, actualizar **Session Checkpoint** y `ESTADO_DESARROLLO.md`
