import HeadingSmall from '@/components/heading-small';
import { CursorFollow, CursorProvider } from '@/components/ui/cursor';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ShoppingBag } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Caja Principal',
        href: '/dashboard',
    },
    {
        title: 'Productos',
        href: '/productos',
    },
    {
        title: 'Nueva Compra',
        href: 'comprar',
    },
    {
        title: 'Realizar Venta',
        href: '#',
    },
];

export default function PuntoVentaPage() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Punto Venta" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <CursorProvider>
                        <CursorFollow>
                            <div className="bg-sidebar-accent rounded-lg px-2 py-1 text-sm text-white shadow-lg">Punto de Venta</div>
                        </CursorFollow>
                    </CursorProvider>
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamineto"
                    />
                    {/* Ícono semitransparente */}
                    <ShoppingBag
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />
                {/* POS - Punto de Venta */}
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Columna 1: Productos Disponibles */}
                    <div className="flex flex-col space-y-4">
                        {/* Input de búsqueda */}
                        <div>
                            <input
                                type="text"
                                placeholder="Buscar productos..."
                                className="w-full rounded-lg border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
                            />
                        </div>

                        {/* Tabla de productos */}
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative flex-1 overflow-hidden rounded-xl border">
                            {/* Simulando tabla o listado */}
                            <div className="p-4">
                                <h3 className="mb-2 text-lg font-semibold">Productos Disponibles</h3>
                                <table className="w-full table-auto text-left">
                                    <thead>
                                        <tr className="border-b dark:border-gray-700">
                                            <th className="px-2 py-1">Nombre</th>
                                            <th className="px-2 py-1">Precio</th>
                                            <th className="px-2 py-1">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b dark:border-gray-700">
                                            <td className="px-2 py-1">Producto 1</td>
                                            <td className="px-2 py-1">$10.00</td>
                                            <td className="px-2 py-1">
                                                <button className="rounded bg-blue-500 px-2 py-1 text-white">Agregar</button>
                                            </td>
                                        </tr>
                                        {/* Más filas... */}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Columna 2: Productos Seleccionados y Resumen de Venta */}
                    <div className="flex flex-col space-y-4">
                        {/* Productos seleccionados */}
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative flex-1 overflow-hidden rounded-xl border">
                            <div className="p-4">
                                <h3 className="mb-2 text-lg font-semibold">Productos Seleccionados</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between rounded bg-gray-100 p-2 dark:bg-gray-700">
                                        <span>Producto 1</span>
                                        <span>$10.00</span>
                                    </div>
                                    {/* Más productos seleccionados... */}
                                </div>
                            </div>
                        </div>

                        {/* Resumen de venta */}
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border bg-green-50 dark:bg-green-900/20">
                            <div className="p-4">
                                <h3 className="mb-2 text-lg font-semibold">Resumen de Venta</h3>
                                <div className="space-y-1">
                                    <p>Total de productos: 2</p>
                                    <p className="text-xl font-bold text-green-600 dark:text-green-400">Total: $20.00</p>
                                </div>
                                <button className="mt-4 w-full rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700">Proceder a Pagar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
