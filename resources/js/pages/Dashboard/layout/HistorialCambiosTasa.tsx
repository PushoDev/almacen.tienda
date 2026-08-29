import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

import type { HistorialCambio } from '../types';

export default function HistorialCambiosTasa({
    historialCambios,
    userRole,
}: {
    historialCambios?: HistorialCambio[];
    userRole: 'admin' | 'moderador' | 'vendedor';
}) {
    if (userRole === 'vendedor') {
        return null;
    }

    return (
        <>
            <Separator />

            {/* Sección de Historial de Cambios de Tasa - Solo Admin y Moderador */}
            <div className="animate__animated animate__fadeIn">
                <Card className="overflow-hidden border-orange-500/30 border-l-4 pt-0 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader className="flex items-center gap-2 space-y-0 border-b bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-5 text-white sm:flex-row">
                        <div className="grid flex-1 gap-1 text-center sm:text-left">
                            <div className="flex items-center justify-center gap-3 sm:justify-start">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-white">Historial de Cambios de Tasa</CardTitle>
                                    <CardDescription className="text-orange-100">
                                        Impacto financiero generado por cambios en tasas de cambio
                                    </CardDescription>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {historialCambios && historialCambios.length > 0 ? (
                            <div className="space-y-4">
                                {/* Resumen Estadístico */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                            <span className="text-sm font-medium text-green-800 dark:text-green-200">Ganancias Totales</span>
                                        </div>
                                        <div className="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">
                                            {historialCambios
                                                .filter((cambio) => cambio.es_ganancia)
                                                .reduce((sum, cambio) => sum + parseFloat(cambio.impacto_financiero), 0)
                                                .toLocaleString('es-ES', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}{' '}
                                            USD
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                                        <div className="flex items-center gap-2">
                                            <TrendingDown className="h-4 w-4 text-red-600" />
                                            <span className="text-sm font-medium text-red-800 dark:text-red-200">Pérdidas Totales</span>
                                        </div>
                                        <div className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">
                                            {Math.abs(
                                                historialCambios
                                                    .filter((cambio) => cambio.es_perdida)
                                                    .reduce((sum, cambio) => sum + parseFloat(cambio.impacto_financiero), 0),
                                            ).toLocaleString('es-ES', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}{' '}
                                            USD
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="h-4 w-4 text-blue-600" />
                                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Impacto Neto</span>
                                        </div>
                                        <div className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">
                                            {historialCambios
                                                .reduce((sum, cambio) => sum + parseFloat(cambio.impacto_financiero), 0)
                                                .toLocaleString('es-ES', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}{' '}
                                            USD
                                        </div>
                                    </div>
                                </div>

                                {/* Tabla de Cambios Recientes */}
                                <div className="mt-6 overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-b-sidebar-border dark:border-b-sidebar-border hover:bg-transparent">
                                                <TableHead className="text-gray-700 dark:text-gray-300">Fecha</TableHead>
                                                <TableHead className="text-gray-700 dark:text-gray-300">Moneda</TableHead>
                                                <TableHead className="text-gray-700 dark:text-gray-300">Usuario</TableHead>
                                                <TableHead className="text-right text-gray-700 dark:text-gray-300">Tasa Anterior</TableHead>
                                                <TableHead className="text-right text-gray-700 dark:text-gray-300">Tasa Nueva</TableHead>
                                                <TableHead className="text-right text-gray-700 dark:text-gray-300">Cuentas Afectadas</TableHead>
                                                <TableHead className="text-right text-gray-700 dark:text-gray-300">Impacto USD</TableHead>
                                                <TableHead className="text-right text-gray-700 dark:text-gray-300">Tipo</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {historialCambios.slice(0, 5).map((cambio) => (
                                                <TableRow
                                                    key={cambio.id}
                                                    className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50 hover:bg-sidebar/10 dark:hover:bg-sidebar/20 transition-colors"
                                                >
                                                    <TableCell className="font-medium">
                                                        <div>
                                                            <div className="text-sm font-medium">{cambio.fecha_formateada}</div>
                                                            <div className="text-muted-foreground text-xs">
                                                                {cambio.numero_cuentas_afectadas} cuentas
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="secondary">{cambio.moneda.simbolo_moneda}</Badge>
                                                            <span className="text-sm">{cambio.moneda.nombre_moneda}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-sm">{cambio.usuario.name}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-sm">{cambio.tasa_anterior}</TableCell>
                                                    <TableCell className="text-right font-mono text-sm">{cambio.tasa_nueva}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="text-sm">
                                                            {cambio.numero_cuentas_afectadas}{' '}
                                                            {cambio.numero_cuentas_afectadas === 1 ? 'cuenta' : 'cuentas'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        <span
                                                            className={
                                                                cambio.es_ganancia
                                                                    ? 'text-green-600 dark:text-green-400'
                                                                    : cambio.es_perdida
                                                                      ? 'text-red-600 dark:text-red-400'
                                                                      : 'text-gray-600 dark:text-gray-400'
                                                            }
                                                        >
                                                            {cambio.impacto_formateado}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge
                                                            variant={cambio.es_ganancia ? 'default' : cambio.es_perdida ? 'destructive' : 'secondary'}
                                                            className={
                                                                cambio.es_ganancia
                                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
                                                                    : cambio.es_perdida
                                                                      ? 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
                                                                      : ''
                                                            }
                                                        >
                                                            {cambio.es_ganancia ? 'Ganancia' : cambio.es_perdida ? 'Pérdida' : 'Neutro'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mostrar más */}
                                {historialCambios.length > 5 && (
                                    <div className="mt-4 text-center">
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            Mostrando los últimos 5 cambios de {historialCambios.length} totales
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex h-[300px] items-center justify-center text-center">
                                <div className="space-y-2">
                                    <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                                    <div className="text-gray-500 dark:text-gray-400">No hay historial de cambios de tasa disponible.</div>
                                    <div className="text-sm text-gray-400 dark:text-gray-500">
                                        Los cambios aparecerán aquí cuando se modifiquen las tasas de cambio.
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
