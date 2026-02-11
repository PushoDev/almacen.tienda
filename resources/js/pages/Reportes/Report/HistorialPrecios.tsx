import HeadingSmall from '@/components/heading-small';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { CalendarClock } from 'lucide-react';

// Tipado para los datos del historial
interface HistorialItem {
    id: number;
    producto: string;
    usuario: string;
    precio_anterior: number;
    precio_nuevo: number;
    fecha: string;
}

// Props que recibe la página
interface HistorialPrecioPageProps {
    historial: HistorialItem[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: route('reportes.index'),
    },
    {
        title: 'Historial de Precios',
        href: route('reportes.historial_precios'),
    },
];

export default function HistorialPrecioPage({ historial }: HistorialPrecioPageProps) {
    // Formateador de moneda
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
        }).format(value);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Historial de Precios" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Historial de Cambios de Precio"
                        description="Registro de modificaciones realizadas a los precios de venta por los vendedores."
                    />
                    {/* Ícono decorativo */}
                    <CalendarClock
                        size={70}
                        color="#22d3ee"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* Contenido Historial */}
                <div className="rounded-xl p-4 shadow-md">
                    <h2 className="mb-4 text-xl font-semibold">Registro de Cambios</h2>

                    {historial.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full table-auto">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-2 text-left">Producto</th>
                                        <th className="px-4 py-2 text-left">Usuario</th>
                                        <th className="px-4 py-2 text-left">Precio Anterior</th>
                                        <th className="px-4 py-2 text-left">Precio Nuevo</th>
                                        <th className="px-4 py-2 text-left">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historial.map((item) => (
                                        <tr key={item.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-2">{item.producto}</td>
                                            <td className="px-4 py-2">{item.usuario}</td>
                                            <td className="px-4 py-2 text-red-500">{formatCurrency(item.precio_anterior)}</td>
                                            <td className="px-4 py-2 text-green-500">{formatCurrency(item.precio_nuevo)}</td>
                                            <td className="px-4 py-2">{item.fecha}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-8 text-center text-gray-500">No se encontraron registros de cambios de precio.</div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
