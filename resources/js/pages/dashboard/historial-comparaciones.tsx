import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CursorFollow, CursorProvider } from '@/components/ui/cursor';
import { Input } from '@/components/ui/input';
import { ScrollProgress } from '@/components/ui/scroll';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Calendar, DollarSign, GalleryHorizontalEnd, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Historial de Comparaciones',
        href: '/dashboard/historial-comparaciones',
    },
];

interface HistorialComparacion {
    id: number;
    usuario: string;
    mes_comparado: string;
    mes_formateado: string;
    moneda_codigo: string;
    moneda_nombre: string;
    moneda_simbolo: string;
    monto_anterior: number;
    monto_actual: number;
    diferencia: number;
    diferencia_formateada: string;
    porcentaje_cambio: number;
    porcentaje_formateado: string;
    es_positivo: boolean;
    tasa_cambio_usada: number;
    created_at: string;
}

export default function HistorialComparacionesPage() {
    const [historial, setHistorial] = useState<HistorialComparacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMoneda, setSelectedMoneda] = useState('all');
    const [selectedMeses, setSelectedMeses] = useState('6');
    const [monedas, setMonedas] = useState<string[]>([]);

    useEffect(() => {
        fetchHistorial();
    }, [selectedMoneda, selectedMeses]);

    const fetchHistorial = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedMoneda !== 'all') params.append('moneda', selectedMoneda);
            if (selectedMeses !== 'all') params.append('meses', selectedMeses);

            const response = await fetch(`/dashboard/historial-comparaciones?${params}`);
            const data = await response.json();

            // Limpiar y validar los datos
            const cleanedData = (data.data || []).map((item: any) => ({
                ...item,
                porcentaje_cambio: parseFloat(String(item.porcentaje_cambio)) || 0,
                monto_anterior: parseFloat(String(item.monto_anterior)) || 0,
                monto_actual: parseFloat(String(item.monto_actual)) || 0,
                diferencia: parseFloat(String(item.diferencia)) || 0,
            }));

            setHistorial(cleanedData);

            // Extraer monedas únicas para el filtro
            const monedasUnicas = [...new Set(cleanedData.map((item: HistorialComparacion) => item.moneda_codigo))];
            setMonedas(monedasUnicas);
        } catch (error) {
            console.error('Error fetching historial:', error);
            setHistorial([]); // En caso de error, limpiar los datos
        } finally {
            setLoading(false);
        }
    };

    const filteredHistorial = historial
        .filter((item) => {
            const matchesSearch =
                searchTerm === '' ||
                item.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.moneda_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.mes_formateado.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesSearch;
        })
        .map((item) => ({
            ...item,
            porcentaje_cambio: Number(item.porcentaje_cambio) || 0, // Asegurar que sea número válido
            monto_anterior: Number(item.monto_anterior) || 0,
            monto_actual: Number(item.monto_actual) || 0,
            diferencia: Number(item.diferencia) || 0,
        }));

    // Debug: mostrar los valores para depurar
    console.log('Filtered historial:', filteredHistorial);
    console.log(
        'Porcentajes:',
        filteredHistorial.map((item) => ({
            moneda: item.moneda_codigo,
            porcentaje: item.porcentaje_cambio,
            tipo: typeof item.porcentaje_cambio,
            isNaN: isNaN(item.porcentaje_cambio),
        })),
    );

    // Agrupar por mes y moneda para mejor visualización
    const groupedHistorial = filteredHistorial.reduce(
        (acc, item) => {
            const key = `${item.mes_comparado}-${item.moneda_codigo}`;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(item);
            return acc;
        },
        {} as Record<string, HistorialComparacion[]>,
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Historial de Comparaciones Mensuales" />
            <ScrollProgress />

            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}

                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <CursorProvider>
                        <CursorFollow>
                            <div className="bg-sidebar-accent rounded-lg px-2 py-1 text-sm text-white shadow-lg">
                                Historial de Montos en el Negocio
                            </div>
                        </CursorFollow>
                    </CursorProvider>
                    {/* Contenido principal */}
                    <HeadingSmall title="Historial de Comparaciones Mensuales" description="Análisis histórico de cambios en los saldos por moneda" />
                    {/* Ícono semitransparente */}
                    <GalleryHorizontalEnd
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Filtros */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="h-5 w-5" />
                            Filtros de Búsqueda
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar</label>
                                <Input
                                    placeholder="Usuario, moneda o mes..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Moneda</label>
                                <Select value={selectedMoneda} onValueChange={setSelectedMoneda}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas las monedas" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las monedas</SelectItem>
                                        {monedas.map((moneda) => (
                                            <SelectItem key={moneda} value={moneda}>
                                                {moneda}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Periodo</label>
                                <Select value={selectedMeses} onValueChange={setSelectedMeses}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar periodo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="3">Últimos 3 meses</SelectItem>
                                        <SelectItem value="6">Últimos 6 meses</SelectItem>
                                        <SelectItem value="12">Último año</SelectItem>
                                        <SelectItem value="24">Últimos 2 años</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-end">
                                <Button onClick={fetchHistorial} disabled={loading}>
                                    {loading ? 'Actualizando...' : 'Actualizar'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabla de Historial */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Comparaciones Registradas
                        </CardTitle>
                        <CardDescription>{filteredHistorial.length} comparaciones encontradas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex h-64 items-center justify-center">
                                <div className="text-center">
                                    <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                                    <p className="text-gray-600 dark:text-gray-400">Cargando historial...</p>
                                </div>
                            </div>
                        ) : filteredHistorial.length === 0 ? (
                            <div className="flex h-64 items-center justify-center">
                                <div className="text-center">
                                    <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                                    <p className="text-gray-600 dark:text-gray-400">
                                        No hay comparaciones registradas para los filtros seleccionados
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Mes</TableHead>
                                            <TableHead>Usuario</TableHead>
                                            <TableHead>Moneda</TableHead>
                                            <TableHead className="text-right">Mes Anterior</TableHead>
                                            <TableHead className="text-right">Mes Actual</TableHead>
                                            <TableHead className="text-right">Diferencia</TableHead>
                                            <TableHead className="text-right">% Cambio</TableHead>
                                            <TableHead>Fecha Registro</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredHistorial.map((item) => (
                                            <TableRow key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-gray-400" />
                                                        <span className="font-medium">{item.mes_formateado}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">{item.usuario}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary">{item.moneda_simbolo}</Badge>
                                                        <span className="text-sm">{item.moneda_codigo}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm">
                                                    {item.monto_anterior.toLocaleString('es-ES', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm">
                                                    {item.monto_actual.toLocaleString('es-ES', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div
                                                        className={`flex items-center justify-end gap-1 font-mono text-sm ${
                                                            item.es_positivo ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                                        }`}
                                                    >
                                                        {item.es_positivo ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                        {item.diferencia_formateada}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span
                                                        className={`font-mono text-sm ${
                                                            item.es_positivo ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                                        }`}
                                                    >
                                                        {item.porcentaje_formateado}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-gray-600 dark:text-gray-400">{item.created_at}</span>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Estadísticas */}
                {filteredHistorial.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Estadísticas del Periodo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                        <span className="text-sm font-medium text-green-800 dark:text-green-200">Cambios Positivos</span>
                                    </div>
                                    <div className="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">
                                        {filteredHistorial.filter((item) => item.es_positivo).length}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                                    <div className="flex items-center gap-2">
                                        <TrendingDown className="h-4 w-4 text-red-600" />
                                        <span className="text-sm font-medium text-red-800 dark:text-red-200">Cambios Negativos</span>
                                    </div>
                                    <div className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">
                                        {filteredHistorial.filter((item) => !item.es_positivo).length}
                                    </div>
                                </div>

                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Promedio % Cambio</span>
                                    </div>
                                    <div className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">
                                        {(() => {
                                            // Debug extra para el cálculo
                                            console.log('Calculando promedio con', filteredHistorial.length, 'items');

                                            if (filteredHistorial.length === 0) return '0.00';

                                            const validItems = filteredHistorial.filter(
                                                (item) => !isNaN(item.porcentaje_cambio) && isFinite(item.porcentaje_cambio),
                                            );

                                            console.log('Items válidos:', validItems.length);

                                            if (validItems.length === 0) return '0.00';

                                            const total = validItems.reduce((sum, item) => {
                                                const val = parseFloat(String(item.porcentaje_cambio)) || 0;
                                                return sum + val;
                                            }, 0);

                                            const average = total / validItems.length;

                                            console.log('Total:', total, 'Promedio:', average);

                                            if (isNaN(average) || !isFinite(average)) return '0.00';

                                            return average.toFixed(2);
                                        })()}
                                        %
                                    </div>
                                </div>

                                <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-purple-600" />
                                        <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Meses Analizados</span>
                                    </div>
                                    <div className="mt-1 text-2xl font-bold text-purple-700 dark:text-purple-300">
                                        {[...new Set(filteredHistorial.map((item) => item.mes_comparado))].length}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
