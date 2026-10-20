import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import { Loader2, XCircle } from 'lucide-react';

interface CompraAnularDialogProps {
    open: boolean;
    onOpenChange: (abierto: boolean) => void;
    compraId: number;
    /** Una compra 100% a deuda no tiene pago real: solo se puede revertir, no convertir en fondo. */
    esDeuda: boolean;
}

/** Anulación de una compra pendiente: el dinero vuelve a su origen (reversión) o queda como fondo a favor. */
export default function CompraAnularDialog({ open, onOpenChange, compraId, esDeuda }: CompraAnularDialogProps) {
    const form = useForm({
        tipo_anulacion: 'reversion' as 'reversion' | 'fondo',
        motivo_anulacion: '',
    });

    const confirmar = () => {
        form.post(route('comprar.anular', compraId), {
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Anular Compra #{compraId}</DialogTitle>
                    <DialogDescription>Como el stock nunca se sumó, la anulación es puramente financiera.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>¿Qué pasa con el dinero?</Label>
                        <div className="grid gap-2 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => form.setData('tipo_anulacion', 'reversion')}
                                className={cn(
                                    'rounded-lg border-2 p-3 text-left text-sm transition-colors',
                                    form.data.tipo_anulacion === 'reversion'
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                                        : 'border-gray-200 dark:border-gray-700',
                                )}
                            >
                                <p className="font-semibold">Reversión total</p>
                                <p className="text-muted-foreground text-xs">Todo el dinero vuelve exactamente a donde salió.</p>
                            </button>
                            <button
                                type="button"
                                disabled={esDeuda}
                                onClick={() => !esDeuda && form.setData('tipo_anulacion', 'fondo')}
                                className={cn(
                                    'rounded-lg border-2 p-3 text-left text-sm transition-colors',
                                    esDeuda
                                        ? 'cursor-not-allowed border-gray-100 opacity-50 dark:border-gray-800'
                                        : form.data.tipo_anulacion === 'fondo'
                                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
                                          : 'border-gray-200 dark:border-gray-700',
                                )}
                            >
                                <p className="font-semibold">Convertir en fondo</p>
                                <p className="text-muted-foreground text-xs">
                                    {esDeuda
                                        ? 'No disponible: esta compra fue 100% a deuda, sin pago real.'
                                        : 'Lo pagado queda como crédito a favor con el asociado.'}
                                </p>
                            </button>
                        </div>
                        {form.errors.tipo_anulacion && <p className="text-sm text-red-600">{form.errors.tipo_anulacion}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="motivo_anulacion">Motivo</Label>
                        <Textarea
                            id="motivo_anulacion"
                            value={form.data.motivo_anulacion}
                            onChange={(e) => form.setData('motivo_anulacion', e.target.value)}
                            placeholder="¿Por qué se anula esta compra?"
                            rows={3}
                        />
                        {form.errors.motivo_anulacion && <p className="text-sm text-red-600">{form.errors.motivo_anulacion}</p>}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={form.processing}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={confirmar} disabled={form.processing}>
                        {form.processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                        Confirmar Anulación
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
