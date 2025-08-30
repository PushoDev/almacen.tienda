import HeadingSmall from '@/components/heading-small';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Calendar, CreditCard, DollarSign, ShoppingBag, User, Warehouse } from 'lucide-react';

interface Venta {
    id: number;
    almacen: {
        id: number;
        nombre: string;
    };
    cliente: {
        id: number;
        nombre: string;
    } | null;
    items: Array<{
        producto: {
            id: number;
            nombre: string;
            marca: string;
            categoria: string;
        };
        cantidad: number;
        precio_venta: number;
        subtotal: number;
    }>;
    total: number;
    fecha: string;
    usuario: {
        id: number;
        nombre: string;
        email: string;
        rol: string;
    };
    pagos: Array<{
        metodo: string;
        moneda: string;
        monto: number;
        via: string | null;
        tasa_cambio: number;
        monto_usd: number;
    }>;
    total_pagado: number;
    restante: number;
}

// Definimos las props de la página extendiendo las props básicas de Inertia
interface PageProps {
    venta: Venta;
    [key: string]: unknown;
}

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

export default function ResultadoCarrito() {
    const { props } = usePage<PageProps>();
    const { venta } = props;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CU', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Detalle de Venta" />

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

                {/* Información de la Venta */}
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Calendar className="text-muted-foreground h-5 w-5" />
                            <h3 className="font-semibold">Fecha</h3>
                        </div>
                        <p className="text-muted-foreground mt-2 text-sm">{formatDate(venta.fecha)}</p>
                    </div>

                    <div className="bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Warehouse className="text-muted-foreground h-5 w-5" />
                            <h3 className="font-semibold">Almacén</h3>
                        </div>
                        <p className="text-muted-foreground mt-2 text-sm">{venta.almacen.nombre}</p>
                    </div>

                    <div className="bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <User className="text-muted-foreground h-5 w-5" />
                            <h3 className="font-semibold">Cliente</h3>
                        </div>
                        <p className="text-muted-foreground mt-2 text-sm">{venta.cliente ? venta.cliente.nombre : 'Cliente general'}</p>
                    </div>

                    <div className="bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <User className="text-muted-foreground h-5 w-5" />
                            <h3 className="font-semibold">Vendedor</h3>
                        </div>
                        <p className="text-muted-foreground mt-2 text-sm">{venta.usuario.nombre}</p>
                    </div>
                </div>

                {/* Productos vendidos */}
                <div className="bg-card mb-6 rounded-lg p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-semibold">Productos Vendidos</h3>
                    <div className="overflow-hidden rounded-lg border">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr>
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
                        </table>
                    </div>
                </div>

                {/* Información de pagos */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="bg-card rounded-lg p-6 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                            <CreditCard className="h-5 w-5" />
                            Detalles de Pago
                        </h3>
                        {venta.pagos.map((pago, index) => (
                            <div key={index} className="mb-4 rounded-lg border p-3 last:mb-0">
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
                                <span className="text-muted-foreground">Restante por Pagar:</span>
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
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
