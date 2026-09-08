import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { TurnoCapturaForm } from '@/components/TurnoCapturaForm';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

/**
 * Diálogo bloqueante global (moderador/vendedor únicamente) — se muestra automáticamente
 * mientras `turno.requiereCaptura` sea true en la prop compartida, encima de cualquier
 * página. Sin botón cancelar, sin cerrar con Escape ni click afuera: solo se resuelve
 * capturando el turno (el `open` está atado directo a la prop del servidor, no a estado
 * local, así que aunque Radix intente cerrarlo, vuelve a quedar en true en el próximo
 * render mientras el servidor siga diciendo que hace falta capturar).
 */
export default function TurnoBloqueante() {
    const { turno } = usePage<SharedData>().props;

    if (!turno || !turno.requiereCaptura) {
        return null;
    }

    return (
        <AlertDialog open onOpenChange={() => {}}>
            <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()} onPointerDownOutside={(e) => e.preventDefault()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Quién está atendiendo hoy?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Antes de continuar, indica el nombre de la persona que va a atender este turno. Queda registrado para auditoría interna.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <TurnoCapturaForm turno={turno} />
            </AlertDialogContent>
        </AlertDialog>
    );
}
