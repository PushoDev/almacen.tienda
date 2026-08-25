import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { ArrowRight, DollarSign, Warehouse } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { NotificationDropdown } from './NotificationDropdown';

interface PrecioCambioData {
    producto_nombre: string;
    almacen_nombre: string;
    vendedor_nombre: string;
    precio_anterior: number;
    precio_nuevo: number;
}

export const NotificationBell = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Modal de cambio de precio
    const [precioCambioData, setPrecioCambioData] = useState<PrecioCambioData | null>(null);

    const fetchNotifications = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const response = await axios.get(route('notifications.index'));
            setNotifications(response.data.notifications);
            setUnreadCount(response.data.count);
        } catch (error) {
            console.error('Error bringing notifications', error);
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(() => fetchNotifications(true), 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const handleMarkAsRead = async (id: string) => {
        try {
            await axios.post(route('notifications.markAsRead', id));

            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));

            const notification = notifications.find((n) => n.id === id);
            if (!notification) return;

            const { type } = notification.data;

            if (type === 'venta_creada') {
                router.visit(route('ventas.show', notification.data.venta_id));
            } else if (type === 'movimiento_stock') {
                router.visit(route('movimientos.show', notification.data.movimiento_id));
            } else if (type === 'cierre_caja') {
                router.visit(route('ventas.cierres.show', notification.data.cierre_id));
            } else if (type === 'movimiento_financiero') {
                router.visit(route('transacciones.show', notification.data.movimiento_id));
            } else if (type === 'venta_especial_solicitud' || type === 'venta_especial_decision') {
                router.visit(route('ventas.show', notification.data.venta_id));
            } else if (type === 'cambio_precio') {
                // Mostrar modal con el detalle del cambio en lugar de navegar
                setPrecioCambioData({
                    producto_nombre: notification.data.producto_nombre,
                    almacen_nombre:  notification.data.almacen_nombre,
                    vendedor_nombre: notification.data.vendedor_nombre,
                    precio_anterior: notification.data.precio_anterior,
                    precio_nuevo:    notification.data.precio_nuevo,
                });
            }
        } catch (error) {
            console.error('Error marking as read', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await axios.post(route('notifications.markAllAsRead'));
            setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all as read', error);
        }
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);

    return (
        <>
            <NotificationDropdown
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={handleMarkAsRead}
                onMarkAllAsRead={handleMarkAllAsRead}
                isLoading={isLoading && notifications.length === 0}
            />

            {/* Modal de detalle de cambio de precio */}
            <AlertDialog open={!!precioCambioData} onOpenChange={(open) => { if (!open) setPrecioCambioData(null); }}>
                <AlertDialogContent className="overflow-hidden border-0 p-0 shadow-2xl sm:max-w-sm">
                    <div className="border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 dark:from-amber-950 dark:to-orange-950">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                                <div className="rounded-lg bg-amber-100 p-1.5 dark:bg-amber-900">
                                    <DollarSign className="h-4 w-4" />
                                </div>
                                Cambio de Precio por Vendedor
                            </AlertDialogTitle>
                        </AlertDialogHeader>
                    </div>

                    {precioCambioData && (
                        <div className="space-y-4 p-5">
                            {/* Producto y almacén */}
                            <div className="space-y-1">
                                <p className="text-xs font-medium tracking-wider text-gray-400 uppercase">Producto</p>
                                <p className="font-semibold text-gray-800 dark:text-gray-100">
                                    {precioCambioData.producto_nombre}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Warehouse className="h-4 w-4 text-gray-400" />
                                {precioCambioData.almacen_nombre}
                            </div>

                            <Separator />

                            {/* Vendedor */}
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Modificado por</span>
                                <Badge variant="outline" className="font-medium">
                                    {precioCambioData.vendedor_nombre}
                                </Badge>
                            </div>

                            {/* Precios */}
                            <div className="flex items-center justify-center gap-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                                <div className="text-center">
                                    <p className="text-xs text-gray-400">Precio anterior</p>
                                    <p className="text-lg font-bold text-gray-500 line-through">
                                        {precioCambioData.precio_anterior > 0
                                            ? formatCurrency(precioCambioData.precio_anterior)
                                            : '—'}
                                    </p>
                                </div>
                                <ArrowRight className="h-5 w-5 text-gray-400" />
                                <div className="text-center">
                                    <p className="text-xs text-gray-400">Precio nuevo</p>
                                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                        {formatCurrency(precioCambioData.precio_nuevo)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end border-t bg-gray-50 px-5 py-3 dark:bg-gray-900">
                        <AlertDialogCancel onClick={() => setPrecioCambioData(null)} className="h-9">
                            Cerrar
                        </AlertDialogCancel>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
