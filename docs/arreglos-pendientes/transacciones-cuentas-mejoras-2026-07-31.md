# Pendiente: Arreglos en Transacciones (Gastos/Ingresos) + Historial y acceso vendedor en Cuentas

## Objetivo

1. Arreglar inconsistencias en los formularios/controllers de Gastos e Ingresos.
2. Agregar historial de movimientos (operaciones) a `Cuentas/Show.tsx`.
3. Dar acceso al vendedor para entrar a `Cuentas/Show` y ver las operaciones de sus cuentas.

Se trabaja por fases, en orden. Marcar cada ítem al completarlo.

---

## Fase 1 — Gastos e Ingresos (`resources/js/pages/Transacciones/`)

- [ ] **`IngresoForm.tsx` ignora las props del padre.** `Transacciones/layouts/Movimientos.tsx` le pasa `cuentasDestino`, `clientes`, `proveedores`, `monedasActivas`, pero el componente no las recibe — hace su propio `axios.get(route('transacciones.ingreso.data'))` en un `useEffect` (líneas 65-74), duplicando la carga que ya hizo el padre. Arreglar para que use las props como `GastoForm.tsx` ya hace correctamente.
- [ ] **Toasts manuales en vez de `sonner`** (confirmado por el usuario, no es prioridad inmediata). `GastoForm.tsx` e `IngresoForm.tsx` usan `setAlert`/`setTimeout` propios (líneas ~63-66 en ambos) en vez de `toast`/`Toaster` de `sonner` (`package.json`: `"sonner": "^2.0.7"`, ya instalado y en uso en `Movimientos/Index.tsx`). Reemplazar los alerts manuales por `sonner` siguiendo ese mismo patrón cuando se llegue a este ítem.
- [ ] **Regla de negocio inconsistente entre `GastoController` e `IngresoController`** (⚠️ decisión de negocio, confirmar con el usuario antes de tocar):
  - `GastoController::store()` (línea ~60) exige `tipo_titular === 'personal'` cuando un vendedor gasta de una cuenta asignada.
  - `IngresoController::store()` (línea ~72-77) NO tiene esa misma restricción — un vendedor podría ingresar dinero a una cuenta externa.
  - **Pregunta a resolver**: ¿debe `IngresoController` tener la misma restricción, o es intencional que ingresar a cuentas externas esté permitido y solo gastar de ellas no?
- [ ] **Sin límite de saldo negativo.** Ni `GastoController` ni `IngresoController` validan que `monto` no deje la cuenta en negativo sin control. Confirmar si debe haber un límite/aviso.
- [ ] **Duplicación**: `obtenerCodigosMonedasActivas()` está copiado idéntico en `GastoController` e `IngresoController` (líneas ~121-127 y ~148-154). Extraer a un trait o servicio compartido.
- [ ] **Código muerto**: `resources/js/pages/Transacciones/Create.tsx` — placeholder sin ruta que lo use (título "Historial", botones `Link href="#"`, bloques `PlaceholderPattern` sin datos). Candidato a eliminar.

---

## Fase 2 — Historial de movimientos en `Cuentas/Show.tsx`

**Completa (backend + frontend + test), 2026-08-01.**

- [x] **Hallazgo que amplió el alcance**: `saldo_cuenta` no se toca solo desde `MovimientoFinanciero` (Gasto/Ingreso/Transferencia) — `VentaController::aprobarVenta()` y `CompraController::store()` también hacen `increment`/`decrement` directo sin loguear nada en `movimientos_financieros`. Un historial que solo mirara esa tabla habría quedado incompleto (silenciosamente sin pagos de venta, comisiones PV/gestor, mensajería ni pagos de compra).
- [x] **Arquitectura final (refactor tras feedback del usuario "no sirven 3 tablas planas")**: en vez de un único `obtenerHistorialCuenta()` con una tabla combinada, `CuentaController` tiene 3 métodos separados — `obtenerHistorialTransacciones()` (`movimientos_financieros`), `obtenerHistorialVentas()` (`pago_ventas` + `ventas` directo para comisión PV/gestor/mensajería externa, unidos por `UNION ALL`), `obtenerHistorialCompras()` (`compra_pago`) — cada uno paginado por separado (`pagina_transacciones`/`pagina_ventas`/`pagina_compras` como nombres de página independientes, así las 3 tablas paginan sin pisarse). El `movimiento_financiero` usa el delta `saldo_posterior - saldo_anterior` del lado que corresponda (no reconvierte monedas a mano).
- [x] **Compras se excluye para `vendedor`** (decisión del usuario, 2026-08-01): mismo criterio que `precio_compra`/costo, ya ocultos a ese rol en el resto del sistema. `obtenerHistorialCompras()` ni siquiera se llama cuando el rol no es admin/moderador (se devuelve un paginador vacío) — no es solo un filtro de display.
- [x] Evité `CONCAT()`/`||` en el SQL crudo (a diferencia de `ReporteController::rastreoOperaciones()`, que usa `CONCAT()` y por eso probablemente nunca tuvo test — production es MySQL pero los tests corren en SQLite, donde `CONCAT()` no existe). Los textos tipo "Venta #123" se arman en PHP después de paginar (`->getCollection()->transform()`), no en SQL.
- [x] **Filtros por Card** (búsqueda + tipo + rango de fechas, backend real vía query params con prefijo por card — `q_ventas`, `tipo_ventas`, `desde_ventas`, `hasta_ventas`, etc.). Al implementarlos se encontró **bug B9** (ver `ESTADO_DESARROLLO.md`): agregar `->where()` sobre la query de Ventas (armada con `UNION ALL` embebida vía `DB::raw()`) DESPUÉS de `mergeBindings($query)` corrompía el orden de los bindings — el filtro por tipo devolvía filas de un tipo distinto. Fix: `addBinding($query->getBindings(), 'where')` en vez de `mergeBindings()`.
- [x] **Drill-down real**: cada fila del historial tiene un botón que enlaza al registro real de origen (`ventas.show`, `transacciones.show`, `comprar.show`) — sin esto las filas eran texto plano sin forma de "entrar" a ver el detalle completo (comisión pedido por el usuario tras la primera versión). "Contraparte" se corrigió para mostrar el cliente/proveedor real (antes duplicaba el nombre del usuario, columna redundante).
- [x] Rediseño visual siguiendo el patrón de `Proveedores/Show.tsx` y `Clientes/Show.tsx`: tarjetas de info con íconos, mini-cards de estado financiero con `border-l-4`, badges con ícono+color por tipo de operación, estado vacío ilustrado.
- [x] Test: `tests/Feature/CuentaTest.php` (10 tests) — cubre acceso (Fase 3), que cada fuente aparece con el signo/monto correcto, que ventas no-completadas se excluyen, que compras se oculta a vendedor pero no a admin, y 2 tests de regresión específicos del bug B9 (filtro por tipo, búsqueda + rango de fechas).

---

## Fase 3 — Acceso del vendedor a `Cuentas/Show`

**Completa (backend + frontend + test), 2026-08-01.**

- [x] **Decisión tomada**: `moderador` tiene acceso pleno (igual que admin) — mismo criterio que el resto del sistema (`moderador` = "admin sin destructivos", ver acciones ya existentes en `CuentaController::index()`). Resuelve el bug de que `Index.tsx` mostraba el botón a moderador pero el middleware daba 403.
- [x] `vendedor` accede solo si la cuenta está en `auth()->user()->cuentas()` — mismo patrón ya usado en Gasto/Ingreso/Transferencia.
- [x] La ruta `cuentas/{cuenta}` (`show`) se sacó del grupo de middleware `check.cuenta.permission` (que sigue siendo admin-only, sin cambios, para `edit`/`update`/`destroy`) — el chequeo de acceso ahora vive dentro de `CuentaController::show()` directamente (`abort(403)` si no es admin/moderador y la cuenta no está en sus cuentas asignadas).
- [x] `Cuentas/Index.tsx`: el botón "Ver detalles" ahora se muestra también a `vendedor` (columna "Acciones" ya no se oculta entera); `Editar`/`Eliminar` siguen ocultos para ese rol. `Cuentas/Show.tsx` oculta "Editar Cuenta" con el prop `puedeEditar`. Verificado en navegador logueado como vendedor: ve el ícono de detalle, no ve editar, no ve mención a "pagos de compra" en el historial.

---

**Why:** varias inconsistencias reales encontradas en `GastoController`/`IngresoController`/`IngresoForm.tsx` durante análisis del 2026-07-31, más el trabajo pedido de exponer historial de cuentas al vendedor.
**How to apply:** ir fase por fase, confirmar las decisiones de negocio marcadas con ⚠️ antes de implementarlas.
