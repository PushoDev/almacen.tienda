import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { User } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: route('reportes.index'),
    },
    {
        title: 'Ventas por Vendedor',
        href: route('reportes.ventas_por_vendedor'),
    },
];

interface VentaPorVendedor {
    vendedor: string;
    total_ventas: number;
    monto_total_vendido: number;
    ganancia_operativa: number;
    diferencia_cambiaria: number;
}

interface VentasPorVendedorPageProps {
    ventas: VentaPorVendedor[];
}

export default function VentasPorVendedorPage({ ventas }: VentasPorVendedorPageProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ventas por Vendedor" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Reporte de Ventas por Vendedor" description="Análisis de rendimiento, ventas y rentabilidad por vendedor." />
                    <User
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
                            <CardTitle>Rendimiento Financiero por Vendedor</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-700">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Vendedor</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold"># Ventas</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Total Vendido</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold text-blue-400">G. Operativa</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold text-orange-400">Dif. Cambiaria</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold text-green-500">G. Real Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {ventas.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-4 text-center text-gray-500">
                                                    No se encontraron registros de ventas.
                                                </td>
                                            </tr>
                                        ) : (
                                            ventas.map((venta, index) => {
                                                const gananciaReal =
                                                    parseFloat(venta.ganancia_operativa.toString()) +
                                                    parseFloat(venta.diferencia_cambiaria.toString());
                                                return (
                                                    <tr key={index} className="hover:bg-gray-50/5">
                                                        <td className="px-4 py-2 text-sm font-medium">{venta.vendedor}</td>
                                                        <td className="px-4 py-2 text-sm">{venta.total_ventas}</td>
                                                        <td className="px-4 py-2 text-sm">
                                                            ${parseFloat(venta.monto_total_vendido.toString()).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-blue-400">
                                                            ${parseFloat(venta.ganancia_operativa.toString()).toFixed(2)}
                                                        </td>
                                                        <td
                                                            className={`px-4 py-2 text-sm ${venta.diferencia_cambiaria >= 0 ? 'text-green-400' : 'text-red-400'}`}
                                                        >
                                                            ${parseFloat(venta.diferencia_cambiaria.toString()).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm font-bold text-green-500">${gananciaReal.toFixed(2)}</td>
                                                    </tr>
                                                );
                                            })
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
