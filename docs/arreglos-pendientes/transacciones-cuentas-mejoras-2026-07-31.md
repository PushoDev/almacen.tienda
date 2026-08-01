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

- [ ] Actualmente `Cuentas/Show.tsx` solo muestra datos estáticos de la cuenta (nombre, tipo, moneda, saldo, notas) — **no hay historial de operaciones**. `CuentaController::show()` (líneas 200-227) tampoco carga ningún `MovimientoFinanciero`.
- [ ] Agregar al controller: cargar los `MovimientoFinanciero` donde la cuenta sea origen o destino (mismo patrón de query ya usado en `CierreCajaController::obtenerDetallesCierre()` para "movimientos que afectan las cuentas del usuario").
- [ ] Agregar a la vista: tabla/listado de operaciones (tipo, monto, moneda, usuario, fecha), idealmente paginado o con filtro de fecha — revisar el gotcha ya documentado en memoria sobre paginación + filtros de Inertia antes de implementar.

---

## Fase 3 — Acceso del vendedor a `Cuentas/Show`

- [ ] **Bug de permisos existente a resolver de paso**: el middleware `CheckCuentaPermission` (línea 16) solo permite `role === 'admin'` (`User::isAdmin()`), pero `Cuentas/Index.tsx` (línea 494) muestra el botón "Ver detalles" también a `moderador`, que al hacer clic recibe un 403. Decidir: ¿moderador debe tener acceso también?
- [ ] Dar acceso a `vendedor` **solo a sus propias cuentas** (`User::cuentas()`, relación many-to-many vía `user_cuentas`, ya usada en Gasto/Ingreso/Telegram) — no a todas las cuentas del sistema.
- [ ] Actualizar `CheckCuentaPermission` (o el controller) para permitir vendedor cuando la cuenta solicitada esté en `auth()->user()->cuentas()`.
- [ ] Mostrar el botón "Ver detalles" en `Cuentas/Index.tsx` para vendedor, pero probablemente **filtrando el listado** para que solo vea sus propias cuentas asignadas (revisar si `Index.tsx`/`CuentaController::index()` ya filtra así para vendedor o si hay que agregarlo).

---

**Why:** varias inconsistencias reales encontradas en `GastoController`/`IngresoController`/`IngresoForm.tsx` durante análisis del 2026-07-31, más el trabajo pedido de exponer historial de cuentas al vendedor.
**How to apply:** ir fase por fase, confirmar las decisiones de negocio marcadas con ⚠️ antes de implementarlas.
