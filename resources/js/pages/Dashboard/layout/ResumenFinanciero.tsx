import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Info, Landmark, Truck } from 'lucide-react';

import type { MontoPorMoneda, ResumenFinanciero as ResumenFinancieroData } from '../types';
import { colorMoneda } from '../utils';

const formatearMonto = (valor: number) => valor.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Insignia real de la moneda, o un círculo con su símbolo mientras no tenga una asignada. */
function InsigniaMoneda({
    imagenUrl,
    nombre,
    simbolo,
    codigo,
    indice,
}: {
    imagenUrl: string | null | undefined;
    nombre: string;
    simbolo: string;
    codigo: string;
    indice: number;
}) {
    if (imagenUrl) {
        return <img src={imagenUrl} alt={nombre} className="h-9 w-auto max-w-16 shrink-0 object-contain drop-shadow-md" />;
    }
    const c = colorMoneda(codigo, indice);
    return <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${c.bg} ${c.text}`}>{simbolo.slice(0, 3)}</span>;
}

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
                                                        <InsigniaMoneda imagenUrl={item.imagen_url} nombre={item.nombre} simbolo={item.simbolo} codigo={item.codigo} indice={index} />
                                                        <div className="min-w-0 space-y-1">
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                <Badge variant="outline" className={`font-black ${c.bg} ${c.text} ${c.border}`}>
                                                                    {item.codigo}
                                                                </Badge>
                                                                {item.principal && (
                                                                    <Badge className="border border-amber-200 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 text-amber-950 shadow-md shadow-amber-500/40">
                                                                        Principal
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-muted-foreground truncate text-xs">{item.nombre}</p>
                                                            {item.incluye_clientes_proveedores_inventario && (
                                                                <p className="text-muted-foreground text-xs italic">incluye clientes, proveedores e inventario</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <h3 className={`text-xl font-bold tabular-nums ${item.monto < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                                        {item.monto < 0 ? '−' : ''}
                                                        {formatearMonto(Math.abs(item.monto))} {item.simbolo}
                                                    </h3>
                                                    {item.en_transito > 0 && (
                                                        <span className="mt-0.5 flex items-center justify-end gap-1 text-xs font-normal text-amber-600 dark:text-amber-400">
                                                            <Truck className="h-3 w-3" />
                                                            incluye {formatearMonto(item.en_transito)} {item.simbolo} en tránsito
                                                        </span>
                                                    )}
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
                        <div className="border-sidebar-border dark:border-sidebar-border mt-4 flex items-center justify-between border-t pt-3">
                            <span className="font-semibold">Capital Financiero Total:</span>
                            <div className="text-right">
                                <h3 className="text-2xl font-black tabular-nums">
                                    {resumenFinanciero.moneda_principal.simbolo} {formatearMonto(resumenFinanciero.capital_financiero)}
                                </h3>
                                {resumenFinanciero.en_transito_usd > 0 && (
                                    <span className="mt-0.5 flex items-center justify-end gap-1 text-xs font-normal text-amber-600 dark:text-amber-400">
                                        <Truck className="h-3 w-3" />
                                        incluye {resumenFinanciero.moneda_principal.simbolo} {formatearMonto(resumenFinanciero.en_transito_usd)} en tránsito
                                    </span>
                                )}
                            </div>
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
                                    montosPorMoneda.map((item, index) => {
                                        const codigo = item.codigo ?? item.simbolo;
                                        const c = colorMoneda(codigo, index);
                                        return (
                                            <TableRow
                                                key={codigo}
                                                className="border-b-sidebar-border/50 dark:border-b-sidebar-border/50 hover:bg-sidebar/10 dark:hover:bg-sidebar/20 transition-colors"
                                            >
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <InsigniaMoneda imagenUrl={item.imagen_url} nombre={item.descripcion} simbolo={item.simbolo} codigo={codigo} indice={index} />
                                                        <div className="min-w-0 space-y-1">
                                                            <Badge variant="outline" className={`font-black ${c.bg} ${c.text} ${c.border}`}>
                                                                {codigo}
                                                            </Badge>
                                                            <p className="text-muted-foreground truncate text-xs">{item.descripcion}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <h3 className={`text-xl font-bold tabular-nums ${item.monto < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                                        {item.monto < 0 ? '−' : ''}
                                                        {formatearMonto(Math.abs(item.monto))} {item.simbolo}
                                                    </h3>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
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
                            <div className="border-sidebar-border dark:border-sidebar-border mt-4 flex items-center justify-between border-t pt-3">
                                <span className="font-semibold">Total Capital (USD):</span>
                                <h3 className="text-2xl font-black tabular-nums">{formatearMonto(totalCapital)} USD</h3>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
