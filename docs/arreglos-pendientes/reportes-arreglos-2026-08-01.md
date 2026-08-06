# Arreglos módulo Reportes

## Cómo se trabaja esto

15 reportes, uno por uno. **El usuario indica el orden** — no asumir prioridad propia. No tocar código hasta que se confirme cuál reporte toca. Marcar `[ ]` → `[x]` al completar cada uno y anotar qué se hizo (igual que `transacciones-cuentas-mejoras-2026-07-31.md`).

Control de acceso: **resuelto a nivel de módulo (2026-08-04).** `routes/acciones/reportes.php` ahora agrupa los 14 reportes de costo/margen/finanzas (todos salvo `index` y `rastreo_operaciones`) bajo `Route::middleware('admin')` (alias existente → `EnsureUserIsAdmin`, permite `admin` y `moderador`) — mismo criterio que ya usaba `historialCostoPrecio()` con su `abort(403)` manual, que se dejó intacto como segunda capa. `index` y `rastreo_operaciones` quedan abiertos a todos los roles a propósito (Rastreo ya filtra internamente por rol/scope). Ver detalle en `rastreo-operaciones-rediseno-2026-08-01.md`, Fase 6.

Tests: **ninguno de los 21 métodos del controller tiene test**. Al arreglar cada reporte, evaluar si conviene agregar uno (mismo patrón que se viene usando en el resto del proyecto).

**Arquitectura (decisión 2026-08-01):** cada reporte pasa a tener su propio controller en `App\Http\Controllers\Reportes\` (namespace nuevo, mismo patrón que ya usa el proyecto para `Api/`, `Auth/`, `Settings/`) — el usuario pidió esto explícitamente para evitar "ligas y conflictos" entre 21 métodos no relacionados viviendo juntos en un solo `ReporteController.php` de ~900 líneas. **Se hace de forma incremental**: cada vez que se trabaja un reporte de esta lista, ese método se extrae a su propio controller (`app/Http/Controllers/Reportes/<Nombre>Controller.php`) como parte del trabajo — no es un refactor masivo de los 21 de una sola vez. Actualizar la ruta correspondiente en `routes/acciones/reportes.php` al migrar cada uno.

---

## Compras e Inventario

### 1. Productos Más Comprados
- [ ] Pendiente
- **Ruta:** `GET /reportes/productos-mas-comprados` (`reportes.productos_mas_comprados`)
- **Controller:** `ReporteController::productosMasComprados()` — `app/Http/Controllers/ReporteController.php:29`
- **Frontend:** `resources/js/pages/Reportes/Report/ProductosMasComprados.tsx`
- **Hallazgos:** sin problema estructural detectado en el análisis inicial. SQL crudo sobre `compra_producto`/`productos`, portable entre MySQL/SQLite.

### 2. Compras por Período
- [ ] Pendiente
- **Ruta:** `GET /reportes/compras-por-periodo` (`reportes.compras_por_periodo`)
- **Controller:** `ReporteController::comprasPorPeriodo()` — línea 51
- **Frontend:** `resources/js/pages/Reportes/Report/CompraPorPeriodo.tsx`
- **Hallazgos:** sin límite ni paginación por defecto — si no se pasan filtros de fecha, trae todas las compras del sistema.
- *(Relacionado, no está en el menú principal: `comprasPorProveedor()` — línea 111, ruta `reportes.compras_por_proveedor/{proveedorId?}`, frontend `ComprasPorProveedor.tsx` — mismo patrón sin límite.)*

### 3. Balance de Gastos Mensuales
- [ ] Pendiente
- **Ruta:** `GET /reportes/balance-gastos-mensuales` (`reportes.balance_gastos_mensuales`)
- **Controller:** `ReporteController::balanceGastosMensuales()` — línea 91
- **Frontend:** `resources/js/pages/Reportes/Report/BalanceGastosMensauales.tsx` (typo "Mensauales" en el nombre del archivo, coincide con el string que usa el controller — no es un bug de resolución, solo un typo consistente en ambos lados)
- **Hallazgos:** ⚠️ usa `DATE_FORMAT(compras.fecha_compra, '%Y-%m')` — función exclusiva de MySQL/MariaDB, no existe en SQLite. Rompería si se le escribe un test (los tests corren en SQLite, producción en MySQL). No detectado en análisis previos del proyecto.

### 4. Inventario por Almacén
- [ ] Pendiente
- **Ruta:** `GET /reportes/inventario-por-almacen` (`reportes.inventario_por_almacen`)
- **Controller:** `ReporteController::inventarioPorAlmacen()` — línea 141
- **Frontend:** `resources/js/pages/Reportes/Report/InventarioPorAlmacen.tsx`
- **Hallazgos:** sin problema estructural detectado.

### 5. Inventario Detallado
- [ ] Pendiente
- **Ruta:** `GET /reportes/inventario-detallado-por-almacen` (`reportes.inventario_detallado_por_almacen`)
- **Controller:** `ReporteController::inventarioDetalladoPorAlmacen()` — línea 164
- **Frontend:** `resources/js/pages/Reportes/Report/InventarioDetalladoPorAlmacen.tsx`
- **Hallazgos:** sin problema estructural detectado.

### 6. Alerta de Stock Bajo
- [ ] Pendiente
- **Ruta:** `GET /reportes/reporte-stock-bajo` (`reportes.reporte_stock_bajo`)
- **Controller:** `ReporteController::reporteStockBajo()` — línea 564
- **Frontend:** `resources/js/pages/Reportes/Report/ReporteStockBajo.tsx`
- **Hallazgos:** sin problema estructural detectado. Umbral de "stock bajo" hardcodeado (≤5) — confirmar si debe ser configurable cuando se trabaje este ítem.

### 7. Valor del Inventario
- [ ] Pendiente
- **Ruta:** `GET /reportes/valor-inventario` (`reportes.valor_inventario`)
- **Controller:** `ReporteController::valorInventario()` — línea 583
- **Frontend:** `resources/js/pages/Reportes/Report/ValorInventario.tsx`
- **Hallazgos:** ⚠️ expone `precio_compra_producto` (costo) a **cualquier rol autenticado**, sin chequeo — inconsistente con `historialCostoPrecio()` (línea 640), que sí protege el mismo tipo de dato con `abort(403)` para no-admin/moderador.

---

## Ventas y Rentabilidad

### 8. Productos Más Vendidos
- [ ] Pendiente
- **Ruta:** `GET /reportes/productos-mas-vendidos` (`reportes.productos_mas_vendidos`)
- **Controller:** `ReporteController::productosMasVendidos()` — línea 411, hace `Inertia::render('Reportes/Report/ProductosMasVendidos', ...)`
- **Frontend:** ⚠️ **`resources/js/pages/Reportes/Report/ProductosMasVendidos.tsx` NO EXISTE.** Confirmado con `find`/`grep` sobre todo `resources/js/`. La ruta está enlazada desde el menú (`Index.tsx:101`) — al hacer clic, Inertia no puede resolver el componente. **Bug reproducible ahora mismo, no hipotético.**
- **Hallazgos:** este es probablemente el más urgente de los 15 — el único que está roto en el sentido literal de "no carga".

### 9. Ventas por Período
- [ ] Pendiente
- **Ruta:** `GET /reportes/ventas-por-periodo` (`reportes.ventas_por_periodo`)
- **Controller:** `ReporteController::ventasPorPeriodo()` — línea 433
- **Frontend:** `resources/js/pages/Reportes/Report/VentasPorPeriodo.tsx`
- **Hallazgos:** sin límite ni paginación — trae **todas** las ventas completadas con relaciones cargadas si no hay filtro de fecha.

### 10. Ventas por Vendedor
- [ ] Pendiente
- **Ruta:** `GET /reportes/ventas-por-vendedor` (`reportes.ventas_por_vendedor`)
- **Controller:** `ReporteController::ventasPorVendedor()` — línea 467
- **Frontend:** `resources/js/pages/Reportes/Report/VentasPorVendedor.tsx`
- **Hallazgos:** sin problema estructural detectado.

### 11. Reporte de Ganancias
- [ ] Pendiente
- **Ruta:** `GET /reportes/reporte-ganancias` (`reportes.reporte_ganancias`)
- **Controller:** `ReporteController::reporteGanancias()` — línea 516
- **Frontend:** `resources/js/pages/Reportes/Report/ReporteGanancias.tsx`
- **Hallazgos:** ⚠️ expone ganancia real/margen por venta a **cualquier rol**, incluido vendedor, sin chequeo. Sin límite ni paginación (`->map()` en PHP sobre toda la colección).

---

## Auditoría y Rastreo

### 12. Rastreo de Operaciones — 🟡 EN PROGRESO, es el que le interesa al cliente. Fases 0-3, 5 (Receptor), 7 (Compras) y 8 (columnas, UX) cerradas + fixes de seguridad; quedan Fase 4 (stock final) y 2 ítems de Fase 6 (drill-down, PDF completo) — todo baja prioridad
- **Ver plan y estado detallado, actualizado 2026-08-06, en `rastreo-operaciones-rediseno-2026-08-01.md`** — no repetir el análisis acá, ese doc es la fuente de verdad para este reporte.
- **Ruta:** `GET /reportes/rastreo-operaciones` (`reportes.rastreo_operaciones`)
- **Controller:** `app/Http/Controllers/Reportes/RastreoOperacionesController.php` — propio, separado de `ReporteController` desde la Fase 0.
- **Frontend:** `resources/js/pages/Reportes/Report/RastreoOperaciones.tsx`
- **Estado real (2026-08-06):** Venta/Gasto/Ingreso/Transferencia unificados con filas colapsables (incl. detalle de productos con marca/modelo/capacidad/color/código), filtros por fecha/tipo/usuario/búsqueda, widgets KPI de conteo por tipo, gate de costo/margen por rol, scope de vendedor a sus propias operaciones, y **rol de acceso a nivel de ruta ya cerrado para todo el módulo** (ver nota general arriba). Los hallazgos viejos de esta fila (`CONCAT()`, bug de bindings B9) ya no aplican — resueltos. **Tabla principal reorganizada (2026-08-06, Fase 8 + dos ajustes emergentes el mismo día):** columnas ahora `Referencia | Cuenta Envía | Monto | Cuenta que Recibe | Monto | Tasa de la Operación | Detalles` (7 columnas, `Fecha/Hora` se retiró a pedido del cliente) — formato "partida doble", columna `Usuario` retirada (pendiente decidir dónde reponerla para Venta, ver Fase 8). En Venta, "Cuenta que Recibe"/"Monto"/"Tasa de la Operación" se rediseñaron: un `Badge` por cada pago en cada una de las 3 columnas, alineados y coloreados con la misma paleta (`colorPago()`) para identificar visualmente qué monto y tasa corresponden a qué cuenta — verificado en navegador contra la venta real `#392` (dos pagos con tasas distintas). Hallazgo nuevo sin arreglar: el botón "Exportar PDF" quedó desincronizado, sigue generando las columnas viejas (`Fecha, Tipo, Referencia, Usuario, Monto, Detalles`). **Compras reintegradas (2026-08-06, Fase 7, cerrada):** quinto tipo en el reporte, admin/moderador-only (vendedor no ve la clave `Compra` ni puede forzarla por URL — es dato de costo, sin forma de acotar "solo lo mío" porque `compras` no tenía `user_id` hasta ahora). Requirió migración (`user_id` nullable en `compras`, capturado desde `CompraController::store()` de ahora en adelante) además del reporte en sí. Detalle completo en Fase 7 del doc de Rastreo. Pendiente real, baja prioridad: stock final (Fase 4), drill-down y exportar PDF completo (Fase 6, ahora incluye resincronizar las columnas del PDF). **Aparte y sin relación con este reporte: hay una regresión de entorno en la suite de tests (23/126 fallando) por `public/build/manifest.json` + versionado de Inertia — ver sección de tests más abajo y memoria `project_test_regression_inertia_manifest` — pendiente de arreglar, es parte de "actualizar los tests" que pidió el cliente para esta ronda.**

---

## Finanzas y Otros

### 13. Historial de Precios
- [ ] Pendiente
- **Ruta:** `GET /reportes/historial-precios` (`reportes.historial_precios`)
- **Controller:** `ReporteController::historialPrecios()` — línea 614
- **Frontend:** `resources/js/pages/Reportes/Report/HistorialPrecios.tsx`
- **Hallazgos:** sin límite ni paginación — tabla de auditoría que crece con cada cambio de precio de venta. Sensibilidad menor (precio de venta, no costo).

### 14. Cambios de Precio de Costo
- [ ] Pendiente
- **Ruta:** `GET /reportes/historial-costo-precio` (`reportes.historial_costo_precio`)
- **Controller:** `ReporteController::historialCostoPrecio()` — línea 640
- **Frontend:** `resources/js/pages/Reportes/Report/HistorialCostoPrecio.tsx`
- **Hallazgos:** este es el único de los 21 métodos que **sí** protege por rol (`abort(403)` si no admin/moderador, línea ~643) y **sí** pagina (`paginate(20)`). Es el modelo a seguir para los demás, no el que necesita arreglo.

### 15. Movimientos Financieros
- [ ] Pendiente
- **Ruta:** `GET /reportes/movimientos-financieros` (`reportes.movimientos_financieros`)
- **Controller:** `ReporteController::movimientosFinancieros()` — línea 689
- **Frontend:** `resources/js/pages/Reportes/Report/MovimientosFinancieros.tsx`
- **Hallazgos:** sin límite ni paginación. Expone todos los movimientos de dinero del sistema sin chequeo de rol.

---

## Fuera del alcance de los 15 (anotado, no es tarea)

- **`kpiResumen()`** (línea 492) — recibe `DashboardStatsService` pero **no tiene ninguna ruta registrada** en todo el proyecto. Código muerto/inalcanzable. Decidir en algún momento si se conecta a una ruta real o se elimina — no es parte de esta lista de 15 salvo que se pida explícitamente.
- **`comprasPorProveedor()`** (línea 111) — tiene ruta y frontend (`ComprasPorProveedor.tsx`) pero no está enlazado desde el menú principal de `Reportes/Index.tsx`. Probablemente se accede como drill-down desde otro reporte.

---

**Why:** el usuario pidió arreglar los 15 reportes uno por uno, en el orden que él decida, y quería un `.md` para trackearlo en vez de resolver todo de una vez.
**How to apply:** antes de tocar un reporte, confirmar con el usuario cuál sigue. Marcar el checkbox y documentar el fix aplicado (igual que se hizo con `transacciones-cuentas-mejoras-2026-07-31.md`) al terminar cada uno.
