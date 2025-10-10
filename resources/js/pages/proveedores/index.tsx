import HeadingSmall from '@/components/heading-small';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { ProveedorProps, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowDownCircle,
    BadgePlus,
    Building,
    CheckCircle,
    DollarSign,
    Edit3,
    FileText,
    Handshake,
    Mail,
    MapPin,
    Phone,
    Sheet,
    Trash2,
    TrendingDown,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Proveedores',
        href: '/proveedores',
    },
];

export default function ProveedoresPage({ proveedores }: { proveedores: ProveedorProps[] }) {
    // Eliminar Proveedor
    const deleteProveedor = (id: number) => {
        router.delete(route('proveedores.destroy', { proveedor: id }), {
            onSuccess: () => {
                toast.success('Proveedor eliminado correctamente');
            },
            onError: () => {
                toast.error('Error en el proceso, inténtelo nuevamente');
            },
        });
    };

    // Función para formatear el saldo
    const formatearMoneda = (valor: number | null) => {
        if (valor === null || valor === undefined) return '$0.00';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 8,
        }).format(valor);
    };

    // Calcular estadísticas
    const estadisticas = {
        totalProveedores: proveedores.length,
        totalDeudas: proveedores.filter((p) => p.saldo_proveedor < 0).length,
        totalFondos: proveedores.filter((p) => p.saldo_proveedor > 0).length,
        montoTotalDeudas: proveedores.filter((p) => p.saldo_proveedor < 0).reduce((sum, p) => sum + Math.abs(p.saldo_proveedor), 0),
        montoTotalFondos: proveedores.filter((p) => p.saldo_proveedor > 0).reduce((sum, p) => sum + p.saldo_proveedor, 0),
        saldoNeto: proveedores.reduce((sum, p) => sum + p.saldo_proveedor, 0),
    };

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 10;
    const indiceUltimoElemento = paginaActual * elementosPorPagina;
    const indicePrimerElemento = indiceUltimoElemento - elementosPorPagina;

    // Obtener los proveedores a mostrar en la página actual
    const proveedoresAmostrar = proveedores.slice(indicePrimerElemento, indiceUltimoElemento);

    // Calcular el número total de páginas
    const totalPaginas = Math.ceil(proveedores.length / elementosPorPagina);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Proveedores" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header Section */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Gestión de Proveedores" description="Administra los proveedores y sus saldos" />
                    <Handshake
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* Widgets de Estadísticas */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {/* Total Proveedores */}
                    <Card className="bg-card border-border">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
                            <Users className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{estadisticas.totalProveedores}</div>
                            <p className="text-muted-foreground text-xs">Proveedores registrados</p>
                        </CardContent>
                    </Card>

                    {/* Proveedores con Deuda */}
                    <Card className="bg-card border-border">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">En Deuda</CardTitle>
                            <TrendingDown className="text-destructive h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-destructive text-2xl font-bold">{estadisticas.totalDeudas}</div>
                            <p className="text-muted-foreground text-xs">{formatearMoneda(estadisticas.montoTotalDeudas)} total</p>
                        </CardContent>
                    </Card>

                    {/* Proveedores con Fondo */}
                    <Card className="bg-card border-border">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Con Fondo</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-500">{estadisticas.totalFondos}</div>
                            <p className="text-muted-foreground text-xs">{formatearMoneda(estadisticas.montoTotalFondos)} total</p>
                        </CardContent>
                    </Card>

                    {/* Saldo Neto */}
                    <Card className="bg-card border-border">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Saldo Neto</CardTitle>
                            <DollarSign className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div
                                className={`text-2xl font-bold ${
                                    estadisticas.saldoNeto < 0
                                        ? 'text-destructive'
                                        : estadisticas.saldoNeto > 0
                                          ? 'text-green-500'
                                          : 'text-muted-foreground'
                                }`}
                            >
                                {formatearMoneda(estadisticas.saldoNeto)}
                            </div>
                            <p className="text-muted-foreground text-xs">Balance general</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2">
                    <Link href={route('proveedores.create')}>
                        <Button variant="default" className="flex cursor-pointer items-center gap-2">
                            <BadgePlus size={16} />
                            Crear Nuevo
                        </Button>
                    </Link>

                    <Link href="#">
                        <Button variant="outline" className="hover:bg-chart-5 flex cursor-pointer items-center gap-2">
                            <FileText size={16} />
                            Exportar PDF
                        </Button>
                    </Link>

                    <Link href="#">
                        <Button variant="secondary" className="hover:bg-chart-2 flex cursor-pointer items-center gap-2">
                            <Sheet size={16} />
                            Exportar Excel
                        </Button>
                    </Link>
                </div>

                {/* Proveedores Table */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                <TableHead>Nombre</TableHead>
                                <TableHead>Teléfono</TableHead>
                                <TableHead>Correo</TableHead>
                                <TableHead>Localidad</TableHead>
                                <TableHead>Saldo</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {proveedoresAmostrar.map((proveedor) => (
                                <TableRow key={proveedor.id}>
                                    {/* Nombre */}
                                    <TableCell className="min-w-[180px]">
                                        <div className="flex items-center gap-2">
                                            <Building size={14} className="text-primary shrink-0" />
                                            <span className="truncate font-medium">{proveedor.nombre_proveedor}</span>
                                        </div>
                                    </TableCell>

                                    {/* Teléfono */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} className="shrink-0 text-gray-500" />
                                            {proveedor.telefono_proveedor || <span className="text-gray-400 italic">Sin teléfono</span>}
                                        </div>
                                    </TableCell>

                                    {/* Correo */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} className="shrink-0 text-gray-500" />
                                            {proveedor.correo_proveedor ? (
                                                <a
                                                    href={`mailto:${proveedor.correo_proveedor}`}
                                                    className="max-w-[160px] truncate text-blue-600 hover:underline"
                                                >
                                                    {proveedor.correo_proveedor}
                                                </a>
                                            ) : (
                                                <span className="text-gray-400 italic">Sin correo</span>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Localidad */}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="shrink-0 text-gray-500" />
                                            {proveedor.localidad_proveedor ? (
                                                <span className="truncate">{proveedor.localidad_proveedor}</span>
                                            ) : (
                                                <span className="text-gray-400 italic">Sin ubicación</span>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Saldo */}
                                    <TableCell
                                        aria-label={`Saldo del proveedor: ${
                                            proveedor.saldo_proveedor !== null && proveedor.saldo_proveedor !== undefined
                                                ? proveedor.saldo_proveedor < 0
                                                    ? `-${formatearMoneda(Math.abs(proveedor.saldo_proveedor))} (deuda)`
                                                    : proveedor.saldo_proveedor === 0
                                                      ? 'Sin saldo'
                                                      : `${formatearMoneda(proveedor.saldo_proveedor)} (fondo)`
                                                : 'Sin información'
                                        }`}
                                    >
                                        <div className={`flex items-center gap-1 font-medium`}>
                                            {/* Icono según el saldo */}
                                            {proveedor.saldo_proveedor !== null && proveedor.saldo_proveedor !== undefined ? (
                                                proveedor.saldo_proveedor < 0 ? (
                                                    <ArrowDownCircle size={14} className="shrink-0 text-red-600 dark:text-red-400" />
                                                ) : proveedor.saldo_proveedor === 0 ? (
                                                    <CheckCircle size={14} className="shrink-0 text-green-600 dark:text-green-400" />
                                                ) : (
                                                    <AlertCircle size={14} className="shrink-0 text-green-600 dark:text-green-400" />
                                                )
                                            ) : null}

                                            <span
                                                className={
                                                    proveedor.saldo_proveedor !== null && proveedor.saldo_proveedor !== undefined
                                                        ? proveedor.saldo_proveedor < 0
                                                            ? 'text-red-600 dark:text-red-400'
                                                            : proveedor.saldo_proveedor === 0
                                                              ? 'text-green-600 dark:text-green-400'
                                                              : 'text-green-600 dark:text-green-400'
                                                        : 'text-gray-400 italic'
                                                }
                                            >
                                                {proveedor.saldo_proveedor !== null && proveedor.saldo_proveedor !== undefined
                                                    ? proveedor.saldo_proveedor < 0
                                                        ? `- ${formatearMoneda(Math.abs(proveedor.saldo_proveedor))}`
                                                        : proveedor.saldo_proveedor === 0
                                                          ? 'Sin saldo'
                                                          : formatearMoneda(proveedor.saldo_proveedor)
                                                    : 'Sin dato'}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* Acciones */}
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={route('proveedores.edit', { proveedor: proveedor.id })}>
                                                <Button
                                                    variant="outline"
                                                    className="cursor-pointer hover:bg-blue-900 hover:text-white dark:hover:bg-blue-700"
                                                >
                                                    <Edit3 />
                                                </Button>
                                            </Link>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="hover:bg-destructive dark:hover:bg-destructive cursor-pointer hover:text-white"
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-center">Atención</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            ¿Estás seguro de eliminar este proveedor? Esta acción es irreversible.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogAction
                                                            onClick={() => deleteProveedor(proveedor.id)}
                                                            className="bg-destructive cursor-pointer hover:bg-red-300"
                                                        >
                                                            Aceptar
                                                        </AlertDialogAction>
                                                        <AlertDialogCancel className="cursor-pointer text-white hover:bg-emerald-300 hover:text-emerald-950 dark:hover:bg-emerald-300 dark:hover:text-emerald-950">
                                                            Cancelar
                                                        </AlertDialogCancel>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Controles de Paginación */}
                <div className="mt-4 flex justify-between">
                    <Button onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))} disabled={paginaActual === 1}>
                        Anterior
                    </Button>
                    <span>
                        Página {paginaActual} de {totalPaginas}
                    </span>
                    <Button onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))} disabled={paginaActual === totalPaginas}>
                        Siguiente
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}
