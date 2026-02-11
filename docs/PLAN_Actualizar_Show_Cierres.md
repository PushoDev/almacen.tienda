# Plan: Actualizar vista `Show.tsx` — Cierres de Caja

Fecha: Mañana
Responsable: Tú / Equipo

## Objetivo
Actualizar la vista de detalle de cierres (`resources/js/pages/Cierres/Show.tsx`) para reflejar los cálculos y secciones ya implementadas en la vista de creación (`resources/js/pages/Cierres/Create.tsx`). Mantener la UI actual pero añadir/mostrar los resúmenes que faltan (productos, pagos por método/moneda, transferencias resumen, diálogo de transacciones y arqueo por moneda).

## Contexto
- Controlador origen: [app/Http/Controllers/CierreCajaController.php](app/Http/Controllers/CierreCajaController.php)
- Vista referencia (ya existente): [resources/js/pages/Cierres/Create.tsx](resources/js/pages/Cierres/Create.tsx)
- Vista a actualizar: [resources/js/pages/Cierres/Show.tsx](resources/js/pages/Cierres/Show.tsx)

## Entregables
- `Show.tsx` actualizado mostrando:
  - Resumen de `productos_resumen` (lista con cantidad y subtotal)
  - Tabla «Por dónde entraron» por moneda (pagos agrupados por método/destino)
  - Panel/diálogo de transacciones (Ingresos/Gastos/Transferencias) igual que en Create
  - `transferencias_resumen` (totales salientes/entrantes por moneda) en la sección de transferencias
  - Arqueo en la columna de auditoría: `saldo_inicial`, `saldo_esperado` y `saldo_contado` por moneda si están disponibles
  - Mantener comportamiento actual: solo lectura (no acciones destructivas automáticas)

## Checklist de trabajo (pasos concretos)
- [ ] Revisar y mapear las propiedades exactas que `Create.tsx` usa de `calculos` / `detalles`.
- [ ] Añadir interfaces/typing en `Show.tsx` si faltan campos (copiar/ajustar desde `Create.tsx`).
- [ ] Insertar sección «Productos vendidos» (lineas productos) en la vista `Show.tsx`.
- [ ] Agregar sección/tabs para ver detalle de transacciones (reusar markup/estilos del diálogo en `Create.tsx`).
- [ ] Mostrar `transferencias_resumen` con totales por moneda y lista de detalles.
- [ ] Mostrar arqueo por moneda en la columna de auditoría (si `detalles` tiene `saldo_calculado`/`ventas_efectivo` etc.).
- [ ] Probar con datos reales (render local) o con fixtures en la consola del navegador.
- [ ] Formatear código y correr linters/local typechecks (`npm run format`, `npm run types`).
- [ ] Abrir PR con cambios y descripción de lo hecho.

## Priorización / Tiempo estimado
- Mapeo de datos y typing: 30–45 min
- Implementación UI básica (productos + pagos por método): 1–2 h
- Transferencias/diálogo y arqueo: 1 h
- Tests manuales, formato y PR: 30–45 min

## Requisitos / notas técnicas
- No introducir mutaciones en la vista `Show.tsx` (mantener solo lectura). Si se requiere confirmar transferencias, habilitar botón que abra modal y envíe formulario al endpoint del controlador (esto es opcional y debe planearse aparte).
- Usar los mismos componentes UI y estilos (Tailwind + componentes del proyecto).

## Siguientes pasos para mañana (orden recomendado)
1. Clonar rama actual (`storage/add-modal-cierres`) y crear rama de trabajo `feat/cierres-show-update`.
2. Implementar cambios por bloques (primero tipado y productos, luego pagos, luego transferencias).
3. Probar en navegador y ajustar formatos numéricos/moneda.
4. Crear PR con captura de pantalla y notas.

---
Si quieres, puedo crear la rama y aplicar el primer cambio (añadir la tabla de productos) ahora o mañana. ¿Qué prefieres?
