import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { router } from '@inertiajs/react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface CompraAprobarDialogProps {
    open: boolean;
    onOpenChange: (abierto: boolean) => void;
    compraId: number;
}

/** Confirmación de aprobar: recién ahí se suma el stock a los almacenes y la compra queda inmutable. */
export default function CompraAprobarDialog({ open, onOpenChange, compraId }: CompraAprobarDialogProps) {
    const [aprobando, setAprobando] = useState(false);

    const confirmar = () => {
        setAprobando(true);
        router.post(
            route('comprar.aprobar', compraId),
            {},
            {
                onFinish: () => {
                    setAprobando(false);
                    onOpenChange(false);
                },
            },
        );
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Aprobar esta compra?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Se sumará el stock a los almacenes indicados y quedará inmutable — ya no se podrá editar ni anular.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={aprobando}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmar} disabled={aprobando} className="bg-emerald-600 hover:bg-emerald-700">
                        {aprobando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Confirmar Aprobación
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
