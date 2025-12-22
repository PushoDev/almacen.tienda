import ProductQuickView from '@/components/Ecommerce/ProductQuickView';
import StoreHeader from '@/components/Ecommerce/StoreHeader';
import StoreSelector from '@/components/Ecommerce/StoreSelector';
import { Head, Link, usePage } from '@inertiajs/react';
import { Heart, MapPin, MessageSquare, Package, ShieldCheck, ShoppingCart, Star, Users, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface Store {
    id: number;
    nombre_almacen: string;
    ciudad_almacen: string;
    provincia_almacen: string;
    telefono_almacen: string;
    correo_almacen?: string;
}

interface Category {
    id: number;
    nombre_categoria: string;
    imagen_categoria?: string;
}

interface Product {
    id: number;
    nombre_producto: string;
    descripcion_producto?: string;
    imagen_producto?: string;
    nombre_categoria: string;
    stock_actual: number;
    precio_venta_actualizado: string | number;
    nombre_vendedor?: string;
}

interface Product {
    id: number;
    nombre_producto: string;
    descripcion_producto?: string;
    imagen_producto?: string;
    nombre_categoria: string;
    stock_actual: number;
    precio_venta_actualizado: string | number;
}

interface EcommerceProps {
    almacenSeleccionado?: Store;
    hasSelection: boolean;
    categorias: Category[];
    [key: string]: any;
}

export default function EcommerceIndex() {
    const { props } = usePage<EcommerceProps>();

    const [selectedStore, setSelectedStore] = useState<Store | null>(props.almacenSeleccionado || null);
    const [showSelector, setShowSelector] = useState(!props.hasSelection);
    const [products, setProducts] = useState<Product[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
    const [wishlist, setWishlist] = useState<number[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('wishlist') || '[]');
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }, [wishlist]);

    const toggleWishlist = (id: number) => {
        setWishlist((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    };

    const slides = [
        {
            image: '/home/Slider1.png',
            title: 'TECNOLOGÍA DE VANGUARDIA',
            subtitle: 'Lo mejor en electrónica para tu hogar',
            buttonText: 'Ver Catálogo',
            color: 'from-blue-600/10 to-indigo-600/10',
        },
        {
            image: '/home/Slider2.png',
            title: 'ESTILO Y COMODIDAD',
            subtitle: 'Productos exclusivos para tu día a día',
            buttonText: 'Explorar Más',
            color: 'from-emerald-600/10 to-teal-600/10',
        },
    ];

    const fetchProducts = useCallback(async () => {
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
    }, [selectedStore]);

    useEffect(() => {
        if (!props.hasSelection) {
            setShowSelector(true);
        } else if (props.almacenSeleccionado) {
            setSelectedStore(props.almacenSeleccionado);
            fetchProducts();
        }
    }, [props.hasSelection, props.almacenSeleccionado, fetchProducts]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides.length]);

    const handleSelectStore = (store: Store) => {
        setSelectedStore(store);
        setShowSelector(false);
    };

    const handleChangeStore = () => {
        setShowSelector(true);
    };

    const filteredProducts = useMemo(() => {
        return products.filter((p) => {
            const matchesCategory = !selectedCategory || p.nombre_categoria === selectedCategory;
            const matchesSearch = !searchQuery || p.nombre_producto.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [products, selectedCategory, searchQuery]);

    return (
        <div className="min-h-screen bg-[#FDFDFD] font-['Outfit'] text-slate-900 selection:bg-blue-100 dark:bg-[#FDFDFD] dark:text-slate-900">
            <Head title="La Glorieta - Tienda Premium">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=outfit:400,500,600,700" rel="stylesheet" />
            </Head>

            <StoreHeader
                store={selectedStore}
                onChangeStore={handleChangeStore}
                categorias={props.categorias}
                wishlistCount={wishlist.length}
                searchQuery={searchQuery}
                onSearch={setSearchQuery}
            />

            <StoreSelector
                isOpen={showSelector}
                onClose={() => setShowSelector(false)}
                onSelectStore={handleSelectStore}
                selectedStoreId={selectedStore?.id}
            />

            <ProductQuickView
                product={quickViewProduct}
                isOpen={!!quickViewProduct}
                onClose={() => setQuickViewProduct(null)}
                whatsappNumber={selectedStore?.telefono_almacen || ''}
                storeName={selectedStore?.nombre_almacen || 'La Glorieta'}
                isInWishlist={quickViewProduct ? wishlist.includes(quickViewProduct.id) : false}
                onToggleWishlist={quickViewProduct ? () => toggleWishlist(quickViewProduct.id) : () => {}}
            />

            <main className="pt-[140px] pb-20">
                {selectedStore ? (
                    <>
                        {/* Hero Slider */}
                        <section className="relative h-[350px] w-full overflow-hidden bg-white lg:h-[450px]">
                            {slides.map((slide, index) => (
                                <div
                                    key={index}
                                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                                        index === currentSlide ? 'opacity-100' : 'opacity-0'
                                    }`}
                                >
                                    <img src={slide.image} alt={slide.title} className="h-full w-full object-cover" />
                                    <div className={`absolute inset-0 bg-gradient-to-r ${slide.color} backdrop-blur-[1px]`} />
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                                            <div className="animate-in fade-in slide-in-from-left max-w-xl duration-700">
                                                <h2 className="text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">{slide.title}</h2>
                                                <p className="mt-4 text-xl text-slate-700">{slide.subtitle}</p>
                                                <div className="mt-8">
                                                    <button className="rounded-full bg-blue-600 px-8 py-3 text-lg font-semibold text-white shadow-lg transition-all hover:bg-blue-700 hover:shadow-xl active:scale-95">
                                                        {slide.buttonText}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
                                {slides.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentSlide(i)}
                                        className={`h-2 rounded-full transition-all ${i === currentSlide ? 'w-8 bg-blue-600' : 'w-2 bg-slate-300'}`}
                                    />
                                ))}
                            </div>
                        </section>

                        {/* Category Navigation - Real Categories */}
                        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                            <div className="mb-8 flex items-center justify-between border-b pb-4">
                                <h3 className="text-2xl font-black text-slate-900">Categorías Disponibles</h3>
                                {selectedCategory && (
                                    <button onClick={() => setSelectedCategory(null)} className="text-sm font-bold text-blue-600 hover:underline">
                                        Limpiar filtro
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => setSelectedCategory(null)}
                                    className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
                                        !selectedCategory
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    Todos
                                </button>
                                {props.categorias?.map((cat) => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategory(cat.nombre_categoria)}
                                        className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
                                            selectedCategory === cat.nombre_categoria
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {cat.nombre_categoria}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Feature Banners - Pure White Background */}
                        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                <div className="group relative overflow-hidden rounded-[2rem] bg-orange-500 p-8 text-white shadow-xl transition-transform hover:scale-[1.02]">
                                    <div className="relative z-10 text-center">
                                        <Zap className="mx-auto mb-4 h-12 w-12 text-orange-200" />
                                        <h4 className="text-2xl font-black uppercase">Ofertas Flash</h4>
                                        <p className="mt-2 font-medium opacity-90">Precios de locura por 24h</p>
                                    </div>
                                    <div className="absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-orange-400/50" />
                                </div>
                                <div className="group relative overflow-hidden rounded-[2rem] bg-indigo-600 p-8 text-white shadow-xl transition-transform hover:scale-[1.02]">
                                    <div className="relative z-10 text-center">
                                        <Star className="mx-auto mb-4 h-12 w-12 text-indigo-200" />
                                        <h4 className="text-2xl font-black uppercase">Top Ventas</h4>
                                        <p className="mt-2 font-medium opacity-90">Nuestros productos estrella</p>
                                    </div>
                                    <div className="absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-indigo-500/50" />
                                </div>
                                <div className="group relative overflow-hidden rounded-[2rem] bg-[#10B981] p-8 text-white shadow-xl transition-transform hover:scale-[1.02]">
                                    <div className="relative z-10 text-center">
                                        <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-emerald-100" />
                                        <h4 className="text-2xl font-black uppercase">Novedades</h4>
                                        <p className="mt-2 font-medium opacity-90">Lo último en ingresar</p>
                                    </div>
                                    <div className="absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-emerald-500/50" />
                                </div>
                            </div>
                        </section>

                        {/* Products Section */}
                        <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
                            <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                                <div>
                                    <h3 className="text-3xl font-black text-slate-900">{selectedCategory || 'Explorar Catálogo'}</h3>
                                    <div className="mt-2 h-1.5 w-20 rounded-full bg-[#FF4D00]" />
                                </div>
                            </div>

                            {productsLoading ? (
                                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="h-96 animate-pulse rounded-[2.5rem] bg-slate-100" />
                                    ))}
                                </div>
                            ) : filteredProducts.length > 0 ? (
                                <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
                                    {filteredProducts.map((product) => (
                                        <div
                                            key={product.id}
                                            onClick={() => setQuickViewProduct(product)}
                                            className="group relative flex cursor-pointer flex-col rounded-[2.5rem] border border-slate-100 bg-white p-3 shadow-none transition-all duration-500 hover:bg-slate-50/50 hover:shadow-[0_20px_50px_rgba(255,77,0,0.05)]"
                                        >
                                            {/* Product Image Container */}
                                            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-slate-50 bg-slate-50">
                                                {product.imagen_producto ? (
                                                    <img
                                                        src={product.imagen_producto}
                                                        alt={product.nombre_producto}
                                                        className="h-full w-full object-contain p-4 mix-blend-multiply transition-transform duration-700 group-hover:scale-110"
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center">
                                                        <Package className="h-20 w-20 text-slate-200" />
                                                    </div>
                                                )}

                                                <div className="absolute top-4 left-4">
                                                    <span className="rounded-full bg-white/90 px-4 py-1.5 text-[10px] font-black tracking-widest text-[#FF4D00] shadow-sm backdrop-blur">
                                                        {product.nombre_categoria.toUpperCase()}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleWishlist(product.id);
                                                    }}
                                                    className={`absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition-all hover:scale-110 ${wishlist.includes(product.id) ? 'text-red-500' : 'text-slate-300'}`}
                                                >
                                                    <Heart size={18} fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} />
                                                </button>

                                                <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <div className="rounded-full bg-white px-6 py-2.5 text-xs font-black text-slate-900 shadow-xl">
                                                        VISTA RÁPIDA
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Product Info */}
                                            <div className="flex flex-1 flex-col p-5">
                                                <h4 className="line-clamp-1 text-lg font-bold text-slate-900 transition-colors group-hover:text-[#FF4D00]">
                                                    {product.nombre_producto}
                                                </h4>
                                                <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-relaxed text-slate-500">
                                                    {product.descripcion_producto || 'No hay descripción disponible para este producto.'}
                                                </p>

                                                <div className="mt-auto flex items-center justify-between pt-6">
                                                    <div>
                                                        <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Precio</div>
                                                        <div className="text-2xl font-black tracking-tight text-[#FF4D00]">
                                                            ${Number(product.precio_venta_actualizado).toFixed(2)}
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(
                                                                `https://wa.me/${selectedStore.telefono_almacen?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                                                    `Hola, me interesa el producto: ${product.nombre_producto} ($${product.precio_venta_actualizado}) visto en su tienda online (${selectedStore.nombre_almacen})`,
                                                                )}`,
                                                                '_blank',
                                                            );
                                                        }}
                                                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-lg shadow-green-100 transition-all hover:scale-110 active:scale-95"
                                                    >
                                                        <ShoppingCart size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-[3rem] border-2 border-dashed border-slate-100 bg-white p-24 text-center">
                                    <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-50">
                                        <Package className="h-12 w-12 text-slate-300" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900">Ups, nada por aquí</h3>
                                    <p className="mt-3 text-slate-500">Estamos actualizando nuestro stock. Vuelve pronto.</p>
                                </div>
                            )}
                        </section>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center px-4 py-40 text-center">
                        <div className="mb-12 flex flex-col items-center">
                            <img src="/logo.svg" alt="La Glorieta Logo" className="mb-6 h-24 w-auto scale-150" />
                            <div className="flex items-center gap-1">
                                <span className="text-4xl font-black tracking-tighter text-slate-900">La</span>
                                <span className="text-4xl font-black tracking-tighter text-[#FF4D00]">Glorieta</span>
                            </div>
                        </div>
                        <h3 className="text-5xl font-black tracking-tighter text-slate-900">Inicia tu Compra en Toda Cuba</h3>
                        <p className="mt-6 max-w-lg text-xl font-medium text-slate-500">
                            Descubre productos únicos con envíos a toda la isla. Selecciona una tienda para ver promociones y disponibilidad.
                        </p>
                        <button
                            onClick={handleChangeStore}
                            className="mt-12 rounded-full bg-[#FF4D00] px-12 py-5 text-xl font-black text-white shadow-2xl shadow-orange-100 transition-all hover:-translate-y-1 hover:bg-[#E64500] active:scale-95"
                        >
                            Ver Tiendas en Cuba
                        </button>
                    </div>
                )}
            </main>

            {/* Feature Highlights (As per uploaded_image_1) */}
            <section className="border-t border-slate-100 bg-white py-20">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { icon: MessageSquare, title: 'Compra directa', desc: 'Contacta vendedores por WhatsApp' },
                            { icon: ShieldCheck, title: 'Sin pagos en línea', desc: 'Paga al recibir tu producto' },
                            { icon: Users, title: 'Atención personalizada', desc: 'Soporte directo de tiendas reales' },
                            { icon: MapPin, title: 'Alcance Nacional', desc: 'Desde Pinar del Río hasta Guantánamo' },
                        ].map((item, i) => (
                            <div key={i} className="flex flex-col items-center text-center">
                                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-[#FF4D00]">
                                    <item.icon size={28} />
                                </div>
                                <h4 className="text-lg font-black text-slate-900">{item.title}</h4>
                                <p className="mt-2 text-sm font-medium text-slate-500">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* La Glorieta Footer (Dark Mode) */}
            <footer className="bg-[#1A1C1E] py-20 text-white">
                <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
                        {/* Company Info */}
                        <div className="lg:col-span-5">
                            <Link href="/ecommerce" className="flex items-center gap-1">
                                <span className="text-3xl font-black tracking-tighter text-white">La</span>
                                <span className="text-3xl font-black tracking-tighter text-[#FF4D00]">Glorieta</span>
                            </Link>
                            <p className="mt-8 max-w-md text-sm leading-[2] font-medium text-slate-400">
                                La Glorieta Tiendas es el marketplace líder en Cuba. Conectamos compradores con almacenes y tiendas físicas en todo el
                                país. Sin pagos en línea obligatorios, con total transparencia y seguridad.
                            </p>
                            <div className="mt-8 flex items-center gap-2 text-sm font-bold text-slate-400">
                                <MapPin size={16} />
                                <span>Disponible en toda Cuba</span>
                            </div>
                        </div>

                        {/* Enlaces */}
                        <div className="lg:col-span-3">
                            <h5 className="text-lg font-black">Explorar</h5>
                            <ul className="mt-8 space-y-4">
                                {['Inicio', 'Catálogo Nacional', 'Ofertas Premium', 'Garantía'].map((link) => (
                                    <li key={link}>
                                        <button className="text-sm font-bold text-slate-400 transition-colors hover:text-[#FF4D00]">{link}</button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Administrar */}
                        <div className="lg:col-span-4">
                            <h5 className="text-lg font-black">Gestión</h5>
                            <div className="mt-8">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-sm font-black text-white shadow-xl transition-all hover:bg-white/10 active:scale-95"
                                >
                                    <Users size={18} />
                                    Administrar Sistema
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="mt-20 flex flex-col items-center justify-between gap-8 border-t border-white/5 pt-10 md:flex-row">
                        <p className="text-sm font-bold text-slate-500">
                            &copy; {new Date().getFullYear()} La Glorieta Tiendas. Especialistas en distribución nacional.
                        </p>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                            Desarrollado con <Heart size={14} className="text-[#FF4D00]" fill="#FF4D00" /> por
                            <a href="https://pushodev.vercel.app" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
                                Luis A. Guisado – PushoDev
                            </a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Floating Top-Up Button */}
            <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="fixed right-8 bottom-8 z-[150] flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF4D00] text-white shadow-2xl shadow-orange-200 transition-all hover:-translate-y-2 hover:bg-[#E64500] active:scale-95"
            >
                <Zap size={24} fill="currentColor" />
            </button>
        </div>
    );
}
