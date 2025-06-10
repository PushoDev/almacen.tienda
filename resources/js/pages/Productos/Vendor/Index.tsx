import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils'; // Asegúrate de tener esta utilidad
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { AlertCircle, Edit, FileText, PlusCircle, Save, Sheet, ShoppingBag } from 'lucide-react';
import { useState } from 'react';

interface Producto {
    id: number;
    nombre_producto: string;
    marca_producto: string;
    categoria: string;
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

export default function VendedorPage({
    productos: initialProductos,
    meta,
}: {
    productos: Producto[];
    meta: { total_productos: number; role_usuario: string };
}) {
    // Estado local para manejar los productos
    const [productos, setProductos] = useState<Producto[]>(initialProductos);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
    const [newPrice, setNewPrice] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(true);

    const formatCurrency = (value: number | null) => {
        if (value === null) return 'No definido';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const openEditModal = (producto: Producto) => {
        setSelectedProduct(producto);
        setNewPrice(producto.precio_venta?.toString() || '');
        setError(null);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const openAddModal = (producto: Producto) => {
        setSelectedProduct(producto);
        setNewPrice('');
        setError(null);
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!selectedProduct || !newPrice) return;

        const parsedPrice = parseFloat(newPrice);

        // Validación mejorada
        if (isNaN(parsedPrice) || parsedPrice < 0.01) {
            setError('El precio debe ser un número positivo mayor a 0.00');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/disponibles/${selectedProduct.id}`, {
                method: 'PUT', // Usamos PUT para ambas operaciones
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ precio_venta: parsedPrice }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al actualizar el precio');
            }

            // Actualizar el estado local inmediatamente
            setProductos((prev) =>
                prev.map((p) =>
                    p.id === selectedProduct.id
                        ? {
                              ...p,
                              precio_venta: parsedPrice,
                              ganancia: parsedPrice - p.precio_compra, // Calcular ganancia
                          }
                        : p,
                ),
            );

            setIsModalOpen(false);
        } catch (err) {
            console.error('Error en la solicitud:', err);
            setError(err instanceof Error ? err.message : 'Error inesperado al procesar la solicitud');
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
                    <HeadingSmall
                        title="Gestión de Precios de Venta"
                        description="Asigne precios a los productos disponibles para su comercialización"
                    />
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
                        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                            <table className="min-w-full">
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
                                    {productos.map((producto) => (
                                        <tr key={producto.id} className="transition-colors hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-800">{producto.nombre_producto}</td>
                                            <td className="px-4 py-3 text-sm text-gray-800">{producto.marca_producto}</td>
                                            <td className="px-4 py-3 text-sm text-gray-800">{producto.categoria || 'Sin categoría'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-800">{formatCurrency(producto.precio_compra)}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-800">{producto.stock_total}</td>
                                            <td
                                                className={cn(
                                                    'px-4 py-3 text-sm',
                                                    producto.precio_venta === null ? 'text-gray-400 italic' : 'text-gray-800',
                                                )}
                                            >
                                                {formatCurrency(producto.precio_venta)}
                                            </td>
                                            <td
                                                className={cn(
                                                    'px-4 py-3 text-sm font-medium',
                                                    producto.ganancia === null
                                                        ? 'text-gray-400 italic'
                                                        : producto.ganancia >= 0
                                                          ? 'text-green-600'
                                                          : 'text-red-600',
                                                )}
                                            >
                                                {formatCurrency(producto.ganancia)}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={cn(
                                                        producto.precio_venta !== null
                                                            ? 'text-blue-600 hover:text-blue-800'
                                                            : 'text-green-600 hover:text-green-800',
                                                    )}
                                                    onClick={() =>
                                                        producto.precio_venta !== null ? openEditModal(producto) : openAddModal(producto)
                                                    }
                                                >
                                                    {producto.precio_venta !== null ? <Edit size={16} /> : <PlusCircle size={16} />}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-gray-50 py-12">
                            <AlertCircle size={48} className="mb-3 text-gray-400" />
                            <h3 className="text-lg font-medium text-gray-700">No hay productos disponibles</h3>
                            <p className="text-sm text-gray-500">Agregue productos al sistema para comenzar</p>
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

            {/* Modal de precio */}
            {isModalOpen && selectedProduct && (
                <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <h3 className="mb-4 text-lg font-semibold">{isEditMode ? 'Editar Precio de Venta' : 'Agregar Precio de Venta'}</h3>

                        <div className="mb-4 space-y-2">
                            <p className="text-sm">
                                <span className="font-medium">Producto:</span> {selectedProduct.nombre_producto}
                            </p>
                            <p className="text-sm">
                                <span className="font-medium">Precio de Compra:</span> {formatCurrency(selectedProduct.precio_compra)}
                            </p>
                            {isEditMode && selectedProduct.precio_venta !== null && (
                                <p className="text-sm">
                                    <span className="font-medium">Ganancia Actual:</span>{' '}
                                    {selectedProduct.ganancia !== null ? formatCurrency(selectedProduct.ganancia) : 'No definida'}
                                </p>
                            )}
                        </div>

                        <div className="mb-4">
                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                {isEditMode ? 'Nuevo Precio de Venta' : 'Precio de Venta'}
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={newPrice}
                                onChange={(e) => setNewPrice(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                placeholder="Ej: 24.99"
                            />
                            <p className="mt-1 text-xs text-gray-500">Mínimo: $0.01</p>
                            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isLoading}>
                                Cancelar
                            </Button>
                            <Button variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={handleSubmit} disabled={isLoading}>
                                {isLoading ? (
                                    <span className="flex items-center">
                                        <span className="mr-2 animate-spin">🔄</span>
                                        Procesando...
                                    </span>
                                ) : (
                                    <span className="flex items-center">
                                        <Save size={16} className="mr-2" />
                                        {isEditMode ? 'Actualizar' : 'Agregar'}
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
