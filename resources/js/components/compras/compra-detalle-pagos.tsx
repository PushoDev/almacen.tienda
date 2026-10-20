import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CreditCard, Users, Wallet } from 'lucide-react';
import { CompraDetalle, formatearMoneda } from './tipos-compra';

/**
 * Detalles de Pago: cuentas y clientes de donde salió el dinero y cuánto puso cada uno. Si la compra está
 * anulada, estas filas se conservan a propósito (no se borran al anular) para mostrar qué pasó con cada fuente.
 */
export default function CompraDetallePagos({ compra }: { compra: CompraDetalle }) {
    if (compra.pagos.length === 0) return null;

    const anulada = compra.estado === 'anulada';

    return (
        <Card className="overflow-hidden border-0 pt-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-sky-600 to-sky-700 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                        <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-semibold text-white">
                            {anulada ? 'Detalles de Pago (original) — qué pasó con cada fuente' : 'Detalles de Pago'}
                        </CardTitle>
                        <CardDescription className="text-xs text-sky-100">
                            {compra.pagos.length} {compra.pagos.length === 1 ? 'fuente de pago' : 'fuentes de pago'}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-5">
                <div className="space-y-2">
                    {compra.pagos.map((pago, index) => {
                        const nombre =
                            pago.tipo_pago === 'cuenta'
                                ? (pago.cuenta?.nombre_cuenta ?? 'Cuenta')
                                : pago.tipo_pago === 'cliente'
                                  ? (pago.cliente?.nombre_cliente ?? 'Cliente')
                                  : 'Deuda con el asociado';

                        // Qué pasó con esta fuente si la compra terminó anulada. La porción de deuda siempre se
                        // revierte a 0, haya elegido el usuario 'reversion' o 'fondo'; solo cuenta/cliente cambian.
                        const estadoAnulacion = anulada
                            ? pago.tipo_pago === 'deuda_proveedor' || compra.tipo_anulacion === 'reversion'
                                ? { label: 'Revertido', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' }
                                : { label: 'Convertido en fondo', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' }
                            : null;

                        return (
                            <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    {pago.tipo_pago === 'cuenta' ? (
                                        <Wallet className="h-4 w-4 text-blue-600" />
                                    ) : pago.tipo_pago === 'cliente' ? (
                                        <Users className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <CreditCard className="h-4 w-4 text-amber-600" />
                                    )}
                                    <span className="font-medium">{nombre}</span>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            'text-xs',
                                            pago.tipo_pago === 'cuenta'
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                                : pago.tipo_pago === 'cliente'
                                                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                                        )}
                                    >
                                        {pago.tipo_pago === 'cuenta' ? 'Cuenta' : pago.tipo_pago === 'cliente' ? 'Cliente' : 'Crédito'}
                                    </Badge>
                                    {estadoAnulacion && (
                                        <Badge variant="outline" className={cn('text-xs', estadoAnulacion.className)}>
                                            {estadoAnulacion.label}
                                        </Badge>
                                    )}
                                </div>
                                <span
                                    className={cn(
                                        'font-bold',
                                        pago.tipo_pago === 'deuda_proveedor'
                                            ? 'text-red-600 dark:text-red-400'
                                            : 'text-emerald-600 dark:text-emerald-400',
                                    )}
                                >
                                    {formatearMoneda(pago.monto)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
