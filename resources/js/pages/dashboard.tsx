import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
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
    Coins,
    DiamondPercent,
    DollarSign,
    IdCard,
    Info,
    Landmark,
    LucideBaggageClaim,
    LucideBoomBox,
    Notebook,
    Search,
    ShoppingBagIcon,
    TrendingDown,
    TrendingUp,
    Users,
} from 'lucide-react';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import type {
    ComparacionMensual,
    EstadoFinanciero,
    GananciaAgenciaMes,
    HistorialCambio,
    HistorialCostoPrecioItem,
    Moneda,
    MontoPorMoneda,
    ResumenFinanciero,
    StatsCostoPrecio,
    Usuario,
} from './Dashboard/types';
import { colorMoneda } from './Dashboard/utils';

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

export default function Dashboard({
    userRole,
    montosPorMoneda,
    totalCapital,
    comparaciones,
    historialCambios,
    historialCostoPrecio,
    statsCostoPrecio,
    resumenFinanciero,
    gananciaAgenciaMes,
}: {
    userRole: 'admin' | 'moderador' | 'vendedor';
    montosPorMoneda?: MontoPorMoneda[];
    totalCapital?: number;
    comparaciones?: ComparacionMensual[];
    historialCambios?: HistorialCambio[];
    historialCostoPrecio?: HistorialCostoPrecioItem[];
    statsCostoPrecio?: StatsCostoPrecio;
    resumenFinanciero?: ResumenFinanciero | null;
    gananciaAgenciaMes?: GananciaAgenciaMes | null;
}) {
    const [timeRange, setTimeRange] = React.useState('90d');
    const [chartData, setChartData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string>('');
    const [estadosFinancieros, setEstadosFinancieros] = useState<EstadoFinanciero[]>([]);
    const [isLoadingFinancial, setIsLoadingFinancial] = useState(false);
    const [busquedaEstado, setBusquedaEstado] = useState('');
    const [paginaEstado, setPaginaEstado] = useState(1);
    const CUENTAS_POR_PAGINA = 10;
    const [monedas, setMonedas] = useState<Moneda[]>([]);
    const [isLoadingMonedas, setIsLoadingMonedas] = useState(true);

    useEffect(() => {
        if (userRole === 'vendedor') {
            return;
        }

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
    }, [timeRange, userRole]);

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

    // Cargar monedas al montar el componente
    useEffect(() => {
        const fetchMonedas = async () => {
            setIsLoadingMonedas(true);
            try {
                const response = await fetch(route('dashboard.monedas'));
                const data = await response.json();
                setMonedas(data);
            } catch (error) {
                console.error('Error fetching monedas:', error);
            } finally {
                setIsLoadingMonedas(false);
            }
        };

        fetchMonedas();
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

    // Filtrar y paginar estados financieros
    const estadosFiltrados = estadosFinancieros.filter((estado) => {
        if (!busquedaEstado.trim()) return true;
        const termino = busquedaEstado.toLowerCase();
        return (
            estado.nombre_cuenta?.toLowerCase().includes(termino) ||
            estado.tipo?.toLowerCase().includes(termino) ||
            estado.moneda?.nombre_moneda?.toLowerCase().includes(termino) ||
            estado.moneda?.codigo_moneda?.toLowerCase().includes(termino) ||
            estado.moneda?.simbolo_moneda?.toLowerCase().includes(termino)
        );
    });

    const totalPaginasEstado = Math.ceil(estadosFiltrados.length / CUENTAS_POR_PAGINA);
    const estadosPaginados = estadosFiltrados.slice((paginaEstado - 1) * CUENTAS_POR_PAGINA, paginaEstado * CUENTAS_POR_PAGINA);

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
                <div
                    className={`animate__animated animate__flipInX grid auto-rows-min gap-4 ${userRole === 'admin' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}
                >
                    {/* Widget de Compra - Solo Admin (moderador y vendedor no tienen acceso a Compras) */}
                    {userRole === 'admin' && (
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
                    )}

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
                                    <div className="rounded-lg bg-emerald-500 px-2 py-1 text-sm text-white shadow-lg">
                                        Movimientos Internos de Dinero
                                    </div>
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
                                    <IdCard className="h-8 w-8 text-white" />
                                </div>

                                {/* Textos alineados a la derecha */}
                                <div className="flex h-full flex-col items-end justify-center space-y-2">
                                    <h3 className="text-4xl font-bold text-white">Transacciones</h3>
                                </div>

                                {/* Botón pequeño */}
                                <Link href={route('transacciones')}>
                                    <button className="absolute right-4 bottom-4 rounded-md bg-green-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-green-800">
                                        Movimiento Monetario
                                    </button>
                                </Link>
                            </div>

                            {/* Patrón de fondo adicional */}
                            <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        </div>
                    </div>

                    {/* Widget de Cierres - Todos */}
                    <div>
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-amber-800 to-amber-400">
                            <CursorProvider>
                                <CursorFollow>
                                    <div className="rounded-lg bg-amber-500 px-2 py-1 text-sm text-white shadow-lg">Cierre del Día</div>
                                </CursorFollow>
                            </CursorProvider>
                            {/* Ícono de fondo transparente */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                <LucideBoomBox className="h-48 w-48 text-white" />
                            </div>

                            {/* Contenido principal */}
                            <div className="relative z-10 h-full p-6">
                                {/* Ícono en la esquina superior izquierda */}
                                <div className="absolute top-4 left-4">
                                    <Notebook className="h-8 w-8 text-white" />
                                </div>

                                {/* Textos alineados a la derecha */}
                                <div className="flex h-full flex-col items-end justify-center space-y-2">
                                    <h3 className="text-4xl font-bold text-white">Cuadrar Caja</h3>
                                </div>

                                {/* Botón pequeño */}
                                <Link href={route('ventas.cierres')}>
                                    <button className="absolute right-4 bottom-4 rounded-md bg-amber-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-amber-800">
                                        Planificar Cierres
                                    </button>
                                </Link>
                            </div>

                            {/* Patrón de fondo adicional */}
                            <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        </div>
                    </div>
                </div>

                {/* Tablas de Montos y Comparaciones */}
                <div className={`animate__animated animate__fadeIn grid grid-cols-1 gap-4 ${userRole !== 'vendedor' ? 'md:grid-cols-2' : ''}`}>
                    {/* Tabla 1: Resumen Financiero (admin/moderador) o Mis Montos por Moneda (vendedor) */}
                    <div>
                        {resumenFinanciero ? (
                            <Card className="h-full overflow-hidden border-emerald-500/30 border-l-4 pt-0 shadow-sm transition-shadow hover:shadow-md">
                                <CardHeader className="border-b bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 text-white">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                            <Landmark className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-white">Resumen Financiero</CardTitle>
                                            <CardDescription className="text-emerald-100">
                                                Capital total del negocio, desglosado por moneda
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-b-sidebar-border dark:border-b-sidebar-border hover:bg-transparent">
                                                <TableHead className="text-gray-700 dark:text-gray-300">Moneda</TableHead>
                                                <TableHead className="text-right text-gray-700 dark:text-gray-300">Capital</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {resumenFinanciero.capital_por_moneda.length > 0 ? (
                                                resumenFinanciero.capital_por_moneda.map((item, index) => {
                                                    const c = colorMoneda(item.codigo, index);
                                                    return (
                                                        <TableRow
                                                            key={item.codigo}
                                                            className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50 hover:bg-sidebar/10 dark:hover:bg-sidebar/20 transition-colors"
                                                        >
                                                            <TableCell className="font-medium">
                                                                <div className="flex items-center gap-3">
                                                                    <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border}`}>
                                                                        {item.codigo}
                                                                    </Badge>
                                                                    {item.incluye_clientes_proveedores_inventario && (
                                                                        <span className="text-muted-foreground text-xs italic">
                                                                            incluye clientes, proveedores e inventario
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium">
                                                                {item.monto.toLocaleString('es-ES', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2,
                                                                })}{' '}
                                                                {item.simbolo}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            ) : (
                                                <TableRow className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50">
                                                    <TableCell colSpan={2} className="py-8 text-center text-gray-500 dark:text-gray-400">
                                                        No hay cuentas registradas todavía
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                    <div className="border-sidebar-border dark:border-sidebar-border mt-4 flex justify-between border-t pt-2 font-semibold">
                                        <span>Capital Financiero Total:</span>
                                        <span>
                                            {resumenFinanciero.moneda_principal.simbolo}{' '}
                                            {resumenFinanciero.capital_financiero.toLocaleString('es-ES', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </span>
                                    </div>
                                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                                        <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span>
                                            El monto de <strong>{resumenFinanciero.moneda_principal.codigo}</strong> incluye, además del saldo real de
                                            las cuentas, el saldo neto de clientes y proveedores y el valor del inventario — por eso no coincide con
                                            la suma simple de solo cuentas. Las demás monedas muestran únicamente su saldo de cuentas.
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="border-sidebar-border dark:border-sidebar-border">
                                <CardHeader className="border-b-sidebar-border dark:border-b-sidebar-border">
                                    <CardTitle className="flex items-center gap-2">
                                        <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        Tabla 1: Mis Montos por Moneda
                                    </CardTitle>
                                    <CardDescription>Montos asignados a tus cuentas por moneda</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-b-sidebar-border dark:border-b-sidebar-border hover:bg-transparent">
                                                <TableHead className="text-gray-700 dark:text-gray-300">Moneda</TableHead>
                                                <TableHead className="text-right text-gray-700 dark:text-gray-300">Monto</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {montosPorMoneda && montosPorMoneda.length > 0 ? (
                                                montosPorMoneda.map((item, index) => (
                                                    <TableRow
                                                        key={index}
                                                        className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50 hover:bg-sidebar/10 dark:hover:bg-sidebar/20 transition-colors"
                                                    >
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-3">
                                                                <Badge variant="secondary" className="capitalize">
                                                                    {item.descripcion}
                                                                </Badge>
                                                                <span className="text-muted-foreground font-mono text-sm">{item.simbolo}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            {item.monto.toLocaleString('es-ES', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 6,
                                                            })}{' '}
                                                            {item.simbolo}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50">
                                                    <TableCell colSpan={2} className="py-8 text-center text-gray-500 dark:text-gray-400">
                                                        No tienes cuentas asignadas o no hay montos disponibles
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                    {totalCapital !== undefined && montosPorMoneda && montosPorMoneda.length > 0 && (
                                        <div className="border-sidebar-border dark:border-sidebar-border mt-4 flex justify-between border-t pt-2 font-semibold">
                                            <span>Total Capital (USD):</span>
                                            <span>
                                                {totalCapital.toLocaleString('es-ES', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}{' '}
                                                USD
                                            </span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Tabla 2: Comparaciones Mensuales - Solo Admin y Moderador */}
                    {userRole !== 'vendedor' && <div>
                        <Card className="h-full overflow-hidden border-blue-500/30 border-l-4 pt-0 shadow-sm transition-shadow hover:shadow-md">
                            <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                            <TrendingUp className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-white">Comparación Mensual</CardTitle>
                                            <CardDescription className="text-blue-100">
                                                Comparación entre el mes actual y el mes anterior
                                            </CardDescription>
                                        </div>
                                    </div>
                                    {/* Redundante: ya estamos dentro de {userRole !== 'vendedor' && ...} (línea 540), y solo existen los
                                        3 roles admin/moderador/vendedor — aquí siempre es admin o moderador. */}
                                    <button
                                        onClick={() => window.open(route('dashboard.historial.comparaciones.view'), '_blank')}
                                        className="flex cursor-pointer items-center gap-2 rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                                    >
                                        <TrendingUp className="h-4 w-4" />
                                        Ver Historial
                                    </button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-b-sidebar-border dark:border-b-sidebar-border hover:bg-transparent">
                                            <TableHead className="text-gray-700 dark:text-gray-300">Moneda</TableHead>
                                            <TableHead className="text-right text-gray-700 dark:text-gray-300">Mes Anterior</TableHead>
                                            <TableHead className="text-right text-gray-700 dark:text-gray-300">Mes Actual</TableHead>
                                            <TableHead className="text-right text-gray-700 dark:text-gray-300">Saldo Acumulado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {comparaciones && comparaciones.length > 0 ? (
                                            (() => {
                                                // Clientes, Proveedores e Inventario se muestran aparte de las monedas reales
                                                // (su propia fila con borde punteado, sin tasa de cambio propia — igual que
                                                // antes), pero SÍ cuentan dentro de "Totales" (confirmado por el cliente
                                                // 2026-08-25 — antes Inventario quedaba fuera a propósito, ya no; Proveedores
                                                // se agregó el mismo día tras notar que Totales daba más que Capital
                                                // Financiero por excluir esta deuda, que es negativa).
                                                const filasMonedas = comparaciones.filter(
                                                    (c) => c.moneda !== 'INVENTARIO' && c.moneda !== 'CLIENTES' && c.moneda !== 'PROVEEDORES',
                                                );
                                                const filaInventario = comparaciones.find((c) => c.moneda === 'INVENTARIO');
                                                const filaClientes = comparaciones.find((c) => c.moneda === 'CLIENTES');
                                                const filaProveedores = comparaciones.find((c) => c.moneda === 'PROVEEDORES');

                                                const totalMesAnterior = comparaciones.reduce(
                                                    (sum, comp) => sum + comp.monto_anterior / (comp.tasa_cambio || 1),
                                                    0,
                                                );
                                                const totalDiferencia = comparaciones.reduce(
                                                    (sum, comp) => sum + comp.diferencia / (comp.tasa_cambio || 1),
                                                    0,
                                                );
                                                const totalSaldoAcumulado = comparaciones.reduce(
                                                    (sum, comp) => sum + comp.monto_actual / (comp.tasa_cambio || 1),
                                                    0,
                                                );

                                                const filaComparacion = (comparacion: ComparacionMensual, index: number) => {
                                                    const c = colorMoneda(comparacion.moneda, index);
                                                    return (
                                                        <TableRow
                                                            key={comparacion.moneda}
                                                            className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50 hover:bg-sidebar/10 dark:hover:bg-sidebar/20 transition-colors"
                                                        >
                                                            <TableCell className="font-medium">
                                                                <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border}`}>
                                                                    {comparacion.moneda}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {comparacion.monto_anterior.toLocaleString('es-ES', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 6,
                                                                })}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <span
                                                                    className={
                                                                        comparacion.es_positivo
                                                                            ? 'font-medium text-green-600 dark:text-green-400'
                                                                            : 'font-medium text-red-600 dark:text-red-400'
                                                                    }
                                                                >
                                                                    {comparacion.diferencia >= 0 ? '+' : ''}
                                                                    {comparacion.diferencia.toLocaleString('es-ES', {
                                                                        minimumFractionDigits: 2,
                                                                        maximumFractionDigits: 6,
                                                                    })}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {comparacion.monto_actual.toLocaleString('es-ES', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 6,
                                                                })}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                };

                                                // Fila especial (Inventario/Clientes): mismo shape que filaComparacion pero
                                                // con borde punteado y una etiqueta que explica qué es — no son monedas
                                                // reales, no tienen tasa de cambio propia, pero sí suman a Totales.
                                                const filaEspecial = (fila: ComparacionMensual, etiqueta: string) => (
                                                    <TableRow
                                                        key={fila.moneda}
                                                        className="border-t-sidebar-border dark:border-t-sidebar-border hover:bg-sidebar/10 dark:hover:bg-sidebar/20 border-t-2 border-dashed transition-colors"
                                                    >
                                                        <TableCell className="font-medium">
                                                            <Badge
                                                                variant="outline"
                                                                className={`${colorMoneda(fila.moneda, 0).bg} ${colorMoneda(fila.moneda, 0).text} ${colorMoneda(fila.moneda, 0).border}`}
                                                            >
                                                                {fila.moneda}
                                                            </Badge>
                                                            <span className="text-muted-foreground ml-2 text-xs italic">{etiqueta}</span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {fila.monto_anterior.toLocaleString('es-ES', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 6,
                                                            })}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span
                                                                className={
                                                                    fila.es_positivo
                                                                        ? 'font-medium text-green-600 dark:text-green-400'
                                                                        : 'font-medium text-red-600 dark:text-red-400'
                                                                }
                                                            >
                                                                {fila.diferencia >= 0 ? '+' : ''}
                                                                {fila.diferencia.toLocaleString('es-ES', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 6,
                                                                })}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {fila.monto_actual.toLocaleString('es-ES', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 6,
                                                            })}
                                                        </TableCell>
                                                    </TableRow>
                                                );

                                                return (
                                                    <>
                                                        {filasMonedas.map((comparacion, index) => filaComparacion(comparacion, index))}
                                                        {filaInventario && filaEspecial(filaInventario, 'valor de inventario (Productos)')}
                                                        {filaClientes && filaEspecial(filaClientes, 'saldo neto de clientes')}
                                                        {filaProveedores && filaEspecial(filaProveedores, 'saldo neto de proveedores')}

                                                        <TableRow className="bg-muted/40 hover:bg-muted/40 font-semibold">
                                                            <TableCell>Totales</TableCell>
                                                            <TableCell className="text-right">
                                                                {totalMesAnterior.toLocaleString('es-ES', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2,
                                                                })}{' '}
                                                                USD
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <span
                                                                    className={
                                                                        totalDiferencia >= 0
                                                                            ? 'text-green-600 dark:text-green-400'
                                                                            : 'text-red-600 dark:text-red-400'
                                                                    }
                                                                >
                                                                    {totalDiferencia >= 0 ? '+' : ''}
                                                                    {totalDiferencia.toLocaleString('es-ES', {
                                                                        minimumFractionDigits: 2,
                                                                        maximumFractionDigits: 2,
                                                                    })}{' '}
                                                                    USD
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {totalSaldoAcumulado.toLocaleString('es-ES', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2,
                                                                })}{' '}
                                                                USD
                                                            </TableCell>
                                                        </TableRow>
                                                    </>
                                                );
                                            })()
                                        ) : (
                                            <TableRow className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50">
                                                <TableCell colSpan={4} className="py-8 text-center text-gray-500 dark:text-gray-400">
                                                    No hay datos históricos disponibles para comparar
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>
                                        <strong>Saldo Acumulado</strong> es el saldo total real de las cuentas ahora mismo (mismo valor que el Resumen
                                        Financiero). <strong>Mes Actual</strong> muestra cuánto cambió ese saldo desde que cerró el mes pasado — esa
                                        columna sí puede aparecer en rojo si el saldo bajó, eso no significa que la cuenta esté en negativo.
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>}
                </div>

                {/* Ganancia real de la agencia (mes en curso) - Solo Admin y Moderador.
                    Tarjeta aparte de Comparación Mensual a propósito: mezclar "saldo de
                    cuentas" con "ganancia de ventas" en la misma tabla fue justo lo que
                    generó confusión con Saldo Acumulado — acá se separa visualmente. */}
                {userRole !== 'vendedor' && gananciaAgenciaMes && (
                    <div className="animate__animated animate__fadeIn">
                        <Card className="overflow-hidden border-amber-500/30 border-l-4 pt-0 shadow-sm transition-shadow hover:shadow-md">
                            <CardHeader className="border-b bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <Coins className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white">Ganancia Real de la Agencia</CardTitle>
                                        <CardDescription className="text-amber-100">
                                            Ganancia neta del mes en curso, en USD, desglosada por fuente
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                        <p className="text-muted-foreground text-xs">Ganancia de Ventas</p>
                                        <p
                                            className={`mt-1 text-xl font-semibold ${gananciaAgenciaMes.ganancia_ventas >= 0
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : 'text-red-600 dark:text-red-400'
                                                }`}
                                        >
                                            {gananciaAgenciaMes.ganancia_ventas >= 0 ? '+' : ''}
                                            {gananciaAgenciaMes.ganancia_ventas.toLocaleString('es-ES', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}{' '}
                                            USD
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-xs">Margen − comisión ± cambiaria</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                        <p className="text-muted-foreground text-xs">Ganancia/Pérdida de Transferencias</p>
                                        <p
                                            className={`mt-1 text-xl font-semibold ${gananciaAgenciaMes.ganancia_transferencias >= 0
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : 'text-red-600 dark:text-red-400'
                                                }`}
                                        >
                                            {gananciaAgenciaMes.ganancia_transferencias >= 0 ? '+' : ''}
                                            {gananciaAgenciaMes.ganancia_transferencias.toLocaleString('es-ES', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}{' '}
                                            USD
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-xs">Tasa aplicada vs. oficial de ese momento</p>
                                    </div>
                                    <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
                                        <p className="text-amber-800 text-xs dark:text-amber-300">Ganancia Neta del Mes</p>
                                        <p
                                            className={`mt-1 flex items-center gap-1 text-xl font-bold ${gananciaAgenciaMes.ganancia_neta_total >= 0
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : 'text-red-600 dark:text-red-400'
                                                }`}
                                        >
                                            {gananciaAgenciaMes.ganancia_neta_total >= 0 ? (
                                                <TrendingUp className="h-4 w-4" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4" />
                                            )}
                                            {gananciaAgenciaMes.ganancia_neta_total >= 0 ? '+' : ''}
                                            {gananciaAgenciaMes.ganancia_neta_total.toLocaleString('es-ES', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}{' '}
                                            USD
                                        </p>
                                        <p className="text-amber-800/70 mt-1 text-xs dark:text-amber-300/70">Ganancia de Ventas + Transferencias</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>
                                        Compras, Gastos e Ingresos no generan margen (se pagan sin conversión de moneda), por eso no aparecen acá —
                                        solo Ventas y Transferencias pueden dar ganancia o pérdida real.
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Sección de Monedas - Información de Tasas de Cambio */}
                <div className="animate__animated animate__fadeIn">
                    <Card className="overflow-hidden border-violet-500/30 border-l-4 pt-0 shadow-sm transition-shadow hover:shadow-md">
                        <CardHeader className="flex items-center gap-2 space-y-0 border-b bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white sm:flex-row">
                            <div className="grid flex-1 gap-1 text-center sm:text-left">
                                <div className="flex items-center justify-center gap-3 sm:justify-start">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <DollarSign className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white">Información de Monedas</CardTitle>
                                        <CardDescription className="text-violet-100">
                                            Tasas de cambio y comisiones disponibles en el sistema
                                        </CardDescription>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {isLoadingMonedas ? (
                                <div className="flex h-[300px] items-center justify-center text-center">Cargando datos de monedas...</div>
                            ) : monedas.length > 0 ? (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                                    {monedas.map((moneda, index) => {
                                        const c = colorMoneda(moneda.codigo_moneda, index);
                                        return (
                                            <div
                                                key={moneda.id}
                                                className={`rounded-lg border p-3 transition-all hover:shadow-md ${moneda.principal
                                                        ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950'
                                                        : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                                                    }`}
                                            >
                                                {/* Header con símbolo y código */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex min-w-0 items-center gap-2">
                                                        <div
                                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.bg}`}
                                                        >
                                                            <span className={`text-sm font-bold ${c.text}`}>{moneda.simbolo_moneda}</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                                                {moneda.nombre_moneda}
                                                            </h3>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{moneda.codigo_moneda}</p>
                                                        </div>
                                                    </div>
                                                    {moneda.principal && (
                                                        <TrendingUp
                                                            className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400"
                                                            aria-label="Moneda Principal"
                                                        />
                                                    )}
                                                </div>

                                                {/* Información de tasas */}
                                                <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs dark:border-gray-700">
                                                    <span className="text-gray-500 dark:text-gray-400">
                                                        Tasa:{' '}
                                                        <span className="font-semibold text-gray-900 dark:text-white">
                                                            {moneda.tasa_cambio.toLocaleString('es-ES', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 6,
                                                            })}
                                                        </span>
                                                    </span>
                                                    <span className="text-gray-500 dark:text-gray-400">
                                                        Com:{' '}
                                                        <span className="font-semibold text-orange-600 dark:text-orange-400">
                                                            {moneda.commission.toLocaleString('es-ES', {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 4,
                                                            })}
                                                            %
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex h-[300px] items-center justify-center text-center">
                                    No hay monedas disponibles en el sistema.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {(userRole === 'admin' || userRole === 'moderador') && (
                    <>
                        <Separator />
                        {/* Charts */}
                        <div>
                            <Card className="overflow-hidden border-cyan-500/30 border-l-4 pt-0 shadow-sm transition-shadow hover:shadow-md">
                                <CardHeader className="flex items-center gap-2 space-y-0 border-b bg-gradient-to-r from-cyan-600 to-cyan-700 px-6 py-5 text-white sm:flex-row">
                                    <div className="grid flex-1 gap-1 text-center sm:text-left">
                                        <div className="flex items-center justify-center gap-3 sm:justify-start">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                                <TrendingUp className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-white">Area Interactiva</CardTitle>
                                                <CardDescription className="text-cyan-100">Total de Compras y ventas en los ultimos meses</CardDescription>
                                            </div>
                                        </div>
                                    </div>
                                    <Select value={timeRange} onValueChange={setTimeRange}>
                                        <SelectTrigger
                                            className="w-[160px] rounded-lg border-white/30 bg-white/20 text-white backdrop-blur-sm sm:ml-auto [&>svg]:text-white"
                                            aria-label="Select a value"
                                        >
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
                    </>
                )}

                <Separator />

                {/* Sección de Historial de Cambios de Tasa - Solo Admin y Moderador */}
                {(userRole === 'admin' || userRole === 'moderador') && (
                    <div className="animate__animated animate__fadeIn">
                        <Card className="overflow-hidden border-orange-500/30 border-l-4 pt-0 shadow-sm transition-shadow hover:shadow-md">
                            <CardHeader className="flex items-center gap-2 space-y-0 border-b bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-5 text-white sm:flex-row">
                                <div className="grid flex-1 gap-1 text-center sm:text-left">
                                    <div className="flex items-center justify-center gap-3 sm:justify-start">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                            <TrendingUp className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-white">Historial de Cambios de Tasa</CardTitle>
                                            <CardDescription className="text-orange-100">
                                                Impacto financiero generado por cambios en tasas de cambio
                                            </CardDescription>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {historialCambios && historialCambios.length > 0 ? (
                                    <div className="space-y-4">
                                        {/* Resumen Estadístico */}
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                                                <div className="flex items-center gap-2">
                                                    <TrendingUp className="h-4 w-4 text-green-600" />
                                                    <span className="text-sm font-medium text-green-800 dark:text-green-200">Ganancias Totales</span>
                                                </div>
                                                <div className="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">
                                                    {historialCambios
                                                        .filter((cambio) => cambio.es_ganancia)
                                                        .reduce((sum, cambio) => sum + parseFloat(cambio.impacto_financiero), 0)
                                                        .toLocaleString('es-ES', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}{' '}
                                                    USD
                                                </div>
                                            </div>

                                            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                                                <div className="flex items-center gap-2">
                                                    <TrendingDown className="h-4 w-4 text-red-600" />
                                                    <span className="text-sm font-medium text-red-800 dark:text-red-200">Pérdidas Totales</span>
                                                </div>
                                                <div className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">
                                                    {Math.abs(
                                                        historialCambios
                                                            .filter((cambio) => cambio.es_perdida)
                                                            .reduce((sum, cambio) => sum + parseFloat(cambio.impacto_financiero), 0),
                                                    ).toLocaleString('es-ES', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}{' '}
                                                    USD
                                                </div>
                                            </div>

                                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                                                <div className="flex items-center gap-2">
                                                    <DollarSign className="h-4 w-4 text-blue-600" />
                                                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Impacto Neto</span>
                                                </div>
                                                <div className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">
                                                    {historialCambios
                                                        .reduce((sum, cambio) => sum + parseFloat(cambio.impacto_financiero), 0)
                                                        .toLocaleString('es-ES', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}{' '}
                                                    USD
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tabla de Cambios Recientes */}
                                        <div className="mt-6 overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="border-b-sidebar-border dark:border-b-sidebar-border hover:bg-transparent">
                                                        <TableHead className="text-gray-700 dark:text-gray-300">Fecha</TableHead>
                                                        <TableHead className="text-gray-700 dark:text-gray-300">Moneda</TableHead>
                                                        <TableHead className="text-gray-700 dark:text-gray-300">Usuario</TableHead>
                                                        <TableHead className="text-right text-gray-700 dark:text-gray-300">Tasa Anterior</TableHead>
                                                        <TableHead className="text-right text-gray-700 dark:text-gray-300">Tasa Nueva</TableHead>
                                                        <TableHead className="text-right text-gray-700 dark:text-gray-300">
                                                            Cuentas Afectadas
                                                        </TableHead>
                                                        <TableHead className="text-right text-gray-700 dark:text-gray-300">Impacto USD</TableHead>
                                                        <TableHead className="text-right text-gray-700 dark:text-gray-300">Tipo</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {historialCambios.slice(0, 5).map((cambio) => (
                                                        <TableRow
                                                            key={cambio.id}
                                                            className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50 hover:bg-sidebar/10 dark:hover:bg-sidebar/20 transition-colors"
                                                        >
                                                            <TableCell className="font-medium">
                                                                <div>
                                                                    <div className="text-sm font-medium">{cambio.fecha_formateada}</div>
                                                                    <div className="text-muted-foreground text-xs">
                                                                        {cambio.numero_cuentas_afectadas} cuentas
                                                                    </div>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <Badge variant="secondary">{cambio.moneda.simbolo_moneda}</Badge>
                                                                    <span className="text-sm">{cambio.moneda.nombre_moneda}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="text-sm">{cambio.usuario.name}</div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-sm">{cambio.tasa_anterior}</TableCell>
                                                            <TableCell className="text-right font-mono text-sm">{cambio.tasa_nueva}</TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="text-sm">
                                                                    {cambio.numero_cuentas_afectadas}{' '}
                                                                    {cambio.numero_cuentas_afectadas === 1 ? 'cuenta' : 'cuentas'}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium">
                                                                <span
                                                                    className={
                                                                        cambio.es_ganancia
                                                                            ? 'text-green-600 dark:text-green-400'
                                                                            : cambio.es_perdida
                                                                                ? 'text-red-600 dark:text-red-400'
                                                                                : 'text-gray-600 dark:text-gray-400'
                                                                    }
                                                                >
                                                                    {cambio.impacto_formateado}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Badge
                                                                    variant={
                                                                        cambio.es_ganancia
                                                                            ? 'default'
                                                                            : cambio.es_perdida
                                                                                ? 'destructive'
                                                                                : 'secondary'
                                                                    }
                                                                    className={
                                                                        cambio.es_ganancia
                                                                            ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
                                                                            : cambio.es_perdida
                                                                                ? 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
                                                                                : ''
                                                                    }
                                                                >
                                                                    {cambio.es_ganancia ? 'Ganancia' : cambio.es_perdida ? 'Pérdida' : 'Neutro'}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        {/* Mostrar más */}
                                        {historialCambios.length > 5 && (
                                            <div className="mt-4 text-center">
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    Mostrando los últimos 5 cambios de {historialCambios.length} totales
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex h-[300px] items-center justify-center text-center">
                                        <div className="space-y-2">
                                            <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="text-gray-500 dark:text-gray-400">No hay historial de cambios de tasa disponible.</div>
                                            <div className="text-sm text-gray-400 dark:text-gray-500">
                                                Los cambios aparecerán aquí cuando se modifiquen las tasas de cambio.
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                <Separator />

                {/* Sección de Cambios de Precio de Costo - Solo Admin y Moderador */}
                {(userRole === 'admin' || userRole === 'moderador') && (
                    <div className="animate__animated animate__fadeIn">
                        <Card className="overflow-hidden border-amber-500/30 border-l-4 pt-0 shadow-sm transition-shadow hover:shadow-md">
                            <CardHeader className="flex items-center gap-2 space-y-0 border-b bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5 text-white sm:flex-row">
                                <div className="grid flex-1 gap-1 text-center sm:text-left">
                                    <div className="flex items-center justify-center gap-3 sm:justify-start">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                            <DollarSign className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-white">Cambios de Precio de Costo</CardTitle>
                                            <CardDescription className="text-amber-100">
                                                Impacto financiero estimado por cambios al precio de costo de productos
                                            </CardDescription>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => window.open(route('reportes.historial_costo_precio'), '_blank')}
                                    className="flex cursor-pointer items-center gap-2 rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                                >
                                    <TrendingUp className="h-4 w-4" />
                                    Ver Historial Completo
                                </button>
                            </CardHeader>
                            <CardContent className="pt-6">
                                {historialCostoPrecio && historialCostoPrecio.length > 0 ? (
                                    <div className="space-y-4">
                                        {/* Resumen estadístico */}
                                        {statsCostoPrecio && (
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                                        <span className="text-sm font-medium text-green-800 dark:text-green-200">Ganancia acumulada</span>
                                                    </div>
                                                    <div className="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">
                                                        +{statsCostoPrecio.total_ganancias.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </div>
                                                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                                                    <div className="flex items-center gap-2">
                                                        <TrendingDown className="h-4 w-4 text-red-600" />
                                                        <span className="text-sm font-medium text-red-800 dark:text-red-200">Pérdida acumulada</span>
                                                    </div>
                                                    <div className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">
                                                        -{statsCostoPrecio.total_perdidas.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </div>
                                                <div className={`rounded-lg border p-4 ${statsCostoPrecio.neto_impacto >= 0 ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950' : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <DollarSign className={`h-4 w-4 ${statsCostoPrecio.neto_impacto >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                                                        <span className={`text-sm font-medium ${statsCostoPrecio.neto_impacto >= 0 ? 'text-blue-800 dark:text-blue-200' : 'text-orange-800 dark:text-orange-200'}`}>Impacto neto</span>
                                                    </div>
                                                    <div className={`mt-1 text-2xl font-bold ${statsCostoPrecio.neto_impacto >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
                                                        {statsCostoPrecio.neto_impacto >= 0 ? '+' : ''}{statsCostoPrecio.neto_impacto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </div>
                                                </div>
                                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                                                    <div className="flex items-center gap-2">
                                                        <DollarSign className="h-4 w-4 text-gray-500" />
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total cambios</span>
                                                    </div>
                                                    <div className="mt-1 text-2xl font-bold text-gray-700 dark:text-gray-300">
                                                        {statsCostoPrecio.numero_cambios}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Tabla de cambios recientes */}
                                        <div className="mt-4 overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="border-b-sidebar-border dark:border-b-sidebar-border hover:bg-transparent">
                                                        <TableHead className="text-gray-700 dark:text-gray-300">Fecha</TableHead>
                                                        <TableHead className="text-gray-700 dark:text-gray-300">Producto</TableHead>
                                                        <TableHead className="text-gray-700 dark:text-gray-300">Usuario</TableHead>
                                                        <TableHead className="text-right text-gray-700 dark:text-gray-300">Costo anterior</TableHead>
                                                        <TableHead className="text-right text-gray-700 dark:text-gray-300">Costo nuevo</TableHead>
                                                        <TableHead className="text-right text-gray-700 dark:text-gray-300">Stock</TableHead>
                                                        <TableHead className="text-right text-gray-700 dark:text-gray-300">Impacto</TableHead>
                                                        <TableHead className="text-gray-700 dark:text-gray-300">Tipo</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {historialCostoPrecio.slice(0, 5).map((item) => (
                                                        <TableRow
                                                            key={item.id}
                                                            className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50 hover:bg-sidebar/10 dark:hover:bg-sidebar/20 transition-colors"
                                                        >
                                                            <TableCell className="text-sm">{item.fecha_formateada}</TableCell>
                                                            <TableCell className="font-medium">{item.producto.nombre_producto}</TableCell>
                                                            <TableCell className="text-sm text-gray-600 dark:text-gray-400">{item.usuario.name}</TableCell>
                                                            <TableCell className="text-right font-mono text-sm text-gray-500">{item.precio_anterior.toFixed(2)}</TableCell>
                                                            <TableCell className="text-right font-mono text-sm font-semibold">{item.precio_nuevo.toFixed(2)}</TableCell>
                                                            <TableCell className="text-right text-sm">{item.stock_momento}</TableCell>
                                                            <TableCell className="text-right font-semibold">
                                                                <span className={item.es_ganancia ? 'text-green-600 dark:text-green-400' : item.es_perdida ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}>
                                                                    {item.impacto_formateado}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant={item.es_ganancia ? 'default' : item.es_perdida ? 'destructive' : 'secondary'}
                                                                    className={
                                                                        item.es_ganancia
                                                                            ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
                                                                            : item.es_perdida
                                                                                ? 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
                                                                                : ''
                                                                    }
                                                                >
                                                                    {item.es_ganancia ? 'Ganancia' : item.es_perdida ? 'Pérdida' : 'Neutro'}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                        {historialCostoPrecio.length > 5 && (
                                            <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                                                Mostrando los últimos 5 de {historialCostoPrecio.length} cambios
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex h-[200px] items-center justify-center text-center">
                                        <div className="space-y-2">
                                            <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="text-gray-500 dark:text-gray-400">No hay cambios de precio de costo registrados.</div>
                                            <div className="text-sm text-gray-400 dark:text-gray-500">
                                                Aparecerán aquí cuando un admin o moderador modifique el costo de un producto.
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                <Separator />

                {/* Tabla de Estados Financieros */}
                <div>
                    <Card className="overflow-hidden border-rose-500/30 border-l-4 pt-0 shadow-sm transition-shadow hover:shadow-md">
                        <CardHeader className="flex items-center gap-2 space-y-0 border-b bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-5 text-white sm:flex-row">
                            <div className="grid flex-1 gap-1 text-center sm:text-left">
                                <div className="flex items-center justify-center gap-3 sm:justify-start">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <DollarSign className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white">Estados Financieros</CardTitle>
                                        <CardDescription className="text-rose-100">Resumen de cuentas y saldos asignados</CardDescription>
                                    </div>
                                </div>
                            </div>
                            {/* Búsqueda */}
                            <div className="relative w-[250px]">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/70" />
                                <Input
                                    type="text"
                                    placeholder="Buscar cuenta, tipo, moneda..."
                                    className="border-white/30 bg-white/20 pl-9 text-white placeholder:text-white/70 backdrop-blur-sm"
                                    value={busquedaEstado}
                                    onChange={(e) => {
                                        setBusquedaEstado(e.target.value);
                                        setPaginaEstado(1);
                                    }}
                                />
                            </div>
                            {/* Selector de usuario */}
                            {userRole !== 'vendedor' && (
                                <Select value={usuarioSeleccionado} onValueChange={setUsuarioSeleccionado}>
                                    <SelectTrigger className="w-[220px] rounded-lg" aria-label="Filtrar por usuario">
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
                            ) : estadosFiltrados.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-b-sidebar-border dark:border-b-sidebar-border hover:bg-transparent">
                                                    <TableHead className="text-gray-700 dark:text-gray-300">Cuenta</TableHead>
                                                    <TableHead className="text-gray-700 dark:text-gray-300">Tipo</TableHead>
                                                    <TableHead className="text-gray-700 dark:text-gray-300">Moneda</TableHead>
                                                    <TableHead className="text-right text-gray-700 dark:text-gray-300">Saldo</TableHead>
                                                    <TableHead className="text-gray-700 dark:text-gray-300">Tipo Cuenta</TableHead>
                                                    <TableHead className="text-gray-700 dark:text-gray-300">Vendedores</TableHead>
                                                    <TableHead className="text-gray-700 dark:text-gray-300">Estado</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {estadosPaginados.map((estado) => {
                                                    const getColorClass = () => {
                                                        const nombre = estado.nombre_cuenta.toLowerCase();
                                                        if (nombre.includes('efectivo') || nombre.includes('cash'))
                                                            return 'bg-amber-100 dark:bg-amber-900/50';
                                                        if (nombre.includes('tarjeta') || nombre.includes('card'))
                                                            return 'bg-blue-100 dark:bg-blue-900/50';
                                                        return 'bg-gray-100 dark:bg-gray-700';
                                                    };
                                                    return (
                                                        <TableRow
                                                            key={estado.cuenta_id}
                                                            className={`border-b-sidebar-border/50 dark:border-b-sidebar-border/50 hover:bg-sidebar/10 dark:hover:bg-sidebar/20 transition-colors ${getColorClass()}`}
                                                        >
                                                            <TableCell className="font-medium">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold">{estado.nombre_cuenta}</span>
                                                                    <Badge variant="secondary" className="text-xs">
                                                                        #{estado.cuenta_id}
                                                                    </Badge>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm capitalize">{estado.tipo}</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-mono font-bold">{estado.moneda.simbolo_moneda}</span>
                                                                    <span className="text-muted-foreground text-sm">
                                                                        {estado.moneda.codigo_moneda}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium">
                                                                {estado.saldo_cuenta.toLocaleString('es-ES', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2,
                                                                })}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={
                                                                        estado.tipo_cuenta === 'permanentes'
                                                                            ? 'border-blue-300 text-blue-800 dark:text-blue-300'
                                                                            : estado.tipo_cuenta === 'temporales'
                                                                                ? 'border-green-300 text-green-800 dark:text-green-300'
                                                                                : 'border-red-300 text-red-800 dark:text-red-300'
                                                                    }
                                                                >
                                                                    {estado.tipo_cuenta}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {estado.usuarios.length > 0 ? (
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <button className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-blue-100 p-1.5 transition-colors hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-800">
                                                                                    <Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                                                                    <span className="ml-1 text-xs font-semibold text-blue-600 dark:text-blue-300">
                                                                                        {estado.usuarios.length}
                                                                                    </span>
                                                                                </button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent side="left" className="max-w-sm bg-gray-800 text-white">
                                                                                <div className="space-y-1">
                                                                                    <p className="font-semibold">Vendedores asignados:</p>
                                                                                    {estado.usuarios.map((usuario) => (
                                                                                        <div key={usuario.id} className="text-xs">
                                                                                            <p className="font-medium">{usuario.name}</p>
                                                                                            <p className="opacity-80">({usuario.role})</p>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                ) : (
                                                                    <span className="text-xs text-gray-400 italic">Ninguno</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge
                                                                    variant={estado.estado_cuenta ? 'default' : 'secondary'}
                                                                    className={
                                                                        estado.estado_cuenta
                                                                            ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300'
                                                                            : 'border-gray-500/30 bg-gray-500/10 text-gray-600 dark:text-gray-400'
                                                                    }
                                                                >
                                                                    {estado.estado_cuenta ? 'Activa' : 'Inactiva'}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {totalPaginasEstado > 1 && (
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-gray-600">
                                                {(paginaEstado - 1) * CUENTAS_POR_PAGINA + 1} -{' '}
                                                {Math.min(paginaEstado * CUENTAS_POR_PAGINA, estadosFiltrados.length)} de {estadosFiltrados.length}{' '}
                                                cuentas
                                            </div>
                                            <div className="flex space-x-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={paginaEstado === 1}
                                                    onClick={() => setPaginaEstado((p) => Math.max(1, p - 1))}
                                                >
                                                    «
                                                </Button>
                                                {Array.from({ length: totalPaginasEstado }, (_, i) => i + 1).map((p) => (
                                                    <Button
                                                        key={p}
                                                        variant={p === paginaEstado ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setPaginaEstado(p)}
                                                    >
                                                        {p}
                                                    </Button>
                                                ))}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={paginaEstado === totalPaginasEstado}
                                                    onClick={() => setPaginaEstado((p) => Math.min(totalPaginasEstado, p + 1))}
                                                >
                                                    »
                                                </Button>
                                            </div>
                                        </div>
                                    )}
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
