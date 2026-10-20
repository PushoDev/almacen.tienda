import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sileo } from '@/lib/sileo';
import { useForm } from '@inertiajs/react';
import { Loader2, XCircle } from 'lucide-react';
import { CargoCasillero, formatearUsd } from './tipos-casillero';

interface CasilleroAnularCargoDialogProps {
    open: boolean;
    onOpenChange: (abierto: boolean) => void;
    cargo: CargoCasillero | null;
}

/** Anula un cargo: el dinero vuelve a la cuenta que lo pagó y el gasto queda cancelado. */
export default function CasilleroAnularCargoDialog({ open, onOpenChange, cargo }: CasilleroAnularCargoDialogProps) {
    const form = useForm({ motivo: '' });

    const confirmar = () => {
        if (!cargo) return;

        form.post(route('casillero.cargos.anular', cargo.id), {
            preserveScroll: true,
            onSuccess: () => {
                sileo.success({ title: 'Cargo anulado', description: 'El dinero volvió a la cuenta.' });
                form.reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Anular cargo</DialogTitle>
                    <DialogDescription>
                        {cargo
                            ? `«${cargo.concepto}» por ${formatearUsd(cargo.monto_usd)}: el dinero vuelve exactamente a la cuenta que lo pagó.`
                            : ''}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <Label htmlFor="motivo">Motivo</Label>
                    <Textarea
                        id="motivo"
                        rows={3}
                        maxLength={255}
                        placeholder="¿Por qué se anula este cargo?"
                        value={form.data.motivo}
                        onChange={(e) => form.setData('motivo', e.target.value)}
                    />
                    {form.errors.motivo && <p className="text-sm text-red-600">{form.errors.motivo}</p>}
                    {form.errors.error && <p className="text-sm text-red-600">{form.errors.error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={form.processing}>
                        Cancelar
                    </Button>
                    <Button variant="destructive" onClick={confirmar} disabled={form.processing || !form.data.motivo.trim()}>
                        {form.processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                        Anular cargo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
