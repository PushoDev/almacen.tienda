import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ComputerIcon, Filter, Plus } from 'lucide-react';
import { useState } from 'react';

interface Cierre {
    id: number;
    fecha_cierre: string;
    usuario: { name: string };
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
                            <CardDescription>Busca cierres específicos por rango de fecha{es_admin_o_moderador ? ' o vendedor' : ''}.</CardDescription>
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
                                        <label className="text-muted-foreground mb-1 block text-xs">Vendedor</label>
                                        <Select value={vendedorId} onValueChange={setVendedorId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Vendedor" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="todos">Todos los vendedores</SelectItem>
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

                    <div className="bg-background mt-6 rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Vendedor</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cierres.data.length > 0 ? (
                                    cierres.data.map((cierre) => (
                                        <TableRow key={cierre.id}>
                                            <TableCell className="font-medium">{new Date(cierre.fecha_cierre).toLocaleString()}</TableCell>
                                            <TableCell>{cierre.usuario.name}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={route('ventas.cierres.show', cierre.id)}>Ver detalle</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            No se encontraron cierres.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        {cierres.links.length > 3 && (
                            <div className="flex flex-col items-center justify-between gap-2 border-t p-4 sm:flex-row">
                                <div className="text-muted-foreground text-sm">
                                    Mostrando {cierres.from ?? 0} a {cierres.to ?? 0} de {cierres.total} resultados
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {cierres.links.map((link, index) => {
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
                                                onClick={() => goToPage(link.url)}
                                            >
                                                {displayLabel}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
