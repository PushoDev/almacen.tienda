import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, Venta, User } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ShoppingCart } from 'lucide-react';
import React from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: route('reportes.index'),
    },
    {
        title: 'Ventas por Período',
        href: route('reportes.ventas_por_periodo'),
    },
];

interface VentasPorPeriodoPageProps {
    ventas: Venta[];
    usuarios: User[];
}

export default function VentasPorPeriodoPage({ ventas, usuarios }: VentasPorPeriodoPageProps) {
    // Aquí puedes agregar lógica para filtros si lo deseas
    // Por ahora, solo se muestra la tabla con los datos recibidos.

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ventas por Período" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Reporte de Ventas por Período"
                        description="Filtre y visualice las ventas completadas en un rango de fechas específico."
                    />
                    <ShoppingCart
                        size={70}
                        color="#22d3ee"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* Contenido Principal */}
                <div className="grid grid-cols-1 gap-4 px-4 lg:px-6">
                    <Card className="w-full">
                        <CardHeader>
                            <CardTitle>Historial de Ventas Completadas</CardTitle>
                            {/* Formulario de filtro (opcional) */}
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-700">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">ID Venta</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Fecha</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Vendedor</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Cliente</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Almacén</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {ventas.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-4 text-center text-gray-500">
                                                    No se encontraron ventas para el período seleccionado.
                                                </td>
                                            </tr>
                                        ) : (
                                            ventas.map((venta) => (
                                                <tr key={venta.id}>
                                                    <td className="px-4 py-2 text-sm">
                                                        <Link href={route('ventas.show', venta.id)} className="text-blue-500 hover:underline">
                                                            {venta.id}
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-2 text-sm">{new Date(venta.created_at).toLocaleDateString()}</td>
                                                    <td className="px-4 py-2 text-sm">{venta.usuario?.name}</td>
                                                    <td className="px-4 py-2 text-sm">{venta.cliente?.nombre_cliente || 'N/A'}</td>
                                                    <td className="px-4 py-2 text-sm">{venta.almacen?.nombre_almacen}</td>
                                                    <td className="px-4 py-2 text-sm">${parseFloat(venta.total.toString()).toFixed(2)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
