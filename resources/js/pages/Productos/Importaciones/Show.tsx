import HeadingSmall from '@/components/heading-small';
import { EstadoImportacionBadge } from '@/components/importaciones/estado-importacion-badge';
import { RevertirImportacionDialog } from '@/components/importaciones/revertir-importacion-dialog';
import { formatFechaHora, type ResumenImportacion } from '@/components/importaciones/tipos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardList, FileSpreadsheet, Info, Undo2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface FilaImportacion {
    id: number;
    fila: number;
    nombre_producto: string | null;
    producto_id: number | null;
    producto_nuevo: boolean;
    cantidad: number;
    precio_compra: string | null;
    resultado: 'importada' | 'solo_catalogo' | 'omitida';
    motivo: string | null;
    lote_codigo: string | null;
}

interface FilasPaginadas {
    data: FilaImportacion[];
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface Props {
    importacion: ResumenImportacion & {
        revertida_por: string | null;
        revertida_at: string | null;
        motivo_reversion: string | null;
        mensaje_error: string | null;
    };
    filas: FilasPaginadas;
    filtros: { resultado: string };
    puedeRevertir: boolean;
}

const RESULTADOS = [
    { valor: '', etiqueta: 'Todas' },
    { valor: 'importada', etiqueta: 'Importadas' },
    { valor: 'solo_catalogo', etiqueta: 'Solo catálogo' },
    { valor: 'omitida', etiqueta: 'Omitidas' },
];

const formatoCosto = (valor: string | null) =>
    valor === null ? '—' : new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(Number(valor));

function ResultadoFila({ resultado }: { resultado: FilaImportacion['resultado'] }) {
    if (resultado === 'importada') {
        return (
            <Badge variant="outline" className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" />
                Importada
            </Badge>
        );
    }
    if (resultado === 'solo_catalogo') {
        return (
            <Badge variant="outline" className="gap-1 border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                <Info className="h-3 w-3" />
                Solo catálogo
            </Badge>
        );
    }
    return (
        <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            Omitida
        </Badge>
    );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number }) {
    return (
        <div className="bg-muted/50 rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold tabular-nums">{valor.toLocaleString('es-ES')}</div>
            <div className="text-muted-foreground text-xs">{etiqueta}</div>
        </div>
    );
}

export default function ImportacionShow({ importacion, filas, filtros, puedeRevertir }: Props) {
    const flash = usePage().props.flash as { bloqueos_reversion?: string[] | null } | undefined;
    const [reversionAbierta, setReversionAbierta] = useState(false);
    const bloqueosServidor = flash?.bloqueos_reversion ?? null;

    // Si el servidor rechazó deshacer por bloqueos (algo cambió tras la vista previa), se reabre con la lista.
    useEffect(() => {
        if (bloqueosServidor?.length) setReversionAbierta(true);
    }, [bloqueosServidor]);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Resumen General', href: '/dashboard' },
        { title: 'Productos', href: '/listado-productos' },
        { title: 'Historial de importaciones', href: route('importaciones-productos.index') },
        { title: `Importación #${importacion.id}`, href: '#' },
    ];

    const filtrarPorResultado = (valor: string) => {
        router.get(window.location.pathname, valor ? { resultado: valor } : {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Importación #${importacion.id}`} />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title={`Importación #${importacion.id}`}
                        description={`${importacion.nombre_archivo} · ${importacion.almacen ?? 'Almacén'} · ${formatFechaHora(importacion.fecha)}${importacion.usuario ? ` · ${importacion.usuario}` : ''}`}
                    />
                    <FileSpreadsheet
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={route('importaciones-productos.index')}>
                        <Button variant="outline" size="sm" className="cursor-pointer">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver al historial
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3">
                        <EstadoImportacionBadge estado={importacion.estado} />
                        {puedeRevertir && (
                            <Button className="cursor-pointer bg-amber-600 hover:bg-amber-700" size="sm" onClick={() => setReversionAbierta(true)}>
                                <Undo2 className="mr-2 h-4 w-4" />
                                Deshacer importación
                            </Button>
                        )}
                    </div>
                </div>

                {importacion.estado === 'revertida' && (
                    <Card className="border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40">
                        <CardContent className="p-4 text-sm">
                            <strong>Importación deshecha</strong> por {importacion.revertida_por ?? '—'}
                            {importacion.revertida_at ? ` el ${formatFechaHora(importacion.revertida_at)}` : ''}. Motivo: {importacion.motivo_reversion}
                        </CardContent>
                    </Card>
                )}

                {importacion.estado === 'fallida' && (
                    <Card className="border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
                        <CardContent className="p-4 text-sm text-red-700 dark:text-red-300">
                            <strong>La importación falló y no se guardó nada.</strong> {importacion.mensaje_error}
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                    <Dato etiqueta="Filas procesadas" valor={importacion.filas_procesadas} />
                    <Dato etiqueta="Productos nuevos" valor={importacion.productos_creados} />
                    <Dato etiqueta="Lotes creados" valor={importacion.lotes_creados} />
                    <Dato etiqueta="Unidades" valor={importacion.unidades_importadas} />
                    <Dato etiqueta="Sin stock" valor={importacion.productos_sin_stock} />
                    <Dato etiqueta="Omitidas" valor={importacion.filas_omitidas} />
                </div>

                <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <ClipboardList className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Detalle fila por fila</CardTitle>
                                <CardDescription className="text-emerald-100">
                                    {filas.total} fila{filas.total === 1 ? '' : 's'}
                                    {filtros.resultado ? ' con este filtro' : ' en el archivo'}.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            {RESULTADOS.map((opcion) => (
                                <Button
                                    key={opcion.valor}
                                    size="sm"
                                    variant={filtros.resultado === opcion.valor ? 'default' : 'outline'}
                                    className="cursor-pointer"
                                    onClick={() => filtrarPorResultado(opcion.valor)}
                                >
                                    {opcion.etiqueta}
                                </Button>
                            ))}
                            {filtros.resultado && (
                                <Button size="sm" variant="ghost" onClick={() => filtrarPorResultado('')}>
                                    <X size={14} className="mr-1" />
                                    Quitar filtro
                                </Button>
                            )}
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                    <TableHead className="w-16">Fila</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-right">Cantidad</TableHead>
                                    <TableHead className="text-right">Costo</TableHead>
                                    <TableHead>Resultado</TableHead>
                                    <TableHead>Lote / Motivo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filas.data.length > 0 ? (
                                    filas.data.map((fila) => (
                                        <TableRow key={fila.id} className="hover:bg-muted/50">
                                            <TableCell className="text-muted-foreground tabular-nums">{fila.fila}</TableCell>
                                            <TableCell className="text-sm">
                                                <div className="flex items-center gap-2">
                                                    {fila.nombre_producto ?? '—'}
                                                    {fila.producto_nuevo && (
                                                        <Badge variant="secondary" className="text-[10px]">
                                                            Nuevo
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{fila.cantidad}</TableCell>
                                            <TableCell className="text-right tabular-nums">{formatoCosto(fila.precio_compra)}</TableCell>
                                            <TableCell>
                                                <ResultadoFila resultado={fila.resultado} />
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-xs">{fila.lote_codigo ?? fila.motivo ?? '—'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                                            Esta importación no tiene filas con ese resultado
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {filas.data.length > 0 && (
                            <div className="mt-4 flex items-center justify-between">
                                <div className="text-muted-foreground text-sm">
                                    Mostrando {filas.from} a {filas.to} de {filas.total} filas
                                </div>
                                <div className="flex space-x-2">
                                    {filas.links.map((link, index) => (
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

            {puedeRevertir && (
                <RevertirImportacionDialog
                    importacionId={importacion.id}
                    abierto={reversionAbierta}
                    onCerrar={() => setReversionAbierta(false)}
                    bloqueosServidor={bloqueosServidor}
                />
            )}
        </AppLayout>
    );
}
