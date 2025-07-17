import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { ClienteProps, type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Clientes',
        href: '/clientes',
    },
    {
        title: 'Editar Cliente',
        href: '#',
    },
];

export default function EditClientePage({ cliente }: { cliente: ClienteProps }) {
    const { data, setData, put, errors, processing } = useForm({
        nombre_cliente: cliente.nombre_cliente,
        tipo_cliente: cliente.tipo_cliente,
        deuda_pago_cliente: cliente.deuda_pago_cliente || 0,
        telefono_cliente: cliente.telefono_cliente || '',
        direccion_cliente: cliente.direccion_cliente || '',
        ciudad_cliente: cliente.ciudad_cliente || '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        put(route('clientes.update', { cliente: cliente.id }), {
            onSuccess: () => {
                toast.success('Cliente actualizado correctamente');
            },
            onError: () => {
                toast.error('Error al actualizar el cliente');
            },
        });
    };

    const formatearMoneda = (valor: number | null) => {
        if (!valor) return '$0.00';
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 8,
        }).format(valor);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Cliente" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title={`Editando: ${cliente.nombre_cliente}`}
                        description="Modifique los datos requeridos del cliente seleccionado"
                    />
                </div>

                {/* Formulario de Edición */}
                <form onSubmit={submit} className="space-y-6 p-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* Columna 1 */}
                        <div className="space-y-4">
                            {/* Nombre del Cliente */}
                            <div>
                                <Label htmlFor="nombre_cliente">Nombre Completo *</Label>
                                <Input
                                    id="nombre_cliente"
                                    value={data.nombre_cliente}
                                    onChange={(e) => setData('nombre_cliente', e.target.value)}
                                    placeholder="Ej: Juan Pérez López"
                                    className="mt-1"
                                />
                                <InputError message={errors.nombre_cliente} />
                            </div>

                            {/* Tipo de Cliente */}
                            <div>
                                <Label htmlFor="tipo_cliente">Tipo de Cliente *</Label>
                                <Select value={data.tipo_cliente} onValueChange={(value) => setData('tipo_cliente', value)}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Seleccione un tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fisico">Cliente Físico</SelectItem>
                                        <SelectItem value="asociado">Cliente Asociado</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.tipo_cliente} />
                            </div>

                            {/* Teléfono */}
                            <div>
                                <Label htmlFor="telefono_cliente">Teléfono de Contacto</Label>
                                <Input
                                    id="telefono_cliente"
                                    value={data.telefono_cliente}
                                    onChange={(e) => setData('telefono_cliente', e.target.value)}
                                    placeholder="Ej: 555-1234-567"
                                    className="mt-1"
                                />
                                <InputError message={errors.telefono_cliente} />
                            </div>
                        </div>

                        {/* Columna 2 */}
                        <div className="space-y-4">
                            {/* Deuda Actual */}
                            <div>
                                <Label htmlFor="deuda_pago_cliente">
                                    Deuda Actual
                                    <span className="ml-2 text-sm text-gray-500">({formatearMoneda(cliente.deuda_pago_cliente)})</span>
                                </Label>
                                <Input
                                    id="deuda_pago_cliente"
                                    type="number"
                                    step="0.00000001"
                                    value={data.deuda_pago_cliente}
                                    onChange={(e) => setData('deuda_pago_cliente', parseFloat(e.target.value))}
                                    placeholder="Ej: 1500.00"
                                    className="mt-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <InputError message={errors.deuda_pago_cliente} />
                            </div>

                            {/* Dirección */}
                            <div>
                                <Label htmlFor="direccion_cliente">Dirección</Label>
                                <Input
                                    id="direccion_cliente"
                                    value={data.direccion_cliente}
                                    onChange={(e) => setData('direccion_cliente', e.target.value)}
                                    placeholder="Ej: Calle Principal #123"
                                    className="mt-1"
                                />
                                <InputError message={errors.direccion_cliente} />
                            </div>

                            {/* Ciudad */}
                            <div>
                                <Label htmlFor="ciudad_cliente">Ciudad</Label>
                                <Input
                                    id="ciudad_cliente"
                                    value={data.ciudad_cliente}
                                    onChange={(e) => setData('ciudad_cliente', e.target.value)}
                                    placeholder="Ej: Ciudad de México"
                                    className="mt-1"
                                />
                                <InputError message={errors.ciudad_cliente} />
                            </div>
                        </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex justify-end gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => window.history.back()}
                            className="border-destructive text-destructive hover:bg-destructive/10"
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={processing} className="bg-primary hover:bg-primary/90 px-6 py-3 font-semibold">
                            {processing ? <span className="animate-pulse">Actualizando...</span> : 'Guardar Cambios'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
