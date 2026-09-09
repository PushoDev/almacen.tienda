import HeadingSmall from '@/components/heading-small';
import { RolBadge } from '@/components/rol-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Calendar, ComputerIcon, Eye, Filter, History, Plus, Store, User, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';

interface Cierre {
    id: number;
    fecha_cierre: string;
    usuario: { name: string; role: 'admin' | 'moderador' | 'vendedor' };
    // Monto real del cierre: saldo_esperado se calcula de las operaciones reales del período,
    // a diferencia de saldo_contado (conteo físico manual, sin input real en la UI todavía —
    // ver memoria project_cierres_conteo_fisico_deprioritizado, decisión del cliente).
    saldo_esperado: number;
    // Nombres distintos capturados en Ventas/Movimientos dentro del rango del cierre (feature
    // Turnos) — puede haber más de uno: la cuenta es compartida por punto de venta, no por
    // persona, así que varios empleados pueden haberse relevado antes de que alguien cierre.
    responsables_turno: string[];
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface Vendedor {
    id: number;
    name: string;
}

interface Props extends PageProps {
    cierres: {
        data: Cierre[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
    filters: {
        fecha_desde?: string;
        fecha_hasta?: string;
        user_id?: string;
    };
    vendedores: Vendedor[];
    es_admin_o_moderador: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Opciones Generales',
        href: '/dashboard',
    },
    {
        title: 'Cierres de Caja',
        href: '/vendor/cierres',
    },
];

export default function Index({ auth, cierres, filters, vendedores, es_admin_o_moderador }: Props) {
    const { flash } = usePage<PageProps & { flash: { success?: string; error?: string } }>().props;

    const [fechaDesde, setFechaDesde] = useState(filters.fecha_desde || '');
    const [fechaHasta, setFechaHasta] = useState(filters.fecha_hasta || '');
    const [vendedorId, setVendedorId] = useState(filters.user_id || 'todos');

    const handleFilter = () => {
        router.get(
            route('ventas.cierres'),
            {
                fecha_desde: fechaDesde,
                fecha_hasta: fechaHasta,
                user_id: vendedorId === 'todos' ? '' : vendedorId,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const goToPage = (url: string | null) => {
        if (!url) return;
        router.get(url, {}, { preserveState: true, preserveScroll: true });
    };

    const formatMonto = (monto: number | null | undefined): string => {
        const numero = Number(monto || 0);
        return isNaN(numero) ? '0.00' : numero.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // La paginación nativa de Laravel manda TODOS los números de página en `links` — con
    // muchos cierres eso se vuelve una fila larga de botones. Se recorta a una ventana chica
    // alrededor de la página actual + primera/última, mismo criterio que Vendor/Listado.tsx.
    const paginationLinksVisibles = useMemo(() => {
        const numeradas = cierres.links.slice(1, -1);
        if (numeradas.length <= 7) return cierres.links;

        const actual = numeradas.findIndex((link) => link.active);
        const mantener = new Set([0, numeradas.length - 1, actual - 1, actual, actual + 1].filter((i) => i >= 0 && i < numeradas.length));

        const resultado: PaginationLink[] = [cierres.links[0]];
        let ultimoIncluido = -1;
        numeradas.forEach((link, i) => {
            if (mantener.has(i)) {
                if (i - ultimoIncluido > 1) {
                    resultado.push({ url: null, label: '...', active: false });
                }
                resultado.push(link);
                ultimoIncluido = i;
            }
        });
        resultado.push(cierres.links[cierres.links.length - 1]);
        return resultado;
    }, [cierres.links]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cierres de Caja" />

            <div className="bg-background flex h-screen w-full flex-col">
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                        {/* Contenido principal */}
                        <HeadingSmall title="Cierres de Caja" description="Historial y gestión de cierres diarios." />
                        {/* Ícono semitransparente */}
                        <ComputerIcon
                            size={70}
                            color="#d6d3d1"
                            className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                        />
                    </div>

                    <div className="mb-4" />

                    <div className="flex items-center gap-2">
                        <Button asChild>
                            <Link href={route('ventas.cierres.create')}>
                                <Plus className="mr-2 h-4 w-4" /> Nuevo Cierre
                            </Link>
                        </Button>
                    </div>

                    <div className="mb-4" />
                    {/* Mensajes Flash */}
                    {flash.success && <div className="mb-6 rounded-md border border-green-200 bg-green-50 p-4 text-green-700">{flash.success}</div>}

                    <Card>
                        <CardHeader>
                            <CardTitle>Filtros</CardTitle>
                            <CardDescription>Busca cierres específicos por rango de fecha{es_admin_o_moderador ? ' o punto de venta' : ''}.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-4 md:flex-row md:flex-wrap">
                                <div className="w-full md:w-auto">
                                    <label className="text-muted-foreground mb-1 block text-xs">Desde</label>
                                    <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="w-full" />
                                </div>
                                <div className="w-full md:w-auto">
                                    <label className="text-muted-foreground mb-1 block text-xs">Hasta</label>
                                    <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="w-full" />
                                </div>
                                {es_admin_o_moderador && (
                                    <div className="w-full md:w-56">
                                        <label className="text-muted-foreground mb-1 block text-xs">Punto de Venta</label>
                                        <Select value={vendedorId} onValueChange={setVendedorId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Punto de Venta" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="todos">Todos los puntos de venta</SelectItem>
                                                {vendedores.map((v) => (
                                                    <SelectItem key={v.id} value={String(v.id)}>
                                                        {v.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div className="flex w-full items-end md:w-auto">
                                    <Button onClick={handleFilter} variant="secondary" className="w-full md:w-auto">
                                        <Filter className="mr-2 h-4 w-4" /> Filtrar
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="mt-6 overflow-hidden border-0 pt-0 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <History className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-semibold text-white">Cierres Registrados</CardTitle>
                                    <CardDescription className="text-xs text-amber-100">{cierres.total} cierres en total</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-100 dark:bg-gray-800">
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Punto de Venta</TableHead>
                                        <TableHead>Responsables del Turno</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cierres.data.length > 0 ? (
                                        cierres.data.map((cierre) => (
                                            <TableRow key={cierre.id}>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className="w-fit gap-1 border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/20 dark:text-slate-300"
                                                    >
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(cierre.fecha_cierre).toLocaleString()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className="w-fit gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300"
                                                    >
                                                        <Store className="h-3 w-3" />
                                                        {cierre.usuario.name}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {cierre.responsables_turno.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {cierre.responsables_turno.map((nombre) => (
                                                                <Badge
                                                                    key={nombre}
                                                                    variant="outline"
                                                                    className="w-fit gap-1 border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-300"
                                                                >
                                                                    <User className="h-3 w-3" />
                                                                    {nombre}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ) : cierre.usuario.role === 'admin' ? (
                                                        // Admin nunca captura turno (User::requiereCapturaTurno() lo exime siempre) —
                                                        // no es un dato faltante, es esperado. No confundir con "Sin registrar".
                                                        <RolBadge role="admin" />
                                                    ) : (
                                                        <Badge variant="outline" className="w-fit gap-1 text-muted-foreground">
                                                            Sin registrar
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge
                                                        variant="outline"
                                                        className={`w-fit gap-1 font-semibold ${
                                                            cierre.saldo_esperado < 0
                                                                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300'
                                                                : 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-950/20 dark:text-teal-300'
                                                        }`}
                                                    >
                                                        <Wallet className="h-3 w-3" />
                                                        {cierre.saldo_esperado < 0 ? '-' : ''}${formatMonto(Math.abs(cierre.saldo_esperado))}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={route('ventas.cierres.show', cierre.id)}>
                                                            <Eye className="mr-1 h-3.5 w-3.5" />
                                                            Ver detalle
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No se encontraron cierres.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                        {cierres.links.length > 3 && (
                            <CardFooter className="flex flex-col items-center justify-between gap-2 border-t pt-4 sm:flex-row">
                                <div className="text-muted-foreground text-sm">
                                    Mostrando {cierres.from ?? 0} a {cierres.to ?? 0} de {cierres.total} resultados
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {paginationLinksVisibles.map((link, index) => (
                                        <Button
                                            key={index}
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            disabled={!link.url}
                                            onClick={() => goToPage(link.url)}
                                        >
                                            {renderPaginationLabel(link.label)}
                                        </Button>
                                    ))}
                                </div>
                            </CardFooter>
                        )}
                    </Card>
                </main>
            </div>
        </AppLayout>
    );
}

// Defensa en el frontend, igual que Vendor/Listado.tsx — si por lo que sea el backend vuelve
// a mandar la clave cruda ('pagination.previous'/'pagination.next', ver
// [[project_lang_path_pagination_fix]]) en vez del texto traducido, esto lo normaliza a un
// símbolo limpio de todas formas, sin depender de que la traducción del servidor esté bien.
const renderPaginationLabel = (label: string) => {
    if (!label) return '';
    const normalized = label.toLowerCase();
    if (normalized.includes('pagination.previous') || normalized.includes('previous') || normalized.includes('anterior')) return '«';
    if (normalized.includes('pagination.next') || normalized.includes('next') || normalized.includes('siguiente')) return '»';
    return label.replace('&laquo;', '«').replace('&raquo;', '»');
};
