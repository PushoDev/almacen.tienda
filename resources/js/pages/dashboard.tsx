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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { ComprasVentasCharts } from '@/layouts/charts/ChartCompraVenta';
import WidgetInventario from '@/layouts/home/WidgetInventario';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ComputerIcon, DiamondPercent, LucideBaggageClaim, LucideClockArrowDown, ShoppingBagIcon } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Opciones Generales',
        href: '/dashboard',
    },
];

export default function Dashboard({ tasa }: { tasa: { tasa_cambio: number } }) {
    const { data, setData, post, processing } = useForm({
        tasa_cambio: tasa.tasa_cambio,
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
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamineto"
                    />
                    {/* Ícono semitransparente */}
                    <ComputerIcon
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* OPciones */}
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
                                {/* Link {route('comprar.index' */}
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
                    {/* Widget de Inventario */}
                    <div>
                        <WidgetInventario />
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
                                    <TableCell className="cursor-pointer">1</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>CUP CAJA</TableCell>
                                    <TableCell className="cursor-pointer">1</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>USD CAJA</TableCell>
                                    <TableCell className="cursor-pointer">1</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>EURO CAJA</TableCell>
                                    <TableCell className="cursor-pointer">1</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                    <div>
                        <Table>
                            <TableBody>
                                <TableRow>
                                    <TableCell>TOTAL</TableCell>
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
                                    <TableCell colSpan={2}>$ 195193</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell>FONDO CUP ACTIVO</TableCell>
                                    <TableCell colSpan={2}>$ 1 440734</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="bg-sidebar text-white" colSpan={2}>
                                        TASA CAMBIO GENERAL
                                    </TableCell>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <TableCell className="hover:bg-sidebar-accent cursor-pointer text-center text-emerald-400 hover:text-white">
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
                                                        value={data.tasa_cambio}
                                                        onChange={(e) => setData('tasa_cambio', parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button className="cursor-pointer" variant="outline">
                                                        Cancelar
                                                    </Button>
                                                </DialogClose>
                                                <Button
                                                    className="cursor-pointer"
                                                    type="button"
                                                    disabled={processing}
                                                    onClick={() => post(route('dashboard.update'))}
                                                >
                                                    {processing ? 'Guardando...' : 'Actualizar'}
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
                    <ComprasVentasCharts />
                </div>
                {/* Tablas */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                </div>
            </div>
        </AppLayout>
    );
}
