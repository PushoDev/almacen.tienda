# Plan de Implementación Frontend: Gestor de Ventas (`Vendor/Index.tsx`)

Este documento detalla el paso a paso para implementar la funcionalidad del Gestor de Ventas en la vista principal del Punto de Venta, conforme al flujo acordado.

## 1. Nuevos Estados Requeridos (State)

Se deben agregar los siguientes hooks de estado en el componente `PuntoVentaOficial`:

```tsx
// Estados para la funcionalidad de Gestor
const [esVentaGestor, setEsVentaGestor] = useState<boolean>(false);
const [gestorMonto, setGestorMonto] = useState<string>('');
const [gestorCuentaId, setGestorCuentaId] = useState<string>('');
const [gestorComentario, setGestorComentario] = useState<string>('');

// Las cuentas disponibles para los gestores se deben cargar desde la API
const [cuentasGestor, setCuentasGestor] = useState<Cuenta[]>([]);
const [cuentaGestorSeleccionada, setCuentaGestorSeleccionada] = useState<Cuenta | null>(null);
```

## 2. Cargar las Cuentas desde el Controlador

Crear una función para obtener las cuentas permitidas para el gestor, consumiendo el endpoint que ya comprobamos en el backend (`getCuentasParaGestor`):

```tsx
const cargarCuentasGestor = async () => {
    try {
        const response = await axios.get(route('ventas.getCuentasParaGestor'));
        setCuentasGestor(response.data);
    } catch (error) {
        toast.error('Error al cargar cuentas para gestores');
    }
};

// Insertar su llamado junto al `useEffect` que mapea clientes o almacenes
useEffect(() => {
    cargarCuentasGestor();
}, []);
```

## 3. Lógica de Cálculo Automático del Monto

**Requisito clave:** El monto se debe auto-calcular según la moneda de la cuenta del gestor seleccionada y la tasa de cambio vigente o editada en la operación principal de la venta.  

```tsx
// Efecto para recalcular automáticamente el monto del gestor
useEffect(() => {
    if (esVentaGestor && cuentaGestorSeleccionada) {
        // En tu vista ya tienes estados como `tasaCambioPrincipal` 
        // y monedas editadas en `currentPayment` o en los items.

        // Simulación: Si necesitas basar la comisión en un monto específico por cantidad en USD.
        // Se aplica la conversión usando la tasa de cambio de la moneda de la cuenta elegida:
        // const tasaMonedaCuenta = cuentaGestorSeleccionada.moneda?.tasa_cambio;
        
        // Si el usuario edita la tasa de cambio general en el formulario, cruzar esa variable aquí
        // let montoAutoCalculado = totalEnUSD * tasaDeLaOperacion; 

        // setGestorMonto(montoAutoCalculado.toFixed(2));
    }
}, [cuentaGestorSeleccionada, /* tasas, etc */]);
```

## 4. UI: Switch y Collapsible (Formulario)

El formulario va envuelto en un contenedor condicional de tipo "Collapsible" que responde al Switch de Gestor.

```tsx
{/* Sección de Gestor de Venta */}
<div className="mt-6 border rounded-md p-4 bg-muted/30">
    <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
            <Label htmlFor="es-venta-gestor" className="font-semibold text-base">
                ¿Venta realizada mediante un Gestor?
            </Label>
            <span className="text-sm text-muted-foreground">
                Activa para asignar una comisión automática o manual
            </span>
        </div>
        <Switch
            id="es-venta-gestor"
            checked={esVentaGestor}
            onCheckedChange={(checked) => {
                setEsVentaGestor(checked);
                if (!checked) {
                    setGestorCuentaId('');
                    setCuentaGestorSeleccionada(null);
                    setGestorMonto('');
                    setGestorComentario('');
                }
            }}
        />
    </div>

    {/* Formulario que se despliega animado */}
    {esVentaGestor && (
        <div className="mt-4 pt-4 border-t grid gap-4 lg:grid-cols-2 animate-in fade-in slide-in-from-top-4 duration-300">
            
            {/* Selección de Cuenta */}
            <div className="flex flex-col gap-2">
                <Label>Cuenta para depositar al Gestor</Label>
                <Select
                    value={gestorCuentaId}
                    onValueChange={(val) => {
                        setGestorCuentaId(val);
                        const account = cuentasGestor.find(c => c.id.toString() === val);
                        setCuentaGestorSeleccionada(account || null);
                    }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona una cuenta..." />
                    </SelectTrigger>
                    <SelectContent>
                        {cuentasGestor.map(cuenta => (
                            <SelectItem key={cuenta.id} value={cuenta.id.toString()}>
                                {cuenta.nombre_cuenta} - {cuenta.moneda?.simbolo || cuenta.tipo_moneda}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                
                {/* Visualización del Tipo de Moneda (Requisito solicitado) */}
                {cuentaGestorSeleccionada && (
                    <span className="text-xs text-blue-600 font-medium ml-1">
                        Moneda detectada: {cuentaGestorSeleccionada.moneda?.nombre} ({cuentaGestorSeleccionada.moneda?.codigo})
                    </span>
                )}
            </div>

            {/* Monto Autocalculado */}
            <div className="flex flex-col gap-2">
                <Label>Monto de Comisión (Autocalculado / Editable)</Label>
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">
                        {cuentaGestorSeleccionada?.moneda?.simbolo || '$'}
                    </span>
                    <Input 
                        type="number" 
                        step="0.01" 
                        className="pl-8" 
                        placeholder="0.00" 
                        value={gestorMonto}
                        onChange={(e) => setGestorMonto(e.target.value)}
                    />
                </div>
            </div>

            {/* Comentario (Abarca 2 columnas) */}
            <div className="flex flex-col gap-2 lg:col-span-2">
                <Label>Comentario de la Operación</Label>
                <Textarea 
                    placeholder="Escribe observaciones adicionales sobre el acuerdo con el gestor..." 
                    value={gestorComentario}
                    onChange={(e) => setGestorComentario(e.target.value)}
                    rows={2}
                />
            </div>
        </div>
    )}
</div>
```

## 5. Inserción en el Payload Final

Cuando se envíen los datos al backend (mediante Axios o `router.post`), deberemos inyectar estos parámetros.
En `procesarVenta`:

```javascript
const payload = {
    // ... datos del carrito, total, pagos ...
    
    // --- NUEVO GESTOR ---
    es_venta_gestor: esVentaGestor,
    gestor_monto: esVentaGestor ? parseFloat(gestorMonto) : null,
    gestor_cuenta_id: (esVentaGestor && gestorCuentaId) ? gestorCuentaId : null,
    gestor_comentario: esVentaGestor ? gestorComentario : null,
};
```

---

## Confirmación del Flujo

Sí, **entiendo perfectamente el flujo**. La idea es que todo ocurra de forma fluida durante el proceso de caja (Point of Sale):

1. **Colapsable (Switch):** Si la venta es de un gestor, el cajero prende el switch y automáticamente se desliza el formulario hacia abajo. Todo está oculto si no se usa para mantener la UI limpia.
2. **Selección de cuenta y moneda:** En cuanto el usuario elige a qué cuenta bancaria o caja irá la comisión, un texto abajo le confirmará exactamente qué moneda es (ej. CUP, USD, MLC).
3. **Monto Inteligente:** Como la cuenta tendrá un código de moneda, el campo monto reaccionará y se **calculará automáticamente** utilizando la misma tasa de conversión que el cajero definió arriba durante la venta. 
4. **Comentarios de auditoría:** Un cuadro de texto grande por si se requiere anotar condiciones de la operación, cerrando con el botón final para proceder con todo el carrito y la comisión integrada.

Este archivo `PLAN_GESTOR_FRONTEND.md` sirve como la hoja de ruta clara para implementar mañana. Todo cuadra perfectamente con la validación de seguridad e integridad financiera que vimos que ya está hecha en el Backend.
