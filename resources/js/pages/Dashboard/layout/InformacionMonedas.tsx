import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Moneda } from '../types';
import { colorMoneda } from '../utils';

export default function InformacionMonedas() {
    const [monedas, setMonedas] = useState<Moneda[]>([]);
    const [isLoadingMonedas, setIsLoadingMonedas] = useState(true);

    // Cargar monedas al montar el componente
    useEffect(() => {
        const fetchMonedas = async () => {
            setIsLoadingMonedas(true);
            try {
                const response = await fetch(route('dashboard.monedas'));
                const data = await response.json();
                setMonedas(data);
            } catch (error) {
                console.error('Error fetching monedas:', error);
            } finally {
                setIsLoadingMonedas(false);
            }
        };

        fetchMonedas();
    }, []);

    return (
        <div className="animate__animated animate__fadeIn">
            <Card className="overflow-hidden border-violet-500/30 border-l-4 pt-0 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="flex items-center gap-2 space-y-0 border-b bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white sm:flex-row">
                    <div className="grid flex-1 gap-1 text-center sm:text-left">
                        <div className="flex items-center justify-center gap-3 sm:justify-start">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Información de Monedas</CardTitle>
                                <CardDescription className="text-violet-100">
                                    Tasas de cambio y comisiones disponibles en el sistema
                                </CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {isLoadingMonedas ? (
                        <div className="flex h-[300px] items-center justify-center text-center">Cargando datos de monedas...</div>
                    ) : monedas.length > 0 ? (
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
                            {monedas.map((moneda, index) => {
                                const c = colorMoneda(moneda.codigo_moneda, index);
                                return (
                                    <div
                                        key={moneda.id}
                                        className={`rounded-lg border p-3 transition-all hover:shadow-md ${
                                            moneda.principal
                                                ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950'
                                                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                                        }`}
                                    >
                                        {/* Header con símbolo y código */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.bg}`}>
                                                    <span className={`text-sm font-bold ${c.text}`}>{moneda.simbolo_moneda}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                                        {moneda.nombre_moneda}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{moneda.codigo_moneda}</p>
                                                </div>
                                            </div>
                                            {moneda.principal && (
                                                <TrendingUp
                                                    className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400"
                                                    aria-label="Moneda Principal"
                                                />
                                            )}
                                        </div>

                                        {/* Información de tasas */}
                                        <div className="mt-2 flex items-center justify-between border-t pt-2 text-xs dark:border-gray-700">
                                            <span className="text-gray-500 dark:text-gray-400">
                                                Tasa:{' '}
                                                <span className="font-semibold text-gray-900 dark:text-white">
                                                    {moneda.tasa_cambio.toLocaleString('es-ES', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 6,
                                                    })}
                                                </span>
                                            </span>
                                            <span className="text-gray-500 dark:text-gray-400">
                                                Com:{' '}
                                                <span className="font-semibold text-orange-600 dark:text-orange-400">
                                                    {moneda.commission.toLocaleString('es-ES', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 4,
                                                    })}
                                                    %
                                                </span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex h-[300px] items-center justify-center text-center">No hay monedas disponibles en el sistema.</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
