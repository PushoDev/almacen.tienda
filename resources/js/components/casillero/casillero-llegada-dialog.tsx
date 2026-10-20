import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sileo } from '@/lib/sileo';
import { useForm } from '@inertiajs/react';
import { Loader2, PlaneLanding } from 'lucide-react';
import { useEffect } from 'react';
import { CompraCasillero } from './tipos-casillero';

interface CasilleroLlegadaDialogProps {
    open: boolean;
    onOpenChange: (abierto: boolean) => void;
    compra: CompraCasillero | null;
}

const hoy = () => new Date().toLocaleDateString('en-CA');

/** Anota el día en que la compra llegó al casillero de Panamá (desde ahí corre la estadía). */
export default function CasilleroLlegadaDialog({ open, onOpenChange, compra }: CasilleroLlegadaDialogProps) {
    const form = useForm({ fecha: hoy() });

    useEffect(() => {
        if (open && compra) {
            form.setData('fecha', compra.llegada_panama_at ?? hoy());
        }
        // Solo al abrir sobre una compra.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, compra?.id]);

    const guardar = () => {
        if (!compra) return;

        form.post(route('casillero.compras.llegada-panama', compra.id), {
            preserveScroll: true,
            onSuccess: () => {
                sileo.success({ title: 'Llegada anotada', description: `La compra #${compra.id} llegó a Panamá el ${form.data.fecha}.` });
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PlaneLanding className="h-5 w-5 text-sky-600" />
                        Llegada a Panamá
                    </DialogTitle>
                    <DialogDescription>{compra ? `Compra #${compra.id}${compra.proveedor ? ` · ${compra.proveedor}` : ''}` : ''}</DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                    <Label htmlFor="fecha-llegada">Fecha de llegada</Label>
                    <Input id="fecha-llegada" type="date" value={form.data.fecha} onChange={(e) => form.setData('fecha', e.target.value)} />
                    {form.errors.fecha && <p className="text-sm text-red-600">{form.errors.fecha}</p>}
                    {form.errors.error && <p className="text-sm text-red-600">{form.errors.error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={form.processing}>
                        Cancelar
                    </Button>
                    <Button onClick={guardar} disabled={form.processing || !form.data.fecha} className="bg-sky-600 hover:bg-sky-700">
                        {form.processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlaneLanding className="mr-2 h-4 w-4" />}
                        Guardar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
