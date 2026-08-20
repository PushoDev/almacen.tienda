import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Calendar, Clock, Eye, History, Package, User, Wallet, X } from 'lucide-react';

interface CuentaResumen {
    nombre: string | null;
    moneda: string | null;
    monto: number | string;
}

interface Distribucion {
    id: number;
    fecha: string;
    usuario: string | null;
    compras: number[];
    cuentas: CuentaResumen[];
    monto_total_usd: number | string;
    productos_afectados: number;
    comentario: string | null;
}

interface DistribucionesPaginadas {
    data: Distribucion[];
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}

interface Filtros {
    compra_id: string;
    fecha: string;
}

interface Props {
    distribuciones: DistribucionesPaginadas;
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
    {
        title: 'Historial',
        href: '#',
    },
];

const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(isNaN(num) ? 0 : num);
};

const formatCupCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'CUP',
        minimumFractionDigits: 2,
    }).format(isNaN(num) ? 0 : num);
};

const formatFechaHora = (fecha: string) => {
    const d = new Date(fecha);
    return d.toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function DistribucionCostosHistorial({ distribuciones, filtros }: Props) {
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

    const hayFiltrosActivos = Boolean(filtros.compra_id || filtros.fecha);

    const limpiarFiltros = () => {
        aplicarFiltros({ compra_id: undefined, fecha: undefined });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Historial de Distribución de Costos" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Historial de Distribución de Costos"
                        description="Consulte las distribuciones de costos ya confirmadas: qué se aplicó, a qué productos y con qué cuentas."
                    />
                    <History
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {filtros.compra_id && (
                    <Card>
                        <CardContent className="flex items-center justify-between p-4">
                            <p className="text-sm">
                                Mostrando solo distribuciones que incluyen la compra <Badge variant="secondary">#{filtros.compra_id}</Badge>
                            </p>
                            <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
                                <X size={14} className="mr-1" />
                                Quitar filtro
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {!filtros.compra_id && (
                    <Card>
                        <CardContent className="flex flex-wrap items-end gap-3 p-4">
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
                        </CardContent>
                    </Card>
                )}

                <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <History className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Distribuciones Confirmadas</CardTitle>
                                <CardDescription className="text-indigo-100">
                                    {distribuciones.total} distribución{distribuciones.total === 1 ? '' : 'es'} registrada
                                    {distribuciones.total === 1 ? '' : 's'} en el sistema.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                    <TableHead className="w-20">ID</TableHead>
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            Fecha
                                        </div>
                                    </TableHead>
                                    <TableHead>Compras (Lote)</TableHead>
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <Wallet className="h-4 w-4" />
                                            Cuentas de Origen
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right">Monto Total</TableHead>
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <Package className="h-4 w-4" />
                                            Productos
                                        </div>
                                    </TableHead>
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <User className="h-4 w-4" />
                                            Usuario
                                        </div>
                                    </TableHead>
                                    <TableHead className="w-24 text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {distribuciones.data.length > 0 ? (
                                    distribuciones.data.map((distribucion) => (
                                        <TableRow key={distribucion.id} className="hover:bg-muted/50">
                                            <TableCell className="font-medium">
                                                <Badge variant="secondary">#{distribucion.id}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="text-muted-foreground h-3 w-3" />
                                                    {formatFechaHora(distribucion.fecha)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {distribucion.compras.map((compraId) => (
                                                        <Badge
                                                            key={compraId}
                                                            variant="outline"
                                                            className="border-violet-300 text-violet-700 dark:text-violet-300"
                                                        >
                                                            #{compraId}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {distribucion.cuentas.map((cuenta, idx) => (
                                                        <Badge
                                                            key={idx}
                                                            variant="outline"
                                                            className={
                                                                cuenta.moneda === 'CUP'
                                                                    ? 'border-amber-300 text-amber-700 dark:text-amber-300'
                                                                    : 'border-blue-300 text-blue-700 dark:text-blue-300'
                                                            }
                                                        >
                                                            {cuenta.nombre} (
                                                            {cuenta.moneda === 'CUP' ? formatCupCurrency(cuenta.monto) : formatCurrency(cuenta.monto)}
                                                            )
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-green-600">
                                                {formatCurrency(distribucion.monto_total_usd)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="gap-1 border-teal-300 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                                                    <Package className="h-3 w-3" />
                                                    {distribucion.productos_afectados}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{distribucion.usuario ?? '—'}</TableCell>
                                            <TableCell className="text-right">
                                                <Link href={route('distribucion-costos.show', distribucion.id)}>
                                                    <Button variant="outline" size="sm" className="cursor-pointer">
                                                        <Eye className="h-4 w-4" />
                                                        Ver
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="py-8 text-center">
                                            <div className="text-muted-foreground flex flex-col items-center gap-2">
                                                <History className="h-12 w-12 opacity-50" />
                                                <p>Aún no hay distribuciones de costos confirmadas</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {distribuciones.links && distribuciones.data.length > 0 && (
                            <div className="mt-4 flex items-center justify-between">
                                <div className="text-muted-foreground text-sm">
                                    Mostrando {distribuciones.from} a {distribuciones.to} de {distribuciones.total} resultados
                                </div>
                                <div className="flex space-x-2">
                                    {distribuciones.links.map((link, index) => {
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
