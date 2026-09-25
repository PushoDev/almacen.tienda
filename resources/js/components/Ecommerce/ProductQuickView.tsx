import { Heart, Package, ShoppingCart, Star, X } from 'lucide-react';

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

interface ProductQuickViewProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    whatsappNumber: string;
    storeName: string;
    isInWishlist?: boolean;
    onToggleWishlist?: () => void;
}

export default function ProductQuickView({
    product,
    isOpen,
    onClose,
    whatsappNumber,
    storeName,
    isInWishlist,
    onToggleWishlist,
}: ProductQuickViewProps) {
    if (!product || !isOpen) return null;

    const precioOriginal = Number(product.precio_venta_actualizado) * 1.31; // Aesthetic markup for discount look

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Modal */}
            <div className="animate-dialog-bounce relative z-10 flex w-full max-w-4xl flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl md:flex-row">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg transition-transform hover:scale-110 active:scale-95"
                >
                    <X size={20} className="text-slate-600" />
                </button>

                {/* Left: Image Section */}
                <div className="relative w-full bg-slate-50 md:w-1/2">
                    <div className="flex h-full min-h-[300px] items-center justify-center p-12">
                        {product.imagen_producto ? (
                            <img
                                src={product.imagen_producto}
                                alt={product.nombre_producto}
                                className="h-full w-full object-contain mix-blend-multiply transition-transform duration-700 hover:scale-105"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-4">
                                <Package className="h-40 w-40 text-slate-200" />
                                <span className="text-xs font-bold text-slate-300">Imagen no disponible</span>
                            </div>
                        )}
                    </div>
                    {/* Badge */}
                    <div className="absolute top-8 left-8">
                        <span className="rounded-full bg-[#FF4D00] px-6 py-2 text-sm font-black text-white shadow-lg">CALIDAD PREMIUM</span>
                    </div>
                </div>

                {/* Right: Info Section */}
                <div className="flex w-full flex-col p-8 md:w-1/2 md:p-12">
                    <div className="mb-2 text-xs font-black tracking-widest text-[#FF7043] uppercase">{product.nombre_categoria}</div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">{product.nombre_producto}</h2>

                    {/* Rating */}
                    <div className="mt-4 flex items-center gap-2">
                        <div className="flex text-[#FFD700]">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={18} fill="#FFD700" stroke="none" />
                            ))}
                        </div>
                        <span className="font-['Outfit'] text-xs font-bold text-slate-400">(4.9/5 estrellas)</span>
                    </div>

                    {/* Price */}
                    <div className="mt-8 flex items-end gap-4">
                        <div className="text-5xl font-black tracking-tight text-[#FF4D00]">
                            ${Number(product.precio_venta_actualizado).toFixed(2)}
                        </div>
                        <div className="mb-1 text-xl font-bold text-slate-400 line-through">${precioOriginal.toFixed(2)}</div>
                    </div>

                    <p className="mt-8 text-base leading-[1.8] font-medium text-slate-500">
                        {product.descripcion_producto ||
                            'Este producto ha sido verificado por nuestros especialistas para garantizar la mejor experiencia de compra en La Glorieta Tiendas.'}
                    </p>

                    {/* Vendor Info */}
                    <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs font-bold text-slate-400">
                            Tienda física: <span className="text-slate-900">{product.nombre_vendedor || storeName}</span>
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="mt-8 flex flex-col gap-4">
                        <a
                            href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                `Hola La Glorieta, me interesa este producto: ${product.nombre_producto} ($${product.precio_venta_actualizado}) visto en su catálogo.`,
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-3 rounded-2xl bg-[#25D366] py-5 text-lg font-black text-white shadow-xl shadow-green-50 transition-all hover:bg-[#1EBE57] hover:shadow-green-100 active:scale-[0.98]"
                        >
                            <ShoppingCart size={22} strokeWidth={3} />
                            Comprar por WhatsApp
                        </a>
                        <button
                            onClick={onToggleWishlist}
                            className={`flex items-center justify-center gap-3 rounded-2xl border-2 py-4 text-sm font-black transition-all active:scale-[0.98] ${
                                isInWishlist
                                    ? 'border-red-100 bg-red-50 text-red-600'
                                    : 'border-slate-100 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            <Heart size={20} fill={isInWishlist ? 'currentColor' : 'none'} />
                            {isInWishlist ? 'En mi lista de deseos' : 'Agregar a lista de deseos'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
