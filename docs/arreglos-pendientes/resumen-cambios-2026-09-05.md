# Resumen de cambios — 2026-09-05

## 1. Impresión de venta — doble copia (cliente + punto de venta)

**Pedido del cliente:** al imprimir una venta, debe salir por duplicado — una copia se la lleva el cliente, la otra se queda en el punto de venta como comprobante/garantía.

**Análisis previo (sin tocar código):** el diseño ya tenía un reparto Ticket(interno)/Factura+Garantía(cliente) en `Vendor/Imprimir.tsx`, pero no era un duplicado real — el Ticket que se quedaba en la tienda no llevaba garantía, firma ni QR, y la mitad inferior de la hoja A4 quedaba en blanco sin usar.

**Solución implementada** (idea final del cliente: llenar la mitad en blanco con el mismo contenido):

- El bloque Ticket+Factura (Página 1) y el bloque de las 31 cláusulas de garantía (Página 2) se extrajeron a variables reutilizables (`contenidoTicketFactura`, `contenidoGarantia`) dentro de `resources/js/pages/Vendor/Imprimir.tsx`.
- Cada página pasó de `min-h-[148.5mm]` a `min-h-[297mm]` (hoja A4 completa), con **dos copias** hijas, cada una `position: absolute` + `top: 0` / `top: 148.5mm` — ancladas por offset fijo en milímetros, no por el alto realmente renderizado, para no reintroducir el bug ya documentado de Chrome (`docs/patron-...` / memoria `reference_chrome_print_minheight_overflow_bug`: un contenedor con `min-height` puede salir más corto en el PDF real que en pantalla).
- La línea de corte que ya existía a la mitad de la hoja ahora separa las dos copias reales; el label pasó a "línea de corte — cliente arriba, punto de venta abajo".

**Verificado:** ESLint limpio, los 4 tests de `ventas.imprimir` en `VentaTest.php` siguen pasando (cambio puramente de JSX, sin tocar controlador/props), browser-verificado contra la venta real #400, y **confirmado por el cliente en un PDF real** — el corte cae bien en la mitad física.

## 2. `exportToPDF` de Rastreo de Operaciones — columnas desincronizadas, corregido

Hallazgo arrastrado desde el 2026-08-06 (Fase 8 del rediseño de Rastreo de Operaciones): el botón "Exportar PDF" seguía generando un PDF con 9 columnas viejas (`Fecha, Referencia, Cuenta Envía, Monto, Cuenta que Recibe, Monto, Tasa, Usuario, Detalles`), mientras la tabla en pantalla tiene 7 (`Referencia, Cuenta Envía, Monto, Cuenta que Recibe, Monto, Tasa de la Operación, Detalles` — sin Fecha ni Usuario).

**Fix:** `tableData`/`head` de `exportToPDF()` (`RastreoOperaciones.tsx`) ahora arman exactamente las mismas 7 columnas que se ven en pantalla. Verificado: ESLint limpio, 35/35 tests de `RastreoOperacionesTest` pasando (backend no se tocó).

## 3. Prioridad del módulo Reportes bajada explícitamente

El cliente confirmó que los 14 reportes restantes del módulo `/reportes/*` (incluyendo `ProductosMasVendidos.tsx`, que sigue siendo un archivo vacío) quedan en **prioridad baja** — se trabajarán según petición explícita del cliente, no de forma proactiva. No se debe seguir ofreciendo este módulo en un resumen general de pendientes salvo que el cliente lo pida.

## 4. "Atendido por" / turno de vendedor — diseño refinado, IMPLEMENTACIÓN PAUSADA

Se retomó la idea de un modal diario para capturar el vendedor de turno (ver memoria `project_atendido_por_idea`). Se confirmaron dos decisiones de diseño:

- El modal se dispara **por usuario** (empleado), una vez al día — no por almacén, aunque el mismo usuario maneje varios almacenes el mismo día.
- Al otro día, el campo se autocompleta con el valor de ayer, pero queda editable.

**No se implementó nada** — el cliente pidió detenerse antes de crear el modelo/controlador/frontend ("Voy hablar con el cliente para hacerlo luego"). Solo quedó un archivo de migración vacío creado y luego borrado en la misma sesión, sin dejar rastro. Retomar cuando el cliente confirme.

## 5. Cliente de prueba en base de datos — confirmado que se queda

El cliente de prueba "QA Test Cliente Refresh" (id 50, teléfono 55512345), creado el 2026-09-02 durante una verificación en navegador, se queda tal cual — el usuario confirmó que esta es una base de datos de desarrollo, no hace falta borrarlo.

---

**Suite de tests:** 262/262 verdes al momento de verificar el estado general de la sesión (antes de los 2 fixes de este día, que agregaron sus propias verificaciones puntuales sin tests nuevos — son cambios de frontend puro, cubiertos por los tests ya existentes).

Detalle completo de cada hilo en memoria: `project_venta_recibo_impresion`, `project_reportes_module`, `project_atendido_por_idea`, `project_venta_permisos_bugs_pendientes`, `feedback_workflow_style`.
