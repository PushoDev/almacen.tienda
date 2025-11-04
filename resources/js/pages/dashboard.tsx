import HeadingSmall from '@/components/heading-small';
import { CursorFollow, CursorProvider } from '@/components/ui/cursor';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { ScrollProgress } from '@/components/ui/scroll';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    ComputerIcon,
    DiamondPercent,
    LucideBaggageClaim,
    LucideBoomBox,
    LucideClockArrowDown,
    MonitorCog,
    ShoppingBagIcon,
    Users,
} from 'lucide-react';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const chartConfig = {
    compras: {
        label: 'Compras',
        color: '#ec4899',
    },
    ventas: {
        label: 'Ventas',
        color: '#16a34a',
    },
} satisfies ChartConfig;

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Opciones Generales',
        href: '/dashboard',
    },
];

interface Usuario {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface Moneda {
    id: number;
    nombre_moneda: string;
    codigo_moneda: string;
    simbolo_moneda: string;
    tasa_cambio: number;
    commission: number;
    estado: boolean;
}

interface EstadoFinanciero {
    cuenta_id: number;
    nombre_cuenta: string;
    tipo: string;
    saldo_cuenta: number;
    deuda: number;
    tipo_cuenta: string;
    estado_cuenta: boolean;
    moneda: Moneda;
    usuarios: Usuario[];
}

export default function Dashboard({ userRole }: { userRole: 'admin' | 'moderador' | 'vendedor' }) {
    const [timeRange, setTimeRange] = React.useState('90d');
    const [chartData, setChartData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string>('');
    const [estadosFinancieros, setEstadosFinancieros] = useState<EstadoFinanciero[]>([]);
    const [isLoadingFinancial, setIsLoadingFinancial] = useState(false);

    useEffect(() => {
        const fetchChartData = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(route('dashboard.chart.data', { timeRange }));
                const data = await response.json();
                setChartData(data);
            } catch (error) {
                console.error('Error fetching chart data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchChartData();
    }, [timeRange]);

    // Cargar usuarios al montar el componente
    useEffect(() => {
        const fetchUsuarios = async () => {
            try {
                const response = await fetch(route('dashboard.usuarios'));
                const data = await response.json();
                setUsuarios(data);
            } catch (error) {
                console.error('Error fetching usuarios:', error);
            }
        };

        fetchUsuarios();
    }, []);

    // Cargar estados financieros cuando cambia el usuario seleccionado
    useEffect(() => {
        const fetchFinancialStates = async () => {
            setIsLoadingFinancial(true);
            try {
                const url =
                    usuarioSeleccionado && usuarioSeleccionado !== 'all'
                        ? route('dashboard.financial.states', { user_id: usuarioSeleccionado })
                        : route('dashboard.financial.states');
                const response = await fetch(url);
                const data = await response.json();
                setEstadosFinancieros(data);
            } catch (error) {
                console.error('Error fetching financial states:', error);
            } finally {
                setIsLoadingFinancial(false);
            }
        };

        fetchFinancialStates();
    }, [usuarioSeleccionado]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventario" />
            <ScrollProgress />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <CursorProvider>
                        <CursorFollow>
                            <div className="bg-sidebar-accent rounded-lg px-2 py-1 text-sm text-white shadow-lg">Opciones Generales</div>
                        </CursorFollow>
                    </CursorProvider>
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento"
                    />
                    {/* Ícono semitransparente */}
                    <ComputerIcon
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* User Role Badge */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Opciones Disponibles</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Rol:</span>
                        {userRole === 'admin' && (
                            <span className="inline-block rounded-full bg-red-600 px-4 py-1 text-xs font-bold text-white">ADMINISTRADOR</span>
                        )}
                        {userRole === 'moderador' && (
                            <span className="inline-block rounded-full bg-yellow-600 px-4 py-1 text-xs font-bold text-white">MODERADOR</span>
                        )}
                        {userRole === 'vendedor' && (
                            <span className="inline-block rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white">VENDEDOR</span>
                        )}
                    </div>
                </div>

                {/* Opciones */}
                <div className="animate__animated animate__flipInX grid auto-rows-min gap-4 md:grid-cols-4">
                    {/* Widget de Compra - Todos */}
                    <div>
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-red-800 to-red-400">
                            <CursorProvider>
                                <CursorFollow>
                                    <div className="rounded-lg bg-red-500 px-2 py-1 text-sm text-white shadow-lg">Comprar Nuevos Productos</div>
                                </CursorFollow>
                            </CursorProvider>
                            {/* Ícono de fondo transparente */}
                            <div id="compra-producto" className="absolute inset-0 flex items-center justify-center opacity-10">
                                <ShoppingBagIcon className="h-48 w-48 text-white" />
                            </div>
                            {/* Contenido principal */}
                            <div className="relative z-10 h-full p-6">
                                {/* Ícono en la esquina superior izquierda */}
                                <div className="absolute top-4 left-4">
                                    <LucideBaggageClaim className="h-8 w-8 text-white" />
                                </div>
                                {/* Textos alineados a la derecha */}
                                <div className="flex h-full flex-col items-end justify-center space-y-2">
                                    <h3 className="font-sans text-4xl font-bold text-white">Comprar</h3>
                                </div>
                                {/* Link */}
                                <Link href={route('comprar.index')}>
                                    <button className="absolute right-4 bottom-4 ms-2 rounded-md bg-red-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-red-800">
                                        Acceder a Compra
                                    </button>
                                </Link>
                            </div>

                            {/* Patrón de fondo adicional */}
                            <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        </div>
                    </div>

                    {/* Widget de Venta - Todos */}
                    <div>
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-blue-800 to-blue-400">
                            <CursorProvider>
                                <CursorFollow>
                                    <div className="rounded-lg bg-blue-500 px-2 py-1 text-sm text-white shadow-lg">Punto de Venta</div>
                                </CursorFollow>
                            </CursorProvider>
                            {/* Ícono de fondo transparente */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                <LucideBaggageClaim className="h-48 w-48 text-white" />
                            </div>

                            {/* Contenido principal */}
                            <div className="relative z-10 h-full p-6">
                                {/* Ícono en la esquina superior izquierda */}
                                <div className="absolute top-4 left-4">
                                    <ShoppingBagIcon className="h-8 w-8 text-white" />
                                </div>

                                {/* Textos alineados a la derecha */}
                                <div className="flex h-full flex-col items-end justify-center space-y-2">
                                    <h3 className="text-4xl font-bold text-white">Vender</h3>
                                </div>

                                {/* Botón pequeño con Dialog */}
                                <Link href={route('punto-venta.index')}>
                                    <button className="absolute right-4 bottom-4 rounded-md bg-blue-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-blue-800">
                                        Vender
                                    </button>
                                </Link>
                            </div>

                            {/* Patrón de fondo adicional */}
                            <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        </div>
                    </div>

                    {/* Widget de Transacciones - Todos */}
                    <div>
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-green-800 to-green-400">
                            <CursorProvider>
                                <CursorFollow>
                                    <div className="rounded-lg bg-emerald-500 px-2 py-1 text-sm text-white shadow-lg">Movimientos Internos</div>
                                </CursorFollow>
                            </CursorProvider>
                            {/* Ícono de fondo transparente */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                <DiamondPercent className="h-48 w-48 text-white" />
                            </div>

                            {/* Contenido principal */}
                            <div className="relative z-10 h-full p-6">
                                {/* Ícono en la esquina superior izquierda */}
                                <div className="absolute top-4 left-4">
                                    <LucideClockArrowDown className="h-8 w-8 text-white" />
                                </div>

                                {/* Textos alineados a la derecha */}
                                <div className="flex h-full flex-col items-end justify-center space-y-2">
                                    <h3 className="text-4xl font-bold text-white">Transacciones</h3>
                                </div>

                                {/* Botón pequeño */}
                                <Link href={route('transacciones')}>
                                    <button className="absolute right-4 bottom-4 rounded-md bg-green-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-green-800">
                                        Transacciones
                                    </button>
                                </Link>
                            </div>

                            {/* Patrón de fondo adicional */}
                            <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        </div>
                    </div>

                    {/* Widget de Remesas - Todos */}
                    <div>
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-amber-800 to-amber-400">
                            {/* Ícono de fondo transparente */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                <LucideBoomBox className="h-48 w-48 text-white" />
                            </div>

                            {/* Contenido principal */}
                            <div className="relative z-10 h-full p-6">
                                {/* Ícono en la esquina superior izquierda */}
                                <div className="absolute top-4 left-4">
                                    <MonitorCog className="h-8 w-8 text-white" />
                                </div>

                                {/* Textos alineados a la derecha */}
                                <div className="flex h-full flex-col items-end justify-center space-y-2">
                                    <h3 className="text-4xl font-bold text-white">Remesas</h3>
                                </div>

                                {/* Botón pequeño */}
                                <Link href={route('remesas')}>
                                    <button className="absolute right-4 bottom-4 rounded-md bg-amber-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-amber-800">
                                        Cuadre / Inventario
                                    </button>
                                </Link>
                            </div>

                            {/* Patrón de fondo adicional */}
                            <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        </div>
                    </div>
                </div>

                <Separator />
                {/* Charts */}
                <div>
                    <Card>
                        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                            <div className="grid flex-1 gap-1 text-center sm:text-left">
                                <CardTitle>Area Interactiva</CardTitle>
                                <CardDescription>Total de Compras y ventas en los ultimos meses</CardDescription>
                            </div>
                            <Select value={timeRange} onValueChange={setTimeRange}>
                                <SelectTrigger className="w-[160px] rounded-lg sm:ml-auto" aria-label="Select a value">
                                    <SelectValue placeholder="Ultimos 3 meses" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="1d" className="rounded-lg">
                                        Hoy
                                    </SelectItem>
                                    <SelectItem value="2d" className="rounded-lg">
                                        Ayer
                                    </SelectItem>
                                    <SelectItem value="3d" className="rounded-lg">
                                        Antes de Ayer
                                    </SelectItem>
                                    <SelectItem value="7d" className="rounded-lg">
                                        Ultimos 7 dias
                                    </SelectItem>
                                    <SelectItem value="30d" className="rounded-lg">
                                        Ultimos 30 dias
                                    </SelectItem>
                                    <SelectItem value="90d" className="rounded-lg">
                                        Ultimos 3 meses
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                            {isLoading ? (
                                <div className="flex h-[250px] items-center justify-center text-center">Cargando datos del gráfico...</div>
                            ) : chartData.length > 0 ? (
                                <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                                    <AreaChart data={chartData}>
                                        <defs>
                                            <linearGradient id="fillVentas" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-ventas)" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="var(--color-ventas)" stopOpacity={0.1} />
                                            </linearGradient>
                                            <linearGradient id="fillCompras" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-compras)" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="var(--color-compras)" stopOpacity={0.1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={8}
                                            minTickGap={32}
                                            tickFormatter={(value) => {
                                                const date = new Date(value);
                                                return date.toLocaleDateString('es-ES', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                });
                                            }}
                                        />
                                        <ChartTooltip
                                            cursor={false}
                                            content={
                                                <ChartTooltipContent
                                                    labelFormatter={(value) => {
                                                        return new Date(value).toLocaleDateString('es-ES', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                        });
                                                    }}
                                                    indicator="dot"
                                                />
                                            }
                                        />
                                        <Area dataKey="compras" type="natural" fill="url(#fillCompras)" stroke="var(--color-compras)" stackId="a" />
                                        <Area dataKey="ventas" type="natural" fill="url(#fillVentas)" stroke="var(--color-ventas)" stackId="a" />
                                        <ChartLegend content={<ChartLegendContent />} />
                                    </AreaChart>
                                </ChartContainer>
                            ) : (
                                <div className="flex h-[250px] items-center justify-center text-center">
                                    No hay datos disponibles para el rango de tiempo seleccionado.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Separator />

                {/* Tabla de Estados Financieros */}
                <div>
                    <Card>
                        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                            <div className="grid flex-1 gap-1 text-center sm:text-left">
                                <CardTitle>Estados Financieros</CardTitle>
                                <CardDescription>
                                    {userRole === 'vendedor' ? 'Mis Cuentas Asignadas' : 'Cuentas por Moneda y Usuarios Asignados'}
                                </CardDescription>
                            </div>
                            {userRole !== 'vendedor' && (
                                <Select value={usuarioSeleccionado} onValueChange={setUsuarioSeleccionado}>
                                    <SelectTrigger className="w-[220px] rounded-lg sm:ml-auto" aria-label="Filtrar por usuario">
                                        <SelectValue placeholder="Todos los usuarios" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="all">Todos los usuarios</SelectItem>
                                        {usuarios.map((usuario) => (
                                            <SelectItem key={usuario.id} value={usuario.id.toString()}>
                                                {usuario.name} ({usuario.role})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </CardHeader>
                        <CardContent className="pt-6">
                            {isLoadingFinancial ? (
                                <div className="flex h-[300px] items-center justify-center text-center">Cargando datos financieros...</div>
                            ) : estadosFinancieros.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Cuenta</TableHead>
                                                <TableHead>Tipo</TableHead>
                                                <TableHead>Moneda</TableHead>
                                                <TableHead className="text-right">Saldo</TableHead>
                                                <TableHead className="text-right">Deuda</TableHead>
                                                <TableHead>Tipo Cuenta</TableHead>
                                                <TableHead>Vendedores</TableHead>
                                                <TableHead>Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {estadosFinancieros.map((estado) => (
                                                <TableRow key={estado.cuenta_id}>
                                                    <TableCell className="font-medium">{estado.nombre_cuenta}</TableCell>
                                                    <TableCell>{estado.tipo}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg font-semibold">{estado.moneda.simbolo_moneda}</span>
                                                            <span className="text-sm text-gray-600">{estado.moneda.codigo_moneda}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {estado.saldo_cuenta.toLocaleString('es-DO', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {estado.deuda > 0 && (
                                                            <span className="font-semibold text-red-600">
                                                                {estado.deuda.toLocaleString('es-DO', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2,
                                                                })}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span
                                                            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                                                                estado.tipo_cuenta === 'permanentes'
                                                                    ? 'bg-blue-100 text-blue-800'
                                                                    : estado.tipo_cuenta === 'temporales'
                                                                      ? 'bg-green-100 text-green-800'
                                                                      : 'bg-red-100 text-red-800'
                                                            }`}
                                                        >
                                                            {estado.tipo_cuenta}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {estado.usuarios.length > 0 ? (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-blue-100 p-2 transition-colors hover:bg-blue-200">
                                                                            <Users className="h-4 w-4 text-blue-600" />
                                                                            <span className="ml-1 text-xs font-semibold text-blue-600">
                                                                                {estado.usuarios.length}
                                                                            </span>
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="left" className="max-w-sm">
                                                                        <div className="space-y-2">
                                                                            <p className="font-semibold text-white">Vendedores asignados:</p>
                                                                            {estado.usuarios.map((usuario) => (
                                                                                <div key={usuario.id} className="text-sm text-white">
                                                                                    <p className="font-medium">{usuario.name}</p>
                                                                                    <p className="text-xs opacity-90">({usuario.role})</p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">Sin usuario</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span
                                                            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                                                                estado.estado_cuenta ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                            }`}
                                                        >
                                                            {estado.estado_cuenta ? 'Activa' : 'Inactiva'}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="flex h-[300px] items-center justify-center text-center">No hay cuentas disponibles para mostrar.</div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Toaster position="top-center" />
            </div>
        </AppLayout>
    );
}
