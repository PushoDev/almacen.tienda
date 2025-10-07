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
import { Head, router } from '@inertiajs/react'; // Importar router
import axios from 'axios';
import { BoxesIcon, Minus, PackagePlus, Plus, Search, ShoppingBag, ShoppingCart, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// Tipos para los datos (Usando los tipos de tu archivo)
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

interface Payment {
    id: string;
    method: 'transferencia' | 'efectivo';
    currency: string;
    amount: number;
    via?: string;
    exchangeRate: number;
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
        tasa_usd: number;
        tasa_mlc: number;
    };
}) {
    // Estados
    const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [tasaUSD, setTasaUSD] = useState<number>(meta.tasa_usd); // CUP por 1 USD (ej: 320)
    const [tasaMLC, setTasaMLC] = useState<number>(meta.tasa_mlc); // USD por 1 MLC (ej: 0.8)
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

    // Definición de monedas usando useMemo
    const currencies: Currency[] = useMemo(
        () => [
            {
                code: 'USD',
                name: 'Dólar Estadounidense',
                symbol: '$ USD',
                exchangeRate: 1, // Tasa de USD por 1 USD (1)
                availableFor: ['transferencia', 'efectivo'],
            },
            {
                code: 'EUR',
                name: 'Euro',
                symbol: '€ EUR',
                exchangeRate: 1.07, // Asumir 1 EUR = 1.07 USD (la tasa real debería venir del backend/meta si es crucial)
                availableFor: ['transferencia', 'efectivo'],
            },
            {
                code: 'MLC',
                name: 'Moneda Libre Convertible',
                symbol: '$ MLC',
                exchangeRate: tasaMLC, // Tasa de USD por 1 MLC
                availableFor: ['transferencia'],
            },
            {
                code: 'CUP',
                name: 'Peso Cubano',
                symbol: '$ CUP',
                exchangeRate: tasaUSD, // Tasa de CUP por 1 USD
                availableFor: ['transferencia', 'efectivo'],
            },
        ],
        [tasaUSD, tasaMLC],
    );

    // Nuevos estados para pagos
    const [payments, setPayments] = useState<Payment[]>([]);
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

    // --- Lógica de Conversión Corregida (CRÍTICO) ---
    /**
     * Calcula el monto en USD a partir de un monto en moneda local y su tasa de cambio.
     * @param amount Monto en moneda local.
     * @param currencyCode Código de la moneda.
     */
    const convertToUsd = (amount: number, currencyCode: string) => {
        const currency = currencies.find((c) => c.code === currencyCode);
        const exchangeRate = currency?.exchangeRate || 1;
        let amountInUsd = 0;

        if (exchangeRate === 0 || !exchangeRate) {
            console.error(`Tasa de cambio no válida (${exchangeRate}) para ${currencyCode}`);
            return '0.00';
        }

        if (currencyCode === 'CUP') {
            // CUP: Monto Local / (CUP por 1 USD) -> División
            amountInUsd = amount / exchangeRate;
        } else if (currencyCode === 'MLC' || currencyCode === 'EUR') {
            // MLC/EUR: Monto Local * (USD por 1 MLC/EUR) -> Multiplicación
            amountInUsd = amount * exchangeRate;
        } else {
            // USD: Monto Local * 1 -> Monto mismo
            amountInUsd = amount;
        }

        return amountInUsd.toFixed(2);
    };

    // --- Lógica de Carga de Datos (Tu código original) ---

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
        setBusqueda('');
        setCarrito([]); // Limpiar carrito al cambiar de almacén
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

    // --- Lógica del Carrito (Tu código original con ajustes) ---

    // Agregar producto al carrito
    const agregarAlCarrito = (producto: Producto) => {
        const idItem = `${producto.id}`;

        const precioVenta = producto.precio_venta && producto.precio_venta > 0 ? producto.precio_venta : 0;
        if (precioVenta <= 0) {
            toast.warning('Imposible añadir', { description: 'Producto sin precio de venta.' });
            return;
        }
        if (producto.stock_total <= 0) {
            toast.warning('Imposible añadir', { description: 'Producto sin stock.' });
            return;
        }

        const itemExistente = carrito.find((item) => item.id === idItem);

        if (itemExistente) {
            const nuevaCantidad = Math.min(itemExistente.cantidad + 1, itemExistente.producto.stock_total);
            if (nuevaCantidad === itemExistente.cantidad) {
                toast.warning('Límite de Stock', { description: `Solo quedan ${producto.stock_total} unidades.` });
                return;
            }

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
        if (nuevaCantidad < 1) {
            quitarDelCarrito(id); // Quitar si la cantidad baja de 1
            return;
        }

        const item = carrito.find((item) => item.id === id);
        if (!item) return;

        // Limitar por stock
        const stockMax = item.producto.stock_total;
        if (nuevaCantidad > stockMax) {
            nuevaCantidad = stockMax;
            toast.warning('Límite de Stock', { description: `Solo quedan ${stockMax} unidades.` });
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
        if (item) {
            actualizarCantidad(id, item.cantidad - 1);
        }
    };

    // --- Lógica de Pagos (Tu código original con ajustes) ---

    // Calcular el total pagado en USD
    const totalPaid = useMemo(() => payments.reduce((sum, payment) => sum + payment.amountInUsd, 0), [payments]);
    const remainingInUsd = calcularTotal - totalPaid;

    // Filtros para opciones disponibles
    const availableVias = paymentVias.filter((via) =>
        currentPayment.method ? via.method === currentPayment.method : true,
    );

    const availableCurrencies = currencies.filter((currency) =>
        currentPayment.method ? currency.availableFor.includes(currentPayment.method) : true,
    );

    // Filtrar cuentas por moneda seleccionada
    const availableAccounts = useMemo(() => {
        if (!currentPayment.currency) return cuentas;
        return cuentas.filter((account) => account.tipo_moneda === currentPayment.currency);
    }, [cuentas, currentPayment.currency]);

    const handleAddPayment = () => {
        if (
            !currentPayment.method ||
            !currentPayment.currency ||
            (currentPayment.method === 'transferencia' && !currentPayment.via) ||
            !currentPayment.amount ||
            parseFloat(currentPayment.amount) <= 0 ||
            !currentPayment.cuenta_id
        ) {
            toast.warning('Por favor, complete todos los campos del pago y asegure un monto válido.');
            return;
        }

        const amount = parseFloat(currentPayment.amount);
        const selectedCurrency = currencies.find((c) => c.code === currentPayment.currency);

        if (!selectedCurrency) {
            toast.error('Moneda de pago no encontrada.');
            return;
        }

        const exchangeRate = selectedCurrency.exchangeRate;

        // Uso de la función convertToUsd corregida
        const amountInUsd = parseFloat(convertToUsd(amount, selectedCurrency.code));

        if (amountInUsd === 0 || isNaN(amountInUsd)) {
            toast.error('El monto en USD no puede ser cero o no es válido. Revise la tasa de cambio.');
            return;
        }
        
        // Opcional: limitar el monto del pago al restante
        // if (amountInUsd > remainingInUsd && remainingInUsd > 0.01) {
        //     toast.warning('Monto Excedido', { description: `El monto máximo restante a pagar es $${remainingInUsd.toFixed(2)} USD.` });
        //     // return;
        // }

        const newPayment: Payment = {
            id: crypto.randomUUID(),
            method: currentPayment.method,
            currency: currentPayment.currency,
            amount: amount,
            via: currentPayment.method === 'transferencia' ? currentPayment.via : undefined,
            exchangeRate: exchangeRate,
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
        // Validación final de que el total esté cubierto
        if (remainingInUsd > 0.01) {
            toast.error('Pago Pendiente', { description: `Aún quedan $${remainingInUsd.toFixed(2)} USD por pagar.` });
            return;
        }

        // Validación de que exista al menos un pago
        if (payments.length === 0) {
            toast.error('Debe agregar al menos un método de pago para completar la venta.');
            return;
        }
        
        // Validación de almacén
        if (!almacenSeleccionado) {
            toast.error('Venta Incompleta', { description: 'Debe seleccionar un almacén para la venta.' });
            return;
        }

        // Preparar datos de la venta con tasas temporales
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
            // Agregar las tasas temporales (las que se guardarán en la venta y se usarán para saldos)
            tasas_temporales: {
                tasa_usd: tasaUSD,
                tasa_mlc: tasaMLC,
            },
        };

        try {
            setProcesandoVenta(true);

            // Procesar al backend -> Controlador
            const response = await axios.post(route('ventas.procesar'), datosVenta);

            if (response.data.success) {
                toast.success('¡Venta Exitosa!', { description: response.data.message });
                // Limpiar estados después de la venta exitosa
                setCarrito([]);
                setPayments([]);
                setAlmacenSeleccionado('');
                setClienteSeleccionado('');
                // Redirigir a la vista de detalle (donde se puede anular)
                router.visit(response.data.redirect);
            } else {
                // Manejo de errores de backend como "Stock insuficiente"
                toast.error('Error al procesar la venta: ' + response.data.error);
            }
        } catch (error: any) {
            console.error('Error al procesar venta:', error);
            setProcesandoVenta(false);
            if (error.response?.data?.error) {
                toast.error('Error al procesar la venta: ' + error.response.data.error);
            } else if (error.response?.data?.message) {
                 toast.error('Error al procesar la venta: ' + error.response.data.message);
            } else {
                toast.error('Error de red al procesar la venta');
            }
        } finally {
            setProcesandoVenta(false);
        }
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCurrentPayment({ ...currentPayment, amount: value });
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
                <div className="grid gap-4 lg:grid-cols-3">
                    {/* Columna 1: Select almacenes, clientes, mostrar productos */}
                    <div className="lg:col-span-2 space-y-4">
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
                                        <Label>Almacén</Label>
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
                                    </div>
                                    {/* Seleccionar Cliente */}
                                    <div>
                                        <Label>Cliente</Label>
                                        <Select value={clienteSeleccionado} onValueChange={handleClienteChange} disabled={loadingClientes}>
                                            <SelectTrigger className="border-sidebar-accent w-full dark:border-white">
                                                <SelectValue placeholder="Seleccionar cliente (Opcional)" />
                                            </SelectTrigger>
                                            <SelectContent className="border-sidebar-accent">
                                                {clientes.map((cliente) => (
                                                    <SelectItem key={cliente.id} value={cliente.id.toString()}>
                                                        {cliente.nombre_cliente}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Separator />

                        {/* Productos Disponibles: GALERÍA DE TARJETAS */}
                        <Card className="border-sidebar-accent @container/card">
                            <CardHeader className="relative flex-row items-center justify-between">
                                <CardTitle>
                                    <div className="text-sidebar-accent flex items-center gap-2">
                                        <BoxesIcon className="shrink-0" />
                                        Productos Disponibles
                                    </div>
                                </CardTitle>
                                {/* Barra de búsqueda integrada en el header */}
                                {almacenSeleccionado && (
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
                                )}
                            </CardHeader>
                            <CardContent>
                                {loadingProductos ? (
                                    <div className="p-8 text-center">
                                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
                                        <p className="mt-2 text-gray-500">Cargando productos...</p>
                                    </div>
                                ) : !almacenSeleccionado ? (
                                    <div className="p-8 text-center">
                                        <p className="text-gray-500">Seleccione un almacén para ver los productos</p>
                                    </div>
                                ) : productosFiltrados && productosFiltrados.length > 0 ? (
                                    // GALERÍA DE TARJETAS (Reemplazo de la tabla)
                                    <div className="grid grid-cols-2 gap-4 p-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                        {productosFiltrados.map((producto) => {
                                            const isDisabled =
                                                !producto.tiene_precio ||
                                                producto.stock_total <= 0 ||
                                                !producto.precio_venta ||
                                                producto.precio_venta <= 0;

                                            return (
                                                <Card
                                                    key={producto.id}
                                                    className={`transition-all duration-200 shadow-lg ${
                                                        isDisabled
                                                            ? 'opacity-60 cursor-not-allowed border-gray-300'
                                                            : 'hover:border-blue-500 cursor-pointer'
                                                    }`}
                                                >
                                                    <CardContent className="p-3" onClick={() => {
                                                        if (!isDisabled) {
                                                            agregarAlCarrito(producto);
                                                        }
                                                    }}>
                                                        {/* Información de Stock y Categoría */}
                                                        <div className="mb-2 flex items-center justify-between">
                                                            <span
                                                                className={`inline-flex rounded-full px-2 text-xs leading-5 font-semibold ${
                                                                    producto.stock_total > 5
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : producto.stock_total > 0
                                                                          ? 'bg-yellow-100 text-yellow-800'
                                                                          : 'bg-red-100 text-red-800'
                                                                }`}
                                                            >
                                                                Stock: {producto.stock_total}
                                                            </span>
                                                            <Badge variant="secondary" className="text-xs">
                                                                {producto.categoria_nombre || 'Sin Cat.'}
                                                            </Badge>
                                                        </div>

                                                        {/* Nombre del Producto */}
                                                        <div className="text-center">
                                                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2 min-h-[40px]">
                                                                {producto.nombre_producto}
                                                            </p>
                                                            <p className="text-xs text-gray-500">{producto.marca_producto || 'Sin marca'}</p>
                                                        </div>

                                                        <Separator className="my-3 bg-gray-200 dark:bg-gray-700" />

                                                        {/* Precio y Botón de Añadir */}
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-lg font-bold text-emerald-600">
                                                                {producto.precio_venta && producto.precio_venta > 0
                                                                    ? `$ ${producto.precio_venta.toFixed(2)}`
                                                                    : 'N/A'}
                                                            </span>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="default"
                                                                        className="h-8 w-8 p-0"
                                                                        disabled={isDisabled}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation(); // Prevenir que el click en el botón active el click de la Card
                                                                            agregarAlCarrito(producto);
                                                                        }}
                                                                    >
                                                                        <PackagePlus size={16} />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="text-white">
                                                                    <p>Agregar al Carrito</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center">
                                        <p className="text-gray-500">
                                            No se encontraron productos que coincidan con la búsqueda.
                                        </p>
                                        {busqueda && (
                                            <button
                                                type="button"
                                                onClick={limpiarBusqueda}
                                                className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                                            >
                                                Limpiar búsqueda
                                            </button>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Columna 2: Carrito de Compras y Resumen (Ahora Columna Única) */}
                    <div className="lg:col-span-1">
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
                                        {carrito.length} producto(s)
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
                                                                size="icon"
                                                                onClick={() => quitarDelCarrito(item.id)}
                                                                className="ml-2 cursor-pointer h-6 w-6 text-red-400 hover:bg-red-900 hover:text-white"
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

                                                        <Badge variant="secondary" className="text-xs">
                                                            <span className="w-8 cursor-help text-center text-sm font-medium text-amber-500">
                                                                {item.cantidad}
                                                            </span>
                                                        </Badge>
                                                        

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

                            {/* Resumen del carrito y Botón de Procesar */}
                            {carrito.length > 0 && (
                                <div className="rounded-b-lg border-1 border-t border-solid border-gray-200 bg-gray-50 p-4">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Total:</span>
                                        <span className="text-lg font-bold text-emerald-700">$ {calcularTotal.toFixed(2)} USD</span>
                                    </div>
                                    {/* AlertDialog de Metodos de Venta */}
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <button
                                                type="button"
                                                disabled={procesandoVenta || !almacenSeleccionado}
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
                                            
                                            <div className="max-h-[60vh] overflow-y-auto pr-4">
                                                <div className="sticky top-0 mb-4 flex items-center justify-between border-b bg-white p-2 dark:bg-gray-950">
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
                                                                                = **${payment.amountInUsd.toFixed(2)} USD**
                                                                            </div>
                                                                            <div className="text-xs text-gray-400">
                                                                                Tasa: {payment.exchangeRate} {payment.currency === 'CUP' ? 'CUP/USD' : 'USD/MLC'}
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
                                                     {/* Resumen de tasas de cambio */}
                                                    <div className="border-t pt-4">
                                                        <h4 className="mb-3 text-center text-sm font-bold text-gray-600">
                                                            Tasas de Cambio (Ajustar para esta Venta):
                                                        </h4>
                                                        <div className="grid gap-4 md:grid-cols-2">
                                                            <div className='flex items-center space-x-2'>
                                                                <Label className='whitespace-nowrap'>CUP por 1 USD:</Label>
                                                                <Input
                                                                    type="number"
                                                                    min="0.01"
                                                                    step="0.01"
                                                                    value={tasaUSD}
                                                                    onChange={(e) => setTasaUSD(parseFloat(e.target.value) || 1)}
                                                                    className="border-sidebar-accent w-full rounded border px-2 py-1 text-left text-sm text-emerald-600 hover:border-emerald-300"
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                            <div className='flex items-center space-x-2'>
                                                                <Label className='whitespace-nowrap'>USD por 1 MLC:</Label>
                                                                <Input
                                                                    type="number"
                                                                    min="0.01"
                                                                    step="0.01"
                                                                    value={tasaMLC}
                                                                    onChange={(e) => setTasaMLC(parseFloat(e.target.value) || 1)}
                                                                    className="border-sidebar-accent w-full rounded border px-2 py-1 text-left text-sm text-emerald-600 hover:border-emerald-300"
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

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
                                                                        setCurrentPayment({ ...currentPayment, method: value, via: value === 'efectivo' ? 'efectivo' : '' }) // Resetear vía si cambia método
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
                                                                    onValueChange={(value) =>
                                                                        setCurrentPayment({ ...currentPayment, currency: value })
                                                                    }
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
                                                                    onValueChange={(value) =>
                                                                        setCurrentPayment({ ...currentPayment, cuenta_id: value })
                                                                    }
                                                                    disabled={!currentPayment.currency || availableAccounts.length === 0}
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
                                                                {availableAccounts.length === 0 && currentPayment.currency && (
                                                                    <p className="text-red-500 text-xs">No hay cuentas para esta moneda.</p>
                                                                )}
                                                            </div>

                                                            {/* Vía de pago (solo para transferencia) */}
                                                            {currentPayment.method === 'transferencia' && (
                                                                <div className="space-y-2">
                                                                    <Label>Vía de pago</Label>
                                                                    <Select
                                                                        value={currentPayment.via}
                                                                        onValueChange={(value) =>
                                                                            setCurrentPayment({ ...currentPayment, via: value })
                                                                        }
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
                                                        {currentPayment.amount &&
                                                            currentPayment.currency &&
                                                            parseFloat(currentPayment.amount) > 0 && (
                                                                <div className="text-sm text-gray-500 font-semibold p-2 border rounded">
                                                                    Monto en Moneda Local: {parseFloat(currentPayment.amount).toFixed(2)} {currentPayment.currency} <br/>
                                                                    Equivalente en USD:{' '}
                                                                    <span className="font-bold text-emerald-600">
                                                                        $ {convertToUsd(parseFloat(currentPayment.amount), currentPayment.currency)}
                                                                    </span>{' '}
                                                                    USD
                                                                </div>
                                                            )}
                                                    </div>

                                                </div>
                                            </div> {/* Fin de div con scroll */}
                                            
                                            <div className="flex items-center justify-between border-t pt-4">
                                                <span className="text-sidebar-accent text-lg font-bold">Monto Restante:</span>
                                                <span
                                                    className={`text-2xl font-extrabold ${remainingInUsd > 0.01 ? 'animate-pulse text-red-600' : 'text-emerald-600'}`}
                                                >
                                                    ${remainingInUsd.toFixed(2)} USD
                                                </span>
                                            </div>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="bg-destructive-foreground hover:bg-destructive cursor-pointer text-white">
                                                    Cancelar
                                                </AlertDialogCancel>
                                                <Button
                                                    className="flex w-full cursor-pointer items-center justify-center rounded-md bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                    onClick={handleCompleteSale}
                                                    // Deshabilitar si queda pendiente más de $0.01 (para evitar problemas de punto flotante)
                                                    disabled={remainingInUsd > 0.01 || payments.length === 0 || procesandoVenta}
                                                >
                                                    Realizar la Venta
                                                </Button>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                    <p className="mt-2 text-center text-xs text-gray-500">Se enviarán {carrito.length} productos y {payments.length} pagos para procesar</p>
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
