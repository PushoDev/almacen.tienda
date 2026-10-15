import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sileo } from '@/lib/sileo';
import { CategoriasProps } from '@/types';
import axios from 'axios';
import { HardDriveUpload, PlusCircle } from 'lucide-react';
import { useState } from 'react';

interface CompraCrearCategoriaDialogProps {
    open: boolean;
    onOpenChange: (abierto: boolean) => void;
    onCreada: (categoria: CategoriasProps) => void;
}

/** Alta rápida de una categoría desde el formulario de compra. */
export default function CompraCrearCategoriaDialog({ open, onOpenChange, onCreada }: CompraCrearCategoriaDialogProps) {
    const [nombre, setNombre] = useState('');
    const [errores, setErrores] = useState<Record<string, string>>({});

    const cerrar = () => {
        setNombre('');
        setErrores({});
        onOpenChange(false);
    };

    const crear = async () => {
        const nombreMayusculas = nombre.trim().toUpperCase();

        if (!nombreMayusculas) {
            sileo.error({ title: 'El nombre de la categoría es requerido' });

            return;
        }

        try {
            const respuesta = await axios.post(route('compras.categoria.store'), { nombre_categoria: nombreMayusculas });
            const { categoria, message } = respuesta.data;

            sileo.success({ title: message, description: 'Categoría creada exitosamente.' });
            onCreada(categoria);
            cerrar();
        } catch (error) {
            console.error('Error al crear categoría:', error);
            const datos = (error as { response?: { data?: { errors?: Record<string, string>; message?: string } } }).response?.data;

            if (datos?.errors) {
                setErrores(datos.errors);
                sileo.error({ title: 'Error de validación', description: 'Por favor corrige los errores en el formulario.' });
            } else {
                sileo.error({ title: 'Error al crear categoría', description: datos?.message || 'Intenta nuevamente.' });
            }
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(abierto) => {
                if (!abierto) {
                    setNombre('');
                    setErrores({});
                }
                onOpenChange(abierto);
            }}
        >
            <DialogContent className="overflow-hidden p-0 sm:max-w-md">
                <DialogHeader className="border-b bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                            <HardDriveUpload className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl text-white">Crear Nueva Categoría</DialogTitle>
                            <DialogDescription className="text-purple-100">Añade una nueva categoría para organizar tus productos.</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <div className="grid gap-4 px-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="dialog-nombre-categoria">
                            Nombre de la Categoría <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="dialog-nombre-categoria"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value.toUpperCase())}
                            placeholder="Ej: SMARTPHONES, LAPTOPS"
                            className={errores.nombre_categoria ? 'border-red-500' : ''}
                            autoFocus
                        />
                        {errores.nombre_categoria && <p className="text-sm text-red-500">{errores.nombre_categoria}</p>}
                    </div>
                </div>
                <DialogFooter className="gap-2 border-t px-6 py-4">
                    <Button type="button" variant="outline" onClick={cerrar}>
                        Cancelar
                    </Button>
                    <Button type="button" onClick={crear} className="bg-purple-600 hover:bg-purple-700">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Categoría
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
