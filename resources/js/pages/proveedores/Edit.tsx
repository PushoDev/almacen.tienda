import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { ProveedorProps, type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { ListCheck } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Proveedores',
        href: '/proveedores',
    },
    {
        title: 'Editar Proveedor',
        href: '#',
    },
];

export default function EditarProveedoresPage({ proveedor }: { proveedor: ProveedorProps }) {
    // Manejo del formulario con useForm
    const { data, setData, put, errors, processing } = useForm({
        nombre_proveedor: proveedor.nombre_proveedor,
        telefono_proveedor: proveedor.telefono_proveedor,
        correo_proveedor: proveedor.correo_proveedor || '',
        localidad_proveedor: proveedor.localidad_proveedor,
        notas_proveedor: proveedor.notas_proveedor || '',
    });

    // Función para enviar el formulario
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('proveedores.update', { proveedor: proveedor.id }), {
            onSuccess: () => {
                toast.success('Proveedor actualizado correctamente');
            },
            onError: () => {
                toast.error('Error al actualizar el proveedor');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Proveedor" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento"
                    />
                    {/* Ícono semitransparente */}
                    <ListCheck
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Formulario de Edición */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <form onSubmit={submit} className="space-y-6 p-6">
                        {/* Contenedor de dos columnas */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* Columna 1 */}
                            <div className="space-y-4">
                                {/* Campo Nombre del Proveedor */}
                                <div>
                                    <Label htmlFor="nombre_proveedor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Nombre del Proveedor:
                                    </Label>
                                    <Input
                                        id="nombre_proveedor"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.nombre_proveedor}
                                        onChange={(e) => setData('nombre_proveedor', e.target.value)}
                                        autoComplete="nombre_proveedor"
                                        placeholder="Nombre del Proveedor"
                                    />
                                    <InputError className="mt-2" message={errors.nombre_proveedor} />
                                </div>

                                {/* Campo Teléfono del Proveedor */}
                                <div>
                                    <Label htmlFor="telefono_proveedor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Teléfono del Proveedor:
                                    </Label>
                                    <Input
                                        id="telefono_proveedor"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.telefono_proveedor}
                                        onChange={(e) => setData('telefono_proveedor', e.target.value)}
                                        autoComplete="telefono_proveedor"
                                        placeholder="Teléfono del Proveedor"
                                    />
                                    <InputError className="mt-2" message={errors.telefono_proveedor} />
                                </div>

                                {/* Campo Correo Electrónico */}
                                <div>
                                    <Label htmlFor="correo_proveedor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Correo Electrónico:
                                    </Label>
                                    <Input
                                        id="correo_proveedor"
                                        type="email"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.correo_proveedor}
                                        onChange={(e) => setData('correo_proveedor', e.target.value)}
                                        autoComplete="correo_proveedor"
                                        placeholder="Correo Electrónico"
                                    />
                                    <InputError className="mt-2" message={errors.correo_proveedor} />
                                </div>
                            </div>

                            {/* Columna 2 */}
                            <div className="space-y-4">
                                {/* Campo Localidad */}
                                <div>
                                    <Label htmlFor="localidad_proveedor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Localidad:
                                    </Label>
                                    <Input
                                        id="localidad_proveedor"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.localidad_proveedor}
                                        onChange={(e) => setData('localidad_proveedor', e.target.value)}
                                        autoComplete="localidad_proveedor"
                                        placeholder="Localidad"
                                    />
                                    <InputError className="mt-2" message={errors.localidad_proveedor} />
                                </div>

                                {/* Campo Notas Adicionales */}
                                <div>
                                    <Label htmlFor="notas_proveedor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Notas Adicionales:
                                    </Label>
                                    <Textarea
                                        id="notas_proveedor"
                                        className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.notas_proveedor}
                                        onChange={(e) => setData('notas_proveedor', e.target.value)}
                                        autoComplete="notas_proveedor"
                                        placeholder="Notas adicionales sobre el proveedor"
                                    />
                                    <InputError className="mt-2" message={errors.notas_proveedor} />
                                </div>
                            </div>
                        </div>

                        {/* Botón Actualizar */}
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white transition duration-300 ease-in-out hover:bg-indigo-700 md:w-auto"
                            >
                                {processing ? 'Actualizando...' : 'Actualizar Proveedor'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
