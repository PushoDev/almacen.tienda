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
import { useState } from 'react';
import { toast, Toaster } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Productos', href: '/productos' },
    { title: 'Editar Producto', href: '#' },
];

export default function EditarProductosPage({ producto, categorias }: { producto: ProductoProps; categorias: CategoriasProps[] }) {
    const { data, setData, post, errors, processing } = useForm({
        _method: 'put',
        nombre_producto: producto.nombre_producto,
        marca_producto: producto.marca_producto || '',
        codigo_producto: producto.codigo_producto || '',
        categoria_id: producto.categoria_id.toString(),
        precio_compra_producto: producto.precio_compra_producto,
        imagen_producto: null as File | null,
        // Eliminamos 'cantidad_producto' del estado de Inertia ya que no es un campo editable.
    });

    const [preview, setPreview] = useState<string | null>(producto.imagen_url ?? null);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        post(route('productos.update', { producto: producto.id }), {
            onSuccess: () => toast.success('Producto actualizado correctamente'),
            onError: () => toast.error('Error al actualizar el producto'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Producto" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento"
                    />
                    <FileBox
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Formulario */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <form onSubmit={submit} className="space-y-6 p-6">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* Columna 1 */}
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="nombre_producto">Nombre del Producto:</Label>
                                    <Input
                                        id="nombre_producto"
                                        value={data.nombre_producto}
                                        onChange={(e) => setData('nombre_producto', e.target.value)}
                                        placeholder="Nombre del Producto"
                                    />
                                    <InputError message={errors.nombre_producto} />
                                </div>

                                <div>
                                    <Label htmlFor="marca_producto">Marca del Producto:</Label>
                                    <Input
                                        id="marca_producto"
                                        value={data.marca_producto}
                                        onChange={(e) => setData('marca_producto', e.target.value)}
                                        placeholder="Marca del Producto"
                                    />
                                    <InputError message={errors.marca_producto} />
                                </div>

                                {/* Campo de Precio de Compra no editable */}
                                <div>
                                    <Label htmlFor="precio_compra_producto">Precio de Compra:</Label>
                                    <Input
                                        id="precio_compra_producto"
                                        type="number"
                                        value={data.precio_compra_producto}
                                        onChange={() => {}} // No permitimos cambios
                                        disabled
                                    />
                                    <InputError message={errors.precio_compra_producto} />
                                </div>

                                {/* Campo de Cantidad no editable */}
                                <div>
                                    <Label htmlFor="cantidad_producto">Cantidad:</Label>
                                    <Input
                                        id="cantidad_producto"
                                        type="text" // Cambiamos a 'text' para que se vea como un campo de texto normal
                                        value={(producto.almacenes ?? []).reduce((total, almacen) => total + almacen.pivot.cantidad, 0)}
                                        disabled
                                    />
                                </div>
                            </div>

                            {/* Columna 2 */}
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="categoria_id">Categoría:</Label>
                                    <Select value={data.categoria_id} onValueChange={(value) => setData('categoria_id', value)}>
                                        <SelectTrigger>
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
                                    <InputError message={errors.categoria_id} />
                                </div>

                                <div>
                                    <Label htmlFor="codigo_producto">Código del Producto:</Label>
                                    <Input
                                        id="codigo_producto"
                                        value={data.codigo_producto}
                                        onChange={(e) => setData('codigo_producto', e.target.value)}
                                        placeholder="Código del Producto"
                                    />
                                    <InputError message={errors.codigo_producto} />
                                </div>

                                <div>
                                    <Label htmlFor="imagen_producto">Imagen del Producto:</Label>
                                    <Input
                                        id="imagen_producto"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files ? e.target.files[0] : null;
                                            setData('imagen_producto', file);
                                            if (file) {
                                                setPreview(URL.createObjectURL(file));
                                            }
                                        }}
                                    />
                                    <InputError message={errors.imagen_producto} />
                                    {preview && (
                                        <div className="mt-2">
                                            <img src={preview} alt={data.nombre_producto} className="h-20 w-20 rounded-full object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Actualizando...' : 'Actualizar Producto'}
                            </Button>
                        </div>
                    </form>
                </div>
                <Toaster position="top-center" />
            </div>
        </AppLayout>
    );
}
