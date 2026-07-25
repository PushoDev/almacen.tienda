# Documentación — almacen.tienda

> **ERP multi-almacén** · POS · Logística · Finanzas multi-moneda (USD/CUP/MLC)
> Laravel 12 · React 19 · Inertia v2 · Tailwind v4 · TypeScript 5.9

---

## Session Checkpoint

| Campo | Valor |
|---|---|
| Rama activa | `feature/bot-telegram` |
| Última sesión | 2026-07-25 — DB reemplazada con `docs/backup/u706356131_gestion.sql` |
| Estado general | 12/12 módulos estables, 5 bugs conocidos, 4 features pendientes |
| Próximo paso | Verificar funcionamiento post-import (login, listados, rutas) |

### Bugs activos

| ID | Método | Descripción | Archivo |
|---|---|---|---|
| **B1** | `guardarDistribucion` | Devuelve `saldo_actual` pero el campo real es `saldo_cuenta` | `VentaController:~L1759` |
| **B2** | `aprobarVenta` / `anularVenta` | Falta guardia XOR `&& !$venta->es_venta_gestor` → doble débito potencial | `VentaController` |
| **B3** | `procesarVenta` | `foreach ($pagos)` sin `?? []` → crash si frontend envía `pagos: null` | `VentaController:~L803` |
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

---

## Snapshot del proyecto

| Métrica | Valor |
|---|---|
| Backend | PHP 8.2, Laravel 12 |
| Frontend | React 19, Inertia v2, Vite 7, Tailwind v4 |
| Modelos | 38 |
| Controladores | 35 |
| Migraciones | 91 |
| Páginas frontend | ~96 (16 reportes, 8 auth/settings, 72 operacionales) |
| Middlewares | 7 |
| Notificaciones | 7 (4 encoladas) |
| Comandos artisan | 4 |
| Servicios | 2 (`DashboardStatsService`, `NotificationService`) |
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

### Otros
| Documento | Contenido |
|---|---|
| [cambios-cliente-proveedor.md](cambios-cliente-proveedor.md) | Cambios en el módulo de clientes/proveedores |
| [newforsale.md](newforsale.md) | Nuevas features para ventas |

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
npm run typecheck                # validar tipos TypeScript
npm run lint                     # corregir estilo de código
npm run format                   # formatear código con Prettier
```

---

## Archivos clave por módulo

| Módulo | Controlador | Modelos | Páginas frontend |
|---|---|---|---|
| **Ventas POS** | `app/Http/Controllers/VentaController.php` (2053 L) | `Venta`, `VentaDetalle`, `PagoVenta`, `DestinatarioVenta` | `Vendor/Index`, `Vendor/Show`, `Vendor/Listado` |
| **Cierres** | `CierreCajaController.php` (1691 L) | `CierreCaja` | `Cierres/Index`, `Cierres/Create`, `Cierres/Show` |
| **Compras** | `CompraController.php` (791 L) | `Compra`, `CompraProducto`, `CompraPago` | `Comprar/Index`, `Comprar/Show` |
| **Productos** | `ProductoController.php` (604 L) | `Producto`, `ProductoCodigo`, `Categoria` | `Productos/Index`, `Productos/Show`, `Productos/Edit` |
| **Precios vendedor** | `ProductoVendedorController.php` (421 L) | `ProductoVendedor`, `PrecioHistorial` | `Productos/Vendor/*` (4 páginas) |
| **Movimientos stock** | `MovimientosController.php` (584 L) | `Movimiento`, `MovimientoDetalle`, `MovimientoSeguimiento` | `Movimientos/Index`, `Movimientos/Show` |
| **Finanzas** | `TransaccionController.php` (1235 L) | `MovimientoFinanciero`, `Cuenta`, `Moneda`, `TransaccionCuenta` | `Transacciones/*` (7 páginas) |
| **Reportes** | `ReporteController.php` (847 L) | — | `Reportes/Report/*` (16 vistas) |
| **Telegram Bot** | `TelegramWebhookController.php` (497 L) | — | `routes/api.php` (webhook) |
| **Dashboard** | `AdminController.php` (545 L) | `TasaCambio`, `TasaCambioMLC`, `HistorialTasaCambio` | `dashboard.tsx` |
| **Logística** | `LogisticaController.php` (25 L) | — (usa `DashboardStatsService`) | `Logistica/*` (7 páginas) |
| **Usuarios** | `UserController.php`, `UserAlmacenController.php` | `User`, `UserAlmacen` | `Empleados/*` (4 páginas) |

---

## Al iniciar una nueva sesión

1. Leer este `INDEX.md` (sesión checkpoint + snapshot)
2. Leer `ESTADO_DESARROLLO.md` (bugs y features actualizados)
3. Leer `context.md` si se necesita contexto general
4. Continuar desde el **Próximo paso** en Session Checkpoint
5. Al terminar, actualizar **Session Checkpoint** y `ESTADO_DESARROLLO.md`
