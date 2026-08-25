# Migración de alertas: sonner → sileo

## Cómo se trabaja esto

Un archivo a la vez. **El usuario indica el orden** — no asumir que sigue el que aparece primero en esta lista. Marcar `[ ]` → `[x]` al completar cada uno, con una línea de qué se hizo (mismo estilo que `reportes-arreglos-2026-08-01.md`). No tocar el siguiente archivo sin confirmación explícita.

## Piloto de referencia (ya implementado y verificado en el navegador, 2026-08-14)

`resources/js/pages/Productos/Vendor/Index.tsx` es el archivo de referencia — copiar su patrón, no improvisar uno nuevo por archivo. Piezas del sistema:

- `resources/js/lib/sileo.ts` — wrapper que hay que usar **en vez de** importar `sileo` directo del paquete `sileo`. Ya inyecta el color de fondo según el tipo de mensaje (`success` verde, `error` rojo, `warning` ámbar, `info` azul, `action` violeta — el cliente pidió explícitamente que el fondo comunique el tipo, no que dependa de tema claro/oscuro) y fuerza texto blanco legible.
- `resources/js/components/ui/sileo-toaster.tsx` — wrapper del `<Toaster/>`, ya conectado al tema real de la app (`useAppearance()`, **no** `next-themes` — ese hook no tiene Provider montado en este proyecto y por eso el wrapper de `sonner.tsx` nunca reflejó el tema real, solo el del sistema operativo por casualidad).
- CSS global: `sileo/styles.css` ya importado en `resources/js/app.tsx`, no hace falta repetirlo por archivo.

## Checklist de conversión por archivo (no es un find-replace)

1. Import: `import { toast } from 'sonner'` → `import { sileo } from '@/lib/sileo'`.
2. Si el archivo monta su propio `<Toaster position="top-center" />` de sonner, cambiarlo por `import { Toaster } from '@/components/ui/sileo-toaster'` (mismo prop `position`).
3. **Adaptar cada llamada, no solo renombrar.** Sonner: `toast.success('mensaje', { description })` (string + options). Sileo: `sileo.success({ title, description })` (todo en un objeto). Revisar una por una.
4. **No asumir que todo lo que hoy es `toast.success`/`toast.error` mapea 1:1.** En el piloto, la validación "el precio debe ser positivo" pasó de error genérico a `sileo.warning()` porque semánticamente es eso. Revisar cada mensaje.
5. Donde haya un `fetch` con `try/catch` + estado de loading manual, evaluar si conviene envolverlo en `sileo.promise()` (loading → success/error automático) en vez de solo portar el toast final — así se ve en `handleSubmit`/`handleBulkSubmit` del piloto.
6. Si el mensaje de éxito debería incluir datos del formulario que sonner no mostraba (ej. comisión), agregarlos ahora — pero solo si el cliente lo pide para ese archivo, no de oficio.
7. Verificar en el navegador antes de marcar `[x]` (patrón ya establecido: reproducir la interacción real, confirmar color/mensaje, limpiar cualquier dato de prueba creado en la BD local).

---

## Grupo 1 — Ventas / POS (mayor uso diario)

### 1. Vendor/Index.tsx
- [x] Cerrado 2026-08-14
- **Archivo:** `resources/js/pages/Vendor/Index.tsx`
- **Llamadas portadas:** 31 (el conteo real fue 31, no 33). Swap directo `toast.*` → `sileo.*` sin restructurar el flujo async de `handleCompleteSale` (la ruta crítica de cobro) — se evaluó `sileo.promise()` pero se descartó por riesgo dado que no se pudo verificar en navegador esta sesión (el cliente pidió no abrir navegador salvo que lo pida). Lint limpio salvo 6 errores de variables sin usar ya preexistentes antes de este cambio (confirmado con `git stash`), sin relación con la migración.

### 2. Vendor/Show.tsx
- [x] Cerrado 2026-08-14
- **Archivo:** `resources/js/pages/Vendor/Show.tsx`
- **Llamadas portadas:** 39 (no 40). **Hallazgo real de paso:** esta página nunca tuvo ningún `<Toaster/>` montado — ni sonner ni nada — porque `AppLayout` acá resuelve a `app-sidebar-layout.tsx`, que no monta ninguno (el `<Toaster/>` de sonner en `app-header-layout.tsx` es código muerto, esa plantilla no se usa). Los 39 toasts de este archivo nunca se mostraron a nadie. Se agregó `<Toaster position="top-center" />` (sileo) — primera vez que estos avisos son visibles. Lint limpio salvo 8 problemas preexistentes (confirmado con `git stash`), sin relación.

### 3. PaymentForm.tsx
- [x] Cerrado 2026-08-14 (junto con el ítem 1, mismo diálogo)
- **Archivo:** `resources/js/components/ventas/PaymentForm.tsx`
- **Llamadas portadas:** 5. Lint limpio (solo un warning preexistente de `react-hooks/exhaustive-deps`, sin relación).

---

## Grupo 2 — Compras

### 4. Comprar/Index.tsx
- [x] Cerrado 2026-08-15
- **Archivo:** `resources/js/pages/Comprar/Index.tsx`
- **Llamadas portadas:** 31/31 (carrito de productos — agregar/actualizar/eliminar — migrado primero a pedido del cliente; el resto del archivo, en una segunda pasada la misma sesión). `realizarCompra()` (checkout real, mueve dinero/stock) migrado como swap directo, sin `sileo.promise()`, mismo criterio de cautela que `Vendor/Index.tsx`. `<Toaster/>` de sonner y su import quitados del archivo (ya no queda ningún `toast.*` acá); queda solo el `<Toaster/>` de sileo. Lint limpio (mismos 7 errores/2 warnings preexistentes de `no-explicit-any`/`exhaustive-deps`, no relacionados). Suite completa verificada sin regresión (el único fallo intermitente, `RastreoOperacionesTest`, es el ya conocido — confirmado aislado en verde junto a `CompraTest`, 42/42).

---

## Grupo 3 — Productos

### 5. Productos/Index.tsx
- [x] Cerrado 2026-08-25
- **Llamadas portadas:** 26/26. 3 validaciones de cliente pasaron de `error` a `warning` (falta archivo/almacén al importar, falta almacén al exportar, "nada que normalizar" — mismo criterio semántico que el piloto). El `toast.loading()` de la exportación (solo un flash visual antes de un `<a>.click()` síncrono, no envuelve una promesa real) pasó a `sileo.info()` en vez de forzar un `sileo.promise()` que no aplicaba. Emojis de los mensajes originales (❌/✓/⏳) quitados de los títulos — sileo ya trae su propio ícono/color por tipo. Lint: mismos 24 errores preexistentes (`no-explicit-any`/`no-unused-vars`, confirmado con `git stash` antes/después), ninguno nuevo.

### 6. Productos/Edit.tsx
- [x] Cerrado 2026-08-25
- **Llamadas portadas:** 6/6. Swap directo, sin restructurar a `sileo.promise()`. Lint limpio, sin errores nuevos ni preexistentes.

### 7. Productos/Show.tsx
- [x] Cerrado 2026-08-25
- **Llamadas portadas:** 3/3. **Mismo hallazgo que ya se vio en `Vendor/Show.tsx` (Grupo 1):** esta página tampoco tenía ningún `<Toaster/>` montado — `AppLayout` acá también resuelve a `app-sidebar-layout.tsx`, que no monta ninguno. Los 3 toasts nunca fueron visibles a nadie. Se agregó `<Toaster position="top-center" />` (sileo) al final del JSX, primera vez que estos avisos son visibles. Lint limpio.

---

## Grupo 4 — Operación diaria (cuentas, movimientos, cierres)

### 8. Movimientos/Index.tsx
- [x] Cerrado 2026-08-14 (junto con la pasada UX de Movimientos, misma sesión — confirmado en código 2026-08-15: usa `@/lib/sileo` y `@/components/ui/sileo-toaster`)
- **Llamadas portadas:** 12

### 9. Transacciones/CambiarCostoManual.tsx
- [x] Cerrado 2026-08-25 — **nota:** la ruta de este ítem estaba desactualizada, el archivo real hoy es `DistribucionCostos/CambiarCostoManual.tsx` (el módulo se renombró en la sesión del 2026-08-20, ver `distribucion-costos-modulo-2026-08-20.md`). 3/3 llamadas portadas (no 5 — el conteo original quedó obsoleto junto con la ruta). Las 2 validaciones de cliente (falta cuenta origen, monto ≤ 0) pasaron a `warning`. **Mismo hallazgo que Vendor/Show.tsx y Productos/Show.tsx:** sin `<Toaster/>` montado — se agregó. `DistribucionCostos/Index.tsx` (mismo módulo) ya estaba en sileo desde antes, este archivo se había quedado atrás.

### 10. Cuentas/Index.tsx
- [x] Cerrado 2026-08-25 — 3/3. El botón de eliminar sin permiso de admin (`toast.error('ud no tiene acceso...')`) pasó a un mensaje limpio "Sin permiso". Lint: 1 error preexistente (`no-unused-vars`, confirmado con `git stash`), sin relación.

### 11. Cuentas/Edit.tsx
- [x] Cerrado 2026-08-25 — 4/4 (no 3 — el conteo del plan estaba desactualizado). Las 2 validaciones de cliente (falta contraseña, falta motivo del ajuste) pasaron a `warning`. **Mismo hallazgo de `<Toaster/>` ausente**, corregido igual que los anteriores.

### 12. Cuentas/Create.tsx
- [x] Cerrado 2026-08-25 — 2/2. Mismo hallazgo de `<Toaster/>` ausente, corregido.

### 13. Cierres/Create.tsx
- [x] Cerrado 2026-08-25 — 2/2. Swap directo, este archivo ya tenía `<Toaster/>` montado (solo cambió de sonner a sileo).

### 14. Cierres/Show.tsx
- [x] Cerrado 2026-08-25 — confirmado 0 llamadas reales en todo el archivo (grep exhaustivo). Se optó por **quitar** el import y el `<Toaster/>` de sonner en vez de reemplazarlo por uno de sileo — era código muerto sin ningún consumidor.

---

## Grupo 5 — Catálogos y configuración

### 15. Categorias/index.tsx
- [x] Cerrado 2026-08-25 — 5/5. El botón eliminar sin permiso de admin pasó a "Sin permiso" (mismo criterio de Cuentas/Index.tsx y Proveedores/index.tsx del Grupo 4).
### 16. Categorias/Create.tsx
- [x] Cerrado 2026-08-25 — 2/2.
### 17. Categorias/Edit.tsx
- [x] Cerrado 2026-08-25 — 2/2. Sin `<Toaster/>` montado, se agregó.
### 18. Proveedores/index.tsx
- [x] Cerrado 2026-08-25 — 3/3. Mismo caso de "Sin permiso" + sin `<Toaster/>` montado, se agregó.
### 19. Proveedores/Create.tsx
- [x] Cerrado 2026-08-25 — 2/2. Sin `<Toaster/>` montado, se agregó.
### 20. Proveedores/Edit.tsx
- [x] Cerrado 2026-08-25 — 2/2. Sin `<Toaster/>` montado, se agregó.
### 21. Almacenes/index.tsx
- [x] Cerrado 2026-08-25 — 2/2.
### 22. Almacenes/Create.tsx
- [x] Cerrado 2026-08-25 — 2/2. Sin `<Toaster/>` montado, se agregó.
### 23. Almacenes/Edit.tsx
- [x] Cerrado 2026-08-25 — 2/2. Sin `<Toaster/>` montado, se agregó.
### 24. Monedas/Index.tsx
- [x] Cerrado 2026-08-25 — 4/4. Sin `<Toaster/>` montado, se agregó.
### 25. Monedas/Create.tsx
- [x] Cerrado 2026-08-25 — 4/4 (incluye `toast.info` → `sileo.info`). Sin `<Toaster/>` montado, se agregó.
### 26. Monedas/Edit.tsx
- [x] Cerrado 2026-08-25 — 5/5 (incluye `toast.warning`/`toast.info` → `sileo.warning`/`sileo.info`). Sin `<Toaster/>` montado, se agregó. Verificado en navegador: toggle "Moneda Principal" dispara el toast azul de `sileo.info` correctamente.
### 27. Monedas/Show.tsx
- [x] Cerrado 2026-08-25 — 2/2. Sin `<Toaster/>` montado, se agregó.
### 28. Clientes/Index.tsx
- [x] Cerrado 2026-08-25 — 2/2.
### 29. Clientes/Create.tsx
- [x] Cerrado 2026-08-25 — 2/2. Sin `<Toaster/>` montado, se agregó.
### 30. Clientes/Edit.tsx
- [x] Cerrado 2026-08-25 — 2/2. Sin `<Toaster/>` montado, se agregó.
### 31. Empleados/Index.tsx
- [x] Cerrado 2026-08-25 — 2/2.
### 32. Empleados/Create.tsx
- [x] Cerrado 2026-08-25 — 2/2. Sin `<Toaster/>` montado, se agregó.
### 33. Empleados/Edit.tsx
- [x] Cerrado 2026-08-25 — 2/2. Sin `<Toaster/>` montado, se agregó.

---

## Grupo 6 — Resto

### 34. Reportes/Report/RastreoOperaciones.tsx
- [x] Cerrado 2026-08-25 — 2/2. **Mismo hallazgo que Vendor/Show.tsx y Productos/Show.tsx:** sin `<Toaster/>` montado (mismo caso, `AppLayout` → `app-sidebar-layout.tsx`), los 2 toasts (generación de PDF) nunca fueron visibles. Se agregó `<Toaster position="top-center" />`. Lint: 1 error preexistente de `no-explicit-any` (confirmado con `git stash`), sin relación.
### 35. Notifications/NotificationBell.tsx
- [x] Cerrado 2026-08-25 — 1/1, resuelto distinto al resto del plan. Caso especial ya discutido 2026-08-15 (ver memoria `project_sileo_migration`): componente global montado en todas las páginas, sin `<Toaster/>` propio, cliente rechazó un Toaster global por riesgo de doble-render en las páginas que ya montan uno. Confirmado vía `AskUserQuestion`: se **borró la línea del toast** en vez de migrarla — el badge de notificaciones no leídas ya baja a 0 visiblemente al marcar todo leído, esa es la confirmación real; el toast nunca fue visible en la mayoría de páginas de todos modos. Import de `sonner` quitado.

---

## Descartar — no migrar

Duplicados en minúscula, **no enrutados por ningún controller** (confirmado 2026-08-14: los controllers renderizan `Almacenes/index`, `Categorias/index`, `Proveedores/index` con mayúscula inicial — las copias en minúscula son código muerto, probablemente sobrantes de un rename):
- `resources/js/pages/almacenes/index.tsx`, `Create.tsx`, `Edit.tsx`
- `resources/js/pages/categorias/index.tsx`, `Create.tsx`, `Edit.tsx`
- `resources/js/pages/proveedores/index.tsx`, `Create.tsx`, `Edit.tsx`

También código muerto, ruta con `abort()` (confirmado en sesión previa, ver `project_precios_venta_modal` en memoria):
- `resources/js/pages/Productos/Vendor/muestra.tsx`

Si en algún momento se decide limpiar estos archivos en vez de solo ignorarlos, es un ítem aparte (borrar código muerto), no parte de esta migración.

---

## Cierre de la migración completa — HECHO 2026-08-25

Los 35 ítems terminaron `[x]` el 2026-08-25. Ejecutado el cierre completo:

1. **`Productos/Vendor/muestra.tsx` borrado.** Era código muerto confirmado (ruta con `abort()`, ver "Descartar" arriba) pero seguía importando `sonner` — como este proyecto usa `import.meta.glob('./pages/**/*.tsx')` (Inertia), el archivo entraba igual en el grafo de build de Vite aunque nadie lo renderizara, y hubiera roto `npm run build` al desinstalar el paquete. Confirmado con el usuario antes de borrar (vía AskUserQuestion).
2. **`<Toaster position="top-center" />` de sonner quitado de `app-header-layout.tsx`** — plantilla ya confirmada como código muerto (nada la importa en todo el proyecto).
3. **Hallazgo adicional en el camino:** `dashboard.tsx` también tenía un `<Toaster/>` de sonner montado (vía el wrapper local `@/components/ui/sonner`, no el paquete directo) — este es el "Toaster vestigial" ya señalado como hallazgo conocido en `project_dashboard_componentizacion`, nunca disparaba ningún `toast.*`. Se quitó al mismo tiempo que se borró `resources/js/components/ui/sonner.tsx` (paso 4), para no dejar un import roto.
4. **`resources/js/components/ui/sonner.tsx` borrado.**
5. **`npm uninstall sonner`** — confirmado 0 referencias a `sonner` en todo `resources/js` antes de desinstalar.
6. **Verificado con `npm run build`** (production build completo, sin errores) que ningún import quedó colgando — esto disparó de paso la regresión dormant ya documentada en `project_test_regression_inertia_manifest` (`public/build/manifest.json` reactivó los 409 de versión de Inertia en el test suite). Se borró `public/build/` de nuevo y se confirmó que el Vite dev server (`npm run dev`) seguía corriendo — 195/195 tests verdes, verificado también en navegador.

**Resultado final:** cero referencias a `sonner` en todo el proyecto (código ni `package.json`). Todos los toasts de la app corren sobre sileo.
