import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
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
        title: 'Crear Cliente',
        href: '#',
    },
];

export default function CreateClientePage() {
    // Manejo del formulario con useForm
    const { data, setData, post, reset, errors, processing } = useForm({
        nombre_cliente: '',
        telefono_cliente: '',
        direccion_cliente: '',
        ciudad_cliente: '',
    });

    // Función para enviar el formulario
    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        post(route('clientes.store'), {
            onSuccess: () => {
                reset(); // Limpia el formulario después de enviar
                toast.success('Cliente creado correctamente');
            },
            onError: () => {
                toast.error('Error al crear el cliente');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Cliente" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Nuevo Cliente" description="Complete los datos para agregar un nuevo cliente" />
                </div>

                {/* Formulario de Creación */}
                <form onSubmit={submit} className="space-y-6 p-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* Columna 1 */}
                        <div className="space-y-4">
                            {/* Campo Nombre del Cliente */}
                            <div>
                                <Label htmlFor="nombre_cliente">Nombre del Cliente</Label>
                                <Input
                                    id="nombre_cliente"
                                    value={data.nombre_cliente}
                                    onChange={(e) => setData('nombre_cliente', e.target.value)}
                                    placeholder="Nombre del Cliente"
                                />
                                <InputError message={errors.nombre_cliente} />
                            </div>
                            {/* Campo Teléfono del Cliente */}
                            <div>
                                <Label htmlFor="telefono_cliente">Teléfono del Cliente</Label>
                                <Input
                                    id="telefono_cliente"
                                    value={data.telefono_cliente}
                                    onChange={(e) => setData('telefono_cliente', e.target.value)}
                                    placeholder="Teléfono del Cliente"
                                />
                                <InputError message={errors.telefono_cliente} />
                            </div>
                        </div>

                        {/* Columna 2 */}
                        <div className="space-y-4">
                            {/* Campo Dirección del Cliente */}
                            <div>
                                <Label htmlFor="direccion_cliente">Dirección del Cliente</Label>
                                <Input
                                    id="direccion_cliente"
                                    value={data.direccion_cliente}
                                    onChange={(e) => setData('direccion_cliente', e.target.value)}
                                    placeholder="Dirección del Cliente"
                                />
                                <InputError message={errors.direccion_cliente} />
                            </div>
                            {/* Campo Ciudad del Cliente */}
                            <div>
                                <Label htmlFor="ciudad_cliente">Ciudad del Cliente</Label>
                                <Input
                                    id="ciudad_cliente"
                                    value={data.ciudad_cliente}
                                    onChange={(e) => setData('ciudad_cliente', e.target.value)}
                                    placeholder="Ciudad del Cliente"
                                />
                                <InputError message={errors.ciudad_cliente} />
                            </div>
                        </div>
                    </div>

                    {/* Botón Enviar */}
                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={processing}
                            className="w-full rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 md:w-auto"
                        >
                            {processing ? 'Creando...' : 'Crear Cliente'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
