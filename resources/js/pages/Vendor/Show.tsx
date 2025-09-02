import HeadingSmall from '@/components/heading-small';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ShoppingBag, Calendar, Store, User, CreditCard, DollarSign, Package, UserCheck } from 'lucide-react';

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
            minute: '2-digit'
        });
    };

    // Formatear moneda
    const formatCurrency = (amount: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        }).format(amount);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Detalle de Venta #${venta.id}`} />

            {/* Contenedor principal */}
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title={`Detalle de Venta #${venta.id}`}
                        description="Resumen completo de la venta procesada"
                    />
                    <ShoppingBag
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator />

                {/* Información general de la venta */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <h3 className="font-semibold">Fecha y Hora</h3>
                        </div>
                        <p className="mt-2 text-sm">{formatDate(venta.fecha)}</p>
                    </div>

                    <div className="bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Store className="h-5 w-5 text-muted-foreground" />
                            <h3 className="font-semibold">Almacén</h3>
                        </div>
                        <p className="mt-2 text-sm">{venta.almacen.nombre}</p>
                    </div>

                    <div className="bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <h3 className="font-semibold">Cliente</h3>
                        </div>
                        <p className="mt-2 text-sm">
                            {venta.cliente ? venta.cliente.nombre : 'Cliente no especificado'}
                        </p>
                    </div>

                    <div className="bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <UserCheck className="h-5 w-5 text-muted-foreground" />
                            <h3 className="font-semibold">Vendedor</h3>
                        </div>
                        <p className="mt-2 text-sm">{venta.usuario.nombre} ({venta.usuario.rol})</p>
                    </div>
                </div>

                {/* Productos vendidos */}
                <div className="bg-card rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Productos Vendidos
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                            <tr className="border-b">
                                <th className="text-left py-2">Producto</th>
                                <th className="text-center py-2">Cantidad</th>
                                <th className="text-right py-2">Precio Unitario</th>
                                <th className="text-right py-2">Subtotal</th>
                            </tr>
                            </thead>
                            <tbody>
                            {venta.items.map((item, index) => (
                                <tr key={index} className="border-b">
                                    <td className="py-3">
                                        <div>
                                            <p className="font-medium">{item.producto.nombre}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {item.producto.marca} - {item.producto.categoria}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="text-center py-3">{item.cantidad}</td>
                                    <td className="text-right py-3">{formatCurrency(item.precio_venta)}</td>
                                    <td className="text-right py-3 font-medium">{formatCurrency(item.subtotal)}</td>
                                </tr>
                            ))}
                            </tbody>
                            <tfoot>
                            <tr>
                                <td colSpan={3} className="text-right py-3 font-semibold">Total:</td>
                                <td className="text-right py-3 font-semibold text-lg">{formatCurrency(venta.total)}</td>
                            </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Información de pagos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Detalles de pagos */}
                    <div className="bg-card rounded-lg p-6 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Detalles de Pago
                        </h3>

                        {venta.pagos.map((pago, index) => (
                            <div key={index} className="mb-4 last:mb-0 p-3 bg-muted rounded-md">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium capitalize">{pago.metodo}</span>
                                    <span className="font-semibold">{formatCurrency(pago.monto, pago.moneda)}</span>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    <p>Moneda: {pago.moneda}</p>
                                    <p>Tasa de cambio: {pago.tasa_cambio}</p>
                                    <p>Equivalente en USD: {formatCurrency(pago.monto_usd)}</p>
                                    {pago.via && <p>Vía: {pago.via}</p>}
                                </div>
                            </div>
                        ))}

                        <Separator className="my-4" />

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span>Total Pagado:</span>
                                <span className="font-semibold text-green-600">{formatCurrency(venta.total_pagado)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Restante:</span>
                                <span className={`font-semibold ${venta.restante > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                                    {formatCurrency(venta.restante)}
                                </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                                <span>Total Venta:</span>
                                <span className="font-semibold text-lg">{formatCurrency(venta.total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tasas de cambio utilizadas */}
                    <div className="bg-card rounded-lg p-6 shadow-sm">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Tasas de Cambio Utilizadas
                        </h3>

                        <div className="space-y-4">
                            <div className="p-3 bg-muted rounded-md">
                                <h4 className="font-medium mb-1">Tasa USD a CUP</h4>
                                <p className="text-2xl font-bold">1 USD = {venta.tasa_usd_utilizada} CUP</p>
                            </div>

                            <div className="p-3 bg-muted rounded-md">
                                <h4 className="font-medium mb-1">Tasa MLC a USD</h4>
                                <p className="text-2xl font-bold">1 MLC = {venta.tasa_mlc_utilizada} USD</p>
                            </div>
                        </div>

                        <Separator className="my-4" />

                        <div className="text-sm text-muted-foreground">
                            <p>Estas tasas de cambio fueron las aplicadas al momento de procesar la venta.</p>
                        </div>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-between mt-6">
                    <Link
                        href="/punto-venta"
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        Nueva Venta
                    </Link>
                    <Link
                        href="/ventas"
                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                    >
                        Ver Todas las Ventas
                    </Link>
                </div>
            </div>
        </AppLayout>
    );
}
