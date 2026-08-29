import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

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

export default function GraficoComprasVentas({ userRole }: { userRole: 'admin' | 'moderador' | 'vendedor' }) {
    const [timeRange, setTimeRange] = useState('90d');
    const [chartData, setChartData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (userRole === 'vendedor') {
            return;
        }

        const fetchChartData = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(route('dashboard.chart.data', { timeRange }));
                const data = await response.json();
                setChartData(data);
            } catch (error) {
                console.error('Error fetching chart data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchChartData();
    }, [timeRange, userRole]);

    if (userRole === 'vendedor') {
        return null;
    }

    return (
        <>
            <Separator />
            {/* Charts */}
            <div>
                <Card className="overflow-hidden border-cyan-500/30 border-l-4 pt-0 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader className="flex items-center gap-2 space-y-0 border-b bg-gradient-to-r from-cyan-600 to-cyan-700 px-6 py-5 text-white sm:flex-row">
                        <div className="grid flex-1 gap-1 text-center sm:text-left">
                            <div className="flex items-center justify-center gap-3 sm:justify-start">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-white">Area Interactiva</CardTitle>
                                    <CardDescription className="text-cyan-100">Total de Compras y ventas en los ultimos meses</CardDescription>
                                </div>
                            </div>
                        </div>
                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger
                                className="w-[160px] rounded-lg border-white/30 bg-white/20 text-white backdrop-blur-sm sm:ml-auto [&>svg]:text-white"
                                aria-label="Select a value"
                            >
                                <SelectValue placeholder="Ultimos 3 meses" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="1d" className="rounded-lg">
                                    Hoy
                                </SelectItem>
                                <SelectItem value="2d" className="rounded-lg">
                                    Ayer
                                </SelectItem>
                                <SelectItem value="3d" className="rounded-lg">
                                    Antes de Ayer
                                </SelectItem>
                                <SelectItem value="7d" className="rounded-lg">
                                    Ultimos 7 dias
                                </SelectItem>
                                <SelectItem value="30d" className="rounded-lg">
                                    Ultimos 30 dias
                                </SelectItem>
                                <SelectItem value="90d" className="rounded-lg">
                                    Ultimos 3 meses
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </CardHeader>
                    <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                        {isLoading ? (
                            <div className="flex h-[250px] items-center justify-center text-center">Cargando datos del gráfico...</div>
                        ) : chartData.length > 0 ? (
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
                        ) : (
                            <div className="flex h-[250px] items-center justify-center text-center">
                                No hay datos disponibles para el rango de tiempo seleccionado.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
