import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CursorFollow, CursorProvider } from '@/components/ui/cursor';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { ProductoVenta, VentaRequestProps, type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { PackagePlus, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AlmacenProductoProps } from './../../types/index.d';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Todos los Productos',
        href: '/productos',
    },
    {
        title: 'Disponibilidades',
        href: '/disponibles',
    },
    {
        title: 'Realizar Venta',
        href: '#',
    },
];

export default function PuntoVentaPage({
    productos: initialProductos,
    meta,
}: {
    productos: ProductoVenta[];
    meta: { total_productos: number; role_usuario: string; almacenes_usuario: any[] };
}) {
    // Estados principales
    const [productosSeleccionados, setProductosSeleccionados] = useState<ProductoVenta[]>([]);
    // const [almacenSeleccionado, setAlmacenSeleccionado] = useState<string>('');
    const [almacenSeleccionado, setAlmacenSeleccionado] = useState<AlmacenProductoProps[]>([]);
    const [pago, setPago] = useState<VentaRequestProps[]>([]);

    // Función para agregar producto al carrito
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

    // Calcular total dinámicamente
    const calcularTotal = () => {
        return productosSeleccionados.reduce((acc, p) => acc + p.cantidad * p.precio_venta, 0);
    };

    // Enviar la venta al backend
    const registrarVenta = async () => {
        if (!almacenSeleccionado || productosSeleccionados.length === 0 || !pago.monto) {
            alert('Faltan datos requeridos');
            return;
        }

        const ventaData = {
            almacen_id: almacenSeleccionado,
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
                    monto: parseFloat(pago.monto),
                },
            ],
        };

        try {
            const response = await axios.post('/ventas', ventaData);
            console.log('Venta registrada:', response.data);
            toast.success('Venta realizada con éxito');
            // Reiniciar estados
            setProductosSeleccionados([]);
            setPago({ tipo_pago: '', via_pago: '', tipo_moneda: 'PEN', monto: '' });
            setAlmacenSeleccionado('');
        } catch (error) {
            console.error('Error al registrar venta:', error.response?.data?.error || error.message);
            toast.error(`❌ Error: ${error.response?.data?.error || 'No se pudo completar la venta'}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Punto Venta" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <CursorProvider>
                        <CursorFollow>
                            <div className="bg-sidebar-accent rounded-lg px-2 py-1 text-sm text-white shadow-lg">Punto de Venta</div>
                        </CursorFollow>
                    </CursorProvider>
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento."
                    />
                    {/* Ícono semitransparente */}
                    <ShoppingBag
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />
                {/* Resumen */}
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                    <p>
                        Total de productos:{' '}
                        <span className="font-medium">
                            <Badge variant="secondary">{meta.total_productos}</Badge>
                        </span>
                    </p>
                    <p>
                        Rol actual:{' '}
                        <span className="text-primary font-sans font-medium">{meta.role_usuario === 'admin' ? 'Administrador' : 'Vendedor'}</span>
                    </p>
                </div>
                <Separator className="col-span-4" />
                {/* POS - Punto de Venta */}
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Columna 1: Productos Disponibles */}
                    {/* Tabla de productos */}
                    <Card>
                        <Table>
                            <TableCaption>Productos Disponibles</TableCaption>
                            <TableHeader>
                                <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Marca</TableHead>
                                    <TableHead>Stock Actual</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead className="text-center">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialProductos.length > 0 ? (
                                    initialProductos.map((producto) => (
                                        <TableRow key={producto.id}>
                                            <TableCell>{producto.nombre_producto}</TableCell>
                                            <TableCell>{producto.marca_producto}</TableCell>
                                            <Badge variant="outline">{producto.stock_total}</Badge>
                                            <TableCell>{producto.precio_venta ?? 'No definido'}</TableCell>
                                            <TableCell className="text-center">
                                                <Button variant="ghost" onClick={() => agregarProducto(producto)}>
                                                    <PackagePlus className="text-green-600" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center">
                                            No hay productos disponibles
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Card>

                    {/* Columna 2: Productos Seleccionados y Resumen de Venta */}
                    <div className="flex flex-col space-y-4">
                        {/* Productos seleccionados */}
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative flex-1 overflow-hidden rounded-xl border">
                            <div className="p-4">
                                <h3 className="mb-2 text-lg font-semibold">Productos Seleccionados</h3>
                                <div className="space-y-2">
                                    {productosSeleccionados.length > 0 ? (
                                        productosSeleccionados.map((producto, index) => (
                                            <div key={producto.id} className="rounded bg-gray-100 p-2 dark:bg-gray-700">
                                                <div className="mb-2 flex items-center justify-between">
                                                    <span className="font-medium">{producto.nombre_producto}</span>
                                                    <Badge variant="outline">{producto.marca_producto}</Badge>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-xs text-gray-500 dark:text-gray-400">Cantidad</label>
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
                                                            className="w-full rounded border border-gray-300 p-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-500 dark:text-gray-400">Precio</label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={producto.precio_venta}
                                                            onChange={(e) => {
                                                                const nuevoPrecio = parseFloat(e.target.value) || 0;
                                                                const nuevosProductos = [...productosSeleccionados];
                                                                nuevosProductos[index].precio_venta = nuevoPrecio;
                                                                setProductosSeleccionados(nuevosProductos);
                                                            }}
                                                            className="w-full rounded border border-gray-300 p-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-sm text-gray-500 dark:text-red-400">No hay productos seleccionados</p>
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

                                {/* Selección de almacén */}
                                <select
                                    value={almacenSeleccionado}
                                    onChange={(e) => setAlmacenSeleccionado(e.target.value)}
                                    className="mt-2 w-full rounded border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
                                >
                                    <option value="">Selecciona un almacén</option>
                                    {meta.almacenes_usuario.map((almacen) => (
                                        <option key={almacen.id} value={almacen.id}>
                                            {almacen.nombre}
                                        </option>
                                    ))}
                                </select>

                                {/* Datos de pago */}
                                <div className="mt-4 grid gap-2">
                                    <input
                                        type="text"
                                        placeholder="Tipo de pago"
                                        value={pago.tipo_pago}
                                        onChange={(e) => setPago({ ...pago, tipo_pago: e.target.value })}
                                        className="w-full rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Vía de pago"
                                        value={pago.via_pago}
                                        onChange={(e) => setPago({ ...pago, via_pago: e.target.value })}
                                        className="w-full rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Monto recibido"
                                        value={pago.monto}
                                        onChange={(e) => setPago({ ...pago, monto: e.target.value })}
                                        className="w-full rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-800"
                                    />
                                </div>

                                {/* Botón de proceder a pagar */}
                                <button
                                    onClick={registrarVenta}
                                    disabled={!almacenSeleccionado || productosSeleccionados.length === 0 || !pago.monto}
                                    className="mt-4 w-full rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-gray-400"
                                >
                                    Proceder a Pagar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
