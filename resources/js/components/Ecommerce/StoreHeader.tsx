import { Link } from '@inertiajs/react';
import { ChevronDown, Heart, MapPin, Menu, Phone, Search, User } from 'lucide-react';

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

interface StoreHeaderProps {
    store: Store | null;
    onChangeStore: () => void;
    categorias?: Category[];
    wishlistCount?: number;
    searchQuery?: string;
    onSearch?: (query: string) => void;
}

export default function StoreHeader({ store, onChangeStore, categorias, wishlistCount, searchQuery, onSearch }: StoreHeaderProps) {
    return (
        <header className="fixed top-0 z-[100] w-full bg-white font-['Outfit'] shadow-sm">
            {/* Top Bar - Orange */}
            <div className="bg-[#FF4D00] py-2 text-white">
                <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-6">
                        {/* Selector de Ciudad */}
                        <button
                            onClick={onChangeStore}
                            className="flex items-center gap-1.5 rounded-full bg-black/10 px-3 py-1 text-xs font-bold transition-colors hover:bg-black/20"
                        >
                            <MapPin size={14} className="text-white/80" />
                            <span className="flex items-center gap-1">
                                {store?.ciudad_almacen || 'Seleccionar Ubicación'}
                                <ChevronDown size={12} />
                            </span>
                        </button>

                        <div className="hidden items-center gap-2 text-xs font-bold md:flex">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                                <Phone size={12} className="text-white" />
                            </span>
                            <span>Envíos garantizados a toda Cuba</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-10 text-xs font-bold">
                        <div className="hidden items-center gap-4 lg:flex">
                            <button className="text-white/90 transition-opacity hover:opacity-80">Español</button>
                            <div className="h-3 w-px bg-white/20" />
                            <button className="text-white/90 transition-opacity hover:opacity-80">CUP</button>
                        </div>
                        <a
                            href="tel:+535552430"
                            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-white shadow-sm transition-all hover:bg-white/20"
                        >
                            <Phone size={14} className="text-white/80" />
                            <span>Contáctanos: +535552430</span>
                        </a>
                    </div>
                </div>
            </div>

            {/* Main Header */}
            <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between gap-8">
                    {/* Logo */}
                    <Link href="/ecommerce" className="flex shrink-0 items-center gap-3">
                        <img src="/logo.svg" alt="La Glorieta Logo" className="h-14 w-auto drop-shadow-sm" />
                        <div className="flex flex-col">
                            <span className="text-2xl leading-none font-black tracking-tighter text-slate-900 uppercase">La</span>
                            <span className="text-2xl leading-none font-black tracking-tighter text-[#FF4D00] uppercase">Glorieta</span>
                        </div>
                    </Link>

                    {/* Categorías & Search Area */}
                    <div className="flex flex-1 items-center gap-3">
                        <div className="group relative">
                            <button className="flex h-14 items-center gap-3 rounded-2xl bg-slate-50 px-6 font-bold text-slate-900 transition-all hover:bg-slate-100 active:scale-95">
                                <Menu size={20} className="text-[#FF4D00]" />
                                <span>Categorías</span>
                                <ChevronDown size={16} className="text-slate-400 transition-transform group-hover:rotate-180" />
                            </button>

                            {/* Dropdown Categorías */}
                            <div className="invisible absolute top-full left-0 z-50 mt-2 w-64 translate-y-2 rounded-[2rem] border border-slate-100 bg-white p-4 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                                <div className="space-y-1">
                                    {categorias?.map((cat) => (
                                        <button
                                            key={cat.id}
                                            className="w-full rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-600 transition-colors hover:bg-orange-50 hover:text-[#FF4D00]"
                                        >
                                            {cat.nombre_categoria}
                                        </button>
                                    ))}
                                    {(!categorias || categorias.length === 0) && (
                                        <div className="px-4 py-3 text-sm font-medium text-slate-400">Sin categorías</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-5 h-5 w-5 -translate-y-1/2 text-slate-300" />
                            <input
                                type="text"
                                placeholder="¿Qué buscas en nuestras tiendas?"
                                value={searchQuery}
                                onChange={(e) => onSearch?.(e.target.value)}
                                className="h-14 w-full rounded-2xl border-none bg-slate-50 pr-6 pl-14 text-sm font-bold tracking-tight ring-0 transition-all focus:bg-white focus:ring-4 focus:ring-orange-50"
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <button
                                title="Mi Perfil"
                                className="flex h-12 w-12 items-center justify-center rounded-2xl text-slate-900 transition-all hover:bg-slate-50"
                            >
                                <User size={26} strokeWidth={2.5} />
                            </button>
                            <button
                                title="Lista de Deseos"
                                className="group relative flex h-12 w-12 items-center justify-center rounded-2xl text-slate-900 transition-all hover:bg-slate-50"
                            >
                                <Heart size={26} strokeWidth={2.5} />
                                {wishlistCount ? (
                                    <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF4D00] text-[10px] font-black text-white ring-2 ring-white transition-transform group-hover:scale-110">
                                        {wishlistCount}
                                    </span>
                                ) : null}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
