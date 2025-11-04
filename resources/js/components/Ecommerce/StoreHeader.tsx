import { Link } from '@inertiajs/react';
import { ChevronDown, LogOut, MapPin } from 'lucide-react';

interface Store {
    id: number;
    nombre_almacen: string;
    ciudad_almacen: string;
    provincia_almacen: string;
}

interface StoreHeaderProps {
    store?: Store;
    onChangeStore: () => void;
    isLoading?: boolean;
}

export default function StoreHeader({ store, onChangeStore, isLoading = false }: StoreHeaderProps) {
    return (
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex-1">
                        <h1 className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-2xl font-bold text-transparent">
                            La Glorieta Tiendas
                        </h1>
                    </div>

                    {/* Store Selector */}
                    {store ? (
                        <div className="flex items-center gap-4">
                            <div className="hidden text-right md:block">
                                <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                                    <MapPin className="h-4 w-4" />
                                    <span>Comprar en:</span>
                                </div>
                                <div className="font-semibold text-slate-900 dark:text-white">{store.nombre_almacen}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-500">
                                    {store.ciudad_almacen}, {store.provincia_almacen}
                                </div>
                            </div>

                            <button
                                onClick={onChangeStore}
                                disabled={isLoading}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                <ChevronDown className="h-4 w-4" />
                                <span className="hidden sm:inline">Cambiar</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onChangeStore}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                        >
                            <MapPin className="h-4 w-4" />
                            <span>Seleccionar Tienda</span>
                        </button>
                    )}

                    {/* Admin Link */}
                    <Link
                        href={route('login')}
                        className="ml-4 hidden items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 sm:flex dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                        <LogOut className="h-4 w-4" />
                        <span className="hidden md:inline">Administrar</span>
                    </Link>
                </div>
            </div>
        </header>
    );
}
