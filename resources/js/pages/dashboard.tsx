import { CountingNumber } from '@/components/animated/counter-number';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { CursorFollow, CursorProvider } from '@/components/ui/cursor';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { ScrollProgress } from '@/components/ui/scroll';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ComputerIcon, DiamondPercent, LucideBaggageClaim, LucideBoomBox, LucideClockArrowDown, MonitorCog, ShoppingBagIcon } from 'lucide-react';
import { useState } from 'react';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const chartData = [
    { date: '2024-04-01', desktop: 222, mobile: 150 },
    { date: '2024-04-02', desktop: 97, mobile: 180 },
    { date: '2024-04-03', desktop: 167, mobile: 120 },
    { date: '2024-04-04', desktop: 242, mobile: 260 },
    { date: '2024-04-05', desktop: 373, mobile: 290 },
    { date: '2024-04-06', desktop: 301, mobile: 340 },
    { date: '2024-04-07', desktop: 245, mobile: 180 },
    { date: '2024-04-08', desktop: 409, mobile: 320 },
    { date: '2024-04-09', desktop: 59, mobile: 110 },
    { date: '2024-04-10', desktop: 261, mobile: 190 },
    { date: '2024-04-11', desktop: 327, mobile: 350 },
    { date: '2024-04-12', desktop: 292, mobile: 210 },
    { date: '2024-04-13', desktop: 342, mobile: 380 },
    { date: '2024-04-14', desktop: 137, mobile: 220 },
    { date: '2024-04-15', desktop: 120, mobile: 170 },
    { date: '2024-04-16', desktop: 138, mobile: 190 },
    { date: '2024-04-17', desktop: 446, mobile: 360 },
    { date: '2024-04-18', desktop: 364, mobile: 410 },
    { date: '2024-04-19', desktop: 243, mobile: 180 },
    { date: '2024-04-20', desktop: 89, mobile: 150 },
    { date: '2024-04-21', desktop: 137, mobile: 200 },
    { date: '2024-04-22', desktop: 224, mobile: 170 },
    { date: '2024-04-23', desktop: 138, mobile: 230 },
    { date: '2024-04-24', desktop: 387, mobile: 290 },
    { date: '2024-04-25', desktop: 215, mobile: 250 },
    { date: '2024-04-26', desktop: 75, mobile: 130 },
    { date: '2024-04-27', desktop: 383, mobile: 420 },
    { date: '2024-04-28', desktop: 122, mobile: 180 },
    { date: '2024-04-29', desktop: 315, mobile: 240 },
    { date: '2024-04-30', desktop: 454, mobile: 380 },
    { date: '2024-05-01', desktop: 165, mobile: 220 },
    { date: '2024-05-02', desktop: 293, mobile: 310 },
    { date: '2024-05-03', desktop: 247, mobile: 190 },
    { date: '2024-05-04', desktop: 385, mobile: 420 },
    { date: '2024-05-05', desktop: 481, mobile: 390 },
    { date: '2024-05-06', desktop: 498, mobile: 520 },
    { date: '2024-05-07', desktop: 388, mobile: 300 },
    { date: '2024-05-08', desktop: 149, mobile: 210 },
    { date: '2024-05-09', desktop: 227, mobile: 180 },
    { date: '2024-05-10', desktop: 293, mobile: 330 },
    { date: '2024-05-11', desktop: 335, mobile: 270 },
    { date: '2024-05-12', desktop: 197, mobile: 240 },
    { date: '2024-05-13', desktop: 197, mobile: 160 },
    { date: '2024-05-14', desktop: 448, mobile: 490 },
    { date: '2024-05-15', desktop: 473, mobile: 380 },
    { date: '2024-05-16', desktop: 338, mobile: 400 },
    { date: '2024-05-17', desktop: 499, mobile: 420 },
    { date: '2024-05-18', desktop: 315, mobile: 350 },
    { date: '2024-05-19', desktop: 235, mobile: 180 },
    { date: '2024-05-20', desktop: 177, mobile: 230 },
    { date: '2024-05-21', desktop: 82, mobile: 140 },
    { date: '2024-05-22', desktop: 81, mobile: 120 },
    { date: '2024-05-23', desktop: 252, mobile: 290 },
    { date: '2024-05-24', desktop: 294, mobile: 220 },
    { date: '2024-05-25', desktop: 201, mobile: 250 },
    { date: '2024-05-26', desktop: 213, mobile: 170 },
    { date: '2024-05-27', desktop: 420, mobile: 460 },
    { date: '2024-05-28', desktop: 233, mobile: 190 },
    { date: '2024-05-29', desktop: 78, mobile: 130 },
    { date: '2024-05-30', desktop: 340, mobile: 280 },
    { date: '2024-05-31', desktop: 178, mobile: 230 },
    { date: '2024-06-01', desktop: 178, mobile: 200 },
    { date: '2024-06-02', desktop: 470, mobile: 410 },
    { date: '2024-06-03', desktop: 103, mobile: 160 },
    { date: '2024-06-04', desktop: 439, mobile: 380 },
    { date: '2024-06-05', desktop: 88, mobile: 140 },
    { date: '2024-06-06', desktop: 294, mobile: 250 },
    { date: '2024-06-07', desktop: 323, mobile: 370 },
    { date: '2024-06-08', desktop: 385, mobile: 320 },
    { date: '2024-06-09', desktop: 438, mobile: 480 },
    { date: '2024-06-10', desktop: 155, mobile: 200 },
    { date: '2024-06-11', desktop: 92, mobile: 150 },
    { date: '2024-06-12', desktop: 492, mobile: 420 },
    { date: '2024-06-13', desktop: 81, mobile: 130 },
    { date: '2024-06-14', desktop: 426, mobile: 380 },
    { date: '2024-06-15', desktop: 307, mobile: 350 },
    { date: '2024-06-16', desktop: 371, mobile: 310 },
    { date: '2024-06-17', desktop: 475, mobile: 520 },
    { date: '2024-06-18', desktop: 107, mobile: 170 },
    { date: '2024-06-19', desktop: 341, mobile: 290 },
    { date: '2024-06-20', desktop: 408, mobile: 450 },
    { date: '2024-06-21', desktop: 169, mobile: 210 },
    { date: '2024-06-22', desktop: 317, mobile: 270 },
    { date: '2024-06-23', desktop: 480, mobile: 530 },
    { date: '2024-06-24', desktop: 132, mobile: 180 },
    { date: '2024-06-25', desktop: 141, mobile: 190 },
    { date: '2024-06-26', desktop: 434, mobile: 380 },
    { date: '2024-06-27', desktop: 448, mobile: 490 },
    { date: '2024-06-28', desktop: 149, mobile: 200 },
    { date: '2024-06-29', desktop: 103, mobile: 160 },
    { date: '2024-06-30', desktop: 446, mobile: 400 },
];

const chartConfig = {
    visitors: {
        label: 'Reportes',
    },
    desktop: {
        label: 'Ventas',
        color: '#16a34a',
    },
    mobile: {
        label: 'Compras',
        color: '#ec4899',
    },
} satisfies ChartConfig;

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Opciones Generales',
        href: '/dashboard',
    },
];

export default function Dashboard({
    tasa,
    tasamlc,
    montoCUP,
    montoUSD,
    montoEUR,
    montoMLC,
    capital,
}: {
    tasa: { tasa_cambio: number };
    tasamlc: { tasa_mlc: number | string };
    montoCUP: number;
    montoUSD: number;
    montoEUR: number;
    montoMLC: number;
    capital: number;
}) {
    const { data, setData, post, processing } = useForm({
        tasa_cambio: tasa.tasa_cambio,
    });

    const {
        data: dataMLC,
        setData: setDataMLC,
        post: postMLC,
        processing: processingMLC,
    } = useForm({
        tasa_mlc: typeof tasamlc.tasa_mlc === 'string' ? parseFloat(tasamlc.tasa_mlc) || 1 : tasamlc.tasa_mlc,
    });

    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogOpenMLC, setDialogOpenMLC] = useState(false);

    const handleUpdate = () => {
        post(route('dashboard.update'), {
            onSuccess: () => {
                setDialogOpen(false);
            },
        });
    };

    const handleUpdateMLC = () => {
        postMLC(route('dashboard.update-mlc'), {
            onSuccess: () => {
                setDialogOpenMLC(false);
            },
        });
    };

    const [timeRange, setTimeRange] = React.useState('90d');

    const filteredData = chartData.filter((item) => {
        const date = new Date(item.date);
        const referenceDate = new Date('2024-06-30');
        let daysToSubtract = 90;
        if (timeRange === '30d') {
            daysToSubtract = 30;
        } else if (timeRange === '7d') {
            daysToSubtract = 7;
        }
        const startDate = new Date(referenceDate);
        startDate.setDate(startDate.getDate() - daysToSubtract);
        return date >= startDate;
    });

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

                {/* Opciones */}
                <div className="animate__animated animate__flipInX grid auto-rows-min gap-4 md:grid-cols-4">
                    {/* Widget de Compra */}
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
                    {/* Widget de Venta */}
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
                    {/* Widget de Transacciones */}
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
                    {/* Widget de Remesas */}
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
                {/* Tablas */}
                <div className="grid grid-cols-2 grid-rows-1 gap-6">
                    <div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="bg-sidebar text-white">DESCRIPCION</TableHead>
                                    <TableHead className="bg-sidebar text-white">MONTO</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell>CAPITAL</TableCell>
                                    <TableCell className="cursor-pointer">
                                        <CountingNumber
                                            decimalPlaces={2}
                                            decimalSeparator=","
                                            className="text-sidebar-accent"
                                            inView
                                            number={capital}
                                        />
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>CUP CAJA</TableCell>
                                    <TableCell className="cursor-pointer">
                                        <CountingNumber decimalPlaces={2} decimalSeparator="," className="text-indigo-600" inView number={montoCUP} />
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>USD CAJA</TableCell>
                                    <TableCell className="cursor-pointer">
                                        <CountingNumber
                                            decimalPlaces={2}
                                            decimalSeparator=","
                                            className="text-emerald-600"
                                            inView
                                            number={montoUSD}
                                        />
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>EURO CAJA</TableCell>
                                    <TableCell className="cursor-pointer">
                                        <CountingNumber decimalPlaces={2} decimalSeparator="," className="text-amber-600" inView number={montoEUR} />
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>MLC CAJA</TableCell>
                                    <TableCell className="cursor-pointer">
                                        <CountingNumber decimalPlaces={2} decimalSeparator="," className="text-red-600" inView number={montoMLC} />
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                    <div>
                        <Table>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="bg-sidebar text-white">TOTAL</TableCell>
                                    <TableCell>$ 199559</TableCell>
                                    <TableCell>$ 248 </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>MES ANTERIOR</TableCell>
                                    <TableCell>$ 190382</TableCell>
                                    <TableCell>$ 9117</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>TOTAL USD ACTIVO</TableCell>
                                    <TableCell colSpan={2} className="bg-emerald-600 text-center text-white">
                                        $ 195193
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>FONDO CUP ACTIVO</TableCell>
                                    <TableCell colSpan={2} className="bg-yellow-800 text-center text-white">
                                        $ 1 440734
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="bg-emerald-800 text-white" colSpan={2}>
                                        TASA CAMBIO PARA USD
                                    </TableCell>
                                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                                        <DialogTrigger asChild>
                                            <TableCell className="cursor-pointer border-2 border-emerald-800 text-center font-bold">
                                                $ {tasa.tasa_cambio}
                                            </TableCell>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                            <DialogHeader>
                                                <DialogTitle>Tasa Cambio</DialogTitle>
                                                <DialogDescription>
                                                    Actualizar valor de la Tasa de Cambio para monedas CUP - Moneda Nacional
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4">
                                                <div className="grid gap-3">
                                                    <Label htmlFor="tasaCambio">Valor Actual a Cambiar</Label>
                                                    <Input
                                                        id="tasaCambio"
                                                        name="tasa_cambio"
                                                        type="number"
                                                        step="0.00000001"
                                                        placeholder="$ 0.00"
                                                        value={data.tasa_cambio || ''}
                                                        onChange={(e) => setData('tasa_cambio', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button className="cursor-pointer" variant="secondary">
                                                        Cancelar
                                                    </Button>
                                                </DialogClose>
                                                <Button className="cursor-pointer" type="button" disabled={processing} onClick={handleUpdate}>
                                                    {processing ? 'Guardando...' : 'Actualizar'}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={2} className="bg-yellow-900 text-white">
                                        TASA DE CAMBIO PARA MLC
                                    </TableCell>
                                    <Dialog open={dialogOpenMLC} onOpenChange={setDialogOpenMLC}>
                                        <DialogTrigger asChild>
                                            <TableCell className="cursor-pointer border-2 border-yellow-900 text-center font-bold">
                                                $ {tasamlc.tasa_mlc}
                                            </TableCell>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[425px]">
                                            <DialogHeader>
                                                <DialogTitle>Tasa Cambio MLC</DialogTitle>
                                                <DialogDescription>Actualizar valor de la Tasa de Cambio para MLC</DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4">
                                                <div className="grid gap-3">
                                                    <Label htmlFor="tasaMLC">Valor Actual a Cambiar</Label>
                                                    <Input
                                                        id="tasaMLC"
                                                        name="tasa_mlc"
                                                        type="number"
                                                        step="0.00000001"
                                                        placeholder="$ 0.00"
                                                        value={dataMLC.tasa_mlc || ''}
                                                        onChange={(e) => setDataMLC('tasa_mlc', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button className="cursor-pointer" variant="secondary">
                                                        Cancelar
                                                    </Button>
                                                </DialogClose>
                                                <Button className="cursor-pointer" type="button" disabled={processingMLC} onClick={handleUpdateMLC}>
                                                    {processingMLC ? 'Guardando...' : 'Actualizar'}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </TableRow>
                            </TableBody>
                        </Table>
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
                                    <SelectItem value="90d" className="rounded-lg">
                                        Ultimos 3 meses
                                    </SelectItem>
                                    <SelectItem value="30d" className="rounded-lg">
                                        Ultimos 30 dias
                                    </SelectItem>
                                    <SelectItem value="7d" className="rounded-lg">
                                        Ultimos 7 dias
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </CardHeader>
                        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                            <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                                <AreaChart data={filteredData}>
                                    <defs>
                                        <linearGradient id="fillDesktop" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-desktop)" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="var(--color-desktop)" stopOpacity={0.1} />
                                        </linearGradient>
                                        <linearGradient id="fillMobile" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-mobile)" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="var(--color-mobile)" stopOpacity={0.1} />
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
                                            return date.toLocaleDateString('en-US', {
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
                                                    return new Date(value).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    });
                                                }}
                                                indicator="dot"
                                            />
                                        }
                                    />
                                    <Area dataKey="mobile" type="natural" fill="url(#fillMobile)" stroke="var(--color-mobile)" stackId="a" />
                                    <Area dataKey="desktop" type="natural" fill="url(#fillDesktop)" stroke="var(--color-desktop)" stackId="a" />
                                    <ChartLegend content={<ChartLegendContent />} />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
                {/* Tablas */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                </div>
                <Toaster position="top-center" />
            </div>
        </AppLayout>
    );
}
