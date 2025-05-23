import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Warehouse } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Almacenes',
        href: '/almacenes',
    },
    {
        title: 'Nuevo Almacén',
        href: '#',
    },
];

export default function CreateAlmacenesPage() {
    // Manejo del formulario con useForm
    const { data, setData, post, reset, errors, processing } = useForm({
        nombre_almacen: '',
        telefono_almacen: '',
        correo_almacen: '',
        provincia_almacen: '',
        ciudad_almacen: '',
        notas_almacen: '',
    });

    // Función para enviar el formulario
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('almacenes.store'), {
            onSuccess: () => {
                reset(); // Limpia el formulario después de enviar
                toast.success('Almacén creado correctamente');
            },
            onError: () => {
                toast.error('Error al crear el almacén');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Almacén" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento"
                    />
                    {/* Ícono semitransparente */}
                    <Warehouse
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Formulario de Creación */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <form onSubmit={submit} className="space-y-6 p-6">
                        {/* Contenedor de dos columnas */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* Columna 1 */}
                            <div className="space-y-4">
                                {/* Campo Nombre del Almacén */}
                                <div>
                                    <Label htmlFor="nombre_almacen" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Nombre del Almacén:
                                    </Label>
                                    <Input
                                        id="nombre_almacen"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.nombre_almacen}
                                        onChange={(e) => setData('nombre_almacen', e.target.value)}
                                        autoComplete="nombre_almacen"
                                        placeholder="Nombre del Almacén"
                                    />
                                    <InputError className="mt-2" message={errors.nombre_almacen} />
                                </div>

                                {/* Campo Teléfono del Almacén */}
                                <div>
                                    <Label htmlFor="telefono_almacen" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Teléfono del Almacén:
                                    </Label>
                                    <Input
                                        id="telefono_almacen"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.telefono_almacen}
                                        onChange={(e) => setData('telefono_almacen', e.target.value)}
                                        autoComplete="telefono_almacen"
                                        placeholder="Teléfono del Almacén"
                                    />
                                    <InputError className="mt-2" message={errors.telefono_almacen} />
                                </div>

                                {/* Campo Correo del Almacén */}
                                <div>
                                    <Label htmlFor="correo_almacen" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Correo Electrónico:
                                    </Label>
                                    <Input
                                        id="correo_almacen"
                                        type="email"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.correo_almacen}
                                        onChange={(e) => setData('correo_almacen', e.target.value)}
                                        autoComplete="correo_almacen"
                                        placeholder="Correo Electrónico"
                                    />
                                    <InputError className="mt-2" message={errors.correo_almacen} />
                                </div>
                            </div>

                            {/* Columna 2 */}
                            <div className="space-y-4">
                                {/* Campo Provincia del Almacén */}
                                <div>
                                    <Label htmlFor="provincia_almacen" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Provincia:
                                    </Label>
                                    <Input
                                        id="provincia_almacen"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.provincia_almacen}
                                        onChange={(e) => setData('provincia_almacen', e.target.value)}
                                        autoComplete="provincia_almacen"
                                        placeholder="Provincia"
                                    />
                                    <InputError className="mt-2" message={errors.provincia_almacen} />
                                </div>

                                {/* Campo Ciudad del Almacén */}
                                <div>
                                    <Label htmlFor="ciudad_almacen" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Ciudad:
                                    </Label>
                                    <Input
                                        id="ciudad_almacen"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.ciudad_almacen}
                                        onChange={(e) => setData('ciudad_almacen', e.target.value)}
                                        autoComplete="ciudad_almacen"
                                        placeholder="Ciudad"
                                    />
                                    <InputError className="mt-2" message={errors.ciudad_almacen} />
                                </div>

                                {/* Campo Notas del Almacén */}
                                <div>
                                    <Label htmlFor="notas_almacen" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Notas Adicionales:
                                    </Label>
                                    <Textarea
                                        id="notas_almacen"
                                        className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.notas_almacen}
                                        onChange={(e) => setData('notas_almacen', e.target.value)}
                                        autoComplete="notas_almacen"
                                        placeholder="Notas adicionales sobre el almacén"
                                    />
                                    <InputError className="mt-2" message={errors.notas_almacen} />
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
                                Crear Almacén
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
