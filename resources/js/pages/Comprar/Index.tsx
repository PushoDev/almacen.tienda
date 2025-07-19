import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { AlmacenProps, CategoriasProps, ClienteProps, CuentaNegocioProps, ProductoComprarProps, ProveedorProps, type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { BookCheck, CalendarIcon, Edit2, PlusIcon, ShoppingBasket, Trash2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Caja Principal',
        href: '/dashboard',
    },
    {
        title: 'Productos',
        href: '/productos',
    },
    {
        title: 'Realizar Venta',
        href: 'punto-venta',
    },
    {
        title: 'Adquirir Nuevos Productos',
        href: '/comprar',
    },
];

export default function ComprarPage() {
    const { props } = usePage();
    const { errors } = props;
    const [almacens, setAlmacens] = useState<AlmacenProps[]>([]);
    const [proveedors, setProveedors] = useState<ProveedorProps[]>([]);
    const [categorias, setCategorias] = useState<CategoriasProps[]>([]);
    const [clientes, setClientes] = useState<ClienteProps[]>([]);
    const [cuentas, setCuentas] = useState<CuentaNegocioProps[]>([]);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [editingProductId, setEditingProductId] = useState<number | null>(null);

    const [tempFormData, setTempFormData] = useState<Omit<ProductoComprarProps, 'id'>>({
        producto: '',
        categoria: '',
        codigo: '',
        cantidad: 0,
        precio: 0,
    });

    const [productos, setProductos] = useState<ProductoComprarProps[]>([]);

    const { data, setData, post, processing } = useForm({
        compra: 'deuda_proveedor',
        cuenta_id: 1,
        almacen: '',
        proveedor: '',
        fecha: date ? date.toISOString().split('T')[0] : '',
        pagos: [] as Array<{ cuenta_id: number; monto: number }>,
        cliente_id: null as number | null,
        monto_cliente: 0,
    });

    useEffect(() => {
        fetch('/compras/almacenes')
            .then((res) => res.json())
            .then((data) => setAlmacens(data))
            .catch((err) => console.error(err));

        fetch('/compras/proveedores')
            .then((res) => res.json())
            .then((data) => setProveedors(data))
            .catch((err) => console.error(err));

        fetch('/compras/categorias')
            .then((res) => res.json())
            .then((data) => setCategorias(data))
            .catch((err) => console.error(err));

        fetch('/compras/clientes/fisicos')
            .then((res) => res.json())
            .then((data) => setClientes(data))
            .catch((err) => console.error(err));

        fetch('/compras/cuentas/pago')
            .then((res) => res.json())
            .then((data) => setCuentas(data))
            .catch((err) => console.error(err));
    }, []);

    const handleTempInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setTempFormData((prev) => ({
            ...prev,
            [name]: name === 'cantidad' || name === 'precio' ? parseFloat(value) || 0 : value,
        }));
    };

    const agregarProducto = () => {
        if (!tempFormData.producto || !tempFormData.categoria || !tempFormData.codigo || tempFormData.cantidad <= 0 || tempFormData.precio <= 0) {
            toast.warning('Por favor rellene todos los campos');
            return;
        }

        const nuevoProducto: ProductoComprarProps = {
            id: editingProductId || Date.now(),
            ...tempFormData,
        };

        if (editingProductId) {
            setProductos((prev) => prev.map((p) => (p.id === editingProductId ? nuevoProducto : p)));
            setEditingProductId(null);
        } else {
            setProductos((prev) => [...prev, nuevoProducto]);
        }

        setTempFormData({ producto: '', categoria: '', codigo: '', cantidad: 0, precio: 0 });
    };

    const eliminarProducto = (id: number) => {
        setProductos((prev) => prev.filter((p) => p.id !== id));
    };

    const editarProducto = (id: number) => {
        const productoParaEditar = productos.find((p) => p.id === id);
        if (productoParaEditar) {
            setTempFormData({
                producto: productoParaEditar.producto,
                categoria: productoParaEditar.categoria,
                codigo: productoParaEditar.codigo,
                cantidad: productoParaEditar.cantidad,
                precio: productoParaEditar.precio,
            });
            setEditingProductId(id);
        }
    };

    const calcularTotal = () => {
        return productos.reduce((total, p) => total + p.cantidad * p.precio, 0).toFixed(2);
    };

    const handleSubmit = () => {
        // Validaciones antes de enviar
        if (productos.length === 0) {
            toast.warning('Debe agregar al menos un producto.');
            return;
        }

        if (data.compra === 'pago_cash' && data.pagos.length === 0) {
            toast.warning('Debe agregar al menos un pago.');
            return;
        }

        if (data.cliente_id && !clientes.some((cliente) => cliente.id === data.cliente_id)) {
            toast.warning('El cliente seleccionado no existe.');
            return;
        }

        if (data.monto_cliente <= 0) {
            toast.warning('El monto del cliente debe ser mayor que 0.');
            return;
        }

        const compraData = {
            ...data,
            productos,
            fecha: date?.toISOString().split('T')[0],
        };

        post('/comprar', {
            preserveScroll: true,
            data: compraData,
            onSuccess: (response) => {
                console.log('Respuesta del servidor:', response);
                setProductos([]);
                setTempFormData({
                    producto: '',
                    categoria: '',
                    codigo: '',
                    cantidad: 0,
                    precio: 0,
                });
            },
            onError: (error) => {
                console.error('Error al realizar la compra:', error);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Comprar" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Comprar o adquirir nuevos productos para el negocio, antes de distribuir"
                    />
                    <ShoppingBasket
                        size={70}
                        color="#f59e0b"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator className="col-span-4" />

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sidebar-accent text-center">Nuevos Productos</CardTitle>
                        <CardDescription className="text-center">
                            A continuación usted va a realizar una compra de Productos, recuerde debe asignar: fecha de compra, almacén destino y
                            proveedor.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={(e) => e.preventDefault()}>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Label htmlFor="fechaCompra">Fecha de la Compra</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={'outline'}
                                                className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                                            >
                                                <CalendarIcon />
                                                {date ? format(date, 'PPP') : <span>Seleccione Fecha</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="mt-2 w-auto p-0" align="start">
                                            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    {errors.fecha && <InputError message={errors.fecha[0]} />}
                                </div>

                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Label htmlFor="proveedor">Proveedor</Label>
                                    <Select name="proveedor" value={data.proveedor} onValueChange={(value) => setData('proveedor', value)}>
                                        <SelectTrigger className="mt-2 w-full">
                                            <SelectValue placeholder="Seleccione Proveedor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {proveedors.map((proveedor) => (
                                                <SelectItem key={proveedor.id} value={proveedor.nombre_proveedor}>
                                                    {proveedor.nombre_proveedor}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.proveedor && <InputError message={errors.proveedor[0]} />}
                                </div>

                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Label htmlFor="almacen">Almacén</Label>
                                    <Select name="almacen" value={data.almacen} onValueChange={(value) => setData('almacen', value)}>
                                        <SelectTrigger className="mt-2 w-full">
                                            <SelectValue placeholder="Seleccione Almacén" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {almacens.map((almacen) => (
                                                <SelectItem key={almacen.id} value={almacen.nombre_almacen}>
                                                    {almacen.nombre_almacen}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.almacen && <InputError message={errors.almacen[0]} />}
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardDescription className="text-center dark:text-emerald-400">Ingrese Datos del Producto a Comprar</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="nombre_producto">Nombre del Producto</Label>
                                <Input
                                    className="mt-2"
                                    type="text"
                                    name="producto"
                                    placeholder="Producto"
                                    value={tempFormData.producto}
                                    onChange={handleTempInputChange}
                                />
                                {errors.producto && <InputError message={errors.producto[0]} />}
                            </div>

                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="codigo_producto">Código del Producto</Label>
                                <Input
                                    className="mt-2"
                                    type="text"
                                    name="codigo"
                                    placeholder="Código Producto"
                                    value={tempFormData.codigo}
                                    onChange={handleTempInputChange}
                                />
                                {errors.codigo && <InputError message={errors.codigo[0]} />}
                            </div>

                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="categorias">Categoría</Label>
                                <Select
                                    name="categoria"
                                    value={tempFormData.categoria}
                                    onValueChange={(value) => setTempFormData({ ...tempFormData, categoria: value })}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Seleccione Categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categorias.map((categoria) => (
                                            <SelectItem key={categoria.id} value={categoria.nombre_categoria}>
                                                {categoria.nombre_categoria}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.categorias && <InputError message={errors.categorias[0]} />}
                            </div>

                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="precio_producto">Precio</Label>
                                <Input
                                    type="number"
                                    name="precio"
                                    placeholder="Precio"
                                    value={tempFormData.precio}
                                    onChange={handleTempInputChange}
                                />
                                {errors.precio && <InputError message={errors.precio[0]} />}
                            </div>

                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="cantidad_producto">Cantidad</Label>
                                <Input
                                    type="number"
                                    name="cantidad"
                                    placeholder="Cantidad"
                                    value={tempFormData.cantidad}
                                    onChange={handleTempInputChange}
                                />
                                {errors.cantidad && <InputError message={errors.cantidad[0]} />}
                            </div>

                            <div className="mt-6 grid w-full max-w-sm items-center gap-1">
                                <Button
                                    variant="secondary"
                                    className="cursor-pointer hover:animate-pulse hover:bg-blue-400"
                                    onClick={agregarProducto}
                                >
                                    <PlusIcon />
                                    Agregar Producto
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <Table>
                        <TableCaption className="text-sidebar-accent">Lista de los Productos a Comprar</TableCaption>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                <TableHead>Producto</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>Cantidad</TableHead>
                                <TableHead>Precio</TableHead>
                                <TableHead>Importe</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {productos.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.producto}</TableCell>
                                    <TableCell>{p.categoria}</TableCell>
                                    <TableCell>{p.codigo}</TableCell>
                                    <TableCell>{p.cantidad}</TableCell>
                                    <TableCell>${p.precio.toFixed(2)}</TableCell>
                                    <TableCell>${(p.cantidad * p.precio).toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="link" onClick={() => editarProducto(p.id)} className="text-blue-600 hover:text-blue-800">
                                            <Edit2 />
                                        </Button>
                                        <Button
                                            variant="link"
                                            onClick={() => eliminarProducto(p.id)}
                                            className="ms-2 text-red-600 hover:text-red-800"
                                        >
                                            <Trash2Icon />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={3} className="bg-gray-500 text-center text-white">
                                    {productos.length} Tipo de Mercancía
                                </TableCell>
                                <TableCell className="bg-gray-600 text-amber-300">{productos.reduce((t, p) => t + p.cantidad, 0)} Unidades</TableCell>
                                <TableCell colSpan={3} className="bg-gray-900 text-center font-bold text-emerald-300">
                                    Importe General: ${calcularTotal()}
                                    {data.cliente && <span className="block text-xs text-amber-500">Deuda cliente: +${calcularTotal()}</span>}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>

                <div className="flex justify-center gap-4 p-4">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="bg-green-600 text-white hover:bg-green-700">
                                Realizar Compra
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Tipo de Compra</AlertDialogTitle>
                                <AlertDialogDescription>Seleccione si desea pagar ahora o comprar y pagar luego</AlertDialogDescription>
                            </AlertDialogHeader>

                            <div className="flex flex-col gap-4 pt-4">
                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="tipo_compra">Tipo de Compra</Label>
                                    <Select
                                        name="compra"
                                        value={data.compra}
                                        onValueChange={(value) => setData('compra', value as 'deuda_proveedor' | 'pago_cash')}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Seleccione tipo de compra" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="deuda_proveedor">Generar Deuda</SelectItem>
                                            <SelectItem value="pago_cash">Pagar Ahora</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.compra && <InputError message={errors.compra[0]} />}
                                </div>

                                {data.compra === 'pago_cash' && (
                                    <>
                                        <Separator />

                                        <div className="grid w-full items-center gap-1.5">
                                            <Label htmlFor="cliente_id">Cliente (Opcional)</Label>
                                            <Select
                                                name="cliente_id"
                                                value={data.cliente_id ? data.cliente_id.toString() : ''}
                                                onValueChange={(value) => setData('cliente_id', value ? parseInt(value) : null)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccione cliente" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {clientes.map((cliente) => (
                                                        <SelectItem key={cliente.id} value={cliente.id.toString()}>
                                                            {cliente.nombre_cliente}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {errors.cliente_id && <InputError message={errors.cliente_id[0]} />}

                                            {/* Campo monto_cliente */}
                                            {data.cliente_id && (
                                                <div className="mt-4">
                                                    <Label htmlFor="monto_cliente">Monto del cliente</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        name="monto_cliente"
                                                        placeholder="Monto aportado por el cliente"
                                                        value={data.monto_cliente || ''}
                                                        onChange={(e) => setData('monto_cliente', parseFloat(e.target.value) || 0)}
                                                    />
                                                    {errors.monto_cliente && <InputError message={errors.monto_cliente[0]} />}
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Seleccione las cuentas y el monto a usar
                                            </h3>

                                            {cuentas.map((cuenta) => {
                                                const index = data.pagos?.findIndex((pago) => pago.cuenta_id === cuenta.id);
                                                const pago = data.pagos?.[index] || null;

                                                return (
                                                    <div key={cuenta.id} className="flex items-center gap-3">
                                                        <div className="flex-1">
                                                            <span className="block font-medium">{cuenta.nombre_cuenta}</span>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                Saldo: ${cuenta.saldo_cuenta.toFixed(2)}
                                                            </span>
                                                        </div>

                                                        <div className="flex-1">
                                                            <Input
                                                                type="number"
                                                                min="0.01"
                                                                step="0.01"
                                                                placeholder="Monto"
                                                                value={pago?.monto ?? ''}
                                                                onChange={(e) => {
                                                                    const monto = parseFloat(e.target.value) || 0;
                                                                    const updatedPagos = [...data.pagos];
                                                                    const idx = updatedPagos.findIndex((p) => p.cuenta_id === cuenta.id);

                                                                    if (idx > -1) {
                                                                        updatedPagos[idx].monto = monto;
                                                                    } else {
                                                                        updatedPagos.push({ cuenta_id: cuenta.id, monto });
                                                                    }

                                                                    setData('pagos', updatedPagos);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {errors.pagos && <InputError message={errors.pagos[0]} />}
                                        </div>

                                        <div className="mt-2 text-right text-sm text-gray-600 dark:text-gray-400">
                                            Total pagado: ${data.pagos?.reduce((acc, pago) => acc + pago.monto, 0).toFixed(2) || '0.00'} / $
                                            {parseFloat(calcularTotal()).toFixed(2)}
                                            {data.cliente_id && (
                                                <div className="text-amber-600 dark:text-amber-400">
                                                    Cliente asociado:{' '}
                                                    {clientes.find((c) => c.id.toString() === data.cliente_id?.toString())?.nombre_cliente}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <Button type="button" onClick={handleSubmit} disabled={processing} className="bg-green-600 hover:bg-green-700">
                                    {processing ? 'Registrando...' : 'Proceder Compra'}
                                </Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link href="/dashboard">
                                    <Button variant="secondary" className="ms-2">
                                        <BookCheck />
                                        Cancelar Compra
                                    </Button>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Cancelar y regresar</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <Toaster position="top-center" />
            </div>
        </AppLayout>
    );
}
