import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { BarChart, Calendar, DollarSign, Eye, Hash, ShoppingCart, User } from 'lucide-react';
import React from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Ventas', href: '/punto-venta' },
    { title: 'Cierres de Caja', href: '/vendor/cierres' },
    { title: 'Detalle de Cierre', href: '#' },
];

// Mock data structures - replace with actual props later
interface Venta {
    id: number;
    cliente: { nombre: string } | null;
    total: number;
    total_ganancia: number;
    estado: string;
    fecha: string;
}

interface DetalleCierre {
    id: number;
    vendedor: {
        id: number;
        nombre: string;
    };
    fecha_cierre: string;
    tipo_reporte: 'Diario' | 'Semanal' | 'Mensual';
    total_ventas: number;
    total_ganancia: number;
    cantidad_transacciones: number;
    ventas: Venta[];
}

interface PageProps {
    cierre: DetalleCierre;
}

export default function DetalleCierre({ cierre }: PageProps) {
    const formatMonto = (monto: number) =>
        `$${monto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const getEstadoBadge = (estado: string) => {
        const config = {
            pendiente: 'bg-yellow-100 text-yellow-800',
            completada: 'bg-green-100 text-green-800',
            cancelada: 'bg-red-100 text-red-800',
        };
        return (
            <Badge className={(config[estado as keyof typeof config] || 'bg-gray-100 text-gray-800') + ' capitalize'}>
                {estado}
            </Badge>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Detalle de Cierre #${cierre.id}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 sm:p-6">
                <Card className="relative overflow-hidden">
                    <CardHeader>
                        <CardTitle>Detalle de Cierre de Caja #{cierre.id}</CardTitle>
                        <CardDescription>
                            Resumen del cierre {cierre.tipo_reporte.toLowerCase()} para el vendedor{' '}
                            <strong>{cierre.vendedor.nombre}</strong> el día{' '}
                            <strong>{new Date(cierre.fecha_cierre).toLocaleDateString('es-ES')}</strong>.
                        </CardDescription>
                    </CardHeader>
                    <BarChart
                        size={80}
                        className="pointer-events-none absolute -bottom-4 -right-4 text-gray-200/40 dark:text-gray-500/10"
                    />
                </Card>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatMonto(cierre.total_ventas)}</div>
                            <p className="text-xs text-muted-foreground">Monto total de las ventas completadas.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Ganancia Total</CardTitle>
                            <DollarSign className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{formatMonto(cierre.total_ganancia)}</div>
                            <p className="text-xs text-muted-foreground">Ganancia generada en este período.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{cierre.cantidad_transacciones}</div>
                            <p className="text-xs text-muted-foreground">Número de ventas individuales.</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Ventas Incluidas en este Cierre</CardTitle>
                        <CardDescription>Listado de todas las transacciones que componen este reporte.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <Hash className="mr-2 inline-block h-4 w-4" /> ID Venta
                                    </TableHead>
                                    <TableHead>
                                        <User className="mr-2 inline-block h-4 w-4" /> Cliente
                                    </TableHead>
                                    <TableHead>
                                        <Calendar className="mr-2 inline-block h-4 w-4" /> Fecha
                                    </TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead className="text-right">Ganancia</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cierre.ventas && cierre.ventas.length > 0 ? (
                                    cierre.ventas.map((venta) => (
                                        <TableRow key={venta.id}>
                                            <TableCell className="font-medium">#{venta.id}</TableCell>
                                            <TableCell>{venta.cliente?.nombre || 'N/A'}</TableCell>
                                            <TableCell>{new Date(venta.fecha).toLocaleDateString('es-ES')}</TableCell>
                                            <TableCell>{getEstadoBadge(venta.estado)}</TableCell>
                                            <TableCell className="text-right font-semibold text-blue-600">
                                                {formatMonto(venta.total)}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-green-600">
                                                {formatMonto(venta.total_ganancia)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={route('ventas.show', venta.id)}>
                                                    <Button variant="outline" size="sm">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            No hay ventas registradas en este cierre.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}