import AppLogoIcon from '@/components/app-logo-icon';
import HeadingSmall from '@/components/heading-small';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import {
    Calendar,
    CheckCircle,
    CreditCard,
    DollarSign,
    FileText,
    Package,
    Printer,
    ShoppingBag,
    Store,
    User,
    UserCheck,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
    costo_unitario: number;
}

interface Pago {
    metodo: string;
    moneda: string;
    monto: number;
    via: string;
    tasa_cambio: number;
    monto_usd: number;
    cuenta: {
        id: number;
        nombre: string;
        moneda: string;
    };
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
    estado: 'pendiente' | 'completada' | 'cancelada';
}

interface Props {
    venta: Venta;
}

export default function ResultadoCarrito({ venta }: Props) {
    // Estados para gestionar las acciones
    const [isCancelling, setIsCancelling] = useState(false);
    const [isApproving, setIsApproving] = useState(false);

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

    // Determinar estados
    const isVentaPendiente = venta.estado === 'pendiente';
    const isVentaCompletada = venta.estado === 'completada';
    const isVentaCancelada = venta.estado === 'cancelada';

    // Obtener color y texto del estado
    const getEstadoConfig = () => {
        switch (venta.estado) {
            case 'pendiente':
                return { color: 'bg-yellow-500', text: 'PENDIENTE', textColor: 'text-yellow-600' };
            case 'completada':
                return { color: 'bg-green-500', text: 'COMPLETADA', textColor: 'text-green-600' };
            case 'cancelada':
                return { color: 'bg-red-500', text: 'ANULADA', textColor: 'text-red-600' };
            default:
                return { color: 'bg-gray-500', text: 'DESCONOCIDO', textColor: 'text-gray-600' };
        }
    };

    const estadoConfig = getEstadoConfig();

    // FUNCIÓN: Manejar la aprobación de la venta
    const handleAprobarVenta = async () => {
        setIsApproving(true);
        try {
            const response = await axios.post(route('ventas.aprobar', venta.id));

            if (response.data.success) {
                toast.success(response.data.message || 'Venta aprobada correctamente');
                // Recargar la página para mostrar el nuevo estado
                router.reload();
            } else {
                toast.error(response.data.message || 'Error al aprobar la venta');
            }
        } catch (error: any) {
            console.error('Error al aprobar venta:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Ocurrió un error al intentar aprobar la venta.';
            toast.error(errorMessage);
        } finally {
            setIsApproving(false);
        }
    };

    // FUNCIÓN: Manejar la anulación de la venta
    const handleAnularVenta = async () => {
        setIsCancelling(true);
        try {
            const response = await axios.post(route('ventas.anular', venta.id));

            if (response.data.success) {
                toast.success(response.data.message || 'Venta anulada correctamente');
                // Recargar la página para mostrar el nuevo estado
                router.reload();
            } else {
                toast.error(response.data.message || 'Error al anular la venta');
            }
        } catch (error: any) {
            console.error('Error al anular venta:', error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Ocurrió un error al intentar anular la venta.';
            toast.error(errorMessage);
        } finally {
            setIsCancelling(false);
        }
    };

    // Calcular ganancia total
    const calcularGananciaTotal = () => {
        return venta.items.reduce((total, item) => {
            const costoTotal = item.cantidad * item.costo_unitario;
            const ingresoTotal = item.subtotal;
            return total + (ingresoTotal - costoTotal);
        }, 0);
    };

    const gananciaTotal = calcularGananciaTotal();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Detalle de Venta #${venta.id}`} />

            {/* Contenedor principal */}
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title={`Detalle de Venta #${venta.id}`} description="Resumen completo de la venta procesada" />

                    {/* Indicador de estado de la venta */}
                    <div className={`absolute top-4 right-4 rounded-full px-3 py-1 text-sm font-bold text-white ${estadoConfig.color}`}>
                        {estadoConfig.text}
                    </div>

                    <ShoppingBag
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator />

                {/* Botones de acción */}
                <div className="flex justify-end gap-2">
                    <Link
                        href="/punto-venta"
                        className="focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                        Nueva Venta
                    </Link>

                    <Link
                        href="/ventas"
                        className="focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                        Ver Todas las Ventas
                    </Link>

                    <Button variant="outline" className="hover:bg-chart-5 flex cursor-pointer items-center gap-2">
                        <FileText size={16} />
                        Exportar PDF
                    </Button>

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

                    {/* Botón de Aprobar Venta (solo para ventas pendientes) */}
                    {isVentaPendiente && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="default"
                                    className="flex cursor-pointer items-center gap-2 bg-green-600 text-white hover:bg-green-700"
                                    disabled={isApproving}
                                >
                                    <CheckCircle size={16} />
                                    {isApproving ? 'Aprobando...' : 'Aprobar Venta'}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-green-600">Confirmar Aprobación</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        ¿Está seguro que desea aprobar la Venta <strong>#{venta.id}</strong>?
                                        <br />
                                        <span className="font-semibold text-green-500">
                                            Esta acción:
                                            <br />• Descontará stock de los productos
                                            <br />• Actualizará saldos de cuentas bancarias
                                            <br />• Cambiará el estado a "Completada"
                                        </span>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleAprobarVenta}
                                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                        disabled={isApproving}
                                    >
                                        {isApproving ? 'Aprobando...' : 'Sí, Aprobar Venta'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}

                    {/* Botón de Anular Venta (para ventas pendientes y completadas) */}
                    {(isVentaPendiente || isVentaCompletada) && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    className="flex cursor-pointer items-center gap-2"
                                    disabled={isVentaCancelada || isCancelling}
                                >
                                    <XCircle size={16} />
                                    {isVentaCancelada ? 'Anulada' : 'Anular Venta'}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-red-600">Confirmar Anulación</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción es <strong>irreversible</strong>. ¿Está seguro que desea anular la Venta{' '}
                                        <strong>#{venta.id}</strong>?
                                        <br />
                                        <span className="font-semibold text-red-500">
                                            {isVentaCompletada
                                                ? 'Se revertirá el stock de los productos y se deducirán los montos de las cuentas bancarias asociadas.'
                                                : 'Se cancelará la venta sin afectar stock ni cuentas (estado pendiente).'}
                                        </span>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleAnularVenta}
                                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                                        disabled={isCancelling}
                                    >
                                        {isCancelling ? 'Anulando...' : 'Sí, Anular Venta'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
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
                                    <th className="p-3 text-left">Costo Unitario</th>
                                    <th className="p-3 text-left">Ganancia Unitaria</th>
                                    <th className="p-3 text-left">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {venta.items.map((item, index) => {
                                    const gananciaUnitaria = item.precio_venta - item.costo_unitario;
                                    const gananciaTotalItem = gananciaUnitaria * item.cantidad;

                                    return (
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
                                            <td className="p-3 text-red-600">{formatCurrency(item.costo_unitario)}</td>
                                            <td className="p-3 text-green-600">{formatCurrency(gananciaUnitaria)}</td>
                                            <td className="p-3 font-medium">{formatCurrency(item.subtotal)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-sidebar-accent">
                                    <td colSpan={5} className="py-3 text-right font-semibold text-white">
                                        Total Venta:
                                    </td>
                                    <td className="py-3 text-center text-lg font-semibold text-white">{formatCurrency(venta.total)}</td>
                                </tr>
                                <tr className="bg-green-50">
                                    <td colSpan={5} className="py-3 text-right font-semibold text-green-800">
                                        Ganancia Total:
                                    </td>
                                    <td className="py-3 text-center text-lg font-semibold text-green-800">{formatCurrency(gananciaTotal)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Información de pagos y resumen */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Detalles de pagos */}
                    <div className="bg-card rounded-lg p-6 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                            <CreditCard className="h-5 w-5" />
                            Detalles de Pago
                        </h3>

                        {venta.pagos.length > 0 ? (
                            venta.pagos.map((pago, index) => (
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
                                            <p className="text-sm font-medium">Monto Original:</p>
                                            <p className="text-sm">{formatCurrency(pago.monto, pago.moneda)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Equivalente USD:</p>
                                            <p className="text-sm">{formatCurrency(pago.monto_usd)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Tasa Cambio:</p>
                                            <p className="text-sm">{pago.tasa_cambio}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">Cuenta:</p>
                                            <p className="text-sm">
                                                {pago.cuenta.nombre} ({pago.cuenta.moneda})
                                            </p>
                                        </div>
                                        {pago.via && (
                                            <div className="col-span-2">
                                                <p className="text-sm font-medium">Vía:</p>
                                                <p className="text-sm capitalize">{pago.via}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted-foreground text-center">No hay pagos registrados</p>
                        )}
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
                                <span className="text-muted-foreground">Restante por Pagar:</span>
                                <span className={`font-semibold ${venta.restante > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                                    {formatCurrency(venta.restante)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Ganancia Total:</span>
                                <span className="font-semibold text-green-600">{formatCurrency(gananciaTotal)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Estado:</span>
                                <span className={`font-semibold ${estadoConfig.textColor}`}>{estadoConfig.text}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tasa USD Utilizada:</span>
                                <span className="font-semibold">1 USD = {venta.tasa_usd_utilizada} CUP</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Tasa MLC Utilizada:</span>
                                <span className="font-semibold">1 MLC = {venta.tasa_mlc_utilizada} USD</span>
                            </div>
                        </div>

                        {/* Información adicional según estado */}
                        {isVentaPendiente && (
                            <div className="mt-4 rounded-md bg-yellow-50 p-3">
                                <p className="text-sm text-yellow-800">
                                    <strong>Venta Pendiente:</strong> Esta venta requiere aprobación para afectar stock y cuentas.
                                </p>
                            </div>
                        )}

                        {isVentaCancelada && (
                            <div className="mt-4 rounded-md bg-red-50 p-3">
                                <p className="text-sm text-red-800">
                                    <strong>Venta Anulada:</strong> Esta venta fue cancelada.
                                    {venta.estado === 'completada' && ' Stock y saldos de cuentas fueron revertidos.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Información adicional para administradores */}
                {venta.usuario.rol === 'admin' && (
                    <div className="bg-card rounded-lg p-6 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                            <UserCheck className="h-5 w-5" />
                            Información del Sistema
                        </h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <p className="text-sm font-medium">ID de Venta:</p>
                                <p className="text-muted-foreground text-sm">#{venta.id}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium">Vendedor ID:</p>
                                <p className="text-muted-foreground text-sm">{venta.usuario.id}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium">Almacén ID:</p>
                                <p className="text-muted-foreground text-sm">{venta.almacen.id}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
