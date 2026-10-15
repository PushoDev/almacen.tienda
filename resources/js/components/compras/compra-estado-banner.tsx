import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, Pencil, XCircle } from 'lucide-react';
import { CompraDetalle, EstadoCompra, formatearMoneda } from './tipos-compra';

export const ESTADO_COMPRA_CONFIG: Record<EstadoCompra, { label: string; icon: typeof Clock; classes: string; iconClasses: string }> = {
    pendiente: {
        label: 'Pendiente de aprobación',
        icon: Clock,
        classes: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300',
        iconClasses: 'text-amber-600 dark:text-amber-400',
    },
    aprobada: {
        label: 'Aprobada',
        icon: CheckCircle2,
        classes: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300',
        iconClasses: 'text-emerald-600 dark:text-emerald-400',
    },
    anulada: {
        label: 'Anulada',
        icon: XCircle,
        classes: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300',
        iconClasses: 'text-red-600 dark:text-red-400',
    },
};

interface CompraEstadoBannerProps {
    compra: CompraDetalle;
    onEditar: () => void;
    onAprobar: () => void;
    onAnular: () => void;
}

/** Resumen narrativo de qué pasó con cada fuente de dinero al anular, con nombres y montos reales. */
const resumenAnulacion = (compra: CompraDetalle): string[] => {
    if (compra.estado !== 'anulada') return [];

    const nombrePersona = compra.proveedor?.nombre || 'Sin registro';
    const lineas: string[] = [];
    const pagoDeuda = compra.pagos.find((p) => p.tipo_pago === 'deuda_proveedor');
    const pagosReales = compra.pagos.filter((p) => p.tipo_pago !== 'deuda_proveedor');

    if (compra.tipo_anulacion === 'reversion') {
        pagosReales.forEach((p) => {
            const nombre = p.tipo_pago === 'cuenta' ? (p.cuenta?.nombre_cuenta ?? 'la cuenta') : (p.cliente?.nombre_cliente ?? 'el cliente');
            lineas.push(`${formatearMoneda(p.monto)} volvieron a ${nombre}.`);
        });
        if (pagoDeuda) {
            lineas.push(`La deuda de ${formatearMoneda(pagoDeuda.monto)} con ${nombrePersona} se canceló.`);
        }
    } else if (compra.tipo_anulacion === 'fondo') {
        const totalFondo = pagosReales.reduce((acc, p) => acc + p.monto, 0);
        if (totalFondo > 0) {
            lineas.push(`${formatearMoneda(totalFondo)} quedaron como fondo a favor con ${nombrePersona}.`);
        }
        pagosReales.forEach((p) => {
            if (p.tipo_pago === 'cliente') {
                lineas.push(`${p.cliente?.nombre_cliente ?? 'El cliente'} sigue con una deuda de ${formatearMoneda(p.monto)} — no se le revirtió.`);
            } else {
                lineas.push(`La cuenta ${p.cuenta?.nombre_cuenta ?? ''} no recuperó los ${formatearMoneda(p.monto)} pagados.`);
            }
        });
        if (pagoDeuda) {
            lineas.push(
                `La deuda original de ${formatearMoneda(pagoDeuda.monto)} con ${nombrePersona} se canceló (esa parte nunca se convierte en fondo).`,
            );
        }
    }

    return lineas;
};

/** Banner de estado (pendiente / aprobada / anulada) y, si está pendiente, sus tres acciones. */
export default function CompraEstadoBanner({ compra, onEditar, onAprobar, onAnular }: CompraEstadoBannerProps) {
    const estado = ESTADO_COMPRA_CONFIG[compra.estado];
    const EstadoIcon = estado.icon;
    const resumen = resumenAnulacion(compra);

    return (
        <div className={cn('flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between', estado.classes)}>
            <div className="flex items-center gap-3">
                <EstadoIcon className={cn('h-6 w-6 shrink-0', estado.iconClasses)} />
                <div>
                    <p className="font-semibold">{estado.label}</p>
                    <p className="text-sm opacity-90">
                        {compra.estado === 'pendiente' && 'El stock aún no se sumó a los almacenes — falta aprobar esta compra.'}
                        {compra.estado === 'aprobada' && 'El stock ya está disponible en los almacenes indicados.'}
                        {compra.estado === 'anulada' &&
                            (compra.tipo_anulacion === 'fondo'
                                ? 'El dinero pagado quedó como fondo a favor — no todo volvió a su origen.'
                                : 'El dinero volvió exactamente a donde salió.')}
                    </p>
                    {resumen.length > 0 && (
                        <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm opacity-90">
                            {resumen.map((linea, i) => (
                                <li key={i}>{linea}</li>
                            ))}
                        </ul>
                    )}
                    {compra.estado === 'anulada' && compra.motivo_anulacion && (
                        <p className="mt-1 text-sm italic opacity-80">"{compra.motivo_anulacion}"</p>
                    )}
                </div>
            </div>

            {compra.estado === 'pendiente' && (
                <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" className="cursor-pointer" onClick={onEditar}>
                        <Pencil className="mr-1.5 h-4 w-4" />
                        Editar
                    </Button>
                    <Button size="sm" className="cursor-pointer bg-emerald-600 hover:bg-emerald-700" onClick={onAprobar}>
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        Aprobar
                    </Button>
                    <Button size="sm" variant="destructive" className="cursor-pointer" onClick={onAnular}>
                        <XCircle className="mr-1.5 h-4 w-4" />
                        Anular
                    </Button>
                </div>
            )}
        </div>
    );
}
