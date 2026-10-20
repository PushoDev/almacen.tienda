import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sileo } from '@/lib/sileo';
import { useForm } from '@inertiajs/react';
import { Container, Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { ContenedorCasillero } from './tipos-casillero';

interface ContenedorFormDialogProps {
    open: boolean;
    onOpenChange: (abierto: boolean) => void;
    /** El contenedor que se edita; null para crear uno nuevo. */
    contenedor: ContenedorCasillero | null;
}

/** Crea un contenedor o edita su nombre, notas y fecha de salida. */
export default function ContenedorFormDialog({ open, onOpenChange, contenedor }: ContenedorFormDialogProps) {
    const form = useForm({ nombre: '', notas: '', fecha_salida: '' });

    useEffect(() => {
        if (open) {
            form.setData({ nombre: contenedor?.nombre ?? '', notas: contenedor?.notas ?? '', fecha_salida: contenedor?.fecha_salida ?? '' });
            form.clearErrors();
        }
        // Solo al abrir o al cambiar de contenedor.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, contenedor?.id]);

    const guardar = () => {
        const opciones = {
            preserveScroll: true,
            onSuccess: () => {
                sileo.success({ title: contenedor ? 'Contenedor actualizado' : 'Contenedor creado', description: form.data.nombre });
                onOpenChange(false);
            },
        };

        if (contenedor) {
            form.put(route('casillero.contenedores.update', contenedor.id), opciones);
        } else {
            form.post(route('casillero.contenedores.store'), opciones);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Container className="h-5 w-5 text-violet-600" />
                        {contenedor ? 'Editar contenedor' : 'Nuevo contenedor'}
                    </DialogTitle>
                    <DialogDescription>
                        {contenedor
                            ? 'Cambia el nombre, la fecha de salida o las notas.'
                            : 'Después le asignas unidades del casillero y le anotas sus cargos.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="nombre-contenedor">Nombre</Label>
                        <Input
                            id="nombre-contenedor"
                            placeholder="Ej.: MSC-001 o el número del contenedor"
                            maxLength={120}
                            value={form.data.nombre}
                            onChange={(e) => form.setData('nombre', e.target.value)}
                        />
                        {form.errors.nombre && <p className="text-sm text-red-600">{form.errors.nombre}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fecha-salida">Fecha de salida (opcional)</Label>
                        <Input
                            id="fecha-salida"
                            type="date"
                            value={form.data.fecha_salida}
                            onChange={(e) => form.setData('fecha_salida', e.target.value)}
                        />
                        {form.errors.fecha_salida && <p className="text-sm text-red-600">{form.errors.fecha_salida}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notas-contenedor">Notas (opcional)</Label>
                        <Textarea
                            id="notas-contenedor"
                            rows={2}
                            maxLength={255}
                            value={form.data.notas}
                            onChange={(e) => form.setData('notas', e.target.value)}
                        />
                    </div>

                    {form.errors.error && <p className="text-sm text-red-600">{form.errors.error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={form.processing}>
                        Cancelar
                    </Button>
                    <Button onClick={guardar} disabled={form.processing || !form.data.nombre.trim()} className="bg-violet-600 hover:bg-violet-700">
                        {form.processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Container className="mr-2 h-4 w-4" />}
                        {contenedor ? 'Guardar' : 'Crear contenedor'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
