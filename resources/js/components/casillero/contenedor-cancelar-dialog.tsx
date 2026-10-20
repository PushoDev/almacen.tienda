import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { errorDe } from '@/lib/errores';
import { sileo } from '@/lib/sileo';
import { useForm } from '@inertiajs/react';
import { Loader2, XCircle } from 'lucide-react';
import { ContenedorCasillero } from './tipos-casillero';

interface ContenedorCancelarDialogProps {
    open: boolean;
    onOpenChange: (abierto: boolean) => void;
    contenedor: ContenedorCasillero | null;
}

/** Cancela un contenedor abierto: sus unidades vuelven al casillero. Con cargos activos no se puede. */
export default function ContenedorCancelarDialog({ open, onOpenChange, contenedor }: ContenedorCancelarDialogProps) {
    const form = useForm({});

    const confirmar = () => {
        if (!contenedor) return;

        form.post(route('casillero.contenedores.cancelar', contenedor.id), {
            preserveScroll: true,
            onSuccess: () => {
                sileo.success({ title: 'Contenedor cancelado', description: 'Sus unidades volvieron al casillero.' });
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Cancelar contenedor</DialogTitle>
                    <DialogDescription>
                        {contenedor
                            ? `«${contenedor.nombre}» lleva ${contenedor.unidades} unidades: al cancelarlo vuelven al casillero para el próximo contenedor.`
                            : ''}
                    </DialogDescription>
                </DialogHeader>

                {contenedor && contenedor.cargos.length > 0 && (
                    <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                        Tiene {contenedor.cargos.length} cargo(s) activo(s): anúlalos primero para poder cancelarlo.
                    </p>
                )}
                {errorDe(form.errors, 'error') && <p className="text-sm text-red-600">{errorDe(form.errors, 'error')}</p>}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={form.processing}>
                        Volver
                    </Button>
                    <Button variant="destructive" onClick={confirmar} disabled={form.processing}>
                        {form.processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                        Cancelar contenedor
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
