import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sileo-toaster';
import AppLayout from '@/layouts/app-layout';
import { sileo } from '@/lib/sileo';
import { CategoriasProps, FichaHermanaProps, ProductoProps, SharedData, type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Eye, EyeOff, FileBox, Layers, Package, QrCode, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Productos', href: '/listado-productos' },
    { title: 'Editar Producto', href: '#' },
];

export default function EditarProductosPage({
    producto,
    categorias,
    fichas_hermanas,
}: {
    producto: ProductoProps;
    categorias: CategoriasProps[];
    fichas_hermanas: FichaHermanaProps[];
}) {
    const { auth } = usePage<SharedData>().props;
    const isPrivileged = auth.user.role === 'admin';

    const { data, setData, post, errors, processing } = useForm({
        _method: 'put',
        nombre_producto: producto.nombre_producto,
        marca_producto: producto.marca_producto || '',
        modelo_producto: producto.modelo_producto || '',
        capacidad_producto: producto.capacidad_producto || '',
        color_producto: producto.color_producto || '',
        codigo_producto: producto.codigo_producto || '',
        categoria_id: producto.categoria_id.toString(),
        // String mientras se edita — convertir a número en cada tecla (parseFloat) borraba
        // el "." que el usuario acababa de escribir en cuanto no había dígitos después
        // (ej. "21." se guardaba como 21, el input se re-renderizaba sin el punto).
        precio_compra_producto: producto.precio_compra_producto.toString(),
        imagen_producto: null as File | null,
        password_confirmacion: '',
        motivo_cambio_costo: '',
    });

    const [preview, setPreview] = useState<string | null>(producto.imagen_url ?? null);
    const [passwordDialog, setPasswordDialog] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const priceChanged = isPrivileged && parseFloat(data.precio_compra_producto) !== producto.precio_compra_producto;

    const doPost = () => {
        post(route('productos.update', { producto: producto.id }), {
            onSuccess: () => {
                sileo.success({ title: 'Producto actualizado', description: 'Los cambios se guardaron correctamente' });
                setPasswordInput('');
            },
            onError: (errs) => {
                if (errs.password_confirmacion) {
                    sileo.error({ title: 'Error de confirmación', description: errs.password_confirmacion });
                    setPasswordDialog(true);
                } else {
                    sileo.error({ title: 'Error al actualizar', description: 'No se pudo actualizar el producto' });
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
                sileo.success({ title: 'Código transferido', description: 'El código de barras se transfirió correctamente' });
                setIsTransferModalOpen(false);
                transferForm.reset();
            },
            onError: (errors) => {
                if (errors.cantidad) sileo.error({ title: 'Cantidad inválida', description: errors.cantidad });
                else sileo.error({ title: 'Error al transferir', description: 'No se pudo transferir el código de barras' });
            },
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
                    <Card className="relative overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Stock Actual</CardTitle>
                            <Package className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{producto.cantidad_total}</div>
                            <p className="text-muted-foreground text-xs">unidades en todos los almacenes</p>
                        </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Estado Stock</CardTitle>
                            {producto.stock_bajo ? (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                            ) : (
                                <Package className="h-4 w-4 text-green-500" />
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${producto.stock_bajo ? 'text-red-600' : 'text-green-600'}`}>
                                {producto.stock_bajo ? 'Bajo' : 'Normal'}
                            </div>
                            <p className="text-muted-foreground text-xs">{producto.stock_bajo ? 'Reponer pronto' : 'Nivel saludable'}</p>
                        </CardContent>
                    </Card>

                    <Card className="relative overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Código</CardTitle>
                            <QrCode className="text-muted-foreground h-4 w-4" />
                        </CardHeader>
                        <CardContent>
                            <div className="font-mono text-lg font-bold">{producto.codigo_producto}</div>
                            <p className="text-muted-foreground text-xs">código por defecto</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Formulario */}
                <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <FileBox className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Información del Producto</CardTitle>
                                <CardDescription className="text-blue-100">Editá los datos y guardá los cambios</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={submit} className="space-y-6">
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
                                            inputMode="decimal"
                                            value={data.precio_compra_producto}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                                    setData('precio_compra_producto', value);
                                                }
                                            }}
                                            placeholder="0.00"
                                            className={`mt-1 ${priceChanged ? 'border-amber-500 ring-1 ring-amber-400' : ''}`}
                                        />
                                        {priceChanged && (
                                            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                                El precio cambia de {producto.precio_compra_producto} → {data.precio_compra_producto}. Se pedirá
                                                contraseña al guardar.
                                            </p>
                                        )}
                                        <InputError message={errors.precio_compra_producto} />
                                        <InputError message={errors.password_confirmacion} />
                                        {fichas_hermanas.length > 0 && (
                                            <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
                                                <Layers size={14} className="mt-0.5 shrink-0" />
                                                <span className="flex flex-wrap items-center gap-1">
                                                    Este campo solo cambia el costo de esta ficha — hay
                                                    <Badge
                                                        variant="outline"
                                                        className="gap-1 border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                                    >
                                                        <Layers size={11} />
                                                        {fichas_hermanas.length} ficha{fichas_hermanas.length === 1 ? '' : 's'} más
                                                    </Badge>
                                                    del mismo producto a otro costo (de otras compras).{' '}
                                                    <Link href={route('productos.show', { producto: producto.id })} className="underline">
                                                        Ver el detalle
                                                    </Link>
                                                    .
                                                </span>
                                            </div>
                                        )}
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
                                                    <img
                                                        src={preview}
                                                        alt={data.nombre_producto}
                                                        className="h-24 w-24 rounded-lg border object-cover"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="flex justify-end gap-3">
                                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={processing} className="bg-blue-600 hover:bg-blue-700">
                                    {processing ? 'Actualizando...' : 'Actualizar Producto'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Gestión de Códigos de Barras */}
                <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <QrCode className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Gestión de Códigos de Barras</CardTitle>
                                <CardDescription className="text-purple-100">
                                    {producto.codigos?.length || 0} código{producto.codigos?.length === 1 ? '' : 's'} asignado
                                    {producto.codigos?.length === 1 ? '' : 's'}
                                </CardDescription>
                            </div>
                        </div>
                        <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="h-9 gap-2 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30">
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
                                                    {producto.codigos
                                                        ?.filter((c) => c.cantidad > 0)
                                                        .map((codigo) => (
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
                                            {transferForm.errors.cantidad && <p className="text-xs text-red-500">{transferForm.errors.cantidad}</p>}
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
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {producto.codigos && producto.codigos.length > 0 ? (
                                producto.codigos.map((codigo) => (
                                    <div key={codigo.id} className="flex flex-col items-center rounded-lg border bg-gray-50 p-4 dark:bg-gray-800">
                                        {codigo.imagen_barcode ? (
                                            <img
                                                src={codigo.imagen_barcode}
                                                alt={`Código de barras ${codigo.codigo_barras}`}
                                                className="mb-3 h-24 w-full rounded-md border bg-white object-contain"
                                            />
                                        ) : (
                                            <div className="mb-3 flex h-24 w-full items-center justify-center rounded-md border border-dashed bg-white">
                                                <QrCode size={32} className="text-gray-400" />
                                            </div>
                                        )}
                                        <div className="w-full space-y-2 text-center">
                                            <p className="font-mono font-semibold">{codigo.codigo_barras}</p>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">Cantidad:</span>
                                                <Badge
                                                    variant="outline"
                                                    className="gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                                >
                                                    <Package size={12} />
                                                    {codigo.cantidad}
                                                </Badge>
                                            </div>
                                            {codigo.es_default && (
                                                <Badge className="gap-1 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300">
                                                    <CheckCircle2 size={12} />
                                                    Código por defecto
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-8 text-center text-gray-500">No hay códigos de barras asignados</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Dialog de confirmación de contraseña para cambio de precio de costo */}
                <Dialog
                    open={passwordDialog}
                    onOpenChange={(open) => {
                        setPasswordDialog(open);
                        if (!open) {
                            setPasswordInput('');
                            setShowPassword(false);
                        }
                    }}
                >
                    <DialogContent className="sm:max-w-[400px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <ShieldAlert className="text-amber-500" size={20} />
                                Confirmar cambio de precio de costo
                            </DialogTitle>
                            <DialogDescription>
                                Estás cambiando el precio de costo de <strong>${producto.precio_compra_producto}</strong> a{' '}
                                <strong>${data.precio_compra_producto}</strong>. Esta acción queda registrada en el historial. Ingresa tu contraseña
                                para confirmar.
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
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && passwordInput) confirmAndSubmit();
                                        }}
                                        placeholder="Ingresa tu contraseña"
                                        className="pr-10 normal-case"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                                onClick={() => {
                                    setPasswordDialog(false);
                                    setPasswordInput('');
                                    setShowPassword(false);
                                }}
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
