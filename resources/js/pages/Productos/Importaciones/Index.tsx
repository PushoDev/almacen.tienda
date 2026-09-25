import HeadingSmall from '@/components/heading-small';
import { EstadoImportacionBadge } from '@/components/importaciones/estado-importacion-badge';
import { formatFechaHora, type ResumenImportacion } from '@/components/importaciones/tipos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Calendar, Clock, Eye, FileSpreadsheet, History, Package, Pencil, Trash2, User, X } from 'lucide-react';

interface ImportacionesPaginadas {
    data: ResumenImportacion[];
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface Borrador {
    id: number;
    nombre_archivo: string;
    almacen: string | null;
    filas: number;
    fecha: string;
}

interface Props {
    importaciones: ImportacionesPaginadas;
    borradores: Borrador[];
    filtros: { almacen_id: string; estado: string };
    almacenes: { id: number; nombre_almacen: string }[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Productos', href: '/listado-productos' },
    { title: 'Historial de importaciones', href: '#' },
];

const ESTADOS = [
    { valor: 'completada', etiqueta: 'Completada' },
    { valor: 'con_omitidas', etiqueta: 'Con filas omitidas' },
    { valor: 'fallida', etiqueta: 'Fallida' },
    { valor: 'revertida', etiqueta: 'Deshecha' },
];

export default function ImportacionesIndex({ importaciones, borradores, filtros, almacenes }: Props) {
    const aplicarFiltros = (cambios: Record<string, string>) => {
        const nuevos: Record<string, string> = { ...Object.fromEntries(new URLSearchParams(window.location.search)), ...cambios };
        Object.keys(nuevos).forEach((clave) => nuevos[clave] === '' && delete nuevos[clave]);
        delete nuevos.page;
        router.get(window.location.pathname, nuevos, { preserveState: true, preserveScroll: true, replace: true });
    };

    const hayFiltros = Boolean(filtros.almacen_id || filtros.estado);
    const claseSelect =
        'border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Historial de importaciones" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Historial de importaciones"
                        description="Revisa qué se importó desde Excel, quién lo hizo y en qué almacén. Desde aquí puedes ver el detalle fila por fila y deshacer una importación."
                    />
                    <FileSpreadsheet
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {borradores.length > 0 && (
                    <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                        <CardContent className="space-y-2 p-4">
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                                Tienes {borradores.length} importación{borradores.length === 1 ? '' : 'es'} a medias
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                Se leyó el archivo pero todavía no se guardó nada en el inventario. Retómala para revisarla y confirmarla.
                            </p>
                            {borradores.map((borrador) => (
                                <div key={borrador.id} className="bg-background flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" />
                                        <span className="truncate font-medium">{borrador.nombre_archivo}</span>
                                        <span className="text-muted-foreground text-xs">
                                            {borrador.almacen ?? '—'} · {borrador.filas} fila{borrador.filas === 1 ? '' : 's'} · {formatFechaHora(borrador.fecha)}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Link href={route('importaciones-borradores.show', borrador.id)}>
                                            <Button size="sm" className="cursor-pointer bg-emerald-600 hover:bg-emerald-700">
                                                <Pencil className="mr-1 h-4 w-4" />
                                                Retomar
                                            </Button>
                                        </Link>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="cursor-pointer text-red-600"
                                            onClick={() => router.delete(route('importaciones-borradores.descartar', borrador.id))}
                                        >
                                            <Trash2 className="mr-1 h-4 w-4" />
                                            Descartar
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardContent className="flex flex-wrap items-end gap-3 p-4">
                        <div className="space-y-1">
                            <label className="text-muted-foreground text-[10px]">Almacén</label>
                            <select className={claseSelect} value={filtros.almacen_id} onChange={(e) => aplicarFiltros({ almacen_id: e.target.value })}>
                                <option value="">Todos</option>
                                {almacenes.map((almacen) => (
                                    <option key={almacen.id} value={almacen.id}>
                                        {almacen.nombre_almacen}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-muted-foreground text-[10px]">Estado</label>
                            <select className={claseSelect} value={filtros.estado} onChange={(e) => aplicarFiltros({ estado: e.target.value })}>
                                <option value="">Todos</option>
                                {ESTADOS.map((estado) => (
                                    <option key={estado.valor} value={estado.valor}>
                                        {estado.etiqueta}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {hayFiltros && (
                            <Button variant="ghost" size="sm" onClick={() => aplicarFiltros({ almacen_id: '', estado: '' })}>
                                <X size={14} className="mr-1" />
                                Limpiar filtros
                            </Button>
                        )}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <History className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Importaciones de productos</CardTitle>
                                <CardDescription className="text-emerald-100">
                                    {importaciones.total} importación{importaciones.total === 1 ? '' : 'es'} registrada{importaciones.total === 1 ? '' : 's'}.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                    <TableHead className="w-16">ID</TableHead>
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-4 w-4" />
                                            Fecha
                                        </div>
                                    </TableHead>
                                    <TableHead>Archivo</TableHead>
                                    <TableHead>Almacén</TableHead>
                                    <TableHead>
                                        <div className="flex items-center gap-1">
                                            <User className="h-4 w-4" />
                                            Usuario
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right">Lotes</TableHead>
                                    <TableHead className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Package className="h-4 w-4" />
                                            Unidades
                                        </div>
                                    </TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="w-24 text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {importaciones.data.length > 0 ? (
                                    importaciones.data.map((importacion) => (
                                        <TableRow key={importacion.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                <Badge variant="secondary">#{importacion.id}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="text-muted-foreground h-3 w-3" />
                                                    {formatFechaHora(importacion.fecha)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[220px] truncate text-sm" title={importacion.nombre_archivo}>
                                                {importacion.nombre_archivo}
                                            </TableCell>
                                            <TableCell className="text-sm">{importacion.almacen ?? '—'}</TableCell>
                                            <TableCell className="text-sm">{importacion.usuario ?? '—'}</TableCell>
                                            <TableCell className="text-right tabular-nums">{importacion.lotes_creados}</TableCell>
                                            <TableCell className="text-right font-semibold tabular-nums">
                                                {importacion.unidades_importadas.toLocaleString('es-ES')}
                                            </TableCell>
                                            <TableCell>
                                                <EstadoImportacionBadge estado={importacion.estado} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={route('importaciones-productos.show', importacion.id)}>
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
                                        <TableCell colSpan={9} className="py-8 text-center">
                                            <div className="text-muted-foreground flex flex-col items-center gap-2">
                                                <FileSpreadsheet className="h-12 w-12 opacity-50" />
                                                <p>{hayFiltros ? 'Ninguna importación coincide con los filtros' : 'Aún no se ha importado ningún archivo'}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {importaciones.links && importaciones.data.length > 0 && (
                            <div className="mt-4 flex items-center justify-between">
                                <div className="text-muted-foreground text-sm">
                                    Mostrando {importaciones.from} a {importaciones.to} de {importaciones.total} resultados
                                </div>
                                <div className="flex space-x-2">
                                    {importaciones.links.map((link, index) => (
                                        <Button
                                            key={index}
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            disabled={!link.url}
                                            onClick={() => link.url && router.get(link.url)}
                                        >
                                            {link.label
                                                .replace('&laquo;', '«')
                                                .replace('&raquo;', '»')
                                                .replace('pagination.previous', '«')
                                                .replace('pagination.next', '»')}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
