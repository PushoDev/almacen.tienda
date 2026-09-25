import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';

interface Props {
    abierto: boolean;
    archivo: string;
    tamano: string;
    almacen: string;
    cargando: boolean;
    /** Filas de la hoja con error: el servidor las omitirá con su motivo. */
    filasConError?: number;
    onConfirmar: () => void;
    onCancelar: () => void;
}

/** Confirmación previa: dice exactamente qué va a pasar con el archivo antes de tocar el inventario. */
export function ConfirmarImportacionDialog({ abierto, archivo, tamano, almacen, cargando, filasConError = 0, onConfirmar, onCancelar }: Props) {
    return (
        <Dialog open={abierto} onOpenChange={(estado) => !estado && !cargando && onCancelar()}>
            <DialogContent className="max-w-lg">
                <DialogHeader className="items-center text-center sm:text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <FileSpreadsheet className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <DialogTitle className="text-xl">¿Importar este archivo?</DialogTitle>
                    <DialogDescription>
                        <strong>{archivo}</strong> ({tamano}) se importará en <strong>{almacen}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                    <h4 className="mb-2 text-sm font-medium text-blue-800 dark:text-blue-200">Qué va a pasar</h4>
                    <ul className="space-y-1 text-left text-sm text-blue-700 dark:text-blue-300">
                        <li>• Cada fila con unidades crea un lote nuevo en {almacen}, con el costo de esa fila.</li>
                        <li>• Si el producto ya existe, se suma su stock y no cambia su costo. Un producto nunca pierde stock por importar.</li>
                        <li>• Las filas en 0 o vacías quedan registradas como productos sin stock (historial).</li>
                        <li>• Todo queda en el historial de importaciones y se puede deshacer si nada se movió.</li>
                    </ul>
                </div>

                {filasConError > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                        <strong>{filasConError}</strong> fila{filasConError === 1 ? '' : 's'} con error no se importará
                        {filasConError === 1 ? '' : 'n'}: quedarán en el historial con su motivo.
                    </div>
                )}

                <DialogFooter className="gap-2 sm:justify-center">
                    <Button variant="outline" onClick={onCancelar} disabled={cargando} className="cursor-pointer">
                        Cancelar
                    </Button>
                    <Button onClick={onConfirmar} disabled={cargando} className="cursor-pointer gap-2 bg-green-600 hover:bg-green-700">
                        {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {cargando ? 'Importando...' : 'Confirmar importación'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
