# Dashboard — División en componentes (`dashboard.tsx`)

## Contexto

`resources/js/pages/dashboard.tsx` (ruta `/dashboard`) tiene 1557 líneas en un solo archivo: el banner de identidad, 4 widgets de acceso rápido, y 7 `Card` grandes (Resumen Financiero, Comparación Mensual, Información de Monedas, Gráfico de Compras/Ventas, Historial de Cambios de Tasa, Cambios de Precio de Costo, Estados Financieros), cada una con su propio estado/fetch. Encontrar y tocar una sección puntual hoy implica scrollear por el resto.

**No es el archivo más grande del proyecto** (`Vendor/Show.tsx` tiene 3585 líneas, `Comprar/Index.tsx` 2932), pero sí es el primero que se va a dividir — sienta el patrón para atacar los otros después si el cliente lo pide.

**El proyecto ya tiene precedente de este patrón**, no es algo nuevo:
- `Logistica/Index.tsx` → `Logistica/layout/ComprasPorProveedorChart.tsx`, `GastosMensualesChart.tsx`, `ProductosMasCompradosPie.tsx`, `ProductosPorAlmacen.tsx`.
- `Transacciones/Index.tsx` → `Transacciones/layouts/Movimientos.tsx`, `CostosAdicionales.tsx`, que a su vez importan `Transacciones/forms/GastoForm.tsx`, `IngresoForm.tsx`, `TransferenciaForm.tsx`.

**Decisión de ubicación confirmada con el cliente (2026-08-18, vía AskUserQuestion):** `dashboard.tsx` hoy es un archivo suelto en `pages/` (no una carpeta como `Logistica/`), así que se crea `resources/js/pages/Dashboard/` (capitalizada, mismo criterio que `Logistica/`, `Transacciones/`, `Vendor/`, `Comprar/`) con un `layout/` adentro. `dashboard.tsx` (minúscula, ruta actual) se queda como está — sigue siendo el entry point de Inertia, solo que delgado, importando desde `./Dashboard/layout/*`.

**Alcance: es un refactor estructural puro.** Mover JSX/estado/efectos a su propio archivo, sin cambiar diseño, lógica, cálculos ni permisos de ninguna sección. Si algo se ve o se comporta distinto después de una fase, es un bug de la extracción, no una mejora buscada.

## Hallazgos incidentales del análisis previo — NO forman parte de este trabajo

Durante el análisis de `dashboard.tsx` (2026-08-18, antes de esta propuesta) salieron 5 hallazgos reales, deliberadamente **fuera de este plan** — se resuelven aparte si el cliente lo pide:

1. `dashboard.update` / `dashboard.update-mlc` (`AdminController::update()`/`updateMLC()`) sin ningún control de rol — cualquier autenticado podría cambiar la tasa de cambio global por URL directa. Rutas huérfanas del frontend actual.
2. `dashboard.usuarios` (`ReporteController::getUsuarios()`) sin gate de rol — expone nombre/email/rol de todos los usuarios a cualquier autenticado, aunque el frontend solo muestre el selector a admin/moderador.
3. `<Toaster>` de `sonner` importado y renderizado sin ninguna llamada a `toast(...)` en el archivo — vestigial.
4. Los 4 widgets superiores (Comprar/Vender/Transacciones/Cierres) siguen con gradiente hardcodeado en `div`s planos, no con el patrón `Card` + `CardHeader` degradado que ya tiene el resto del dashboard.
5. Badge de Rol con clases planas sin variante `dark:`, inconsistente con el resto del archivo.

Se preservan tal cual están al mover cada sección a su componente — no se corrigen de paso salvo que el cliente lo pida explícitamente en su fase correspondiente.

## Estructura de carpetas propuesta

```
resources/js/pages/
  dashboard.tsx                        (orquestador — se queda delgado: fetch de props Inertia, banner, grid de estado)
  Dashboard/
    types.ts                           (interfaces hoy apiladas al inicio de dashboard.tsx: Usuario, Moneda, MontoPorMoneda,
                                         ComparacionMensual, EstadoFinanciero, HistorialCambio, HistorialCostoPrecioItem,
                                         StatsCostoPrecio, CapitalPorMoneda, ResumenFinanciero)
    utils.ts                           (colorMoneda(), COLORES_MONEDA, PALETA_MONEDA_RESPALDO — hoy en el módulo de dashboard.tsx)
    layout/
      OpcionesRapidas.tsx              (grid de 4 widgets: Comprar/Vender/Transacciones/Cierres)
      ResumenFinanciero.tsx            (Tabla 1: Resumen Financiero admin/moderador + fallback "Mis Montos por Moneda" vendedor)
      ComparacionMensual.tsx           (Tabla 2)
      InformacionMonedas.tsx           (grid de tasas — incluye su propio fetch de dashboard.monedas)
      GraficoComprasVentas.tsx         (chart de área — incluye su propio fetch de dashboard.chart.data + Select de rango)
      HistorialCambiosTasa.tsx
      HistorialCostoPrecio.tsx
      EstadosFinancieros.tsx           (la más grande: fetch de usuarios + estados, búsqueda, paginación, selector de usuario)
```

Cada componente recibe por props solo los datos que ya le llegan hoy desde `AdminController::index()` (`resumenFinanciero`, `montosPorMoneda`, `comparaciones`, etc.) más `userRole` donde haga falta el gate visual. Los fetch que hoy viven en el padre (`usuarios`, `monedas`, `estadosFinancieros`, `chartData`) se mueven junto con el componente que los consume — dejan de ejecutarse en `dashboard.tsx` para componentes que ni siquiera se renderizan para cierto rol (cierra de paso el desperdicio de red descrito en el hallazgo #2 de arriba, sin necesidad de tocar el backend).

## Orden de fases propuesto

Igual que en Compras/Reportes: **el cliente elige el orden real, esto es solo una sugerencia de secuencia** — de la sección más aislada (sin dependencias de estado compartido) a la más compleja, dejando `EstadosFinancieros` para el final por ser la que más estado propio maneja.

- [ ] **Fase 0 — Base.** Crear `Dashboard/types.ts` y `Dashboard/utils.ts`, mover las interfaces y `colorMoneda()` sin tocar el resto del archivo todavía. Verificación: `dashboard.tsx` sigue renderizando exactamente igual, solo cambian los imports.
- [ ] **Fase 1 — `OpcionesRapidas.tsx`.** La sección más aislada (sin fetch propio, sin estado, solo el grid de 4 widgets + su gate `userRole === 'admin'` para Comprar).
- [ ] **Fase 2 — `InformacionMonedas.tsx`.** Tiene fetch propio (`dashboard.monedas`) pero sin dependencias cruzadas con otras secciones.
- [ ] **Fase 3 — `GraficoComprasVentas.tsx`.** Fetch propio (`dashboard.chart.data`) + el `Select` de rango de tiempo + su gate `userRole === 'vendedor'` (no se renderiza para vendedor).
- [ ] **Fase 4 — `ResumenFinanciero.tsx`.** Los dos casos (admin/moderador con `resumenFinanciero`, vendedor con `montosPorMoneda`/`totalCapital`) en un solo componente, igual que hoy.
- [ ] **Fase 5 — `ComparacionMensual.tsx`.** Incluye el botón "Ver Historial" y el cálculo de totales por moneda.
- [ ] **Fase 6 — `HistorialCambiosTasa.tsx`** y **Fase 7 — `HistorialCostoPrecio.tsx`.** Ambas son tablas de solo lectura con resumen estadístico arriba, mismo patrón entre sí, se pueden hacer seguidas.
- [ ] **Fase 8 — `EstadosFinancieros.tsx`.** La más grande: fetch de `usuarios` + `estadosFinancieros`, búsqueda (`busquedaEstado`), paginación (`paginaEstado`), selector de usuario, `Tooltip` de vendedores asignados.
- [ ] **Fase 9 — Verificación final.** `dashboard.tsx` queda solo con: llamada a `AppLayout`, banner, badge de rol, y el render de los 8 componentes de `Dashboard/layout/`. Confirmar en navegador cada rol (admin/moderador/vendedor) sin diferencias visuales ni de comportamiento frente a la versión actual. `npx eslint` + diff manual de tags JSX contra imports en cada archivo nuevo (ver incidente de `CardDescription` en Compras — no repetir).

**No arrancar ninguna fase sin que el cliente confirme cuál sigue.** Cada fase se cierra con verificación en navegador (mismo rol, mismos datos, mismo aspecto) antes de pasar a la siguiente — el objetivo es que nadie note el cambio salvo quien lea el código.

**Por qué este orden:** las fases 1-3 son componentes sin dependencias entre sí ni con el resto del archivo (bajo riesgo, sirven para validar el patrón de carpeta/imports antes de tocar las secciones más grandes). Fase 8 queda última porque `EstadosFinancieros` es la que más estado local tiene (búsqueda + paginación + selector) y la más fácil de romper si se extrae apurado.
