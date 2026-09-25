import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { sileo } from '@/lib/sileo';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { Loader2, ShieldAlert, Undo2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface VistaPrevia {
    revertible: boolean;
    lotes: number;
    unidades: number;
    bloqueos: string[];
}

interface Props {
    importacionId: number;
    abierto: boolean;
    onCerrar: () => void;
    /** Bloqueos que el servidor devolvió al intentar deshacer (por si algo cambió después de la vista previa). */
    bloqueosServidor?: string[] | null;
}

/**
 * Deshacer una importación: primero muestra qué se quitaría (vista previa, sin tocar nada) y, si algo
 * lo impide, la lista de bloqueos. Solo si se puede pide el motivo y la contraseña.
 */
export function RevertirImportacionDialog({ importacionId, abierto, onCerrar, bloqueosServidor }: Props) {
    const [vista, setVista] = useState<VistaPrevia | null>(null);
    const [cargando, setCargando] = useState(false);
    const [motivo, setMotivo] = useState('');
    const [password, setPassword] = useState('');
    const [errores, setErrores] = useState<Record<string, string>>({});
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (!abierto) return;

        setVista(null);
        setMotivo('');
        setPassword('');
        setErrores({});
        setCargando(true);
        axios
            .get<VistaPrevia>(route('importaciones-productos.vista-previa-reversion', importacionId))
            .then((respuesta) => setVista(respuesta.data))
            .catch(() => sileo.error({ title: 'No se pudo revisar la importación', description: 'Inténtalo de nuevo' }))
            .finally(() => setCargando(false));
    }, [abierto, importacionId]);

    const bloqueos = bloqueosServidor?.length ? bloqueosServidor : (vista?.bloqueos ?? []);
    const puedeDeshacer = vista?.revertible === true && !bloqueosServidor?.length;

    const deshacer = () => {
        setEnviando(true);
        router.post(
            route('importaciones-productos.revertir', importacionId),
            { motivo_reversion: motivo, password_confirmacion: password },
            {
                preserveScroll: true,
                onSuccess: () => {
                    sileo.success({ title: 'Importación deshecha', description: 'El stock y los lotes se descontaron.' });
                    onCerrar();
                },
                onError: (recibidos) => {
                    setErrores(recibidos);
                    if (recibidos.revertir) sileo.error({ title: 'No se pudo deshacer', description: recibidos.revertir });
                },
                onFinish: () => setEnviando(false),
            },
        );
    };

    return (
        <Dialog open={abierto} onOpenChange={(estado) => !estado && !enviando && onCerrar()}>
            <DialogContent className="max-w-lg">
                <DialogHeader className="items-center text-center sm:text-center">
                    <div
                        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                            !cargando && bloqueos.length > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                        }`}
                    >
                        {!cargando && bloqueos.length > 0 ? (
                            <ShieldAlert className="h-8 w-8 text-red-600 dark:text-red-400" />
                        ) : (
                            <Undo2 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                        )}
                    </div>
                    <DialogTitle className="text-xl">Deshacer importación #{importacionId}</DialogTitle>
                    <DialogDescription>Antes de continuar, revisa qué se quitaría del inventario.</DialogDescription>
                </DialogHeader>

                {cargando && (
                    <div className="space-y-2">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                )}

                {!cargando && bloqueos.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                        <h4 className="mb-2 text-sm font-medium text-red-800 dark:text-red-200">No se puede deshacer: parte de lo importado ya se movió</h4>
                        <ul className="space-y-1 text-left text-sm text-red-700 dark:text-red-300">
                            {bloqueos.map((bloqueo) => (
                                <li key={bloqueo}>• {bloqueo}</li>
                            ))}
                        </ul>
                        <p className="mt-2 text-xs text-red-600 dark:text-red-400">Se deshace todo o nada: mientras algo lo impida, no se toca nada.</p>
                    </div>
                )}

                {!cargando && puedeDeshacer && vista && (
                    <>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                            <h4 className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-200">Se va a quitar</h4>
                            <ul className="space-y-1 text-left text-sm text-amber-700 dark:text-amber-300">
                                <li>
                                    • <strong>{vista.lotes}</strong> lote{vista.lotes === 1 ? '' : 's'} creado{vista.lotes === 1 ? '' : 's'} por esta importación
                                </li>
                                <li>
                                    • <strong>{vista.unidades.toLocaleString('es-ES')}</strong> unidad{vista.unidades === 1 ? '' : 'es'} del stock del almacén
                                </li>
                                <li>• Las fichas de producto que se crearon se conservan.</li>
                            </ul>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <Label htmlFor="motivo-reversion">Motivo</Label>
                                <Textarea
                                    id="motivo-reversion"
                                    value={motivo}
                                    onChange={(e) => setMotivo(e.target.value)}
                                    placeholder="Ej: se subió el archivo al almacén equivocado"
                                    rows={2}
                                    disabled={enviando}
                                />
                                {errores.motivo_reversion && <p className="text-xs text-red-600">{errores.motivo_reversion}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="password-reversion">Tu contraseña</Label>
                                <Input
                                    id="password-reversion"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={enviando}
                                    autoComplete="current-password"
                                />
                                {errores.password_confirmacion && <p className="text-xs text-red-600">{errores.password_confirmacion}</p>}
                            </div>
                        </div>
                    </>
                )}

                <DialogFooter className="gap-2 sm:justify-center">
                    <Button variant="outline" onClick={onCerrar} disabled={enviando} className="cursor-pointer">
                        {puedeDeshacer ? 'Cancelar' : 'Cerrar'}
                    </Button>
                    {puedeDeshacer && (
                        <Button
                            onClick={deshacer}
                            disabled={enviando || motivo.trim() === '' || password === ''}
                            className="cursor-pointer bg-amber-600 hover:bg-amber-700"
                        >
                            {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Undo2 className="mr-2 h-4 w-4" />}
                            Deshacer importación
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
