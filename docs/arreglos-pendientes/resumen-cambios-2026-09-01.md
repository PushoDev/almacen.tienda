# Resumen de la sesión 2026-09-01 — saldo anterior/posterior en Venta/Compra + limpieza de seeders para producción

**Para quién es este doc:** referencia rápida de todo lo que se tocó hoy, para retomar directo la próxima sesión. Dos hilos independientes, ambos cerrados y verificados.

## Resumen ejecutivo

| # | Cambio | Estado |
|---|---|---|
| 1 | Venta y Compra capturan `saldo_anterior`/`saldo_posterior` de cada cuenta/cliente/proveedor que tocan (mismo patrón que ya tenían Gasto/Ingreso/Transferencia) | ✅ Implementado, Fases 1-2 |
| 2 | Rastreo de Operaciones muestra ese saldo para Venta/Compra + motivo de anulación de Venta | ✅ Implementado, Fase 3 |
| 3 | Cuentas/Clientes/Proveedores (`Show.tsx` de cada uno) también muestran el saldo antes/después en su propio historial | ✅ Implementado, Fase 4 |
| 4 | `DatabaseSeeder.php` sincronizado con la producción real (11 usuarios, 24 almacenes, 15 categorías) | ✅ Implementado |
| 5 | Bug real encontrado y corregido: `db:seed` se hubiera caído a mitad de camino mañana | ✅ Corregido |

258/258 tests en verde. Pint limpio. Verificado en navegador con operaciones reales (datos de prueba aislados, creados y borrados en la misma sesión) y con datos reales existentes. Nada de esto se commiteó — el cliente pidió no tocar git, lo maneja él.

---

## 1-3. Saldo anterior/posterior en todas las operaciones

**El pedido original:** el cliente preguntó si al hacer una operación con una cuenta/cliente/proveedor se muestra en algún lado el saldo que tenía antes. La respuesta encontrada: Gasto/Ingreso/Transferencia ya lo hacían (vía `movimientos_financieros`, columnas `saldo_anterior_origen/destino`), pero Venta y Compra —las operaciones de mayor volumen— no capturaban nada, y ni siquiera lo que Gasto/Ingreso/Transferencia capturaban se mostraba en las páginas propias de Cuentas/Clientes/Proveedores, solo en Rastreo de Operaciones.

**Diseño:** columnas nuevas junto a cada "pata" del movimiento (no una tabla polimórfica nueva) — Venta puede tocar hasta 5 entidades en una operación (cada pago + comisión PV + gestor + mensajero), Compra hasta 3 (receptor + cada pago).

- **Fase 1 (Venta):** migraciones en `pago_ventas` (+`saldo_anterior`/`saldo_posterior`) y `ventas` (+6 columnas para comisión PV/gestor/mensajero). `VentaController::aprobarVenta()` captura el saldo antes de cada `increment()/decrement()`. `anularVenta()` no se tocó a propósito — no debe pisar el snapshot de la aprobación original.
- **Fase 2 (Compra):** migraciones en `compra_pago` (+`saldo_anterior`/`posterior`) y `compras` (+`receptor_saldo_anterior`/`posterior`). `CompraController::store()` captura antes de cada mutación. Compra es inmutable (sin `update()`/`destroy()`), no hay reversión que sincronizar.
- **Fase 3 (Rastreo de Operaciones + motivo de anulación, este último idea del cliente sobre la marcha):** `RastreoOperacionesController::transformarVenta()`/`transformarCompra()` arman un array `movimientos_saldo` (una entrada por pata tocada, con etiqueta) reutilizando el shape de `entidadMovimiento()` que ya usaban Gasto/Ingreso/Transferencia. Frontend reutiliza `EntidadMovimientoCard` tal cual (cero componentes nuevos) — antes se llamaba fijo para origen/destino, ahora también itera sobre el array nuevo. Se agregó `detalle_venta.anulacion` (motivo + detalle) cuando `estado === 'cancelada'`, con una tarjeta roja "⚠ Venta Anulada" nueva en el frontend.
- **Fase 4 (páginas propias de Cuentas/Clientes/Proveedores):** el dato ya existía en BD desde las Fases 1-2, solo faltaba exponerlo. `CuentaController` (3 métodos privados `obtenerHistorial*`, construyen SQL crudo con query builder) necesitó agregar las columnas al `SELECT` explícito. `ClienteController`/`ProveedorController` no necesitaron cambios de query — dumpean modelos Eloquent completos sin `$hidden`, así que el dato ya viajaba al frontend; solo hubo que agregar `saldo_anterior`/`saldo_posterior` al `withPivot()` de `Cliente::comprasComoPagador()` y mostrar una línea compacta bajo el monto en cada tabla/tarjeta donde ya se veía (patrón consistente: `"95.00 → 105.00"` en texto muted pequeño, nunca una columna nueva).

**Verificado en navegador con operaciones reales:** se crearon una Compra y una Venta de prueba con entidades aisladas nombradas `QA-TEST *` (nunca se tocaron cuentas/clientes/proveedores reales), se aprobó la venta (pago con cuenta + comisión PV), se confirmó el saldo correcto en Rastreo de Operaciones, se anuló la venta vía el endpoint real y se confirmó que el motivo aparece sin pisar el snapshot original de la aprobación. Todo el rastro de prueba se borró al final (venta, compra, producto, 2 cuentas, cliente, proveedor, destinatario) dentro de una transacción, verificado con el dashboard volviendo exacto al Capital Financiero original. Después, verificación adicional con una cuenta real existente (ACIELO) confirmó que las transacciones viejas (con snapshot ya guardado desde antes) muestran el rango de saldo correctamente, y las filas de antes de esta iniciativa (sin snapshot) no muestran nada — comportamiento esperado, no un bug.

**Tests nuevos:** 5 en `VentaTest.php`, 4 en `CompraTest.php`, 4 en `RastreoOperacionesTest.php`, 4 en `CuentaTest.php` (extendidos), `ClienteTest.php` (no existía, creado con 1 test), 1 test agregado a `ProveedorTest.php`.

**Migraciones nuevas que faltan correr en producción** (aditivas, sin riesgo, pero el código falla sin ellas):
1. `add_saldo_snapshot_to_pago_ventas_table`
2. `add_saldo_snapshot_to_ventas_table`
3. `add_saldo_snapshot_to_compra_pago_table`
4. `add_receptor_saldo_snapshot_to_compras_table`

Ver memoria `project_saldo_anterior_posterior_operaciones` para el detalle completo.

---

## 4-5. Limpieza de `DatabaseSeeder.php` para producción

**El pedido:** el cliente va a correr `php artisan migrate:fresh` + `php artisan db:seed` mañana para arrancar de cero, y pidió que el seeder deje exactamente: los 11 usuarios reales con sus roles, los 24 almacenes reales, las 15 categorías reales, y las cuentas base que ya tenía el seeder (sin cambios ahí).

**Lo que se encontró:** el seeder estaba desactualizado respecto a la producción real —

- Faltaban 2 de los 11 usuarios ("Venta Oficina", "Gestion 2") — agregados con contraseñas temporales (`oficina2025`, `gestion22025`) a falta de las reales (el cliente prefirió esto a dar las contraseñas reales por chat). El usuario `soporte.general@glorietashop.com` se llamaba "Auditoria Glorieta" en el seeder pero "Gestion 1" en producción — corregido.
- Los 24 almacenes reales casi no coincidían en nombre/tipo con los ~29 que tenía el seeder (ej. `TIENDA LA SALUO` → `LA SALUD ALMACEN`; faltaban ALI EXPRESS, AMAZON, CHINA, DANIEL, EBAY, CARLITIN, etc.) — reemplazada la lista completa por los 24 reales exactos.
- Las 15 categorías reales tampoco coincidían del todo (`USO PERSONAL` ya no existe, faltaban CELULAR/OTROS/JUGUETERIA/TRASPORTE/AUDIO-VISUALES) — reemplazada la lista completa.
- Los 5 "clientes de ejemplo" que creaba el seeder se quitaron (decisión del cliente: no los había pedido).
- Las cuentas base (5 sucursales × 3 monedas = 15 cuentas) se dejaron sin tocar, tal como se pidió.

**Bug real crítico encontrado y corregido:** el seeder todavía tenía `'deuda' => 0` al crear las cuentas — columna eliminada hace tiempo (`drop_deuda_from_cuentas_table`). En uso normal Eloquent la descarta en silencio (no está en `$fillable`), por eso nunca se notó. Pero `php artisan db:seed` envuelve **todo el proceso** en `Model::unguarded()` (ver `Illuminate\Database\Console\Seeds\SeedCommand::handle()`) — con el guard desactivado, el INSERT sí intenta escribir en la columna inexistente, y el seeder se hubiera caído a mitad de camino justo al llegar a las cuentas, dejando la base a medio poblar. Se encontró reproduciendo el fallo específicamente con `$this->seed()` en un test (no reproducía llamando el seeder directo o con `Cuenta::create()` suelto en tinker, porque esos caminos sí respetan el guard) — quitada la clave.

**Verificado:** `tests/Feature/DatabaseSeederTest.php` (nuevo, corre contra SQLite en memoria, nunca tocó la base real) confirma los conteos y valores exactos. Nada de esto se corrió contra la base real — solo se editó el archivo del seeder.

Ver memoria `project_seeder_limpieza_produccion_2026_09_01` para el detalle completo.
