// Selector de "¿en qué almacenes aplicar el nuevo costo?" (2026-10-02, pedido del cliente) —
// compartido por 2 puntos de entrada: suelto desde Productos/Edit.tsx (botón "Actualizar costo
// por almacén") y como paso obligatorio al terminar una fusión en "Limpiar duplicados"
// (FusionFichasDialog). El costo que se aplica es UN SOLO promedio ponderado, calculado
// combinando el stock/valor de los almacenes MARCADOS juntos — no uno por almacén por separado.
// Nunca automático: siempre requiere que el admin marque y confirme.

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { mensajeDeError, postJson } from '@/components/fusion-fichas-dialog';
import { sileo } from '@/lib/sileo';
import { AlertTriangle, DollarSign, Layers, Package } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export interface AlmacenConStock {
    almacen_id: number;
    nombre_almacen: string;
    cantidad: number;
    costo: number;
    /** Valor crudo (cantidad × costo, sin redondear) — el preview combinado se calcula con esto,
     *  no con `costo` (ya redondeado), para que coincida centavo a centavo con lo que aplica el
     *  backend (que combina los lotes crudos, no los costos ya redondeados por almacén). */
    valor: number;
    lotes: number;
    /** 2+ lotes a costo distinto hoy — el checkbox viene premarcado, pero el admin puede
     *  marcar/desmarcar cualquier almacén igual, sugerido no es una restricción. */
    sugerido: boolean;
}

export function ActualizarCostoAlmacenesDialog({
    productoId,
    open,
    onOpenChange,
    onCompletado,
    contexto = 'standalone',
}: {
    productoId: number | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCompletado: () => void;
    /** 'fusion' = aparece justo después de fusionar fichas (cambia el texto de cabecera);
     *  'standalone' = el admin lo abrió aparte, en cualquier momento. */
    contexto?: 'fusion' | 'standalone';
}) {
    const [almacenes, setAlmacenes] = useState<AlmacenConStock[]>([]);
    const [seleccionados, setSeleccionados] = useState<number[]>([]);
    const [cargando, setCargando] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !productoId) return;

        setCargando(true);
        setError(null);
        fetch(route('productos.almacenes-con-stock', productoId), {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        })
            .then((r) => r.json())
            .then((data: { almacenes: AlmacenConStock[] }) => {
                setAlmacenes(data.almacenes);
                setSeleccionados(data.almacenes.filter((a) => a.sugerido).map((a) => a.almacen_id));
            })
            .catch(() => setError('No se pudo cargar la lista de almacenes'))
            .finally(() => setCargando(false));
    }, [open, productoId]);

    const alternar = (almacenId: number) => {
        setSeleccionados((prev) => (prev.includes(almacenId) ? prev.filter((id) => id !== almacenId) : [...prev, almacenId]));
    };

    const costoPreview = useMemo(() => {
        const marcados = almacenes.filter((a) => seleccionados.includes(a.almacen_id));
        const cantidad = marcados.reduce((sum, a) => sum + a.cantidad, 0);
        const valor = marcados.reduce((sum, a) => sum + a.valor, 0);

        return cantidad > 0 ? valor / cantidad : null;
    }, [almacenes, seleccionados]);

    const omitir = () => {
        onOpenChange(false);
        onCompletado();
    };

    const aplicar = async () => {
        if (!productoId || seleccionados.length === 0) return;
        setProcesando(true);
        setError(null);

        const { ok, data } = await postJson(route('productos.actualizar-costo-almacenes', productoId), { almacen_ids: seleccionados });

        if (!ok) {
            setError(mensajeDeError(data, 'No se pudo actualizar el costo'));
            setProcesando(false);

            return;
        }

        sileo.success({ title: 'Costo actualizado', description: data.message as string });
        setProcesando(false);
        onOpenChange(false);
        onCompletado();
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !procesando && (v ? onOpenChange(v) : omitir())}>
            <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Layers className="text-blue-500" size={20} />
                        {contexto === 'fusion' ? 'Fusión completada — ¿actualizar el costo?' : 'Actualizar costo por almacén'}
                    </DialogTitle>
                    <DialogDescription>
                        Marcá los almacenes donde querés aplicar el nuevo costo. El valor sale de combinar el stock de TODOS los almacenes que
                        marques en un solo promedio — si marcás un almacén con un solo lote, ese lote también cambia a ese valor, aunque no haya
                        nada que fusionar ahí.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-2 py-2">
                    {error && (
                        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {cargando ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="border-muted h-5 w-5 animate-spin rounded-full border-2 border-t-blue-600"></div>
                            <span className="text-muted-foreground ml-3 text-sm">Cargando almacenes...</span>
                        </div>
                    ) : (
                        almacenes.map((a) => {
                            const marcado = seleccionados.includes(a.almacen_id);

                            return (
                                <label
                                    key={a.almacen_id}
                                    className="flex cursor-pointer items-center justify-between gap-2 rounded-md border p-2.5 text-sm hover:bg-accent"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Checkbox checked={marcado} onCheckedChange={() => alternar(a.almacen_id)} />
                                        <span>
                                            {a.nombre_almacen}
                                            {a.sugerido && (
                                                <Badge variant="outline" className="ml-1.5 gap-1 border-amber-200 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                                    sugerido
                                                </Badge>
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Badge variant="outline" className="gap-1">
                                            <Package size={10} />
                                            {a.cantidad} uds.
                                        </Badge>
                                        <Badge
                                            variant="outline"
                                            className="gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                        >
                                            <DollarSign size={10} />${a.costo}
                                            {a.lotes > 1 && ` (${a.lotes} lotes)`}
                                        </Badge>
                                    </div>
                                </label>
                            );
                        })
                    )}

                    {costoPreview !== null && (
                        <div className="mt-1 flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-800 dark:bg-blue-950/30">
                            <span className="text-blue-800 dark:text-blue-300">Costo resultante (promedio combinado)</span>
                            <Badge className="gap-1 bg-blue-600 font-bold text-white hover:bg-blue-600">
                                <DollarSign size={10} />
                                {costoPreview.toFixed(2)}
                            </Badge>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button type="button" variant="outline" onClick={omitir} disabled={procesando}>
                        {contexto === 'fusion' ? 'Omitir, dejar como está' : 'Cancelar'}
                    </Button>
                    <Button
                        type="button"
                        disabled={procesando || cargando || seleccionados.length === 0}
                        onClick={aplicar}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {procesando ? 'Aplicando...' : `Aplicar a ${seleccionados.length} almacén${seleccionados.length === 1 ? '' : 'es'}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
