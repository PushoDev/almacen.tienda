import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRightLeft,
    Calendar,
    CheckCircle2,
    Clock,
    DollarSign,
    Eye,
    History,
    Landmark,
    Package,
    Scale,
    Search,
    Store,
    Trash2,
    Truck,
    User,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { Toaster } from '@/components/ui/sileo-toaster';
import { sileo } from '@/lib/sileo';

interface Moneda {
    id: number;
    codigo_moneda: string;
    nombre_moneda: string;
    simbolo_moneda: string;
    tasa_cambio: number;
    estado: boolean;
    principal: boolean;
}

interface Cuenta {
    id: number;
    nombre_cuenta: string;
    saldo_cuenta: number;
    tipo_cuenta: string;
    estado: string;
    moneda_id: number;
    moneda: Moneda;
}

interface Producto {
    id: number;
    nombre_producto: string;
    precio_compra_producto: number;
}

interface Compra {
    id: number;
    fecha_compra: string;
    total_compra: number | string;
    productos: Producto[];
    origen: string | null;
    almacenes: string[];
    tiene_distribucion: boolean;
    estado: string;
}

interface ComprasPaginadas {
    data: Compra[];
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}

interface Proveedor {
    id: number;
    nombre_proveedor: string;
}

interface Almacen {
    id: number;
    nombre_almacen: string;
}

interface Filtros {
    buscar: string;
    proveedor_id: string;
    almacen_id: string;
    fecha: string;
}

interface MovimientoPendiente {
    id: number;
    fecha_envio: string | null;
    almacen_origen: string | null;
    almacen_destino: string | null;
    usuario: string | null;
    cantidad_lineas: number;
}

interface MovimientosPaginados {
    data: MovimientoPendiente[];
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}

interface FiltrosMovimientos {
    buscar: string;
    almacen_id: string;
    fecha: string;
}

interface Props {
    compras: ComprasPaginadas;
    cuentas: Cuenta[];
    tasaCambioActual: number | string;
    proveedores: Proveedor[];
    almacenes: Almacen[];
    filtros: Filtros;
    operacionesComprasRealizadas: number;
    // Eliminar de la lista (sin prorratear) acumula lotes: solo admin/moderador.
    puedeEliminarPendientes?: boolean;
    // Solo llegan cuando el usuario autenticado es admin/moderador — un vendedor nunca recibe
    // estas props y la pestaña "Movimientos" no se renderiza (prorratear movimientos es
    // admin/moderador-only, regla del cliente).
    movimientosPendientes?: MovimientosPaginados;
    almacenesMovimientos?: Almacen[];
    filtrosMovimientos?: FiltrosMovimientos;
    movimientosTotal?: number;
    movimientosPorRecibir?: number;
    operacionesProrrateoMovimientos?: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Distribución de Costos',
        href: '/distribucion-costos',
    },
];

export default function DistribucionCostosIndex({
    compras,
    cuentas,
    tasaCambioActual,
    proveedores,
    almacenes,
    filtros,
    operacionesComprasRealizadas,
    puedeEliminarPendientes = false,
    movimientosPendientes,
    almacenesMovimientos,
    filtrosMovimientos,
    movimientosTotal,
    movimientosPorRecibir,
    operacionesProrrateoMovimientos,
}: Props) {
    // Cuentas elegibles para financiar cualquiera de los dos tipos de prorrateo (CUP o USD,
    // mezcladas está permitido) — mismo widget en ambas pestañas porque el motor de cálculo es
    // el mismo sin importar si el lote es de compras o de movimientos.
    const cuentasElegibles = cuentas.filter(
        (cuenta) => (cuenta.moneda.codigo_moneda === 'CUP' || cuenta.moneda.codigo_moneda === 'USD') && cuenta.estado === 'activa',
    );

    // Filtros — mismo patrón que Cuentas/Show.tsx: busca por ID/proveedor/cliente (Enter o blur),
    // Select de Proveedor y Almacén (aplica al elegir), todo vía query string al backend.
    const [busqueda, setBusqueda] = useState(filtros.buscar ?? '');

    const aplicarFiltros = (cambios: Record<string, string | undefined>) => {
        const actuales = Object.fromEntries(new URLSearchParams(window.location.search));
        const nuevos: Record<string, string> = { ...actuales };

        Object.entries(cambios).forEach(([clave, valor]) => {
            if (valor) {
                nuevos[clave] = valor;
            } else {
                delete nuevos[clave];
            }
        });
        delete nuevos.page;

        router.get(window.location.pathname, nuevos, { preserveState: true, preserveScroll: true, replace: true });
    };

    // Selección de compras para prorratear varias juntas ("lote") en una sola operación.
    const [seleccionadas, setSeleccionadas] = useState<number[]>([]);

    // Solo las compras aprobadas o anuladas que todavía no se prorratean se pueden eliminar de la lista.
    const seleccionadasEliminables = compras.data
        .filter((compra) => seleccionadas.includes(compra.id) && !compra.tiene_distribucion && ['aprobada', 'anulada'].includes(compra.estado))
        .map((compra) => compra.id);

    const toggleSeleccionada = (id: number) => {
        setSeleccionadas((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
    };

    const distribuirSeleccionadas = () => {
        if (seleccionadas.length > 0) {
            router.get(route('distribucion-costos.formulario'), { compras: seleccionadas });
        }
    };

    // --- Pestaña "Movimientos": mismo patrón de lote que compras, pero con dos acciones
    // (distribuir/omitir) y filtros propios namespaced (mov_*) para no chocar con los de compras.
    // Controla qué widget de resumen se muestra arriba (el primero cambia según la pestaña activa).
    //
    // Se inicializa leyendo la URL en vez de siempre 'compras': la paginación y los filtros de
    // esta página navegan con router.get() (visita completa de Inertia, remonta el componente),
    // así que sin esto, hacer clic en la página 2 de "Movimientos" traía los datos correctos pero
    // la vista saltaba de vuelta a la pestaña "Compras" — el estado de React no sobrevive la
    // visita, la URL sí.
    const [tabActiva, setTabActiva] = useState<'compras' | 'movimientos'>(() => {
        if (typeof window === 'undefined') return 'compras';
        const params = new URLSearchParams(window.location.search);
        const esMovimientos =
            params.get('tab') === 'movimientos' ||
            params.has('movimientos_page') ||
            params.has('mov_buscar') ||
            params.has('mov_almacen_id') ||
            params.has('mov_fecha');
        return esMovimientos ? 'movimientos' : 'compras';
    });

    const [busquedaMov, setBusquedaMov] = useState(filtrosMovimientos?.buscar ?? '');
    const [seleccionadosMov, setSeleccionadosMov] = useState<number[]>([]);
    // Compras o movimientos que se van a eliminar de la lista de pendientes (uno desde su fila, o los seleccionados); null = diálogo cerrado.
    const [eliminacion, setEliminacion] = useState<{ tipo: 'compras' | 'movimientos'; ids: number[] } | null>(null);

    const aplicarFiltrosMovimientos = (cambios: Record<string, string | undefined>) => {
        const actuales = Object.fromEntries(new URLSearchParams(window.location.search));
        const nuevos: Record<string, string> = { ...actuales };

        Object.entries(cambios).forEach(([clave, valor]) => {
            if (valor) {
                nuevos[clave] = valor;
            } else {
                delete nuevos[clave];
            }
        });
        delete nuevos.movimientos_page;

        router.get(window.location.pathname, nuevos, { preserveState: true, preserveScroll: true, replace: true });
    };

    const toggleSeleccionadoMov = (id: number) => {
        setSeleccionadosMov((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
    };

    const distribuirSeleccionadosMov = () => {
        if (seleccionadosMov.length > 0) {
            router.get(route('distribucion-costos.formulario'), { movimientos: seleccionadosMov });
        }
    };

    const confirmarEliminarDeLaLista = () => {
        if (!eliminacion) return;
        const { tipo, ids } = eliminacion;
        const esCompras = tipo === 'compras';

        router.post(
            route(esCompras ? 'distribucion-costos.compras.omitir' : 'distribucion-costos.movimientos.omitir'),
            esCompras ? { compra_ids: ids } : { movimiento_ids: ids },
            {
                onSuccess: (page) => {
                    const flash = page.props.flash as { success?: string | null; error?: string | null } | undefined;
                    if (flash?.error) {
                        sileo.error({ title: 'No se pudo eliminar de la lista', description: flash.error });
                    } else {
                        sileo.success({
                            title: esCompras
                                ? ids.length === 1
                                    ? 'Compra eliminada de la lista'
                                    : 'Compras eliminadas de la lista'
                                : ids.length === 1
                                  ? 'Movimiento eliminado de la lista'
                                  : 'Movimientos eliminados de la lista',
                            description: flash?.success ?? `${ids.length} sin prorratear.`,
                        });
                    }
                    if (esCompras) {
                        setSeleccionadas((previas) => previas.filter((id) => !ids.includes(id)));
                    } else {
                        setSeleccionadosMov((previos) => previos.filter((id) => !ids.includes(id)));
                    }
                    setEliminacion(null);
                },
                onError: (errors) => {
                    const firstError = Object.values(errors)[0];
                    sileo.error({ title: 'No se pudo eliminar de la lista', description: firstError });
                    setEliminacion(null);
                },
            },
        );
    };

    const hayFiltrosActivosMov = Boolean(filtrosMovimientos?.buscar || filtrosMovimientos?.almacen_id || filtrosMovimientos?.fecha);

    const limpiarFiltrosMovimientos = () => {
        setBusquedaMov('');
        aplicarFiltrosMovimientos({ mov_buscar: undefined, mov_almacen_id: undefined, mov_fecha: undefined });
    };

    const almacenMovSeleccionado = almacenesMovimientos?.find((a) => String(a.id) === filtrosMovimientos?.almacen_id) ?? null;

    const formatFechaHora = (fecha: string | null) => {
        if (!fecha) return '—';
        try {
            return new Date(fecha).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch {
            return fecha;
        }
    };

    const proveedorSeleccionado = proveedores.find((p) => String(p.id) === filtros.proveedor_id) ?? null;
    const almacenSeleccionado = almacenes.find((a) => String(a.id) === filtros.almacen_id) ?? null;

    const hayFiltrosActivos = Boolean(filtros.buscar || filtros.proveedor_id || filtros.almacen_id || filtros.fecha);

    const limpiarFiltros = () => {
        setBusqueda('');
        aplicarFiltros({ buscar: undefined, proveedor_id: undefined, almacen_id: undefined, fecha: undefined });
    };

    const formatFecha = (fecha: string) => {
        try {
            // "2026-08-20" (fecha sin hora) — new Date(string) la interpreta como medianoche UTC,
            // y toLocaleDateString() la muestra en la zona horaria local del navegador. En zonas
            // detrás de UTC (Cuba, CDT, etc.) eso retrocede un día (19 en vez de 20). Se parsean
            // los componentes a mano para construir la fecha en local, no en UTC.
            const [year, month, day] = fecha.split('-').map(Number);
            return new Date(year, month - 1, day).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return fecha;
        }
    };

    const formatTotalCompra = (total: number | string): string => {
        const num = typeof total === 'number' ? total : parseFloat(total);
        return isNaN(num) ? '0.00' : num.toFixed(2);
    };

    const formatNumber = (value: number | string): string => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(num) ? '0.00' : num.toFixed(2);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Distribución de Costos" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header — insignia del proyecto, mismo patrón que el resto de la app */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Distribución de Costos"
                        description="Distribuya costos adicionales (transporte, aranceles, etc.) entre los productos de una compra."
                    />
                    <DollarSign
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* Resumen — mini-widgets con acento lateral (Vendor/Show.tsx, Comprar/Show.tsx), número grande al estilo de las tarjetas estadísticas del dashboard. Los 4 widgets cambian por completo según la pestaña activa. */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {tabActiva === 'movimientos' ? (
                        <>
                            <div className="bg-card rounded-lg border-l-4 border-slate-400 p-4 shadow-sm dark:border-slate-600">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                        <Truck className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold">Total de Movimientos</h3>
                                </div>
                                <p className="mt-1 text-2xl font-bold text-slate-700 dark:text-slate-300">{movimientosTotal ?? 0}</p>
                            </div>

                            <div className="bg-card rounded-lg border-l-4 border-cyan-400 p-4 shadow-sm dark:border-cyan-600">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/40">
                                        <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold">Movimientos por Recibir</h3>
                                </div>
                                <p className="mt-1 text-2xl font-bold text-cyan-700 dark:text-cyan-300">{movimientosPorRecibir ?? 0}</p>
                            </div>

                            <Link
                                href={route('distribucion-costos.historial', { tipo: 'movimientos' })}
                                className="bg-card block rounded-lg border-l-4 border-orange-400 p-4 shadow-sm transition-shadow hover:shadow-md dark:border-orange-600"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40">
                                        <Scale className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold">Operaciones de Prorrateo realizadas</h3>
                                </div>
                                <p className="mt-1 text-2xl font-bold text-orange-700 dark:text-orange-300">
                                    {operacionesProrrateoMovimientos ?? 0}
                                </p>
                            </Link>

                            <div className="bg-card rounded-lg border-l-4 border-emerald-400 p-4 shadow-sm dark:border-emerald-600">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                                        <Landmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold">Cuentas Disponibles USD/CUP</h3>
                                </div>
                                <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{cuentasElegibles.length}</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-card rounded-lg border-l-4 border-slate-400 p-4 shadow-sm dark:border-slate-600">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                        <Package className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold">Total de Compras</h3>
                                </div>
                                <p className="mt-1 text-2xl font-bold text-slate-700 dark:text-slate-300">{compras.total}</p>
                            </div>

                            <Link
                                href={route('distribucion-costos.historial', { tipo: 'compras' })}
                                className="bg-card block rounded-lg border-l-4 border-indigo-400 p-4 shadow-sm transition-shadow hover:shadow-md dark:border-indigo-600"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
                                        <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold">Operaciones realizadas</h3>
                                </div>
                                <p className="mt-1 text-2xl font-bold text-indigo-700 dark:text-indigo-300">{operacionesComprasRealizadas}</p>
                            </Link>

                            <div className="bg-card rounded-lg border-l-4 border-emerald-400 p-4 shadow-sm dark:border-emerald-600">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                                        <Landmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold">Cuentas Disponibles USD/CUP</h3>
                                </div>
                                <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{cuentasElegibles.length}</p>
                            </div>

                            <div className="bg-card rounded-lg border-l-4 border-amber-400 p-4 shadow-sm dark:border-amber-600">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                                        <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold">Tasa CUP/USD</h3>
                                </div>
                                <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">{formatNumber(tasaCambioActual)}</p>
                            </div>
                        </>
                    )}
                </div>

                <Tabs value={tabActiva} onValueChange={(v) => setTabActiva(v as 'compras' | 'movimientos')} className="w-full">
                    {movimientosPendientes && (
                        <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                            <TabsTrigger value="compras" className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                Compras
                            </TabsTrigger>
                            <TabsTrigger value="movimientos" className="flex items-center gap-2">
                                <Scale className="h-4 w-4" />
                                Movimientos
                                {movimientosPendientes.total > 0 && (
                                    <Badge variant="secondary" className="ml-1">
                                        {movimientosPendientes.total}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>
                    )}

                    <TabsContent value="compras" className="mt-4 space-y-4">
                        {/* Barra de Herramientas — filtros en su propia Card, mismo patrón que Clientes/Index.tsx y Proveedores/index.tsx */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex flex-wrap items-end gap-3">
                                    <div className="relative min-w-[220px] flex-1">
                                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                        <Input
                                            value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') aplicarFiltros({ buscar: busqueda });
                                    }}
                                    onBlur={() => aplicarFiltros({ buscar: busqueda })}
                                    placeholder="Buscar por ID, proveedor o cliente..."
                                    className="pl-10"
                                />
                            </div>
                            <div className="w-[200px]">
                                <Combobox
                                    items={proveedores}
                                    itemToStringLabel={(item) => item.nombre_proveedor}
                                    itemToStringValue={(item) => item.nombre_proveedor}
                                    value={proveedorSeleccionado}
                                    onValueChange={(p) => aplicarFiltros({ proveedor_id: p ? String(p.id) : undefined })}
                                >
                                    <ComboboxInput placeholder="Proveedor/Cliente" showClear={!!filtros.proveedor_id} />
                                    <ComboboxContent>
                                        <ComboboxEmpty>No se encontraron proveedores.</ComboboxEmpty>
                                        <ComboboxList>
                                            {(p) => (
                                                <ComboboxItem key={p.id} value={p}>
                                                    {p.nombre_proveedor}
                                                </ComboboxItem>
                                            )}
                                        </ComboboxList>
                                    </ComboboxContent>
                                </Combobox>
                            </div>
                            <div className="w-[180px]">
                                <Combobox
                                    items={almacenes}
                                    itemToStringLabel={(item) => item.nombre_almacen}
                                    itemToStringValue={(item) => item.nombre_almacen}
                                    value={almacenSeleccionado}
                                    onValueChange={(a) => aplicarFiltros({ almacen_id: a ? String(a.id) : undefined })}
                                >
                                    <ComboboxInput placeholder="Almacén" showClear={!!filtros.almacen_id} />
                                    <ComboboxContent>
                                        <ComboboxEmpty>No se encontraron almacenes.</ComboboxEmpty>
                                        <ComboboxList>
                                            {(a) => (
                                                <ComboboxItem key={a.id} value={a}>
                                                    {a.nombre_almacen}
                                                </ComboboxItem>
                                            )}
                                        </ComboboxList>
                                    </ComboboxContent>
                                </Combobox>
                            </div>
                            <div className="space-y-1">
                                <label className="text-muted-foreground text-[10px]">Fecha</label>
                                <Input
                                    type="date"
                                    value={filtros.fecha}
                                    onChange={(e) => aplicarFiltros({ fecha: e.target.value })}
                                    className="w-[150px]"
                                />
                            </div>
                            {hayFiltrosActivos && (
                                <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
                                    <X size={14} className="mr-1" />
                                    Limpiar filtro
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Listado de compras para prorratear — card con header en degradado (patrón de Comprar/Index.tsx) */}
                <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <Package className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-white">Compras para Distribuir Costos</CardTitle>
                                    <CardDescription className="text-indigo-100">
                                        Seleccione una o varias compras para distribuir manualmente los costos adicionales entre sus productos (solo
                                        disponible para cuentas en moneda CUP) o elimínelas de la lista si no se van a prorratear.
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Link href={route('distribucion-costos.historial')}>
                                    <Button variant="outline" className="cursor-pointer border-white/30 bg-white/10 text-white hover:bg-white/20">
                                        <History className="h-4 w-4" />
                                        Ver Historial
                                    </Button>
                                </Link>
                                {puedeEliminarPendientes && seleccionadasEliminables.length > 0 && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setEliminacion({ tipo: 'compras', ids: seleccionadasEliminables })}
                                        className="cursor-pointer border-white/30 bg-white/10 text-white hover:bg-white/20"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Eliminar {seleccionadasEliminables.length} seleccionada{seleccionadasEliminables.length === 1 ? '' : 's'}
                                    </Button>
                                )}
                                {seleccionadas.length > 0 && (
                                    <Button
                                        onClick={distribuirSeleccionadas}
                                        className="cursor-pointer bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                                    >
                                        <ArrowRightLeft className="h-4 w-4" />
                                        Distribuir {seleccionadas.length} seleccionada{seleccionadas.length === 1 ? '' : 's'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                    <TableHead className="w-10"></TableHead>
                                    <TableHead className="w-20">ID</TableHead>
                                    <TableHead className="w-32">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            Fecha
                                        </div>
                                    </TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <Truck className="h-4 w-4" />
                                            Proveedor/Cliente
                                        </div>
                                    </TableHead>
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <Store className="h-4 w-4" />
                                            Almacén
                                        </div>
                                    </TableHead>
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <Package className="h-4 w-4" />
                                            Productos
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-24 text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {compras.data.length > 0 ? (
                                    compras.data.map((compra) => (
                                        <TableRow key={compra.id} className="group hover:bg-muted/50">
                                            <TableCell>
                                                {compra.estado === 'aprobada' ? (
                                                    <Checkbox
                                                        checked={seleccionadas.includes(compra.id)}
                                                        onCheckedChange={() => toggleSeleccionada(compra.id)}
                                                        className="size-5 border-2 border-slate-400 dark:border-slate-300"
                                                    />
                                                ) : (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span>
                                                                <Checkbox disabled className="size-5 border-2" />
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Solo se pueden prorratear compras aprobadas — esta sigue {compra.estado}.
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <Badge variant="secondary">#{compra.id}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{formatFecha(compra.fecha_compra)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <DollarSign className="h-4 w-4 text-green-600" />
                                                    <span className="font-semibold">{formatTotalCompra(compra.total_compra)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {compra.origen ? (
                                                    <Badge variant="outline" className="border-violet-300 text-violet-700 dark:text-violet-300">
                                                        {compra.origen}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {compra.almacenes.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {compra.almacenes.map((almacen) => (
                                                            <Badge
                                                                key={almacen}
                                                                variant="outline"
                                                                className="border-cyan-300 text-cyan-700 dark:text-cyan-300"
                                                            >
                                                                {almacen}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="gap-1 border-teal-300 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                                                    <Package className="h-3 w-3" />
                                                    {compra.productos.length} {compra.productos.length === 1 ? 'producto' : 'productos'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {compra.tiene_distribucion ? (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Link href={route('distribucion-costos.historial', { compra_id: compra.id })}>
                                                                    <Button variant="outline" size="icon" className="cursor-pointer">
                                                                        <Eye className="h-4 w-4" />
                                                                    </Button>
                                                                </Link>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Detalles</TooltipContent>
                                                        </Tooltip>
                                                    ) : puedeEliminarPendientes && ['aprobada', 'anulada'].includes(compra.estado) ? (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="cursor-pointer text-red-600 hover:text-red-700"
                                                                    onClick={() => setEliminacion({ tipo: 'compras', ids: [compra.id] })}
                                                                    aria-label={`Eliminar la compra #${compra.id} de la lista`}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Eliminar de la lista (sin prorratear)</TooltipContent>
                                                        </Tooltip>
                                                    ) : (
                                                        <div className="size-9" />
                                                    )}

                                                    {compra.estado === 'aprobada' ? (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Link href={route('distribucion-costos.formulario', { compras: [compra.id] })}>
                                                                    <Button
                                                                        size="icon"
                                                                        className="cursor-pointer bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                                                                    >
                                                                        <ArrowRightLeft className="h-4 w-4" />
                                                                    </Button>
                                                                </Link>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Distribuir</TooltipContent>
                                                        </Tooltip>
                                                    ) : (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span>
                                                                    <Button size="icon" disabled className="cursor-not-allowed">
                                                                        <ArrowRightLeft className="h-4 w-4" />
                                                                    </Button>
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Solo se pueden prorratear compras aprobadas — esta sigue {compra.estado}.
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-8 text-center">
                                            <div className="text-muted-foreground flex flex-col items-center gap-2">
                                                <Package className="h-12 w-12 opacity-50" />
                                                <p>No se encontraron compras recientes</p>
                                                <p className="text-sm">Las compras aparecerán aquí una vez que sean registradas</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {/* Paginación — mismo patrón que Movimientos/Index.tsx */}
                        {compras.links && compras.data.length > 0 && (
                            <div className="mt-4 flex items-center justify-between">
                                <div className="text-muted-foreground text-sm">
                                    Mostrando {compras.from} a {compras.to} de {compras.total} resultados
                                </div>
                                <div className="flex space-x-2">
                                    {compras.links.map((link, index) => {
                                        const displayLabel = link.label
                                            .replace('&laquo;', '«')
                                            .replace('&raquo;', '»')
                                            .replace('pagination.previous', '«')
                                            .replace('pagination.next', '»');

                                        return (
                                            <Button
                                                key={index}
                                                variant={link.active ? 'default' : 'outline'}
                                                size="sm"
                                                disabled={!link.url}
                                                onClick={() => link.url && router.get(link.url)}
                                            >
                                                {displayLabel}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
                    </TabsContent>

                    {movimientosPendientes && (
                        <TabsContent value="movimientos" className="mt-4 space-y-4">
                            {/* Barra de Herramientas — mismo patrón que la pestaña de compras, filtros propios (mov_*) */}
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex flex-wrap items-end gap-3">
                                        <div className="relative min-w-[220px] flex-1">
                                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                            <Input
                                                value={busquedaMov}
                                                onChange={(e) => setBusquedaMov(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') aplicarFiltrosMovimientos({ mov_buscar: busquedaMov });
                                                }}
                                                onBlur={() => aplicarFiltrosMovimientos({ mov_buscar: busquedaMov })}
                                                placeholder="Buscar por ID o solicitante..."
                                                className="pl-10"
                                            />
                                        </div>
                                        <div className="w-[180px]">
                                            <Combobox
                                                items={almacenesMovimientos ?? []}
                                                itemToStringLabel={(item) => item.nombre_almacen}
                                                itemToStringValue={(item) => item.nombre_almacen}
                                                value={almacenMovSeleccionado}
                                                onValueChange={(a) => aplicarFiltrosMovimientos({ mov_almacen_id: a ? String(a.id) : undefined })}
                                            >
                                                <ComboboxInput placeholder="Almacén" showClear={!!filtrosMovimientos?.almacen_id} />
                                                <ComboboxContent>
                                                    <ComboboxEmpty>No se encontraron almacenes.</ComboboxEmpty>
                                                    <ComboboxList>
                                                        {(a) => (
                                                            <ComboboxItem key={a.id} value={a}>
                                                                {a.nombre_almacen}
                                                            </ComboboxItem>
                                                        )}
                                                    </ComboboxList>
                                                </ComboboxContent>
                                            </Combobox>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-muted-foreground text-[10px]">Fecha de envío</label>
                                            <Input
                                                type="date"
                                                value={filtrosMovimientos?.fecha ?? ''}
                                                onChange={(e) => aplicarFiltrosMovimientos({ mov_fecha: e.target.value })}
                                                className="w-[150px]"
                                            />
                                        </div>
                                        {hayFiltrosActivosMov && (
                                            <Button variant="ghost" size="sm" onClick={limpiarFiltrosMovimientos}>
                                                <X size={14} className="mr-1" />
                                                Limpiar filtro
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                                <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5 text-white">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                                <Scale className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-white">Movimientos Pendientes de Decisión</CardTitle>
                                                <CardDescription className="text-amber-100">
                                                    El prorrateo es opcional y no bloquea la recepción — decida cuando le convenga: aplicar el costo
                                                    de transporte o eliminarlo de la lista (sin prorratear).
                                                </CardDescription>
                                            </div>
                                        </div>
                                        {seleccionadosMov.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setEliminacion({ tipo: 'movimientos', ids: seleccionadosMov })}
                                                    className="cursor-pointer border-white/30 bg-white/10 text-white hover:bg-white/20"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Eliminar {seleccionadosMov.length} seleccionado{seleccionadosMov.length === 1 ? '' : 's'}
                                                </Button>
                                                <Button
                                                    onClick={distribuirSeleccionadosMov}
                                                    className="cursor-pointer bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                                                >
                                                    <ArrowRightLeft className="h-4 w-4" />
                                                    Distribuir {seleccionadosMov.length} seleccionado{seleccionadosMov.length === 1 ? '' : 's'}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                                <TableHead className="w-10"></TableHead>
                                                <TableHead className="w-20">ID</TableHead>
                                                <TableHead className="w-32">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        Enviado
                                                    </div>
                                                </TableHead>
                                                <TableHead>
                                                    <div className="flex items-center gap-1">
                                                        <Truck className="h-4 w-4" />
                                                        Origen → Destino
                                                    </div>
                                                </TableHead>
                                                <TableHead>
                                                    <div className="flex items-center gap-1">
                                                        <User className="h-4 w-4" />
                                                        Solicitado por
                                                    </div>
                                                </TableHead>
                                                <TableHead>
                                                    <div className="flex items-center gap-1">
                                                        <Package className="h-4 w-4" />
                                                        Productos
                                                    </div>
                                                </TableHead>
                                                <TableHead className="w-32 text-right">Acción</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {movimientosPendientes.data.length > 0 ? (
                                                movimientosPendientes.data.map((movimiento) => (
                                                    <TableRow key={movimiento.id} className="group hover:bg-muted/50">
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={seleccionadosMov.includes(movimiento.id)}
                                                                onCheckedChange={() => toggleSeleccionadoMov(movimiento.id)}
                                                                className="size-5 border-2 border-slate-400 dark:border-slate-300"
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            <Badge variant="secondary">#{movimiento.id}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-sm">{formatFechaHora(movimiento.fecha_envio)}</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1 text-sm">
                                                                <Badge variant="outline" className="border-cyan-300 text-cyan-700 dark:text-cyan-300">
                                                                    {movimiento.almacen_origen ?? '—'}
                                                                </Badge>
                                                                <ArrowRightLeft className="text-muted-foreground h-3 w-3" />
                                                                <Badge
                                                                    variant="outline"
                                                                    className="border-violet-300 text-violet-700 dark:text-violet-300"
                                                                >
                                                                    {movimiento.almacen_destino ?? '—'}
                                                                </Badge>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm">{movimiento.usuario ?? '—'}</TableCell>
                                                        <TableCell>
                                                            <Badge className="gap-1 border-teal-300 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                                                                <Package className="h-3 w-3" />
                                                                {movimiento.cantidad_lineas} {movimiento.cantidad_lineas === 1 ? 'línea' : 'líneas'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="space-x-1 text-right whitespace-nowrap">
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="outline"
                                                                        className="cursor-pointer text-red-600 hover:text-red-700"
                                                                        onClick={() => setEliminacion({ tipo: 'movimientos', ids: [movimiento.id] })}
                                                                        aria-label={`Eliminar el movimiento #${movimiento.id} de la lista`}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Eliminar de la lista (sin prorratear)</TooltipContent>
                                                            </Tooltip>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Link href={route('distribucion-costos.formulario', { movimientos: [movimiento.id] })}>
                                                                        <Button
                                                                            size="icon"
                                                                            className="cursor-pointer bg-amber-600 text-white shadow-sm hover:bg-amber-700"
                                                                        >
                                                                            <ArrowRightLeft className="h-4 w-4" />
                                                                        </Button>
                                                                    </Link>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Distribuir</TooltipContent>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="py-8 text-center">
                                                        <div className="text-muted-foreground flex flex-col items-center gap-2">
                                                            <Scale className="h-12 w-12 opacity-50" />
                                                            <p>No hay movimientos pendientes de decisión</p>
                                                            <p className="text-sm">
                                                                Aparecerán aquí los movimientos en tránsito hacia un almacén ajeno al vendedor que
                                                                los solicitó.
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>

                                    {movimientosPendientes.links && movimientosPendientes.data.length > 0 && (
                                        <div className="mt-4 flex items-center justify-between">
                                            <div className="text-muted-foreground text-sm">
                                                Mostrando {movimientosPendientes.from} a {movimientosPendientes.to} de {movimientosPendientes.total}{' '}
                                                resultados
                                            </div>
                                            <div className="flex space-x-2">
                                                {movimientosPendientes.links.map((link, index) => {
                                                    const displayLabel = link.label
                                                        .replace('&laquo;', '«')
                                                        .replace('&raquo;', '»')
                                                        .replace('pagination.previous', '«')
                                                        .replace('pagination.next', '»');

                                                    return (
                                                        <Button
                                                            key={index}
                                                            variant={link.active ? 'default' : 'outline'}
                                                            size="sm"
                                                            disabled={!link.url}
                                                            onClick={() => link.url && router.get(link.url)}
                                                        >
                                                            {displayLabel}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    )}
                </Tabs>

                <AlertDialog open={eliminacion !== null} onOpenChange={(abierto) => !abierto && setEliminacion(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar de la lista de pendientes</AlertDialogTitle>
                            <AlertDialogDescription className="space-y-2">
                                <span className="block">
                                    Se {(eliminacion?.ids.length ?? 0) === 1 ? 'eliminará' : 'eliminarán'}{' '}
                                    {eliminacion?.tipo === 'compras'
                                        ? (eliminacion?.ids.length ?? 0) === 1
                                            ? 'la compra'
                                            : `las ${eliminacion?.ids.length} compras`
                                        : (eliminacion?.ids.length ?? 0) === 1
                                          ? 'el movimiento'
                                          : `los ${eliminacion?.ids.length} movimientos`}{' '}
                                    de esta lista <strong>sin prorratear</strong>: no se aplica ningún costo adicional
                                    {eliminacion?.tipo === 'movimientos' ? ' y la recepción no cambia' : ''}. Sigue en el historial de{' '}
                                    {eliminacion?.tipo === 'compras' ? 'Compras' : 'Movimientos'}.
                                </span>
                                <span className="block">
                                    Como no se prorratea, las unidades que llegaron por{' '}
                                    {(eliminacion?.ids.length ?? 0) === 1 ? (eliminacion?.tipo === 'compras' ? 'ella' : 'él') : 'ellos'} se acumulan al
                                    lote existente del almacén cuando tiene el mismo costo y precio. Si no hay un lote idéntico, el lote queda como
                                    está.
                                </span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmarEliminarDeLaLista}>Eliminar de la lista</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <Toaster position="top-center" />
            </div>
        </AppLayout>
    );
}
