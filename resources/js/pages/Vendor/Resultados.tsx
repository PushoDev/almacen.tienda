import HeadingSmall from '@/components/heading-small';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Calendar, Package, Receipt, ShoppingBag, Store, User } from 'lucide-react';

// Rutas breadcrumb
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Productos',
        href: '/productos',
    },
    {
        title: 'Ventas',
        href: '/punto-venta',
    },
    {
        title: 'Resultados',
        href: '#',
    },
];

export default function ResultadoCarrito({ datos }) {
    if (!datos || !datos.venta) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Resultado de Venta" />
                <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
                        <h2 className="mb-2 text-xl font-bold text-red-800">Error</h2>
                        <p className="text-red-600">No se encontraron datos de venta</p>
                    </div>
                </div>
            </AppLayout>
        );
    }

    const { venta } = datos;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Resultado de Venta" />

            {/* Contenedor principal */}
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Resultado de Venta" description="Detalles de la venta procesada" />
                    <ShoppingBag
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator />

                {/* Información de la Venta */}
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Información del Almacén */}
                    <div className="rounded-lg border bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b bg-gray-50 px-4 py-3">
                            <Store className="h-5 w-5 text-blue-600" />
                            <h3 className="font-medium text-gray-900">Almacén</h3>
                        </div>
                        <div className="p-4">
                            <div className="space-y-2">
                                <div>
                                    <p className="text-sm text-gray-500">ID</p>
                                    <p className="font-medium">{venta.almacen?.id || 'No especificado'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Nombre</p>
                                    <p className="font-medium">{venta.almacen?.nombre || 'No especificado'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Información del Cliente */}
                    <div className="rounded-lg border bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b bg-gray-50 px-4 py-3">
                            <User className="h-5 w-5 text-green-600" />
                            <h3 className="font-medium text-gray-900">Cliente</h3>
                        </div>
                        <div className="p-4">
                            <div className="space-y-2">
                                <div>
                                    <p className="text-sm text-gray-500">ID</p>
                                    <p className="font-medium">{venta.cliente?.id || 'No especificado'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Nombre</p>
                                    <p className="font-medium">{venta.cliente?.nombre || 'No especificado'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Información del Usuario */}
                    <div className="rounded-lg border bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b bg-gray-50 px-4 py-3">
                            <User className="h-5 w-5 text-purple-600" />
                            <h3 className="font-medium text-gray-900">Usuario</h3>
                        </div>
                        <div className="p-4">
                            <div className="space-y-2">
                                <div>
                                    <p className="text-sm text-gray-500">Nombre</p>
                                    <p className="font-medium">{venta.usuario?.nombre || 'No especificado'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Rol</p>
                                    <p className="font-medium capitalize">{venta.usuario?.rol || 'No especificado'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Información de la Venta - Total y Fecha */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Total de la Venta */}
                    <div className="rounded-lg border bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b bg-gray-50 px-4 py-3">
                            <Receipt className="h-5 w-5 text-yellow-600" />
                            <h3 className="font-medium text-gray-900">Total de Venta</h3>
                        </div>
                        <div className="p-4">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-green-600">${venta.total?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Fecha de la Venta */}
                    <div className="rounded-lg border bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b bg-gray-50 px-4 py-3">
                            <Calendar className="h-5 w-5 text-red-600" />
                            <h3 className="font-medium text-gray-900">Fecha</h3>
                        </div>
                        <div className="p-4">
                            <div className="text-center">
                                <p className="text-lg font-medium">{venta.fecha ? new Date(venta.fecha).toLocaleString() : 'No especificada'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Productos del Carrito */}
                <div className="rounded-lg border bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b bg-gray-50 px-4 py-3">
                        <Package className="h-5 w-5 text-indigo-600" />
                        <h3 className="font-medium text-gray-900">Productos ({venta.items?.length || 0})</h3>
                    </div>
                    <div className="p-4">
                        {venta.items && venta.items.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                Producto
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                Categoría
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                Cantidad
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                Precio Unitario
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                Subtotal
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {venta.items.map((item, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {item.producto?.nombre || 'Producto no especificado'}
                                                        </div>
                                                        <div className="text-sm text-gray-500">{item.producto?.marca || 'Sin marca'}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500">
                                                    {item.producto?.categoria || 'Sin categoría'}
                                                </td>
                                                <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-900">{item.cantidad || 0}</td>
                                                <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-900">
                                                    ${item.precio_venta?.toFixed(2) || '0.00'}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium whitespace-nowrap text-gray-900">
                                                    ${item.subtotal?.toFixed(2) || '0.00'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50">
                                        <tr>
                                            <td colSpan="4" className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                                Total:
                                            </td>
                                            <td className="px-4 py-3 text-sm font-bold text-green-600">${venta.total?.toFixed(2) || '0.00'}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <p className="text-gray-500">No hay productos en la venta</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* JSON Raw (opcional para debugging) */}
                <div className="rounded-lg border bg-gray-50">
                    <div className="border-b bg-gray-100 px-4 py-2">
                        <h4 className="text-sm font-medium text-gray-700">Datos RAW (para debugging)</h4>
                    </div>
                    <div className="p-4">
                        <pre className="max-h-64 overflow-auto rounded border bg-white p-4 text-xs text-gray-600">
                            {JSON.stringify(datos, null, 2)}
                        </pre>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => window.history.back()}
                        className="rounded-md bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
                    >
                        Volver al Punto de Venta
                    </button>
                    <button
                        onClick={() => {
                            const jsonStr = JSON.stringify(datos, null, 2);
                            const blob = new Blob([jsonStr], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `venta-${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                        }}
                        className="rounded-md bg-green-600 px-6 py-2 font-medium text-white transition-colors hover:bg-green-700"
                    >
                        Descargar JSON
                    </button>
                </div>
            </div>
        </AppLayout>
    );
}
