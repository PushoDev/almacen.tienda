import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { router } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';
import { type ResultadoImportacion } from './tipos';

interface Props {
    resultado: ResultadoImportacion | null;
    onClose: () => void;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: number }) {
    return (
        <div className="bg-muted/50 rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold">{valor.toLocaleString('es-ES')}</div>
            <div className="text-muted-foreground text-xs">{etiqueta}</div>
        </div>
    );
}

/** Resultado de una importación: éxito (verde) o con filas omitidas (ámbar), con los números concretos. */
export function ResultadoImportacionDialog({ resultado, onClose }: Props) {
    const conOmitidas = (resultado?.filas_omitidas ?? 0) > 0;

    return (
        <Dialog open={resultado !== null} onOpenChange={(abierto) => !abierto && onClose()}>
            <DialogContent className="max-w-lg">
                {resultado && (
                    <>
                        <DialogHeader className="items-center text-center sm:text-center">
                            <div
                                className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                                    conOmitidas ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'
                                }`}
                            >
                                {conOmitidas ? (
                                    <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                                ) : (
                                    <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                                )}
                            </div>
                            <DialogTitle className="text-xl">{conOmitidas ? 'Importación con filas omitidas' : '¡Importación completada!'}</DialogTitle>
                            <DialogDescription>
                                {resultado.nombre_archivo} → <strong>{resultado.almacen}</strong> · Importación #{resultado.id}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid grid-cols-3 gap-2">
                            <Dato etiqueta="Productos nuevos" valor={resultado.productos_creados} />
                            <Dato etiqueta="Lotes creados" valor={resultado.lotes_creados} />
                            <Dato etiqueta="Unidades" valor={resultado.unidades_importadas} />
                        </div>

                        {resultado.productos_sin_stock > 0 && (
                            <p className="text-muted-foreground text-center text-sm">
                                {resultado.productos_sin_stock} producto{resultado.productos_sin_stock === 1 ? '' : 's'} registrado
                                {resultado.productos_sin_stock === 1 ? '' : 's'} sin stock (quedan en el catálogo como historial).
                            </p>
                        )}

                        {conOmitidas && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                                <h4 className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                                    {resultado.filas_omitidas} fila{resultado.filas_omitidas === 1 ? '' : 's'} no se importaron
                                </h4>
                                <ul className="space-y-1 text-left text-sm text-amber-700 dark:text-amber-300">
                                    {resultado.omitidas.map((omitida) => (
                                        <li key={omitida.fila}>
                                            • Fila {omitida.fila}
                                            {omitida.nombre_producto ? ` (${omitida.nombre_producto})` : ''}: {omitida.motivo}
                                        </li>
                                    ))}
                                    {resultado.filas_omitidas > resultado.omitidas.length && (
                                        <li>• … y {resultado.filas_omitidas - resultado.omitidas.length} más en el detalle.</li>
                                    )}
                                </ul>
                            </div>
                        )}

                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                            <h4 className="mb-2 text-sm font-medium text-blue-800 dark:text-blue-200">¿Qué sigue?</h4>
                            <ul className="space-y-1 text-left text-sm text-blue-700 dark:text-blue-300">
                                <li>• Revisa el detalle fila por fila en el historial de importaciones.</li>
                                <li>• Si te equivocaste de archivo o de almacén, puedes deshacerla mientras nada de lo importado se haya vendido o movido.</li>
                                <li>• Los productos nuevos aún no tienen precio de venta: asígnalo en Precios de Venta para que salgan en el POS.</li>
                            </ul>
                        </div>

                        <DialogFooter className="gap-2 sm:justify-center">
                            <Button variant="outline" onClick={onClose} className="cursor-pointer">
                                Cerrar
                            </Button>
                            <Button
                                className="cursor-pointer bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => router.visit(route('importaciones-productos.show', resultado.id))}
                            >
                                <ClipboardList className="mr-2 h-4 w-4" />
                                Ver detalle
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
