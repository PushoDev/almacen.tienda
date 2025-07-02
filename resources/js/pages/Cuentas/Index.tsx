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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { CuentaProps, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Coins, CreditCard, Edit3, FileText, Landmark, Sheet, Trash2, Type, Wallet } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Cuentas',
        href: '/cuentas',
    },
];

export default function CuentasPage({ cuentas }: { cuentas: CuentaProps[] }) {
    // Eliminar Cuenta
    const deleteCuenta = (id: number) => {
        router.delete(route('cuentas.destroy', { cuenta: id }), {
            onSuccess: () => {
                toast.success('Cuenta eliminada correctamente');
            },
            onError: () => {
                toast.error('Error en el proceso, inténtelo nuevamente');
            },
        });
    };

    // Calcular el saldo total de todas las cuentas
    const calcularSaldoTotal = () => {
        return cuentas.reduce((total, cuenta) => total + (cuenta.saldo_cuenta || 0), 0).toFixed(2);
    };

    console.log('Listado de Cuentas -> ', cuentas);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cuentas" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Gestión de Cuentas" description="Administre las cuentas disponibles para su negocio" />
                    <Landmark
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* Acciones */}
                <div className="flex justify-end gap-2">
                    {/* Botón Crear nuevo */}
                    <Link href={route('cuentas.create')}>
                        <Button variant="default" className="flex cursor-pointer items-center gap-2">
                            <CreditCard size={16} />
                            Crear Nueva
                        </Button>
                    </Link>

                    {/* Botón Exportar PDF */}
                    <Link href="#">
                        <Button variant="outline" className="hover:bg-chart-5 flex cursor-pointer items-center gap-2">
                            <FileText size={16} />
                            Exportar PDF
                        </Button>
                    </Link>

                    {/* Botón Exportar Excel */}
                    <Link href="#">
                        <Button variant="secondary" className="hover:bg-chart-2 flex cursor-pointer items-center gap-2">
                            <Sheet size={16} />
                            Exportar Excel
                        </Button>
                    </Link>
                </div>

                {/* Tabla de Cuentas */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <Table>
                        <TableCaption>Lista de Cuentas</TableCaption>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                <TableHead className="w-[100px]">Nombre</TableHead>
                                <TableHead>Moneda</TableHead>
                                <TableHead>Saldo</TableHead>
                                <TableHead>Tipo de Cuenta</TableHead>
                                <TableHead>Notas</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {cuentas.map((cuenta) => (
                                <TableRow key={cuenta.id}>
                                    <TableCell className="min-w-[180px]">
                                        <div className="flex items-center gap-2">
                                            <Landmark size={14} className="text-primary shrink-0" />
                                            <span className="text-primary truncate font-medium">{cuenta.nombre_cuenta}</span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Coins size={14} className="shrink-0 text-amber-500" />
                                            <Badge variant="outline" className="font-mono">
                                                {cuenta.tipo_moneda}
                                            </Badge>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Wallet size={14} className="shrink-0 text-emerald-500" />
                                            <span className={cuenta.saldo_cuenta ? 'font-medium' : 'text-gray-400 italic'}>
                                                {cuenta.saldo_cuenta ? `$${cuenta.saldo_cuenta.toFixed(2)}` : 'Sin saldo'}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Type size={14} className="shrink-0 text-indigo-500" />
                                            <Badge
                                                variant="outline"
                                                className={`font-medium ${cuenta.tipo_cuenta === 'permanentes' ? 'text-emerald-500' : 'text-red-400'}`}
                                            >
                                                {cuenta.tipo_cuenta.charAt(0).toUpperCase() + cuenta.tipo_cuenta.slice(1)}
                                            </Badge>
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <FileText size={14} className="shrink-0 text-gray-500" />
                                            <span className="max-w-[200px] truncate">
                                                {cuenta.notas_cuenta || <span className="text-gray-400 italic">Sin notas</span>}
                                            </span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-right">
                                        {/* Botón Editar */}
                                        <Link href={route('cuentas.edit', { cuenta: cuenta.id })}>
                                            <Button
                                                variant="outline"
                                                className="cursor-pointer hover:bg-blue-900 hover:text-white dark:hover:bg-blue-700"
                                            >
                                                <Edit3 />
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
                                                        ¿Estás seguro de eliminar esta cuenta? Esta acción es irreversible.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogAction
                                                        onClick={() => deleteCuenta(cuenta.id)}
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
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={4} className="bg-gray-700">
                                    Total de Cuentas
                                </TableCell>
                                <TableCell className="bg-gray-500 text-center">{cuentas.length}</TableCell>
                                <TableCell className="bg-gray-500 text-center">${calcularSaldoTotal()}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
