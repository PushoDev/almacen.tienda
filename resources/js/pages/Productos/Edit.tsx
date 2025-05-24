import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { CategoriasProps, ProductoProps, type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FileBox } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Productos',
        href: '/productos',
    },
    {
        title: 'Editar Producto',
        href: '#',
    },
];

export default function EditarProductosPage({ producto, categorias }: { producto: ProductoProps; categorias: CategoriasProps[] }) {
    // Manejo del formulario con useForm
    const { data, setData, put, errors, processing } = useForm({
        nombre_producto: producto.nombre_producto,
        marca_producto: producto.marca_producto || '',
        codigo_producto: producto.codigo_producto || '',
        categoria_id: producto.categoria_id.toString(), // ID de la categoría seleccionada
        precio_compra_producto: producto.precio_compra_producto,
        cantidad_producto: producto.cantidad_producto,
        imagen_producto: null as File | null,
    });

    // Función para enviar el formulario
    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('nombre_producto', data.nombre_producto);
        formData.append('marca_producto', data.marca_producto);
        formData.append('codigo_producto', data.codigo_producto);
        formData.append('categoria_id', data.categoria_id);
        formData.append('precio_compra_producto', data.precio_compra_producto.toString());
        formData.append('cantidad_producto', data.cantidad_producto.toString());
        if (data.imagen_producto) {
            formData.append('imagen_producto', data.imagen_producto);
        }

        put(route('productos.update', { producto: producto.id }), {
            onSuccess: () => {
                toast.success('Producto actualizado correctamente');
            },
            onError: () => {
                toast.error('Error al actualizar el producto');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Producto" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento"
                    />
                    {/* Ícono semitransparente */}
                    <FileBox
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
                                {/* Campo Nombre del Producto */}
                                <div>
                                    <Label htmlFor="nombre_producto" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Nombre del Producto:
                                    </Label>
                                    <Input
                                        id="nombre_producto"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.nombre_producto}
                                        onChange={(e) => setData('nombre_producto', e.target.value)}
                                        autoComplete="nombre_producto"
                                        placeholder="Nombre del Producto"
                                    />
                                    <InputError className="mt-2" message={errors.nombre_producto} />
                                </div>

                                {/* Campo Marca del Producto */}
                                <div>
                                    <Label htmlFor="marca_producto" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Marca del Producto:
                                    </Label>
                                    <Input
                                        id="marca_producto"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.marca_producto}
                                        onChange={(e) => setData('marca_producto', e.target.value)}
                                        autoComplete="marca_producto"
                                        placeholder="Marca del Producto"
                                    />
                                    <InputError className="mt-2" message={errors.marca_producto} />
                                </div>

                                {/* Campo Código del Producto */}
                                <div>
                                    <Label htmlFor="codigo_producto" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Código del Producto:
                                    </Label>
                                    <Input
                                        id="codigo_producto"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.codigo_producto}
                                        onChange={(e) => setData('codigo_producto', e.target.value)}
                                        autoComplete="codigo_producto"
                                        placeholder="Código del Producto"
                                    />
                                    <InputError className="mt-2" message={errors.codigo_producto} />
                                </div>
                            </div>

                            {/* Columna 2 */}
                            <div className="space-y-4">
                                {/* Campo Categoría */}
                                <div>
                                    <Label htmlFor="categoria_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Categoría:
                                    </Label>
                                    <Select value={data.categoria_id} onValueChange={(value) => setData('categoria_id', value)}>
                                        <SelectTrigger className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                                            <SelectValue placeholder="Selecciona una categoría" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categorias.map((categoria) => (
                                                <SelectItem key={categoria.id} value={categoria.id.toString()}>
                                                    {categoria.nombre_categoria}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError className="mt-2" message={errors.categoria_id} />
                                </div>

                                {/* Campo Precio de Compra */}
                                <div>
                                    <Label htmlFor="precio_compra_producto" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Precio de Compra:
                                    </Label>
                                    <Input
                                        id="precio_compra_producto"
                                        type="number"
                                        step="0.01"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.precio_compra_producto}
                                        onChange={(e) => setData('precio_compra_producto', parseFloat(e.target.value))}
                                        autoComplete="precio_compra_producto"
                                        placeholder="Precio de Compra"
                                    />
                                    <InputError className="mt-2" message={errors.precio_compra_producto} />
                                </div>

                                {/* Campo Cantidad */}
                                <div>
                                    <Label htmlFor="cantidad_producto" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Cantidad:
                                    </Label>
                                    <Input
                                        id="cantidad_producto"
                                        type="number"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.cantidad_producto}
                                        onChange={(e) => setData('cantidad_producto', parseInt(e.target.value))}
                                        autoComplete="cantidad_producto"
                                        placeholder="Cantidad"
                                    />
                                    <InputError className="mt-2" message={errors.cantidad_producto} />
                                </div>

                                {/* Campo Imagen */}
                                <div>
                                    <Label htmlFor="imagen_producto" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Imagen del Producto:
                                    </Label>
                                    <Input
                                        id="imagen_producto"
                                        type="file"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        onChange={(e) => setData('imagen_producto', e.target.files ? e.target.files[0] : null)}
                                    />
                                    <InputError className="mt-2" message={errors.imagen_producto} />
                                    {producto.imagen_producto && (
                                        <div className="mt-2">
                                            <img
                                                src={`/storage/${producto.imagen_producto}`}
                                                alt={producto.nombre_producto}
                                                className="h-20 w-20 rounded-full object-cover"
                                            />
                                        </div>
                                    )}
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
                                {processing ? 'Actualizando...' : 'Actualizar Producto'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
