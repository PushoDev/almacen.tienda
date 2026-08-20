import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowRightLeft, Calendar, DollarSign, Eye, Landmark, Package, Search, Store, Truck, X } from 'lucide-react';
import { useState } from 'react';

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

interface Props {
    compras: ComprasPaginadas;
    cuentas: Cuenta[];
    tasaCambioActual: number | string;
    proveedores: Proveedor[];
    almacenes: Almacen[];
    filtros: Filtros;
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

export default function DistribucionCostosIndex({ compras, cuentas, tasaCambioActual, proveedores, almacenes, filtros }: Props) {
    const cuentasCUP = cuentas.filter((cuenta) => cuenta.moneda.codigo_moneda === 'CUP' && cuenta.estado === 'activa');

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

                {/* Resumen — mini-widgets con acento lateral (Vendor/Show.tsx, Comprar/Show.tsx), número grande al estilo de las tarjetas estadísticas del dashboard */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="bg-card rounded-lg border-l-4 border-slate-400 p-4 shadow-sm dark:border-slate-600">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                <Package className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                            </div>
                            <h3 className="text-sm font-semibold">Compras totales</h3>
                        </div>
                        <p className="mt-1 text-2xl font-bold text-slate-700 dark:text-slate-300">{compras.total}</p>
                    </div>

                    <div className="bg-card rounded-lg border-l-4 border-emerald-400 p-4 shadow-sm dark:border-emerald-600">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                                <Landmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-sm font-semibold">Cuentas CUP disponibles</h3>
                        </div>
                        <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{cuentasCUP.length}</p>
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
                </div>

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
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Package className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Compras para Distribuir Costos</CardTitle>
                                <CardDescription className="text-indigo-100">
                                    Seleccione una compra para distribuir manualmente los costos adicionales entre sus productos. Solo disponible
                                    para cuentas en moneda CUP.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
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
                                    <TableHead className="w-32 text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {compras.data.length > 0 ? (
                                    compras.data.map((compra) => (
                                        <TableRow key={compra.id} className="group hover:bg-muted/50">
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
                                                    <Link href={route('transacciones.distribuir-costos.show', compra.id)}>
                                                        <Button
                                                            size="sm"
                                                            className="cursor-pointer bg-indigo-600 text-white shadow-sm hover:bg-indigo-700"
                                                        >
                                                            <ArrowRightLeft className="h-4 w-4" />
                                                            Distribuir
                                                        </Button>
                                                    </Link>
                                                    {compra.tiene_distribucion && (
                                                        <Link href={route('transacciones.distribuir-costos.show', compra.id)}>
                                                            <Button variant="outline" size="sm" className="cursor-pointer">
                                                                <Eye className="h-4 w-4" />
                                                                Detalles
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-8 text-center">
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
            </div>
        </AppLayout>
    );
}
