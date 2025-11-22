import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Landmark } from 'lucide-react';
import React from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: route('reportes.index'),
    },
    {
        title: 'Movimientos Financieros',
        href: route('reportes.movimientos_financieros'),
    },
];

interface MovimientoFinanciero {
    id: number;
    tipo_movimiento: string;
    monto: number;
    moneda: string;
    descripcion: string;
    fecha_operacion: string;
    origen: string | null;
    destino: string | null;
}

interface MovimientosFinancierosPageProps {
    movimientos: MovimientoFinanciero[];
    tipos: { id: number; nombre: string }[];
}

export default function MovimientosFinancierosPage({ movimientos, tipos }: MovimientosFinancierosPageProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Movimientos Financieros" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Historial de Movimientos Financieros"
                        description="Registro de todas las transacciones financieras (ingresos, gastos, transferencias)."
                    />
                    <Landmark
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
                            <CardTitle>Registro de Transacciones</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-700">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Fecha</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Tipo</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Descripción</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Origen</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Destino</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {movimientos.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-4 text-center text-gray-500">
                                                    No se encontraron movimientos financieros.
                                                </td>
                                            </tr>
                                        ) : (
                                            movimientos.map((mov) => (
                                                <tr key={mov.id}>
                                                    <td className="px-4 py-2 text-sm">{new Date(mov.fecha_operacion).toLocaleString()}</td>
                                                    <td className="px-4 py-2 text-sm">{mov.tipo_movimiento}</td>
                                                    <td className="px-4 py-2 text-sm">{mov.descripcion}</td>
                                                    <td className="px-4 py-2 text-sm">{mov.origen || 'N/A'}</td>
                                                    <td className="px-4 py-2 text-sm">{mov.destino || 'N/A'}</td>
                                                    <td className={`px-4 py-2 text-sm font-bold ${mov.tipo_movimiento === 'Ingreso' ? 'text-green-500' : mov.tipo_movimiento === 'Gasto' ? 'text-red-500' : ''}`}>
                                                        {mov.tipo_movimiento === 'Ingreso' ? '+' : mov.tipo_movimiento === 'Gasto' ? '-' : ''}
                                                        ${parseFloat(mov.monto.toString()).toFixed(2)} {mov.moneda}
                                                    </td>
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
