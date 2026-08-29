import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

import type { HistorialCostoPrecioItem, StatsCostoPrecio } from '../types';

export default function HistorialCostoPrecio({
    historialCostoPrecio,
    statsCostoPrecio,
    userRole,
}: {
    historialCostoPrecio?: HistorialCostoPrecioItem[];
    statsCostoPrecio?: StatsCostoPrecio;
    userRole: 'admin' | 'moderador' | 'vendedor';
}) {
    if (userRole === 'vendedor') {
        return null;
    }

    return (
        <>
            <Separator />

            {/* Sección de Cambios de Precio de Costo - Solo Admin y Moderador */}
            <div className="animate__animated animate__fadeIn">
                <Card className="overflow-hidden border-amber-500/30 border-l-4 pt-0 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader className="flex items-center gap-2 space-y-0 border-b bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5 text-white sm:flex-row">
                        <div className="grid flex-1 gap-1 text-center sm:text-left">
                            <div className="flex items-center justify-center gap-3 sm:justify-start">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-white">Cambios de Precio de Costo</CardTitle>
                                    <CardDescription className="text-amber-100">
                                        Impacto financiero estimado por cambios al precio de costo de productos
                                    </CardDescription>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => window.open(route('reportes.historial_costo_precio'), '_blank')}
                            className="flex cursor-pointer items-center gap-2 rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                        >
                            <TrendingUp className="h-4 w-4" />
                            Ver Historial Completo
                        </button>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {historialCostoPrecio && historialCostoPrecio.length > 0 ? (
                            <div className="space-y-4">
                                {/* Resumen estadístico */}
                                {statsCostoPrecio && (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-green-600" />
                                                <span className="text-sm font-medium text-green-800 dark:text-green-200">Ganancia acumulada</span>
                                            </div>
                                            <div className="mt-1 text-2xl font-bold text-green-700 dark:text-green-300">
                                                +
                                                {statsCostoPrecio.total_ganancias.toLocaleString('es-ES', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                                            <div className="flex items-center gap-2">
                                                <TrendingDown className="h-4 w-4 text-red-600" />
                                                <span className="text-sm font-medium text-red-800 dark:text-red-200">Pérdida acumulada</span>
                                            </div>
                                            <div className="mt-1 text-2xl font-bold text-red-700 dark:text-red-300">
                                                -
                                                {statsCostoPrecio.total_perdidas.toLocaleString('es-ES', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </div>
                                        </div>
                                        <div
                                            className={`rounded-lg border p-4 ${statsCostoPrecio.neto_impacto >= 0 ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950' : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <DollarSign
                                                    className={`h-4 w-4 ${statsCostoPrecio.neto_impacto >= 0 ? 'text-blue-600' : 'text-orange-600'}`}
                                                />
                                                <span
                                                    className={`text-sm font-medium ${statsCostoPrecio.neto_impacto >= 0 ? 'text-blue-800 dark:text-blue-200' : 'text-orange-800 dark:text-orange-200'}`}
                                                >
                                                    Impacto neto
                                                </span>
                                            </div>
                                            <div
                                                className={`mt-1 text-2xl font-bold ${statsCostoPrecio.neto_impacto >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}
                                            >
                                                {statsCostoPrecio.neto_impacto >= 0 ? '+' : ''}
                                                {statsCostoPrecio.neto_impacto.toLocaleString('es-ES', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4 text-gray-500" />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total cambios</span>
                                            </div>
                                            <div className="mt-1 text-2xl font-bold text-gray-700 dark:text-gray-300">
                                                {statsCostoPrecio.numero_cambios}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Tabla de cambios recientes */}
                                <div className="mt-4 overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-b-sidebar-border dark:border-b-sidebar-border hover:bg-transparent">
                                                <TableHead className="text-gray-700 dark:text-gray-300">Fecha</TableHead>
                                                <TableHead className="text-gray-700 dark:text-gray-300">Producto</TableHead>
                                                <TableHead className="text-gray-700 dark:text-gray-300">Usuario</TableHead>
                                                <TableHead className="text-right text-gray-700 dark:text-gray-300">Costo anterior</TableHead>
                                                <TableHead className="text-right text-gray-700 dark:text-gray-300">Costo nuevo</TableHead>
                                                <TableHead className="text-right text-gray-700 dark:text-gray-300">Stock</TableHead>
                                                <TableHead className="text-right text-gray-700 dark:text-gray-300">Impacto</TableHead>
                                                <TableHead className="text-gray-700 dark:text-gray-300">Tipo</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {historialCostoPrecio.slice(0, 5).map((item) => (
                                                <TableRow
                                                    key={item.id}
                                                    className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50 hover:bg-sidebar/10 dark:hover:bg-sidebar/20 transition-colors"
                                                >
                                                    <TableCell className="text-sm">{item.fecha_formateada}</TableCell>
                                                    <TableCell className="font-medium">{item.producto.nombre_producto}</TableCell>
                                                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">{item.usuario.name}</TableCell>
                                                    <TableCell className="text-right font-mono text-sm text-gray-500">
                                                        {item.precio_anterior.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-sm font-semibold">
                                                        {item.precio_nuevo.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">{item.stock_momento}</TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        <span
                                                            className={
                                                                item.es_ganancia
                                                                    ? 'text-green-600 dark:text-green-400'
                                                                    : item.es_perdida
                                                                      ? 'text-red-600 dark:text-red-400'
                                                                      : 'text-gray-500'
                                                            }
                                                        >
                                                            {item.impacto_formateado}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={item.es_ganancia ? 'default' : item.es_perdida ? 'destructive' : 'secondary'}
                                                            className={
                                                                item.es_ganancia
                                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
                                                                    : item.es_perdida
                                                                      ? 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-200'
                                                                      : ''
                                                            }
                                                        >
                                                            {item.es_ganancia ? 'Ganancia' : item.es_perdida ? 'Pérdida' : 'Neutro'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                {historialCostoPrecio.length > 5 && (
                                    <div className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                                        Mostrando los últimos 5 de {historialCostoPrecio.length} cambios
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex h-[200px] items-center justify-center text-center">
                                <div className="space-y-2">
                                    <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                                    <div className="text-gray-500 dark:text-gray-400">No hay cambios de precio de costo registrados.</div>
                                    <div className="text-sm text-gray-400 dark:text-gray-500">
                                        Aparecerán aquí cuando un admin o moderador modifique el costo de un producto.
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
