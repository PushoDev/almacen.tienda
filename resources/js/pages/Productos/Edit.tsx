import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { CategoriasProps, ProductoProps, SharedData, type BreadcrumbItem } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileBox, Package, QrCode, ArrowRightLeft, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { toast, Toaster } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Productos', href: '/listado-productos' },
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
        color_producto: producto.color_producto || '',
        codigo_producto: producto.codigo_producto || '',
        categoria_id: producto.categoria_id.toString(),
        precio_compra_producto: producto.precio_compra_producto,
        imagen_producto: null as File | null,
        password_confirmacion: '',
        motivo_cambio_costo: '',
    });

    const [preview, setPreview] = useState<string | null>(producto.imagen_url ?? null);
    const [passwordDialog, setPasswordDialog] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const priceChanged = isPrivileged && data.precio_compra_producto !== producto.precio_compra_producto;

    const doPost = () => {
        post(route('productos.update', { producto: producto.id }), {
            onSuccess: () => {
                toast.success('Producto actualizado correctamente');
                setPasswordInput('');
            },
            onError: (errs) => {
                if (errs.password_confirmacion) {
                    toast.error(errs.password_confirmacion);
                    setPasswordDialog(true);
                } else {
                    toast.error('Error al actualizar el producto');
                }
            },
        });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (priceChanged) {
            setPasswordDialog(true);
            return;
        }
        doPost();
    };

    const confirmAndSubmit = () => {
        setPasswordDialog(false);
        setData('password_confirmacion', passwordInput);
        // Inertia useForm stores data in a ref, so post() reads the updated value
        setTimeout(() => doPost(), 0);
    };

    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    
    const transferForm = useForm({
        codigo_origen_id: '',
        nuevo_codigo: '',
        cantidad: 1,
    });

    const submitTransfer = (e: React.FormEvent) => {
        e.preventDefault();
        transferForm.post(route('productos.transferir-codigo', { producto: producto.id }), {
            onSuccess: () => {
                toast.success('Código de barras transferido correctamente');
                setIsTransferModalOpen(false);
                transferForm.reset();
            },
            onError: (errors) => {
                if (errors.cantidad) toast.error(errors.cantidad);
                else toast.error('Error al transferir el código de barras');
            }
        });
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

                                <div>
                                    <Label htmlFor="color_producto">Color del Producto</Label>
                                    <Input
                                        id="color_producto"
                                        value={data.color_producto}
                                        onChange={(e) => setData('color_producto', e.target.value)}
                                        placeholder="Ej: Negro, Rojo, Azul, etc."
                                        className="mt-1"
                                    />
                                    <InputError message={errors.color_producto} />
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
                                    <Label htmlFor="codigo_producto">Código del Producto (Por defecto)</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="codigo_producto"
                                            value={data.codigo_producto}
                                            disabled
                                            className="mt-1 flex-1 bg-gray-50 text-gray-500"
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Para transferir cantidades o ver otros códigos, ve al detalle del producto.
                                    </p>
                                </div>

                                <div>
                                    <Label htmlFor="precio_compra_producto">
                                        Precio de Costo *
                                        {isPrivileged && (
                                            <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">
                                                (requiere contraseña para cambiar)
                                            </span>
                                        )}
                                    </Label>
                                    <Input
                                        id="precio_compra_producto"
                                        disabled={!isPrivileged}
                                        step="0.01"
                                        min="0"
                                        value={data.precio_compra_producto}
                                        onChange={(e) => setData('precio_compra_producto', parseFloat(e.target.value) || 0)}
                                        placeholder="0.00"
                                        className={`mt-1 ${priceChanged ? 'border-amber-500 ring-1 ring-amber-400' : ''}`}
                                    />
                                    {priceChanged && (
                                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                            El precio cambia de {producto.precio_compra_producto} → {data.precio_compra_producto}. Se pedirá contraseña al guardar.
                                        </p>
                                    )}
                                    <InputError message={errors.precio_compra_producto} />
                                    <InputError message={errors.password_confirmacion} />
                                </div>

                                {isPrivileged && priceChanged && (
                                    <div>
                                        <Label htmlFor="motivo_cambio_costo">Motivo del cambio (opcional)</Label>
                                        <Input
                                            id="motivo_cambio_costo"
                                            value={data.motivo_cambio_costo}
                                            onChange={(e) => setData('motivo_cambio_costo', e.target.value)}
                                            placeholder="Ej: Nuevo proveedor, ajuste de mercado..."
                                            className="mt-1"
                                        />
                                    </div>
                                )}

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
                                    </div>
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

                {/* Sección de Gestión de Códigos de Barras */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border mt-6 overflow-hidden rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-900">
                    <div className="flex flex-row items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-xl font-semibold">
                            <QrCode size={24} />
                            Gestión de Códigos de Barras ({producto.codigos?.length || 0})
                        </div>
                        <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 gap-2">
                                    <ArrowRightLeft size={16} />
                                    Asignar / Transferir
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <form onSubmit={submitTransfer}>
                                    <DialogHeader>
                                        <DialogTitle>Transferir a Nuevo Código</DialogTitle>
                                        <DialogDescription>
                                            Escanea el código de barras de la caja y asigna la cantidad desde el inventario existente.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="codigo_origen">Código de Origen</Label>
                                            <Select
                                                value={transferForm.data.codigo_origen_id}
                                                onValueChange={(val) => transferForm.setData('codigo_origen_id', val)}
                                            >
                                                <SelectTrigger id="codigo_origen">
                                                    <SelectValue placeholder="Selecciona el código origen" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {producto.codigos?.filter(c => c.cantidad > 0).map((codigo) => (
                                                        <SelectItem key={codigo.id} value={codigo.id.toString()}>
                                                            {codigo.codigo_barras} ({codigo.cantidad} disponibles)
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {transferForm.errors.codigo_origen_id && (
                                                <p className="text-xs text-red-500">{transferForm.errors.codigo_origen_id}</p>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="nuevo_codigo">Código Escaneado</Label>
                                            <Input
                                                id="nuevo_codigo"
                                                value={transferForm.data.nuevo_codigo}
                                                onChange={(e) => transferForm.setData('nuevo_codigo', e.target.value)}
                                                placeholder="Escanea el código aquí"
                                                autoFocus
                                            />
                                            {transferForm.errors.nuevo_codigo && (
                                                <p className="text-xs text-red-500">{transferForm.errors.nuevo_codigo}</p>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="cantidad">Cantidad a Asignar</Label>
                                            <Input
                                                id="cantidad"
                                                type="number"
                                                min="1"
                                                value={transferForm.data.cantidad}
                                                onChange={(e) => transferForm.setData('cantidad', parseInt(e.target.value))}
                                            />
                                            {transferForm.errors.cantidad && (
                                                <p className="text-xs text-red-500">{transferForm.errors.cantidad}</p>
                                            )}
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={transferForm.processing}>
                                            Transferir Cantidad
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {producto.codigos && producto.codigos.length > 0 ? (
                            producto.codigos.map((codigo) => (
                                <div key={codigo.id} className="flex flex-col items-center rounded-lg border p-4 bg-gray-50 dark:bg-gray-800">
                                    {codigo.imagen_barcode ? (
                                        <img
                                            src={codigo.imagen_barcode}
                                            alt={`Código de barras ${codigo.codigo_barras}`}
                                            className="h-24 w-full rounded-md border object-contain bg-white mb-3"
                                        />
                                    ) : (
                                        <div className="flex h-24 w-full items-center justify-center rounded-md border border-dashed bg-white mb-3">
                                            <QrCode size={32} className="text-gray-400" />
                                        </div>
                                    )}
                                    <div className="w-full space-y-1 text-center">
                                        <p className="font-mono font-semibold">{codigo.codigo_barras}</p>
                                        <div className="flex items-center justify-between mt-2 text-sm">
                                            <span className="text-muted-foreground">Cantidad:</span>
                                            <span className="font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-100">
                                                {codigo.cantidad}
                                            </span>
                                        </div>
                                        {codigo.es_default && (
                                            <span className="inline-block mt-2 text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded dark:bg-purple-900 dark:text-purple-100">
                                                Código por defecto
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full py-8 text-center text-gray-500">
                                No hay códigos de barras asignados
                            </div>
                        )}
                    </div>
                </div>

                {/* Dialog de confirmación de contraseña para cambio de precio de costo */}
                <Dialog open={passwordDialog} onOpenChange={(open) => { setPasswordDialog(open); if (!open) { setPasswordInput(''); setShowPassword(false); } }}>
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <ShieldAlert className="text-amber-500" size={20} />
                                Confirmar cambio de precio de costo
                            </DialogTitle>
                            <DialogDescription>
                                Estás cambiando el precio de costo de{' '}
                                <strong>${producto.precio_compra_producto}</strong> a{' '}
                                <strong>${data.precio_compra_producto}</strong>.
                                Esta acción queda registrada en el historial. Ingresa tu contraseña para confirmar.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="confirm-password">Contraseña</Label>
                                <div className="relative">
                                    <Input
                                        id="confirm-password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={passwordInput}
                                        onChange={(e) => setPasswordInput(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' && passwordInput) confirmAndSubmit(); }}
                                        placeholder="Ingresa tu contraseña"
                                        className="pr-10"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => { setPasswordDialog(false); setPasswordInput(''); setShowPassword(false); }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                disabled={!passwordInput || processing}
                                onClick={confirmAndSubmit}
                                className="bg-amber-600 hover:bg-amber-700"
                            >
                                {processing ? 'Guardando...' : 'Confirmar cambio'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Toaster position="top-center" />
            </div>
        </AppLayout>
    );
}
