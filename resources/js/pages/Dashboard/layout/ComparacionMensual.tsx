import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Info, TrendingUp } from 'lucide-react';

import type { ComparacionMensual as ComparacionMensualData } from '../types';
import { colorMoneda } from '../utils';

export default function ComparacionMensual({
    comparaciones,
    userRole,
}: {
    comparaciones?: ComparacionMensualData[];
    userRole: 'admin' | 'moderador' | 'vendedor';
}) {
    if (userRole === 'vendedor') {
        return null;
    }

    return (
        <div>
            <Card className="h-full overflow-hidden border-blue-500/30 border-l-4 pt-0 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Comparación Mensual</CardTitle>
                                <CardDescription className="text-blue-100">Comparación entre el mes actual y el mes anterior</CardDescription>
                            </div>
                        </div>
                        <button
                            onClick={() => window.open(route('dashboard.historial.comparaciones.view'), '_blank')}
                            className="flex cursor-pointer items-center gap-2 rounded-md bg-white/20 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                        >
                            <TrendingUp className="h-4 w-4" />
                            Ver Historial
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b-sidebar-border dark:border-b-sidebar-border hover:bg-transparent">
                                <TableHead className="text-gray-700 dark:text-gray-300">Moneda</TableHead>
                                <TableHead className="text-right text-gray-700 dark:text-gray-300">Mes Anterior</TableHead>
                                <TableHead className="text-right text-gray-700 dark:text-gray-300">Mes Actual</TableHead>
                                <TableHead className="text-right text-gray-700 dark:text-gray-300">Saldo Acumulado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {comparaciones && comparaciones.length > 0 ? (
                                (() => {
                                    // Clientes, Proveedores e Inventario se muestran aparte de las monedas reales
                                    // (su propia fila con borde punteado, sin tasa de cambio propia — igual que
                                    // antes), pero SÍ cuentan dentro de "Totales" (confirmado por el cliente
                                    // 2026-08-25 — antes Inventario quedaba fuera a propósito, ya no; Proveedores
                                    // se agregó el mismo día tras notar que Totales daba más que Capital
                                    // Financiero por excluir esta deuda, que es negativa).
                                    const filasMonedas = comparaciones.filter(
                                        (c) => c.moneda !== 'INVENTARIO' && c.moneda !== 'CLIENTES' && c.moneda !== 'PROVEEDORES',
                                    );
                                    const filaInventario = comparaciones.find((c) => c.moneda === 'INVENTARIO');
                                    const filaClientes = comparaciones.find((c) => c.moneda === 'CLIENTES');
                                    const filaProveedores = comparaciones.find((c) => c.moneda === 'PROVEEDORES');

                                    const totalMesAnterior = comparaciones.reduce(
                                        (sum, comp) => sum + comp.monto_anterior / (comp.tasa_cambio || 1),
                                        0,
                                    );
                                    const totalDiferencia = comparaciones.reduce(
                                        (sum, comp) => sum + comp.diferencia / (comp.tasa_cambio || 1),
                                        0,
                                    );
                                    const totalSaldoAcumulado = comparaciones.reduce(
                                        (sum, comp) => sum + comp.monto_actual / (comp.tasa_cambio || 1),
                                        0,
                                    );

                                    const filaComparacion = (comparacion: ComparacionMensualData, index: number) => {
                                        const c = colorMoneda(comparacion.moneda, index);
                                        return (
                                            <TableRow
                                                key={comparacion.moneda}
                                                className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50 hover:bg-sidebar/10 dark:hover:bg-sidebar/20 transition-colors"
                                            >
                                                <TableCell className="font-medium">
                                                    <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border}`}>
                                                        {comparacion.moneda}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {comparacion.monto_anterior.toLocaleString('es-ES', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 6,
                                                    })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span
                                                        className={
                                                            comparacion.es_positivo
                                                                ? 'font-medium text-green-600 dark:text-green-400'
                                                                : 'font-medium text-red-600 dark:text-red-400'
                                                        }
                                                    >
                                                        {comparacion.diferencia >= 0 ? '+' : ''}
                                                        {comparacion.diferencia.toLocaleString('es-ES', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 6,
                                                        })}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {comparacion.monto_actual.toLocaleString('es-ES', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 6,
                                                    })}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    };

                                    // Fila especial (Inventario/Clientes): mismo shape que filaComparacion pero
                                    // con borde punteado y una etiqueta que explica qué es — no son monedas
                                    // reales, no tienen tasa de cambio propia, pero sí suman a Totales.
                                    const filaEspecial = (fila: ComparacionMensualData, etiqueta: string) => (
                                        <TableRow
                                            key={fila.moneda}
                                            className="border-t-sidebar-border dark:border-t-sidebar-border hover:bg-sidebar/10 dark:hover:bg-sidebar/20 border-t-2 border-dashed transition-colors"
                                        >
                                            <TableCell className="font-medium">
                                                <Badge
                                                    variant="outline"
                                                    className={`${colorMoneda(fila.moneda, 0).bg} ${colorMoneda(fila.moneda, 0).text} ${colorMoneda(fila.moneda, 0).border}`}
                                                >
                                                    {fila.moneda}
                                                </Badge>
                                                <span className="text-muted-foreground ml-2 text-xs italic">{etiqueta}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {fila.monto_anterior.toLocaleString('es-ES', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 6,
                                                })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span
                                                    className={
                                                        fila.es_positivo
                                                            ? 'font-medium text-green-600 dark:text-green-400'
                                                            : 'font-medium text-red-600 dark:text-red-400'
                                                    }
                                                >
                                                    {fila.diferencia >= 0 ? '+' : ''}
                                                    {fila.diferencia.toLocaleString('es-ES', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 6,
                                                    })}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {fila.monto_actual.toLocaleString('es-ES', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 6,
                                                })}
                                            </TableCell>
                                        </TableRow>
                                    );

                                    return (
                                        <>
                                            {filasMonedas.map((comparacion, index) => filaComparacion(comparacion, index))}
                                            {filaInventario && filaEspecial(filaInventario, 'valor de inventario (Productos)')}
                                            {filaClientes && filaEspecial(filaClientes, 'saldo neto de clientes')}
                                            {filaProveedores && filaEspecial(filaProveedores, 'saldo neto de proveedores')}

                                            <TableRow className="bg-muted/40 hover:bg-muted/40 font-semibold">
                                                <TableCell>Totales</TableCell>
                                                <TableCell className="text-right">
                                                    {totalMesAnterior.toLocaleString('es-ES', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}{' '}
                                                    USD
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span
                                                        className={
                                                            totalDiferencia >= 0
                                                                ? 'text-green-600 dark:text-green-400'
                                                                : 'text-red-600 dark:text-red-400'
                                                        }
                                                    >
                                                        {totalDiferencia >= 0 ? '+' : ''}
                                                        {totalDiferencia.toLocaleString('es-ES', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}{' '}
                                                        USD
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {totalSaldoAcumulado.toLocaleString('es-ES', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}{' '}
                                                    USD
                                                </TableCell>
                                            </TableRow>
                                        </>
                                    );
                                })()
                            ) : (
                                <TableRow className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50">
                                    <TableCell colSpan={4} className="py-8 text-center text-gray-500 dark:text-gray-400">
                                        No hay datos históricos disponibles para comparar
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                            <strong>Saldo Acumulado</strong> es el saldo total real de las cuentas ahora mismo (mismo valor que el Resumen
                            Financiero). <strong>Mes Actual</strong> muestra cuánto cambió ese saldo desde que cerró el mes pasado — esa columna
                            sí puede aparecer en rojo si el saldo bajó, eso no significa que la cuenta esté en negativo.
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
