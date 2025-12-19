import { cn } from '@/lib/utils';
import { Check, Mail, MapPin, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Store {
    id: number;
    nombre_almacen: string;
    ciudad_almacen: string;
    provincia_almacen: string;
    telefono_almacen: string;
    correo_almacen: string;
}

interface StoreSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectStore: (store: Store) => void;
    selectedStoreId?: number;
}

export default function StoreSelector({ isOpen, onClose, onSelectStore, selectedStoreId }: StoreSelectorProps) {
    const [stores, setStores] = useState<Store[]>([]);
    const [loading, setLoading] = useState(false);
    const [selecting, setSelecting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchStores();
        }
    }, [isOpen]);

    const fetchStores = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/ecommerce/puntos-venta');
            const data = await response.json();
            setStores(data);
        } catch (error) {
            console.error('Error fetching stores:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectStore = async (storeId: number) => {
        setSelecting(true);
        try {
            const response = await fetch('/api/ecommerce/almacen/select', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ almacen_id: storeId }),
            });

            if (response.ok) {
                const store = stores.find((s) => s.id === storeId);
                if (store) {
                    onSelectStore(store);
                }
                setTimeout(onClose, 300);
            }
        } catch (error) {
            console.error('Error selecting store:', error);
        } finally {
            setSelecting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />

            {/* Modal */}
            <div className="animate-in fade-in zoom-in-95 relative z-10 w-full max-w-2xl rounded-xl bg-white shadow-2xl duration-300 dark:bg-slate-900">
                {/* Header */}
                <div className="border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 dark:border-slate-700 dark:from-blue-900 dark:to-blue-950">
                    <h2 className="text-2xl font-bold text-white">Selecciona tu Tienda</h2>
                    <p className="mt-1 text-blue-100">Elige el punto de venta más cercano a ti</p>
                </div>

                {/* Content */}
                <div className="max-h-[60vh] overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-full space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
                                ))}
                            </div>
                        </div>
                    ) : stores.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {stores.map((store) => (
                                <button
                                    key={store.id}
                                    onClick={() => handleSelectStore(store.id)}
                                    disabled={selecting}
                                    className={cn(
                                        'relative overflow-hidden rounded-lg border-2 p-4 text-left transition-all duration-200 hover:shadow-lg disabled:opacity-75',
                                        selectedStoreId === store.id
                                            ? 'border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30'
                                            : 'border-slate-200 bg-slate-50 hover:border-blue-400 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-blue-500',
                                    )}
                                >
                                    {/* Selection indicator */}
                                    {selectedStoreId === store.id && (
                                        <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                                            <Check className="h-4 w-4" />
                                        </div>
                                    )}

                                    {/* Store name */}
                                    <h3 className="mb-3 pr-8 font-bold text-slate-900 dark:text-white">{store.nombre_almacen}</h3>

                                    {/* Store details */}
                                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                        <div className="flex items-start gap-2">
                                            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                                            <span>
                                                {store.ciudad_almacen}, {store.provincia_almacen}
                                            </span>
                                        </div>

                                        <div className="flex items-start gap-2">
                                            <Phone className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                                            <span>{store.telefono_almacen}</span>
                                        </div>

                                        {store.correo_almacen && (
                                            <div className="flex items-start gap-2">
                                                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                                                <span className="truncate">{store.correo_almacen}</span>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <p className="text-slate-500 dark:text-slate-400">No hay tiendas disponibles en este momento</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800">
                    <button
                        onClick={onClose}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
