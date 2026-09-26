# Documentación — almacen.tienda

> **ERP multi-almacén** · POS · Logística · Lotes y costos · Finanzas multi-moneda
> Laravel 12 · React 19 · Inertia v2 · Tailwind v4 · TypeScript 5.9

> **Última actualización de este índice: 2026-09-26.** Cifras y enlaces verificados contra el código y la carpeta `docs/` ese día. Si agregas o mueves un documento, actualiza la sección que corresponda.

---

## Session Checkpoint

| Campo | Valor |
|---|---|
| Rama activa | `feature/desarrollo-caliente` |
| Última sesión | 2026-09-26 — **Monedas: métodos y vías de pago por moneda dentro del CRUD de Monedas, y se elimina `monedas.commission`** (5 migraciones nuevas; el cobro en el POS todavía usa la lista fija de vías: es el siguiente paso). También: la comisión del vendedor puede salir de una cuenta USD en efectivo asignada al vendedor de la venta** (además de las CUP; `guardarDistribucion` valida la cuenta y fuerza tasa 1 en USD; Cierre de Caja, Dashboard y detalle de operación ajustados). Antes, en la misma fecha: **POS: selector de lote, comisión por lote y guía de lotes para el cliente.** El POS muestra "Vender de este lote" cuando un producto tiene 2 o más lotes, con el más antiguo elegido por defecto; el precio y la comisión siguen al lote elegido (`PrecioLoteService`); un precio propio de lote es el precio base y no cambia la comisión; `LoteConsumoService::consumir()` trata el lote elegido como preferencia y sigue en FIFO (sin límites). `/disponibles` permite comisión propia por lote (solo admin/moderador). 2 migraciones nuevas (`lotes_stock.comision`, `venta_detalles.comision_base`). Commiteado por el cliente el mismo día. Detalle en la primera fila del historial de `ESTADO_DESARROLLO.md`; guía funcional en [flujo-de-lotes.md](flujo-de-lotes.md). |
| Estado general | Módulos base estables (Productos, Almacenes, Compras, Ventas/POS, Movimientos, Cuentas, Monedas, Transacciones, Remesas, Cierres, Reportes parcial, Logística, Turnos). En producción el cliente ya desplegó lo del 2026-09-24 y las 5 migraciones del 2026-09-25; falta confirmar `npm ci` (dependencia `react-data-grid`) y desplegar las 2 migraciones del 2026-09-26. Última suite completa registrada: 604 tests en verde (2026-09-25); desde entonces se corrieron por archivos (248 relacionados en verde el 09-26), no la suite completa. |
| Próximo paso | El usuario decide. Siguiente de Monedas: conectar el cobro (POS y edición de venta) a los métodos y vías configurados, con validación en el servidor. Pendiente propio de la comisión en USD: decidir cómo mostrar en el Cierre de Caja lo pagado en USD y si las cuentas CUP también deben limitarse a las del vendedor. Pendientes principales (todos con detalle y prioridad en [ESTADO_DESARROLLO.md](ESTADO_DESARROLLO.md)): desplegar lo del 09-26; sección "Ventas Devueltas" en Cierre de Caja (backend hecho, falta frontend); poner al día notificaciones y bot de Telegram (ventas especiales, devoluciones) y su rediseño por rol; decidir el rol de la importación directa de Excel (`productos.import`); estilo de los 4 export de Excel; reporte "Valor del Inventario"; documentación pública del sistema (baja prioridad). |

### Pendientes conocidos (resumen)

La lista completa, con contexto, está en `ESTADO_DESARROLLO.md` → "🎯 Lista de tareas priorizada". Aquí solo lo que más se pregunta:

| Tema | Estado |
|---|---|
| Precio propio de un lote sin restricción de rol | Decisión pendiente de luz verde del cliente (la comisión propia sí es solo admin/moderador) |
| Aviso "bajo costo" del POS (costo promedio) vs servidor (costo del lote consumido) | Solo se nota si los costos de los lotes difieren |
| Respuestas atrasadas de `cargarProductos` en el POS | Abierto (los otros dos huecos de lotes del POS se cerraron el 09-26) |
| `POST /movimientos/{movimiento}/aprobar` sin método; `routes/vendor/vendedor.php` sin cargar | Rutas rotas / huérfanas, sin decidir |
| F2 (mensajero multi-moneda), F3 (mover config del mensajero a `Empleados/Edit`), F4 (`ganancia_real_total` en 0) | Abiertos, prioridad baja |
| Cron de producción (`schedule:run`) | Sin configurar; solo se puede crear desde hPanel |

---

## Snapshot del proyecto

| Métrica | Valor |
|---|---|
| Backend | PHP `^8.2` (corre en 8.4), Laravel 12 |
| Frontend | React 19, Inertia v2, Vite 7, Tailwind v4, TypeScript 5.9 |
| Modelos | 53 |
| Controladores | 46 (34 en la raíz incluyendo `Controller.php` base + 12 en subdirectorios: 1 Api, 8 Auth, 2 Settings, 1 Reportes — `Reportes\RastreoOperacionesController`) |
| Rutas | Cargadas desde `routes/web.php`, que incluye `routes/{acciones,crud,empleados,shop}/*.php` (`routes/vendor/vendedor.php` no se carga) |
| Migraciones | 156 |
| Páginas frontend | 121 archivos `.tsx` en `resources/js/pages` (16 vistas de reportes en `Reportes/Report/`) |
| Middlewares | 9 archivos. Alias en uso: `admin` (admin+moderador), `admin.only`, `requiere.turno`, `check.cuenta.permission`. `moderator` y `vendor` están registrados pero ninguna ruta los usa (el rol se comprueba dentro de los controladores); `CheckAlmacenPermission` no está registrada |
| Notificaciones | 11, todas síncronas (ninguna implementa `ShouldQueue`) |
| Comandos artisan | 15 (backfills de lotes y códigos, cierres de comparación mensual, notificación diaria de cierres pendientes, deploy, etc.) |
| Servicios | 14 (`DashboardStatsService`, `NotificationService`, `LoteConsumoService`, `FusionLotesService`, `PrecioLoteService`, `FichasHermanasService`, `FusionProductosService`, `CodigoStockService`, `ValorInventarioService`, `ResumenAlmacenService`, `ImportacionProductosService`, `DetalleOperacionService`, `CatalogoTarjetasService`, `MetodosPagoService`) |
| Exports / Imports Excel | 6 exports, 3 imports |
| Tests | 35 archivos en `tests/Feature` (Pest) |
| Roles | `admin` / `moderador` / `vendedor` |
| Monedas | USD (base) y CUP; más monedas configurables (catálogo de insignias USD/CUP/EUR/MXN/BRL). Hay dos monedas con código `CUP`: resolver siempre por `moneda_id`, nunca por código |
| Paquetes clave | `spatie/laravel-permission`, `inertiajs/inertia-laravel`, `irazasyed/telegram-bot-sdk`, `maatwebsite/excel`, `milon/barcode`, `barryvdh/laravel-dompdf`, `react-data-grid` (hoja de revisión de importaciones) |

---

## Lectura obligatoria antes de tocar código

| Documento | Por qué leerlo |
|---|---|
| [context.md](context.md) | Contexto completo: dominio, entidades, roles, controladores, servicios, lógica de negocio, "Branch Actual" |
| [ESTADO_DESARROLLO.md](ESTADO_DESARROLLO.md) | Qué está hecho, qué falta y con qué prioridad; historial de cambios (la primera fila es lo más reciente) — **actualizar siempre** |
| [guia-desarrollo.md](guia-desarrollo.md) | Cómo levantar el proyecto, comandos, entorno |
| [arreglos-pendientes/resumen-cambios-2026-09-25.md](arreglos-pendientes/resumen-cambios-2026-09-25.md) | Última sesión con resumen propio (Compras con bloqueo de fila, importación de Excel en dos pasos, lotes de movimientos y compras). Lo del 2026-09-26 está en el historial de `ESTADO_DESARROLLO.md` |

---

## Por módulo

### Lotes, costos y prorrateo
| Documento | Contenido |
|---|---|
| [flujo-de-lotes.md](flujo-de-lotes.md) | **Guía para el cliente**: qué es un lote, de dónde nacen, prorrateo pendiente (distribuir / eliminar de la lista / fusionar), `/disponibles`, selector del POS, reglas de precio y comisión con ejemplos |
| [arreglos-pendientes/distribucion-costos-modulo-2026-08-20.md](arreglos-pendientes/distribucion-costos-modulo-2026-08-20.md) | Módulo Distribución de Costos: fórmula de prorrateo ponderado, lotes y fondos en varias monedas, historial |
| [arreglos-pendientes/prorrateo-costos-movimientos-2026-08-25.md](arreglos-pendientes/prorrateo-costos-movimientos-2026-08-25.md) | Prorrateo de costos de movimientos entre almacenes |
| [arreglos-pendientes/costo-promedio-ponderado-duplicacion-por-almacen-propuesta-2026-08-20.md](arreglos-pendientes/costo-promedio-ponderado-duplicacion-por-almacen-propuesta-2026-08-20.md) | Propuesta vigente (v3) de costo por almacén y duplicación de fichas por precio |
| [arreglos-pendientes/costo-promedio-ponderado-por-almacen-propuesta-2026-08-15.md](arreglos-pendientes/costo-promedio-ponderado-por-almacen-propuesta-2026-08-15.md) | Propuesta v1, **superseded** por la de arriba |
| [modelo-costo-producto/](modelo-costo-producto/) | Idea del cliente: módulo de "Formación de Costos y Precios" (solo analizado, sin implementar) |
| [arreglos-pendientes/resumen-cambios-2026-09-20.md](arreglos-pendientes/resumen-cambios-2026-09-20.md), [-09-21](arreglos-pendientes/resumen-cambios-2026-09-21.md), [-09-22](arreglos-pendientes/resumen-cambios-2026-09-22.md) | Sesiones de lotes: backfill de lotes, precio por lote, costo por almacén, fusión de fichas y de lotes, valor del inventario |
| [pendiente-fusionar-duplicados.md](pendiente-fusionar-duplicados.md) | Notas de la fusión de productos duplicados |

### Ventas y POS
| Documento | Contenido |
|---|---|
| [flujo-de-lotes.md](flujo-de-lotes.md) | Cómo se ven y se venden los lotes en el POS (selector, precio, comisión) |
| [ventas/flujos-venta.md](ventas/flujos-venta.md) | Flujos completos: normal, especial, gestor, mensajero |
| [flujos-ventas.md](flujos-ventas.md) | Flujos de ventas (resumen en la raíz de `docs/`) |
| [ventas/contexto-actual.md](ventas/contexto-actual.md) | Estado del código de ventas, métodos del controlador, campos clave (anterior a los lotes y a las ventas especiales en dos tipos: contrastar con `context.md`) |
| [flujos-financieros-comision-mensajero.md](flujos-financieros-comision-mensajero.md) | Flujos financieros paralelos (comisión, mensajero, gestor) |
| [comision-vendedor-gestor-2026-05-25.md](comision-vendedor-gestor-2026-05-25.md) | Tracking de comisiones — fórmulas y cambios |
| [arreglos-pendientes/precios-venta-modal-busqueda-producto-2026-08-13.md](arreglos-pendientes/precios-venta-modal-busqueda-producto-2026-08-13.md) | Modal masivo de precios de venta en `/disponibles` (admin) |
| [factura-venta/](factura-venta/) | Modelo de factura de venta (Word) |
| [arreglos-pendientes/resumen-cambios-2026-09-24.md](arreglos-pendientes/resumen-cambios-2026-09-24.md) | Códigos de barras por almacén, `/disponibles` con agotadas, devoluciones a lote/código, ventas especiales en dos tipos, acceso denegado y páginas de error |
| [arreglos-pendientes/resumen-cambios-2026-09-05.md](arreglos-pendientes/resumen-cambios-2026-09-05.md) | Impresión de venta en doble copia |

### Compras
| Documento | Contenido |
|---|---|
| [patron-dialog-formulario-grande.md](patron-dialog-formulario-grande.md) | Patrón del diálogo grande de dos paneles (nació en "Editar Producto" de Compras) |
| [arreglos-pendientes/resumen-cambios-2026-09-25.md](arreglos-pendientes/resumen-cambios-2026-09-25.md) | Aprobar, anular y editar compras con bloqueo de fila |

### Cierre de Caja
| Documento | Contenido |
|---|---|
| [ventas/pendiente-cierre-caja.md](ventas/pendiente-cierre-caja.md) | Estado del cierre, problemas resueltos, features añadidos |
| [comparativa-cierres.md](comparativa-cierres.md) | Sección de comparativa con el cierre anterior |
| [PLAN_Actualizar_Show_Cierres.md](PLAN_Actualizar_Show_Cierres.md) | Plan original para actualizar la vista Show del cierre |
| [pendiente-cierre-caja-comision-vendedor-2026-05-26.md](pendiente-cierre-caja-comision-vendedor-2026-05-26.md) | Pendiente de comisión del vendedor en el cierre |
| [arreglos-pendientes/Propuesta-CierreCaja.md](arreglos-pendientes/Propuesta-CierreCaja.md) | Propuesta original de los cambios de Cierre de Caja del 2026-07-30 |

### Mensajero y gestor
| Documento | Contenido |
|---|---|
| [pendiente-arreglar-mensajero.md](pendiente-arreglar-mensajero.md) | Ajustes pendientes del flujo de mensajero |
| [pendiente-autocompletado-gestor-show-2026-05-26.md](pendiente-autocompletado-gestor-show-2026-05-26.md) | Autocompletado del gestor en `Show` |

### Bot de Telegram
| Documento | Contenido |
|---|---|
| [TELEGRAM_BOT_PLAN.md](TELEGRAM_BOT_PLAN.md) | Plan de implementación (histórico). El estado actual y el rediseño por rol pendiente están en `ESTADO_DESARROLLO.md` y `context.md` → "Bot de Telegram" |

### Productos e importación de Excel
| Documento | Contenido |
|---|---|
| [arreglos-pendientes/resumen-cambios-2026-09-25.md](arreglos-pendientes/resumen-cambios-2026-09-25.md) | **Vigente**: importación en dos pasos (borrador → hoja de revisión → confirmar), un lote `IMP-` por fila, historial, deshacer, plantilla con instrucciones |
| [codebar-ventas-y-fixes-2026-05-21.md](codebar-ventas-y-fixes-2026-05-21.md) | Sistema de códigos de barras y fixes de ventas (el reparto por almacén está en el resumen del 09-24) |
| [plantilla-importar-productos.md](plantilla-importar-productos.md) | Importación masiva — **anterior a lotes y a la plantilla nueva**: revisar antes de fiarse |
| [prompt_excel_import.md](prompt_excel_import.md) | Prompt original de la importación — **anterior a lotes** |
| [precios-vendedor-export-import.md](precios-vendedor-export-import.md) | Export/import de precios por vendedor — **anterior a lotes y a códigos por almacén** |
| [producto-vendedor-operacion-pendiente.md](producto-vendedor-operacion-pendiente.md) | Notas de operaciones pendientes de precios por vendedor |

### Dashboard y Reportes
| Documento | Contenido |
|---|---|
| [arreglos-pendientes/reportes-arreglos-2026-08-01.md](arreglos-pendientes/reportes-arreglos-2026-08-01.md) | Índice de la limpieza de los 15 reportes (`/reportes/*`) |
| [arreglos-pendientes/rastreo-operaciones-rediseno-2026-08-01.md](arreglos-pendientes/rastreo-operaciones-rediseno-2026-08-01.md) | Rediseño por fases de Rastreo de Operaciones (el doc más detallado del repositorio) |
| [arreglos-pendientes/dashboard-resumen-financiero-2026-08-12.md](arreglos-pendientes/dashboard-resumen-financiero-2026-08-12.md) | Resumen financiero del dashboard (Tabla 1 y Tabla 2) |
| [arreglos-pendientes/resumen-cambios-2026-08-19.md](arreglos-pendientes/resumen-cambios-2026-08-19.md) | Auditoría de saldo de cuentas, Saldo Acumulado y Ganancia Real de la Agencia |
| [arreglos-pendientes/dashboard-componentizacion-2026-08-18.md](arreglos-pendientes/dashboard-componentizacion-2026-08-18.md) | Separación de `dashboard.tsx` en componentes (completa) |
| [arreglos-pendientes/dashboard-comparacion-mensual-reconstruccion-agosto-2026-08-18.md](arreglos-pendientes/dashboard-comparacion-mensual-reconstruccion-agosto-2026-08-18.md) | Reconstrucción de agosto de la comparación mensual (ya ejecutada) |
| [arreglos-pendientes/dashboard-comparacion-mensual-aviso-despliegue-2026-08-18.md](arreglos-pendientes/dashboard-comparacion-mensual-aviso-despliegue-2026-08-18.md) | **Superseded** — no reutilizar su checklist |
| [Logística](context.md) | En `context.md`: secciones `Página de Logística` y `DashboardStatsService` |

### Cuentas, transacciones y remesas
| Documento | Contenido |
|---|---|
| [arreglos-pendientes/transacciones-cuentas-mejoras-2026-07-31.md](arreglos-pendientes/transacciones-cuentas-mejoras-2026-07-31.md) | Mejoras de Transacciones y Cuentas (mayormente cerradas) |
| [arreglos-pendientes/cuenta-auditoria-saldo-2026-08-19.md](arreglos-pendientes/cuenta-auditoria-saldo-2026-08-19.md) | Ajuste de saldo con contraseña real y tabla de auditoría |
| [Fix Payment Destination Accounts.md](Fix%20Payment%20Destination%20Accounts.md) | Arreglo de cuentas destino de pago |
| [cambios-cliente-proveedor.md](cambios-cliente-proveedor.md) | Cambios en clientes y proveedores |
| Remesas / Operaciones Múltiples | Sin documento propio: ver `ESTADO_DESARROLLO.md` (historial 2026-09-14 y 2026-09-16) y `context.md` |

### Base de datos y producción
| Documento | Contenido |
|---|---|
| [base-de-datos.md](base-de-datos.md) | Tablas principales, campos clave y relaciones (anterior a lotes: ver `context.md` y `flujo-de-lotes.md`) |
| [backup/](./backup/) | `u706356131_gestion.sql`: copia de la base de **producción** (2026-09-26) para reemplazar la base local. **Contiene datos reales: no publicar ni subir a un repositorio abierto** |
| [produccion-fix-debug-boost-lentitud-2026-09-16.md](produccion-fix-debug-boost-lentitud-2026-09-16.md) | Runbook: producción lenta por `APP_ENV=local`/`APP_DEBUG=true` |
| [arreglos-pendientes/white-label-plan-2026-08-20.md](arreglos-pendientes/white-label-plan-2026-08-20.md) | Plan (sin implementar) de una versión comercial white-label |

### Arquitectura, API y análisis
| Documento | Contenido |
|---|---|
| [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md), [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | Visión general del proyecto (anteriores a lotes; `context.md` es la fuente principal) |
| [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md) | Diagrama de arquitectura |
| [API_PUBLIC_CATALOG.md](API_PUBLIC_CATALOG.md) | Endpoints de la API pública de catálogo (sin auth) |
| [TECHNICAL_ANALYSIS.md](TECHNICAL_ANALYSIS.md) | Análisis técnico del stack y patrones |
| [rutas-y-controladores.md](rutas-y-controladores.md) | Mapa de rutas y controladores (contrastar con `php artisan route:list`) |

### Interfaz y patrones visuales
| Documento | Contenido |
|---|---|
| [header-structure.md](header-structure.md) | **Regla crítica**: el banner superior de cada página es la identidad del proyecto; no se restiliza |
| [patron-card-header-degradado.md](patron-card-header-degradado.md) | Receta del `CardHeader` con degradado (`pt-0`, `overflow-hidden`) |
| [patron-dialog-formulario-grande.md](patron-dialog-formulario-grande.md) | Diálogo grande de dos paneles y variantes de una columna |
| [patron-mascota-bleed.md](patron-mascota-bleed.md) | Cómo usar la mascota decorativa (variante que sobresale y marca de agua) |
| [pendiente-combobox-reemplazo.md](pendiente-combobox-reemplazo.md) | Combobox vs Dialog (foco) y dónde falta reemplazar `<Select>` |
| [arreglos-pendientes/migracion-toasts-sileo-2026-08-14.md](arreglos-pendientes/migracion-toasts-sileo-2026-08-14.md) | Migración de `sonner` a `sileo` (completa) |
| [nativephp-offline-design-consistency.md](nativephp-offline-design-consistency.md) | **Leer antes de tocar UI en la versión offline (NativePHP)**: mismo sistema de diseño que la web |

### Otros
| Documento | Contenido |
|---|---|
| [newforsale.md](newforsale.md) | Nuevas features para ventas |
| [NOTES.md](NOTES.md) | Notas sueltas |
| [sections/](./sections/) | Notas de sesión sueltas (`session-ses_*.md`, `analisisTasa.md`); solo para contexto histórico puntual |
| [code/](./code/) | Snippets técnicos: `export-pdf.md`, `report-pdf.md`, `vendor.md` |

### Resúmenes de sesión (`arreglos-pendientes/`, de la más reciente a la más antigua)
| Fecha | Documento |
|---|---|
| 2026-09-26 | Sin archivo propio: primera fila del historial de [ESTADO_DESARROLLO.md](ESTADO_DESARROLLO.md) y [flujo-de-lotes.md](flujo-de-lotes.md) |
| 2026-09-25 | [resumen-cambios-2026-09-25.md](arreglos-pendientes/resumen-cambios-2026-09-25.md) |
| 2026-09-24 | [resumen-cambios-2026-09-24.md](arreglos-pendientes/resumen-cambios-2026-09-24.md) |
| 2026-09-22 | [resumen-cambios-2026-09-22.md](arreglos-pendientes/resumen-cambios-2026-09-22.md) |
| 2026-09-21 | [resumen-cambios-2026-09-21.md](arreglos-pendientes/resumen-cambios-2026-09-21.md) |
| 2026-09-20 | [resumen-cambios-2026-09-20.md](arreglos-pendientes/resumen-cambios-2026-09-20.md) |
| 2026-09-05 | [resumen-cambios-2026-09-05.md](arreglos-pendientes/resumen-cambios-2026-09-05.md) |
| 2026-09-02 | [resumen-cambios-2026-09-02.md](arreglos-pendientes/resumen-cambios-2026-09-02.md) |
| 2026-09-01 | [resumen-cambios-2026-09-01.md](arreglos-pendientes/resumen-cambios-2026-09-01.md) (saldo anterior/posterior y `DatabaseSeeder`) |
| 2026-08-27 | [resumen-cambios-2026-08-27.md](arreglos-pendientes/resumen-cambios-2026-08-27.md) |
| 2026-08-19 | [resumen-cambios-2026-08-19.md](arreglos-pendientes/resumen-cambios-2026-08-19.md) |

---

## Convenciones del proyecto

- **Nombres en español**: modelos, columnas, rutas, vistas, variables.
- **Roles**: `admin` > `moderador` > `vendedor` — filtrar siempre con `in_array($user->role, [...])`; el alias de ruta `admin` deja pasar a admin y moderador, `admin.only` solo al admin.
- **Transacciones DB**: toda operación crítica usa transacción con rollback; las que se pueden repetir por doble clic (aprobar/anular compras, anular ventas, confirmar un borrador de importación) bloquean la fila con `lockForUpdate` y releen el estado dentro de la transacción.
- **Stock al crear**: el stock se descuenta al *crear* la venta (reserva), no al aprobar.
- **Financiero al aprobar**: saldos de cuentas y deudas de clientes solo se mueven al aprobar.
- **Lotes**: el stock de un almacén es la suma de sus lotes (`lotes_stock`); las salidas consumen el lote elegido primero y luego FIFO (`LoteConsumoService`); el costo real y la ganancia salen del lote consumido. Ver [flujo-de-lotes.md](flujo-de-lotes.md).
- **Mensajero es pass-through**: nunca incluir en cálculos de comisión ni cambiarios.
- **XOR comisión**: gestor Y vendedor son mutuamente excluyentes por venta.
- **Costos**: el precio de costo solo lo ven admin y moderador; el vendedor no.
- **Tests**: Pest. Un moderador necesita un turno activo (`crearTurnoActivo()` de `tests/Pest.php`) para escribir; `tests/TestCase.php` usa `withoutVite()`. Formatear con `vendor/bin/pint app routes database tests/Feature` (no `--dirty` con `tests/Pest.php` modificado).

---

## Comandos rápidos

```bash
php artisan migrate              # aplicar migraciones
php artisan migrate:status       # ver estado de cada migración
php artisan test --compact       # ejecutar tests (Pest)
php artisan route:list           # listar todas las rutas
php artisan config:clear         # limpiar caché de configuración
php artisan cache:clear          # limpiar caché de aplicación
composer dump-autoload           # regenerar autoload después de crear clase

npm run dev                      # frontend con hot reload (Vite)
npm run build                    # build de producción
npm run lint                     # corregir estilo de código (ESLint)
npm run format                   # formatear código con Prettier
```

> `npm run types` falla antes de revisar los archivos reales: para el frontend usar ESLint y el navegador.

---

## Archivos clave por módulo

| Módulo | Controlador / servicio | Modelos | Páginas frontend |
|---|---|---|---|
| **Ventas POS** | `VentaController.php` (~2460 L), `PrecioLoteService`, `LoteConsumoService`, `CodigoStockService` | `Venta`, `VentaDetalle`, `VentaDetalleLote`, `PagoVenta`, `DestinatarioVenta` | `Vendor/Index` (POS), `Vendor/Show`, `Vendor/Listado`, `Vendor/Imprimir` |
| **Lotes y precios** | `ProductoVendedorController.php` (~770 L), `FusionLotesService`, `LoteStockController` | `LoteStock`, `LoteFusion`, `ProductoVendedor` | `Productos/Vendor/Index` (`/disponibles`) |
| **Distribución de costos** | `DistribucionCostosController.php` (~1000 L) | `CostDistribution`, `LoteStock` | `DistribucionCostos/*` |
| **Productos** | `ProductoController.php` (~1200 L), `FichasHermanasService`, `FusionProductosService`, `ValorInventarioService` | `Producto`, `ProductoCodigo`, `AlmacenProductoCodigo`, `Categoria` | `Productos/Index`, `Productos/Show`, `Productos/Edit` |
| **Importación de Excel** | `ImportacionBorradorController.php`, `ImportacionProductoController.php`, `ImportacionProductosService` | `ImportacionProducto`, `ImportacionBorrador` | `Productos/Importaciones/{Index,Revisar,Show}` |
| **Compras** | `CompraController.php` (~1280 L) | `Compra`, `CompraProducto`, `CompraPago` | `Comprar/Index`, `Comprar/Show` |
| **Movimientos stock** | `MovimientosController.php` (~770 L) | `Movimiento`, `MovimientoDetalle`, `MovimientoSeguimiento` | `Movimientos/Index`, `Movimientos/Show` |
| **Cierres** | `CierreCajaController.php` (~2070 L) | `CierreCaja` | `Cierres/Index`, `Cierres/Create`, `Cierres/Show` |
| **Finanzas** | `TransaccionController.php`, `GastoController.php`, `IngresoController.php`, `TransferenciaController.php`, `RemesaController.php` (~310 L) | `MovimientoFinanciero`, `Cuenta`, `Moneda`, `TransaccionCuenta` | `Transacciones/*`, `Remesas/*`, `Cuentas/*`, `Monedas/*` |
| **Reportes** | `ReporteController.php` (~720 L) + `Reportes/RastreoOperacionesController.php` (~690 L) | — | `Reportes/Report/*` (16 vistas) + `Reportes/Index.tsx` |
| **Telegram Bot** | `TelegramWebhookController.php` (~690 L) | — | `routes/api.php` (webhook) |
| **Dashboard y Logística** | `AdminController.php` (~420 L), `LogisticaController.php` (43 L), `DashboardStatsService`, `ResumenAlmacenService` | `TasaCambio`, `HistorialTasaCambio` | `dashboard.tsx`, `Dashboard/*`, `Logistica/*` |
| **Turnos ("Atendido por")** | `TurnoVendedorController.php` (32 L), middleware `RequireTurnoActivo` | `TurnoVendedor` | Diálogo de captura de turno (moderador y vendedor) |
| **Usuarios** | `UserController.php`, `UserAlmacenController.php` | `User`, `UserAlmacen` | `Empleados/*` |

---

## Al iniciar una nueva sesión

1. Leer este `INDEX.md` (Session Checkpoint + Snapshot).
2. Leer `ESTADO_DESARROLLO.md` (backlog y la primera fila del historial).
3. Leer `context.md` si se necesita contexto general, y [flujo-de-lotes.md](flujo-de-lotes.md) si se va a tocar lotes, POS o Distribución de Costos.
4. Continuar desde el **Próximo paso** del Session Checkpoint.
5. Al terminar, actualizar el **Session Checkpoint** de este archivo, `ESTADO_DESARROLLO.md` y, si cambió el dominio, `context.md`.
