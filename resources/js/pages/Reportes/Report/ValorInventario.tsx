import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Archive } from 'lucide-react';
import React from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: route('reportes.index'),
    },
    {
        title: 'Valor del Inventario',
        href: route('reportes.valor_inventario'),
    },
];

interface InventarioItem {
    producto_id: number;
    nombre_producto: string;
    almacen_id: number;
    nombre_almacen: string;
    cantidad: number;
    costo_unitario: number;
    valor_total_costo: number;
}

interface ValorInventarioPageProps {
    inventario: InventarioItem[];
    valorTotal: number;
}

export default function ValorInventarioPage({ inventario, valorTotal }: ValorInventarioPageProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Valor del Inventario" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Reporte de Valorización de Inventario"
                        description="Valor total del inventario actual basado en el costo real de cada lote (incluye prorrateos)."
                    />
                    <Archive
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
                            <CardTitle>Inventario Valorizado (a Precio de Costo)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-700">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Producto</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Almacén</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Cantidad en Stock</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Costo Unitario</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Valor Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {inventario.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-4 text-center text-gray-500">
                                                    No hay productos en el inventario.
                                                </td>
                                            </tr>
                                        ) : (
                                            inventario.map((item) => (
                                                <tr key={`${item.producto_id}-${item.almacen_id}`}>
                                                    <td className="px-4 py-2 text-sm">{item.nombre_producto}</td>
                                                    <td className="px-4 py-2 text-sm">{item.nombre_almacen}</td>
                                                    <td className="px-4 py-2 text-sm">{item.cantidad}</td>
                                                    <td className="px-4 py-2 text-sm">${parseFloat(item.costo_unitario.toString()).toFixed(2)}</td>
                                                    <td className="px-4 py-2 text-sm">${parseFloat(item.valor_total_costo.toString()).toFixed(2)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr className="font-bold">
                                            <td colSpan={4} className="px-4 py-2 text-right text-lg">
                                                Valor Total del Inventario:
                                            </td>
                                            <td className="px-4 py-2 text-lg">${valorTotal.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
