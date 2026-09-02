# Resumen de la sesión 2026-09-02 — cliente creado en POS no aparecía como destino de pago

**Para quién es este doc:** referencia rápida de lo que se tocó hoy, para retomar directo la próxima sesión. Nada de lo de abajo está commiteado — el cliente maneja git.

## Resumen ejecutivo

| # | Cambio | Estado |
|---|---|---|
| 1 | `Vendor/Index.tsx` — cliente creado en el POS ahora aparece de inmediato en el combobox "Destino del Pago", sin refrescar | ✅ Implementado y verificado en navegador |

Cambio de una línea. No se tocó backend ni tests (sin cobertura JS en el proyecto). `eslint` limpio sobre el archivo (0 errores nuevos).

---

## 1. Cliente nuevo no aparecía como destino de pago sin refrescar

**Reporte del dueño del proyecto:** creaba un cliente nuevo desde el POS correctamente, pero al ir a usarlo como destino de un pago tenía que refrescar la pantalla para que apareciera.

**Causa real:** `Vendor/Index.tsx` mantiene **dos listas de clientes separadas**, cada una cargada una sola vez al montar la página (`useEffect`, línea ~281-282):

- `clientes` (`cargarClientes` → `ventas.getClientes`) — alimenta el selector "Cliente" principal de la venta.
- `clientesFisicos` (`cargarClientesFisicos` → `ventas.getClientesFisicosParaPago`) — alimenta el combobox **"Destino del Pago"** dentro de `PaymentForm.tsx` (componente hijo, recibe `clientesFisicos` como prop).

Al crear un cliente desde el modal "Crear Nuevo Cliente" (función `crearClienteLocal`, ~línea 761), el código solo actualizaba `clientes`:

```tsx
setClientes((prev) => [...prev, cliente]);
```

Nunca tocaba `clientesFisicos`, así que el cliente nuevo no aparecía en el combobox de pago hasta un refresh completo (que vuelve a disparar ambos `useEffect` de carga).

**Fix** (`Vendor/Index.tsx:761-763`):

```tsx
setClientes((prev) => [...prev, cliente]);
setClientesFisicos((prev) => [...prev, cliente]);
```

Sin condicional por `tipo_cliente`: el POST de este modal específico siempre envía `tipo_cliente: 'fisico'` (línea ~752), que es la única condición que exige `getClientesFisicosParaPago()` en el backend — el objeto devuelto siempre califica.

**Verificado en navegador (Claude-in-Chrome, dev server corriendo, sin `npm run build`):** creado un cliente real "QA Test Cliente Refresh" desde el POS → sin refrescar la página → Procesar Venta → Efectivo → USD → combobox "Destino del Pago" → el cliente apareció al escribir "QA". Sin errores de consola.

**Pendiente de decisión del cliente:** el cliente de prueba **"QA Test Cliente Refresh"** (teléfono `55512345`) quedó persistido de verdad en la tabla `clientes` — no fue un dry-run, `storeClienteForVenta` crea el registro real. No se borró sin confirmación explícita (acción destructiva). Si sigue existiendo en una sesión futura, preguntar antes de eliminarlo.

Ver memoria `project_venta_permisos_bugs_pendientes` (sección 4) para el detalle completo.
