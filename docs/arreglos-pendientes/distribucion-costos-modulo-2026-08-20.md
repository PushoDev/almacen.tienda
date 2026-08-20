# Distribución de Costos — módulo nuevo, reemplaza el prorrateo de `TransaccionController` (2026-08-20)

Continuación same-day de [[project_costo_promedio_ponderado]] v3 — esto es **Fase 3** del plan de 5 fases confirmado con el cliente (Compras → Lotes → **Distribución de Costos** → Movimientos → Visibilidad). Fase 1 (identidad de producto por precio exacto en `CompraController::store()`) ya estaba implementada al empezar esta sesión.

## Qué existía antes

El prorrateo de costos vivía enterrado dentro de `TransaccionController.php` (`mostrarFormularioDistribucion()` / `distribuirCostosManual()`), sin entrada en el sidebar, solo alcanzable desde un botón dentro de una compra específica. La fórmula manual tenía un bug real: el monto que el usuario tecleaba se sumaba directo al costo unitario sin dividir entre las unidades (`nuevoCosto = costoActual + montoIngresado`), inflando el costo muy por encima de lo correcto en productos con muchas unidades.

## Qué se construyó

**Módulo separado, independiente de Transacciones** (instrucción explícita del cliente: "romper la vista y la fórmula vieja", no reutilizar nada de `TransaccionController`):

- `DistribucionCostosController.php` (nuevo) — `index()`, `mostrarFormularioDistribucion()`, `distribuirCostosManual()`, `historial()`, `show()`.
- Rutas nuevas en `routes/acciones/distribucion-costos.php` (antes vivían 3 rutas de prorrateo dentro de `transacciones.php`, ya removidas de ahí).
- Entrada de sidebar activada (`app-sidebar.tsx`, antes apuntaba a `#`).
- 3 tablas pivote nuevas: `cost_distribution_cuentas` (una distribución puede financiarse con varias cuentas, CUP y USD mezcladas), `cost_distribution_compras` (una distribución puede cubrir varias compras a la vez — "lote", sin necesitar un `lote_id` formal en el schema), y una columna `user_id` agregada a `cost_distributions` (no existía — no se sabía quién hacía cada prorrateo).

### La fórmula (reemplaza la manual por completo, confirmada paso a paso con el cliente usando datos reales de las compras #10/#11)

```
peso_producto      = (costo_actual × cantidad) / total_de_la_compra_del_lote
monto_asignado     = peso_producto × total_usd_a_distribuir
costo_adicional    = monto_asignado / cantidad          ← la corrección clave, antes se omitía
nuevo_costo        = costo_actual + costo_adicional
```

Propiedad verificada con el cliente (resolvía su preocupación de que un producto barato, ej. una olla arrocera, subiera tanto como uno caro): el **% de aumento sale idéntico para todos los productos de la compra**, sin importar su precio — la fórmula reparte proporcional al valor que cada uno ya representaba, nunca "infla" un producto barato más que uno caro en términos relativos.

Las cuentas pueden ser CUP o USD, mezcladas; CUP se convierte a USD con una tasa de cambio editable por operación (default: la tasa CUP general del sistema). El backend recalcula todo desde cero al confirmar — no confía en ningún monto que mande el navegador, evitando que alguien manipule el reparto desde el cliente.

### Verificado en vivo (no solo con tests)

Con datos reales de las compras #10 (3 productos) y #11 (1 producto, MOTRINA a otro precio — total lote $121.640,00) y $701,67 USD a distribuir: el navegador mostró exactamente los montos calculados a mano de antemano ($129,79 / $10,04 / $8,08 / $553,77), confirmando que el cálculo del formulario (preview en vivo) y el del controlador (al confirmar) coinciden.

### Historial y detalle (control/auditoría, pedido explícito del cliente: *"un historial de esta operación y lotes de compras que ya implementaron esta situación"*)

- `DistribucionCostos/Historial.tsx` (`/distribucion-costos/historial`) — listado paginado de todas las distribuciones confirmadas, filtrable por fecha o por `compra_id` (usado por el botón "Detalles" del listado principal).
- `DistribucionCostos/Show.tsx` (`/distribucion-costos/{id}`) — resumen de la operación (fecha, compras del lote, cuentas + monto + tasa, usuario, comentario), desglose por producto (misma tabla que el formulario), e **historial de costo completo por producto** (todas las distribuciones que tocaron ese producto en el tiempo, no solo esta, vía la relación `Producto::costoHistorial()` agregada) — la fila de esta distribución se resalta con badge "Esta distribución".
- Todo persistido en 5 tablas reales, nada es solo cálculo de pantalla: `cost_distributions`, `cost_distribution_items`, `cost_distribution_cuentas`, `cost_distribution_compras`, `costo_historials`.

### UX

- `DistribucionCostos/Index.tsx`: acciones de fila pasaron de botones con texto ("Distribuir"/"Detalles", desalineados cuando solo uno de los dos aparecía) a solo íconos con `Tooltip`, orden Detalles → Distribuir, columna de ancho fijo para que la fila quede pareja siempre.
- Bug real encontrado y corregido en el camino: el botón "Detalles" del listado apuntaba al mismo formulario de distribución (hubiera vuelto a abrir el formulario para prorratear de nuevo, no a mostrar lo ya aplicado) — ahora apunta al historial filtrado por esa compra.
- Bug real encontrado y corregido en `show()`: `Undefined variable $distribucion` dentro de un closure que no la traía en su `use()`.

## Estado

**172/172 tests siguen verdes** (no se agregaron tests automatizados nuevos para este módulo — todo se verificó en navegador contra datos reales, mismo criterio que el resto de esta sesión). **Sin commitear**, mismo patrón que el resto del trabajo de este proyecto (revisión del cliente antes de commit).

## No hecho, fuera de alcance hoy

- Fase 2 formal ("lotes de compras" como concepto de schema con `lote_id`) — cubierta de facto por la selección múltiple vía query string (`?compras[]=10&compras[]=11`), sin necesitar la tabla/columna que se había planteado originalmente.
- Fase 4 (la misma regla de prorrateo dentro de `MovimientosController::recibir()`).
- Fase 5 completa — el sidebar y el índice ya están (parte de esta sesión), falta el widget de dashboard (conteo de pendientes) mencionado en el plan original.
- Ningún test automatizado (`DistribucionCostosControllerTest` o similar) — todo lo nuevo (`historial()`, `show()`, la fórmula automática) solo tiene verificación manual en navegador.

**Por qué importa:** esto es la primera fase de código real del thread completo *Distribución de Costos*, y cierra el hallazgo original de que ninguno de los dos mecanismos viejos (`distribuirCostosManual`/`gastoTransportacion`) era idempotente ni dejaba rastro de quién ni cuándo se prorrateó — ahora hay historial real y auditable.
**Cómo aplicar:** al retomar este hilo, la Fase 3 está cerrada — no reproponer la fórmula manual vieja ni el mecanismo aditivo sin dividir por cantidad, ese bug ya está identificado y resuelto. Próximo paso natural (no arrancar sin confirmar con el cliente primero, mismo criterio que el resto del thread): Fase 4 (`MovimientosController::recibir()`) o el widget de dashboard de Fase 5.
