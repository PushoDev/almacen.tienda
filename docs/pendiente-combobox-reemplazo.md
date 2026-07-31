# Pendiente: Reemplazo de Select por Combobox

> Reemplazar `<Select>` de shadcn/ui por `<Combobox>` de `@base-ui/react` (componente en `resources/js/components/ui/combobox.tsx`) en todas las páginas con listas dinámicas largas.

## Componente Combobox

- **Librería**: `@base-ui/react` v1.4.1
- **Archivo**: `resources/js/components/ui/combobox.tsx` (278 líneas, 16 subcomponentes)
- **Ya validado en**: `Movimientos/Index.tsx` y `Transacciones/layouts/Movimientos.tsx`

## Patrón de conversión

**Referencia canónica**: `Movimientos/Index.tsx` (selectores de Almacén Origen/Destino). Cualquier conversión nueva debe copiar exactamente esta forma — no introducir variantes (p. ej. no usar `ComboboxEmpty` en vez del div manual, no comparar ids con `==` en vez de `.toString() ===`) salvo que se decida explícitamente cambiar el patrón de referencia.

De Select:
```tsx
<Select value={x} onValueChange={setX}>
  <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
  <SelectContent>
    {items.map(i => <SelectItem key={i.id} value={i.id}>{i.nombre}</SelectItem>)}
  </SelectContent>
</Select>
```

A Combobox:
```tsx
// 1. Un state para la selección (string, nunca number — el primitive trabaja con ids como string)
//    y OTRO state separado para el texto de búsqueda. No compartir el mismo state para ambas cosas.
const [xId, setXId] = useState<string>('')
const [xSearch, setXSearch] = useState('')

// 2. Si la lista de opciones depende de permisos (rol) o de otra selección (exclusión mutua,
//    dependencia entre campos), encadenar esos filtros ANTES del filtro de texto:
const itemsPermitidos = esRestringido ? items.filter(i => idsPermitidos.includes(i.id)) : items
const itemsFiltrados = itemsPermitidos.filter(i => !xSearch || i.nombre.toLowerCase().includes(xSearch.toLowerCase()))

<div className="flex flex-col space-y-1.5">
  <Label htmlFor="x_id">Etiqueta del campo</Label>
  <Combobox
    value={xId || null}
    onValueChange={(value) => {
      // onValueChange recibe string | null (null al limpiar con el botón X).
      // Si seleccionar este campo debe disparar un efecto (ej. cargar datos
      // dependientes con fetch/router), hacerlo aquí, no en un useEffect aparte.
      if (!value) {
        setXId('')
        return
      }
      setXId(value)
    }}
    onInputValueChange={setXSearch}
    itemToStringLabel={(id: string) => items.find(i => i.id.toString() === id)?.nombre ?? ''}
  >
    <ComboboxInput id="x_id" className="w-full" placeholder="Buscar..." showClear />
    <ComboboxContent>
      <ComboboxList>
        {itemsFiltrados.map(i => (
          <ComboboxItem key={i.id} value={i.id.toString()}>{i.nombre}</ComboboxItem>
        ))}
        {itemsFiltrados.length === 0 && (
          <div className="py-2 text-center text-sm text-muted-foreground">Sin resultados</div>
        )}
      </ComboboxList>
    </ComboboxContent>
  </Combobox>
</div>
```

**Puntos que no son opcionales al convertir:**
- `value={xId || null}` — el primitive espera `string | null`, nunca `''`.
- `value={i.id.toString()}` en cada `ComboboxItem` — los ids numéricos del modelo siempre van como string.
- `itemToStringLabel` compara con `.toString() ===`, no con `==` — evita falsos positivos de coerción.
- El estado vacío (`Sin resultados`) se renderiza a mano como `<div>` condicional, dentro de `ComboboxList`, después del `.map()` — no usar `ComboboxEmpty`, para mantener consistencia con el patrón ya validado.
- Si el campo tiene reglas de qué opciones puede ver el usuario (rol) o depende de otro campo ya seleccionado (exclusión mutua, filtrado en cascada), ese filtrado va **antes** del filtro de texto, como una lista base separada (ver `almacenesOrigen`/`almacenesDestino` en `Movimientos/Index.tsx`).

## Prioridades

### HIGH — Listas dinámicas largas (con búsqueda)

| Archivo | Selectores a convertir | Observaciones |
|---|---|---|
| `Vendor/Index.tsx` | Cliente, almacén, productos, mensajero (POS) | Ya usa Combobox parcialmente en algunos selects |
| `Vendor/Show.tsx` | Cliente, almacén, productos | Edición de venta pendiente |
| `Vendor/Listado.tsx` | Filtros: almacén, cliente, vendedor | Filtros de búsqueda |
| `Comprar/Index.tsx` | Proveedor, cliente, productos, almacén | Ya usa Combobox parcialmente |
| `Almacenes/Show.tsx` | Usuarios asignados al almacén | Selector de usuarios |
| `Productos/Edit.tsx` | Categoría, proveedor | Formulario de edición |
| `Productos/Vendor/Index.tsx` | Producto, almacén | Asignación de precios |

### MEDIUM — Con búsqueda útil

| Archivo | Selectores |
|---|---|
| `Empleados/Create.tsx` | Almacén asignado |
| `Empleados/Edit.tsx` | Almacén asignado |
| `Transacciones/CambiarCostoManual.tsx` | Producto, almacén |
| `Reportes/Report/RastreoOperaciones.tsx` | Filtros de búsqueda |
| `Logistica/layout/ComprasVentas.tsx` | Filtro de almacén |
| `Logistica/layout/ProductosPorAlmacen.tsx` | Filtro de almacén |

### LOW — Dejar como Select

Opciones estáticas o enumeraciones cortas — no vale la pena:
- `Cuentas/Create.tsx`, `Edit.tsx`, `Index.tsx` — tipo de cuenta (CUP/USD/MLC)
- `Clientes/Create.tsx`, `Edit.tsx` — tipo de cliente
- `dashboard.tsx`, `dashboard/historial-comparaciones.tsx` — período (Hoy/Semana/Mes)
- `Cierres/Index.tsx` — filtros simples
- `Vendor/Cierre.tsx` — pocas opciones fijas
- `Almacenes/Create.tsx`, `Edit.tsx` — opciones de configuración fijas
