import HeadingSmall from '@/components/heading-small';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { LogisticaProps, type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    ChartPie,
    CheckCircle,
    DollarSign,
    Handshake,
    Landmark,
    Package,
    PackageOpen,
    PiggyBank,
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
    canViewFinance = true,
    resumenCuentas,
    resumenClientes,
    resumenProveedores,
    resumenProductos,
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
                    {/* Capitales Financieros */}
                    {canViewFinance && (
                        <>
                            <Card className="@container/card border-emerald-500/30">
                                <CardHeader className="pb-2">
                                    <CardDescription className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                        Capital Financiero
                                    </CardDescription>
                                    <CardTitle className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                        {(resumenCuentas?.total_saldo ?? 0) === 0
                                            ? '0.00'
                                            : (resumenCuentas?.total_saldo ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                        }
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">Capital Financiero (CUP → USD)</p>
                                </CardContent>
                            </Card>

                            <Card className="@container/card border-amber-500/30">
                                <CardHeader className="pb-2">
                                    <CardDescription className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                        Capital USD
                                    </CardDescription>
                                    <CardTitle className="text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                                        850,000.00
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">Capital en Dólares Americanos</p>
                                </CardContent>
                            </Card>

                            <Card className="@container/card border-indigo-500/30">
                                <CardHeader className="pb-2">
                                    <CardDescription className="text-xs font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                        Capital CUP
                                    </CardDescription>
                                    <CardTitle className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                                        25,000,000.00
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">Capital en Pesos Cubanos</p>
                                </CardContent>
                            </Card>

                            <Card className="@container/card border-blue-500/30">
                                <CardHeader className="pb-2">
                                    <CardDescription className="text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                        Capital EUR
                                    </CardDescription>
                                    <CardTitle className="text-3xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                                        120,000.00
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">Capital en Euros</p>
                                </CardContent>
                            </Card>
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
                                        <p className="text-2xl font-bold text-red-700 dark:text-red-300">{resumenCuentas.moneda_principal.simbolo}: {Math.abs(resumenCuentas.cuentas_deuda_saldo ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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

                                {/* Row 4: Desglose por Tipo + Moneda (Efectivo / Tarjeta) */}
                                {resumenCuentas.por_tipo_moneda && Object.keys(resumenCuentas.por_tipo_moneda).length > 0 && (
                                    <>
                                        <Separator />
                                        <div>
                                            <h4 className="mb-3 text-sm font-medium text-muted-foreground">Desglose por Tipo de Cuenta y Moneda</h4>
                                            <div className="grid gap-6 md:grid-cols-2">
                                                {(['efectivo', 'tarjeta'] as const).map((tipo) => {
                                                    const monedas = resumenCuentas.por_tipo_moneda[tipo];
                                                    if (!monedas || Object.keys(monedas).length === 0) return null;
                                                    const tipoStyles = tipo === 'efectivo'
                                                        ? { bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', icon: '💰' }
                                                        : { bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', icon: '💳' };
                                                    return (
                                                        <div key={tipo} className={`rounded-lg border p-4 ${tipoStyles.border} ${tipoStyles.bg}`}>
                                                            <div className="mb-3 flex items-center gap-2">
                                                                <span className="text-lg">{tipoStyles.icon}</span>
                                                                <span className={`text-sm font-semibold uppercase ${tipoStyles.text}`}>{tipo}</span>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {Object.entries(monedas).map(([codigo, info]) => (
                                                                    <div key={codigo} className="flex items-center justify-between rounded-md bg-white/60 p-3 dark:bg-gray-800/40">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-medium text-muted-foreground">{codigo}</span>
                                                                            <span className="text-sm font-semibold">
                                                                                {info.simbolo}: {info.original.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <Badge variant="outline" className="text-xs">{info.cantidad} {info.cantidad === 1 ? 'cuenta' : 'cuentas'}</Badge>
                                                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                                                Eq. {info.equivalente.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
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

                    {/* Resumen de Productos */}
                    {canViewFinance && resumenProductos && (
                        <Card className="col-span-full">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="size-5 text-cyan-500" />
                                    Resumen de Productos
                                </CardTitle>
                                <CardDescription>Distribución general de todos los productos del sistema</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Row 1: KPIs */}
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                    <div className="rounded-lg border border-cyan-500/20 bg-cyan-50/50 p-4 dark:bg-cyan-900/20">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">Total Productos</p>
                                            <Package className="h-5 w-5 text-cyan-500" />
                                        </div>
                                        <p className="mt-1 text-2xl font-bold text-cyan-900 dark:text-cyan-200">{resumenProductos.total_productos}</p>
                                        <p className="text-xs text-cyan-500 dark:text-cyan-400">Productos registrados</p>
                                    </div>
                                    <div className="rounded-lg border border-slate-500/20 bg-slate-50/50 p-4 dark:bg-slate-900/20">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Unidades</p>
                                            <PackageOpen className="h-5 w-5 text-slate-500" />
                                        </div>
                                        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-200">{resumenProductos.total_unidades.toLocaleString('es-ES')}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Stock agregado</p>
                                    </div>
                                    <div className="rounded-lg border border-green-500/20 bg-green-50/50 p-4 dark:bg-green-900/20">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-green-600 dark:text-green-400">Valor Total</p>
                                            <DollarSign className="h-5 w-5 text-green-500" />
                                        </div>
                                        <p className="mt-1 text-2xl font-bold text-green-900 dark:text-green-200">
                                            $: {resumenProductos.total_importe_global.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-xs text-green-500 dark:text-green-400">Costo total del inventario</p>
                                    </div>
                                    <div className="rounded-lg border border-amber-500/20 bg-amber-50/50 p-4 dark:bg-amber-900/20">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Stock Bajo</p>
                                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                                        </div>
                                        <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-200">{resumenProductos.productos_stock_bajo}</p>
                                        <p className="text-xs text-amber-500 dark:text-amber-400">
                                            $: {resumenProductos.valor_stock_bajo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>

                                {/* Row 2: Barras por stock */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    {(['con_stock', 'stock_bajo', 'sin_stock'] as const).map((grupo) => {
                                        const data = resumenProductos.por_stock[grupo];
                                        const total = resumenProductos.total_productos;
                                        const pct = total > 0 ? (data.cantidad / total) * 100 : 0;
                                        const styles = grupo === 'con_stock'
                                            ? { bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', bar: 'bg-emerald-500', label: 'Con Stock' }
                                            : grupo === 'stock_bajo'
                                                ? { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800', bar: 'bg-amber-500', label: 'Stock Bajo' }
                                                : { bg: 'bg-gray-50 dark:bg-gray-800/40', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700', bar: 'bg-gray-400', label: 'Sin Stock' };
                                        return (
                                            <div key={grupo} className={`rounded-lg border p-4 shadow-sm ${styles.border} ${styles.bg}`}>
                                                <div className="mb-2 flex items-center justify-between">
                                                    <span className={`text-sm font-semibold ${styles.text}`}>{styles.label}</span>
                                                    <Badge variant="outline" className={`${styles.text} ${styles.border} text-xs`}>{data.cantidad} {data.cantidad === 1 ? 'producto' : 'productos'}</Badge>
                                                </div>
                                                <p className={`text-2xl font-bold ${styles.text}`}>
                                                    {data.unidades.toLocaleString('es-ES')} {data.unidades === 1 ? 'unidad' : 'unidades'}
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
