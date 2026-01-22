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
    DiamondPercent,
    DollarSign,
    IdCard,
    LucideBaggageClaim,
    LucideBoomBox,
    Notebook,
    ShoppingBagIcon,
    TrendingUp,
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
    principal: boolean;
}

interface MontoPorMoneda {
    descripcion: string;
    simbolo: string;
    monto: number;
    tasa_cambio: number;
}

interface ComparacionMensual {
    moneda: string;
    nombre_moneda: string;
    simbolo_moneda: string;
    monto_actual: number;
    monto_anterior: number;
    diferencia: number;
    porcentaje_cambio: number;
    es_positivo: boolean;
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

interface HistorialCambio {
    id: number;
    moneda: {
        id: number;
        nombre_moneda: string;
        codigo_moneda: string;
        simbolo_moneda: string;
    };
    usuario: {
        id: number;
        name: string;
    };
    tasa_anterior: string;
    tasa_nueva: string;
    diferencia_tasa: string;
    porcentaje_cambio: string;
    total_cuentas_afectadas: string;
    impacto_financiero: string;
    impacto_porcentaje: string;
    numero_cuentas_afectadas: number;
    es_ganancia: boolean;
    es_perdida: boolean;
    impacto_formateado: string;
    impacto_porcentaje_formateado: string;
    fecha_cambio: string;
    fecha_formateada: string;
}

export default function Dashboard({
    userRole,
    montosPorMoneda,
    totalCapital,
    comparaciones,
    historialCambios,
}: {
    userRole: 'admin' | 'moderador' | 'vendedor';
    montosPorMoneda?: MontoPorMoneda[];
    totalCapital?: number;
    comparaciones?: ComparacionMensual[];
    historialCambios?: HistorialCambio[];
}) {
    const [timeRange, setTimeRange] = React.useState('90d');
    const [chartData, setChartData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string>('');
    const [estadosFinancieros, setEstadosFinancieros] = useState<EstadoFinanciero[]>([]);
    const [isLoadingFinancial, setIsLoadingFinancial] = useState(false);
    const [monedas, setMonedas] = useState<Moneda[]>([]);
    const [isLoadingMonedas, setIsLoadingMonedas] = useState(true);

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
                    className={`animate__animated animate__flipInX grid auto-rows-min gap-4 ${userRole === 'vendedor' ? 'md:grid-cols-3' : 'md:grid-cols-4'}`}
                >
                    {/* Widget de Compra - Solo Admin y Moderador */}
                    {(userRole === 'admin' || userRole === 'moderador') && (
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
                                    <IdCard className="h-8 w-8 text-white" />
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

                    {/* Widget de Cierres - Todos */}
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
                                    <Notebook className="h-8 w-8 text-white" />
                                </div>

                                {/* Textos alineados a la derecha */}
                                <div className="flex h-full flex-col items-end justify-center space-y-2">
                                    <h3 className="text-4xl font-bold text-white">Cuadre de Caja</h3>
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
                <div className="animate__animated animate__fadeIn grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* Tabla 1: Montos por Moneda */}
                    <div>
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
                    </div>

                    {/* Tabla 2: Comparaciones Mensuales */}
                    <div>
                        <Card className="border-sidebar-border dark:border-sidebar-border">
                            <CardHeader className="border-b-sidebar-border dark:border-b-sidebar-border">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        <div>
                                            <CardTitle>Tabla 2: Comparación Mensual</CardTitle>
                                            <CardDescription>Comparación entre el mes actual y el mes anterior</CardDescription>
                                        </div>
                                    </div>
                                    {(userRole === 'admin' || userRole === 'moderador') && (
                                        <button
                                            onClick={() => window.open(route('dashboard.historial.comparaciones.view'), '_blank')}
                                            className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 cursor-pointer"
                                        >
                                            <TrendingUp className="h-4 w-4" />
                                            Ver Historial
                                        </button>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-b-sidebar-border dark:border-b-sidebar-border hover:bg-transparent">
                                            <TableHead className="text-gray-700 dark:text-gray-300">Moneda</TableHead>
                                            <TableHead className="text-gray-700 dark:text-gray-300">Símbolo</TableHead>
                                            <TableHead className="text-right text-gray-700 dark:text-gray-300">Mes Anterior</TableHead>
                                            <TableHead className="text-right text-gray-700 dark:text-gray-300">Mes Actual</TableHead>
                                            <TableHead className="text-right text-gray-700 dark:text-gray-300">Diferencia</TableHead>
                                            <TableHead className="text-right text-gray-700 dark:text-gray-300">% Cambio</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {comparaciones && comparaciones.length > 0 ? (
                                            comparaciones.map((comparacion, index) => (
                                                <TableRow
                                                    key={index}
                                                    className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50 hover:bg-sidebar/10 dark:hover:bg-sidebar/20 transition-colors"
                                                >
                                                    <TableCell className="font-medium">{comparacion.moneda}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">{comparacion.simbolo_moneda}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {comparacion.monto_anterior.toLocaleString('es-ES', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 6,
                                                        })}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {comparacion.monto_actual.toLocaleString('es-ES', {
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
                                                        <span
                                                            className={
                                                                comparacion.es_positivo
                                                                    ? 'font-medium text-green-600 dark:text-green-400'
                                                                    : 'font-medium text-red-600 dark:text-red-400'
                                                            }
                                                        >
                                                            {comparacion.porcentaje_cambio >= 0 ? '+' : ''}
                                                            {comparacion.porcentaje_cambio.toFixed(2)}%
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50">
                                                <TableCell colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                                                    No hay datos históricos disponibles para comparar
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                {comparaciones && comparaciones.length > 0 && (
                                    <div className="border-sidebar-border dark:border-sidebar-border mt-4 grid grid-cols-6 gap-2 border-t pt-2 text-sm font-semibold">
                                        <span className="text-right">Totales:</span>
                                        <span></span>
                                        <span className="text-right">
                                            {comparaciones
                                                .reduce((sum, comp) => {
                                                    const tasaCambio = comp.tasa_cambio || 1;
                                                    return sum + comp.monto_anterior / tasaCambio;
                                                }, 0)
                                                .toLocaleString('es-ES', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}{' '}
                                            USD
                                        </span>
                                        <span className="text-right">
                                            {comparaciones
                                                .reduce((sum, comp) => {
                                                    const tasaCambio = comp.tasa_cambio || 1;
                                                    return sum + comp.monto_actual / tasaCambio;
                                                }, 0)
                                                .toLocaleString('es-ES', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}{' '}
                                            USD
                                        </span>
                                        <span className="text-right">
                                            <span
                                                className={
                                                    comparaciones.reduce((sum, comp) => {
                                                        const tasaCambio = comp.tasa_cambio || 1;
                                                        return sum + comp.diferencia / tasaCambio;
                                                    }, 0) >= 0
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-red-600 dark:text-red-400'
                                                }
                                            >
                                                {comparaciones.reduce((sum, comp) => {
                                                    const tasaCambio = comp.tasa_cambio || 1;
                                                    return sum + comp.diferencia / tasaCambio;
                                                }, 0) >= 0
                                                    ? '+'
                                                    : ''}
                                                {comparaciones
                                                    .reduce((sum, comp) => {
                                                        const tasaCambio = comp.tasa_cambio || 1;
                                                        return sum + comp.diferencia / tasaCambio;
                                                    }, 0)
                                                    .toLocaleString('es-ES', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}{' '}
                                                USD
                                            </span>
                                        </span>
                                        <span className="text-right">
                                            <span
                                                className={
                                                    comparaciones.reduce((sum, comp) => sum + comp.porcentaje_cambio, 0) / comparaciones.length >= 0
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-red-600 dark:text-red-400'
                                                }
                                            >
                                                {comparaciones.reduce((sum, comp) => sum + comp.porcentaje_cambio, 0) / comparaciones.length >= 0
                                                    ? '+'
                                                    : ''}
                                                {(
                                                    comparaciones.reduce((sum, comp) => sum + comp.porcentaje_cambio, 0) / comparaciones.length
                                                ).toFixed(2)}
                                                %
                                            </span>
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Sección de Monedas - Información de Tasas de Cambio */}
                <div className="animate__animated animate__fadeIn">
                    <Card>
                        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                            <div className="grid flex-1 gap-1 text-center sm:text-left">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-green-600" />
                                    <CardTitle>Información de Monedas</CardTitle>
                                </div>
                                <CardDescription>Tasas de cambio y comisiones disponibles en el sistema</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {isLoadingMonedas ? (
                                <div className="flex h-[300px] items-center justify-center text-center">Cargando datos de monedas...</div>
                            ) : monedas.length > 0 ? (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {monedas.map((moneda) => (
                                        <div
                                            key={moneda.id}
                                            className={`rounded-lg border p-4 transition-all hover:shadow-md ${
                                                moneda.principal
                                                    ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950'
                                                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                                            }`}
                                        >
                                            {/* Header con símbolo y código */}
                                            <div className="mb-3 flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                                                        <span className="text-xl font-bold text-blue-600 dark:text-blue-300">
                                                            {moneda.simbolo_moneda}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900 dark:text-white">{moneda.nombre_moneda}</h3>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">{moneda.codigo_moneda}</p>
                                                    </div>
                                                </div>
                                                {moneda.principal && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                                        <TrendingUp className="h-3 w-3" />
                                                        Principal
                                                    </span>
                                                )}
                                            </div>

                                            {/* Información de tasas */}
                                            <div className="space-y-2 border-t pt-3 dark:border-gray-700">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">Tasa de Cambio:</span>
                                                    <span className="font-semibold text-gray-900 dark:text-white">
                                                        {moneda.tasa_cambio.toLocaleString('es-ES', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 6,
                                                        })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">Comisión:</span>
                                                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                                                        {moneda.commission.toLocaleString('es-ES', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 4,
                                                        })}
                                                        %
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex h-[300px] items-center justify-center text-center">
                                    No hay monedas disponibles en el sistema.
                                </div>
                            )}
                        </CardContent>
                    </Card>
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

                {/* Sección de Historial de Cambios de Tasa - Solo Admin y Moderador */}
                {(userRole === 'admin' || userRole === 'moderador') && (
                    <div className="animate__animated animate__fadeIn">
                        <Card>
                            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                                <div className="grid flex-1 gap-1 text-center sm:text-left">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-orange-600" />
                                        <CardTitle>Historial de Cambios de Tasa</CardTitle>
                                    </div>
                                    <CardDescription>Impacto financiero generado por cambios en tasas de cambio</CardDescription>
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
                                                    <TrendingUp className="h-4 w-4 text-red-600" />
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

                {/* Tabla de Estados Financieros */}
                <div>
                    <Card className="border-sidebar-border dark:border-sidebar-border">
                        <CardHeader className="border-b-sidebar-border dark:border-b-sidebar-border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        Estados Financieros
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        {userRole === 'vendedor' ? 'Mis Cuentas Asignadas' : 'Cuentas por Moneda y Usuarios Asignados'}
                                    </CardDescription>
                                </div>
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
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {isLoadingFinancial ? (
                                <div className="flex h-[300px] items-center justify-center text-center">Cargando datos financieros...</div>
                            ) : estadosFinancieros.length > 0 ? (
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
                                            {estadosFinancieros.map((estado) => {
                                                // Determinar color basado en el nombre de la cuenta o el tipo
                                                const getColorClass = () => {
                                                    if (
                                                        estado.nombre_cuenta.toLowerCase().includes('efectivo') ||
                                                        estado.nombre_cuenta.toLowerCase().includes('cash')
                                                    ) {
                                                        return 'bg-amber-100 dark:bg-amber-900/50';
                                                    } else if (estado.nombre_cuenta.toLowerCase().includes('banco')) {
                                                        return 'bg-blue-100 dark:bg-blue-900/50';
                                                    } else if (
                                                        estado.nombre_cuenta.toLowerCase().includes('tarjeta') ||
                                                        estado.nombre_cuenta.toLowerCase().includes('card')
                                                    ) {
                                                        return 'bg-green-100 dark:bg-green-900/50';
                                                    } else if (
                                                        estado.nombre_cuenta.toLowerCase().includes('digital') ||
                                                        estado.nombre_cuenta.toLowerCase().includes('paypal') ||
                                                        estado.nombre_cuenta.toLowerCase().includes('zelle')
                                                    ) {
                                                        return 'bg-purple-100 dark:bg-purple-900/50';
                                                    } else if (estado.tipo_cuenta === 'permanentes') {
                                                        return 'bg-sky-100 dark:bg-sky-900/50';
                                                    } else if (estado.tipo_cuenta === 'temporales') {
                                                        return 'bg-emerald-100 dark:bg-emerald-900/50';
                                                    } else {
                                                        return 'bg-gray-100 dark:bg-gray-700';
                                                    }
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
                                                                <span className="text-muted-foreground text-sm">{estado.moneda.codigo_moneda}</span>
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
