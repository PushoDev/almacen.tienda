// Diálogo de anulación compartido por Transacciones/Show.tsx (Gasto/Ingreso/Transferencia)
// y Transacciones/RemesaShow.tsx — misma lista de motivos en ambos lados
// (MOTIVOS_ANULACION, ver detalle-operacion.tsx), mismo comportamiento: revierte el
// efecto en saldo y exige un motivo obligatorio (detalle libre adicional solo si el
// motivo es "Otro motivo").

import { MOTIVOS_ANULACION } from '@/components/detalle-operacion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { sileo } from '@/lib/sileo';
import { useForm } from '@inertiajs/react';
import { Ban } from 'lucide-react';
import { useState } from 'react';

export function AnularOperacionDialog({ url }: { url: string }) {
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        motivo_anulacion: '',
        detalle_anulacion: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(url, {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                reset();
            },
            onError: (err) => {
                sileo.error({
                    title: 'Error al anular',
                    description: err.motivo_anulacion || err.detalle_anulacion || err.estado || 'Inténtalo nuevamente',
                });
            },
        });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                setOpen(v);
                if (!v) reset();
            }}
        >
            <DialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    <Ban className="mr-2 h-4 w-4" />
                    Anular
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Anular Operación</DialogTitle>
                    <DialogDescription>
                        Esta acción revierte el efecto en el saldo de las entidades involucradas. No se puede deshacer.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Motivo de la anulación</Label>
                        <Select value={data.motivo_anulacion} onValueChange={(v) => setData('motivo_anulacion', v)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecciona un motivo" />
                            </SelectTrigger>
                            <SelectContent>
                                {MOTIVOS_ANULACION.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.motivo_anulacion && <p className="text-sm text-red-500">{errors.motivo_anulacion}</p>}
                    </div>

                    {data.motivo_anulacion === 'otros' && (
                        <div className="space-y-2">
                            <Label>Detalle</Label>
                            <Textarea
                                value={data.detalle_anulacion}
                                onChange={(e) => setData('detalle_anulacion', e.target.value)}
                                placeholder="Explica el motivo de la anulación..."
                            />
                            {errors.detalle_anulacion && <p className="text-sm text-red-500">{errors.detalle_anulacion}</p>}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="destructive" disabled={processing || !data.motivo_anulacion}>
                            {processing ? 'Anulando...' : 'Confirmar Anulación'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
