# Control de Discrepancias en Movimientos Logísticos

## Descripción del Problema

Actualmente, el sistema de movimientos logísticos no controla adecuadamente las discrepancias entre cantidades enviadas y recibidas, lo que puede llevar a inconsistencias en el inventario total del sistema.

## Casos de Discrepancia

### Caso 1: Recepción parcial (menos de lo enviado)
- Stock inicial en almacén emisor: 20 unidades de producto X
- Se envían: 10 unidades de producto X
- Se reciben: 8 unidades de producto X (faltan 2 unidades)
- Sistema:
  - Almacen destino recibe: +8 unidades
  - Almacen emisor mantiene: +2 unidades (no recibidas) + 10 unidades (no enviadas) = 12 unidades
  - Resultado: 12 unidades en emisor + 8 unidades en receptor = 20 unidades totales
  - Genera alerta de discrepancia con investigación inmediata
  - Se inicia proceso de auditoría: ¿hubo robo, extravío o error de conteo en envío?

### Caso 2: Recepción exacta (igual a lo enviado)
- Stock inicial en almacén emisor: 20 unidades de producto X
- Se envían: 10 unidades de producto X
- Se reciben: 10 unidades de producto X
- Sistema:
  - Almacen destino recibe: +10 unidades
  - Almacen emisor mantiene: 10 unidades (no enviadas)
  - Resultado: 10 unidades en emisor + 10 unidades en receptor = 20 unidades totales
  - Movimiento se cierra como completado exitosamente

### Caso 3: Recepción superior (más de lo enviado)
- Stock inicial en almacén emisor: 20 unidades de producto X
- Se envían: 10 unidades de producto X
- Se reciben: 11 unidades de producto X (sobra 1 unidad)
- Sistema:
  - El receptor recibe las 11 unidades (porque físicamente están presentes)
  - Se ajusta el stock del emisor: 20 - 11 = 9 unidades
  - Resultado: 9 unidades en emisor + 11 unidades en receptor = 20 unidades totales
  - Sistema registra discrepancia y se incluye en el reporte para supervisión

## Solución Requerida

Modificar el controlador `MovimientosController.php`, específicamente el método `recibir()`, para implementar validaciones que controlen adecuadamente las discrepancias y mantengan la integridad del inventario total.

## Acciones Pendientes

1. Implementar validación de cantidades recibidas vs cantidades despachadas
2. Crear lógica para ajustar stocks en caso de discrepancias
3. Implementar sistema de alertas para discrepancias
4. Registrar eventos de auditoría para movimientos con discrepancias
5. Crear reporte de movimientos con discrepancias para supervisión