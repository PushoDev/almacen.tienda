---
paths:
  - 'resources/js/pages/Reportes/**'
---

# Reportes

## Patrón uniforme de los reportes (decidido 2026-10-14)
Cada reporte se hace de a uno, solo cuando el cliente lo nombra, y sigue el mismo patrón (modelo: Reportes/Report/HistorialMovimientos.tsx): banner dashed + Separator → aviso de filtros activos → widgets SpotlightCard con color propio y cifra en Badge degradado → Card de filtros APARTE con header degradado → Card de tabla con header degradado + título + botón de acción → thead degradado slate-700→800 con table dentro de "rounded-lg border" (celdas px-4 py-3) → badges de vidrio (borde+fondo translúcido, SIN backdrop-blur en filas) → pie "Mostrando X a Y de Z" + paginación de 15 hecha en el servidor (filtros y totales de TODO lo filtrado, no de la página). El color del header es el de la tarjeta del menú. Clases de color siempre completas y estáticas (Tailwind no genera `border-${color}-400`). Nunca bg-sidebar-accent en tablas (es rojo). En Reportes/Index.tsx la descripción de una tarjeta solo se muestra con mostrarDescripcion: true, y se activa al terminar ese reporte. Los reportes de ventas cuentan solo estado 'completada'. No construir una versión "plana" ni agregar columnas/widgets sin decirlo: si falta una decisión (p. ej. cuál ganancia es la oficial), mostrar la cadena completa o preguntar.
