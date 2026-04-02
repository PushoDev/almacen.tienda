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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollProgress } from '@/components/ui/scroll';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { AlmacenProps, User, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { BookUser, Edit2, FileText, Key, Mail, Sheet, Trash2, UserCircle, Warehouse, DollarSign, Users, ShieldCheck, UserCheck, Building2, Wallet } from 'lucide-react';
import { toast, Toaster } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Empleados',
        href: '#',
    },
];

interface CuentaProps {
    id: number;
    nombre_cuenta: string;
    tipo_moneda: string;
}

export default function PageEmpleado({ empleados, almacenes, cuentas }: { empleados: User[]; almacenes: AlmacenProps[]; cuentas: CuentaProps[] }) {
    const totalEmpleados = empleados.length;
    const totalAdmins = empleados.filter((empleado) => empleado.role === 'admin').length;
    const totalVendedores = empleados.filter((empleado) => empleado.role === 'vendedor').length;
    const totalAlmacenes = almacenes.length;
    const totalCuentas = cuentas.length;

    const renderTooltipList = (items: string[]) => {
        if (items.length === 0) {
            return <span className="text-xs text-muted-foreground">Sin asignaciones</span>;
        }

        return (
            <div className="space-y-1">
                {items.map((item, index) => (
                    <div key={`${item}-${index}`} className="text-xs">
                        {item}
                    </div>
                ))}
            </div>
        );
    };

    const renderBadgeWithTooltip = (label: string, items: string[], variant: 'default' | 'neutral' = 'default') => {
        const badgeStyles =
            variant === 'neutral'
                ? 'bg-muted text-muted-foreground border border-border'
                : 'bg-primary/10 text-primary border border-primary/20';

        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <span className={`inline-flex cursor-default items-center rounded-full px-2.5 py-1 text-xs font-medium ${badgeStyles}`}>
                        {label}
                    </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                    {renderTooltipList(items)}
                </TooltipContent>
            </Tooltip>
        );
    };

    // Función para eliminar un empleado
    const deleteEmpleado = (id: number) => {
        router.delete(route('empleados.destroy', { id }), {
            onSuccess: () => {
                toast.success('Empleado eliminado correctamente');
            },
            onError: () => {
                toast.error('Error al eliminar el empleado');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Empleados" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    {/* Contenido principal */}
                    <HeadingSmall title="Gestión de Empleados" description="Lista de empleados registrados en el sistema" />
                    {/* Ícono semitransparente */}
                    <BookUser
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* Widgets */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <Card className="border-sidebar-border/70 bg-card shadow-sm border-l-4 border-l-primary">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
                            <Users className="text-primary" size={18} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-semibold text-foreground">{totalEmpleados}</div>
                            <CardDescription className="mt-1">Usuarios registrados</CardDescription>
                        </CardContent>
                    </Card>
                    <Card className="border-sidebar-border/70 bg-card shadow-sm border-l-4 border-l-emerald-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
                            <ShieldCheck className="text-emerald-600" size={18} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-semibold text-foreground">{totalAdmins}</div>
                            <CardDescription className="mt-1">Rol admin</CardDescription>
                        </CardContent>
                    </Card>
                    <Card className="border-sidebar-border/70 bg-card shadow-sm border-l-4 border-l-amber-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-medium">Vendedores</CardTitle>
                            <UserCircle className="text-amber-600" size={18} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-semibold text-foreground">{totalVendedores}</div>
                            <CardDescription className="mt-1">Rol vendedor</CardDescription>
                        </CardContent>
                    </Card>
                    <Card className="border-sidebar-border/70 bg-card shadow-sm border-l-4 border-l-sky-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-medium">Total Almacenes</CardTitle>
                            <Building2 className="text-sky-600" size={18} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-semibold text-foreground">{totalAlmacenes}</div>
                            <CardDescription className="mt-1">Almacenes activos</CardDescription>
                        </CardContent>
                    </Card>
                    <Card className="border-sidebar-border/70 bg-card shadow-sm border-l-4 border-l-fuchsia-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-medium">Total Cuentas</CardTitle>
                            <Wallet className="text-fuchsia-600" size={18} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-semibold text-foreground">{totalCuentas}</div>
                            <CardDescription className="mt-1">Cuentas monetarias</CardDescription>
                        </CardContent>
                    </Card>
                </div>

                {/* Acciones */}
                <Card className="border-sidebar-border/70">
                    <CardContent className="flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="text-sm font-medium">Acciones rápidas</div>
                            <div className="text-xs text-muted-foreground">Crea o exporta la lista de empleados.</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {/* Botón Crear Nuevo Empleado */}
                            <Link href={route('empleados.create')}>
                                <Button variant="default" className="hover:bg-chart-5 flex cursor-pointer items-center gap-2">
                                    <Edit2 size={16} />
                                    Crear Empleado
                                </Button>
                            </Link>

                            {/* Botón Exportar PDF */}
                            <Button variant="outline" className="hover:bg-chart-5 flex cursor-pointer items-center gap-2">
                                <FileText size={16} />
                                Exportar PDF
                            </Button>

                            {/* Botón Exportar Excel */}
                            <Button variant="secondary" className="hover:bg-chart-2 flex cursor-pointer items-center gap-2">
                                <Sheet size={16} />
                                Exportar Excel
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabla de Empleados */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-x-auto rounded-xl border md:min-h-min">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                <TableHead>Nombre</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Almacén</TableHead>
                                <TableHead>Cuentas</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {empleados.length > 0 ? (
                                empleados.map((empleado) => (
                                    <TableRow key={empleado.id}>
                                        <TableCell className="min-w-[180px]">
                                            <div className="flex items-center gap-2">
                                                <UserCircle size={14} className="text-primary shrink-0" />
                                                <span className="truncate font-medium">{empleado.name}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} className="shrink-0 text-gray-500" />
                                                {empleado.email ? (
                                                    <a
                                                        href={`mailto:${empleado.email}`}
                                                        className="max-w-[160px] truncate text-blue-600 hover:underline"
                                                    >
                                                        {empleado.email}
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 italic">Sin email</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Key size={14} className="shrink-0 text-gray-500" />
                                                {empleado.role ? (
                                                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">{empleado.role}</span>
                                                ) : (
                                                    <span className="text-gray-400 italic">Sin rol</span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Warehouse size={14} className="shrink-0 text-gray-500" />
                                                {empleado.role === 'admin' || empleado.role === 'moderador'
                                                    ? renderBadgeWithTooltip('General', ['Acceso total a almacenes'], 'neutral')
                                                    : renderBadgeWithTooltip(
                                                          `${empleado.almacenes?.length || 0} almacenes`,
                                                          (empleado.almacenes || []).map((almacen) => almacen.nombre_almacen),
                                                      )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <DollarSign size={14} className="shrink-0 text-gray-500" />
                                                {empleado.role === 'admin' || empleado.role === 'moderador'
                                                    ? renderBadgeWithTooltip('General', ['Acceso total a cuentas'], 'neutral')
                                                    : renderBadgeWithTooltip(
                                                          `${empleado.cuentas?.length || 0} cuentas`,
                                                          (empleado.cuentas || []).map((cuenta) => `${cuenta.nombre_cuenta} (${cuenta.tipo_moneda})`),
                                                      )}
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-right">
                                            {/* Botón Editar */}
                                            <Link href={route('empleados.edit', { id: empleado.id })}>
                                                <Button
                                                    variant="outline"
                                                    className="cursor-pointer hover:bg-blue-900 hover:text-white dark:hover:bg-blue-700"
                                                >
                                                    <Edit2 />
                                                </Button>
                                            </Link>
                                            {/* Diálogo de Confirmación para Eliminar */}
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
                                                            ¿Estás seguro de eliminar este empleado? Esta acción es irreversible.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogAction
                                                            onClick={() => deleteEmpleado(empleado.id)}
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
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center">
                                        No hay empleados registrados
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
            <Toaster position="top-center" />
            <ScrollProgress />
        </AppLayout>
    );
}
