import { TurnoCapturaForm } from '@/components/TurnoCapturaForm';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Pencil, UserRound } from 'lucide-react';
import { useState } from 'react';

/**
 * Indicador persistente del turno activo, visible en el header de cada página (moderador/
 * vendedor únicamente). También permite cambiar de persona a mitad de turno de forma
 * voluntaria — a diferencia de TurnoBloqueante, este diálogo sí se puede cerrar/cancelar.
 */
export function TurnoIndicador() {
    const { turno } = usePage<SharedData>().props;
    const [abierto, setAbierto] = useState(false);

    if (!turno || turno.requiereCaptura || !turno.nombreVendedor) {
        return null;
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setAbierto(true)}
                className="border-border bg-muted/50 hover:bg-accent group hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors sm:flex"
                title="Cambiar quién atiende"
            >
                <UserRound className="text-muted-foreground h-3.5 w-3.5" />
                <span className="text-foreground font-medium">{turno.nombreVendedor}</span>
                <Pencil className="text-muted-foreground h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </button>

            <Dialog open={abierto} onOpenChange={setAbierto}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cambiar quién atiende</DialogTitle>
                        <DialogDescription>
                            Usa esto si otra persona toma el turno a mitad del día. El cambio queda registrado con la hora exacta.
                        </DialogDescription>
                    </DialogHeader>
                    <TurnoCapturaForm turno={turno} onSuccess={() => setAbierto(false)} />
                </DialogContent>
            </Dialog>
        </>
    );
}
