# Comparación Mensual — reconstrucción del movimiento real de agosto (1-18)

**Estado: análisis cerrado, implementación NO empezada — no arrancar sin luz verde explícita.** Continúa el trabajo de Fase 4a (ver `dashboard-resumen-financiero-2026-08-12.md` y `dashboard-comparacion-mensual-aviso-despliegue-2026-08-18.md`, ya implementada y lista para producción). Este doc es la fase siguiente, deliberadamente separada para no bloquear el despliegue de hoy.

## Por qué existe este doc

El 2026-08-18, después de implementar el modelo nuevo de "Saldo Acumulado" (movimiento neto del mes, ver Fase 4a), el ancla se capturó ese mismo día a mitad de mes — así que el movimiento real ocurrido entre el 1 y el 18 de agosto quedó fuera del contador (decisión consciente, confirmada con el cliente, ver el doc de aviso de despliegue). El cliente preguntó después por qué esos números (64 ventas por $26,843.20, 5 compras por $254,770.00, etc. — todos reales, verificados directo en las tablas) no aparecían en la tabla, y pidió investigar si se podían "traer" para que el contador arrancara ya con el movimiento real en vez de en 0.

## Lo que se investigó (2026-08-18) — hallazgo central

**`movimientos_financieros` NO es un registro completo de todo lo que mueve el saldo de las cuentas.** Solo es confiable para 3 de los 5 tipos de operación:

| Operación | ¿Toca `saldo_cuenta` directo? | ¿Se registra en `movimientos_financieros`? | ¿Confiable solo con esa tabla? |
|---|---|---|---|
| **Venta** (`VentaController::aprobarVenta`/`anularVenta`) | Sí (increment/decrement) | **Nunca** | No — hay que reconstruir desde `pago_ventas` + columnas de comisión/gestor/mensajero en `ventas` |
| **Compra** (`CompraController::store`) | Sí (decrement) | **Nunca** | No — hay que reconstruir desde `compra_pago` |
| **Gasto** (`GastoController::store`) | Sí, cuando `origen_tipo=cuenta` | Siempre, misma transacción | Sí, completo |
| **Ingreso** (`IngresoController::store`) | Sí, cuando `destino_tipo=cuenta` | Siempre, misma transacción | Sí, completo — **pero ojo:** el tipo se llama "Ingreso por Venta" en el seeder y es engañoso, es un formulario de ingreso manual genérico, no tiene nada que ver con las Ventas reales |
| **Transferencia** (`TransferenciaController::store`) | Sí, ambos lados | Siempre, una fila con snapshot de ambos lados | Sí, completo |

Esto explica exactamente lo que se vio en pantalla: al filtrar `movimientos_financieros` por agosto, solo aparecieron 12 movimientos USD + 1 CUP de tipo "Ingreso por Venta" — nada que ver con las 64 ventas reales, que mueven el dinero por otro camino que esa tabla nunca ve.

La propia app ya documenta este hueco: `CuentaController.php:301-306` trae un comentario explicando por qué Ventas no queda en `movimientos_financieros`, y ya existen 3 métodos (`obtenerHistorialVentas()`, `obtenerHistorialCompras()`, `obtenerHistorialTransacciones()`) que reconstruyen el historial por cuenta desde las fuentes correctas — no hay que inventar el mecanismo, ya existe, solo hay que generalizarlo a "todas las cuentas, agrupado por moneda, en un rango de fechas" en vez de "una cuenta a la vez".

## El riesgo real que frenó la implementación hoy

**Existe un camino de edición de saldo completamente silencioso, sin ningún rastro en ninguna tabla:** `CuentaController::update()` (líneas 527-574) permite a un admin sobrescribir `saldo_cuenta` directo desde el formulario "Editar Cuenta", protegido solo por una contraseña **fija en el código** (`'glorietashop'`, línea 539 — no es la contraseña del usuario, está hardcodeada). Si alguna cuenta se corrigió a mano durante el rango del 1 al 18 de agosto, la reconstrucción tendría un hueco que no hay forma de detectar ni explicar desde ninguna tabla — el riesgo exacto que se quería evitar: un número que se ve preciso pero podría estar mal, sin poder probarlo.

**Antes de implementar la reconstrucción, hay que decidir cómo manejar este riesgo.** Opciones a confirmar con el cliente:
1. Implementar la reconstrucción igual, aceptando que puede haber un pequeño margen de error si hubo ediciones manuales — mostrar el número con una nota de "movimiento reconstruido, puede no incluir correcciones manuales de saldo".
2. Antes de reconstruir, preguntarle al cliente directamente si él (u otro admin) editó algún saldo a mano en ese rango de fechas — si la respuesta es "no", el riesgo baja mucho.
3. Aprovechar y agregar auditoría a `CuentaController::update()` ahora (loguear el cambio en `movimientos_financieros` o una tabla nueva) — cierra el hueco hacia adelante, aunque no resuelve el pasado.

## Hallazgo aparte, no relacionado con este tema — reportar por separado

**Seguridad real, no tocar sin que el cliente lo pida explícitamente:** la "contraseña de seguridad" que protege `CuentaController::update()` (edición directa de saldo) está hardcodeada en texto plano en el código (`'glorietashop'`) en vez de ser la contraseña real del usuario o algo verificado contra la base de datos. Cualquiera con acceso al código fuente (o que la adivine) puede editar saldos sin ninguna verificación real. Vale la pena reportarlo como hallazgo de seguridad aparte — no se toca acá, es un tema distinto al de esta tabla.

## Plan propuesto para cuando se retome (no empezar sin confirmar)

- [ ] Confirmar con el cliente cómo manejar el riesgo de ediciones manuales silenciosas (ver sección de arriba, 3 opciones).
- [ ] Construir la query de reconstrucción por moneda, para el rango 2026-08-01 a la fecha del cierre de esta fase: `movimientos_financieros` (gastos + ingresos + transferencias, ya confiable) UNION `pago_ventas` + deltas de comisión/gestor/mensajero de `ventas` (agrupado por moneda de la cuenta destino) UNION `compra_pago` (agrupado por moneda de la cuenta pagadora, siempre USD).
- [ ] Para Inventario: reconstruir el cambio de valor usando `compra_producto` (agrega stock) − costo de productos vendidos en agosto (`historial_precio_costos` para cambios de precio + costo de línea de venta) — necesita su propio análisis, no cubierto todavía por la investigación de hoy (esa fue solo sobre cuentas, no sobre inventario).
- [ ] Con el número reconstruido y confiable, aplicar como ajuste al `saldo_inicio_mes` ya capturado hoy (fórmula: `saldo_inicio_mes_nuevo = valor_en_vivo_ahora − movimiento_real_reconstruido`), NO borrar/recrear las filas otra vez — así lo de hoy (18 de agosto) queda como el punto de referencia, y el ajuste solo corrige el ancla hacia atrás.
- [ ] Probar contra los números que ya se verificaron hoy en el chat (64 ventas $26,843.20; 5 compras $254,770.00; gastos/ingresos/transferencias por moneda) como caso de aceptación.
- [ ] Verificar con `tinker` + suite completa, mismo rigor que el resto de esta fase.

## Referencias

- `dashboard-resumen-financiero-2026-08-12.md` — Fase 4a, ya implementada y verificada, no depende de esto.
- `dashboard-comparacion-mensual-aviso-despliegue-2026-08-18.md` — checklist de despliegue, ya listo para producción sin esperar esta reconstrucción.
- `app/Http/Controllers/CuentaController.php` — ya tiene los 3 métodos de reconstrucción por cuenta que hay que generalizar (`obtenerHistorialVentas`, `obtenerHistorialCompras`, `obtenerHistorialTransacciones`).
