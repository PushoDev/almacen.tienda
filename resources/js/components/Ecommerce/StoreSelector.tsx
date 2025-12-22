import { cn } from '@/lib/utils';
import { Check, MapPin, Store as StoreIcon, X } from 'lucide-react';
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
    const [searchQuery, setSearchQuery] = useState('');

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
            setStores(Array.isArray(data) ? data : data.data || []);
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

    const filteredStores = stores.filter(
        (s) =>
            s.nombre_almacen.toLowerCase().includes(searchQuery.toLowerCase()) || s.ciudad_almacen.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />

            {/* Modal */}
            <div className="animate-in fade-in zoom-in-95 relative z-10 w-full max-w-2xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl duration-300">
                {/* Header */}
                <div className="relative border-b border-slate-50 bg-white px-8 py-10 md:px-12">
                    <button
                        onClick={onClose}
                        className="absolute top-8 right-8 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
                    >
                        <X size={24} />
                    </button>

                    <div className="flex flex-col items-center text-center">
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-50 text-[#FF4D00] shadow-inner">
                            <StoreIcon size={36} strokeWidth={2.5} />
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter text-slate-900 md:text-4xl">
                            Bienvenido a <span className="text-slate-900">La</span>
                            <span className="text-[#FF4D00]">Glorieta</span>
                        </h2>
                        <p className="mt-3 max-w-xs text-sm font-bold text-slate-500">
                            Encuentra las mejores tiendas y productos en toda Cuba. Selecciona tu ubicación para comenzar.
                        </p>
                    </div>

                    {/* Search Input */}
                    <div className="mt-10">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar tu ciudad o tienda..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-14 w-full rounded-2xl border-none bg-slate-50 px-6 text-sm font-bold tracking-tight ring-0 transition-all focus:bg-white focus:ring-4 focus:ring-orange-50"
                            />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-h-[50vh] overflow-y-auto bg-slate-50/30 p-8 md:p-12">
                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-24 animate-pulse rounded-3xl bg-white" />
                            ))}
                        </div>
                    ) : filteredStores.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredStores.map((store) => (
                                <button
                                    key={store.id}
                                    onClick={() => handleSelectStore(store.id)}
                                    disabled={selecting}
                                    className={cn(
                                        'group relative flex items-center gap-6 rounded-[2rem] border-2 p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl disabled:opacity-75',
                                        selectedStoreId === store.id
                                            ? 'border-[#FF4D00] bg-orange-50/50'
                                            : 'border-white bg-white hover:border-orange-100',
                                    )}
                                >
                                    <div
                                        className={cn(
                                            'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-colors',
                                            selectedStoreId === store.id
                                                ? 'bg-[#FF4D00] text-white'
                                                : 'bg-slate-50 text-slate-400 group-hover:bg-[#FF4D00] group-hover:text-white',
                                        )}
                                    >
                                        <MapPin size={24} />
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-lg font-black text-slate-900">{store.nombre_almacen}</h3>
                                        <p className="text-sm font-bold text-slate-400">
                                            {store.ciudad_almacen}, {store.provincia_almacen}
                                        </p>
                                    </div>

                                    {selectedStoreId === store.id && (
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF4D00] text-white shadow-lg">
                                            <Check size={18} strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <p className="font-bold text-slate-400">No encontramos tiendas con esos criterios</p>
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-100 bg-white p-6 text-center">
                    <p className="text-[10px] font-black tracking-widest text-slate-300 uppercase">
                        La Glorieta Tiendas &copy; {new Date().getFullYear()} - Marketplace Nacional
                    </p>
                </div>
            </div>
        </div>
    );
}
