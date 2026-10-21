import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { sileo } from '@/lib/sileo';
import { router } from '@inertiajs/react';
import { Boxes, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ContenedorCasillero, formatearUsd, LineaDisponible } from './tipos-casillero';

interface ContenedorUnidadesDialogProps {
    open: boolean;
    onOpenChange: (abierto: boolean) => void;
    contenedor: ContenedorCasillero | null;
    /** Líneas de compra con unidades que todavía esperan en Panamá. */
    disponibles: LineaDisponible[];
}

interface FilaUnidades {
    compra_producto_id: number;
    compra_id: number;
    proveedor: string | null;
    producto: string;
    precio: number;
    /** Unidades que la línea ya tiene en este contenedor. */
    actuales: number;
    /** Lo máximo que puede llevar este contenedor: lo que espera en Panamá más lo que ya lleva. */
    maximo: number;
}

/**
 * Elige cuántas unidades de cada línea de compra suben al contenedor ("12 de X, 30 de Y"). La cantidad
 * reemplaza la que ya llevaba; 0 saca la línea. Lo que no sube se queda en el casillero.
 */
export default function ContenedorUnidadesDialog({ open, onOpenChange, contenedor, disponibles }: ContenedorUnidadesDialogProps) {
    const [valores, setValores] = useState<Record<number, string>>({});
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filas = useMemo<FilaUnidades[]>(() => {
        if (!contenedor) return [];

        const porLinea = new Map<number, FilaUnidades>();

        contenedor.lineas.forEach((linea) => {
            porLinea.set(linea.compra_producto_id, {
                compra_producto_id: linea.compra_producto_id,
                compra_id: linea.compra_id,
                proveedor: linea.proveedor,
                producto: linea.producto ?? 'Producto',
                precio: linea.precio,
                actuales: linea.cantidad,
                maximo: linea.cantidad,
            });
        });

        disponibles.forEach((linea) => {
            const existente = porLinea.get(linea.compra_producto_id);

            porLinea.set(linea.compra_producto_id, {
                compra_producto_id: linea.compra_producto_id,
                compra_id: linea.compra_id,
                proveedor: linea.proveedor,
                producto: linea.producto,
                precio: linea.precio,
                actuales: existente?.actuales ?? 0,
                maximo: linea.en_casillero + (existente?.actuales ?? 0),
            });
        });

        return [...porLinea.values()].sort((a, b) => a.compra_id - b.compra_id || a.compra_producto_id - b.compra_producto_id);
    }, [contenedor, disponibles]);

    useEffect(() => {
        if (open) {
            setValores(Object.fromEntries(filas.map((f) => [f.compra_producto_id, String(f.actuales)])));
            setError(null);
        }
        // Solo al abrir o al cambiar de contenedor.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, contenedor?.id]);

    const cantidadDe = (fila: FilaUnidades) => {
        const numero = parseInt(valores[fila.compra_producto_id] ?? '', 10);

        return Number.isNaN(numero) ? 0 : numero;
    };

    const cambios = filas.filter((f) => cantidadDe(f) !== f.actuales);
    const excedida = filas.some((f) => cantidadDe(f) > f.maximo || cantidadDe(f) < 0);
    const totalUnidades = filas.reduce((total, f) => total + cantidadDe(f), 0);
    const totalValor = filas.reduce((total, f) => total + cantidadDe(f) * f.precio, 0);

    const guardar = () => {
        if (!contenedor || cambios.length === 0) return;

        setGuardando(true);
        setError(null);

        router.put(
            route('casillero.contenedores.unidades', contenedor.id),
            { lineas: cambios.map((f) => ({ compra_producto_id: f.compra_producto_id, cantidad: cantidadDe(f) })) },
            {
                preserveScroll: true,
                onSuccess: () => {
                    sileo.success({ title: 'Unidades actualizadas', description: `${contenedor.nombre} lleva ahora ${totalUnidades} unidades.` });
                    onOpenChange(false);
                },
                onError: (errores) => setError(errores.error ?? Object.values(errores)[0] ?? 'No se pudieron guardar las unidades.'),
                onFinish: () => setGuardando(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Boxes className="h-5 w-5 text-indigo-600" />
                        Unidades del contenedor
                    </DialogTitle>
                    <DialogDescription>
                        {contenedor ? `«${contenedor.nombre}»: ` : ''}escribe cuántas unidades de cada línea suben. Lo que no sube se queda esperando
                        en el casillero; con 0 la línea sale del contenedor.
                    </DialogDescription>
                </DialogHeader>

                {filas.length === 0 ? (
                    <p className="text-muted-foreground py-6 text-center text-sm">No hay unidades esperando en el casillero.</p>
                ) : (
                    <div className="divide-y rounded-lg border">
                        {filas.map((fila) => {
                            const cantidad = cantidadDe(fila);
                            const invalida = cantidad > fila.maximo || cantidad < 0;

                            return (
                                <div key={fila.compra_producto_id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{fila.producto}</p>
                                        <p className="text-muted-foreground text-xs">
                                            Compra #{fila.compra_id}
                                            {fila.proveedor ? ` · ${fila.proveedor}` : ''} · {formatearUsd(fila.precio)} c/u · máximo {fila.maximo}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setValores((v) => ({ ...v, [fila.compra_producto_id]: '0' }))}
                                        >
                                            Nada
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setValores((v) => ({ ...v, [fila.compra_producto_id]: String(fila.maximo) }))}
                                        >
                                            Todo
                                        </Button>
                                        <Input
                                            type="number"
                                            inputMode="numeric"
                                            min={0}
                                            max={fila.maximo}
                                            className={invalida ? 'w-24 border-red-500' : 'w-24'}
                                            aria-label={`Unidades de ${fila.producto}`}
                                            value={valores[fila.compra_producto_id] ?? ''}
                                            onChange={(e) => setValores((v) => ({ ...v, [fila.compra_producto_id]: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {error && <p className="text-sm text-red-600">{error}</p>}

                <DialogFooter className="items-center sm:justify-between">
                    <p className="text-muted-foreground text-sm">
                        Llevará <strong className="text-foreground">{totalUnidades}</strong> unidades por{' '}
                        <strong className="text-foreground">{formatearUsd(totalValor)}</strong>
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={guardando}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={guardar}
                            disabled={guardando || cambios.length === 0 || excedida}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Boxes className="mr-2 h-4 w-4" />}
                            Guardar unidades
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
