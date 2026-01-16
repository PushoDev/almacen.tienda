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
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { CuentaProps, type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Coins, CreditCard, Edit3, Eye, Landmark, Plus, Search, Trash2, Wallet } from 'lucide-react';
import { useState } from 'react';
import { toast, Toaster } from 'sonner';

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

interface MonedaInfo {
    id: number;
    nombre_moneda: string;
    codigo_moneda: string;
    simbolo_moneda: string;
    tasa_cambio: number;
    principal: boolean;
}

// Extender la interfaz CuentaProps para incluir los nuevos campos
interface CuentaConMoneda extends CuentaProps {
    tipo: string;
    estado: string;
    moneda_id: number;
    moneda: MonedaInfo | null;
}

export default function CuentasPage({ cuentas }: { cuentas: CuentaConMoneda[] }) {
    const { props } = usePage();
    const isAdmin = props.auth?.user?.role === 'admin';
    const isVendedor = props.auth?.user?.role === 'vendedor';

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

    // Encontrar la moneda principal
    const monedaPrincipal = cuentas.find((c) => c.moneda?.principal)?.moneda;

    // Convertir saldo a moneda principal
    const convertirAMonedaPrincipal = (saldo: number, moneda: MonedaInfo | null): number => {
        if (!moneda || !monedaPrincipal) return saldo;
        if (moneda.principal) return saldo;
        return saldo / (moneda.tasa_cambio || 1);
    };

    // Calcular el saldo total de todas las cuentas en moneda principal
    const calcularSaldoTotal = () => {
        return cuentas.reduce((total, cuenta) => total + convertirAMonedaPrincipal(cuenta.saldo_cuenta || 0, cuenta.moneda), 0).toFixed(2);
    };

    // Calcular saldo por moneda (para el tooltip)
    const calcularSaldoPorMoneda = () => {
        const saldoPorMoneda: { [key: string]: number } = {};

        cuentas.forEach((cuenta) => {
            const codigoMoneda = cuenta.moneda?.codigo_moneda || 'N/A';
            if (!saldoPorMoneda[codigoMoneda]) {
                saldoPorMoneda[codigoMoneda] = 0;
            }
            saldoPorMoneda[codigoMoneda] += cuenta.saldo_cuenta || 0;
        });

        return saldoPorMoneda;
    };

    // Filtros
    const [filtroTipo, setFiltroTipo] = useState<string>('');
    const [filtroMoneda, setFiltroMoneda] = useState<string>('');
    const [busqueda, setBusqueda] = useState<string>('');

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 10;
    const indiceUltimoElemento = paginaActual * elementosPorPagina;
    const indicePrimerElemento = indiceUltimoElemento - elementosPorPagina;

    // Filtrar cuentas
    const cuentasFiltradas = cuentas.filter((cuenta) => {
        const tipoCoincide = !filtroTipo || cuenta.tipo_cuenta === filtroTipo;
        const monedaCoincide = !filtroMoneda || cuenta.moneda?.codigo_moneda === filtroMoneda;
        const busquedaCoincide =
            !busqueda ||
            cuenta.nombre_cuenta.toLowerCase().includes(busqueda.toLowerCase()) ||
            cuenta.moneda?.nombre_moneda.toLowerCase().includes(busqueda.toLowerCase()) ||
            cuenta.moneda?.codigo_moneda.toLowerCase().includes(busqueda.toLowerCase());

        return tipoCoincide && monedaCoincide && busquedaCoincide;
    });

    // Obtener las cuentas a mostrar en la página actual
    const cuentasAmostrar = cuentasFiltradas.slice(indicePrimerElemento, indiceUltimoElemento);

    // Calcular el número total de páginas
    const totalPaginas = Math.ceil(cuentasFiltradas.length / elementosPorPagina);

    // Obtener monedas únicas para el filtro - CORREGIDO
    const monedasUnicas = cuentas.reduce((acc: MonedaInfo[], cuenta) => {
        if (cuenta.moneda && !acc.find((m) => m.codigo_moneda === cuenta.moneda!.codigo_moneda)) {
            acc.push(cuenta.moneda);
        }
        return acc;
    }, []);

    console.log('Listado de Cuentas -> ', cuentas);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cuentas" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Gestión de Cuentas" description="Administre las cuentas disponibles para su negocio." />
                    <Landmark
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Estadísticas y Filtros */}
                <div className="grid gap-6 md:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Cuentas</CardTitle>
                            <Landmark className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{cuentas.length}</div>
                            <p className="text-muted-foreground text-xs">{cuentasFiltradas.length} filtradas</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
                            <Wallet className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="cursor-help">
                                            <div className="flex items-baseline gap-2">
                                                <div className="text-2xl font-bold text-emerald-600">
                                                    {monedaPrincipal?.simbolo_moneda || '$'}
                                                    {calcularSaldoTotal()}
                                                </div>
                                                <Badge variant="secondary" className="text-xs">
                                                    {monedaPrincipal?.codigo_moneda || 'N/A'}
                                                </Badge>
                                            </div>
                                            <p className="text-muted-foreground mt-1 text-xs">En moneda principal • Hover para detalles</p>
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="w-64">
                                        <div className="space-y-2">
                                            <p className="text-sm font-semibold">Desglose por Moneda:</p>
                                            {Object.entries(calcularSaldoPorMoneda()).map(([codigo, saldo]) => {
                                                const moneda = monedasUnicas.find((m) => m.codigo_moneda === codigo);
                                                return (
                                                    <div key={codigo} className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">{codigo}:</span>
                                                        <span className="font-mono font-semibold">
                                                            {moneda?.simbolo_moneda || '$'}
                                                            {saldo.toFixed(2)}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Cuentas Activas</CardTitle>
                            <CreditCard className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{cuentas.filter((c) => c.estado === 'activa').length}</div>
                            <p className="text-muted-foreground text-xs">De {cuentas.length} totales</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Monedas</CardTitle>
                            <Coins className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{monedasUnicas.length}</div>
                            <p className="text-muted-foreground text-xs">Diferentes monedas</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Barra de Acciones y Filtros */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-1 items-center space-x-2">
                                <div className="relative max-w-sm flex-1">
                                    <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                                    <Input
                                        placeholder="Buscar cuentas..."
                                        className="pl-8"
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Tipo de cuenta" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los tipos</SelectItem>
                                        <SelectItem value="permanentes">Permanentes</SelectItem>
                                        <SelectItem value="temporales">Temporales</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={filtroMoneda} onValueChange={setFiltroMoneda}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Todas las monedas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las monedas</SelectItem>
                                        {monedasUnicas.map((moneda) => (
                                            <SelectItem key={moneda.codigo_moneda} value={moneda.codigo_moneda}>
                                                {moneda.nombre_moneda} ({moneda.codigo_moneda})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {!isVendedor && (
                                    <Link href={route('cuentas.create')}>
                                        <Button className="flex cursor-pointer items-center gap-2">
                                            <Plus size={16} />
                                            Nueva Cuenta
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Tabla de Cuentas */}
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableCaption>Lista de cuentas del sistema - {cuentasFiltradas.length} encontradas</TableCaption>
                            <TableHeader>
                                <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                    <TableHead className="w-[250px] text-white">Cuenta</TableHead>
                                    <TableHead className="text-white">Moneda</TableHead>
                                    <TableHead className="text-white">Saldo</TableHead>
                                    <TableHead className="text-white">Tipo</TableHead>
                                    <TableHead className="text-white">Estado</TableHead>
                                    <TableHead className="text-right text-white">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cuentasAmostrar.map((cuenta) => (
                                    <TableRow key={cuenta.id} className="group">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                                                    <Landmark size={16} className="text-primary" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{cuenta.nombre_cuenta}</span>
                                                    <span className="text-muted-foreground text-xs capitalize">{cuenta.tipo}</span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/20">
                                                                <Coins size={12} className="text-amber-600" />
                                                            </div>
                                                            <Badge variant="outline" className="font-mono">
                                                                {cuenta.moneda?.codigo_moneda || 'N/A'}
                                                            </Badge>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{cuenta.moneda?.nombre_moneda || 'Moneda no especificada'}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Wallet size={14} className="text-muted-foreground" />
                                                <span
                                                    className={
                                                        cuenta.saldo_cuenta !== null && cuenta.saldo_cuenta !== undefined
                                                            ? cuenta.saldo_cuenta > 0
                                                                ? 'font-semibold text-emerald-600'
                                                                : cuenta.saldo_cuenta < 0
                                                                  ? 'font-semibold text-red-600'
                                                                  : 'text-muted-foreground'
                                                            : 'text-muted-foreground'
                                                    }
                                                >
                                                    {cuenta.saldo_cuenta !== null && cuenta.saldo_cuenta !== undefined
                                                        ? `${cuenta.moneda?.simbolo_moneda || '$'} ${Math.abs(cuenta.saldo_cuenta).toFixed(2)}`
                                                        : 'Sin saldo'}
                                                    {cuenta.saldo_cuenta !== null &&
                                                        cuenta.saldo_cuenta !== undefined &&
                                                        cuenta.saldo_cuenta < 0 &&
                                                        ' (Negativo)'}
                                                </span>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    cuenta.tipo_cuenta === 'permanentes'
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'
                                                        : cuenta.tipo_cuenta === 'temporales'
                                                          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300'
                                                          : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-300'
                                                }
                                            >
                                                {cuenta.tipo_cuenta.charAt(0).toUpperCase() + cuenta.tipo_cuenta.slice(1)}
                                            </Badge>
                                        </TableCell>

                                        <TableCell>
                                            <Badge
                                                variant={cuenta.estado === 'activa' ? 'default' : 'secondary'}
                                                className={
                                                    cuenta.estado === 'activa'
                                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300'
                                                        : 'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300'
                                                }
                                            >
                                                {cuenta.estado === 'activa' ? 'Activa' : 'Inactiva'}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                                {/* Botón Ver Detalles (Show) */}
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link href={route('cuentas.show', { cuenta: cuenta.id })}>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 w-8 cursor-pointer p-0 hover:bg-blue-50 hover:text-blue-600"
                                                                >
                                                                    <Eye size={14} />
                                                                </Button>
                                                            </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Ver detalles</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>

                                                {/* Botón Editar */}
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link href={route('cuentas.edit', { cuenta: cuenta.id })}>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 w-8 cursor-pointer p-0 hover:bg-green-50 hover:text-green-600"
                                                                >
                                                                    <Edit3 size={14} />
                                                                </Button>
                                                            </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Editar cuenta</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>

                                                {/* Botón Eliminar */}
                                                <AlertDialog>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-8 w-8 cursor-pointer p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                        onClick={(e) => {
                                                                            if (!isAdmin) {
                                                                                e.preventDefault();
                                                                                toast.error('ud no tiene acceso para esta acción');
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Eliminar cuenta</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Esta acción eliminará permanentemente la cuenta "{cuenta.nombre_cuenta}". Esta acción
                                                                no se puede deshacer.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => deleteCuenta(cuenta.id)}
                                                                className="cursor-pointer bg-red-600 hover:bg-red-700"
                                                            >
                                                                Eliminar
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={3} className="font-medium">
                                        Total de cuentas filtradas
                                    </TableCell>
                                    <TableCell className="text-center font-medium">{cuentasFiltradas.length}</TableCell>
                                    <TableCell colSpan={2} className="text-right font-medium text-emerald-600">
                                        ${calcularSaldoTotal()}
                                    </TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </CardContent>
                </Card>

                {/* Paginación */}
                {totalPaginas > 1 && (
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <Button
                                    onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                                    disabled={paginaActual === 1}
                                    variant="outline"
                                    className="cursor-pointer"
                                >
                                    Anterior
                                </Button>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-sm">
                                        Página <strong>{paginaActual}</strong> de <strong>{totalPaginas}</strong>
                                    </span>
                                </div>
                                <Button
                                    onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))}
                                    disabled={paginaActual === totalPaginas}
                                    variant="outline"
                                    className="cursor-pointer"
                                >
                                    Siguiente
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
            <Toaster position="top-center" />
        </AppLayout>
    );
}
