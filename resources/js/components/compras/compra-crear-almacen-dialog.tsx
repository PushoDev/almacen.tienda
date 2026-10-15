import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { sileo } from '@/lib/sileo';
import { AlmacenProps } from '@/types';
import axios from 'axios';
import { CheckCircle, Info, Phone, Warehouse } from 'lucide-react';
import { useState } from 'react';

interface CompraCrearAlmacenDialogProps {
    open: boolean;
    onOpenChange: (abierto: boolean) => void;
    /** Recibe el almacén creado o, si ya existía, el existente. */
    onCreado: (almacen: AlmacenProps) => void;
}

const almacenVacio = {
    nombre_almacen: '',
    tipo_almacen: 'punto_venta',
    telefono_almacen: '',
    correo_almacen: '',
    provincia_almacen: '',
    ciudad_almacen: '',
    notas_almacen: '',
};

/** Alta rápida de un almacén desde el formulario de compra. */
export default function CompraCrearAlmacenDialog({ open, onOpenChange, onCreado }: CompraCrearAlmacenDialogProps) {
    const [almacen, setAlmacen] = useState(almacenVacio);
    const [errores, setErrores] = useState<Record<string, string>>({});

    const cambiarCampo = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setAlmacen((anterior) => ({
            ...anterior,
            [name]:
                name === 'nombre_almacen' || name === 'provincia_almacen' || name === 'ciudad_almacen' || name === 'notas_almacen'
                    ? value.toUpperCase()
                    : name === 'correo_almacen'
                      ? value.toLowerCase()
                      : value,
        }));
    };

    const cerrar = () => {
        setAlmacen(almacenVacio);
        setErrores({});
        onOpenChange(false);
    };

    const crear = async () => {
        if (!almacen.nombre_almacen.trim() || !almacen.telefono_almacen.trim()) {
            sileo.error({ title: 'Nombre y teléfono son requeridos' });

            return;
        }

        try {
            const respuesta = await axios.post(route('compras.almacen.store'), {
                nombre_almacen: almacen.nombre_almacen.trim().toUpperCase(),
                tipo_almacen: almacen.tipo_almacen,
                telefono_almacen: almacen.telefono_almacen.trim(),
                correo_almacen: almacen.correo_almacen.trim().toLowerCase(),
                provincia_almacen: almacen.provincia_almacen.trim().toUpperCase(),
                ciudad_almacen: almacen.ciudad_almacen.trim().toUpperCase(),
                notas_almacen: almacen.notas_almacen.trim().toUpperCase(),
            });

            const { almacen: creado, message, existe } = respuesta.data;

            if (existe) {
                sileo.warning({ title: message, description: 'Se usará el almacén existente en el sistema.' });
            } else {
                sileo.success({ title: message, description: 'Almacén creado exitosamente.' });
            }

            onCreado(creado);
            cerrar();
        } catch (error) {
            console.error('Error al crear almacén:', error);
            const datos = (error as { response?: { data?: { errors?: Record<string, string> } } }).response?.data;

            if (datos?.errors) {
                setErrores(datos.errors);
                sileo.error({ title: 'Error de validación', description: 'Por favor corrige los errores en el formulario.' });
            } else {
                sileo.error({ title: 'Error al crear almacén', description: 'Intenta nuevamente o contacta al administrador.' });
            }
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(abierto) => {
                if (!abierto) {
                    setAlmacen(almacenVacio);
                    setErrores({});
                }
                onOpenChange(abierto);
            }}
        >
            <DialogContent className="max-h-[190vh] sm:max-w-lg">
                <DialogHeader className="border-b bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                            <Warehouse className="h-7 w-7" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold">Crear Nuevo Almacén</DialogTitle>
                            <DialogDescription className="text-blue-100">
                                Configura un nuevo espacio de almacenamiento para tus productos
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] px-6 py-6">
                    <div className="space-y-8">
                        <FieldSet>
                            <FieldLegend className="text-lg font-semibold">Información Principal</FieldLegend>

                            <FieldGroup className="space-y-6">
                                <Field>
                                    <FieldLabel className="flex items-center gap-1">
                                        Nombre del Almacén <span className="text-red-500">*</span>
                                    </FieldLabel>
                                    <Input
                                        id="dialog-nombre-almacen"
                                        name="nombre_almacen"
                                        value={almacen.nombre_almacen}
                                        onChange={cambiarCampo}
                                        placeholder="Ej: ALMACÉN CENTRAL, BODEGA NORTE"
                                        className={errores.nombre_almacen ? 'border-red-500 focus-visible:ring-red-500' : ''}
                                    />
                                    {errores.nombre_almacen && <FieldError>{errores.nombre_almacen}</FieldError>}
                                </Field>

                                <Field>
                                    <FieldLabel className="flex items-center gap-1">
                                        Tipo de Almacén <span className="text-red-500">*</span>
                                    </FieldLabel>
                                    <Select
                                        value={almacen.tipo_almacen}
                                        onValueChange={(valor) => setAlmacen((a) => ({ ...a, tipo_almacen: valor }))}
                                    >
                                        <SelectTrigger className="h-11">
                                            <SelectValue placeholder="Seleccione tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="almacen">Almacén</SelectItem>
                                            <SelectItem value="punto_venta">Punto de Venta</SelectItem>
                                            <SelectItem value="transportacion">Transportación</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errores.tipo_almacen && <FieldError>{errores.tipo_almacen}</FieldError>}
                                </Field>

                                <Field>
                                    <FieldLabel className="flex items-center gap-1">
                                        Teléfono <span className="text-red-500">*</span>
                                    </FieldLabel>
                                    <InputGroup>
                                        <InputGroupAddon>
                                            <Phone className="text-muted-foreground h-4 w-4" />
                                        </InputGroupAddon>
                                        <InputGroupInput
                                            id="dialog-telefono-almacen"
                                            name="telefono_almacen"
                                            value={almacen.telefono_almacen}
                                            onChange={cambiarCampo}
                                            placeholder="Ej: 555-1234"
                                            className={errores.telefono_almacen ? 'border-red-500' : ''}
                                        />
                                    </InputGroup>
                                    {errores.telefono_almacen && <FieldError>{errores.telefono_almacen}</FieldError>}
                                </Field>

                                <Field>
                                    <FieldLabel>Correo Electrónico</FieldLabel>
                                    <InputGroup>
                                        <InputGroupAddon>@</InputGroupAddon>
                                        <InputGroupInput
                                            id="dialog-correo-almacen"
                                            name="correo_almacen"
                                            type="email"
                                            value={almacen.correo_almacen}
                                            onChange={cambiarCampo}
                                            placeholder="ejemplo@empresa.com"
                                        />
                                    </InputGroup>
                                </Field>
                            </FieldGroup>
                        </FieldSet>

                        <FieldSeparator />

                        <FieldSet>
                            <FieldLegend>Ubicación</FieldLegend>
                            <FieldGroup className="grid grid-cols-2 gap-4">
                                <Field>
                                    <FieldLabel>Provincia</FieldLabel>
                                    <Input
                                        id="dialog-provincia-almacen"
                                        name="provincia_almacen"
                                        value={almacen.provincia_almacen}
                                        onChange={cambiarCampo}
                                        placeholder="Ej: GRANMA, MAYABEQUE"
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel>Ciudad</FieldLabel>
                                    <Input
                                        id="dialog-ciudad-almacen"
                                        name="ciudad_almacen"
                                        value={almacen.ciudad_almacen}
                                        onChange={cambiarCampo}
                                        placeholder="Ej: MANZANILLO, QUIVICÁN"
                                    />
                                </Field>
                            </FieldGroup>
                        </FieldSet>

                        <FieldSeparator />

                        <FieldSet>
                            <FieldLegend>Notas Adicionales</FieldLegend>
                            <Field>
                                <Textarea
                                    id="dialog-notas-almacen"
                                    name="notas_almacen"
                                    value={almacen.notas_almacen}
                                    onChange={cambiarCampo}
                                    placeholder="INFORMACIÓN ADICIONAL SOBRE EL ALMACÉN..."
                                    rows={3}
                                    className="resize-none"
                                />
                            </Field>
                        </FieldSet>

                        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-5 dark:border-blue-800 dark:from-blue-950/50 dark:to-blue-900/50">
                            <div className="flex items-start gap-3">
                                <Info className="mt-0.5 h-6 w-6 text-blue-600 dark:text-blue-400" />
                                <div className="space-y-2 text-sm">
                                    <p className="font-semibold text-blue-900 dark:text-blue-100">Tipos de almacén:</p>
                                    <ul className="list-disc space-y-1 pl-5 text-blue-800 dark:text-blue-200">
                                        <li>
                                            <strong>Almacén:</strong> Para guardar productos en inventario
                                        </li>
                                        <li>
                                            <strong>Punto de Venta:</strong> Para venta directa al público
                                        </li>
                                        <li>
                                            <strong>Transportación:</strong> Para movilización de productos
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="bg-background border-t px-6 py-5">
                    <Button variant="outline" onClick={cerrar} className="h-11 px-6">
                        Cancelar
                    </Button>
                    <Button
                        onClick={crear}
                        disabled={!almacen.nombre_almacen.trim() || !almacen.telefono_almacen.trim()}
                        className="h-11 bg-gradient-to-r from-blue-600 to-blue-700 px-8 hover:from-blue-700 hover:to-blue-800"
                    >
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Crear Almacén
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
