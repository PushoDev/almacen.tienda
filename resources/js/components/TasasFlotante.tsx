import { usePage } from '@inertiajs/react';
import { Coins, TrendingUp, X } from 'lucide-react';
import { useState } from 'react';
import { type SharedData } from '@/types';

export default function TasasFlotante() {
    const { tasas } = usePage<SharedData>().props;
    const [abierto, setAbierto] = useState(false);

    if (!tasas || tasas.length === 0) return null;

    return (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
            {/* Panel de tasas */}
            {abierto && (
                <div className="w-64 rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-primary">
                        <span className="text-xs font-bold text-primary-foreground uppercase tracking-wide">Tasas de cambio</span>
                        <button
                            onClick={() => setAbierto(false)}
                            className="text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <ul className="divide-y divide-border">
                        {tasas.map((moneda) => (
                            <li key={moneda.codigo_moneda} className="flex items-center justify-between px-3 py-2.5 gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    {moneda.imagen_url ? (
                                        <img
                                            src={moneda.imagen_url}
                                            alt=""
                                            aria-hidden="true"
                                            className="h-6 w-9 shrink-0 rounded object-cover"
                                        />
                                    ) : (
                                        <Coins className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    )}
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-medium text-foreground truncate">
                                            {moneda.nombre_moneda}
                                        </span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                {moneda.codigo_moneda}
                                            </span>
                                            {moneda.principal && (
                                                <span className="text-[10px] text-primary font-medium">base</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-foreground tabular-nums shrink-0">
                                    {moneda.principal
                                        ? '1.00'
                                        : Number(moneda.tasa_cambio).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="px-3 py-1.5 bg-muted border-t border-border">
                        <p className="text-[10px] text-muted-foreground text-center">
                            Unidades por 1 USD
                        </p>
                    </div>
                </div>
            )}

            {/* Botón flotante */}
            <button
                onClick={() => setAbierto((v) => !v)}
                className={`flex h-11 w-11 items-center justify-center rounded-full shadow-lg border transition-all ${
                    abierto
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-primary border-border hover:bg-accent hover:text-accent-foreground'
                }`}
                title="Ver tasas de cambio"
            >
                <TrendingUp className="h-5 w-5" />
            </button>
        </div>
    );
}
