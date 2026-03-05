# Notas de Desarrollo - 04/03/2026

## Contexto del Proyecto

Sistema de inventario y ventas con Laravel 12 + React 19 + Inertia.js + Tailwind CSS v4

---

## Tarea: Comisiones del Gestor con Tasa de CambioEditable

### Requisitos del Cliente

1. **Monto editable**: El usuario ingresa manualmente el monto de la comisión en la moneda de la cuenta del gestor (ej: 5000 CUP)

2. **Tasa editable**: Hay una tasa de cambio editable para el gestor (ej: 500 CUP = 1 USD), similar a `tasa_aplicada_venta`

3. **Mostrar equivalencia**: El sistema muestra la cantidad en USD (5000 ÷ 500 = 10 USD)

4. **Descuento**: Se descuenta el monto tal cual (en la moneda de la cuenta del gestor) de la cuenta del gestor

5. **灵活性**: La comisión puede ser mayor o menor según lo que se seleccione

### Ejemplo de Uso

- Producto cuesta: 120 USD
- Venta en: 130 USD
- Comisión gestor: 10 USD (base)
- Cuenta gestor: CUP con tasa 500
- **Monto a descontar**: 10 × 500 = 5000 CUP

---

## Cambios Realizados en Backend

### 1. Nueva Migración

- **Archivo**: `database/migrations/2026_03_04_000000_add_tasa_aplicada_gestor_to_ventas_table.php`
- **Campo**: `tasa_aplicada_gestor` (decimal 15,4) en tabla `ventas`
- **Estado**: ✅ Ejecutada

### 2. Modelo Venta (app/Models/Venta.php)

- Agregado `tasa_aplicada_gestor` en `$fillable`
- Agregado cast `'tasa_aplicada_gestor' => 'decimal:4'`

### 3. VentaController.php - Métodos Actualizados

| Método                | Línea | Cambio                                                                          |
| --------------------- | ----- | ------------------------------------------------------------------------------- |
| `procesarVenta`       | ~717  | Agregada validación `tasa_aplicada_gestor` requerida cuando es venta con gestor |
| `procesarVenta`       | ~812  | Guardado de `tasa_aplicada_gestor` en la venta                                  |
| `guardarDestinatario` | ~934  | Validación de `tasa_aplicada_gestor`                                            |
| `guardarDestinatario` | ~957  | Guardado de `tasa_aplicada_gestor`                                              |
| `show`                | ~604  | Agregado `tasa_aplicada_gestor` y `monto_usd` en respuesta del gestor           |
| `listadoVentas`       | ~1190 | Agregado `tasa_aplicada_gestor` y `monto_usd` en listado                        |

### 4. Lógica en aprobarVenta

- El descuento ya usa `$venta->gestor_monto` directamente (monto en moneda de la cuenta del gestor)
- **Pendiente**: Verificar que el descuento use la tasa editable si es necesario

---

## Pendiente - Frontend

### Vista Vendor/Index.tsx

- Esta vista solo procesa la venta inicial (crea venta pendiente)
- NO tiene campos de gestor - eso está en otra vista (probablemente Vendor/Show.tsx para aprobar la venta)

### Pendiente:

1. **Verificar vista de aprobación de venta** (Vendor/Show.tsx) para agregar:
    - Campo para monto de comisión del gestor
    - Campo para tasa editable del gestor
    - Mostrar equivalencia en USD

---

## Métodos Públicos del VentaController (18 total)

1. `storeClienteForVenta` (línea 38)
2. `getClientesFisicosParaPago` (línea 84)
3. `getAlmacenes` (línea 96)
4. `getProductosPorAlmacen($id)` (línea 113)
5. `getClientes` (línea 168)
6. `getCuentas` (línea 177)
7. `getCuentasFiltradas` (línea 223)
8. `getCuentasParaGestor` (línea 297)
9. `getMonedas` (línea 330)
10. `getVentasReporte` (línea 356)
11. `index` (línea 406)
12. `showReporteDiarioView` (línea 463)
13. `show($id)` (línea 471)
14. `procesarVenta` (línea 675)
15. `guardarDestinatario` (línea 915)
16. `aprobarVenta` (línea 1007)
17. `listadoVentas` (línea 1101)
18. `anularVenta` (línea 1222)

---

## Para Continuar Mañana

1. **Frontend**: Modificar la vista donde se completa la venta (destinatario + gestor) para:
    - Agregar campo de monto de comisión editable
    - Agregar campo de tasa editable del gestor
    - Mostrar equivalencia en USD

2. **Verificar**: Que el descuento en `aprobarVenta` funcione correctamente con la nueva lógica

3. **Pruebas**: Probar el flujo completo de venta con gestor
