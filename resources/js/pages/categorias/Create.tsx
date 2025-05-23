import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { ListCheck } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Categorias',
        href: '/categorias',
    },
    {
        title: 'Nueva Categorías',
        href: '#',
    },
];

export default function CreateCategoriasPage() {
    // Manejo del formulario con useForm
    const { data, setData, post, reset, errors, processing } = useForm({
        nombre_categoria: '',
        descripcion_categoria: '',
        activar_categoria: true,
    });

    // Función para enviar el formulario
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('categorias.store'), {
            onSuccess: () => {
                reset(); // Limpia el formulario después de enviar
                toast.success('Categoría creada correctamente');
            },
            onError: () => {
                toast.error('Error al crear la categoría');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categorias" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4"></div> */}
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamineto"
                    />
                    {/* Ícono semitransparente */}
                    <ListCheck
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                {/* Formulario */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <form onSubmit={submit} className="space-y-6 p-6">
                        {/* Contenedor de dos columnas */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* Columna 1 */}
                            <div className="space-y-4">
                                {/* Campo Nombre de la Categoría */}
                                <div>
                                    <Label htmlFor="nombre_categoria" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Nombre de la Categoría:
                                    </Label>
                                    <Input
                                        id="nombre_categoria"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.nombre_categoria}
                                        onChange={(e) => setData('nombre_categoria', e.target.value)}
                                        autoComplete="nombre_categoria"
                                        placeholder="Nombre de la Categoría"
                                    />
                                    <InputError className="mt-2" message={errors.nombre_categoria} />
                                </div>

                                {/* Campo Estado de la Categoría */}
                                <div>
                                    <Label htmlFor="activar_categoria" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Estado de la Categoría:
                                    </Label>
                                    <select
                                        id="activar_categoria"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.activar_categoria ? 'true' : 'false'}
                                        onChange={(e) => setData('activar_categoria', e.target.value === 'true')}
                                    >
                                        <option value="true">Activo</option>
                                        <option value="false">Inactivo</option>
                                    </select>
                                    <InputError className="mt-2" message={errors.activar_categoria} />
                                </div>
                            </div>

                            {/* Columna 2 */}
                            <div className="space-y-4">
                                {/* Campo Descripción de la Categoría */}
                                <div>
                                    <Label htmlFor="descripcion_categoria" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Descripción General de la Categoría:
                                    </Label>
                                    <Textarea
                                        id="descripcion_categoria"
                                        className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.descripcion_categoria}
                                        onChange={(e) => setData('descripcion_categoria', e.target.value)}
                                        autoComplete="descripcion_categoria"
                                        placeholder="Descripción de la Categoría"
                                    />
                                    <InputError className="mt-2" message={errors.descripcion_categoria} />
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
                                Crear Categoría
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
