# Pendiente: Autocompletado del Formulario de Gestor en Show.tsx

## Objetivo

Automatizar el campo **Monto de Comisión** del formulario de Gestor en `resources/js/pages/Vendor/Show.tsx`, de la misma manera que el formulario de pago en `resources/js/pages/Vendor/Index.tsx` autocompleta el monto según la tasa de cambio.

---

## Contexto

### Qué tiene el formulario de Gestor actualmente (Show.tsx)

El tab "Gestor" tiene estos campos:
- `tasaAplicadaGestor` — tasa de cambio del gestor (el usuario la ingresa manualmente)
- `gestorCuentaId` — cuenta del gestor (Select con las cuentas disponibles)
- `gestorMonto` — monto de comisión (el usuario lo ingresa manualmente)
- `gestorComentario` — comentario libre

El problema: el usuario tiene que calcular y escribir el monto manualmente.

### Qué tiene la venta para automatizar

La venta ya tiene `total_comision` = la comisión total del vendedor en USD.  
Esta es exactamente la base para calcular el monto del gestor:

```
gestorMonto = total_comision × tasaAplicadaGestor
```

Si la cuenta del gestor es en USD (tasa = 1):
```
gestorMonto = total_comision × 1 = total_comision
```

---

## Lógica a implementar (similar a Index.tsx)

### Referencia: cómo funciona en Index.tsx

En `Index.tsx` el formulario de pago:
1. Cuando seleccionas moneda → `exchangeRate` se auto-rellena con la tasa oficial de esa moneda
2. Cuando el usuario edita `exchangeRate` manualmente → `amount` se recalcula: `remainingInUsd × nuevaTasa`
3. Preview en tiempo real: `monto / tasa = USD equivalente`

### Lo que se debe hacer en Show.tsx (Gestor)

**Trigger 1 — Al seleccionar la cuenta del gestor:**
- Detectar la moneda de la cuenta seleccionada
- Si la cuenta tiene moneda con `tasa_cambio` conocida → pre-rellenar `tasaAplicadaGestor` con esa tasa
- Recalcular `gestorMonto = currentVenta.total_comision × tasa`

**Trigger 2 — Al editar `tasaAplicadaGestor` manualmente:**
- Recalcular `gestorMonto = currentVenta.total_comision × tasaAplicadaGestor`
- Mostrar preview: `X {moneda_cuenta} = total_comision USD`

**Trigger 3 — Preview de conversión:**
- Mostrar debajo del campo monto:  
  `{gestorMonto} {simbolo_cuenta} = {total_comision} USD (Tasa: {tasaAplicadaGestor})`

---

## Cambios necesarios en Show.tsx

### 1. Nuevo estado para moneda de la cuenta del gestor

```tsx
const [monedaCuentaGestor, setMonedaCuentaGestor] = useState<{
    codigo: string;
    simbolo: string;
    tasa_cambio?: number;
} | null>(null);
```

### 2. Actualizar el `onValueChange` del Select de cuenta del gestor

```tsx
onValueChange={(val) => {
    setGestorCuentaId(val);
    const cuentaEncontrada = cuentasGestor.find((c) => String(c.id) === val) || null;
    setCuentaGestorSeleccionada(cuentaEncontrada);
    
    // Auto-rellenar tasa y monto
    if (cuentaEncontrada?.moneda) {
        const tasaMoneda = cuentaEncontrada.moneda.tasa_cambio ?? 1;
        setMonedaCuentaGestor(cuentaEncontrada.moneda);
        setTasaAplicadaGestor(String(tasaMoneda));
        // Calcular monto automáticamente
        const montoCalculado = currentVenta.total_comision * tasaMoneda;
        setGestorMonto(montoCalculado.toFixed(2));
    }
}}
```

### 3. useEffect para recalcular monto cuando cambia la tasa

```tsx
useEffect(() => {
    const tasa = parseFloat(tasaAplicadaGestor) || 0;
    if (tasa > 0 && currentVenta.total_comision > 0) {
        const montoCalculado = currentVenta.total_comision * tasa;
        setGestorMonto(montoCalculado.toFixed(2));
    }
}, [tasaAplicadaGestor]);
```

### 4. Preview de conversión debajo del campo Monto

Agregar debajo del `Input` de gestorMonto:

```tsx
{gestorMonto && tasaAplicadaGestor && parseFloat(gestorMonto) > 0 && (
    <div className="rounded-lg bg-green-50 p-2 text-center mt-1">
        <p className="text-sm font-medium text-green-700">
            {Number(gestorMonto).toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
            {monedaCuentaGestor?.simbolo || cuentaGestorSeleccionada?.moneda?.simbolo || ''} ={' '}
            <span className="font-bold">
                {Number(currentVenta.total_comision).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
            </span>
        </p>
        <p className="mt-1 text-xs text-green-600">
            Tasa aplicada: {tasaAplicadaGestor}
        </p>
    </div>
)}
```

---

## Datos disponibles en la interfaz

En `Show.tsx`, la interfaz `Cuenta` (cuentasGestor) actualmente tiene:

```typescript
interface Cuenta {
    id: number;
    nombre_cuenta: string;
    saldo_actual: number;
    moneda: {
        codigo: string;
        simbolo: string;
    };
    tipo: string;
    tipo_moneda: string;
}
```

**Problema:** falta `tasa_cambio` en la moneda de la cuenta. Hay que verificar si el backend `getCuentasParaGestor()` devuelve la tasa.

### Verificar en VentaController.php → getCuentasParaGestor()

```php
return [
    'id' => $cuenta->id,
    'nombre_cuenta' => $cuenta->nombre_cuenta,
    'saldo_actual' => $cuenta->saldo_cuenta,
    'moneda' => [
        'codigo' => $cuenta->moneda?->codigo_moneda ?? $cuenta->tipo_moneda,
        'simbolo' => $cuenta->moneda?->simbolo_moneda ?? $cuenta->tipo_moneda,
        // ← FALTA 'tasa_cambio' aquí
    ],
    'tipo' => $cuenta->tipo,
];
```

**Fix necesario en backend:** agregar `'tasa_cambio' => (float) $cuenta->moneda?->tasa_cambio ?? 1`

Y actualizar la interfaz `Cuenta` en Show.tsx:
```typescript
moneda: {
    codigo: string;
    simbolo: string;
    tasa_cambio?: number; // ← AGREGAR
};
```

---

## Orden de implementación mañana

1. Agregar `tasa_cambio` al response de `getCuentasParaGestor()` en `VentaController.php`
2. Actualizar interfaz `Cuenta` en `Show.tsx` para incluir `tasa_cambio`
3. Agregar estado `monedaCuentaGestor`
4. Actualizar `onValueChange` del Select de cuenta del gestor
5. Agregar `useEffect` para recalcular monto al editar tasa
6. Agregar preview de conversión debajo del campo monto

---

## Resultado esperado

Cuando el usuario abre el formulario de Gestor:
1. Selecciona la cuenta → tasa se auto-rellena con la tasa de esa moneda → monto se calcula automáticamente
2. Si el usuario cambia la tasa manualmente → monto se recalcula en tiempo real
3. El usuario ve el preview: "18.500 CUP = 3.00 USD (Tasa: 365)"
4. El usuario puede ajustar el monto si lo necesita

Esto evita que el usuario tenga que hacer el cálculo manualmente.
