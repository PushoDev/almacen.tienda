import StoreHeader from '@/Components/Ecommerce/StoreHeader';
import StoreSelector from '@/Components/Ecommerce/StoreSelector';
import { type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Package, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Store {
    id: number;
    nombre_almacen: string;
    ciudad_almacen: string;
    provincia_almacen: string;
}

interface EcommerceProps {
    almacenSeleccionado?: Store;
    hasSelection: boolean;
}

export default function EcommerceIndex() {
    const { auth } = usePage<SharedData>().props;
    const props = usePage<EcommerceProps>().props;

    const [selectedStore, setSelectedStore] = useState<Store | null>(props.almacenSeleccionado || null);
    const [showSelector, setShowSelector] = useState(!props.hasSelection);
    const [isLoading, setIsLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);

    useEffect(() => {
        // Obtener el almacén actual de la sesión al cargar
        if (!props.hasSelection) {
            setShowSelector(true);
        } else if (props.almacenSeleccionado) {
            setSelectedStore(props.almacenSeleccionado);
            fetchProducts();
        }
    }, []);

    const fetchProducts = async () => {
        if (!selectedStore) return;

        setProductsLoading(true);
        try {
            const response = await fetch('/api/ecommerce/almacen/productos');
            const data = await response.json();
            if (data && !data.error) {
                setProducts(data.data || data);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setProductsLoading(false);
        }
    };

    const handleSelectStore = (storeId: number) => {
        // La tienda ya fue guardada en sesión por el StoreSelector
        // Actualizar el estado local
        const store = selectedStore;
        setShowSelector(false);
        fetchProducts();
    };

    const handleChangeStore = () => {
        setShowSelector(true);
    };

    return (
        <>
            <Head title="La Glorieta - Tienda Online">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
            </Head>

            <StoreHeader store={selectedStore} onChangeStore={handleChangeStore} isLoading={isLoading} />

            <StoreSelector
                isOpen={showSelector}
                onClose={() => setShowSelector(false)}
                onSelectStore={handleSelectStore}
                selectedStoreId={selectedStore?.id}
            />

            <main className="flex-1 bg-slate-50 dark:bg-slate-900">
                {selectedStore ? (
                    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                        {/* Welcome Banner */}
                        <div className="mb-8 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white">
                            <h2 className="text-3xl font-bold">Bienvenido a {selectedStore.nombre_almacen}</h2>
                            <p className="mt-2 text-blue-100">Explora nuestros productos disponibles</p>
                        </div>

                        {/* Products Section */}
                        <div>
                            <div className="mb-6 flex items-center gap-3">
                                <Package className="h-6 w-6 text-blue-600" />
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Productos Disponibles</h3>
                            </div>

                            {productsLoading ? (
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="h-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
                                    ))}
                                </div>
                            ) : products.length > 0 ? (
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                    {products.map((product: any) => (
                                        <div
                                            key={product.id}
                                            className="group overflow-hidden rounded-lg border border-slate-200 bg-white transition-all duration-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
                                        >
                                            {/* Product Image */}
                                            <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-700">
                                                {product.imagen_producto ? (
                                                    <img
                                                        src={product.imagen_producto}
                                                        alt={product.nombre_producto}
                                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center">
                                                        <Package className="h-12 w-12 text-slate-400" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Product Info */}
                                            <div className="p-4">
                                                <h4 className="line-clamp-2 font-semibold text-slate-900 dark:text-white">
                                                    {product.nombre_producto}
                                                </h4>
                                                {product.descripcion_producto && (
                                                    <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                                                        {product.descripcion_producto}
                                                    </p>
                                                )}

                                                {/* Price */}
                                                <div className="mt-4 flex items-end justify-between">
                                                    <div>
                                                        <span className="text-2xl font-bold text-blue-600">${product.precio_venta_actualizado}</span>
                                                    </div>

                                                    {/* Add to Cart Button */}
                                                    <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                                                        <ShoppingCart className="h-4 w-4" />
                                                        <span className="hidden sm:inline">Agregar</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-600 dark:bg-slate-800/50">
                                    <Package className="mx-auto h-12 w-12 text-slate-400" />
                                    <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No hay productos disponibles</h3>
                                    <p className="mt-2 text-slate-600 dark:text-slate-400">Por favor, selecciona otra tienda o intenta más tarde</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center py-32">
                        <div className="text-center">
                            <Package className="mx-auto h-16 w-16 text-slate-400" />
                            <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">Selecciona una tienda para comenzar</h3>
                            <p className="mt-2 text-slate-600 dark:text-slate-400">Haz clic en "Seleccionar Tienda" en la parte superior</p>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
