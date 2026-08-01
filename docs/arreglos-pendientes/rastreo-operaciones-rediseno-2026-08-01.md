# Rediseño de "Rastreo de Operaciones" — reporte prioritario para el cliente

## Contexto

Es el primer reporte que se trabaja de la lista de 15 (ver `reportes-arreglos-2026-08-01.md`), fuera de orden porque es el que le interesa al cliente. Es un cambio grande — se trabaja **por fases, una a la vez, confirmando antes de tocar código**. No avanzar de fase sin luz verde explícita.

**Decisión actualizada (2026-08-01): Compras queda en estado "emergente" — prioridad media, dentro de este mismo reporte, no descartada.** Primero se construyen las Fases 0-6 sobre Venta/Gasto/Ingreso/Transferencia; Compras se retoma después, como Fase 7, una vez que se vea cómo integrarla bien (el problema de fondo sigue siendo el mismo: `compras` y `compra_pago` no tienen `user_id`, ver Fase 7 abajo). No confundir con "descartada" — el pedido original fue "olvídate de las compras" (por ahora, para no bloquear el resto) y luego se ajustó a "en forma emergente hasta ver cómo las agregamos". Los tipos de operación activos en las Fases 0-6 son: Venta, Gasto, Ingreso, Transferencia (más Cierre de Caja, todavía en discusión — ver ⚠️1).

**Decisión confirmada (2026-08-01): cada reporte del módulo pasa a tener su propio controller.** Hoy los 21 métodos viven juntos en `ReporteController.php` (~900 líneas) — el usuario pidió separarlos para evitar "ligas y conflictos" entre reportes que no tienen nada que ver entre sí. Nuevo namespace: `App\Http\Controllers\Reportes\` (mismo patrón ya usado en el proyecto para `Api/`, `Auth/`, `Settings/`). Esto se hace **de forma incremental, reporte por reporte, a medida que se trabaja cada uno** — no es un refactor masivo de una sola vez de los 21 métodos. Rastreo de Operaciones es el primero en migrar (Fase 0 abajo). Ver también `reportes-arreglos-2026-08-01.md` para la nota general del módulo.

Archivos involucrados:
- Actual: `app/Http/Controllers/ReporteController.php::rastreoOperaciones()` (línea 732)
- Nuevo: `app/Http/Controllers/Reportes/RastreoOperacionesController.php`
- `resources/js/pages/Reportes/Report/RastreoOperaciones.tsx`
- `routes/acciones/reportes.php` (actualizar el binding de la ruta al nuevo controller)
- Nuevos: posible migración si se decide trackear stock (Fase 4).

---

## ⚠️ Decisiones de negocio a confirmar antes de implementar (no bloquean escribir el plan, sí bloquean codear esa parte)

1. **¿"Cierre de Caja" sigue siendo un tipo de operación en este reporte?** El pedido lista Venta/Gasto/Ingreso/Transferencia y no menciona Cierres, que hoy sí aparece como 4to tipo ("Finanzas" se separaría en Gasto/Ingreso/Transferencia). Decidir: se elimina, se mantiene como tipo aparte, o se maneja en otro reporte.
2. **"Stock final" — no existe hoy en ningún lado de la base de datos** (ver Fase 4). Elegir entre: (A) trackear desde ahora hacia adelante — preciso pero sin histórico pasado, (B) reconstrucción retroactiva — complejo y frágil, (C) mostrar stock actual en vez de histórico. Recomendación: (A).
3. **"Observaciones/Detalles"** — Venta no tiene un campo de notas libres hoy (solo `motivo_anulacion`, que solo aplica si se anuló). Decidir si se agrega un campo nuevo, o si esa columna se llena con algo ya derivable (nombre destinatario, resumen de productos).
4. **Rol de acceso** — hoy cualquier usuario autenticado ve todo (auditoría financiera completa del sistema). Al ser un reporte más rico y sensible después del rediseño, confirmar si sigue abierto a todos o se restringe (ej. solo admin/moderador, como ya hace `historialCostoPrecio()`).

---

## Fase 0 — Extraer a su propio controller

- [ ] Crear `app/Http/Controllers/Reportes/RastreoOperacionesController.php` (namespace `App\Http\Controllers\Reportes`), mover ahí el método `rastreoOperaciones()` (renombrado a `__invoke()` o `index()`, a decidir).
- [ ] Actualizar `routes/acciones/reportes.php` para apuntar al nuevo controller.
- [ ] Confirmar que `ReporteController.php` no rompe nada al quitarle este método (no hay otros métodos que lo llamen internamente — verificado, es independiente).
- [ ] No tocar los otros 20 métodos de `ReporteController.php` todavía — se migran cuando les toque su turno en la lista de 15.

## Fase 1 — Quitar Compras + separar Gasto/Ingreso/Transferencia (en vez de "Finanzas")

- [ ] Backend: eliminar la subconsulta de `compras` del `UNION ALL` en `rastreoOperaciones()`.
- [ ] Backend: la subconsulta de `movimientos_financieros` deja de etiquetarse `'Finanzas' as tipo` fijo — usa el nombre real del tipo (`tipos_movimiento_financiero.nombre`, 1=Gasto/2=Ingreso/3=Transferencia). Mismo patrón ya usado en `CuentaController::obtenerHistorialTransacciones()`.
- [ ] Frontend: el `<Select>` de "Tipo de Operación" pasa de 4 opciones (Venta/Compra/Finanzas/Cierre) a Venta/Gasto/Ingreso/Transferencia (+ Cierre según ⚠️1).

## Fase 2 — Arreglar el bug de bindings (mismo patrón que B9 en Cuentas)

Ya confirmado en vivo (ver conversación): `mergeBindings($query)` + `->where('tipo', ...)` posterior corrompe el orden de los bindings cuando hay filtro de fecha/usuario activo a la vez que filtro de tipo. Mismo fix que se aplicó en `CuentaController::obtenerHistorialVentas()`: `addBinding($query->getBindings(), 'where')` en vez de `mergeBindings()`.

- [ ] Aplicar el fix.
- [ ] Test de regresión (mismo patrón que `CuentaTest.php` para B9).

## Fase 3 — Filas colapsables para Venta, con detalle de productos

- [ ] Backend: para cada fila de tipo Venta, cargar sus `venta_detalles` (producto, cantidad, precio_venta, subtotal). Evaluar costo de performance — son queries adicionales por fila visible (25/página), no un problema serio a esa escala, pero revisar si conviene eager-load en bloque en vez de N+1.
- [ ] Frontend: fila padre (Venta) con ícono de expandir/colapsar; al expandir, sub-tabla con columnas Nombre_Producto, Cantidad, Precio, Subtotal. Gasto/Ingreso/Transferencia quedan como fila simple, sin expandir.

## Fase 4 — "Stock final" (según decisión ⚠️2)

Si se elige la opción (A) recomendada:
- [ ] Migración: agregar `stock_posterior` (o nombre similar) a `venta_detalles`.
- [ ] `VentaController` (al crear venta) graba el stock del producto en ese almacén **después** de aplicar el movimiento — mismo momento en que ya se hace `decrement` de `AlmacenProducto.cantidad`.
- [ ] El reporte muestra ese valor para ventas nuevas; para las anteriores a este cambio, la columna queda vacía/"No disponible" — comunicarlo así, no inventar un valor.

## Fase 5 — Resto de columnas (Receptor, Observaciones/Detalles)

- [ ] Receptor: usar `venta.destinatario` (ya existe — nombre, carnet, teléfono, dirección).
- [ ] Observaciones/Detalles: según decisión ⚠️3.

## Fase 6 — Resto de hallazgos ya identificados (limpieza)

- [ ] `CONCAT()` en las subconsultas de Venta/Cierre → reemplazar por construcción del texto en PHP después de paginar (mismo patrón usado en Cuentas para evitar el problema de portabilidad SQLite/MySQL).
- [ ] Drill-down real: cada fila enlaza al registro de origen (`ventas.show`, `transacciones.show`) — mismo patrón implementado en Cuentas.
- [ ] Monto: distinguir moneda (USD/CUP/MLC) en vez de mostrar el número crudo sin símbolo.
- [ ] Exportar PDF: hoy solo exporta la página actual (25 filas) sin avisar — decidir si se deja así con una aclaración en el botón, o se cambia para exportar todos los resultados filtrados (requiere traer todo el resultset sin paginar en el momento de exportar).
- [ ] Rol de acceso, según decisión ⚠️4.

## Fase 7 (prioridad media, emergente) — Reintegrar Compras

No bloquea las Fases 0-6. Se retoma cuando esas estén cerradas y se vea con más claridad cómo encaja Compras en el mismo formato (fila colapsable con detalle de productos, igual que Venta).

- [ ] **Gap de fondo, ya confirmado**: ni `compras` ni `compra_pago` tienen `user_id` (verificado con `Schema::getColumnListing()` sobre ambas tablas) — no hay forma de saber quién hizo una compra pasada. La única pista indirecta es `cuenta_id` (qué cuenta pagó), y desde ahí `user_cuentas` dice quién *puede* usar esa cuenta, no quién *hizo* la compra puntual — no es confiable para "organizar por quién la hizo".
- [ ] Decidir: (A) agregar `user_id` a `compras` y capturarlo desde ahora en `CompraController::store()` (histórico previo sin este dato), o (B) mostrar "Admin/Sistema" como hoy y no resolverlo.
- [ ] Si se agrega, aplicar el mismo patrón que Venta: fila colapsable con detalle de `compra_producto` (producto, cantidad, precio, subtotal).
- [ ] Revisar si "Stock final" (Fase 4) también debe extenderse a Compras (tiene sentido simétrico: cómo quedó el stock después de recibir la mercancía).

---

**Why:** el cliente pidió específicamente este reporte antes que los demás de la lista de 15; Compras se acotó primero para no bloquear el resto, y luego se dejó como Fase 7 de prioridad media ("en forma emergente hasta ver cómo las agregamos") — es un cambio grande que además toca captura de datos (no solo el reporte) en Fase 4 (stock) y potencialmente Fase 7 (`user_id` en compras), así que se documenta como plan de fases en vez de intentarlo de una sola vez.
**How to apply:** confirmar fase por fase antes de codear. Las decisiones ⚠️ se resuelven cuando toque esa fase, no antes. No adelantar la Fase 7 (Compras) hasta cerrar las Fases 0-6.
