// Diálogo de edición en lote (solo admin) — aparte de "Limpiar duplicados": el admin elige a
// mano 2+ productos EXISTENTES (no depende de que FichasHermanasService ya los haya agrupado)
// y les aplica el mismo valor corregido de identidad, para cortar de raíz un tipeo (ej.
// "635W" vs "635 W") antes de que se vuelva una ficha duplicada de verdad. No fusiona ni toca
// stock — los productos siguen siendo fichas separadas después, solo con los campos corregidos.

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mensajeDeError, postJson } from '@/components/fusion-fichas-dialog';
import { sileo } from '@/lib/sileo';
import { AlertTriangle, ListChecks } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export interface ProductoSeleccionado {
    id: number;
    nombre_producto: string;
    marca_producto: string;
    modelo_producto?: string;
    capacidad_producto?: string;
    color_producto?: string;
    categoria: string;
    categoria_id: number;
}

type CampoEditable = 'nombre_producto' | 'marca_producto' | 'modelo_producto' | 'capacidad_producto' | 'color_producto' | 'categoria_id';

const CAMPOS: { campo: CampoEditable; etiqueta: string }[] = [
    { campo: 'nombre_producto', etiqueta: 'Nombre' },
    { campo: 'marca_producto', etiqueta: 'Marca' },
    { campo: 'modelo_producto', etiqueta: 'Modelo' },
    { campo: 'capacidad_producto', etiqueta: 'Capacidad' },
    { campo: 'color_producto', etiqueta: 'Color' },
];

/** Valor más repetido entre los seleccionados para un campo — mismo criterio que el "valor
 * sugerido" de Limpiar Duplicados, así el admin solo corrige el que está mal. */
function valorSugerido(productos: ProductoSeleccionado[], campo: CampoEditable): string {
    const conteo = new Map<string, number>();
    productos.forEach((p) => {
        const valor = String(p[campo] ?? '').trim();
        if (!valor) return;
        conteo.set(valor, (conteo.get(valor) ?? 0) + 1);
    });

    let mejor = '';
    let mejorConteo = 0;
    conteo.forEach((n, valor) => {
        if (n > mejorConteo) {
            mejor = valor;
            mejorConteo = n;
        }
    });

    return mejor;
}

/** Valores distintos que tiene hoy un campo entre los seleccionados, con cuántos productos
 * tiene cada uno — para el resumen de "esto va a cambiar". */
function valoresActuales(productos: ProductoSeleccionado[], campo: CampoEditable): { valor: string; cantidad: number }[] {
    const conteo = new Map<string, number>();
    productos.forEach((p) => {
        const valor = String(p[campo] ?? '').trim() || '(vacío)';
        conteo.set(valor, (conteo.get(valor) ?? 0) + 1);
    });

    return Array.from(conteo.entries())
        .map(([valor, cantidad]) => ({ valor, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);
}

export function EditarEnLoteDialog({
    productos,
    open,
    onOpenChange,
    categorias,
    onCompletado,
}: {
    productos: ProductoSeleccionado[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categorias: { id: number; nombre_categoria: string }[];
    onCompletado: () => void;
}) {
    const [valores, setValores] = useState<Record<CampoEditable, string>>({
        nombre_producto: '',
        marca_producto: '',
        modelo_producto: '',
        capacidad_producto: '',
        color_producto: '',
        categoria_id: '',
    });
    const [confirmando, setConfirmando] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Estado inicial cada vez que se abre: TODOS los campos arrancan vacíos — "vacío" es lo que
    // significa "no tocar este campo" para el backend (ProductoController::editarEnLote()), así
    // que precargarlos aplicaría cambios que el admin nunca pidió. El valor más común entre los
    // seleccionados se muestra solo como placeholder/sugerencia (ver `valorSugerido` abajo).
    useEffect(() => {
        if (!open) return;

        setValores({
            nombre_producto: '',
            marca_producto: '',
            modelo_producto: '',
            capacidad_producto: '',
            color_producto: '',
            categoria_id: '',
        });
        setConfirmando(false);
        setError(null);
    }, [productos, open]);

    const nombresCategoria = useMemo(() => Object.fromEntries(categorias.map((c) => [String(c.id), c.nombre_categoria])), [categorias]);

    // Campos que el admin realmente va a aplicar (no vacíos) — los vacíos no tocan nada.
    const camposAAplicar = useMemo(() => {
        return CAMPOS.filter((c) => valores[c.campo].trim() !== '').map((c) => ({
            ...c,
            nuevoValor: valores[c.campo].trim(),
            actuales: valoresActuales(productos, c.campo),
        }));
    }, [valores, productos]);

    const categoriaCambia = valores.categoria_id !== '';

    const categoriasActuales = useMemo(() => {
        const conteo = new Map<string, number>();
        productos.forEach((p) => conteo.set(p.categoria, (conteo.get(p.categoria) ?? 0) + 1));

        return Array.from(conteo.entries())
            .map(([valor, cantidad]) => ({ valor, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad);
    }, [productos]);

    const hayCambios = camposAAplicar.length > 0 || categoriaCambia;

    const enviar = async () => {
        setProcesando(true);
        setError(null);

        const payload: Record<string, unknown> = { productos_ids: productos.map((p) => p.id) };
        CAMPOS.forEach((c) => {
            if (valores[c.campo].trim() !== '') payload[c.campo] = valores[c.campo].trim();
        });
        if (categoriaCambia) payload.categoria_id = Number(valores.categoria_id);

        const { ok, data } = await postJson(route('productos.editar-en-lote'), payload);

        if (!ok) {
            setConfirmando(false);
            setError(mensajeDeError(data, 'No se pudo editar en lote'));
            setProcesando(false);

            return;
        }

        sileo.success({ title: 'Productos actualizados', description: data.message as string });
        setProcesando(false);
        onOpenChange(false);
        onCompletado();
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !procesando && onOpenChange(v)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-teal-600" />
                        {confirmando ? 'Confirmar edición en lote' : 'Editar en lote'}
                    </DialogTitle>
                    <DialogDescription>
                        {productos.length} productos seleccionados — los campos vacíos no se tocan.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {confirmando ? (
                    <div className="space-y-3 text-sm">
                        {!hayCambios ? (
                            <p className="text-muted-foreground">No hay ningún campo para aplicar.</p>
                        ) : (
                            <>
                                <p>
                                    Se van a actualizar <Badge variant="outline">{productos.length} productos</Badge>:
                                </p>
                                <ul className="text-muted-foreground list-disc space-y-2 pl-5">
                                    {camposAAplicar.map((c) => (
                                        <li key={c.campo}>
                                            <span className="text-foreground font-medium">{c.etiqueta}</span>: hoy tienen{' '}
                                            {c.actuales.map((a, i) => (
                                                <span key={a.valor}>
                                                    {i > 0 && ', '}
                                                    &quot;{a.valor}&quot; ({a.cantidad})
                                                </span>
                                            ))}{' '}
                                            → pasa a ser <span className="text-foreground font-medium">&quot;{c.nuevoValor}&quot;</span>
                                        </li>
                                    ))}
                                    {categoriaCambia && (
                                        <li>
                                            <span className="text-foreground font-medium">Categoría</span>: hoy tienen{' '}
                                            {categoriasActuales.map((a, i) => (
                                                <span key={a.valor}>
                                                    {i > 0 && ', '}
                                                    &quot;{a.valor}&quot; ({a.cantidad})
                                                </span>
                                            ))}{' '}
                                            → pasa a ser{' '}
                                            <span className="text-foreground font-medium">
                                                &quot;{nombresCategoria[valores.categoria_id] ?? valores.categoria_id}&quot;
                                            </span>
                                        </li>
                                    )}
                                </ul>
                                <p className="font-medium text-amber-700 dark:text-amber-400">
                                    No se fusiona ni se toca el stock — siguen siendo fichas separadas, solo con estos campos corregidos.
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-muted/50 space-y-1 rounded-md p-2 text-xs">
                            {productos.map((p) => (
                                <div key={p.id} className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-muted-foreground font-mono">#{p.id}</span>
                                    <span className="font-medium">{p.nombre_producto}</span>
                                    <span className="text-muted-foreground">
                                        {[p.marca_producto, p.modelo_producto, p.capacidad_producto, p.color_producto].filter(Boolean).join(' · ')}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {CAMPOS.map((c) => {
                                const sugerido = valorSugerido(productos, c.campo);

                                return (
                                    <div key={c.campo} className="space-y-1.5">
                                        <Label htmlFor={`lote-${c.campo}`}>{c.etiqueta}</Label>
                                        <Input
                                            id={`lote-${c.campo}`}
                                            value={valores[c.campo]}
                                            placeholder={sugerido ? `Sugerido: "${sugerido}"` : 'Sin cambios'}
                                            onChange={(e) => setValores((prev) => ({ ...prev, [c.campo]: e.target.value }))}
                                        />
                                    </div>
                                );
                            })}
                            <div className="space-y-1.5">
                                <Label>Categoría</Label>
                                <Select
                                    value={valores.categoria_id}
                                    onValueChange={(v) => setValores((prev) => ({ ...prev, categoria_id: v }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Sin cambios" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categorias.map((cat) => (
                                            <SelectItem key={cat.id} value={String(cat.id)}>
                                                {cat.nombre_categoria}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="gap-2">
                    {confirmando ? (
                        <>
                            <Button variant="outline" onClick={() => setConfirmando(false)} disabled={procesando}>
                                Volver
                            </Button>
                            <Button className="gap-1 bg-teal-600 hover:bg-teal-700" onClick={enviar} disabled={procesando || !hayCambios}>
                                {procesando ? 'Aplicando…' : 'Confirmar'}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={procesando}>
                                Cancelar
                            </Button>
                            <Button className="gap-1 bg-teal-600 hover:bg-teal-700" onClick={() => setConfirmando(true)} disabled={!hayCambios}>
                                Proceder
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
