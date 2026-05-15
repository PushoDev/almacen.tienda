// Compras y Ventas

'use client';

import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ChartItem = {
    date: string;
    compras: number;
    ventas: number;
};

const chartConfig = {
    compras: {
        label: 'Compras',
        color: '#ec4899',
    },
    ventas: {
        label: 'Ventas',
        color: '#16a34a',
    },
} satisfies ChartConfig;

export function ComprasVentasCharts() {
    const [timeRange, setTimeRange] = React.useState('90d');
    const [chartData, setChartData] = React.useState<ChartItem[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        let isCancelled = false;

        const fetchChartData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(route('dashboard.chart.data', { timeRange }));
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                if (!Array.isArray(data)) {
                    throw new Error('Formato de datos inválido');
                }

                const parsedData = data.map((item) => ({
                    date: String(item?.date ?? ''),
                    compras: Number(item?.compras ?? 0),
                    ventas: Number(item?.ventas ?? 0),
                }));

                if (!isCancelled) {
                    setChartData(parsedData);
                }
            } catch (fetchError) {
                if (!isCancelled) {
                    setError(fetchError instanceof Error ? fetchError.message : 'Error cargando datos');
                    setChartData([]);
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchChartData();

        return () => {
            isCancelled = true;
        };
    }, [timeRange]);

    const hasData = chartData.length > 0;

    return (
        <Card>
            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                <div className="grid flex-1 gap-1 text-center sm:text-left">
                    <CardTitle>Area Interactiva</CardTitle>
                    <CardDescription>Total de compras y ventas del negocio</CardDescription>
                </div>
                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[160px] rounded-lg sm:ml-auto" aria-label="Seleccionar rango">
                        <SelectValue placeholder="Ultimos 3 meses" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="90d" className="rounded-lg">
                            Ultimos 3 meses
                        </SelectItem>
                        <SelectItem value="30d" className="rounded-lg">
                            Ultimos 30 dias
                        </SelectItem>
                        <SelectItem value="7d" className="rounded-lg">
                            Ultimos 7 dias
                        </SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>

            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                {isLoading ? (
                    <div className="text-muted-foreground flex h-[250px] items-center justify-center text-sm">Cargando datos del reporte...</div>
                ) : error ? (
                    <div className="text-destructive flex h-[250px] items-center justify-center text-sm">No se pudo cargar el grafico: {error}</div>
                ) : !hasData ? (
                    <div className="text-muted-foreground flex h-[250px] items-center justify-center text-sm">
                        No hay datos disponibles para este rango
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="fillVentas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-ventas)" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="var(--color-ventas)" stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="fillCompras" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-compras)" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="var(--color-compras)" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                minTickGap={32}
                                tickFormatter={(value) => {
                                    const date = new Date(value);
                                    return date.toLocaleDateString('es-ES', {
                                        month: 'short',
                                        day: 'numeric',
                                    });
                                }}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={
                                    <ChartTooltipContent
                                        labelFormatter={(value) => {
                                            return new Date(value).toLocaleDateString('es-ES', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            });
                                        }}
                                        indicator="dot"
                                    />
                                }
                            />
                            <Area dataKey="compras" type="natural" fill="url(#fillCompras)" stroke="var(--color-compras)" stackId="a" />
                            <Area dataKey="ventas" type="natural" fill="url(#fillVentas)" stroke="var(--color-ventas)" stackId="a" />
                            <ChartLegend content={<ChartLegendContent />} />
                        </AreaChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}

