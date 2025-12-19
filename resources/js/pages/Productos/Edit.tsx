import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { CategoriasProps, ProductoProps, SharedData, type BreadcrumbItem } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { FileBox, Package, QrCode, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast, Toaster } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Productos', href: '/productos' },
    { title: 'Editar Producto', href: '#' },
];

export default function EditarProductosPage({ producto, categorias }: { producto: ProductoProps; categorias: CategoriasProps[] }) {
    const { auth } = usePage<SharedData>().props;
    const isPrivileged = auth.user.role === 'admin' || auth.user.role === 'moderador';

    const { data, setData, post, errors, processing } = useForm({
        _method: 'put',
        nombre_producto: producto.nombre_producto,
        marca_producto: producto.marca_producto || '',
        modelo_producto: producto.modelo_producto || '',
        capacidad_producto: producto.capacidad_producto || '',
        codigo_producto: producto.codigo_producto || '',
        categoria_id: producto.categoria_id.toString(),
        precio_compra_producto: producto.precio_compra_producto,
        precio_venta_actualizado: producto.precio_venta_actualizado || 0,
        activo: producto.activo,
        descripcion_producto: producto.descripcion_producto || '',
        imagen_producto: null as File | null,
    });

    const [preview, setPreview] = useState<string | null>(producto.imagen_url ?? null);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        post(route('productos.update', { producto: producto.id }), {
            onSuccess: () => toast.success('Producto actualizado correctamente'),
            onError: () => toast.error('Error al actualizar el producto'),
        });
    };

    // Regenerar código de barras
    const regenerarBarcode = async () => {
        try {
            const response = await fetch(route('productos.regenerar-barcode', { producto: producto.id }), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Código de barras regenerado correctamente');
                // Recargar la página para ver los cambios
                window.location.reload();
            } else {
                toast.error(result.message || 'Error al regenerar el código de barras');
            }
        } catch {
            toast.error('Error al regenerar el código de barras');
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Producto" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Editar Producto" description="Actualiza la información del producto en el sistema" />
                    <FileBox
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Información del Producto */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="flex items-center justify-between rounded-lg bg-blue-100 p-4 dark:bg-blue-900">
                        <div>
                            <h3 className="font-semibold">Stock Actual</h3>
                            <p className="text-2xl">{producto.cantidad_total}</p>
                        </div>
                        <Package className="text-blue-500" size={32} />
                    </div>

                    <div
                        className={`flex items-center justify-between rounded-lg p-4 ${producto.stock_bajo ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'}`}
                    >
                        <div>
                            <h3 className="font-semibold">Estado Stock</h3>
                            <p className="text-2xl">{producto.stock_bajo ? 'Bajo' : 'Normal'}</p>
                        </div>
                        <Package className={producto.stock_bajo ? 'text-red-500' : 'text-green-500'} size={32} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-purple-100 p-4 dark:bg-purple-900">
                        <div>
                            <h3 className="font-semibold">Código</h3>
                            <p className="font-mono text-lg">{producto.codigo_producto}</p>
                        </div>
                        <QrCode className="text-purple-500" size={32} />
                    </div>
                </div>

                {/* Formulario */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <form onSubmit={submit} className="space-y-6 p-6">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* Columna 1 */}
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="nombre_producto">Nombre del Producto *</Label>
                                    <Input
                                        id="nombre_producto"
                                        value={data.nombre_producto}
                                        onChange={(e) => setData('nombre_producto', e.target.value)}
                                        placeholder="Ingrese el nombre del producto"
                                        className="mt-1"
                                    />
                                    <InputError message={errors.nombre_producto} />
                                </div>

                                <div>
                                    <Label htmlFor="marca_producto">Marca del Producto</Label>
                                    <Input
                                        id="marca_producto"
                                        value={data.marca_producto}
                                        onChange={(e) => setData('marca_producto', e.target.value)}
                                        placeholder="Ingrese la marca del producto"
                                        className="mt-1"
                                    />
                                    <InputError message={errors.marca_producto} />
                                </div>

                                <div>
                                    <Label htmlFor="modelo_producto">Modelo del Producto</Label>
                                    <Input
                                        id="modelo_producto"
                                        value={data.modelo_producto}
                                        onChange={(e) => setData('modelo_producto', e.target.value)}
                                        placeholder="Ingrese el modelo del producto"
                                        className="mt-1"
                                    />
                                    <InputError message={errors.modelo_producto} />
                                </div>

                                <div>
                                    <Label htmlFor="capacidad_producto">Capacidad del Producto</Label>
                                    <Input
                                        id="capacidad_producto"
                                        value={data.capacidad_producto}
                                        onChange={(e) => setData('capacidad_producto', e.target.value)}
                                        placeholder="Ej: 500GB, 1TB, 16GB, etc."
                                        className="mt-1"
                                    />
                                    <InputError message={errors.capacidad_producto} />
                                </div>
                            </div>

                            {/* Columna 2 */}
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="categoria_id">Categoría *</Label>
                                    <Select value={data.categoria_id} onValueChange={(value) => setData('categoria_id', value)}>
                                        <SelectTrigger className="mt-1">
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
                                    <Label htmlFor="codigo_producto">Código del Producto</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="codigo_producto"
                                            value={data.codigo_producto}
                                            onChange={(e) => setData('codigo_producto', e.target.value)}
                                            placeholder="Código automático o manual"
                                            className="mt-1 flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={regenerarBarcode}
                                            className="mt-1"
                                            title="Regenerar código de barras"
                                        >
                                            <RefreshCw size={16} />
                                        </Button>
                                    </div>
                                    <InputError message={errors.codigo_producto} />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Déjalo vacío para generar automáticamente, o ingresa un código personalizado
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="precio_compra_producto">Precio de Compra *</Label>
                                    <Input
                                        id="precio_compra_producto"
                                        disabled
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={data.precio_compra_producto}
                                        onChange={(e) => setData('precio_compra_producto', parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                        className="mt-1"
                                    />
                                    <InputError message={errors.precio_compra_producto} />
                                </div>

                                <div>
                                    <Label htmlFor="imagen_producto">Imagen del Producto</Label>
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
                                        className="mt-1"
                                    />
                                    <InputError message={errors.imagen_producto} />

                                    {/* Preview de imagen */}
                                    <div className="mt-3 flex items-center gap-4">
                                        {preview && (
                                            <div className="flex flex-col items-center">
                                                <p className="mb-2 text-sm font-medium">Vista previa:</p>
                                                <img src={preview} alt={data.nombre_producto} className="h-24 w-24 rounded-lg border object-cover" />
                                            </div>
                                        )}

                                        {/* Código de barras actual */}
                                        {producto.barcode_image_url && (
                                            <div className="flex flex-col items-center">
                                                <p className="mb-2 text-sm font-medium">Código de barras:</p>
                                                <img
                                                    src={producto.barcode_image_url}
                                                    alt={`Código de barras ${data.codigo_producto}`}
                                                    className="h-24 rounded-lg border"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Configuración Ecommerce */}
                        <div className="mt-6 border-t pt-6">
                            <h3 className="mb-4 text-lg font-semibold text-blue-600">Configuración Ecommerce</h3>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="precio_venta_actualizado">Precio de Venta Sugerido (Ecommerce)</Label>
                                        <Input
                                            id="precio_venta_actualizado"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            disabled={!isPrivileged}
                                            value={data.precio_venta_actualizado}
                                            onChange={(e) => setData('precio_venta_actualizado', parseFloat(e.target.value) || 0)}
                                            placeholder="0.00"
                                            className="mt-1"
                                        />
                                        <InputError message={errors.precio_venta_actualizado} />
                                        <p className="mt-1 text-xs text-gray-500">Este es el precio que se mostrará en el catálogo online.</p>
                                    </div>

                                    <div className="flex items-center space-x-2 rounded-lg border p-4">
                                        <Switch
                                            id="activo"
                                            disabled={!isPrivileged}
                                            checked={data.activo}
                                            onCheckedChange={(checked) => setData('activo', checked)}
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <Label htmlFor="activo" className="cursor-pointer font-semibold">
                                                Producto Activo en Ecommerce
                                            </Label>
                                            <p className="text-muted-foreground text-sm">Si está desactivado, no aparecerá en el catálogo.</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="descripcion_producto">Descripción del Producto (Catálogo)</Label>
                                    <Textarea
                                        id="descripcion_producto"
                                        disabled={!isPrivileged}
                                        value={data.descripcion_producto}
                                        onChange={(e) => setData('descripcion_producto', e.target.value)}
                                        placeholder="Ingrese una descripción detallada para los clientes..."
                                        className="mt-1 min-h-[120px]"
                                    />
                                    <InputError message={errors.descripcion_producto} />
                                </div>
                            </div>
                        </div>

                        {/* Información adicional */}
                        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                            <h3 className="mb-2 font-semibold">Información Adicional</h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div>
                                    <Label className="text-sm">Stock Total:</Label>
                                    <p className="font-semibold">{producto.cantidad_total} unidades</p>
                                </div>
                                <div>
                                    <Label className="text-sm">Código Actual:</Label>
                                    <p className="font-mono font-semibold">{producto.codigo_producto}</p>
                                </div>
                                <div>
                                    <Label className="text-sm">Estado:</Label>
                                    <p className={`font-semibold ${producto.stock_bajo ? 'text-red-600' : 'text-green-600'}`}>
                                        {producto.stock_bajo ? 'Stock Bajo' : 'Stock Normal'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={() => window.history.back()}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700">
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
