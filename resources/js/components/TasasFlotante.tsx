import { usePage } from '@inertiajs/react';
import { TrendingUp, X } from 'lucide-react';
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
                <div className="w-56 rounded-xl border bg-white shadow-xl dark:bg-zinc-900 dark:border-zinc-700 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-sky-600 dark:bg-sky-700">
                        <span className="text-xs font-bold text-white uppercase tracking-wide">Tasas de cambio</span>
                        <button
                            onClick={() => setAbierto(false)}
                            className="text-white/80 hover:text-white"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {tasas.map((moneda) => (
                            <li key={moneda.codigo_moneda} className="flex items-center justify-between px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${moneda.principal ? 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'}`}>
                                        {moneda.codigo_moneda}
                                    </span>
                                    {moneda.principal && (
                                        <span className="text-[10px] text-sky-500 dark:text-sky-400">base</span>
                                    )}
                                </div>
                                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 tabular-nums">
                                    {moneda.principal
                                        ? '1.00'
                                        : Number(moneda.tasa_cambio).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-700">
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 text-center">
                            Unidades por 1 USD
                        </p>
                    </div>
                </div>
            )}

            {/* Botón flotante */}
            <button
                onClick={() => setAbierto((v) => !v)}
                className={`flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all ${
                    abierto
                        ? 'bg-sky-600 text-white dark:bg-sky-500'
                        : 'bg-white text-sky-600 border border-sky-200 hover:bg-sky-50 dark:bg-zinc-800 dark:text-sky-400 dark:border-zinc-600 dark:hover:bg-zinc-700'
                }`}
                title="Ver tasas de cambio"
            >
                <TrendingUp className="h-5 w-5" />
            </button>
        </div>
    );
}
