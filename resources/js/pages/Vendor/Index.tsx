import HeadingSmall from '@/components/heading-small';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { Table, TableBody, TableCaption, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { BoxesIcon, Minus, PackagePlus, Plus, Search, ShoppingBag, ShoppingCart, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// Tipos para los datos
interface Almacen {
    id: number | string;
    nombre_almacen: string;
}

interface Cliente {
    id: number | string;
    nombre_cliente: string;
}

interface Cuenta {
    id: number | string;
    nombre_cuenta: string;
    tipo_moneda: string;
}

interface Producto {
    id: number | string;
    nombre_producto: string;
    marca_producto: string;
    categoria_nombre: string;
    precio_compra_producto: number;
    stock_total: number;
    precio_venta: number | null;
    tiene_precio: boolean;
}

interface ItemCarrito {
    id: string;
    producto: Producto;
    cantidad: number;
    precio_venta: number;
    subtotal: number;
}

// Nuevos tipos para pagos
interface Payment {
    id: string;
    method: 'transferencia' | 'efectivo';
    currency: string;
    amount: number;
    via?: string;
    exchangeRate?: number;
    amountInUsd: number;
    cuenta_id: string;
}

interface Currency {
    code: string;
    name: string;
    symbol: string;
    exchangeRate: number;
    availableFor: ('transferencia' | 'efectivo')[];
}

interface PaymentVia {
    id: string;
    name: string;
    method: 'transferencia' | 'efectivo';
}

// Rutas breadcrumb
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Productos',
        href: '/productos',
    },
    {
        title: 'Punto de Ventas',
        href: '#',
    },
];

// Monedas disponibles
const currencies: Currency[] = [
    { code: 'USD', name: 'Dólar Estadounidense', symbol: '$ USD', exchangeRate: 1, availableFor: ['transferencia', 'efectivo'] },
    { code: 'EUR', name: 'Euro', symbol: '€ EUR', exchangeRate: 1, availableFor: ['transferencia', 'efectivo'] },
    { code: 'MLC', name: 'Moneda Libre Convertible', symbol: '$ MLC', exchangeRate: 1.25, availableFor: ['transferencia'] },
    { code: 'CUP', name: 'Peso Cubano', symbol: '$ CUP', exchangeRate: 375, availableFor: ['transferencia', 'efectivo'] },
];

// Vías de pago disponibles
const paymentVias: PaymentVia[] = [
    { id: 'zelle', name: 'Zelle', method: 'transferencia' },
    { id: 'cashapp', name: 'CashApp', method: 'transferencia' },
    { id: 'visa', name: 'Visa', method: 'transferencia' },
    { id: 'mastercard', name: 'MasterCard', method: 'transferencia' },
    { id: 'stripe', name: 'Stripe', method: 'transferencia' },
    { id: 'paypal', name: 'Paypal', method: 'transferencia' },
    { id: 'qvapay', name: 'QvaPay', method: 'transferencia' },
    { id: 'enzona', name: 'EnZona', method: 'transferencia' },
    { id: 'transfermovil', name: 'Transfermóvil', method: 'transferencia' },
    { id: 'efectivo', name: 'Efectivo', method: 'efectivo' },
];

export default function PuntoVentaOficial({
    meta,
}: {
    meta: {
        role_usuario: string;
        almacenes_usuario: {
            id: string | number;
            nombre: string;
        }[];
    };
}) {
    // Estados
    const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [cuentas, setCuentas] = useState<Cuenta[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [almacenSeleccionado, setAlmacenSeleccionado] = useState<string>('');
    const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('');
    const [loadingAlmacenes, setLoadingAlmacenes] = useState<boolean>(false);
    const [loadingClientes, setLoadingClientes] = useState<boolean>(false);
    const [loadingProductos, setLoadingProductos] = useState<boolean>(false);
    const [busqueda, setBusqueda] = useState<string>('');
    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [procesandoVenta, setProcesandoVenta] = useState<boolean>(false);

    // Nuevos estados para pagos
    const [payments, setPayments] = useState<Payment[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [remaining, setRemaining] = useState(0);
    const [currentPayment, setCurrentPayment] = useState<{
        method: 'transferencia' | 'efectivo' | '';
        currency: string;
        via: string;
        amount: string;
        cuenta_id: string;
    }>({
        method: '',
        currency: '',
        via: '',
        amount: '',
        cuenta_id: '',
    });

    // Cargar almacenes
    const cargarAlmacenes = async () => {
        setLoadingAlmacenes(true);
        try {
            const response = await axios.get(route('ventas.getAlmacenes'));
            setAlmacenes(response.data);
        } catch (error) {
            console.error('Error al cargar almacenes:', error);
        } finally {
            setLoadingAlmacenes(false);
        }
    };

    // Cargar clientes
    const cargarClientes = async () => {
        setLoadingClientes(true);
        try {
            const response = await axios.get(route('ventas.getClientes'));
            setClientes(response.data);
        } catch (error) {
            console.error('Error al cargar clientes:', error);
        } finally {
            setLoadingClientes(false);
        }
    };

    // Cargar cuentas
    const cargarCuentas = async () => {
        try {
            const response = await axios.get(route('ventas.getCuentas'));
            setCuentas(response.data);
        } catch (error) {
            console.error('Error al cargar cuentas:', error);
        }
    };

    // Cargar productos cuando cambia el almacén
    const cargarProductos = async (almacenId: string) => {
        if (!almacenId) {
            setProductos([]);
            return;
        }

        setLoadingProductos(true);
        try {
            const response = await axios.get(route('ventas.getProductosPorAlmacen', almacenId));
            // Asegurarse de que los precios sean números válidos
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const productosProcesados = response.data.map((producto: any) => ({
                ...producto,
                precio_venta: producto.precio_venta ? Number(producto.precio_venta) : null,
                precio_compra_producto: producto.precio_compra_producto ? Number(producto.precio_compra_producto) : 0,
                stock_total: Number(producto.stock_total) || 0,
            }));
            setProductos(productosProcesados);
        } catch (error) {
            console.error('Error al cargar productos:', error);
            setProductos([]);
        } finally {
            setLoadingProductos(false);
        }
    };

    // Efecto para cargar datos iniciales
    useEffect(() => {
        cargarAlmacenes();
        cargarClientes();
        cargarCuentas();
    }, []);

    // Manejar cambio de almacén
    const handleAlmacenChange = (value: string) => {
        setAlmacenSeleccionado(value);
        cargarProductos(value);
        setBusqueda(''); // Limpiar búsqueda al cambiar de almacén
    };

    // Manejar cambio de cliente
    const handleClienteChange = (value: string) => {
        setClienteSeleccionado(value);
    };

    // Filtrar productos según búsqueda
    const productosFiltrados = useMemo(() => {
        if (!busqueda.trim()) return productos;

        const termino = busqueda.toLowerCase().trim();
        return productos.filter(
            (producto) =>
                (producto.nombre_producto?.toLowerCase().includes(termino) ||
                    producto.marca_producto?.toLowerCase().includes(termino) ||
                    producto.categoria_nombre?.toLowerCase().includes(termino)) ??
                false,
        );
    }, [productos, busqueda]);

    // Limpiar búsqueda
    const limpiarBusqueda = () => {
        setBusqueda('');
    };

    // Agregar producto al carrito
    const agregarAlCarrito = (producto: Producto) => {
        const idItem = `${producto.id}`;

        // Verificar si el producto ya está en el carrito
        const itemExistente = carrito.find((item) => item.id === idItem);

        if (itemExistente) {
            // Si ya existe, aumentar la cantidad (verificar stock)
            const nuevaCantidad = Math.min(itemExistente.cantidad + 1, producto.stock_total);
            setCarrito(
                carrito.map((item) =>
                    item.id === idItem
                        ? {
                              ...item,
                              cantidad: nuevaCantidad,
                              subtotal: nuevaCantidad * item.precio_venta,
                          }
                        : item,
                ),
            );
        } else {
            // Si no existe, agregar nuevo item
            const precioVenta = producto.precio_venta && producto.precio_venta > 0 ? producto.precio_venta : 0;

            const nuevoItem: ItemCarrito = {
                id: idItem,
                producto: producto,
                cantidad: 1,
                precio_venta: precioVenta,
                subtotal: precioVenta,
            };
            setCarrito([...carrito, nuevoItem]);
        }
    };

    // Actualizar cantidad de un item
    const actualizarCantidad = (id: string, nuevaCantidad: number) => {
        if (nuevaCantidad < 1) return;

        const item = carrito.find((item) => item.id === id);
        if (!item) return;

        if (nuevaCantidad > item.producto.stock_total) {
            nuevaCantidad = item.producto.stock_total;
        }

        setCarrito(
            carrito.map((itemCarrito) =>
                itemCarrito.id === id
                    ? {
                          ...itemCarrito,
                          cantidad: nuevaCantidad,
                          subtotal: nuevaCantidad * itemCarrito.precio_venta,
                      }
                    : itemCarrito,
            ),
        );
    };

    // Actualizar precio de venta
    const actualizarPrecio = (id: string, nuevoPrecio: number) => {
        if (nuevoPrecio < 0) return;

        setCarrito(
            carrito.map((item) =>
                item.id === id
                    ? {
                          ...item,
                          precio_venta: nuevoPrecio,
                          subtotal: item.cantidad * nuevoPrecio,
                      }
                    : item,
            ),
        );
    };

    // Quitar producto del carrito
    const quitarDelCarrito = (id: string) => {
        setCarrito(carrito.filter((item) => item.id !== id));
    };

    // Calcular totales
    const calcularTotal = useMemo(() => {
        return carrito.reduce((total, item) => {
            const subtotal = item.cantidad * item.precio_venta;
            return total + (isNaN(subtotal) ? 0 : subtotal);
        }, 0);
    }, [carrito]);

    // Incrementar cantidad
    const incrementarCantidad = (id: string) => {
        const item = carrito.find((item) => item.id === id);
        if (item && item.cantidad < item.producto.stock_total) {
            actualizarCantidad(id, item.cantidad + 1);
        }
    };

    // Decrementar cantidad
    const decrementarCantidad = (id: string) => {
        const item = carrito.find((item) => item.id === id);
        if (item && item.cantidad > 1) {
            actualizarCantidad(id, item.cantidad - 1);
        }
    };

    // =================================================
    // Funciones para el procesamiento de pagos
    // =================================================

    // Efecto para actualizar el restante cuando cambia el total
    useEffect(() => {
        setRemaining(calcularTotal);
    }, [calcularTotal]);

    // Filtros para opciones disponibles
    const availableVias = paymentVias.filter((via) => (currentPayment.method ? via.method === currentPayment.method : true));

    const availableCurrencies = currencies.filter((currency) =>
        currentPayment.method ? currency.availableFor.includes(currentPayment.method) : true,
    );

    // Filtrar cuentas por moneda seleccionada
    const availableAccounts = useMemo(() => {
        if (!currentPayment.currency) return cuentas;
        return cuentas.filter((account) => account.tipo_moneda === currentPayment.currency);
    }, [cuentas, currentPayment.currency]);

    // Calcular el total pagado en USD
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amountInUsd, 0);
    const remainingInUsd = calcularTotal - totalPaid;

    const handleAddPayment = () => {
        if (
            !currentPayment.method ||
            !currentPayment.currency ||
            (currentPayment.method === 'transferencia' && !currentPayment.via) ||
            !currentPayment.amount ||
            parseFloat(currentPayment.amount) <= 0
        ) {
            return;
        }

        const selectedCurrency = currencies.find((c) => c.code === currentPayment.currency);
        const amount = parseFloat(currentPayment.amount);
        const amountInUsd = amount / (selectedCurrency?.exchangeRate || 1);

        const newPayment: Payment = {
            id: crypto.randomUUID(),
            method: currentPayment.method,
            currency: currentPayment.currency,
            amount: amount,
            via: currentPayment.method === 'transferencia' ? currentPayment.via : undefined,
            exchangeRate: selectedCurrency?.exchangeRate,
            amountInUsd: amountInUsd,
            cuenta_id: currentPayment.cuenta_id,
        };

        setPayments([...payments, newPayment]);
        setCurrentPayment({
            method: '',
            currency: '',
            via: '',
            amount: '',
            cuenta_id: '',
        });
    };

    const handleRemovePayment = (id: string) => {
        setPayments(payments.filter((payment) => payment.id !== id));
    };

    const handleCompleteSale = async () => {
        // Preparar datos de la venta
        const datosVenta = {
            almacen_id: almacenSeleccionado,
            cliente_id: clienteSeleccionado,
            items: carrito.map((item) => ({
                producto_id: item.producto.id,
                cantidad: item.cantidad,
                precio_venta: item.precio_venta,
                subtotal: item.subtotal,
            })),
            total: calcularTotal,
            pagos: payments.map((p) => ({
                metodo: p.method,
                moneda: p.currency,
                monto: p.amount,
                via: p.via,
                tasa_cambio: p.exchangeRate,
                monto_usd: p.amountInUsd,
                cuenta_id: p.cuenta_id,
            })),
            resultado_json: {
                venta: {
                    almacen_id: almacenSeleccionado,
                    cliente_id: clienteSeleccionado,
                    items: carrito.map((item) => ({
                        producto_id: item.producto.id,
                        nombre: item.producto.nombre_producto,
                        cantidad: item.cantidad,
                        precio: item.precio_venta,
                        subtotal: item.subtotal,
                    })),
                    total: calcularTotal,
                    pagos: payments.map((p) => ({
                        metodo: p.method,
                        moneda: p.currency,
                        monto: p.amount,
                        via: p.via,
                        tasa_cambio: p.exchangeRate,
                        monto_usd: p.amountInUsd,
                        cuenta_id: p.cuenta_id,
                    })),
                    total_pagado: payments.reduce((sum, p) => sum + p.amountInUsd, 0),
                    restante: remainingInUsd,
                },
                metadata: {
                    timestamp: new Date().toISOString(),
                    usuario: {
                        id: meta.role_usuario === 'admin' ? 'admin' : 'vendedor',
                        nombre: 'Usuario Actual',
                    },
                },
            },
        };

        try {
            // Procesar al backend -> Controlador
            const response = await axios.post(route('ventas.procesar'), datosVenta);

            if (response.data.success) {
                // Mostrar el JSON en consola
                console.log('Resultado JSON de la venta:', response.data.data);
                toast.success('Venta procesada correctamente.');

                // Resetear estados después de completar
                setPayments([]);
                setCarrito([]);
                setAlmacenSeleccionado('');
                setClienteSeleccionado('');
            } else {
                toast.error('Error al procesar la venta: ' + response.data.error);
            }
        } catch (error) {
            console.error('Error al procesar venta:', error);
            toast.error('Error al procesar la venta');
        } finally {
            setProcesandoVenta(false);
        }
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCurrentPayment({ ...currentPayment, amount: value });
    };

    const convertToUsd = (amount: number, currencyCode: string) => {
        const currency = currencies.find((c) => c.code === currencyCode);
        return (amount / (currency?.exchangeRate || 1)).toFixed(2);
    };

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
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-20] transform animate-pulse opacity-40"
                    />
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <p>
                        Rol Actual del Vendedor:{' '}
                        <span className="text-primary font-medium">{meta.role_usuario === 'admin' ? 'Administrador' : 'Vendedor'}</span>
                    </p>
                </div>
                <Separator className="bg-sidebar-accent" />

                {/* Punto de venta */}
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Columna 1: Select almacenes, clientes, mostrar productos */}
                    <div className="space-y-4">
                        <Card className="border-sidebar-accent @container/card">
                            <CardHeader className="relative">
                                <CardTitle className="text-sidebar-accent">
                                    <div className="text-sidebar-accent flex items-center gap-2">
                                        <ShoppingBag className="shrink-0" />
                                        Iniciar Venta
                                    </div>
                                </CardTitle>
                                <CardDescription>
                                    Origenes y Recepción del Producto.
                                    <span className="text-sidebar-accent animate-pulse"> Seleccione Primero *</span>
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Seleccionar Almacén */}
                                    <div>
                                        <Select value={almacenSeleccionado} onValueChange={handleAlmacenChange} disabled={loadingAlmacenes}>
                                            <SelectTrigger className="border-sidebar-accent w-full dark:border-white">
                                                <SelectValue placeholder="Seleccionar Almacén" />
                                            </SelectTrigger>
                                            <SelectContent className="border-sidebar-accent">
                                                {almacenes.map((almacen) => (
                                                    <SelectItem key={almacen.id} value={almacen.id.toString()}>
                                                        {almacen.nombre_almacen}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {loadingAlmacenes && <p className="mt-1 text-xs text-gray-500">Cargando almacenes...</p>}
                                    </div>
                                    {/* Seleccionar Cliente */}
                                    <div>
                                        <Select value={clienteSeleccionado} onValueChange={handleClienteChange} disabled={loadingClientes}>
                                            <SelectTrigger className="border-sidebar-accent w-full dark:border-white">
                                                <SelectValue placeholder="Seleccionar cliente" />
                                            </SelectTrigger>
                                            <SelectContent className="border-sidebar-accent">
                                                {clientes.map((cliente) => (
                                                    <SelectItem key={cliente.id} value={cliente.id.toString()}>
                                                        {cliente.nombre_cliente}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {loadingClientes && <p className="mt-1 text-xs text-gray-500">Cargando clientes...</p>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Separator />

                        {/* Tabla para Mostrar los Productos */}
                        <Card className="border-sidebar-accent @container/card">
                            <CardHeader className="relative">
                                <CardTitle>
                                    <div className="text-sidebar-accent flex items-center gap-2">
                                        <BoxesIcon className="shrink-0" />
                                        Productos Disponibles
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Barra de búsqueda */}
                                {almacenSeleccionado && (
                                    <div className="border-b p-4">
                                        <div className="relative max-w-md">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <Search className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                className="border-sidebar-accent block w-full rounded-md border py-2 pr-10 pl-10 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                                                placeholder="Buscar productos..."
                                                value={busqueda}
                                                onChange={(e) => setBusqueda(e.target.value)}
                                            />
                                            {busqueda && (
                                                <button
                                                    type="button"
                                                    onClick={limpiarBusqueda}
                                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                        {busqueda && productos.length > 0 && (
                                            <p className="mt-1 text-xs text-gray-500">
                                                {productosFiltrados.length} de {productos.length} productos encontrados
                                            </p>
                                        )}
                                    </div>
                                )}

                                {loadingProductos ? (
                                    <div className="p-8 text-center">
                                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
                                        <p className="mt-2 text-gray-500">Cargando productos...</p>
                                    </div>
                                ) : almacenSeleccionado ? (
                                    productosFiltrados && productosFiltrados.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <Table className="rounded-t-lg">
                                                <TableCaption>Productos disponibles en el almacén seleccionado</TableCaption>
                                                <TableHeader className="rounded-t-lg border-1 border-t-white">
                                                    <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent transition-colors">
                                                        <TableHead className="text-white uppercase">Producto</TableHead>
                                                        <TableHead className="text-center text-white uppercase">Stock</TableHead>
                                                        <TableHead className="text-center text-white uppercase">Precio</TableHead>
                                                        <TableHead className="text-center text-white uppercase">Acción</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody className="rounded-b-md border-1 border-solid border-b-white">
                                                    {productosFiltrados.map((producto) => (
                                                        <tr key={producto.id} className="hover:bg-sidebar cursor-pointer">
                                                            <td className="px-4 py-3">
                                                                <div>
                                                                    <div className="text-sidebar-accent text-sm font-medium">
                                                                        {producto.nombre_producto}
                                                                    </div>
                                                                    <div className="text-sm text-gray-500">
                                                                        {producto.marca_producto || 'Sin marca'} -{' '}
                                                                        {producto.categoria_nombre || 'Sin categoría'}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500">
                                                                <span
                                                                    className={`inline-flex rounded-full px-2 text-xs leading-5 font-semibold ${
                                                                        producto.stock_total > 5
                                                                            ? 'bg-green-100 text-green-800'
                                                                            : producto.stock_total > 0
                                                                              ? 'bg-yellow-100 text-yellow-800'
                                                                              : 'bg-red-100 text-red-800'
                                                                    }`}
                                                                >
                                                                    {producto.stock_total}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm whitespace-nowrap text-emerald-600">
                                                                {producto.precio_venta && producto.precio_venta > 0 ? (
                                                                    `$ ${producto.precio_venta.toFixed(2)}`
                                                                ) : (
                                                                    <span className="text-red-500">Sin precio</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-sm whitespace-nowrap">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => agregarAlCarrito(producto)}
                                                                            className="flex cursor-pointer items-center gap-1 rounded bg-blue-500 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                                                                            disabled={
                                                                                !producto.tiene_precio ||
                                                                                producto.stock_total <= 0 ||
                                                                                !producto.precio_venta ||
                                                                                producto.precio_venta <= 0
                                                                            }
                                                                        >
                                                                            <PackagePlus size={22} className="h-3 w-3" />
                                                                            Vender
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="text-white">
                                                                        <p>Agregar al Pedido</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center">
                                            <p className="text-gray-500">
                                                {busqueda && productos.length > 0
                                                    ? 'No se encontraron productos que coincidan con la búsqueda'
                                                    : productos.length === 0 && !loadingProductos
                                                      ? 'No hay productos disponibles en este almacén'
                                                      : 'No hay productos para mostrar'}
                                            </p>
                                            {busqueda && productos.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={limpiarBusqueda}
                                                    className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                                                >
                                                    Limpiar búsqueda
                                                </button>
                                            )}
                                        </div>
                                    )
                                ) : (
                                    <div className="p-8 text-center">
                                        <p className="text-gray-500">Seleccione un almacén para ver los productos</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Columna 2: Carrito de Compras */}
                    <div>
                        <div className="flex h-full flex-col rounded-lg border">
                            <div className="bg-sidebar-accent flex items-center justify-between rounded-t-lg border-1 border-solid px-4 py-3 dark:border-zinc-300">
                                <div>
                                    <div className="flex items-center gap-2 text-white">
                                        <ShoppingCart className="shrink-0" />
                                        <h3 className="font-medium text-white uppercase">Carrito de Compras</h3>
                                    </div>
                                </div>
                                {carrito.length > 0 && (
                                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-red-800">
                                        {carrito.length} producto(s) seleccionado
                                    </span>
                                )}
                            </div>

                            <div className="max-h-96 flex-1 overflow-y-auto">
                                {carrito.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <p className="text-red-500">Carrito vacío</p>
                                        <p className="mt-2 text-sm text-gray-400">Agregue productos del almacén seleccionado</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-200">
                                        {carrito.map((item) => (
                                            <div
                                                key={item.id}
                                                className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all hover:shadow dark:border-gray-700 dark:bg-gray-800"
                                            >
                                                <div className="mb-2 flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <h4 className="text-sidebar-accent text-sm font-medium">{item.producto.nombre_producto}</h4>
                                                        <p className="text-xs text-gray-500">{item.producto.marca_producto || 'Sin marca'}</p>
                                                    </div>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                onClick={() => quitarDelCarrito(item.id)}
                                                                className="ml-2 cursor-pointer text-red-400 hover:bg-red-900 hover:text-white"
                                                            >
                                                                <Trash2 size={16} className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent className="text-white">
                                                            <p>Quitar de la lista</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>

                                                <div className="mt-2 flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => decrementarCantidad(item.id)}
                                                            className="border-sidebar-accent bg-sidebar hover:bg-sidebar-accent cursor-pointer rounded-md border p-1 text-white"
                                                            disabled={item.cantidad <= 1}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </button>

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Badge variant="secondary" className="text-xs">
                                                                    <span className="w-8 cursor-help text-center text-sm font-medium text-amber-500">
                                                                        {item.cantidad}
                                                                    </span>
                                                                </Badge>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="text-white">
                                                                <p>Cantidad de Productos</p>
                                                            </TooltipContent>
                                                        </Tooltip>

                                                        <button
                                                            type="button"
                                                            onClick={() => incrementarCantidad(item.id)}
                                                            className="border-sidebar-accent bg-sidebar hover:bg-sidebar-accent cursor-pointer rounded-md border p-1 text-white"
                                                            disabled={item.cantidad >= item.producto.stock_total}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </button>

                                                        <span className="ml-1 text-xs text-gray-500">(max {item.producto.stock_total})</span>
                                                    </div>

                                                    <div className="text-right">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Input
                                                                    type="number"
                                                                    value={item.precio_venta || ''}
                                                                    onChange={(e) => {
                                                                        const value = parseFloat(e.target.value);
                                                                        if (!isNaN(value)) {
                                                                            actualizarPrecio(item.id, value);
                                                                        }
                                                                    }}
                                                                    className="border-sidebar-accent w-20 rounded border px-2 py-1 text-left text-sm text-emerald-600 hover:border-emerald-300"
                                                                    placeholder="$ 0.00"
                                                                />
                                                            </TooltipTrigger>
                                                            <TooltipContent className="text-white">
                                                                <p>Editar Precio de Venta</p>
                                                            </TooltipContent>
                                                        </Tooltip>

                                                        <p className="mt-1 text-sm font-medium text-emerald-700">
                                                            $ {(isNaN(item.subtotal) ? 0 : item.subtotal).toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Resumen del carrito */}
                            {carrito.length > 0 && (
                                <div className="rounded-b-lg border-1 border-t border-solid border-gray-200 bg-gray-50 p-4">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Total:</span>
                                        <span className="text-lg font-bold text-emerald-700">$ {calcularTotal.toFixed(2)}</span>
                                    </div>

                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <button
                                                type="button"
                                                disabled={procesandoVenta}
                                                className="flex w-full cursor-pointer items-center justify-center rounded-md bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {procesandoVenta ? (
                                                    <>
                                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                                                        Procesando...
                                                    </>
                                                ) : (
                                                    'Procesar Venta'
                                                )}
                                            </button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="max-w-3xl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle className="text-sidebar-accent text-center">Proceso de Venta</AlertDialogTitle>
                                                <AlertDialogDescription className="animate-pulse">
                                                    Métodos y procesamiento de la compra de artículos por parte del Cliente
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>

                                            <div className="mb-4 flex items-center justify-between">
                                                <span className="text-sidebar-accent text-sm font-medium">Total a Pagar el Cliente:</span>
                                                <span className="text-lg font-bold text-emerald-600">$ {calcularTotal.toFixed(2)} USD</span>
                                            </div>

                                            <div className="space-y-6">
                                                {/* Pagos agregados */}
                                                {payments.length > 0 && (
                                                    <div className="border-primary rounded-lg border p-4">
                                                        <h3 className="mb-2 text-center font-medium">Operaciones Realizadas</h3>
                                                        <ul className="space-y-2">
                                                            {payments.map((payment) => (
                                                                <li key={payment.id} className="flex items-center justify-between border-b py-1">
                                                                    <div>
                                                                        <span className="font-medium">
                                                                            {payment.method === 'transferencia'
                                                                                ? `Transferencia (${payment.via})`
                                                                                : 'Efectivo'}{' '}
                                                                            - {payment.amount.toFixed(2)} {payment.currency}
                                                                        </span>
                                                                        <div className="text-sm text-gray-500">
                                                                            = ${payment.amountInUsd.toFixed(2)} USD
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleRemovePayment(payment.id)}
                                                                        className="hover:bg-destructive cursor-pointer text-red-500 hover:text-white"
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Formulario para agregar nuevo pago */}
                                                <div className="space-y-4">
                                                    <h3 className="text-center font-medium">Realizar Operación</h3>
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                        {/* Método de pago */}
                                                        <div className="space-y-2">
                                                            <Label>Método de pago</Label>
                                                            <Select
                                                                value={currentPayment.method}
                                                                onValueChange={(value: 'transferencia' | 'efectivo' | '') =>
                                                                    setCurrentPayment({ ...currentPayment, method: value })
                                                                }
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Seleccione Método" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="transferencia">Transferencia</SelectItem>
                                                                    <SelectItem value="efectivo">Efectivo</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        {/* Moneda */}
                                                        <div className="space-y-2">
                                                            <Label>Moneda</Label>
                                                            <Select
                                                                value={currentPayment.currency}
                                                                onValueChange={(value) => setCurrentPayment({ ...currentPayment, currency: value })}
                                                                disabled={!currentPayment.method}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Seleccione moneda" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {availableCurrencies.map((currency) => (
                                                                        <SelectItem key={currency.code} value={currency.code}>
                                                                            {currency.name} ({currency.symbol})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        {/* Cuenta Asignada */}
                                                        <div className="space-y-2">
                                                            <Label>Cuenta Asignada</Label>
                                                            <Select
                                                                value={currentPayment.cuenta_id}
                                                                onValueChange={(value) => setCurrentPayment({ ...currentPayment, cuenta_id: value })}
                                                                disabled={!currentPayment.currency}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Seleccione cuenta" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {availableAccounts.map((account) => (
                                                                        <SelectItem key={account.id} value={account.id.toString()}>
                                                                            {account.nombre_cuenta} ({account.tipo_moneda})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        {/* Vía de pago (solo para transferencia) */}
                                                        {currentPayment.method === 'transferencia' && (
                                                            <div className="space-y-2">
                                                                <Label>Vía de pago</Label>
                                                                <Select
                                                                    value={currentPayment.via}
                                                                    onValueChange={(value) => setCurrentPayment({ ...currentPayment, via: value })}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Seleccione vía" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {availableVias.map((via) => (
                                                                            <SelectItem key={via.id} value={via.id}>
                                                                                {via.name}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Monto y botón agregar */}
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                                        <div className="space-y-2 md:col-span-3">
                                                            <Label>Monto Declarado</Label>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={currentPayment.amount}
                                                                onChange={handleAmountChange}
                                                                placeholder="Ingrese el monto"
                                                            />
                                                        </div>
                                                        <div className="flex items-end">
                                                            <Button
                                                                onClick={handleAddPayment}
                                                                disabled={
                                                                    !currentPayment.method ||
                                                                    !currentPayment.currency ||
                                                                    (currentPayment.method === 'transferencia' && !currentPayment.via) ||
                                                                    !currentPayment.amount ||
                                                                    parseFloat(currentPayment.amount) <= 0 ||
                                                                    !currentPayment.cuenta_id
                                                                }
                                                                className="w-full"
                                                            >
                                                                Agregar
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* Conversión a USD */}
                                                    {currentPayment.amount && currentPayment.currency && (
                                                        <div className="text-sm text-gray-500">
                                                            {parseFloat(currentPayment.amount).toFixed(2)} {currentPayment.currency} ={' '}
                                                            {convertToUsd(parseFloat(currentPayment.amount), currentPayment.currency)} USD
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Resumen de tasas de cambio */}
                                                <div className="mt-4 border-t pt-4">
                                                    <h4 className="mb-2 text-center text-sm font-medium">Tasas de Cambio:</h4>
                                                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                                        <Badge variant="outline" className="justify-center bg-emerald-400 text-emerald-800">
                                                            1 USD = 1.00 USD
                                                        </Badge>
                                                        <Badge variant="outline" className="justify-center bg-amber-300 text-amber-800">
                                                            1 EUR = 1.00 USD
                                                        </Badge>
                                                        <Badge variant="outline" className="justify-center bg-indigo-300 text-indigo-800">
                                                            1 MLC = 0.80 USD
                                                        </Badge>
                                                        <Badge variant="outline" className="justify-center bg-lime-300 text-lime-800">
                                                            375 CUP = 1.00 USD
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-4 flex items-center justify-between">
                                                <span className="text-sidebar-accent text-sm font-medium">Monto Restante:</span>
                                                <span className="text-lg font-bold text-emerald-600">
                                                    ${remainingInUsd > 0 ? remainingInUsd.toFixed(2) : '0.00'} USD
                                                </span>
                                            </div>

                                            <AlertDialogFooter>
                                                <Button
                                                    className="flex w-full cursor-pointer items-center justify-center rounded-md bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                    onClick={handleCompleteSale}
                                                    disabled={remainingInUsd > 0 || payments.length === 0}
                                                >
                                                    Realizar la Venta
                                                </Button>
                                                <AlertDialogCancel className="bg-destructive-foreground hover:bg-destructive cursor-pointer text-white">
                                                    Cancelar
                                                </AlertDialogCancel>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <p className="mt-2 text-center text-xs text-gray-500">Se enviarán {carrito.length} productos para procesar</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <Toaster position="top-center" />
            </div>
        </AppLayout>
    );
}
