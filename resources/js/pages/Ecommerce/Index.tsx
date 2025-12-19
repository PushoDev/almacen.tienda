import StoreHeader from '@/components/Ecommerce/StoreHeader';
import StoreSelector from '@/components/Ecommerce/StoreSelector';
import { Head, usePage } from '@inertiajs/react';
import { Package } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Store {
    id: number;
    nombre_almacen: string;
    ciudad_almacen: string;
    provincia_almacen: string;
    telefono_almacen: string;
    correo_almacen?: string;
}

interface EcommerceProps {
    almacenSeleccionado?: Store;
    hasSelection: boolean;
    [key: string]: any;
}

export default function EcommerceIndex() {
    const props = usePage<EcommerceProps>().props;

    const [selectedStore, setSelectedStore] = useState<Store | null>(props.almacenSeleccionado || null);
    const [showSelector, setShowSelector] = useState(!props.hasSelection);
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

    const handleSelectStore = (store: Store) => {
        setSelectedStore(store);
        setShowSelector(false);
        // El fetchProducts usará el store que acabamos de setear
        // pero necesitamos forzar el fetch aquí o useEffect reaccionará
    };

    useEffect(() => {
        if (selectedStore) {
            fetchProducts();
        }
    }, [selectedStore]);

    const handleChangeStore = () => {
        setShowSelector(true);
    };

    return (
        <>
            <Head title="La Glorieta - Tienda Online">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />
            </Head>

            <StoreHeader store={selectedStore} onChangeStore={handleChangeStore} />

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
                                                        {product.pivot?.cantidad !== undefined && (
                                                            <div className="mt-1 text-xs text-slate-500">
                                                                Stock:{' '}
                                                                <span
                                                                    className={
                                                                        product.pivot.cantidad > 0
                                                                            ? 'font-semibold text-green-600'
                                                                            : 'font-semibold text-red-600'
                                                                    }
                                                                >
                                                                    {product.pivot.cantidad > 0 ? product.pivot.cantidad : 'Agotado'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* WhatsApp Buy Button */}
                                                    <a
                                                        href={`https://wa.me/${selectedStore.telefono_almacen?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                                            `Hola, me interesa el producto: ${product.nombre_producto} ($${product.precio_venta_actualizado}) visto en su tienda online (${selectedStore.nombre_almacen})`,
                                                        )}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                                                    >
                                                        <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                        </svg>
                                                        <span className="hidden sm:inline">WhatsApp</span>
                                                    </a>
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
