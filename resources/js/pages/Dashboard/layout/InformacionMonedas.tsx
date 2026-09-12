import { Badge } from '@/components/ui/badge';
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
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
                            {monedas.map((moneda, index) => {
                                const c = colorMoneda(moneda.codigo_moneda, index);
                                return (
                                    <div
                                        key={moneda.id}
                                        className={`overflow-hidden rounded-lg border bg-white transition-all hover:shadow-md dark:bg-gray-800 ${
                                            moneda.principal ? 'border-green-300 dark:border-green-700' : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                    >
                                        {/* Header — insignia real a bleed completo (misma receta que CuentaCard.tsx),
                                            o el círculo de color con el símbolo como respaldo cuando no hay imagen
                                            asignada todavía. */}
                                        <div className={`relative flex h-16 items-center justify-center ${moneda.imagen_url ? '' : c.bg}`}>
                                            {moneda.imagen_url ? (
                                                <img
                                                    src={moneda.imagen_url}
                                                    alt={moneda.nombre_moneda}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <span className={`text-2xl font-bold ${c.text}`}>{moneda.simbolo_moneda}</span>
                                            )}
                                            {moneda.principal && (
                                                <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 shadow">
                                                    <TrendingUp className="h-3 w-3 text-yellow-900" aria-label="Moneda Principal" />
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-2 p-3">
                                            <div className="min-w-0">
                                                <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                                    {moneda.nombre_moneda}
                                                </h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{moneda.codigo_moneda}</p>
                                            </div>

                                            {/* Tasa/comisión como badges — más claras de leer de un vistazo que
                                                texto plano, mismo lenguaje visual que el resto del proyecto. */}
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <Badge variant="outline" className={`font-mono text-sm font-bold ${c.text} ${c.border}`}>
                                                    {moneda.tasa_cambio.toLocaleString('es-ES', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 6,
                                                    })}
                                                </Badge>
                                                <Badge variant="secondary" className="text-orange-600 dark:text-orange-400">
                                                    {moneda.commission.toLocaleString('es-ES', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 4,
                                                    })}
                                                    %
                                                </Badge>
                                            </div>
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
