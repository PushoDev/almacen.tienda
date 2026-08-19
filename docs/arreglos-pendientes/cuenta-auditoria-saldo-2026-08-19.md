# Cuentas — auditoría real del ajuste manual de saldo

**Estado: implementado y verificado 2026-08-19.** Cierra el hallazgo de seguridad reportado en `dashboard-comparacion-mensual-reconstruccion-agosto-2026-08-18.md` ("Hallazgo aparte") y desbloquea la Fase 4a-bis (reconstrucción de agosto 1-18) de `dashboard-comparacion-mensual-reconstruccion-agosto-2026-08-18.md`.

## Qué había

`CuentaController::update()` (líneas 527-574) permitía a un admin sobrescribir `saldo_cuenta` directo desde "Editar Cuenta" con dos problemas:

1. La "contraseña de seguridad" comparaba el input contra el string literal `'glorietashop'` hardcodeado en el código — no era la contraseña real de nadie, no se podía rotar sin deploy, cualquiera con acceso al código la conocía.
2. El cambio de saldo no dejaba ningún rastro: ni quién lo hizo, ni cuándo, ni de cuánto a cuánto, ni por qué.

## Qué se hizo

Decisiones confirmadas con el cliente vía `AskUserQuestion` antes de implementar:
- Verificación de contraseña: la contraseña real del admin autenticado (`Hash::check` contra `auth()->user()->password`), no una contraseña de seguridad separada.
- Registro de auditoría: tabla nueva dedicada, no reutilizar `movimientos_financieros` — esa tabla alimenta Rastreo de Operaciones y CierreCaja, que asumen que solo contiene eventos de negocio reales (Gasto/Ingreso/Transferencia); meter un "ajuste manual" ahí distorsionaría esos cálculos.

**Implementado:**
- [x] Migración `2026_08_19_150100_create_ajustes_saldo_cuenta_table.php` — tabla `ajustes_saldo_cuenta`: `cuenta_id`, `user_id`, `saldo_anterior`, `saldo_nuevo`, `motivo` (texto obligatorio), timestamps.
- [x] Modelo `App\Models\AjusteSaldoCuenta` con relaciones `cuenta()`/`user()`.
- [x] `CuentaController::update()`: reemplazado el check hardcodeado por `Hash::check()`; se exige `motivo_ajuste_saldo` (requerido solo cuando el saldo cambia); se crea un `AjusteSaldoCuenta` dentro del mismo request cuando `saldoCambio` es true.
- [x] `Cuentas/Edit.tsx`: label del campo cambiado de "Contraseña de Seguridad" a "Su Contraseña" (ya no es una clave compartida); nuevo campo "Motivo del Ajuste" (Textarea, obligatorio, solo visible cuando el saldo cambió), con validación en cliente además de la del backend.
- [x] Migración corrida localmente, tabla verificada. Suite completa relacionada (`CuentaTest`, `TransaccionFinancieraTest`, `CierreCajaTest`, `RastreoOperacionesTest`, `VentaTest`, `CompraTest` — 44 tests) sigue en verde, sin regresiones. `Hash::check` verificado por tinker contra un admin real.

## Iteración de UX (mismo día): contraseña/motivo en Dialog, no inline

Cliente pidió que la contraseña y el motivo no aparezcan como campos sueltos en el formulario de "Editar Cuenta" — prefirió un `Dialog` de confirmación (mismo patrón ya usado en `Productos/Vendor/Index.tsx` para el precio masivo: ícono `ShieldAlert`, contraseña con mostrar/ocultar, footer Cancelar/Confirmar). Solo cambió `Cuentas/Edit.tsx`, el backend no se tocó — sigue esperando los mismos campos (`security_password`, `motivo_ajuste_saldo`) en el mismo request.

- [x] `submit()`: si el saldo cambió, ya no envía directo — abre el `Dialog` (`isSaldoDialogOpen`).
- [x] `Dialog` muestra el saldo actual → saldo nuevo, pide contraseña y motivo, botón "Confirmar cambio" deshabilitado hasta llenar ambos.
- [x] Si el saldo no cambió, el formulario se comporta exactamente igual que antes (sin diálogo).
- [x] Verificado: eslint limpio (el único error reportado es preexistente, `usePage() as any` en la línea 63, no relacionado), diff manual de tags JSX vs imports sin huecos, suite `CuentaTest` (10 tests) en verde.

## Pendiente, no hecho todavía

- [ ] No hay ningún lugar en la UI que muestre el historial de `ajustes_saldo_cuenta` todavía (ni en "Editar Cuenta" ni en el historial de la cuenta) — solo se registra, no se visualiza. A decidir si hace falta y dónde.
- [ ] No se escribió un test automatizado nuevo para este flujo específico (contraseña real + motivo obligatorio + registro creado) — se verificó manualmente vía tinker y lectura de código, no vía test de feature.
- [ ] Verificación en navegador — pendiente, el cliente la hará él mismo (mismo patrón que Fase 4a).

## Siguiente paso relacionado

Con esto resuelto, la Fase 4a-bis (reconstrucción del movimiento real de agosto 1-18 en Comparación Mensual) queda desbloqueada del lado de "hacia adelante" — sigue pendiente confirmar con el cliente si hubo alguna edición manual de saldo *antes* de esta fecha (2026-08-19), ya que esas ediciones anteriores a este cambio no quedaron auditadas. Ver `dashboard-comparacion-mensual-reconstruccion-agosto-2026-08-18.md`.
