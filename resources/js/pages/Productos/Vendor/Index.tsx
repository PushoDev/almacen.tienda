import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { AlertCircle, Edit, FileText, Save, Sheet, ShoppingBag } from 'lucide-react';
import { useState } from 'react';

// Tipos para los datos de productos
interface Producto {
    id: number;
    nombre_producto: string;
    marca_producto: string;
    categoria: string | null;
    precio_compra: number;
    stock_total: number;
    precio_venta: number | null;
    ganancia: number | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Todos los Productos', href: '/productos' },
    { title: 'Productos Disponibles', href: '#' },
];

export default function VendedorPage({ productos, meta }: { productos: Producto[]; meta: { total_productos: number; role_usuario: string } }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
    const [newPrice, setNewPrice] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formatCurrency = (value: number | null) => {
        if (value === null) return 'No definido';
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(value);
    };

    const openModal = (producto: Producto) => {
        setSelectedProduct(producto);
        setNewPrice(producto.precio_venta?.toString() || '');
        setError(null);
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!selectedProduct || !newPrice) return;

        const parsedPrice = parseFloat(newPrice);
        if (isNaN(parsedPrice) || parsedPrice <= 0) {
            setError('El precio debe ser un número positivo');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/disponibles/${selectedProduct.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ precio_venta: parsedPrice }),
            });

            if (!response.ok) throw new Error('Error al actualizar el precio');

            alert('Precio actualizado correctamente');
            setIsModalOpen(false);
        } catch (err: Error) {
            console.error('Error al actualizar precio:', err); // Para depuración
            setError(`No se pudo actualizar el precio: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Productos Disponibles" />
            <div className="flex flex-col gap-4 p-4">
                {/* Header */}
                <div className="border-sidebar-accent bg-sidebar relative rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Opciones Generales del Sistema" description="Gestión del Negocio. Listado de Productos disponibles" />
                    <ShoppingBag size={70} color="#d6d3d1" className="absolute right-2 bottom-0 opacity-40" />
                </div>

                <Separator />

                {/* Acciones */}
                <div className="flex justify-end gap-2">
                    <Button variant="outline" className="hover:bg-chart-5 gap-2">
                        <FileText size={16} />
                        Exportar PDF
                    </Button>
                    <Button variant="secondary" className="hover:bg-chart-2 gap-2">
                        <Sheet size={16} />
                        Exportar Excel
                    </Button>
                </div>

                {/* Tabla de Productos */}
                <div className="mt-4 overflow-x-auto">
                    {productos.length > 0 ? (
                        <table className="min-w-full rounded-lg border border-gray-200 bg-white shadow-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Producto</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Marca</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Categoría</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Precio Compra</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Stock</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Precio Venta</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ganancia</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {productos.map((producto, index) => (
                                    <tr key={index} className="transition-colors hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-800">{producto.nombre_producto}</td>
                                        <td className="px-4 py-3 text-sm text-gray-800">{producto.marca_producto}</td>
                                        <td className="px-4 py-3 text-sm text-gray-800">{producto.categoria || 'Sin categoría'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-800">{formatCurrency(producto.precio_compra)}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{producto.stock_total}</td>
                                        <td className={`px-4 py-3 text-sm ${producto.precio_venta === null ? 'text-gray-400' : 'text-gray-800'}`}>
                                            {formatCurrency(producto.precio_venta)}
                                        </td>
                                        <td
                                            className={`px-4 py-3 text-sm font-medium ${producto.ganancia !== null && producto.ganancia >= 0 ? 'text-green-600' : 'text-gray-400'}`}
                                        >
                                            {producto.ganancia !== null ? formatCurrency(producto.ganancia) : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-blue-600 hover:text-blue-800"
                                                onClick={() => openModal(producto)}
                                            >
                                                <Edit size={16} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-gray-50 py-12">
                            <AlertCircle size={48} className="mb-3 text-gray-400" />
                            <h3 className="text-lg font-medium text-gray-700">No hay productos disponibles</h3>
                            <p className="text-sm text-gray-500">No se encontraron productos para mostrar.</p>
                        </div>
                    )}
                </div>

                {/* Resumen */}
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <p>
                        Total de productos: <span className="font-medium">{meta.total_productos}</span>
                    </p>
                    <p>
                        Rol actual: <span className="font-medium">{meta.role_usuario === 'admin' ? 'Administrador' : 'Vendedor'}</span>
                    </p>
                </div>
            </div>

            {/* Modal de edición */}
            {isModalOpen && selectedProduct && (
                <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <h3 className="mb-4 text-lg font-semibold">Editar Precio de Venta</h3>

                        <div className="mb-4">
                            <label className="mb-1 block text-sm font-medium text-gray-700">Producto: {selectedProduct.nombre_producto}</label>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Precio de Compra: {formatCurrency(selectedProduct.precio_compra)}
                            </label>
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Ganancia Actual: {selectedProduct.ganancia !== null ? formatCurrency(selectedProduct.ganancia) : 'No definida'}
                            </label>
                        </div>

                        <div className="mb-4">
                            <label className="mb-1 block text-sm font-medium text-gray-700">Nuevo Precio de Venta</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="0.00"
                            />
                            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isLoading}>
                                Cancelar
                            </Button>
                            <Button
                                variant="default"
                                className="bg-blue-600 text-white hover:bg-blue-700"
                                onClick={handleSubmit}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span className="flex items-center">
                                        <span className="mr-2 animate-spin">🔄</span>
                                        Guardando...
                                    </span>
                                ) : (
                                    <span className="flex items-center">
                                        <Save size={16} className="mr-2" />
                                        Guardar
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
