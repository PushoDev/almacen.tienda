import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, CuentaNegocioProps, PagoVentaProps } from '@/types';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { PackagePlus, ShoppingBag, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function PuntoVentaPage({
    meta,
}: {
    meta: {
        role_usuario: string;
        almacenes_usuario: { id: string | number; nombre: string }[];
    };
}) {
    // Estados principales
    const [almacenSeleccionado, setAlmacenSeleccionado] = useState<string>('');
    const [productosFiltrados, setProductosFiltrados] = useState<ProductoVenta[]>([]);
    const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoVenta[]>([]);
    const [pago, setPago] = useState<PagoVentaProps>({
        tipo_pago: 'efectivo',
        via_pago: 'transfermovil',
        tipo_moneda: 'cup',
        monto: 0,
        cuenta_id: undefined,
    });
    const [detallesVenta, setDetallesVenta] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [cuentas, setCuentas] = useState<CuentaNegocioProps[]>([]);

    // Cargar cuentas desde la API (opcionalmente puedes pasarlas por Inertia)
    useEffect(() => {
        axios.get('/api/cuentas').then((res) => {
            setCuentas(res.data);
        });
    }, []);

    // Cargar productos cuando se selecciona un almacén
    useEffect(() => {
        if (!almacenSeleccionado) return;

        const almacenNombre = almacenSeleccionado;
        const almacen = meta.almacenes_usuario.find((a) => a.nombre === almacenNombre);

        if (!almacen) {
            setProductosFiltrados([]);
            return;
        }

        setLoading(true);

        axios
            .get(`/ventas/almacenes/${almacen.id}/productos`)
            .then((res) => {
                setProductosFiltrados(res.data);
            })
            .catch((err) => {
                console.error('Error al cargar productos:', err);
                toast.error('No se pudieron cargar los productos');
            })
            .finally(() => setLoading(false));
    }, [almacenSeleccionado]);

    // Agregar producto al carrito
    const agregarProducto = (producto: ProductoVenta) => {
        const existe = productosSeleccionados.some((p) => p.id === producto.id);
        if (existe) return;

        setProductosSeleccionados([
            ...productosSeleccionados,
            {
                ...producto,
                cantidad: 1,
                precio_venta: producto.precio_venta || producto.precio_compra * 1.5,
            },
        ]);
    };

    // Calcular total
    const calcularTotal = () => {
        return productosSeleccionados.reduce((acc, p) => acc + p.cantidad * p.precio_venta, 0);
    };

    // Registrar venta
    const registrarVenta = async () => {
        if (!almacenSeleccionado || productosSeleccionados.length === 0 || !pago.cuenta_id || pago.monto <= 0) {
            toast.error('Faltan datos requeridos para registrar la venta');
            return;
        }

        const totalVenta = calcularTotal();

        const ventaData: VentaRequestProps = {
            almacen_id: parseInt(almacenSeleccionado),
            cliente_id: null,
            detalles_venta: detallesVenta || null,
            productos: productosSeleccionados.map((p) => ({
                producto_id: p.id,
                cantidad: p.cantidad,
                precio_venta: p.precio_venta,
            })),
            pagos: [
                {
                    tipo_pago: pago.tipo_pago,
                    via_pago: pago.via_pago,
                    tipo_moneda: pago.tipo_moneda,
                    monto: parseFloat(pago.monto.toFixed(2)),
                    cuenta_id: pago.cuenta_id,
                },
            ],
        };

        try {
            await axios.post('/ventas', ventaData);
            toast.success('✅ Venta realizada con éxito');
            // Reiniciar estados
            setProductosSeleccionados([]);
            setPago({
                tipo_pago: 'transferencia',
                via_pago: 'transfermovil',
                tipo_moneda: 'cup',
                monto: 0,
                cuenta_id: 1,
            });
            setDetallesVenta('');
            setAlmacenSeleccionado('');
        } catch (error: any) {
            console.error(error.response?.data ?? error.message);
            toast.error(`❌ Error: ${error.response?.data?.error || 'No se pudo completar la venta'}`);
        }
    };

    // Rutas breadcrumb
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Productos',
            href: '/productos',
        },
        {
            title: 'Ventas',
            href: '#',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Punto de Venta" />

            {/* Contenedor principal */}
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Punto de Venta" description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento." />
                    <ShoppingBag
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator />
                {/* Resumen usuario */}
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <p>
                        Rol actual: <span className="text-primary font-medium">{meta.role_usuario === 'admin' ? 'Administrador' : 'Vendedor'}</span>
                    </p>
                </div>
                <Separator />

                {/* POS - Punto de Venta */}
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Columna 1: Productos Disponibles */}
                    <div>
                        {/* Seleccionar Almacén */}
                        <div>
                            <Select onValueChange={(value) => setAlmacenSeleccionado(value)} value={almacenSeleccionado}>
                                <SelectTrigger className="mt-4">
                                    <SelectValue placeholder="Selecciona un almacén" />
                                </SelectTrigger>
                                <SelectContent>
                                    {meta.almacenes_usuario.map((almacen) => (
                                        <SelectItem key={almacen.id} value={almacen.nombre}>
                                            {almacen.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <br />

                        {/* Tabla de Productos Disponibles */}
                        <Table>
                            <TableCaption>Productos disponibles en el almacén seleccionado</TableCaption>
                            <TableHeader>
                                <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent transition-colors">
                                    <TableHead className="text-white">Producto</TableHead>
                                    <TableHead className="text-white">Marca</TableHead>
                                    <TableHead className="text-center text-white">Stock</TableHead>
                                    <TableHead className="text-center text-white">Precio</TableHead>
                                    <TableHead className="text-center text-white">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-6 text-center">
                                            <span className="flex items-center justify-center gap-2 text-gray-500">
                                                <svg
                                                    className="h-5 w-5 animate-spin text-gray-500"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle
                                                        className="opacity-25"
                                                        cx="12"
                                                        cy="12"
                                                        r="10"
                                                        stroke="currentColor"
                                                        strokeWidth="4"
                                                    ></circle>
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V4a10 10 0 00-10 10h2z"
                                                    ></path>
                                                </svg>
                                                Cargando productos...
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ) : productosFiltrados.length > 0 ? (
                                    productosFiltrados.map((producto) => (
                                        <TableRow key={producto.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <TableCell>{producto.nombre_producto}</TableCell>
                                            <TableCell>{producto.precio_compra}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className={producto.stock_total === 0 ? 'bg-red-100 text-red-800' : ''}>
                                                    {producto.stock_total}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center font-semibold">
                                                {producto.precio_venta
                                                    ? `$ ${parseFloat(producto.precio_venta.toString()).toFixed(2)}`
                                                    : 'No definido'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() => agregarProducto(producto)}
                                                            className="hover:bg-green-100 hover:text-green-600 focus:outline-none"
                                                            title="Agregar producto"
                                                        >
                                                            <PackagePlus size={18} />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="text-white">
                                                        <p>Agregar al Pedido</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-10 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2 text-gray-400">
                                                <PackagePlus size={32} />
                                                <p>No hay productos disponibles en este almacén</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Columna 2: Productos Seleccionados y Resumen de Venta */}
                    <div className="flex flex-col space-y-4">
                        {/* Productos seleccionados */}
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative flex-1 overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md">
                            <div className="bg-white p-4 dark:bg-gray-800">
                                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                                    <PackagePlus className="text-green-600" size={18} />
                                    Productos Seleccionados
                                </h3>
                                <div className="max-h-[400px] space-y-3 overflow-y-auto">
                                    {productosSeleccionados.length > 0 ? (
                                        productosSeleccionados.map((producto, index) => {
                                            const subtotal = parseFloat((producto.cantidad * producto.precio_venta).toFixed(2));
                                            return (
                                                <div
                                                    key={producto.id}
                                                    className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all hover:shadow dark:border-gray-700 dark:bg-gray-800"
                                                >
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <span className="font-medium text-gray-800 dark:text-gray-100">
                                                            {producto.nombre_producto}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="secondary" className="text-xs">
                                                                {producto.marca_producto}
                                                            </Badge>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <button
                                                                        onClick={() => {
                                                                            const nuevosProductos = productosSeleccionados.filter(
                                                                                (_, i) => i !== index,
                                                                            );
                                                                            setProductosSeleccionados(nuevosProductos);
                                                                        }}
                                                                        className="cursor-pointer text-red-500 transition-colors hover:text-red-700 focus:outline-none"
                                                                        aria-label="Eliminar producto"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-white">
                                                                    <p>Quitar de la lista</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        {/* Cantidad */}
                                                        <div>
                                                            <Label className="block text-xs text-gray-500 dark:text-gray-400">Cantidad</Label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={producto.stock_total}
                                                                value={producto.cantidad}
                                                                onChange={(e) => {
                                                                    const nuevaCantidad = parseInt(e.target.value) || 1;
                                                                    const nuevosProductos = [...productosSeleccionados];
                                                                    nuevosProductos[index].cantidad = Math.min(nuevaCantidad, producto.stock_total);
                                                                    setProductosSeleccionados(nuevosProductos);
                                                                }}
                                                                className="w-full rounded border border-gray-300 p-1.5 text-sm outline-none focus:ring-2 focus:ring-green-400 dark:border-gray-600 dark:bg-gray-900"
                                                            />
                                                        </div>

                                                        {/* Precio */}
                                                        <div>
                                                            <Label className="block text-xs text-gray-500 dark:text-gray-400">Precio unitario</Label>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0.01"
                                                                value={producto.precio_venta}
                                                                onChange={(e) => {
                                                                    const nuevoPrecio = parseFloat(e.target.value) || 0;
                                                                    const nuevosProductos = [...productosSeleccionados];
                                                                    nuevosProductos[index].precio_venta = nuevoPrecio;
                                                                    setProductosSeleccionados(nuevosProductos);
                                                                }}
                                                                className="w-full rounded border border-gray-300 p-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-900"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Subtotal */}
                                                    <div className="mt-2 text-right">
                                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                            Subtotal: $ {subtotal.toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="px-4 py-6 text-center">
                                            <PackagePlus className="mx-auto mb-2 text-gray-400" size={24} />
                                            <p className="text-sm text-gray-500 dark:text-gray-400">No hay productos seleccionados</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Resumen de venta */}
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative overflow-hidden rounded-xl border bg-green-50 dark:bg-green-900/20">
                            <div className="p-4">
                                <h3 className="mb-2 text-lg font-semibold">Resumen de Venta</h3>
                                <div className="space-y-1">
                                    <p>Total de productos: {productosSeleccionados.length}</p>
                                    <p className="text-xl font-bold text-green-600 dark:text-green-400">Total: S/. {calcularTotal().toFixed(2)}</p>
                                </div>

                                {/* Diálogo de finalizar venta */}
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="mt-4 w-full bg-green-600 px-4 py-2 text-white hover:bg-green-700">
                                            Proceder Venta
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[625px]">
                                        <DialogHeader>
                                            <DialogTitle className="text-green-600 dark:text-green-400">
                                                Finalizar Venta - $ {calcularTotal().toFixed(2)}
                                            </DialogTitle>
                                            <DialogDescription>Rellene los datos necesarios para registrar la venta.</DialogDescription>
                                        </DialogHeader>

                                        <div className="grid gap-4 py-4">
                                            {/* Tipo de Pago */}
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="tipo_pago" className="col-span-1 text-right">
                                                    Tipo de Pago
                                                </Label>
                                                <Select onValueChange={(value) => setPago({ ...pago, tipo_pago: value })} value={pago.tipo_pago}>
                                                    <SelectTrigger className="col-span-3">
                                                        <SelectValue placeholder="Selecciona un tipo de pago" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {['efectivo', 'tarjeta', 'transferencia', 'otros'].map((tipo) => (
                                                            <SelectItem key={tipo} value={tipo}>
                                                                {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Vía de Pago */}
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="via_pago" className="col-span-1 text-right">
                                                    Vía de Pago
                                                </Label>
                                                <Select onValueChange={(value) => setPago({ ...pago, via_pago: value })} value={pago.via_pago}>
                                                    <SelectTrigger className="col-span-3">
                                                        <SelectValue placeholder="Selecciona una vía de pago" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {['zelle', 'visa', 'paypal', 'mastercard', 'stripe', 'transfermovil', 'enzona', 'otros'].map(
                                                            (via) => (
                                                                <SelectItem key={via} value={via}>
                                                                    {via.charAt(0).toUpperCase() + via.slice(1)}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Tipo de Moneda */}
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="tipo_moneda" className="col-span-1 text-right">
                                                    Moneda
                                                </Label>
                                                <Select onValueChange={(value) => setPago({ ...pago, tipo_moneda: value })} value={pago.tipo_moneda}>
                                                    <SelectTrigger className="col-span-3">
                                                        <SelectValue placeholder="Selecciona una moneda" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {['usd', 'euro', 'mlc', 'cup'].map((moneda) => (
                                                            <SelectItem key={moneda} value={moneda}>
                                                                {moneda.toUpperCase()}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Monto Recibido */}
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="monto" className="col-span-1 text-right">
                                                    Monto
                                                </Label>
                                                <input
                                                    id="monto"
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    value={pago.monto || ''}
                                                    onChange={(e) => setPago({ ...pago, monto: parseFloat(e.target.value) || 0 })}
                                                    className="col-span-3 rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
                                                />
                                            </div>

                                            {/* Cuenta destino */}
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="cuenta_id" className="col-span-1 text-right">
                                                    Cuenta Destino
                                                </Label>
                                                <Select
                                                    onValueChange={(value) => setPago({ ...pago, cuenta_id: parseInt(value) })}
                                                    value={pago.cuenta_id?.toString() || ''}
                                                >
                                                    <SelectTrigger className="col-span-3">
                                                        <SelectValue placeholder="Selecciona una cuenta" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {cuentas.map((cuenta) => (
                                                            <SelectItem key={cuenta.id} value={cuenta.id.toString()}>
                                                                {cuenta.nombre_cuenta} ({cuenta.tipo_cuenta})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Detalles de venta (opcional) */}
                                            <div className="grid grid-cols-4 items-center gap-4">
                                                <Label htmlFor="detalles_venta" className="col-span-1 text-right">
                                                    Detalles
                                                </Label>
                                                <textarea
                                                    id="detalles_venta"
                                                    rows={2}
                                                    placeholder="Ej: Cliente satisfecho, envío pendiente..."
                                                    value={detallesVenta}
                                                    onChange={(e) => setDetallesVenta(e.target.value)}
                                                    className="col-span-3 rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
                                                />
                                            </div>
                                        </div>

                                        <DialogFooter>
                                            <button
                                                onClick={registrarVenta}
                                                disabled={
                                                    !almacenSeleccionado || productosSeleccionados.length === 0 || !pago.cuenta_id || pago.monto <= 0
                                                }
                                                className="mt-4 w-full rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-gray-400"
                                            >
                                                Realizar Venta
                                            </button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
