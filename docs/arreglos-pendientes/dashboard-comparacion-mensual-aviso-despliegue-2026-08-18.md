> ⚠️ **SUPERADO 2026-08-19.** La definición de "Saldo Acumulado" descrita en este doc (movimiento neto del mes, arranca en 0.00) se revirtió el mismo día siguiente — el cliente probó el diseño en producción-local y le generó confusión real (un saldo con dinero real se veía en rojo/negativo). "Saldo Acumulado" volvió a ser el saldo total en vivo (igual que Tabla 1/Logística), nunca 0.00 ni negativo salvo que la cuenta esté realmente en descubierto. Ver `dashboard-resumen-financiero-2026-08-12.md` sección "Fase 4a-ter" para el detalle. El aviso de "verás todo en 0.00" y el texto sugerido para el cliente de este doc **ya no aplican** — no lo reutilices en un despliegue futuro sin revisar primero.

# Comparación Mensual — aviso de despliegue y explicación para el cliente

**Para quién es este doc:** para ti (el desarrollador), como referencia rápida antes de actualizar producción y como texto base si necesitas explicarle al cliente por qué la tabla "Comparación Mensual" del `/dashboard` se ve distinta justo después de la actualización. Cubre el cambio hecho el 2026-08-18 (ver [[project_dashboard_resumen_financiero]] / `dashboard-resumen-financiero-2026-08-12.md`, Fase 4a).

## Qué cambió, en una frase

"Saldo Acumulado" dejó de ser el saldo total de las cuentas (que hacía ver cualquier saldo existente como si fuera "ganancia del mes") y pasó a ser el **movimiento real de ese mes** — cuánto entró y salió, arrancando en 0 el día 1. Además se agregó una fila nueva, "Inventario", que seguirá el mismo mecanismo para el valor de costo del stock.

## Despliegue: ya no hace falta ningún paso manual

**Corrección 2026-08-18 (misma sesión):** la primera versión de este doc pedía correr un comando de `tinker` a mano en producción, justo después de migrar. Se quitó ese paso — quedó mal, es fácil de olvidar u operar mal bajo presión en un servidor real. Ahora la migración `2026_08_18_202434_add_saldo_inicio_mes_to_historial_comparacion_mensuals_table` **hace todo sola**: agrega la columna `saldo_inicio_mes` y, en el mismo `up()`, borra la(s) fila(s) del mes en curso que ya existan (creadas bajo el modelo viejo, donde `Saldo Acumulado` era el saldo total). El siguiente acceso al dashboard las regenera solas, con el ancla capturada en ese instante.

**Verificado localmente (2026-08-18) que esto funciona con SOLO `php artisan migrate`, sin ningún comando extra:** se hizo rollback de la migración y se volvió a correr, simulando exactamente el escenario de producción (una fila del mes ya existente antes de migrar) — la migración la borró sola, cero filas quedaron después de migrar, y el siguiente acceso al dashboard las recreó correctamente. Suite completa 170/170 después del cambio.

**Checklist de despliegue, ahora sí simple:**

1. [ ] Subir el código y correr `php artisan migrate` normal — no hace falta ningún comando aparte.
2. [ ] Abrir `/dashboard` una vez (tú, antes que el cliente) para confirmar que las 4 filas (CUP/USD/EUR/Inventario) aparecen en 0.00/0.00/0.00 — es lo esperado.

Si el despliegue ocurre el mismo día 1 de un mes nuevo (o muy cerca), el impacto del "reinicio" es mínimo. Si ocurre a mitad de mes (como pasó hoy en local, día 18), el mes de despliegue va a mostrar movimiento parcial — ver más abajo cómo explicarlo.

## El 0.00 ya no se ve como un error, tampoco

Se agregó una nota visible arriba de la tabla, en `dashboard.tsx` (Comparación Mensual), que explica en una línea qué es "Saldo Acumulado" y aclara que arrancar en 0.00 es normal — no solo para este despliegue puntual, sino **todos los meses**: el día 1 de cada mes (o el primer rato después de las 00:00), todas las filas van a estar en 0.00 hasta que ocurra la primera operación de ese mes. Esa nota queda ahí de forma permanente, así que el cliente nunca más tiene que adivinar por qué ve ceros.

## Qué va a ver el cliente la primera vez que abra el dashboard después de actualizar

Las 4 filas (CUP, USD, EUR, Inventario) en **0.00 / 0.00 / 0.00** — Mes Anterior, Saldo Acumulado y Diferencia todas en cero. Esto es esperado, no un error: significa que el sistema acaba de capturar el punto de partida (el "ancla") en ese instante. A partir de ahí, cada venta/gasto/compra/transferencia que mueva una cuenta va a reflejarse ahí en tiempo real.

## Texto sugerido para explicarle al cliente

> "Cambié cómo se calcula la tabla de Comparación Mensual del panel principal. Antes, esa columna te mostraba el saldo total de tus cuentas como si fuera 'lo que ganaste este mes' — lo cual no era cierto, simplemente era cuánto dinero tenías guardado en total. Ahora sí muestra el movimiento real: cuánto entró y salió durante el mes.
>
> Vas a notar que justo después de esta actualización, todo empieza en cero — es normal, es el sistema marcando 'desde aquí empiezo a contar'. A partir de ahora, cada venta, gasto o compra se va a ir sumando ahí en tiempo real, y vas a poder confiar en ese número.
>
> También agregué una fila nueva: 'Inventario', que hace lo mismo mismo pero con el valor de tu mercancía en stock — así puedes ver si el valor de tu inventario sube o baja mes a mes, no solo el dinero en cuentas.
>
> Un detalle: como el reinicio pasa a mitad de mes, este primer mes va a mostrar menos movimiento del que realmente hubo (solo cuenta desde hoy, no desde el día 1) — es un ajuste de una sola vez. Desde el próximo mes en adelante, el conteo va a estar completo desde el primer día, sin este hueco."

## Qué NO se pierde (para tenerlo claro si el cliente pregunta)

Ningún dato real del negocio se toca ni se borra — ventas, compras, gastos, ingresos, transferencias y saldos de cuentas siguen intactos en sus propias tablas. Lo único que se reinicia es una tabla derivada (`historial_comparacion_mensuals`), que es solo una "foto" calculada para este widget puntual, no la fuente de verdad de nada. Si el cliente quiere ver el detalle de lo que pasó antes del reinicio, **Reportes → Rastreo de Operaciones** sigue mostrando el historial real completo, sin ningún hueco — ese reporte lee directamente las tablas originales, no depende de este mecanismo.

## Referencia técnica

Diseño completo, decisiones y verificación en `dashboard-resumen-financiero-2026-08-12.md` (Fase 4a). Migración: `database/migrations/2026_08_18_202434_add_saldo_inicio_mes_to_historial_comparacion_mensuals_table.php`. Lógica: `DashboardStatsService::actualizarComparacionMensual()`.
