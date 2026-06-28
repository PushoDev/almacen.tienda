# Pendiente: Ajustes al Flujo de Mensajero

**Última actualización:** 2026-06-23  
**Estado:** Implementación base lista + selector de moneda implementado — quedan 2 ajustes pendientes para mañana

---

## Lo que YA está implementado (no tocar)

- Migraciones aplicadas: `mensajero_monto`, `mensajero_tipo`, `mensajero_cuenta_id`, `mensajero_tasa` en `ventas`; `mensajero_cuenta_id` en `almacens`
- Relaciones en modelos `Venta` y `Almacen` (`mensajeroCuenta()`)
- Lógica financiera unificada en `aprobarVenta()` y `anularVenta()`:
  - Si `mensajero_tasa > 0` → convierte `monto × tasa` (el vendedor ingresó en USD)
  - Si `mensajero_tasa = null` → usa el monto directo (el vendedor ingresó en CUP)
  - `propio` acredita la cuenta CUP del almacén
  - `externo` debita la cuenta CUP
  - Reversal correcto en anulación para ambos tipos y ambas monedas
- `show()` expone campo `moneda` (`'USD'`/`'CUP'`) y calcula `monto_cup` para ambos tipos
- `listadoVentas()` incluye datos del mensajero
- UI del Punto de Venta (`Vendor/Index.tsx`):
  - Selector integrado USD/CUP junto al campo de monto
  - Preview automático `X USD = Y CUP (tasa Z)` usando la tasa del sistema
  - Elimina campo de tasa manual — la tasa viene del sistema automáticamente
  - Al elegir USD: envía `mensajero_tasa = tasaCUPSistema`; al elegir CUP: `mensajero_tasa = null`
- `Vendor/Show.tsx` muestra monto en la moneda correcta, tasa y equivalente CUP para ambos tipos

---

## Pendiente para mañana

### 1. Cuenta de mensajero debe ser solo CUP
- **Problema:** `AlmacenController@edit` carga todas las cuentas (USD, EUR, CUP mezcladas) en el selector de mensajería
- **Corrección:** Filtrar solo cuentas de tipo CUP al cargar las opciones
- **Archivo:** `app/Http/Controllers/AlmacenController.php` → método `edit()`

### 2. Mover configuración de cuenta mensajero a Empleados/Edit
- **Problema:** La cuenta de mensajero se configura en `Almacenes → Edit`. Debería estar en `Empleados → Edit` donde el admin ya asigna almacenes al vendedor
- **Corrección:** Cuando el admin asigna un almacén a un vendedor, puede configurar ahí mismo la cuenta CUP de mensajería para ese almacén
- **Archivos:**
  - `app/Http/Controllers/UserController.php` → `update()` debe guardar `mensajero_cuenta_id` en el almacén
  - `resources/js/pages/Empleados/Edit.tsx` → agregar selector de cuenta CUP por almacén asignado
  - `app/Http/Controllers/AlmacenController.php` → quitar o dejar solo lectura la sección de mensajería en Edit
  - `resources/js/pages/almacenes/Edit.tsx` → limpiar UI de mensajero

---

## Flujo objetivo (cuando esté completo)

```
Admin → Empleados → Edit vendedor
  └─ Almacenes asignados: [TIENDA X]
       └─ Cuenta mensajería CUP: [selector solo CUP] ← configurar aquí

Vendedor → Punto de Venta → selecciona almacén → activa Mensajería
  └─ Ingresa monto: 10.00  [USD] [CUP]  ← elige moneda
       └─ Si USD: Preview "10.00 USD = 2,500.00 CUP (tasa 250)"
  └─ Total de venta: $610.00 USD

Admin → Aprobar venta
  └─ Si propio: cuenta CUP del almacén + monto CUP
  └─ Si externo: cuenta CUP del almacén - monto CUP
```
