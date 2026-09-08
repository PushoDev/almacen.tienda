import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type TurnoCompartido } from '@/types';
import { useForm } from '@inertiajs/react';
import { type FormEvent } from 'react';

export function TurnoCapturaForm({ turno, onSuccess }: { turno: TurnoCompartido; onSuccess?: () => void }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        nombre_vendedor: turno.sugerido ?? '',
    });

    function submit(e: FormEvent) {
        e.preventDefault();
        post(route('turno-vendedor.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onSuccess?.();
            },
        });
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="nombre_vendedor">Nombre de quien atiende</Label>
                <Input
                    id="nombre_vendedor"
                    value={data.nombre_vendedor}
                    onChange={(e) => setData('nombre_vendedor', e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    autoFocus
                />
                {errors.nombre_vendedor && <p className="text-destructive text-sm">{errors.nombre_vendedor}</p>}
            </div>

            {turno.historial.length > 0 && (
                <div className="space-y-1.5">
                    <p className="text-muted-foreground text-xs">O elige de los últimos usados:</p>
                    <div className="flex flex-wrap gap-1.5">
                        {turno.historial.map((nombre) => (
                            <button
                                key={nombre}
                                type="button"
                                onClick={() => setData('nombre_vendedor', nombre)}
                                className="border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-full border px-2.5 py-1 text-xs transition-colors"
                            >
                                {nombre}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <Button type="submit" disabled={processing || !data.nombre_vendedor.trim()} className="w-full">
                Confirmar
            </Button>
        </form>
    );
}
