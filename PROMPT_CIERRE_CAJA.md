# Prompt: Mejorar Cierre de Caja (Solo Ventas)

Actúa como un desarrollador senior fullstack (Laravel + React + Inertia) y ayúdame a corregir el módulo de **cierre de caja** de mi sistema POS.

## Contexto técnico
- Proyecto: Laravel 12 + React 19 + Inertia + TypeScript.
- Archivo principal a corregir: `app/Http/Controllers/CierreCajaController.php`.
- Referencia de flujo de ventas: `app/Http/Controllers/VentaController.php`.
- Referencia de estado real de cuentas (dashboard): `app/Http/Controllers/AdminController.php`.

## Objetivo exacto
Corregir el cierre para que la parte de **ventas** sea contablemente consistente con el flujo real de ventas y pagos.

## Reglas de negocio obligatorias
1. Los vendedores **solo** manejan/ven cuentas asignadas a su usuario.
2. Las ventas pueden tener precio/tasa variable por operación.
3. Existen ventas con gestor y comisión (`es_venta_gestor`, `gestor_monto`, `gestor_cuenta_id`).
4. Pagos con `cliente_id` representan deuda de cliente (no entrada directa a caja/cuenta del vendedor).
5. Pagos con `cuenta_id` sí afectan saldo de cuenta según las reglas de moneda/tasa aplicadas en ventas.

## Alcance (NO tocar)
- No modificar lógica de gastos.
- No modificar lógica de ingresos extra.
- No modificar lógica de transferencias.
- No cambiar vistas todavía (solo backend en esta fase).

## Problema a resolver
En `CierreCajaController`, el cierre no debe depender de valores de ventas enviados por frontend cuando ya existen cálculos backend (`obtenerDetallesCierre`). Además, no se debe ocultar artificialmente saldo esperado negativo.

## Qué debe quedar implementado
1. En `store()`:
   - Tomar `ventas_efectivo`, `ventas_otros` y `saldo_esperado` desde los cálculos backend (`obtenerDetallesCierre`) como **fuente de verdad**.
   - Dejar un fallback defensivo solo si falla el cálculo backend.
2. En `obtenerDetallesCierre()`:
   - `saldo_esperado_global` debe devolver el valor real calculado (sin recortarlo con `max(0, ...)`).
3. Mantener consistencia con `VentaController`:
   - Destino de pago cuenta vs cliente.
   - Comisiones de gestor.
   - Tasas aplicadas por pago/venta.
4. Mantener control por rol/usuario para cuentas asignadas.

## Criterios de aceptación
- El cierre de caja refleja correctamente ventas reales del turno según pagos procesados.
- Si el saldo esperado es negativo, se muestra y guarda negativo (sin forzar a 0).
- No hay regresión en gastos/ingresos/transferencias.
- El código compila sin errores de sintaxis.
- Se conserva la compatibilidad de datos enviados al frontend actual.

## Entrega esperada
1. Diff de backend aplicado.
2. Explicación breve de por qué cada cambio corrige la inconsistencia.
3. Checklist de pruebas manuales para validar:
   - Venta con pago a cuenta.
   - Venta con pago a cliente físico.
   - Venta con gestor.
   - Venta con moneda/tasa distinta.
   - Cierre comparado con estado real de cuentas asignadas.

## Estructura real de la venta (importante para OpenCode)

### Flujo funcional
1. `VentaController@store` crea venta en estado pendiente.
2. En ese paso se descuenta stock y se guardan `detalles` + `pagos`.
3. `VentaController@aprobarVenta` completa la venta y recién ahí impacta cuentas/clientes:
   - si `pago.cliente_id` => incrementa `cliente.deuda_pago_cliente`.
   - si `pago.cuenta_id` => incrementa `cuenta.saldo_cuenta` (según lógica de moneda actual).
4. Si la venta tiene gestor (`es_venta_gestor`) se descuenta `gestor_monto` de `gestor_cuenta_id` al aprobar.

### Campos clave de Venta
- `id`, `user_id`, `cliente_id`, `almacen_id`
- `estado` (`pendiente|completada|cancelada`)
- `total`, `total_ganancia`, `total_esperado_usd`
- `moneda_id`, `tasa_cambio_principal`
- `moneda_cobro_id`, `tasa_aplicada_venta`
- `es_venta_gestor`, `gestor_monto`, `gestor_cuenta_id`, `tasa_aplicada_gestor`

### Campos clave de PagoVenta
- `venta_id`, `moneda_id`
- `monto`, `monto_equivalente`, `tasa_cambio_aplicada`
- destino exclusivo: `cuenta_id` **o** `cliente_id` (nunca ambos)

### Implicación para Cierre de Caja
- El cierre debe leer ventas/pagos reales del turno y distinguir:
  - pagos que entran a cuentas (afectan caja/cuentas del usuario)
  - pagos enviados a clientes (afectan deuda cliente, no caja)
- El cierre debe considerar comisiones de gestor del mismo turno.
- El cierre no debe depender de totales enviados por frontend si ya existe cálculo backend.

## Incidencia real detectada (prioridad alta)

### Caso
- Ayer se realizaron ventas de prueba.
- No se hizo cierre de caja ese día.
- Hoy, al entrar al módulo de cierres, aparece vacío/sin pendiente.

### Causa probable en backend
En `CierreCajaController@create` se define:
- `inicioTurno = ultimoCierre ? ultimoCierre->fecha_cierre : Carbon::today()`

Cuando el usuario **nunca ha cerrado** (o no tiene cierre reciente), el sistema usa `Carbon::today()` y por tanto **ignora ventas de ayer**.

### Comportamiento esperado
Si no hay cierre posterior a las ventas existentes, el pre-cierre debe arrastrar operaciones pendientes del día anterior (o desde la última operación sin cerrar) y no iniciar en 00:00 del día actual por defecto.

### Requisito de corrección
Implementar una estrategia de `inicioTurno` robusta, por ejemplo:
1. Si existe `ultimoCierre`: usar `ultimoCierre->fecha_cierre`.
2. Si no existe:
   - buscar la fecha más antigua pendiente de cierre en ventas/pagos del usuario,
   - o en su defecto usar la primera operación del rango reciente configurable,
   - y solo si no hay operaciones usar `today()`.

### Criterio de aceptación adicional
- Si hay ventas de ayer sin cierre, hoy debe mostrarse pre-cierre con esas operaciones.
- El usuario debe poder cerrar correctamente ese acumulado pendiente.
