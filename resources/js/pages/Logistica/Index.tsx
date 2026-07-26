import HeadingSmall from '@/components/heading-small';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { LogisticaProps, type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import {
    ChartPie,
    CheckCircle,
    Coffee,
    DollarSign,
    Handshake,
    Landmark,
    Package,
    PackageOpen,
    PiggyBank,
    PlaneIcon,
    PlaneTakeoffIcon,
    SquareCheckBig,
    SquareCheckIcon,
    TrendingDown,
    TrendingUp,
    Truck,
    Users,
    Wallet,
    XCircle,
} from 'lucide-react';
import { ComprasPorProveedorPie } from './layout/ComprasPorProveedorChart';
import { GastosMensualesChart } from './layout/GastosMensualesChart';
import { ProductosMasCompradosPie } from './layout/ProductosMasCompradosPie';
import { ProductosPorAlmacenCharts } from './layout/ProductosPorAlmacen';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollProgress } from '@/components/ui/scroll';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Logistica',
        href: '#',
    },
];

export default function LogisticaPage({
    totalCategorias,
    categoriasActivas,
    totalClientes,
    totalProveedores,
    totalProductos,
    totalUnidades,
    gastosMensuales,
    productosTop,
    comprasPorProveedor,
    productosPorAlmacen,
    balances,
    canViewFinance = true,
    resumenCuentas,
    resumenClientes,
    resumenProveedores,
}: LogisticaProps) {
    // Vista Cliente
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Logistica" />
            <ScrollProgress />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Logistica General del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento"
                    />
                    {/* Ícono semitransparente */}
                    <ChartPie
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                <div className="grid auto-rows-min gap-4 md:grid-cols-4">
                    {/* Cantidades por monedas - Solo si tiene permisos */}
                    {canViewFinance && balances && balances.length > 0 && (
                        <>
                            {balances.map((balance, index) => {
                                // Assign colors dynamically based on index or specific codes if desired
                                const colors = [
                                    { bg: 'bg-emerald-500', text: 'text-emerald-500', badge: 'text-emerald-400' },
                                    { bg: 'bg-amber-500', text: 'text-amber-500', badge: 'text-amber-400' },
                                    { bg: 'bg-indigo-500', text: 'text-indigo-500', badge: 'text-indigo-400' },
                                    { bg: 'bg-blue-500', text: 'text-blue-500', badge: 'text-blue-400' },
                                    { bg: 'bg-rose-500', text: 'text-rose-500', badge: 'text-rose-400' },
                                    { bg: 'bg-purple-500', text: 'text-purple-500', badge: 'text-purple-400' },
                                ];

                                // Cycle through colors if more currencies than defined colors
                                const color = colors[index % colors.length];

                                return (
                                    <Card key={balance.codigo} className="@container/card">
                                        <CardHeader className="relative">
                                            <div className={`rounded-lg ${color.bg} px-2 py-1 text-sm text-white shadow-lg`}>
                                                {balance.nombre} ({balance.codigo})
                                            </div>
                                            <CardDescription className={color.text}>{balance.nombre}</CardDescription>
                                            <CardTitle className={`text-2xl font-semibold ${color.text} tabular-nums @[250px]/card:text-3xl`}>
                                                {balance.simbolo}{' '}
                                                <span className="text-4xl">{Number(balance.saldo).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            </CardTitle>
                                            <div className="absolute top-4 right-4">
                                                <Badge variant="outline" className={`flex gap-1 rounded-lg text-xs ${color.badge}`}>
                                                    <Coffee className="size-3" />
                                                    Rate:{' '}
                                                    {Number(balance.tasa).toLocaleString('es-ES', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardFooter className="flex-col items-start gap-1 text-sm">
                                            <div className="line-clamp-1 flex gap-2 font-medium">Total {balance.codigo}</div>
                                            <div className="text-muted-foreground">Monto en las Cuentas</div>
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                        </>
                    )}

                    {/* Resumen de Cuentas */}
                    {canViewFinance && resumenCuentas && (
                        <Card className="col-span-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PiggyBank className="size-5 text-emerald-500" />
                                    Resumen de Cuentas
                                </CardTitle>
                                <CardDescription>Distribución general de todas las cuentas del sistema</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Row 1: KPIs */}
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                    <div className="rounded-lg border border-blue-500/20 bg-blue-50/50 p-4 dark:bg-blue-900/20">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Equivalente</p>
                                            <Wallet className="h-5 w-5 text-blue-500" />
                                        </div>
                                        <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-200">
                                            {resumenCuentas.moneda_principal.simbolo}: {resumenCuentas.total_saldo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xs text-blue-500 dark:text-blue-400">En {resumenCuentas.moneda_principal.codigo}</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-500/20 bg-slate-50/50 p-4 dark:bg-slate-900/20">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Cuentas</p>
                                            <Landmark className="h-5 w-5 text-slate-500" />
                                        </div>
                                        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-200">{resumenCuentas.total_cuentas}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{resumenCuentas.cuentas_con_deuda} con deuda</p>
                                    </div>
                                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-50/50 p-4 dark:bg-emerald-900/20">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Activas</p>
                                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                                        </div>
                                        <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-200">{resumenCuentas.cuentas_activas}</p>
                                        <p className="text-xs text-emerald-500 dark:text-emerald-400">{resumenCuentas.moneda_principal.simbolo}: {resumenCuentas.por_estado?.activa?.saldo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-500/20 bg-gray-50/50 p-4 dark:bg-gray-800/20">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inactivas</p>
                                            <XCircle className="h-5 w-5 text-gray-500" />
                                        </div>
                                        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-200">{resumenCuentas.cuentas_inactivas}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{resumenCuentas.moneda_principal.simbolo}: {resumenCuentas.por_estado?.inactiva?.saldo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
                                    </div>
                                </div>

                                {/* Row 2: Barras por tipo */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    {(['permanentes', 'temporales'] as const).map((tipo) => {
                                        const saldo = resumenCuentas.por_tipo[tipo] ?? 0;
                                        const cant = resumenCuentas.conteo_tipo[tipo] ?? 0;
                                        const total = resumenCuentas.total_saldo > 0 ? resumenCuentas.total_saldo : 1;
                                        const pctSaldo = (Math.abs(saldo) / total) * 100;
                                        const styles = tipo === 'permanentes'
                                            ? { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', bar: 'bg-emerald-500', label: 'Permanentes' }
                                            : { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', bar: 'bg-amber-500', label: 'Temporales' };
                                        return (
                                            <div key={tipo} className={`rounded-lg border p-4 shadow-sm ${styles.border} ${styles.bg}`}>
                                                <div className="mb-2 flex items-center justify-between">
                                                    <span className={`text-sm font-semibold ${styles.text}`}>{styles.label}</span>
                                                    <Badge variant="outline" className={`${styles.text} ${styles.border} text-xs`}>{cant} cuentas</Badge>
                                                </div>
                                                <p className={`text-2xl font-bold ${styles.text}`}>{resumenCuentas.moneda_principal.simbolo}: {Math.abs(saldo).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                    <div className={`h-full rounded-full transition-all duration-500 ${styles.bar}`} style={{ width: `${Math.min(pctSaldo, 100)}%` }} />
                                                </div>
                                                <p className="mt-1 text-right text-xs text-muted-foreground">{pctSaldo.toFixed(0)}% del saldo total</p>
                                            </div>
                                        );
                                    })}
                                    {/* Card de Deudas */}
                                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm dark:border-red-800 dark:bg-red-950/20">
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="text-sm font-semibold text-red-700 dark:text-red-300">Con Deuda</span>
                                            <Badge variant="outline" className="border-red-200 text-xs text-red-700 dark:border-red-800 dark:text-red-300">{resumenCuentas.cuentas_con_deuda} cuentas</Badge>
                                        </div>
                                        <p className="text-2xl font-bold text-red-700 dark:text-red-300">{resumenCuentas.moneda_principal.simbolo}: 0.00</p>
                                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                            <div className={`h-full rounded-full bg-red-500 transition-all duration-500`} style={{ width: `${resumenCuentas.total_cuentas > 0 ? (resumenCuentas.cuentas_con_deuda / resumenCuentas.total_cuentas) * 100 : 0}%` }} />
                                        </div>
                                        <p className="mt-1 text-right text-xs text-muted-foreground">{resumenCuentas.total_cuentas > 0 ? ((resumenCuentas.cuentas_con_deuda / resumenCuentas.total_cuentas) * 100).toFixed(0) : 0}% de las cuentas</p>
                                    </div>
                                </div>

                                {/* Row 3: Desglose por Moneda (solo permanentes) */}
                                {Object.keys(resumenCuentas.por_moneda_perm).length > 0 && (
                                    <>
                                        <Separator />
                                        <div>
                                            <h4 className="mb-3 text-sm font-medium text-muted-foreground">Desglose por Moneda (cuentas permanentes)</h4>
                                            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                                                {Object.entries(resumenCuentas.por_moneda_perm).map(([codigo, info]) => (
                                                    <div key={codigo} className="cursor-pointer rounded-lg border border-violet-500/20 bg-violet-50/50 p-4 shadow-sm transition-all hover:shadow-md dark:bg-violet-900/20">
                                                        <div className="mb-1 flex items-center justify-between">
                                                            <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">{codigo}</span>
                                                            <Badge variant="secondary" className="text-xs">{info.cantidad} {info.cantidad === 1 ? 'cuenta' : 'cuentas'}</Badge>
                                                        </div>
                                                        <p className="text-xl font-bold text-violet-800 dark:text-violet-200">
                                                            {info.simbolo}: {info.original.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Eq. {resumenCuentas.moneda_principal.simbolo}: {info.equivalente.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Resumen de Clientes */}
                    {canViewFinance && resumenClientes && (
                        <Card className="col-span-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Handshake className="size-5 text-blue-500" />
                                    Resumen de Clientes
                                </CardTitle>
                                <CardDescription>Distribución general de todos los clientes del sistema</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Row 1: KPIs */}
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                    <div className="rounded-lg border border-blue-500/20 bg-blue-50/50 p-4 dark:bg-blue-900/20">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Clientes</p>
                                            <Users className="h-5 w-5 text-blue-500" />
                                        </div>
                                        <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-200">{resumenClientes.total_clientes}</p>
                                        <p className="text-xs text-blue-500 dark:text-blue-400">Clientes registrados</p>
                                    </div>
                                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-50/50 p-4 dark:bg-emerald-900/20">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Fondo Total</p>
                                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                                        </div>
                                        <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-200">$: {resumenClientes.total_fondo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <p className="text-xs text-emerald-500 dark:text-emerald-400">Saldo a favor empresa</p>
                                    </div>
                                    <div className="rounded-lg border border-red-500/20 bg-red-50/50 p-4 dark:bg-red-900/20">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-red-600 dark:text-red-400">Deuda Total</p>
                                            <TrendingDown className="h-5 w-5 text-red-500" />
                                        </div>
                                        <p className="mt-1 text-2xl font-bold text-red-900 dark:text-red-200">$: {resumenClientes.total_deuda.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <p className="text-xs text-red-500 dark:text-red-400">Deuda pendiente</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-500/20 bg-slate-50/50 p-4 dark:bg-slate-900/20">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Balance Neto</p>
                                            <DollarSign className="h-5 w-5 text-slate-500" />
                                        </div>
                                        <p className={`mt-1 text-2xl font-bold ${resumenClientes.balance_neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            $: {resumenClientes.balance_neto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {resumenClientes.balance_neto >= 0 ? 'A favor empresa' : 'A favor clientes'}
                                        </p>
                                    </div>
                                </div>

                                {/* Row 2: Barras de estado */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    {(['fondo', 'deuda', 'neutro'] as const).map((estado) => {
                                        const data = resumenClientes.por_estado[estado];
                                        const total = resumenClientes.total_clientes;
                                        const pct = total > 0 ? (data.cantidad / total) * 100 : 0;
                                        const styles = estado === 'fondo'
                                            ? { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', bar: 'bg-emerald-500', label: 'Con Fondo' }
                                            : estado === 'deuda'
                                                ? { bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', bar: 'bg-red-500', label: 'En Deuda' }
                                                : { bg: 'bg-gray-50 dark:bg-gray-800/40', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700', bar: 'bg-gray-400', label: 'Neutro' };
                                        return (
                                            <div key={estado} className={`rounded-lg border p-4 shadow-sm ${styles.border} ${styles.bg}`}>
                                                <div className="mb-2 flex items-center justify-between">
                                                    <span className={`text-sm font-semibold ${styles.text}`}>{styles.label}</span>
                                                    <Badge variant="outline" className={`${styles.text} ${styles.border} text-xs`}>{data.cantidad} {data.cantidad === 1 ? 'cliente' : 'clientes'}</Badge>
                                                </div>
                                                <p className={`text-2xl font-bold ${styles.text}`}>
                                                    $: {data.saldo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                                <div className="mt-3 flex items-center gap-3">
                                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                        <div className={`h-full rounded-full transition-all duration-500 ${styles.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                                    </div>
                                                    <span className="text-xs font-medium tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Resumen de Proveedores */}
                    {canViewFinance && resumenProveedores && (
                        <Card className="col-span-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Handshake className="size-5 text-purple-500" />
                                    Resumen de Proveedores
                                </CardTitle>
                                <CardDescription>Distribución general de todos los proveedores del sistema</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Row 1: KPIs */}
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                    <div className="rounded-lg border border-purple-500/20 bg-purple-50/50 p-4 dark:bg-purple-900/20">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Proveedores</p>
                                            <Truck className="h-5 w-5 text-purple-500" />
                                        </div>
                                        <p className="mt-1 text-2xl font-bold text-purple-900 dark:text-purple-200">{resumenProveedores.total_proveedores}</p>
                                        <p className="text-xs text-purple-500 dark:text-purple-400">Proveedores registrados</p>
                                    </div>
                                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-50/50 p-4 dark:bg-emerald-900/20">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Fondo Total</p>
                                            <TrendingUp className="h-5 w-5 text-emerald-500" />
                                        </div>
                                        <p className="mt-1 text-2xl font-bold text-emerald-900 dark:text-emerald-200">$: {resumenProveedores.total_fondo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <p className="text-xs text-emerald-500 dark:text-emerald-400">Saldo a favor empresa</p>
                                    </div>
                                    <div className="rounded-lg border border-red-500/20 bg-red-50/50 p-4 dark:bg-red-900/20">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-red-600 dark:text-red-400">Deuda Total</p>
                                            <TrendingDown className="h-5 w-5 text-red-500" />
                                        </div>
                                        <p className="mt-1 text-2xl font-bold text-red-900 dark:text-red-200">$: {resumenProveedores.total_deuda.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                        <p className="text-xs text-red-500 dark:text-red-400">Deuda pendiente</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-500/20 bg-slate-50/50 p-4 dark:bg-slate-900/20">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Balance Neto</p>
                                            <DollarSign className="h-5 w-5 text-slate-500" />
                                        </div>
                                        <p className={`mt-1 text-2xl font-bold ${resumenProveedores.balance_neto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            $: {resumenProveedores.balance_neto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {resumenProveedores.balance_neto >= 0 ? 'A favor empresa' : 'A favor proveedores'}
                                        </p>
                                    </div>
                                </div>

                                {/* Row 2: Barras de estado */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    {(['fondo', 'deuda', 'neutro'] as const).map((estado) => {
                                        const data = resumenProveedores.por_estado[estado];
                                        const total = resumenProveedores.total_proveedores;
                                        const pct = total > 0 ? (data.cantidad / total) * 100 : 0;
                                        const styles = estado === 'fondo'
                                            ? { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', bar: 'bg-emerald-500', label: 'Con Fondo' }
                                            : estado === 'deuda'
                                                ? { bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800', bar: 'bg-red-500', label: 'En Deuda' }
                                                : { bg: 'bg-gray-50 dark:bg-gray-800/40', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700', bar: 'bg-gray-400', label: 'Neutro' };
                                        return (
                                            <div key={estado} className={`rounded-lg border p-4 shadow-sm ${styles.border} ${styles.bg}`}>
                                                <div className="mb-2 flex items-center justify-between">
                                                    <span className={`text-sm font-semibold ${styles.text}`}>{styles.label}</span>
                                                    <Badge variant="outline" className={`${styles.text} ${styles.border} text-xs`}>{data.cantidad} {data.cantidad === 1 ? 'proveedor' : 'proveedores'}</Badge>
                                                </div>
                                                <p className={`text-2xl font-bold ${styles.text}`}>
                                                    $: {data.saldo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                                <div className="mt-3 flex items-center gap-3">
                                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                        <div className={`h-full rounded-full transition-all duration-500 ${styles.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                                    </div>
                                                    <span className="text-xs font-medium tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Separator className="col-span-full my-4" />
                    {/* Productos */}
                    <Card className="@container/card">
                        <CardHeader className="relative">
                            <CardDescription>Productos</CardDescription>
                            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                <span className="text-4xl">{totalProductos}</span>
                            </CardTitle>
                            <div className="absolute top-4 right-4">
                                <Badge variant="outline" className="flex gap-1 rounded-lg text-xs text-amber-600">
                                    <PackageOpen className="size-3" />
                                    {totalUnidades} Unidades
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardFooter className="flex-col items-start gap-1 text-sm">
                            <div className="line-clamp-1 flex gap-2 font-medium">
                                Todos los Producto <Package className="size-4" />
                            </div>
                            <div className="text-muted-foreground">Todos distribuidos en los almacenes</div>
                        </CardFooter>
                    </Card>
                    {/* Proveedores */}
                    <Card className="@container/card">
                        <CardHeader className="relative">
                            <CardDescription>Proveedores</CardDescription>
                            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                <span className="text-4xl">{totalProveedores}</span>
                            </CardTitle>
                            <div className="absolute top-4 right-4">
                                <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
                                    <PlaneTakeoffIcon className="size-3" />
                                    {totalProveedores}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardFooter className="flex-col items-start gap-1 text-sm">
                            <div className="line-clamp-1 flex gap-2 font-medium">
                                Todos Adquiridos <PlaneIcon className="size-4" />
                            </div>
                            <div className="text-muted-foreground">Adquirir Productos</div>
                        </CardFooter>
                    </Card>
                    {/* Clientes */}
                    <Card className="@container/card">
                        <CardHeader className="relative">
                            <CardDescription>Clientes</CardDescription>
                            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                <span className="text-4xl">{totalClientes}</span>
                            </CardTitle>
                            <div className="absolute top-4 right-4">
                                <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
                                    <Handshake className="size-3" />
                                    +12.5%
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardFooter className="flex-col items-start gap-1 text-sm">
                            <div className="line-clamp-1 flex gap-2 font-medium">
                                Strong user retention <Handshake className="size-4" />
                            </div>
                            <div className="text-muted-foreground">Engagement exceed targets</div>
                        </CardFooter>
                    </Card>
                    {/* Categorias */}
                    <Card className="@container/card">
                        <CardHeader className="relative">
                            <CardDescription>Categorias</CardDescription>
                            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                {' '}
                                <span className="text-4xl">{totalCategorias}</span>
                            </CardTitle>
                            <div className="absolute top-4 right-4">
                                <Badge variant="outline" className="flex gap-1 rounded-lg text-xs text-emerald-500">
                                    <SquareCheckBig className="size-3" />
                                    {categoriasActivas}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardFooter className="flex-col items-start gap-1 text-sm">
                            <div className="line-clamp-1 flex gap-2 font-medium">
                                Steady performance <SquareCheckIcon className="size-4" />
                            </div>
                            <div className="text-muted-foreground">Meets growth projections</div>
                        </CardFooter>
                    </Card>
                    <Separator className="col-span-full my-4" />
                    {/* Chartjs - Only if authorized */}
                    {canViewFinance && (
                        <>
                            {/* Gastos Mensuales */}
                            <GastosMensualesChart data={gastosMensuales} />
                            {/* Productos Mas Comprados */}
                            <ProductosMasCompradosPie data={productosTop} />
                            {/* Compras por Proveedor */}
                            <ComprasPorProveedorPie data={comprasPorProveedor} />
                            {/* Productos por Almacen */}
                            <ProductosPorAlmacenCharts data={productosPorAlmacen} />
                        </>
                    )}
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border">
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                </div>

                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                </div>
            </div>
        </AppLayout>
    );
}
