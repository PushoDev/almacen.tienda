# Modal "Buscar Producto y Asignar Precio" — Precios por Almacén (`/disponibles`)

**Fecha:** 2026-08-13
**Módulo:** `Productos/Vendor/Index.tsx` + `ProductoVendedorController.php`
**Estado:** 🔵 Diseño confirmado, sin luz verde para implementar todavía

---

## Contexto

Iniciativa nueva, separada de las anteriores (Reportes, Compras UX, Dashboard — ver `docs/ESTADO_DESARROLLO.md`). Arranca con una revisión UX/UI general de `/disponibles` (la vista donde admin/moderador/vendedor asignan precio de venta + comisión a un producto por almacén). El cliente quiere, además de un lavado de cara visual (pendiente de definir, ver sección "UX/UI" abajo), un cambio de flujo funcional.

## Flujo actual (sin cambios, se mantiene)

1. Admin elige **un almacén** en el `Select` de arriba.
2. Se muestra la tabla de productos **de ese almacén únicamente**.
3. Click en el ícono verde ($) de una fila → dialog "Actualizar Precio" para **ese producto + ese almacén**.
4. Confirmar → `PUT /disponibles/{producto}` (`ProductoVendedorController::update()`), un producto+almacén a la vez.

Limitación que el cliente señaló: si un producto existe en 5 almacenes y quiere ponerle el mismo precio en los 5, tiene que repetir el paso 1-4 cinco veces, cambiando de almacén cada vez.

## Flujo nuevo — CONFIRMADO, no implementado

Se agrega un **modal "Buscar Producto"** (botón nuevo, junto a "Exportar/Importar Excel"), que invierte el eje: producto primero, almacén después.

1. Admin abre el modal, busca el producto por nombre/marca/modelo (autocompletado, mismo patrón que `compras.productos.buscar` en `CompraController`).
2. Selecciona el producto de los resultados.
3. Ingresa **Precio de Venta** (obligatorio) y **Comisión** (opcional — ya validado así en el backend: `ProductoVendedorController::update()` línea ~106, `'comision' => ['nullable', 'numeric', 'min:0']`).
4. El modal muestra la lista de **almacenes donde ese producto está disponible**, cada uno con su precio actual (o "No definido").
5. Admin marca con **checkboxes cuáles almacenes** quiere actualizar (multiselección).
6. Confirma → el **mismo precio y comisión ingresados en el paso 3** se aplican a todos los almacenes marcados.

**Decisiones de diseño ya cerradas (confirmadas 2026-08-13 vía AskUserQuestion):**
- ✅ **Un solo precio/comisión para todos los almacenes seleccionados** (no precio distinto por almacén dentro del mismo modal) — opción elegida sobre la alternativa de editar almacén-por-almacén con su propio valor cada uno.
- ✅ **Este modal se agrega, no reemplaza** el flujo actual de "elegir almacén → tabla → click en fila" — ambos caminos coexisten.

## Factibilidad técnica (analizado, no implementado)

- **Dato ya disponible en el cliente:** `ProductoVendedorController::index()` ya manda **todos los almacenes** (admin/moderador ven todos) con sus productos y `precio_venta`/`comision` actuales en el prop `almacenes`. No hace falta un endpoint nuevo solo para "en qué almacenes está este producto y a qué precio" — se puede derivar client-side agrupando por `producto_id` sobre los datos que ya llegan a `Vendor/Index.tsx`.
- **Backend nuevo necesario:**
  - Endpoint de búsqueda de producto por texto (si se quiere buscar más allá de lo ya cargado en memoria — revisar si alcanza con filtrar client-side sobre `almacenes` o hace falta un endpoint tipo `compras.productos.buscar`).
  - `ProductoVendedorController::update()` actual solo acepta **un** `almacen_id` por request. Para aplicar a varios almacenes a la vez hace falta: (a) loop en frontend llamando `update()` una vez por almacén marcado, o (b) un endpoint nuevo tipo `updateBulk()` que reciba `almacen_ids[]` + `precio_venta` + `comision` y haga el `updateOrInsert` + `PrecioHistorial` por cada uno en una transacción. Decisión pendiente, evaluar en fase de implementación.
- **Roles — CONFIRMADO 2026-08-13:** el modal nuevo es para **los tres roles** (admin, moderador, vendedor), no admin-only — cada uno lo usa "de formas diferentes", es decir con el mismo alcance de permisos que ya aplica hoy al flujo de edición individual: admin/moderador ven y pueden marcar cualquier almacén; vendedor solo ve/puede marcar los almacenes de `$user->almacenes` (mismo chequeo que ya existe en `ProductoVendedorController::update()`). Ambos flujos (el actual almacén-primero y el nuevo producto-primero) coexisten para los tres roles por igual.

## UX/UI general de la vista — pendiente de definir

El cliente mencionó que, ya que se está tocando esta vista, quiere aprovechar para mejorar la estética general (stat-cards, tabla, dialog de edición) — **sin detalles concretos todavía**, no arrancar sin que el cliente indique qué específicamente quiere cambiar visualmente.

## Próximos pasos (no arrancar sin luz verde explícita)

- [ ] Definir si hace falta endpoint de búsqueda nuevo o alcanza con filtrar `almacenes` ya cargado.
- [ ] Decidir loop-de-updates vs. endpoint bulk nuevo.
- [ ] Cliente debe especificar qué quiere cambiar visualmente en el resto de la vista (stat-cards, tabla, dialog existente).
- [ ] Implementar fase por fase, confirmando antes de cada una (estilo ya establecido en este proyecto — ver `rastreo-operaciones-rediseno-2026-08-01.md` como referencia de formato).
