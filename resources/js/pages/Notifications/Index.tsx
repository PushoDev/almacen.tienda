import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { cn } from '@/lib/utils';
import { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { ArrowLeft, ArrowRight, Bell, BellRing, CheckCircle, Lock, ShoppingCart, Truck } from 'lucide-react';

interface Notification {
    id: string;
    type: string;
    notifiable_type: string;
    notifiable_id: number;
    data: any;
    read_at: string | null;
    created_at: string;
    updated_at: string;
}

interface IndexProps {
    notifications: {
        data: Notification[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Notificaciones',
        href: '/notifications/history',
    },
];

const getIcon = (iconName: string) => {
    switch (iconName) {
        case 'shopping-cart':
            return <ShoppingCart className="h-5 w-5" />;
        case 'truck':
            return <Truck className="h-5 w-5" />;
        case 'lock':
            return <Lock className="h-5 w-5" />;
        case 'check':
            return <CheckCircle className="h-5 w-5" />;
        default:
            return <Bell className="h-5 w-5" />;
    }
};

const getColorClass = (color: string) => {
    switch (color) {
        case 'green':
            return 'text-green-500 bg-green-100 dark:bg-green-900/20';
        case 'blue':
            return 'text-blue-500 bg-blue-100 dark:bg-blue-900/20';
        case 'red':
            return 'text-red-500 bg-red-100 dark:bg-red-900/20';
        case 'purple':
            return 'text-purple-500 bg-purple-100 dark:bg-purple-900/20';
        default:
            return 'text-gray-500 bg-gray-100 dark:bg-gray-800';
    }
};

export default function Index({ notifications }: IndexProps) {
    const handleMarkAsRead = async (id: string, type: string, data: any) => {
        try {
            await axios.post(route('notifications.markAsRead', id));
            // Navigate if link exists (custom logic based on type)
            if (data.type === 'venta_creada') {
                router.visit(route('ventas.show', data.venta_id));
            } else if (data.type === 'movimiento_stock') {
                router.visit(route('movimientos.index'));
            } else if (data.type === 'cierre_caja') {
                router.visit(route('ventas.cierres.show', data.cierre_id));
            } else {
                router.reload(); // Refresh to show as read
            }
        } catch (error) {
            console.error('Error marking as read', error);
        }
    };

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title="Historial de Notificaciones" />
            <div className="space-y-6 p-4 md:p-6">
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    {/* Contenido principal */}
                    <HeadingSmall title="Historial de Notificaciones" description="Revisa todas tus alertas y avisos pasados." />
                    {/* Ícono semitransparente */}
                    <BellRing
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Listado Completo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead>
                                    <TableHead>Título</TableHead>
                                    <TableHead>Mensaje</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {notifications.data.length > 0 ? (
                                    notifications.data.map((notification) => (
                                        <TableRow key={notification.id} className={!notification.read_at ? 'bg-muted/30' : ''}>
                                            <TableCell>
                                                <div className={cn('w-max rounded-full p-2', getColorClass(notification.data.color))}>
                                                    {getIcon(notification.data.icon)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{notification.data.title}</TableCell>
                                            <TableCell>{notification.data.message}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {new Date(notification.created_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                {notification.read_at ? (
                                                    <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">
                                                        Leído
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">No leído</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleMarkAsRead(notification.id, notification.type, notification.data)}
                                                    className="cursor-pointer"
                                                >
                                                    Ver detalles
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No hay notificaciones registradas.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination */}
                        <div className="flex items-center justify-end space-x-2 py-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.visit(notifications.links[0].url)}
                                disabled={!notifications.links[0].url}
                            >
                                <ArrowLeft className="mr-1 h-4 w-4" /> Anterior
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.visit(notifications.links[notifications.links.length - 1].url)}
                                disabled={!notifications.links[notifications.links.length - 1].url}
                            >
                                Siguiente <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppSidebarLayout>
    );
}
