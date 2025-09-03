import AppLogoIcon from '@/components/app-logo-icon';
import HeadingSmall from '@/components/heading-small';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Calendar, CreditCard, DollarSign, FileText, Package, Printer, ShoppingBag, Store, User, UserCheck } from 'lucide-react';

// Rutas breadcrumb
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Productos',
        href: '/productos',
    },
    {
        title: 'Ventas',
        href: '/punto-venta',
    },
    {
        title: 'Detalle de Venta',
        href: '#',
    },
];

// Interfaces para tipar los datos de la venta
interface Producto {
    id: number;
    nombre: string;
    marca: string;
    categoria: string;
}

interface Item {
    producto: Producto;
    cantidad: number;
    precio_venta: number;
    subtotal: number;
}

interface Pago {
    metodo: string;
    moneda: string;
    monto: number;
    via: string;
    tasa_cambio: number;
    monto_usd: number;
}

interface Cliente {
    id: number;
    nombre: string;
}

interface Almacen {
    id: number;
    nombre: string;
}

interface Usuario {
    id: number;
    nombre: string;
    email: string;
    rol: string;
}

interface Venta {
    id: number;
    almacen: Almacen;
    cliente: Cliente | null;
    items: Item[];
    total: number;
    fecha: string;
    usuario: Usuario;
    pagos: Pago[];
    total_pagado: number;
    restante: number;
    tasa_usd_utilizada: number;
    tasa_mlc_utilizada: number;
}

interface Props {
    venta: Venta;
}

export default function ResultadoCarrito({ venta }: Props) {
    // Formatear fechas
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Formatear moneda
    const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
        }).format(amount);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Detalle de Venta #${venta.id}`} />

            {/* Contenedor principal */}
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title={`Detalle de Venta #${venta.id}`} description="Resumen completo de la venta procesada" />
                    <ShoppingBag
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator />

                <div className="flex justify-end gap-2">
                    <Link
                        href="/ventas"
                        className="focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                        Ver Todas las Ventas
                    </Link>
                    {/* Exportar PDF */}
                    <Link href="#">
                        <Button variant="outline" className="hover:bg-chart-5 flex cursor-pointer items-center gap-2">
                            <FileText size={16} />
                            Exportar PDF
                        </Button>
                    </Link>

                    {/* Botón Imprimir */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="secondary" className="hover:bg-chart-2 flex cursor-pointer items-center gap-2">
                                <Printer size={16} />
                                Imprimir Reporte
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-3xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    <div className="flex items-center justify-center">
                                        <AppLogoIcon />
                                    </div>
                                </AlertDialogTitle>
                            </AlertDialogHeader>
                            <Separator />
                            <Separator />
                            <Separator />
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-destructive hover:bg-destructive-foreground cursor-pointer text-white">
                                    Cancelar
                                </AlertDialogCancel>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

                {/* Información general de la venta */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Calendar className="text-muted-foreground h-5 w-5" />
                            <h3 className="font-semibold">Fecha y Hora</h3>
                        </div>
                        <p className="mt-2 text-sm">{formatDate(venta.fecha)}</p>
                    </div>

                    <div className="bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Store className="text-muted-foreground h-5 w-5" />
                            <h3 className="font-semibold">Almacén</h3>
                        </div>
                        <p className="mt-2 text-sm">{venta.almacen.nombre}</p>
                    </div>

                    <div className="bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <User className="text-muted-foreground h-5 w-5" />
                            <h3 className="font-semibold">Cliente</h3>
                        </div>
                        <p className="mt-2 text-sm">{venta.cliente ? venta.cliente.nombre : 'Cliente no especificado'}</p>
                    </div>

                    <div className="bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <UserCheck className="text-muted-foreground h-5 w-5" />
                            <h3 className="font-semibold">Vendedor</h3>
                        </div>
                        <p className="mt-2 text-sm">
                            {venta.usuario.nombre} ({venta.usuario.rol})
                        </p>
                    </div>
                </div>

                {/* Productos vendidos */}
                <div className="bg-card rounded-lg p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                        <Package className="h-5 w-5" />
                        Productos Vendidos
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr className="border-b">
                                    <th className="p-3 text-left">Producto</th>
                                    <th className="p-3 text-left">Cantidad</th>
                                    <th className="p-3 text-left">Precio Unitario</th>
                                    <th className="p-3 text-left">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {venta.items.map((item, index) => (
                                    <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                                        <td className="p-3">
                                            <div>
                                                <p className="font-medium">{item.producto.nombre}</p>
                                                <p className="text-muted-foreground text-sm">
                                                    {item.producto.marca} - {item.producto.categoria}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="p-3">{item.cantidad}</td>
                                        <td className="p-3">{formatCurrency(item.precio_venta)}</td>
                                        <td className="p-3">{formatCurrency(item.subtotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-sidebar-accent">
                                    <td colSpan={3} className="py-3 text-right font-semibold">
                                        Total:
                                    </td>
                                    <td className="py-3 text-center text-lg font-semibold">{formatCurrency(venta.total)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Información de pagos */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Detalles de pagos */}
                    <div className="bg-card rounded-lg p-6 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                            <CreditCard className="h-5 w-5" />
                            Detalles de Pago
                        </h3>

                        {venta.pagos.map((pago, index) => (
                            <div key={index} className="bg-muted mb-4 rounded-md p-3 last:mb-0">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-sm font-medium">Método:</p>
                                        <p className="text-sm capitalize">{pago.metodo}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Moneda:</p>
                                        <p className="text-sm">{pago.moneda}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Monto:</p>
                                        <p className="text-sm">{formatCurrency(pago.monto)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Equivalente USD:</p>
                                        <p className="text-sm">{formatCurrency(pago.monto_usd)}</p>
                                    </div>
                                    {pago.via && (
                                        <div className="col-span-2">
                                            <p className="text-sm font-medium">Vía:</p>
                                            <p className="text-sm">{pago.via}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Reporte de la Venta */}
                    <div className="bg-card rounded-lg p-6 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                            <DollarSign className="h-5 w-5" />
                            Resumen Financiero
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total de la Venta:</span>
                                <span className="font-semibold">{formatCurrency(venta.total)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Pagado:</span>
                                <span className="font-semibold text-green-600">{formatCurrency(venta.total_pagado)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Ganancia Mayormpor la Tasa:</span>
                                <span className={`font-semibold ${venta.restante > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                                    {formatCurrency(venta.restante)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Estado:</span>
                                <span className={`font-semibold ${venta.restante > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                                    {venta.restante > 0 ? 'Pendiente' : 'Completada'}
                                </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tasa CUP Utilizada:</span>
                                <span className="font-semibold text-green-600">{formatCurrency(venta.tasa_usd_utilizada)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tasa MLC Utilizada:</span>
                                <span className="font-semibold text-green-600">{formatCurrency(venta.tasa_mlc_utilizada)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Botones de acción */}
                <div className="mt-6 flex justify-between">
                    <Link
                        href="/punto-venta"
                        className="focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                        Nueva Venta
                    </Link>
                </div>
            </div>
        </AppLayout>
    );
}
