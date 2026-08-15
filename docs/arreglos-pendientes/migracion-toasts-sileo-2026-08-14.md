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
- [ ] Pendiente
- **Llamadas a portar:** 26

### 6. Productos/Edit.tsx
- [ ] Pendiente
- **Llamadas a portar:** 6

### 7. Productos/Show.tsx
- [ ] Pendiente
- **Llamadas a portar:** 3

---

## Grupo 4 — Operación diaria (cuentas, movimientos, cierres)

### 8. Movimientos/Index.tsx
- [x] Cerrado 2026-08-14 (junto con la pasada UX de Movimientos, misma sesión — confirmado en código 2026-08-15: usa `@/lib/sileo` y `@/components/ui/sileo-toaster`)
- **Llamadas portadas:** 12

### 9. Transacciones/CambiarCostoManual.tsx
- [ ] Pendiente
- **Llamadas a portar:** 5

### 10. Cuentas/Index.tsx
- [ ] Pendiente
- **Llamadas a portar:** 3

### 11. Cuentas/Edit.tsx
- [ ] Pendiente
- **Llamadas a portar:** 3

### 12. Cuentas/Create.tsx
- [ ] Pendiente
- **Llamadas a portar:** 2

### 13. Cierres/Create.tsx
- [ ] Pendiente
- **Llamadas a portar:** 2

### 14. Cierres/Show.tsx
- [ ] Pendiente
- **Llamadas a portar:** 0 — solo monta `<Toaster/>` sin usarlo (import muerto). Al migrar, confirmar si hace falta el `<Toaster/>` de sileo ahí o si se puede quitar directamente.

---

## Grupo 5 — Catálogos y configuración

### 15. Categorias/index.tsx
- [ ] Pendiente — 5 llamadas
### 16. Categorias/Create.tsx
- [ ] Pendiente — 2 llamadas
### 17. Categorias/Edit.tsx
- [ ] Pendiente — 2 llamadas
### 18. Proveedores/index.tsx
- [ ] Pendiente — 3 llamadas
### 19. Proveedores/Create.tsx
- [ ] Pendiente — 2 llamadas
### 20. Proveedores/Edit.tsx
- [ ] Pendiente — 2 llamadas
### 21. Almacenes/index.tsx
- [ ] Pendiente — 2 llamadas
### 22. Almacenes/Create.tsx
- [ ] Pendiente — 2 llamadas
### 23. Almacenes/Edit.tsx
- [ ] Pendiente — 2 llamadas
### 24. Monedas/Index.tsx
- [ ] Pendiente — 4 llamadas
### 25. Monedas/Create.tsx
- [ ] Pendiente — 4 llamadas
### 26. Monedas/Edit.tsx
- [ ] Pendiente — 5 llamadas
### 27. Monedas/Show.tsx
- [ ] Pendiente — 2 llamadas
### 28. Clientes/Index.tsx
- [ ] Pendiente — 2 llamadas
### 29. Clientes/Create.tsx
- [ ] Pendiente — 2 llamadas
### 30. Clientes/Edit.tsx
- [ ] Pendiente — 2 llamadas
### 31. Empleados/Index.tsx
- [ ] Pendiente — 2 llamadas
### 32. Empleados/Create.tsx
- [ ] Pendiente — 2 llamadas
### 33. Empleados/Edit.tsx
- [ ] Pendiente — 2 llamadas

---

## Grupo 6 — Resto

### 34. Reportes/Report/RastreoOperaciones.tsx
- [ ] Pendiente — 2 llamadas
### 35. Notifications/NotificationBell.tsx
- [ ] Pendiente — 1 llamada

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

## Cierre de la migración completa

Solo cuando **todos** los ítems de arriba estén `[x]`:
1. Quitar el `<Toaster position="top-center" />` de sonner de `resources/js/layouts/app/app-header-layout.tsx` (hoy sigue siendo necesario porque los archivos aún no migrados dependen de él).
2. Borrar `resources/js/components/ui/sonner.tsx`.
3. Quitar `"sonner"` de `package.json` (`npm uninstall sonner`).
4. Confirmar con `grep -r "from 'sonner'" resources/js` que no queda ningún import suelto antes de desinstalar.
