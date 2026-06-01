import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { Payment } from './PaymentForm';

interface PaymentListProps {
    payments: Payment[];
    total: number;
    onRemovePayment: (id: string) => void;
}

export default function PaymentList({ payments, total, onRemovePayment }: PaymentListProps) {
    const totalPaid      = payments.reduce((sum, p) => sum + p.amountInUsd, 0);
    const remainingInUsd = total - totalPaid;

    if (payments.length === 0) {
        return (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed">
                <p className="text-muted-foreground text-sm">Sin pagos agregados</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-2 rounded-lg border p-3 text-center text-xs">
                <div>
                    <p className="text-muted-foreground mb-0.5">Total</p>
                    <p className="text-primary text-sm font-bold">
                        ${total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div>
                    <p className="text-muted-foreground mb-0.5">Pagado</p>
                    <p className="text-sm font-bold text-green-600">
                        ${totalPaid.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div>
                    <p className="text-muted-foreground mb-0.5">Restante</p>
                    <p className={`text-sm font-bold ${remainingInUsd > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                        ${Math.max(0, remainingInUsd).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Lista de pagos */}
            <div className="space-y-2">
                <p className="text-sm font-medium">Pagos agregados ({payments.length})</p>
                {payments.map((payment) => (
                    <div
                        key={payment.id}
                        className="bg-card flex items-center justify-between rounded border p-3 shadow-sm"
                    >
                        <div className="flex-1">
                            <p className="text-sm font-medium">
                                {payment.method === 'transferencia'
                                    ? `Transferencia (${payment.via})`
                                    : 'Efectivo'}
                            </p>
                            <p className="text-muted-foreground text-xs">
                                {payment.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                                {payment.moneda_info?.simbolo}
                                {payment.referencia ? ` — Ref: ${payment.referencia}` : ''}
                            </p>
                            <p className="text-xs font-medium text-green-600">
                                = ${payment.amountInUsd.toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemovePayment(payment.id)}
                            className="text-red-500 hover:text-red-700"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
