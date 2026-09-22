// Diálogo de fusión de fichas hermanas (mismo producto repetido como 2+ fichas), compartido
// por Productos/Index.tsx ("Limpiar duplicados") y Productos/Vendor/Index.tsx (/disponibles).
// El backend (FusionProductosService) reasigna ventas, compras, lotes, movimientos e
// historiales a la ficha conservada — nunca los borra. Donde las fichas venden a precios
// distintos en un almacén, hay que elegir con qué precio queda: el de una ficha, el promedio
// ponderado por stock, o uno nuevo.

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sileo } from '@/lib/sileo';
import { AlertTriangle, GitMerge } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export interface FichaDuplicada {
    id: number;
    nombre: string;
    marca: string | null;
    modelo: string | null;
    capacidad: string | null;
    color: string | null;
    codigo: string | null;
    precio_compra: number;
    cantidad_total: number;
    categoria: string | null;
    categoria_id: number | null;
    almacenes: { id: number; nombre: string; cantidad: number }[];
    codigos_barras: string[];
}

export interface ConflictoPrecio {
    almacen_id: number;
    nombre_almacen: string;
    precios: { producto_id: number; precio_venta: number; comision: number; stock: number }[];
    promedio_ponderado: number;
}

export interface GrupoDuplicado {
    clave: string;
    productos: FichaDuplicada[];
    cantidad_total: number;
    precio_promedio: number;
    campos_variables: { campo: 'capacidad_producto' | 'categoria_id'; valores: (string | number)[]; valor_sugerido: string | number }[];
    conflictos_precio: ConflictoPrecio[];
}

interface EleccionPrecio {
    // 'ficha-<id>' = el precio de esa ficha · 'promedio' = promedio ponderado por stock · 'manual' = precio nuevo
    opcion: string;
    precio: string;
    comision: string;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);

/**
 * POST JSON con CSRF, pidiendo respuesta JSON — sin `Accept: application/json` Laravel responde
 * a un 403/422 con una redirección HTML y el error real se pierde ("Error de conexión").
 */
export async function postJson(url: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify(body),
    });

    return { ok: response.ok, data: await response.json().catch(() => ({})) };
}

/** Primer mensaje legible de una respuesta de error de Laravel (validación o `message`). */
export function mensajeDeError(data: Record<string, unknown>, fallback: string): string {
    const errores = data.errors as Record<string, string[]> | undefined;
    const primero = errores ? Object.values(errores)[0]?.[0] : undefined;

    return primero || (data.message as string) || (data.error as string) || fallback;
}

export function FusionFichasDialog({
    grupo,
    open,
    onOpenChange,
    onCompletado,
}: {
    grupo: GrupoDuplicado | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCompletado: () => void;
}) {
    const [conservarId, setConservarId] = useState<number | null>(null);
    const [valoresCanonicos, setValoresCanonicos] = useState<Record<string, string>>({});
    const [precios, setPrecios] = useState<Record<number, EleccionPrecio>>({});
    const [confirmando, setConfirmando] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Estado inicial cada vez que se abre con un grupo: se conserva la ficha con más stock, y en
    // cada almacén en conflicto se propone el precio de esa ficha (o el de la primera que tenga).
    useEffect(() => {
        if (!grupo || !open) {
            return;
        }

        const mejor = grupo.productos.reduce((a, b) => (a.cantidad_total >= b.cantidad_total ? a : b));
        setConservarId(mejor.id);
        setValoresCanonicos(Object.fromEntries(grupo.campos_variables.map((cv) => [cv.campo, String(cv.valor_sugerido)])));
        setPrecios(
            Object.fromEntries(
                grupo.conflictos_precio.map((c) => {
                    const propuesto = c.precios.find((p) => p.producto_id === mejor.id) ?? c.precios[0];

                    return [
                        c.almacen_id,
                        { opcion: `ficha-${propuesto.producto_id}`, precio: String(propuesto.precio_venta), comision: String(propuesto.comision) },
                    ];
                }),
            ),
        );
        setConfirmando(false);
        setError(null);
    }, [grupo, open]);

    const nombresCategoria = useMemo(
        () => Object.fromEntries((grupo?.productos ?? []).map((p) => [String(p.categoria_id), p.categoria ?? `ID ${p.categoria_id}`])),
        [grupo],
    );

    if (!grupo) {
        return null;
    }

    const eliminar = grupo.productos.filter((p) => p.id !== conservarId);
    const conservar = grupo.productos.find((p) => p.id === conservarId);

    const elegirOpcion = (conflicto: ConflictoPrecio, opcion: string) => {
        const actual = precios[conflicto.almacen_id];
        const ficha = conflicto.precios.find((p) => `ficha-${p.producto_id}` === opcion);
        const precio = ficha ? String(ficha.precio_venta) : opcion === 'promedio' ? String(conflicto.promedio_ponderado) : actual.precio;
        const comision = ficha ? String(ficha.comision) : actual.comision;

        setPrecios((prev) => ({ ...prev, [conflicto.almacen_id]: { opcion, precio, comision } }));
    };

    const preciosValidos = grupo.conflictos_precio.every((c) => parseFloat(precios[c.almacen_id]?.precio ?? '') >= 0.01);

    const enviar = async (soloNormalizar: boolean) => {
        setProcesando(true);
        setError(null);

        try {
            const { ok, data } = soloNormalizar
                ? await postJson(route('productos.normalizar'), {
                      productos_ids: grupo.productos.map((p) => p.id),
                      valores_canonicos: valoresCanonicos,
                  })
                : await postJson(route('productos.fusionar'), {
                      producto_conservar_id: conservarId,
                      productos_eliminar_ids: eliminar.map((p) => p.id),
                      valores_canonicos: valoresCanonicos,
                      precios_por_almacen: Object.fromEntries(
                          Object.entries(precios).map(([almacenId, e]) => [
                              almacenId,
                              { precio_venta: parseFloat(e.precio), comision: e.comision === '' ? null : parseFloat(e.comision) },
                          ]),
                      ),
                  });

            if (!ok) {
                setConfirmando(false);
                setError(mensajeDeError(data, soloNormalizar ? 'No se pudo normalizar' : 'No se pudo fusionar'));

                return;
            }

            sileo.success({ title: soloNormalizar ? 'Valores normalizados' : 'Fichas fusionadas', description: data.message as string });
            onOpenChange(false);
            onCompletado();
        } catch {
            setError('Error de conexión. Inténtalo nuevamente.');
        } finally {
            setProcesando(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !procesando && onOpenChange(v)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <GitMerge className="h-5 w-5 text-amber-600" />
                        {confirmando ? 'Confirmar fusión' : 'Normalizar y fusionar'}
                    </DialogTitle>
                    <DialogDescription>{grupo.clave}</DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {confirmando && conservar ? (
                    <div className="space-y-3 text-sm">
                        <p>
                            Se conserva la ficha <Badge variant="outline">#{conservar.id}</Badge> y se eliminan{' '}
                            {eliminar.map((p) => (
                                <Badge key={p.id} variant="outline" className="mr-1">
                                    #{p.id}
                                </Badge>
                            ))}
                        </p>
                        <ul className="text-muted-foreground list-disc space-y-1 pl-5">
                            <li>
                                Sus ventas, compras, lotes (cada uno con su costo), movimientos e historiales pasan a la ficha #{conservar.id}. No se
                                borra ningún registro.
                            </li>
                            <li>Stock total resultante: {grupo.cantidad_total} unidades.</li>
                            {grupo.conflictos_precio.map((c) => (
                                <li key={c.almacen_id}>
                                    {c.nombre_almacen}: queda a {formatCurrency(parseFloat(precios[c.almacen_id].precio))}
                                    {precios[c.almacen_id].comision !== '' &&
                                        ` · comisión ${formatCurrency(parseFloat(precios[c.almacen_id].comision))}`}
                                </li>
                            ))}
                        </ul>
                        <p className="font-medium text-amber-700 dark:text-amber-400">Esta acción no se puede deshacer.</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* Ficha a conservar */}
                        <div className="space-y-2">
                            <Label>Ficha que se conserva</Label>
                            <Select value={conservarId ? String(conservarId) : ''} onValueChange={(v) => setConservarId(Number(v))}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {grupo.productos.map((p) => (
                                        <SelectItem key={p.id} value={String(p.id)}>
                                            #{p.id} — costo {formatCurrency(p.precio_compra)} — {p.cantidad_total} unds
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="bg-muted/50 space-y-1 rounded-md p-2 text-xs">
                                {grupo.productos.map((p) => (
                                    <div key={p.id} className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-muted-foreground font-mono">#{p.id}</span>
                                        <span className="font-medium">{formatCurrency(p.precio_compra)}</span>
                                        <span>→</span>
                                        {p.almacenes.length > 0 ? (
                                            p.almacenes.map((a) => (
                                                <Badge key={a.id} variant="secondary" className="text-[10px]">
                                                    {a.nombre}: {a.cantidad}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-muted-foreground">sin stock</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Campos a normalizar */}
                        {grupo.campos_variables.length > 0 && (
                            <div className="space-y-2">
                                <Label>Campos que varían entre las fichas</Label>
                                {grupo.campos_variables.map((cv) => (
                                    <div key={cv.campo} className="flex items-center gap-3">
                                        <span className="w-24 text-xs font-medium">{cv.campo === 'categoria_id' ? 'Categoría' : 'Capacidad'}</span>
                                        <Select
                                            value={valoresCanonicos[cv.campo] ?? ''}
                                            onValueChange={(v) => setValoresCanonicos((prev) => ({ ...prev, [cv.campo]: v }))}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {cv.valores.map((valor) => (
                                                    <SelectItem key={String(valor)} value={String(valor)}>
                                                        {cv.campo === 'categoria_id' ? nombresCategoria[String(valor)] : String(valor)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Precio de venta por almacén en conflicto */}
                        {grupo.conflictos_precio.length > 0 && (
                            <div className="space-y-3">
                                <Label>Precio de venta con el que queda cada almacén</Label>
                                <p className="text-muted-foreground text-xs">
                                    Las fichas venden a precios distintos en estos almacenes. Elige uno; la comisión también se puede ajustar.
                                </p>
                                {grupo.conflictos_precio.map((c) => {
                                    const eleccion = precios[c.almacen_id];
                                    if (!eleccion) {
                                        return null;
                                    }

                                    return (
                                        <div key={c.almacen_id} className="space-y-2 rounded-md border p-3">
                                            <p className="text-sm font-semibold">{c.nombre_almacen}</p>
                                            <div className="grid gap-2 sm:grid-cols-[1fr_120px_120px]">
                                                <Select value={eleccion.opcion} onValueChange={(v) => elegirOpcion(c, v)}>
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {c.precios.map((p) => (
                                                            <SelectItem key={p.producto_id} value={`ficha-${p.producto_id}`}>
                                                                Ficha #{p.producto_id}: {formatCurrency(p.precio_venta)} (comisión{' '}
                                                                {formatCurrency(p.comision)}, {p.stock} unds)
                                                            </SelectItem>
                                                        ))}
                                                        <SelectItem value="promedio">
                                                            Promedio ponderado por stock: {formatCurrency(c.promedio_ponderado)}
                                                        </SelectItem>
                                                        <SelectItem value="manual">Otro precio…</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    aria-label="Precio de venta"
                                                    value={eleccion.precio}
                                                    onChange={(e) =>
                                                        setPrecios((prev) => ({
                                                            ...prev,
                                                            [c.almacen_id]: { ...eleccion, opcion: 'manual', precio: e.target.value },
                                                        }))
                                                    }
                                                />
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    aria-label="Comisión"
                                                    placeholder="Comisión"
                                                    value={eleccion.comision}
                                                    onChange={(e) =>
                                                        setPrecios((prev) => ({ ...prev, [c.almacen_id]: { ...eleccion, comision: e.target.value } }))
                                                    }
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                <DialogFooter className="gap-2">
                    {confirmando ? (
                        <>
                            <Button variant="outline" onClick={() => setConfirmando(false)} disabled={procesando}>
                                Volver
                            </Button>
                            <Button className="gap-1 bg-amber-600 hover:bg-amber-700" onClick={() => enviar(false)} disabled={procesando}>
                                <GitMerge className="h-4 w-4" />
                                {procesando ? 'Fusionando…' : 'Sí, fusionar'}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={procesando}>
                                Cancelar
                            </Button>
                            {grupo.campos_variables.length > 0 && (
                                <Button variant="secondary" onClick={() => enviar(true)} disabled={procesando}>
                                    Solo normalizar
                                </Button>
                            )}
                            <Button
                                className="gap-1 bg-amber-600 hover:bg-amber-700"
                                onClick={() => setConfirmando(true)}
                                disabled={procesando || !conservarId || !preciosValidos}
                            >
                                <GitMerge className="h-4 w-4" />
                                Fusionar…
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
