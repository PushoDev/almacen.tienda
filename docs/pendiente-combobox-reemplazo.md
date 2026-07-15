# Pendiente: Reemplazo de Select por Combobox

> Reemplazar `<Select>` de shadcn/ui por `<Combobox>` de `@base-ui/react` (componente en `resources/js/components/ui/combobox.tsx`) en todas las páginas con listas dinámicas largas.

## Patrón validado

Ya implementado en:
- `resources/js/pages/Movimientos/Index.tsx`
- `resources/js/pages/Transacciones/layouts/Movimientos.tsx`

### Cómo hacerlo

1. Cambiar import: `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` → `Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList`
2. Agregar estado de búsqueda: `const [xSearch, setXSearch] = useState('')`
3. Filtrar la lista manualmente antes de renderizar
4. Usar `onInputValueChange` para capturar el texto escrito
5. Usar `itemToStringLabel` para mostrar el nombre cuando ya hay un valor seleccionado
6. Manejar `onValueChange` con `string | null` (null cuando el usuario limpia con X)

---

## Alta prioridad

| Archivo | Selectores a convertir |
|---|---|
| `Vendor/Index.tsx` | Cliente, almacén, productos, mensajero (POS) |
| `Vendor/Show.tsx` | Mismos selectores que Index (edición de venta pendiente) |
| `Vendor/Listado.tsx` | Filtros: almacén, cliente, vendedor |
| `Comprar/Index.tsx` | Proveedor, cliente, productos, almacén |
| `Almacenes/Show.tsx` | Usuarios asignados al almacén |
| `Productos/Edit.tsx` | Categoría, proveedor |
| `Productos/Vendor/Index.tsx` | Producto, almacén |

## Media prioridad

| Archivo | Selectores a convertir |
|---|---|
| `Empleados/Create.tsx` | Almacén asignado |
| `Empleados/Edit.tsx` | Almacén asignado |
| `Transacciones/CambiarCostoManual.tsx` | Producto, almacén |
| `Reportes/Report/RastreoOperaciones.tsx` | Filtros de búsqueda |
| `Logistica/layout/ComprasVentas.tsx` | Filtro de almacén |
| `Logistica/layout/ProductosPorAlmacen.tsx` | Filtro de almacén |

## Baja prioridad (dejar como Select)

Opciones estáticas o enumeraciones cortas — no vale la pena:
- `Cuentas/Create.tsx`, `Edit.tsx`, `Index.tsx` — tipo de cuenta (CUP/USD/MLC)
- `Clientes/Create.tsx`, `Edit.tsx` — tipo de cliente
- `dashboard.tsx`, `dashboard/historial-comparaciones.tsx` — período (Hoy/Semana/Mes)
- `Cierres/Index.tsx` — filtros simples
- `Vendor/Cierre.tsx` — pocas opciones fijas
- `Almacenes/Create.tsx`, `Edit.tsx` — opciones de configuración fijas
