import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Info, Scale, TrendingDown, TrendingUp } from 'lucide-react';

import type { CrecimientoCapitalMes as CrecimientoCapitalMesData } from '../types';

const formatearMonto = (valor: number) => valor.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const conSigno = (valor: number) => `${valor >= 0 ? '+' : '−'}${formatearMonto(Math.abs(valor))}`;

const colorSigno = (valor: number) => (valor >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400');

/** «septiembre de 2026» a partir del primer día del mes (`YYYY-MM-DD`). */
const nombreDelMes = (primerDia: string) => {
    const [anio, mes] = primerDia.split('-').map(Number);

    return new Date(anio, mes - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
};

export default function CrecimientoCapitalMes({ crecimientoCapitalMes }: { crecimientoCapitalMes: CrecimientoCapitalMesData }) {
    const {
        capital_actual,
        cierre_mes_anterior,
        crecimiento,
        margen_ventas,
        comision_ventas,
        cambiaria_y_ajustes_ventas,
        ganancia_ventas,
        ganancia_transferencias,
        ganancia_remesas,
        ganancia_operaciones,
        gastos,
        ingresos,
        otros_efectos,
        mes_anterior,
    } = crecimientoCapitalMes;
    const mesAnterior = nombreDelMes(mes_anterior);

    // Escalera: cada subtotal es la suma de las filas que tiene encima desde el subtotal anterior.
    const filas: { nombre: string; valor: number; subtotal?: boolean }[] =
        crecimiento === null || otros_efectos === null
            ? []
            : [
                  { nombre: 'Margen de productos (precio − costo)', valor: margen_ventas },
                  { nombre: 'Comisiones', valor: -comision_ventas },
                  { nombre: 'Diferencia cambiaria y ajustes de ventas', valor: cambiaria_y_ajustes_ventas },
                  { nombre: 'Ganancia de ventas', valor: ganancia_ventas, subtotal: true },
                  { nombre: 'Transferencias con tasa distinta', valor: ganancia_transferencias },
                  { nombre: 'Remesas (entra − sale − mensajero)', valor: ganancia_remesas },
                  { nombre: 'Ganancia de operaciones (antes de gastos)', valor: ganancia_operaciones, subtotal: true },
                  { nombre: 'Gastos del mes', valor: -gastos },
                  { nombre: 'Ingresos del mes', valor: ingresos },
                  { nombre: 'Otros efectos (tasas, inventario, ajustes)', valor: otros_efectos },
                  { nombre: 'Crecimiento del capital (ganancia real del mes)', valor: crecimiento, subtotal: true },
              ];

    return (
        <Card className="overflow-hidden border-l-4 border-indigo-500/30 pt-0 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="border-b bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                        <Scale className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-white">Crecimiento del Capital del Mes</CardTitle>
                        <CardDescription className="text-indigo-100">
                            Capital de hoy contra el cierre de {mesAnterior} guardado por el sistema, en USD
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                        <p className="text-muted-foreground text-xs">Capital de hoy</p>
                        <p className="mt-1 text-xl font-semibold">{formatearMonto(capital_actual)} USD</p>
                        <p className="text-muted-foreground mt-1 text-xs">Cuentas + clientes + inventario + dinero en tránsito</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                        <p className="text-muted-foreground text-xs">Cierre de {mesAnterior}</p>
                        <p className="mt-1 text-xl font-semibold">{cierre_mes_anterior === null ? '—' : `${formatearMonto(cierre_mes_anterior)} USD`}</p>
                        <p className="text-muted-foreground mt-1 text-xs">
                            {cierre_mes_anterior === null ? 'El sistema no guardó un cierre de ese mes' : 'Cada moneda a la tasa de ese cierre'}
                        </p>
                    </div>
                    <div className="rounded-lg border-2 border-indigo-300 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950/40">
                        <p className="text-xs text-indigo-800 dark:text-indigo-300">Crecimiento del mes</p>
                        <p
                            className={`mt-1 flex items-center gap-1 text-xl font-bold ${crecimiento === null ? '' : colorSigno(crecimiento)}`}
                        >
                            {crecimiento !== null && (crecimiento >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />)}
                            {crecimiento === null ? '—' : `${conSigno(crecimiento)} USD`}
                        </p>
                        <p className="mt-1 text-xs text-indigo-800/70 dark:text-indigo-300/70">Lo que el Excel llama «Acumulado actual»</p>
                    </div>
                </div>

                {filas.length > 0 && (
                    <div className="mt-4 overflow-hidden rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>De la venta al crecimiento del capital</TableHead>
                                    <TableHead className="text-right">USD</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filas.map((fila) => (
                                    <TableRow key={fila.nombre} className={fila.subtotal ? 'bg-indigo-50 font-semibold dark:bg-indigo-950/40' : ''}>
                                        <TableCell className={fila.subtotal ? '' : 'pl-6'}>{fila.nombre}</TableCell>
                                        <TableCell className={`text-right ${fila.subtotal ? '' : 'font-medium'} ${colorSigno(fila.valor)}`}>
                                            {conSigno(fila.valor)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        «Ganancia de Ventas, Transferencias y Remesas» llega hasta «Ganancia de operaciones». Esta tarjeta sigue hasta el final: también cuentan
                        los gastos, los ingresos y los cambios de tasa o de inventario, y por eso es la cifra comparable con el Excel.
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}
