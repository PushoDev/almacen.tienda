import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { sileo } from '@/lib/sileo';
import { useForm } from '@inertiajs/react';
import { Loader2, Receipt } from 'lucide-react';
import { useEffect } from 'react';
import { CompraCasillero, CuentaUsdCasillero, formatearUsd } from './tipos-casillero';

interface CasilleroCargoDialogProps {
    open: boolean;
    onOpenChange: (abierto: boolean) => void;
    /** Las compras sobre las que se anota el cargo (las marcadas en la lista). */
    compras: CompraCasillero[];
    cuentas: CuentaUsdCasillero[];
    onGuardado: () => void;
}

const CONCEPTOS_SUGERIDOS = ['Estadía en Panamá', 'Otro cargo'];

const hoy = () => new Date().toLocaleDateString('en-CA');

/** Anota un cargo a mano (p. ej. la estadía) sobre una o varias compras y lo paga ahora desde una cuenta USD. */
export default function CasilleroCargoDialog({ open, onOpenChange, compras, cuentas, onGuardado }: CasilleroCargoDialogProps) {
    const form = useForm({
        compra_ids: [] as number[],
        concepto: CONCEPTOS_SUGERIDOS[0],
        monto: '',
        cuenta_id: '',
        fecha: hoy(),
        nota: '',
    });

    useEffect(() => {
        if (open) {
            form.setData((anterior) => ({ ...anterior, compra_ids: compras.map((c) => c.id) }));
        }
        // Solo al abrir o cuando cambia la selección de compras.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, compras]);

    const cuenta = cuentas.find((c) => String(c.id) === form.data.cuenta_id) ?? null;
    const monto = parseFloat(form.data.monto) || 0;
    const saldoInsuficiente = cuenta !== null && monto > cuenta.saldo_cuenta;

    const guardar = () => {
        form.post(route('casillero.cargos.store'), {
            preserveScroll: true,
            onSuccess: () => {
                sileo.success({ title: 'Cargo anotado', description: `${formatearUsd(monto)} salieron de ${cuenta?.nombre_cuenta ?? 'la cuenta'}.` });
                form.reset('monto', 'nota');
                onGuardado();
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-amber-600" />
                        Anotar cargo
                    </DialogTitle>
                    <DialogDescription>
                        Se paga ahora desde la cuenta, como un gasto, y queda ligado a {compras.length === 1 ? 'la compra' : 'las compras'}{' '}
                        {compras.map((c) => `#${c.id}`).join(', ')}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="concepto">Concepto</Label>
                        <Input id="concepto" value={form.data.concepto} onChange={(e) => form.setData('concepto', e.target.value)} maxLength={120} />
                        <div className="flex flex-wrap gap-2">
                            {CONCEPTOS_SUGERIDOS.map((sugerido) => (
                                <Button key={sugerido} type="button" variant="outline" size="sm" onClick={() => form.setData('concepto', sugerido)}>
                                    {sugerido}
                                </Button>
                            ))}
                        </div>
                        {form.errors.concepto && <p className="text-sm text-red-600">{form.errors.concepto}</p>}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="monto">Monto (USD)</Label>
                            <Input
                                id="monto"
                                type="number"
                                inputMode="decimal"
                                min="0.01"
                                step="0.01"
                                placeholder="0.00"
                                value={form.data.monto}
                                onChange={(e) => form.setData('monto', e.target.value)}
                            />
                            {form.errors.monto && <p className="text-sm text-red-600">{form.errors.monto}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fecha">Fecha</Label>
                            <Input id="fecha" type="date" value={form.data.fecha} onChange={(e) => form.setData('fecha', e.target.value)} />
                            {form.errors.fecha && <p className="text-sm text-red-600">{form.errors.fecha}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Cuenta que lo paga (USD)</Label>
                        <Select value={form.data.cuenta_id} onValueChange={(valor) => form.setData('cuenta_id', valor)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Elige la cuenta" />
                            </SelectTrigger>
                            <SelectContent>
                                {cuentas.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.nombre_cuenta} — {formatearUsd(c.saldo_cuenta)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {saldoInsuficiente && <p className="text-sm text-amber-600">La cuenta no tiene saldo suficiente para este cargo.</p>}
                        {cuentas.length === 0 && <p className="text-sm text-amber-600">No hay cuentas activas en USD.</p>}
                        {form.errors.cuenta_id && <p className="text-sm text-red-600">{form.errors.cuenta_id}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="nota">Nota (opcional)</Label>
                        <Textarea id="nota" rows={2} maxLength={255} value={form.data.nota} onChange={(e) => form.setData('nota', e.target.value)} />
                    </div>

                    {(form.errors.error || form.errors.compra_ids) && (
                        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                            {form.errors.error ?? form.errors.compra_ids}
                        </p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={form.processing}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={guardar}
                        disabled={form.processing || !form.data.concepto.trim() || monto <= 0 || !form.data.cuenta_id || saldoInsuficiente}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        {form.processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                        Anotar y pagar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
