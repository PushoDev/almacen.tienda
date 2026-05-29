import { router } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { NotificationDropdown } from './NotificationDropdown';

export const NotificationBell = () => {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

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

    // Initial fetch
    useEffect(() => {
        fetchNotifications();

        // Poll every 30 seconds
        const interval = setInterval(() => {
            fetchNotifications(true);
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const handleMarkAsRead = async (id: string) => {
        try {
            await axios.post(route('notifications.markAsRead', id));

            // Optimistic update
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
            setUnreadCount((prev) => Math.max(0, prev - 1));

            // Navigate based on notification type
            const notification = notifications.find((n) => n.id === id);
            if (notification) {
                const { type } = notification.data;
                if (type === 'venta_creada') {
                    router.visit(route('ventas.show', notification.data.venta_id));
                } else if (type === 'movimiento_stock') {
                    router.visit(route('movimientos.show', notification.data.movimiento_id));
                } else if (type === 'cierre_caja') {
                    router.visit(route('ventas.cierres.show', notification.data.cierre_id));
                } else if (type === 'movimiento_financiero') {
                    router.visit(route('transacciones.show', notification.data.movimiento_id));
                } else if (type === 'cambio_precio') {
                    router.visit(route('disponibles.precios-vendedores', { producto: notification.data.producto_id, almacen: notification.data.almacen_id }));
                }
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
            toast.success('Todas las notificaciones marcadas como leídas');
        } catch (error) {
            console.error('Error marking all as read', error);
        }
    };

    return (
        <NotificationDropdown
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            isLoading={isLoading && notifications.length === 0}
        />
    );
};
