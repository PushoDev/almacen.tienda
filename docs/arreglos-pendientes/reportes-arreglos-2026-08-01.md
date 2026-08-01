# Arreglos módulo Reportes

## Cómo se trabaja esto

15 reportes, uno por uno. **El usuario indica el orden** — no asumir prioridad propia. No tocar código hasta que se confirme cuál reporte toca. Marcar `[ ]` → `[x]` al completar cada uno y anotar qué se hizo (igual que `transacciones-cuentas-mejoras-2026-07-31.md`).

Control de acceso: `routes/acciones/reportes.php` solo exige `['auth','verified']` — **sin chequeo de rol** en casi todo el módulo (única excepción: `historialCostoPrecio()`, que sí hace `abort(403)` si no es admin/moderador). Cuando toque cada reporte, decidir puntualmente si necesita el mismo tipo de protección — no se asume una regla global todavía.

Tests: **ninguno de los 21 métodos del controller tiene test**. Al arreglar cada reporte, evaluar si conviene agregar uno (mismo patrón que se viene usando en el resto del proyecto).

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

### 12. Rastreo de Operaciones
- [ ] Pendiente
- **Ruta:** `GET /reportes/rastreo-operaciones` (`reportes.rastreo_operaciones`)
- **Controller:** `ReporteController::rastreoOperaciones()` — línea 732
- **Frontend:** `resources/js/pages/Reportes/Report/RastreoOperaciones.tsx`
- **Hallazgos:** ⚠️ usa `CONCAT()` (líneas ~756, 770, 799) sobre un `UNION ALL` de 4 subconsultas (Ventas+Compras+Movimientos+Cierres) envuelto en subquery derivada — no portable a SQLite, mismo patrón de riesgo de bindings que mordió a Cuentas hoy (bug B9, ver memoria/`ESTADO_DESARROLLO.md`). Expone auditoría financiera global sin chequeo de rol. Si el orden de los `where` condicionales de las 4 subconsultas cambia, hay que revisar el orden de bindings de `mergeBindings()` con cuidado (mismo gotcha).

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
