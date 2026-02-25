# Plan: Sistema de Comisiones para Gestor en Ventas

## Objetivo

Agregar funcionalidad para registrar y pagar comisiones a gestores (terceros que facilitan ventas) directamente desde el flujo de venta.

---

## 1. Migración de Base de Datos

Agregar campos a la tabla `ventas`:

```php
$table->boolean('es_venta_gestor')->default(false)->nullable();
$table->decimal('gestor_monto', 15, 2)->default(0)->nullable();
$table->unsignedBigInteger('gestor_cuenta_id')->nullable();
$table->string('gestor_comentario', 500)->nullable();

$table->foreign('gestor_cuenta_id')->references('id')->on('cuentas')->onDelete('set null');
```

---

## 2. Modelo Venta

Agregar en `app/Models/Venta.php`:

```php
// Relaciones
public function gestorCuenta()
{
    return $this->belongsTo(Cuenta::class, 'gestor_cuenta_id');
}

// Attributes (opcional para acceso rápido)
protected $appends = ['gestor_monto_formateado'];
```

---

## 3. Validación en VentaController

En el método `procesarVenta()`, agregar validación:

```php
// Si es venta por gestor, validar campos requeridos
if ($validatedData['es_venta_gestor'] ?? false) {
    $validator = Validator::make($request->all(), [
        'gestor_monto' => 'required|numeric|min:0.01',
        'gestor_cuenta_id' => 'required|exists:cuentas,id',
    ]);

    if ($validator->fails()) {
        return response()->json(['errors' => $validator->errors()], 422);
    }

    // Validar acceso a la cuenta del gestor
    $cuentaGestor = Cuenta::find($validatedData['gestor_cuenta_id']);
    if (!in_array($user->role, ['admin', 'moderador']) &&
        !$user->cuentas->contains('id', $validatedData['gestor_cuenta_id'])) {
        throw new \Exception('No tienes acceso a la cuenta del gestor');
    }

    // ✅ NUEVO: Validar compatibilidad de moneda (opcional: requerir que coincida con moneda de cobro si existe)
    $monedaCobro = $validatedData['moneda_cobro_id'] ? Moneda::find($validatedData['moneda_cobro_id']) : null;
    if ($monedaCobro && $cuentaGestor->moneda_id !== $monedaCobro->id && $cuentaGestor->tipo_moneda !== $monedaCobro->codigo_moneda) {
        throw new \Exception('La moneda de la cuenta del gestor debe coincidir con la moneda de cobro seleccionada');
    }
}
```

---

## 4. Guardar Datos en Venta

En `procesarVenta()`, al crear la venta:

```php
Venta::create([
    // ... campos existentes
    'es_venta_gestor' => $validatedData['es_venta_gestor'] ?? false,
    'gestor_monto' => $validatedData['gestor_monto'] ?? 0,
    'gestor_cuenta_id' => $validatedData['gestor_cuenta_id'] ?? null,
    'gestor_comentario' => $validatedData['gestor_comentario'] ?? null,
]);
```

---

## 5. Aprobación de Venta (Pago al Gestor)

En `aprobarVenta()`, después de procesar pagos normales:

```php
// Si es venta por gestor, descontar de la cuenta del gestor
if ($venta->es_venta_gestor && $venta->gestor_cuenta_id && $venta->gestor_monto > 0) {
    $cuentaGestor = $venta->gestorCuenta;

    if ($cuentaGestor) {
        // ✅ NUEVO: Validar saldo suficiente antes de descontar
        if ($cuentaGestor->saldo_cuenta < $venta->gestor_monto) {
            throw new \Exception('La cuenta del gestor no tiene saldo suficiente para cubrir la comisión');
        }

        $cuentaGestor->decrement('saldo_cuenta', $venta->gestor_monto);

        // Opcional: Registrar en historial de cuenta
        // HistorialCuenta::create([...]);
    }
}
```

---

## 6. API: Obtener Cuentas para Gestor

En `VentaController`:

```php
public function getCuentasParaGestor(Request $request)
{
    $user = Auth::user();

    $query = Cuenta::with('moneda')
        ->select('id', 'nombre_cuenta', 'tipo_moneda', 'moneda_id', 'saldo_cuenta', 'tipo');

    // No-admin: solo sus cuentas
    if (!in_array($user->role, ['admin', 'moderador'])) {
        $query->whereHas('users', function ($q) use ($user) {
            $q->where('user_id', $user->id);
        });
    }

    $cuentas = $query->get()->map(function ($cuenta) {
        return [
            'id' => $cuenta->id,
            'nombre_cuenta' => $cuenta->nombre_cuenta,
            'saldo_actual' => $cuenta->saldo_cuenta,
            'moneda' => [
                'codigo' => $cuenta->moneda?->codigo_moneda ?? $cuenta->tipo_moneda,
                'simbolo' => $cuenta->moneda?->simbolo_moneda ?? $cuenta->tipo_moneda,
            ],
            'tipo' => $cuenta->tipo,
        ];
    });

    return response()->json($cuentas);
}
```

---

## 7. Frontend: Formulario de Venta

En `Vendor/Index.tsx` (o componente de venta):

### Estado del Formulario

```typescript
interface VentaForm {
    // ... campos existentes
    es_venta_gestor: boolean;
    gestor_monto: number | null;
    gestor_cuenta_id: string | null;
    gestor_comentario: string;
    // Cuenta seleccionada para gestor (para mostrar moneda)
    gestor_cuenta_seleccionada: Cuenta | null;
}
```

### UI - Sección Gestor

```tsx
{
    /* Switch Venta por Gestor */
}
<div className="flex items-center gap-2">
    <Switch
        id="es_venta_gestor"
        checked={data.es_venta_gestor}
        onCheckedChange={(checked) => {
            setData('es_venta_gestor', checked);
            if (!checked) {
                setData({
                    gestor_monto: null,
                    gestor_cuenta_id: null,
                    gestor_cuenta_seleccionada: null,
                    gestor_comentario: '',
                });
            }
        }}
    />
    <Label htmlFor="es_venta_gestor">Venta mediante Gestor</Label>
</div>;

{
    /* Campos condicionales */
}
{
    data.es_venta_gestor && (
        <div className="space-y-4 rounded border p-4">
            {/* Monto Gestor */}
            <div>
                <Label>Monto Gestor</Label>
                <Input
                    type="number"
                    value={data.gestor_monto ?? ''}
                    onChange={(e) => setData('gestor_monto', parseFloat(e.target.value))}
                    placeholder="0.00"
                />
            </div>

            {/* Cuenta Gestor */}
            <div>
                <Label>Cuenta para Gestor</Label>
                <Select
                    value={data.gestor_cuenta_id ?? ''}
                    onValueChange={(value) => {
                        const cuenta = cuentasGestor.find((c) => c.id === value);
                        setData({
                            gestor_cuenta_id: value,
                            gestor_cuenta_seleccionada: cuenta ?? null,
                        });
                    }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                        {cuentasGestor.map((cuenta) => (
                            <SelectItem key={cuenta.id} value={cuenta.id}>
                                {cuenta.nombre_cuenta} - {cuenta.moneda?.simbolo}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {data.gestor_cuenta_seleccionada && (
                    <p className="text-muted-foreground mt-1 text-sm">Moneda: {data.gestor_cuenta_seleccionada.moneda?.codigo}</p>
                )}
            </div>

            {/* Comentario */}
            <div>
                <Label>Comentario</Label>
                <Input
                    value={data.gestor_comentario}
                    onChange={(e) => setData('gestor_comentario', e.target.value)}
                    placeholder="Venta mediante Gestor"
                />
            </div>
        </div>
    );
}
```

---

## 8. Mostrar en Detalles de Venta

En `show()` del controlador y vista `Vendor/Show`:

```php
// En el controlador
'gestor' => $venta->es_venta_gestor ? [
    'monto' => $venta->gestor_monto,
    'cuenta' => $venta->gestorCuenta ? [
        'id' => $venta->gestorCuenta->id,
        'nombre' => $venta->gestorCuenta->nombre_cuenta,
        'moneda' => $venta->gestorCuenta->moneda?->codigo_moneda,
    ] : null,
    'comentario' => $venta->gestor_comentario,
] : null,
```

---

## 9. Listado de Ventas

Agregar columna o indicador visual cuando `es_venta_gestor = true`:

```php
// En listadoVentas()
'gestor' => $venta->es_venta_gestor ? [
    'monto' => $venta->gestor_monto,
] : null,
```

---

## 10. Permisos

Igual que con las cuentas normales:

- **Admin/Moderador**: pueden seleccionar cualquier cuenta para el gestor
- **Vendedor**: solo pueden seleccionar cuentas que les fueron asignadas

---

## Resumen de Archivos a Modificar

| Archivo                                    | Acción                           |
| ------------------------------------------ | -------------------------------- |
| `database/migrations/`                     | Nueva migración                  |
| `app/Models/Venta.php`                     | Agregar relación                 |
| `app/Http/Controllers/VentaController.php` | Validación, guardado, aprobación |
| `app/Http/Requests/StoreVentaRequest.php`  | Agregar reglas (opcional)        |
| `resources/js/pages/Vendor/Index.tsx`      | Frontend                         |
| `resources/js/pages/Vendor/Show.tsx`       | Mostrar detalles                 |
| `resources/js/pages/Vendor/Listado.tsx`    | Indicador en listado             |

---

## Orden de Implementación

1. Migración
2. Modelo Venta
3. Backend (controlador)
4. Frontend (formulario)
5. Detalles y listado
6. Pruebas

---

## Notas Adicionales

- El monto del gestor puede calcularse automáticamente: `(precio_venta - precio_compra) * cantidad` o ingresarse manualmente
- Se debe validar que la cuenta del gestor tenga saldo suficiente antes de aprobar
- Considerar agregar logs/historial del descuento al gestor
