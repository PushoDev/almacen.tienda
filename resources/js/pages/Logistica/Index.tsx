import HeadingSmall from '@/components/heading-small';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { LogisticaProps, type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import {
    ChartPie,
    Handshake,
    Package,
    PackageOpen,
    PiggyBank,
    PlaneIcon,
    PlaneTakeoffIcon,
    SquareCheckBig,
    SquareCheckIcon,
    TrendingDownIcon,
    TrendingUpIcon,
} from 'lucide-react';
import { ComprasPorProveedorPie } from './layout/ComprasPorProveedorChart';
import { GastosMensualesChart } from './layout/GastosMensualesChart';
import { ProductosMasCompradosPie } from './layout/ProductosMasCompradosPie';
import { ProductosPorAlmacenCharts } from './layout/ProductosPorAlmacen';

import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MotionEffect } from '@/components/ui/motion-effect';
import { ScrollProgress } from '@/components/ui/scroll';
import { ComprasVentasCharts } from '@/layouts/charts/ChartCompraVenta';
import React from 'react';

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
    inversionTotal,
    totalCuentas,
    saldoCuentas,
    montoGeneralInvertido,
    deudaPendientes,
    deudaPendietesSaldo,
    gastosMensuales,
    productosTop,
    comprasPorProveedor,
    productosPorAlmacen,
}: LogisticaProps) {
    // Calendario
    const [date, setDate] = React.useState<Date | undefined>(new Date());
    // Vista Cliente
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Logistica" />
            <ScrollProgress />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
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
                <MotionEffect
                    slide={{
                        direction: 'down',
                    }}
                    fade
                    zoom
                    inView
                >
                    <div className="grid auto-rows-min gap-4 md:grid-cols-4">
                        <div className="@container/card col-span-3">
                            <ComprasVentasCharts />
                        </div>
                        <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border shadow" />
                        {/* Total Monto */}
                        <Card className="@container/card">
                            <CardHeader className="relative">
                                <CardDescription>Monto General</CardDescription>
                                <CardTitle className="text-2xl font-semibold text-emerald-500 tabular-nums @[250px]/card:text-3xl">
                                    $ {montoGeneralInvertido}.00
                                </CardTitle>
                                <div className="absolute top-4 right-4">
                                    <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
                                        <TrendingUpIcon className="size-3" />
                                        +12.5%
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardFooter className="flex-col items-start gap-1 text-sm">
                                <div className="line-clamp-1 flex gap-2 font-medium">
                                    Monto en Productos <TrendingUpIcon className="size-4" />
                                </div>
                                <div className="text-muted-foreground">Visitors for the last 6 months</div>
                            </CardFooter>
                        </Card>
                        {/* Total Inversion */}
                        <Card className="@container/card">
                            <CardHeader className="relative">
                                <CardDescription>Total Inversión</CardDescription>
                                <CardTitle className="text-2xl font-semibold text-emerald-500 tabular-nums @[250px]/card:text-3xl">
                                    $ {inversionTotal}
                                </CardTitle>
                                <div className="absolute top-4 right-4">
                                    <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
                                        <TrendingUpIcon className="size-3" />
                                        {totalProductos}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardFooter className="flex-col items-start gap-1 text-sm">
                                <div className="line-clamp-1 flex gap-2 font-medium">
                                    Monto en Productos <TrendingUpIcon className="size-4" />
                                </div>
                                <div className="text-muted-foreground">Visitors for the last 6 months</div>
                            </CardFooter>
                        </Card>
                        {/* Total Cuentas */}
                        <Card className="@container/card">
                            <CardHeader className="relative">
                                <CardDescription>Total Cuentas</CardDescription>
                                <CardTitle className="text-2xl font-semibold text-emerald-500 tabular-nums @[250px]/card:text-3xl">
                                    $ {saldoCuentas}.00
                                </CardTitle>
                                <div className="absolute top-4 right-4">
                                    <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
                                        <PiggyBank className="size-3" />
                                        {totalCuentas}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardFooter className="flex-col items-start gap-1 text-sm">
                                <div className="line-clamp-1 flex gap-2 font-medium">
                                    Monto en Productos <TrendingUpIcon className="size-4" />
                                </div>
                                <div className="text-muted-foreground">Visitors for the last 6 months</div>
                            </CardFooter>
                        </Card>
                        {/* Total Deudas */}
                        <Card className="@container/card">
                            <CardHeader className="relative">
                                <CardDescription>Deudas a Proveedor</CardDescription>
                                <CardTitle className="text-2xl font-semibold text-red-400 tabular-nums @[250px]/card:text-3xl">
                                    $ {deudaPendietesSaldo}
                                </CardTitle>
                                <div className="absolute top-4 right-4">
                                    <Badge variant="outline" className="flex gap-1 rounded-lg text-xs text-red-500">
                                        <TrendingDownIcon className="size-3" />
                                        {deudaPendientes}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardFooter className="flex-col items-start gap-1 text-sm">
                                <div className="line-clamp-1 flex gap-2 font-medium text-red-500">
                                    Monto de las Deudas <TrendingDownIcon className="size-4" />
                                </div>
                                <div className="text-muted-foreground">Monto y Cantidad</div>
                            </CardFooter>
                        </Card>
                        <Separator className="col-span-full my-4" />
                        {/* Productos */}
                        <Card className="@container/card">
                            <CardHeader className="relative">
                                <CardDescription>Productos</CardDescription>
                                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{totalProductos}</CardTitle>
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
                                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{totalProveedores}</CardTitle>
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
                                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{totalClientes}</CardTitle>
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
                                <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">{totalCategorias}</CardTitle>
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
                        {/* Chartjs */}
                        {/* Gastos Mensuales */}
                        <GastosMensualesChart data={gastosMensuales} />
                        {/* Productos Mas Comprados */}
                        <ProductosMasCompradosPie data={productosTop} />
                        {/* Compras por Proveedor */}
                        <ComprasPorProveedorPie data={comprasPorProveedor} />
                        {/* Productos por Almacen */}
                        <ProductosPorAlmacenCharts data={productosPorAlmacen} />
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
                </MotionEffect>

                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                </div>
            </div>
        </AppLayout>
    );
}
