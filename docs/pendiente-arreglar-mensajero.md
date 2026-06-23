# Pendiente: Correcciones al Flujo de Mensajero

**Fecha:** 2026-06-22  
**Estado:** Implementación base lista — requiere correcciones

---

## Contexto

El sistema tiene implementado el flujo base de mensajero (migración, modelo, controller, UI). Sin embargo, durante el test se identificaron varios problemas de diseño que deben corregirse antes de considerar la feature completa.

---

## Problemas a corregir

### 1. Cuenta de mensajero debe ser solo CUP
- **Problema actual:** `AlmacenController@edit` carga todas las cuentas (USD, EUR, CUP mezcladas) en el selector de mensajería.
- **Corrección:** Filtrar solo cuentas de tipo CUP al cargar las opciones del selector.
- **Archivo:** `app/Http/Controllers/AlmacenController.php` → método `edit()`

### 2. Configuración de la cuenta en lugar equivocado
- **Problema actual:** La cuenta de mensajero se configura en `Almacenes → Edit`. El admin debe hacer un viaje separado ahí, cuando ya está en `Empleados → Edit` asignando almacenes al vendedor.
- **Corrección:** Mover la configuración de `mensajero_cuenta_id` a `Empleados/Edit.tsx`. Cuando el admin asigna un almacén a un vendedor, debe poder configurar ahí mismo la cuenta CUP de mensajería para ese almacén.
- **Archivos afectados:**
  - `app/Http/Controllers/UserController.php` → `update()` debe guardar `mensajero_cuenta_id` en el almacén
  - `resources/js/pages/Empleados/Edit.tsx` → agregar selector de cuenta CUP por almacén asignado
  - `app/Http/Controllers/AlmacenController.php` → quitar o dejar solo como lectura la sección de mensajería en Edit

### 3. UI del Punto de Venta — mostrar conversión USD→CUP
- **Problema actual:** El vendedor ingresa el monto del mensajero pero no ve cuánto CUP recibirá el mensajero. El campo de tasa es manual.
- **Corrección:**
  - El vendedor ingresa el monto en USD
  - El sistema muestra automáticamente: `$10 USD = 2,500 CUP` usando la tasa del sistema (Gestión de Monedas)
  - Si el pago del cliente es en CUP, el monto del mensajero también se expresa directamente en CUP
  - Eliminar el campo de tasa manual — usar la tasa del sistema automáticamente
- **Archivos afectados:**
  - `resources/js/pages/Vendor/Index.tsx` → leer tasa del sistema, mostrar preview CUP
  - `app/Http/Controllers/VentaController.php` → `getAlmacenes()` debe traer también la tasa CUP actual; `procesarVenta()` debe tomar la tasa del sistema, no la enviada por el cliente

### 4. La tasa debe venir del sistema, no ingresarse manualmente
- **Problema actual:** En el tipo "externo" el vendedor ingresa la tasa a mano, lo cual es inseguro y propenso a errores.
- **Corrección:** La tasa se obtiene automáticamente del módulo de Gestión de Monedas (tabla `monedas` o la tabla de tasas del sistema). El campo `mensajero_tasa` en la venta se guarda con la tasa vigente al momento de la venta, no una entrada manual.

---

## Flujo correcto (objetivo)

```
Admin → Empleados → Edit vendedor
  └─ Almacenes asignados: [TIENDA X]
       └─ Cuenta mensajería CUP: [selector solo CUP] ← configurar aquí

Vendedor → Punto de Venta → selecciona almacén
  └─ Activa "Servicio de Mensajería"
       └─ Ingresa monto: $10.00 USD
            └─ Preview automático: "Mensajero recibirá: 2,500 CUP" (tasa sistema)
  └─ Total de venta: $610.00 USD

Admin → Aprobar venta
  └─ Si propio: cuenta CUP del almacén +2,500 CUP
  └─ Si externo: cuenta CUP del almacén -2,500 CUP
```

---

## Lo que YA está bien (no tocar)

- Migraciones aplicadas: `mensajero_monto`, `mensajero_tipo`, `mensajero_cuenta_id`, `mensajero_tasa` en `ventas`; `mensajero_cuenta_id` en `almacens`
- Relaciones en modelos `Venta` y `Almacen` (`mensajeroCuenta()`)
- Lógica financiera en `aprobarVenta()` y reversal en `anularVenta()`
- `show()` y `listadoVentas()` ya incluyen datos del mensajero
- `Vendor/Show.tsx` ya muestra widget y card del mensajero
- El monto del mensajero se suma al total de la venta pero NO afecta la comisión del vendedor ni del gestor
- `getAlmacenes()` ya carga `mensajeroCuenta` con la relación

---

## Orden sugerido de implementación

1. `UserController@update` + `Empleados/Edit.tsx` — mover config de mensajero_cuenta (CUP only) a Empleados
2. `AlmacenController@edit` — quitar sección mensajero o dejarla read-only
3. `AlmacenController@edit.tsx` — limpiar UI de mensajero
4. `VentaController@getAlmacenes` — incluir tasa CUP vigente en la respuesta
5. `Vendor/Index.tsx` — monto USD + preview CUP automático, eliminar tasa manual
6. `VentaController@procesarVenta` — tomar tasa del sistema, no del request manual
