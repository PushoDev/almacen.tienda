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
- [ ] Pendiente
- **Archivo:** `resources/js/pages/Vendor/Index.tsx`
- **Llamadas a portar:** 33

### 2. Vendor/Show.tsx
- [ ] Pendiente
- **Archivo:** `resources/js/pages/Vendor/Show.tsx`
- **Llamadas a portar:** 40 (el archivo más grande de todos — considerar dividir en dos sesiones)

### 3. PaymentForm.tsx
- [ ] Pendiente
- **Archivo:** `resources/js/components/ventas/PaymentForm.tsx`
- **Llamadas a portar:** 5
- **Nota:** se usa embebido dentro del diálogo de Vendor/Index.tsx — coordinar con el ítem 1 para no dejarlo a medias (un diálogo con dos librerías de toast distintas a la vez confunde).

---

## Grupo 2 — Compras

### 4. Comprar/Index.tsx
- [ ] Pendiente
- **Archivo:** `resources/js/pages/Comprar/Index.tsx`
- **Llamadas a portar:** 31

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
- [ ] Pendiente
- **Llamadas a portar:** 12

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
