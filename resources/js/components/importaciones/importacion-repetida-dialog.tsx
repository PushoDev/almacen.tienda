import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Link } from '@inertiajs/react';
import { CopyCheck, Loader2 } from 'lucide-react';
import { formatFechaHora, type AvisoImportacionRepetida } from './tipos';

interface Props {
    aviso: AvisoImportacionRepetida | null;
    almacen: string;
    cargando: boolean;
    onImportarDeTodosModos: () => void;
    onCancelar: () => void;
}

/** Aviso de archivo repetido: el mismo Excel ya se importó en este almacén; importarlo otra vez duplica stock y lotes. */
export function ImportacionRepetidaDialog({ aviso, almacen, cargando, onImportarDeTodosModos, onCancelar }: Props) {
    return (
        <Dialog open={aviso !== null} onOpenChange={(estado) => !estado && !cargando && onCancelar()}>
            <DialogContent className="max-w-lg">
                {aviso && (
                    <>
                        <DialogHeader className="items-center text-center sm:text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                                <CopyCheck className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                            </div>
                            <DialogTitle className="text-xl">Este archivo ya se importó</DialogTitle>
                            <DialogDescription>
                                <strong>{aviso.nombre_archivo}</strong> ya se importó en <strong>{almacen}</strong> el {formatFechaHora(aviso.fecha)}
                                {aviso.usuario ? ` por ${aviso.usuario}` : ''}.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                            <h4 className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-200">Si lo importas otra vez</h4>
                            <ul className="space-y-1 text-left text-sm text-amber-700 dark:text-amber-300">
                                <li>• Se suma de nuevo todo el stock del archivo y se crean lotes nuevos.</li>
                                <li>• Solo hazlo si esa mercancía de verdad llegó otra vez.</li>
                            </ul>
                        </div>

                        <DialogFooter className="gap-2 sm:justify-center">
                            <Button variant="outline" onClick={onCancelar} disabled={cargando} className="cursor-pointer">
                                No importar
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href={route('importaciones-productos.show', aviso.id)}>Ver importación #{aviso.id}</Link>
                            </Button>
                            <Button onClick={onImportarDeTodosModos} disabled={cargando} className="cursor-pointer bg-amber-600 hover:bg-amber-700">
                                {cargando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Importar de todos modos
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
