import { cn } from '@/lib/utils';
import { AlertTriangle, Calendar, CreditCard, DollarSign, Hash, Wallet } from 'lucide-react';
import { CompraDetalle, formatearMoneda } from './tipos-compra';

const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

/** Cuatro mini-widgets: número, fecha, tipo (crédito / parcial / contado) y total. */
export default function CompraResumenWidgets({ compra }: { compra: CompraDetalle }) {
    const esDeuda = compra.tipo_compra === 'deuda_proveedor';
    const tipoLabel = esDeuda ? 'Crédito' : compra.es_parcial ? 'Parcial' : 'Contado';

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="bg-card rounded-lg border-l-4 border-slate-400 p-4 shadow-sm dark:border-slate-600">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        <Hash className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <h3 className="text-sm font-semibold">N° Compra</h3>
                </div>
                <p className="mt-2 text-sm font-medium">#{compra.id.toString().padStart(6, '0')}</p>
            </div>

            <div className="bg-card rounded-lg border-l-4 border-violet-400 p-4 shadow-sm dark:border-violet-600">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
                        <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <h3 className="text-sm font-semibold">Fecha</h3>
                </div>
                <p className="mt-2 text-sm font-medium">{formatearFecha(compra.fecha_compra)}</p>
            </div>

            <div
                className={cn(
                    'bg-card rounded-lg border-l-4 p-4 shadow-sm',
                    esDeuda
                        ? 'border-red-400 dark:border-red-600'
                        : compra.es_parcial
                          ? 'border-amber-400 dark:border-amber-600'
                          : 'border-emerald-400 dark:border-emerald-600',
                )}
            >
                <div className="flex items-center gap-2">
                    <div
                        className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                            esDeuda
                                ? 'bg-red-100 dark:bg-red-900/40'
                                : compra.es_parcial
                                  ? 'bg-amber-100 dark:bg-amber-900/40'
                                  : 'bg-emerald-100 dark:bg-emerald-900/40',
                        )}
                    >
                        {esDeuda ? (
                            <CreditCard className="h-4 w-4 text-red-600 dark:text-red-400" />
                        ) : compra.es_parcial ? (
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        ) : (
                            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                    </div>
                    <h3 className="text-sm font-semibold">Tipo</h3>
                </div>
                <p className="mt-2 text-sm font-medium">{tipoLabel}</p>
            </div>

            <div className="bg-card rounded-lg border-l-4 border-blue-400 p-4 shadow-sm dark:border-blue-600">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                        <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-sm font-semibold">Total</h3>
                </div>
                <p className="mt-2 text-sm font-medium">{formatearMoneda(compra.total_compra)}</p>
            </div>
        </div>
    );
}
