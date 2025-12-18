import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { DollarSign } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: route('reportes.index'),
    },
    {
        title: 'Reporte de Ganancias',
        href: route('reportes.reporte_ganancias'),
    },
];

interface GananciaVenta {
    id: number;
    fecha: string;
    vendedor: string;
    total_venta: number;
    ganancia_producto: number;
    diferencia_cambiaria: number;
    ganancia_total: number;
}

interface ReporteGananciasPageProps {
    ventas: GananciaVenta[];
    totales: {
        venta: number;
        ganancia: number;
        diferencia_cambiaria: number;
    };
}

export default function ReporteGananciasPage({ ventas, totales }: ReporteGananciasPageProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reporte de Ganancias" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Reporte de Rentabilidad y Ganancias"
                        description="Análisis detallado de ganancia operativa y diferencias cambiarias."
                    />
                    <DollarSign
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
                            <CardTitle>Detalle de Ganancias por Venta</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-700">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">ID</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Fecha</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Vendedor</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Total Venta</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold text-blue-400">G. Operativa</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold text-orange-400">Dif. Cambiaria</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold text-green-500">G. Real Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {ventas.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-4 text-center text-gray-500">
                                                    No se encontraron ventas completadas.
                                                </td>
                                            </tr>
                                        ) : (
                                            ventas.map((venta) => (
                                                <tr key={venta.id} className="hover:bg-gray-50/5 dark:hover:bg-gray-800/50">
                                                    <td className="px-4 py-2 text-sm">
                                                        <Link href={route('ventas.show', venta.id)} className="text-blue-500 hover:underline">
                                                            #{venta.id}
                                                        </Link>
                                                    </td>
                                                    <td className="px-4 py-2 text-sm">{venta.fecha}</td>
                                                    <td className="px-4 py-2 text-sm">{venta.vendedor}</td>
                                                    <td className="px-4 py-2 text-sm">${parseFloat(venta.total_venta.toString()).toFixed(2)}</td>
                                                    <td className="px-4 py-2 text-sm text-blue-400">
                                                        ${parseFloat(venta.ganancia_producto.toString()).toFixed(2)}
                                                    </td>
                                                    <td
                                                        className={`px-4 py-2 text-sm ${venta.diferencia_cambiaria >= 0 ? 'text-green-400' : 'text-red-400'}`}
                                                    >
                                                        ${parseFloat(venta.diferencia_cambiaria.toString()).toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm font-bold text-green-500">
                                                        ${parseFloat(venta.ganancia_total.toString()).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-gray-100/10 font-bold">
                                            <td colSpan={3} className="px-4 py-2 text-right">
                                                Totales:
                                            </td>
                                            <td className="px-4 py-2">${totales.venta.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-blue-400">
                                                ${(totales.ganancia - totales.diferencia_cambiaria).toFixed(2)}
                                            </td>
                                            <td className={`px-4 py-2 ${totales.diferencia_cambiaria >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                ${totales.diferencia_cambiaria.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2 text-green-500">${totales.ganancia.toFixed(2)}</td>
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
