import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { sileo } from '@/lib/sileo';
import { ClienteProps } from '@/types';
import axios from 'axios';
import { CheckCircle, Info, Users } from 'lucide-react';
import { useState } from 'react';

interface CompraCrearClienteDialogProps {
    open: boolean;
    onOpenChange: (abierto: boolean) => void;
    /** Recibe el cliente creado o, si ya existía, el existente. */
    onCreado: (cliente: ClienteProps) => void;
}

const clienteInicial = {
    nombre_cliente: '',
    telefono_cliente: '+123456789',
    direccion_cliente: 'Residencia del Cliente',
    ciudad_cliente: 'Ciudad de Residencia',
};

const clienteVacio = {
    nombre_cliente: '',
    telefono_cliente: '',
    direccion_cliente: '',
    ciudad_cliente: '',
};

/** Alta rápida de un cliente físico desde la compra (como asociado o como fuente de financiamiento). */
export default function CompraCrearClienteDialog({ open, onOpenChange, onCreado }: CompraCrearClienteDialogProps) {
    const [cliente, setCliente] = useState(clienteInicial);
    const [errores, setErrores] = useState<Record<string, string>>({});

    const cambiarCampo = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCliente((anterior) => ({
            ...anterior,
            [name]: name === 'nombre_cliente' || name === 'ciudad_cliente' || name === 'direccion_cliente' ? value.toUpperCase() : value,
        }));
    };

    const cerrar = () => {
        setCliente(clienteVacio);
        setErrores({});
        onOpenChange(false);
    };

    const crear = async () => {
        if (!cliente.nombre_cliente.trim() || !cliente.telefono_cliente.trim()) {
            sileo.error({ title: 'Nombre y teléfono son requeridos' });

            return;
        }

        try {
            const respuesta = await axios.post(route('compras.cliente.store'), {
                nombre_cliente: cliente.nombre_cliente.trim().toUpperCase(),
                telefono_cliente: cliente.telefono_cliente.trim(),
                direccion_cliente: cliente.direccion_cliente.trim().toUpperCase(),
                ciudad_cliente: cliente.ciudad_cliente.trim().toUpperCase(),
                tipo_cliente: 'fisico',
            });

            const { cliente: creado, existe, message } = respuesta.data;

            if (existe) {
                sileo.info({ title: message, description: 'El cliente ya existía en el sistema. Se ha agregado automáticamente.' });
            } else {
                sileo.success({ title: message, description: 'Cliente creado exitosamente.' });
            }

            onCreado(creado);
            cerrar();
        } catch (error) {
            console.error('Error al crear cliente:', error);
            const datos = (error as { response?: { data?: { errors?: Record<string, string> } } }).response?.data;

            if (datos?.errors) {
                setErrores(datos.errors);
                sileo.error({ title: 'Error de validación', description: 'Por favor corrige los errores en el formulario.' });
            } else {
                sileo.error({ title: 'Error al crear cliente', description: 'Intenta nuevamente o contacta al administrador.' });
            }
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(abierto) => {
                if (!abierto) {
                    setCliente(clienteVacio);
                    setErrores({});
                }
                onOpenChange(abierto);
            }}
        >
            <DialogContent className="max-h-[190vh] overflow-hidden p-0 sm:max-w-lg">
                <DialogHeader className="border-b bg-gradient-to-r from-sky-600 to-sky-700 px-6 py-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl text-white">Crear Nuevo Cliente Físico</DialogTitle>
                            <DialogDescription className="text-sky-100">
                                Los clientes físicos pueden usarse como fuente de financiamiento para compras.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] px-6">
                    <div className="grid gap-6 py-4">
                        <div className="space-y-4">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="dialog-nombre-cliente" className="flex items-center gap-1">
                                        Nombre Completo <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="dialog-nombre-cliente"
                                        name="nombre_cliente"
                                        value={cliente.nombre_cliente}
                                        onChange={cambiarCampo}
                                        placeholder="Ej: JUAN PÉREZ"
                                        className={errores.nombre_cliente ? 'border-red-500' : ''}
                                    />
                                    {errores.nombre_cliente && <p className="text-sm text-red-500">{errores.nombre_cliente}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="dialog-telefono-cliente" className="flex items-center gap-1">
                                        Teléfono <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="dialog-telefono-cliente"
                                        name="telefono_cliente"
                                        value={cliente.telefono_cliente}
                                        onChange={cambiarCampo}
                                        placeholder="Ej: 555-1234"
                                        className={errores.telefono_cliente ? 'border-red-500' : ''}
                                    />
                                    {errores.telefono_cliente && <p className="text-sm text-red-500">{errores.telefono_cliente}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="dialog-ciudad-cliente">Ciudad</Label>
                                        <Input
                                            id="dialog-ciudad-cliente"
                                            name="ciudad_cliente"
                                            value={cliente.ciudad_cliente}
                                            onChange={cambiarCampo}
                                            placeholder="Ej: MANZANILLO, QUIVICÁN"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="deuda_inicial">Crédito Inicial</Label>
                                        <div className="flex items-center rounded-md border">
                                            <span className="bg-muted px-3 py-2 text-amber-500">$</span>
                                            <Input type="number" value="0" disabled className="border-0 bg-transparent" />
                                        </div>
                                        <p className="text-xs text-gray-500">Todos los clientes nuevos empiezan con crédito 0</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="dialog-direccion-cliente">Dirección</Label>
                                    <textarea
                                        id="dialog-direccion-cliente"
                                        name="direccion_cliente"
                                        value={cliente.direccion_cliente}
                                        onChange={cambiarCampo}
                                        placeholder="DIRECCIÓN COMPLETA"
                                        rows={3}
                                        className="border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
                                <div className="flex items-start gap-3">
                                    <Info className="h-5 w-5 text-blue-600" />
                                    <div className="text-sm text-blue-800 dark:text-blue-300">
                                        <p className="font-medium">¿Cómo funciona el financiamiento con clientes?</p>
                                        <p className="mt-1">
                                            Los clientes pueden prestar dinero a la empresa. Al usar un cliente para pagar una compra, se reduce su
                                            crédito (si tenía) o se genera una nueva deuda con el cliente.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="gap-2 border-t px-6 py-4">
                    <Button type="button" variant="destructive" onClick={cerrar}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={crear}
                        className="bg-sky-600 hover:bg-sky-700"
                        disabled={!cliente.nombre_cliente.trim() || !cliente.telefono_cliente.trim()}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Crear Cliente
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
