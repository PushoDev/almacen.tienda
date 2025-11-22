import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import React from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: route('reportes.index'),
    },
    {
        title: 'Reporte de Stock Bajo',
        href: route('reportes.reporte_stock_bajo'),
    },
];

interface StockBajoItem {
    nombre_producto: string;
    nombre_almacen: string;
    cantidad: number;
}

interface ReporteStockBajoPageProps {
    productos: StockBajoItem[];
}

export default function ReporteStockBajoPage({ productos }: ReporteStockBajoPageProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reporte de Stock Bajo" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Reporte de Niveles de Stock Bajo"
                        description="Productos con 5 o menos unidades en inventario."
                    />
                    <AlertTriangle
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
                            <CardTitle>Productos con Inventario Bajo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-700">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Producto</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Almacén</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Cantidad Restante</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {productos.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="py-4 text-center text-gray-500">
                                                    No hay productos con stock bajo actualmente.
                                                </td>
                                            </tr>
                                        ) : (
                                            productos.map((producto, index) => (
                                                <tr key={index} className={producto.cantidad <= 2 ? 'bg-red-900/50' : ''}>
                                                    <td className="px-4 py-2 text-sm">{producto.nombre_producto}</td>
                                                    <td className="px-4 py-2 text-sm">{producto.nombre_almacen}</td>
                                                    <td className="px-4 py-2 text-sm font-bold">{producto.cantidad}</td>
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
