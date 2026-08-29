import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Info, Landmark } from 'lucide-react';

import type { MontoPorMoneda, ResumenFinanciero as ResumenFinancieroData } from '../types';
import { colorMoneda } from '../utils';

export default function ResumenFinanciero({
    resumenFinanciero,
    montosPorMoneda,
    totalCapital,
}: {
    resumenFinanciero?: ResumenFinancieroData | null;
    montosPorMoneda?: MontoPorMoneda[];
    totalCapital?: number;
}) {
    return (
        <div>
            {resumenFinanciero ? (
                <Card className="h-full overflow-hidden border-emerald-500/30 border-l-4 pt-0 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader className="border-b bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Landmark className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Resumen Financiero</CardTitle>
                                <CardDescription className="text-emerald-100">Capital total del negocio, desglosado por moneda</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b-sidebar-border dark:border-b-sidebar-border hover:bg-transparent">
                                    <TableHead className="text-gray-700 dark:text-gray-300">Moneda</TableHead>
                                    <TableHead className="text-right text-gray-700 dark:text-gray-300">Capital</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {resumenFinanciero.capital_por_moneda.length > 0 ? (
                                    resumenFinanciero.capital_por_moneda.map((item, index) => {
                                        const c = colorMoneda(item.codigo, index);
                                        return (
                                            <TableRow
                                                key={item.codigo}
                                                className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50 hover:bg-sidebar/10 dark:hover:bg-sidebar/20 transition-colors"
                                            >
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant="outline" className={`${c.bg} ${c.text} ${c.border}`}>
                                                            {item.codigo}
                                                        </Badge>
                                                        {item.incluye_clientes_proveedores_inventario && (
                                                            <span className="text-muted-foreground text-xs italic">
                                                                incluye clientes, proveedores e inventario
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {item.monto.toLocaleString('es-ES', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}{' '}
                                                    {item.simbolo}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50">
                                        <TableCell colSpan={2} className="py-8 text-center text-gray-500 dark:text-gray-400">
                                            No hay cuentas registradas todavía
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        <div className="border-sidebar-border dark:border-sidebar-border mt-4 flex justify-between border-t pt-2 font-semibold">
                            <span>Capital Financiero Total:</span>
                            <span>
                                {resumenFinanciero.moneda_principal.simbolo}{' '}
                                {resumenFinanciero.capital_financiero.toLocaleString('es-ES', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                        <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                            <Info className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                                El monto de <strong>{resumenFinanciero.moneda_principal.codigo}</strong> incluye, además del saldo real de las
                                cuentas, el saldo neto de clientes y proveedores y el valor del inventario — por eso no coincide con la suma
                                simple de solo cuentas. Las demás monedas muestran únicamente su saldo de cuentas.
                            </span>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-sidebar-border dark:border-sidebar-border">
                    <CardHeader className="border-b-sidebar-border dark:border-b-sidebar-border">
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            Tabla 1: Mis Montos por Moneda
                        </CardTitle>
                        <CardDescription>Montos asignados a tus cuentas por moneda</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b-sidebar-border dark:border-b-sidebar-border hover:bg-transparent">
                                    <TableHead className="text-gray-700 dark:text-gray-300">Moneda</TableHead>
                                    <TableHead className="text-right text-gray-700 dark:text-gray-300">Monto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {montosPorMoneda && montosPorMoneda.length > 0 ? (
                                    montosPorMoneda.map((item, index) => (
                                        <TableRow
                                            key={index}
                                            className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50 hover:bg-sidebar/10 dark:hover:bg-sidebar/20 transition-colors"
                                        >
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="secondary" className="capitalize">
                                                        {item.descripcion}
                                                    </Badge>
                                                    <span className="text-muted-foreground font-mono text-sm">{item.simbolo}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">
                                                {item.monto.toLocaleString('es-ES', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 6,
                                                })}{' '}
                                                {item.simbolo}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50">
                                        <TableCell colSpan={2} className="py-8 text-center text-gray-500 dark:text-gray-400">
                                            No tienes cuentas asignadas o no hay montos disponibles
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        {totalCapital !== undefined && montosPorMoneda && montosPorMoneda.length > 0 && (
                            <div className="border-sidebar-border dark:border-sidebar-border mt-4 flex justify-between border-t pt-2 font-semibold">
                                <span>Total Capital (USD):</span>
                                <span>
                                    {totalCapital.toLocaleString('es-ES', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}{' '}
                                    USD
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
