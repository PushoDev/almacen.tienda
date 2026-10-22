# Resumen de la sesión — 2026-10-22

Se construyó, por fases y con tests, el **aviso al vendedor cuando otra persona altera su inventario o descuenta de sus cuentas**, y su reflejo en el **Cierre de Caja**. El cliente lo pidió así: un admin o moderador puede vender de cualquier almacén (también del de un vendedor) y el vendedor no tenía forma de saberlo. Todo es **solo informativo**: no mueve caja, comisiones ni saldos, y **no hubo migraciones**. Probado en el navegador con datos de prueba (sección 7). La suite completa **no** se corrió; se corrieron los archivos afectados (338 verdes al cierre de las fases, 321 tras el último ajuste del detalle de producto; ver sección 8).

## 1. Reglas del flujo (decididas con el cliente)

| Regla | Detalle |
|---|---|
| A quién se avisa | A los **vendedores asignados al almacén** (`user_almacens`), todos los asignados: no existe un «dueño único». Admin y moderador no reciben estos avisos (ya reciben `VentaCreadaNotification`) |
| A quién nunca | A quien hizo la acción. Al rechazar una solicitud especial tampoco a quien la pidió (ya recibe `VentaEspecialDecisionNotification`) |
| Canales | Campana (`database`) y push del navegador. Síncronas, como el resto |
| Es informativo | No toca caja, comisiones ni saldos. **La comisión es de quien hace la venta** y sale de la cuenta que él configure; **la mensajería sale de la cuenta del almacén** donde se vendió (así ya funcionaba; se verificó leyendo `store()` y `aprobarVenta()`) |
| Un fallo al avisar | Se registra en el log y **nunca tumba** la operación que lo originó |
| El vendedor no aprueba nada | No hay flujo de aprobación para él: la venta se realiza normalmente y solo se le informa |

## 2. Qué se avisa y dónde

| Evento | Quién lo dispara | Notificación | Código |
|---|---|---|---|
| Venta creada | `VentaController::store()` | `VentaEnTuAlmacenNotification` (`vendida`) | tras el commit |
| Venta pendiente anulada | `anularVenta()` | `VentaEnTuAlmacenNotification` (`cancelada`) | tras la transacción |
| Venta completada devuelta | `anularVenta()` | `VentaEnTuAlmacenNotification` (`devuelta`) | ídem |
| Solicitud especial rechazada (web) | `rechazarSolicitudEspecial()` | `VentaEnTuAlmacenNotification` (`rechazada`) | ídem |
| Solicitud especial rechazada (Telegram) | `TelegramWebhookController::rechazarVenta()` | `VentaEnTuAlmacenNotification` (`rechazada`, autor = el admin del chat: no hay sesión) | ídem |
| Compra aprobada | `CompraController::aprobar()` | `StockCambiadoEnTuAlmacenNotification` (`compra`) | un aviso por almacén (una línea puede ir a otro almacén) |
| Importación de Excel confirmada | `ImportacionBorradorController::confirmar()` | `StockCambiadoEnTuAlmacenNotification` (`importacion`) | solo si entraron unidades |
| Importación deshecha | `ImportacionProductoController::revertir()` | `StockCambiadoEnTuAlmacenNotification` (`importacion_revertida`) | tras la reversión |
| Venta aprobada con mensajería externa o comisión | `VentaController::aprobarVenta()` | `VentaDescontoDeTuCuentaNotification` (`mensajeria` / `comision`) | al dueño de la cuenta descontada (`cuenta->users`, rol vendedor), salvo quien aprobó; no en ventas con gestor |

**No avisan (a propósito):** aprobar una solicitud especial por Telegram (no toca stock); la fusión de fichas (reparte filas, no cambia cantidades); movimientos entre almacenes (ya tenían `MovimientoStockNotification`).

### Contenido del aviso
Cada producto sale con su **categoría, marca, modelo, capacidad y color** (los que existan; «N/A» y vacíos se omiten) y **cómo quedó el stock** del almacén: «Luis vendió de tu almacén X (venta #1): 3 × Batería Litio (Energía · Acme · X-200 · 5kWh), ahora hay 7». El stock se calcula al enviar, cuando el cambio ya se hizo. El `toArray()` trae además `productos[]` con `producto_id`, `nombre`, `detalle`, `cantidad` y `stock_actual`. Las líneas del mismo producto se juntan.

## 3. Código nuevo

| Pieza | Para qué |
|---|---|
| `app/Services/AvisoVendedoresAlmacen.php` | Punto único: `porVenta()` y `porCambioDeStock()`. Elige destinatarios, excluye al autor y atrapa los fallos. Lo usan `VentaController`, `CompraController`, las dos de importación y Telegram |
| `app/Notifications/VentaEnTuAlmacenNotification.php` | Venta/anulación/devolución/rechazo. Parámetros `accion` y `autor` |
| `app/Notifications/StockCambiadoEnTuAlmacenNotification.php` | Compra e importación (y su deshacer). Parámetros `tipo`, `resumen`, `lineas`, `url` |
| `app/Notifications/VentaDescontoDeTuCuentaNotification.php` | Dinero descontado de la cuenta de un vendedor al aprobar |
| `app/Notifications/Concerns/DescribeLineasDeStock.php` | Trait: detalle de producto + stock actual, compartido por las dos primeras |

Los enlaces de los avisos de compra e importación llevan a `productos.index`, porque esas pantallas (Compras, Importaciones) son solo de admin y el vendedor no podría abrirlas.

## 4. Cierre de Caja del vendedor

`CierreCajaController::detalleVentasEnMiAlmacen()`, mismo patrón que `detalleOperacionesMultiples()` (se **recalcula por las fechas del cierre**, sin foto en `store()`):

- Solo para `role = vendedor` (`visible: false` para admin y moderador). Si un admin abre el cierre de un vendedor, ve la sección **de ese vendedor** (`$cierreUser`).
- Ventas de los almacenes del vendedor, hechas por otra persona, dentro del periodo; **se excluyen las rechazadas** (nunca bajaron stock). Las `cancelada` y `devuelta` salen marcadas (`revertida`) y **no suman** al resumen (`ventas`, `unidades`).
- Por producto: nombre, código, imagen, categoría, marca, modelo, capacidad, color, cantidad y `stock_actual` (lo que hay hoy en ese almacén).
- **No entra** en el saldo esperado, la caja ni las comisiones. Disponible en `calculos.ventas_en_mi_almacen` (Create) y `ventas_en_mi_almacen` (Show).
- Frontend: `TarjetaVentasEnMiAlmacen` en `resources/js/components/cierres/piezas.tsx`, compartida por `Create.tsx` y `Show.tsx`, **con el formato de la tarjeta «Ventas»** (cabecera degradada ámbar, tabla con imagen, categoría, marca, modelo, capacidad, cantidad en insignia, venta y fecha, quién vendió, «Hoy hay en el almacén» y total de unidades al pie). El «stock actual» no se muestra en las filas revertidas (generaba confusión: es el stock de hoy, no el de esa venta).

## 5. Tests nuevos (18, en archivos existentes)

| Archivo | Tests |
|---|---|
| `VentaTest.php` | 12: aviso al vender (dueño sí, otros no), vendedor que vende en su almacén (no se avisa a sí mismo, sí al compañero), canales campana+push, anular pendiente, devolver completada, vendedor que anula lo suyo, rechazar solicitud especial, servicio sin sesión (Telegram), detalle de producto y stock resultante, y 3 de dinero (mensajería ajena, comisión, dueño que aprueba) |
| `CierreCajaTest.php` | 3: el vendedor lista lo de otros (revertidas marcadas, sin lo propio, lo ajeno ni lo rechazado); admin sin sección; admin abre el cierre guardado de un vendedor |
| `CompraTest.php` | 1: aprobar avisa por almacén, con detalle y stock; no a quien aprobó |
| `ImportacionBorradorControllerTest.php` | 1: confirmar con stock avisa; sin stock no |
| `ProductoImportTest.php` | 1: deshacer avisa con stock 0 |

Helpers añadidos en `VentaTest.php`: `venderDosUnidadesDelAlmacen()` y `crearVentaConStockDescontado()`.

## 6. Decisiones y cosas a saber

- El vendedor con `requiere.turno` necesita un turno activo para vender o anular (los tests usan `crearTurnoActivo()`).
- Compras y Casillero: el stock del **casillero** aún no entra (Fases 3 y 4 sin hacer), así que ese camino no avisa todavía.
- La campana del frontend no reconoce los iconos `package-minus`/`package-plus`/`wallet` y muestra la campana genérica; los colores (`amber`, `green`) sí se aplican. Sin tocar.
- `Cierres/Create.tsx` y `Show.tsx` siguen con sus errores de ESLint y Prettier de antes (variables sin usar, `any`); `piezas.tsx` quedó limpio y con Prettier.
- **Decisión a revisar:** los avisos son informativos pero van también por push (`conPushSi(..., true)`), lo que choca en parte con el ADR 013 («el push solo avisa lo que exige acción»). Lo decidió Claude, no el cliente. Si el volumen resulta alto, dejarlos solo en la campana es cambiar ese `true` por `false` en el `via()` de las tres notificaciones.

## 7. Prueba en el navegador (BD de desarrollo)

Datos de prueba, **dejados en la BD** a propósito:

| Dato | Valor |
|---|---|
| Usuarios | `PRUEBA Admin` (id 12, `prueba.admin@almacen.test`) y `PRUEBA Vendedor` (id 13, `prueba.vendedor@almacen.test`), contraseña de prueba, correo verificado |
| Almacén | `PRUEBA Almacén Aviso` (id 24), asignado al vendedor 13 |
| Producto | `PRUEBA Panel` (id 679), código 694, 50 unidades, precio 20, lote de ajuste |
| Cuenta | `PRUEBA Caja USD` (id 127, 1.000 USD, efectivo) |
| Turno | uno activo para el vendedor 13 («Vera Herrera», nombre aleatorio de la factory) |
| Ventas | #1555 (2 uds, **anulada**) y #1556 (1 ud, **vigente**, pendiente), hechas por Luis Alberto (admin) |

Antes de probar se comprobó que la BD no tenía suscripciones push ni vínculos de Telegram (0 y 0), así que ninguna prueba pudo llegar a personas reales. Resultado: el stock fue 50 → 48 → 50 → 49 y el vendedor recibió los 3 avisos correctos (vendida, cancelada con «el stock volvió», vendida); la campana los muestra; la tarjeta del Cierre se ve con el formato de «Ventas», con #1556 vigente y #1555 tachada y marcada. **No probados en el navegador** (solo con tests): avisos de dinero (comisión/mensajería), compra, importación, rechazo por Telegram y la pantalla de ver un cierre ya guardado.

Para probar hubo que **cerrar la sesión de Luis Alberto** en el navegador del sitio de desarrollo; la sesión del vendedor de prueba quedó abierta.

## 8. Verificación

`vendor/bin/pint --dirty` limpio; `npm run types` sin errores; ESLint limpio en `piezas.tsx`. Tests: 338 verdes en los archivos afectados (Venta, Compra, ImportacionBorrador, ProductoImport, CierreCaja, Notification, NotificacionAnulacion, TelegramMenu) al cerrar las fases, y 321 en los cinco principales tras añadir la categoría y rehacer la tarjeta. **Suite completa sin correr** (la última, el 10-21: 1.029 verdes; esta sesión suma 18 tests nuevos).

## 9. Pendiente

- **Operaciones Múltiples con varias cuentas** (siguiente, mañana): hoy una `remesa` tiene **una** cuenta por lado (entrada, salida y mensajero). Falta definir si las varias cuentas van en la entrada, la salida o ambas, y si cada una lleva su moneda y tasa. Afecta Cierre, Rastreo, Dashboard (margen de remesas) y la anulación. Orientación: una tabla de líneas por remesa, no columnas nuevas.
- Aviso por el stock del Casillero cuando se construyan sus Fases 3 y 4.
- Iconos de la campana para los tipos nuevos.
- Probar en el navegador los avisos de dinero, compra e importación.
