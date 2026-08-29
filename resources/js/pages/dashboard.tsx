import HeadingSmall from '@/components/heading-small';
import { CursorFollow, CursorProvider } from '@/components/ui/cursor';
import { ScrollProgress } from '@/components/ui/scroll';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Coins, Info, TrendingDown, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import ComparacionMensualCard from './Dashboard/layout/ComparacionMensual';
import EstadosFinancieros from './Dashboard/layout/EstadosFinancieros';
import GraficoComprasVentas from './Dashboard/layout/GraficoComprasVentas';
import HistorialCambiosTasa from './Dashboard/layout/HistorialCambiosTasa';
import HistorialCostoPrecio from './Dashboard/layout/HistorialCostoPrecio';
import InformacionMonedas from './Dashboard/layout/InformacionMonedas';
import OpcionesRapidas from './Dashboard/layout/OpcionesRapidas';
import ResumenFinancieroCard from './Dashboard/layout/ResumenFinanciero';
import type {
    ComparacionMensual,
    GananciaAgenciaMes,
    HistorialCambio,
    HistorialCostoPrecioItem,
    MontoPorMoneda,
    ResumenFinanciero,
    StatsCostoPrecio,
} from './Dashboard/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Opciones Generales',
        href: '/dashboard',
    },
];

export default function Dashboard({
    userRole,
    montosPorMoneda,
    totalCapital,
    comparaciones,
    historialCambios,
    historialCostoPrecio,
    statsCostoPrecio,
    resumenFinanciero,
    gananciaAgenciaMes,
}: {
    userRole: 'admin' | 'moderador' | 'vendedor';
    montosPorMoneda?: MontoPorMoneda[];
    totalCapital?: number;
    comparaciones?: ComparacionMensual[];
    historialCambios?: HistorialCambio[];
    historialCostoPrecio?: HistorialCostoPrecioItem[];
    statsCostoPrecio?: StatsCostoPrecio;
    resumenFinanciero?: ResumenFinanciero | null;
    gananciaAgenciaMes?: GananciaAgenciaMes | null;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventario" />
            <ScrollProgress />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 rounded-2xl border border-dashed p-4">
                    <CursorProvider>
                        <CursorFollow>
                            <div className="bg-sidebar-accent rounded-lg px-2 py-1 text-sm text-white shadow-lg">Opciones Generales</div>
                        </CursorFollow>
                    </CursorProvider>
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento"
                    />
                    {/* Mascota — anclada abajo del header, más grande para que la parte de
                        arriba sobresalga del borde superior; corrida a la izquierda para no
                        chocar con los íconos de la barra superior (luna/notificaciones). */}
                    <img
                        src="/projects/mascota/mascota.webp"
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute right-24 bottom-0 h-32 w-32 select-none"
                    />
                </div>

                <OpcionesRapidas userRole={userRole} />

                {/* Tablas de Montos y Comparaciones */}
                <div className={`animate__animated animate__fadeIn grid grid-cols-1 gap-4 ${userRole !== 'vendedor' ? 'md:grid-cols-2' : ''}`}>
                    <ResumenFinancieroCard resumenFinanciero={resumenFinanciero} montosPorMoneda={montosPorMoneda} totalCapital={totalCapital} />
                    <ComparacionMensualCard comparaciones={comparaciones} userRole={userRole} />
                </div>

                {/* Ganancia real de la agencia (mes en curso) - Solo Admin y Moderador.
                    Tarjeta aparte de Comparación Mensual a propósito: mezclar "saldo de
                    cuentas" con "ganancia de ventas" en la misma tabla fue justo lo que
                    generó confusión con Saldo Acumulado — acá se separa visualmente. */}
                {userRole !== 'vendedor' && gananciaAgenciaMes && (
                    <div className="animate__animated animate__fadeIn">
                        <Card className="overflow-hidden border-amber-500/30 border-l-4 pt-0 shadow-sm transition-shadow hover:shadow-md">
                            <CardHeader className="border-b bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <Coins className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white">Ganancia Real de la Agencia</CardTitle>
                                        <CardDescription className="text-amber-100">
                                            Ganancia neta del mes en curso, en USD, desglosada por fuente
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                        <p className="text-muted-foreground text-xs">Ganancia de Ventas</p>
                                        <p
                                            className={`mt-1 text-xl font-semibold ${gananciaAgenciaMes.ganancia_ventas >= 0
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : 'text-red-600 dark:text-red-400'
                                                }`}
                                        >
                                            {gananciaAgenciaMes.ganancia_ventas >= 0 ? '+' : ''}
                                            {gananciaAgenciaMes.ganancia_ventas.toLocaleString('es-ES', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}{' '}
                                            USD
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-xs">Margen − comisión ± cambiaria</p>
                                    </div>
                                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                        <p className="text-muted-foreground text-xs">Ganancia/Pérdida de Transferencias</p>
                                        <p
                                            className={`mt-1 text-xl font-semibold ${gananciaAgenciaMes.ganancia_transferencias >= 0
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : 'text-red-600 dark:text-red-400'
                                                }`}
                                        >
                                            {gananciaAgenciaMes.ganancia_transferencias >= 0 ? '+' : ''}
                                            {gananciaAgenciaMes.ganancia_transferencias.toLocaleString('es-ES', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}{' '}
                                            USD
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-xs">Tasa aplicada vs. oficial de ese momento</p>
                                    </div>
                                    <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
                                        <p className="text-amber-800 text-xs dark:text-amber-300">Ganancia Neta del Mes</p>
                                        <p
                                            className={`mt-1 flex items-center gap-1 text-xl font-bold ${gananciaAgenciaMes.ganancia_neta_total >= 0
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : 'text-red-600 dark:text-red-400'
                                                }`}
                                        >
                                            {gananciaAgenciaMes.ganancia_neta_total >= 0 ? (
                                                <TrendingUp className="h-4 w-4" />
                                            ) : (
                                                <TrendingDown className="h-4 w-4" />
                                            )}
                                            {gananciaAgenciaMes.ganancia_neta_total >= 0 ? '+' : ''}
                                            {gananciaAgenciaMes.ganancia_neta_total.toLocaleString('es-ES', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}{' '}
                                            USD
                                        </p>
                                        <p className="text-amber-800/70 mt-1 text-xs dark:text-amber-300/70">Ganancia de Ventas + Transferencias</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>
                                        Compras, Gastos e Ingresos no generan margen (se pagan sin conversión de moneda), por eso no aparecen acá —
                                        solo Ventas y Transferencias pueden dar ganancia o pérdida real.
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <InformacionMonedas />

                <GraficoComprasVentas userRole={userRole} />

                <HistorialCambiosTasa historialCambios={historialCambios} userRole={userRole} />

                <HistorialCostoPrecio
                    historialCostoPrecio={historialCostoPrecio}
                    statsCostoPrecio={statsCostoPrecio}
                    userRole={userRole}
                />

                <Separator />

                <EstadosFinancieros userRole={userRole} />
            </div>
        </AppLayout>
    );
}
