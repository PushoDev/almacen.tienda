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
- **Roles — CORREGIDO 2026-08-13 (aclaración posterior del cliente, reemplaza la nota anterior):** el modal nuevo de edición masiva (buscar producto → un precio → aplicar a varios almacenes a la vez) es **exclusivo de admin**. "De formas diferentes" se refería a esto: moderador y vendedor **siguen usando el flujo actual** (elegir almacén → tabla → editar fila, uno a la vez, ya scopeado a sus almacenes vía `$user->almacenes`) — no obtienen el modal nuevo. Los "dos flujos coexistiendo" son: el flujo actual (para moderador/vendedor, y también disponible para admin) + el modal nuevo (exclusivo admin), no "el mismo modal con distinto alcance por rol" como se había anotado antes.
  - **Implicación de implementación (pedido explícito del cliente):** hace falta un gate real en el controlador, no solo ocultar el botón en el frontend — mismo precedente ya usado en Compras (`EnsureUserIsAdminOnly`, alias `admin.only`, deliberadamente separado de `EnsureUserIsAdmin` que sí permite admin+moderador — ver [[project_compras_ux]]). Aplicar esa misma lógica: la(s) ruta(s) nueva(s) para el modal (búsqueda de producto si hace falta endpoint, y el update masivo) quedan bajo `admin.only`; el botón "Buscar Producto" en el frontend también se oculta a moderador/vendedor (evitar el mismo tipo de mismatch frontend/backend que se encontró y corrigió en Compras el 2026-08-11).

## UX/UI general de la vista — pendiente de definir

El cliente mencionó que, ya que se está tocando esta vista, quiere aprovechar para mejorar la estética general (stat-cards, tabla, dialog de edición) — **sin detalles concretos todavía**, no arrancar sin que el cliente indique qué específicamente quiere cambiar visualmente.

## Estado de implementación (2026-08-13)

**Backend — CERRADO:**
- [x] Búsqueda de producto: sin endpoint nuevo, resuelto client-side (confirmado factible, ver arriba).
- [x] Endpoint bulk nuevo: `PUT /disponibles/bulk-actualizar` → `ProductoVendedorController::updateBulk()`, transacción única, un `PrecioHistorial` por almacén donde el precio realmente cambió.
- [x] Gate admin-only: ruta bajo middleware `admin.only` (`EnsureUserIsAdminOnly`), registrada ANTES de `Route::resource('disponibles', ...)` para que no la intercepte `PUT /disponibles/{disponible}`.
- [ ] **Tests bloqueados por un hallazgo real, sin resolver todavía:** `producto_vendedors` tiene desfase de esquema entre MySQL (real) y SQLite (tests) — la migración `2026_05_30_000001_refactor_producto_vendedors_unico_por_almacen.php` hace `if (driver !== 'mysql') return;`, así que nunca corrió en SQLite. Ahí la tabla sigue con PK compuesta `(producto_id, user_id, almacen_id)`, `user_id` obligatorio, sin `puesto_por_user_id`. Bloquea probar **todo** el controlador, no solo lo nuevo. Falta decidir si se agrega una migración nueva (patrón create/copy/drop/rename, mismo que `2026_08_10_..._change_compra_producto_primary_key.php` y `2026_08_12_..._make_user_id_nullable...`) para poner SQLite al día. `tests/Feature/ProductoVendedorTest.php` ya tiene 7 tests escritos para `updateBulk()` (multi-almacén, comisión opcional, historial solo donde cambió el precio, 403 moderador/vendedor con bypass de URL, validaciones) — quedan sin poder correr hasta resolver esto.

**Seguridad — CERRADO (pedido explícito del cliente, 2026-08-13):** el update masivo ahora exige **reconfirmar la contraseña** antes de aplicar, mismo patrón ya usado en `ProductoController::update()` para cambios de costo — verificación real en el servidor (`Hash::check`), no solo un gate visual. A diferencia del flujo de costo (que solo pide contraseña si el precio cambió), acá se pide **siempre**, porque la acción afecta varios almacenes a la vez. `password_confirmacion` ahora es `required` en la validación de `updateBulk()`; si es incorrecta, responde 422 sin tocar la base de datos. Frontend: nuevo `Dialog` de confirmación (mismo componente/estilo que el de `Productos/Edit.tsx`) que se abre al hacer click en "Aplicar a N almacén(es)", con resumen de lo que se va a aplicar (precio, producto, cantidad de almacenes) antes de pedir la contraseña.

**Bug real encontrado y corregido de paso (imágenes de producto):** el modal (y el tooltip preexistente de la tabla principal, mismo código heredado) armaban la URL de la imagen como `/storage/${imagen_producto}`. Las imágenes de producto en este proyecto NO viven en `storage/app/public/productos/` — viven directo en `public/productos/`, servidas vía el accessor `Producto::getImagenUrlAttribute()` (`asset($this->imagen_producto)`, sin prefijo `/storage/`). Corregido a `/${imagen_producto}` en los 3 lugares (tooltip de tabla, lista de resultados del combobox, ficha del producto seleccionado).

**Frontend — CERRADO (primera versión funcional):**
- [x] Botón "Buscar Producto" (admin-only), junto a Exportar/Importar Excel.
- [x] Modal de dos paneles (patrón `docs/patron-dialog-formulario-grande.md`): columna izquierda con `Combobox` de búsqueda de producto (sobre `productosUnicos`, agrupado client-side desde `almacenes` vía `useMemo`) + inputs Precio/Comisión; panel derecho con la lista de almacenes donde está disponible, cada uno con `Checkbox` + precio actual, contador de seleccionados.
- [x] Submit → `PUT /disponibles/bulk-actualizar`, actualiza el estado local (`almacenes`) para reflejar los nuevos precios sin recargar la página.
- [x] ESLint limpio (0 errores).
- [ ] **No verificado en navegador todavía** — falta probarlo en vivo (el usuario maneja su propio dev server esta sesión).

## Próximos pasos

- [ ] Resolver el desfase de esquema SQLite/MySQL en `producto_vendedors` para poder correr los 7 tests ya escritos.
- [ ] Verificar el modal en el navegador (flujo completo: buscar → seleccionar producto → precio/comisión → marcar almacenes → confirmar → ver la tabla actualizada).
- [ ] Cliente debe especificar qué quiere cambiar visualmente en el resto de la vista (stat-cards ya rediseñados, tabla con subtítulo Marca/Modelo/Capacidad ya agregado, dialog "Actualizar Precio" existente sin tocar todavía).
