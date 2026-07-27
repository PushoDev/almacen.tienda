# Pendiente: Reemplazo de Select por Combobox

> Reemplazar `<Select>` de shadcn/ui por `<Combobox>` de `@base-ui/react` (componente en `resources/js/components/ui/combobox.tsx`) en todas las páginas con listas dinámicas largas.

## Componente Combobox

- **Librería**: `@base-ui/react` v1.4.1
- **Archivo**: `resources/js/components/ui/combobox.tsx` (278 líneas, 16 subcomponentes)
- **Ya validado en**: `Movimientos/Index.tsx` y `Transacciones/layouts/Movimientos.tsx`

## Patrón de conversión

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
const [xSearch, setXSearch] = useState('')

<Combobox value={x} onValueChange={setX} onInputValueChange={setXSearch}
  itemToStringLabel={(id) => items.find(i => i.id == id)?.nombre ?? ''}>
  <ComboboxInput placeholder="..." showClear />
  <ComboboxContent>
    <ComboboxList>
      {items.filter(i => !xSearch || i.nombre.toLowerCase().includes(xSearch.toLowerCase())).map(i => (
        <ComboboxItem key={i.id} value={i.id}>{i.nombre}</ComboboxItem>
      ))}
    </ComboboxList>
  </ComboboxContent>
</Combobox>
```

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
