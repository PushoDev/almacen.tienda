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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { Barcode, BoxesIcon, Eye, Info, Minus, PackagePlus, Plus, Search, ShoppingBag, ShoppingCart, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
    moneda?: {
        id: number | string;
        codigo: string;
        nombre: string;
        simbolo: string;
        tasa_cambio: number;
    };
    saldo_actual?: number;
}

interface Producto {
    id: number | string;
    nombre_producto: string;
    marca_producto: string;
    categoria_nombre: string;
    precio_compra_producto: number;
    stock_disponible: number;
    precio_venta: number | null;
    tiene_precio: boolean;
    imagen_url: string;
    codigo_barras: string;
    barcode_image_url: string | null;
}

interface ItemCarrito {
    id: string;
    producto: Producto;
    cantidad: number;
    precio_venta: number;
    subtotal: number;
}

interface Moneda {
    id: number | string;
    codigo_moneda: string;
    nombre_moneda: string;
    simbolo_moneda: string;
    tasa_cambio: number;
    principal?: boolean;
    estado?: boolean;
}

interface Payment {
    id: string;
    method: 'transferencia' | 'efectivo';
    moneda_id: string;
    amount: number;
    via?: string;
    exchangeRate: number;
    amountInUsd: number;
    cuenta_id: string;
    referencia?: string;
    moneda_info?: {
        codigo: string;
        nombre: string;
        simbolo: string;
    };
}

interface PaymentVia {
    id: string;
    name: string;
    method: 'transferencia' | 'efectivo';
}

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
        monedas: Moneda[];
        tasa_usd: number;
        tasa_mlc: number;
    };
}) {
    const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [monedas, setMonedas] = useState<Moneda[]>(meta.monedas || []);
    const [monedaPrincipal, setMonedaPrincipal] = useState<Moneda | null>(null);
    const [tasaCambioPrincipal, setTasaCambioPrincipal] = useState<number>(1);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [almacenSeleccionado, setAlmacenSeleccionado] = useState<string>('');
    const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('');
    const [busqueda, setBusqueda] = useState<string>('');
    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [procesandoVenta, setProcesandoVenta] = useState<boolean>(false);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [currentPayment, setCurrentPayment] = useState<{
        method: 'transferencia' | 'efectivo' | '';
        moneda_id: string;
        via: string;
        amount: string;
        exchangeRate: string;
        cuenta_id: string;
        referencia: string;
    }>({
        method: '',
        moneda_id: '',
        via: '',
        amount: '',
        exchangeRate: '',
        cuenta_id: '',
        referencia: '',
    });
    const [cuentasFiltradas, setCuentasFiltradas] = useState<Cuenta[]>([]);
    const [cargandoCuentas, setCargandoCuentas] = useState<boolean>(false);

    // 🆕 NUEVO: Estado para el cálculo en tiempo real
    const [conversionCalculada, setConversionCalculada] = useState<{
        montoOriginal: number;
        montoUSD: number;
        tasaCambio: number;
        monedaSimbolo: string;
    } | null>(null);

    const currencies = useMemo(() => {
        console.log('Monedas disponibles:', monedas);
        return monedas.map((moneda) => ({
            id: moneda.id,
            code: moneda.codigo_moneda,
            name: moneda.nombre_moneda,
            symbol: moneda.simbolo_moneda,
            exchangeRate: moneda.tasa_cambio,
            availableFor: ['transferencia', 'efectivo'] as ('transferencia' | 'efectivo')[],
        }));
    }, [monedas]);

    useEffect(() => {
        if (meta.monedas && meta.monedas.length > 0) {
            console.log('Monedas del meta:', meta.monedas);
            setMonedas(meta.monedas);
            const principal = meta.monedas.find((m) => m.principal) || meta.monedas[0];
            if (principal) {
                console.log('Moneda principal establecida:', principal);
                setMonedaPrincipal(principal);
                setTasaCambioPrincipal(principal.tasa_cambio);
            }
        }
    }, [meta.monedas]);

    // 🆕 NUEVO: Efecto para calcular la conversión en tiempo real
    useEffect(() => {
        if (
            currentPayment.amount &&
            currentPayment.moneda_id &&
            parseFloat(currentPayment.amount) > 0 &&
            currentPayment.exchangeRate &&
            parseFloat(currentPayment.exchangeRate) > 0
        ) {
            const monto = parseFloat(currentPayment.amount);
            const exchangeRate = parseFloat(currentPayment.exchangeRate);
            const selectedCurrency = currencies.find((c) => c.id === currentPayment.moneda_id);

            if (selectedCurrency) {
                const montoUSD = convertToUsd(monto, exchangeRate);
                setConversionCalculada({
                    montoOriginal: monto,
                    montoUSD: montoUSD,
                    tasaCambio: exchangeRate,
                    monedaSimbolo: selectedCurrency.symbol,
                });
            }
        } else {
            setConversionCalculada(null);
        }
    }, [currentPayment.amount, currentPayment.moneda_id, currentPayment.exchangeRate, currencies]);

    const cargarAlmacenes = async () => {
        try {
            console.log('Cargando almacenes...');
            const response = await axios.get(route('ventas.getAlmacenes'));
            console.log('Almacenes cargados:', response.data);
            setAlmacenes(response.data);
        } catch (error) {
            console.error('Error al cargar almacenes:', error);
            toast.error('Error al cargar almacenes');
        }
    };

    const cargarClientes = async () => {
        try {
            console.log('Cargando clientes...');
            const response = await axios.get(route('ventas.getClientes'));
            console.log('Clientes cargados:', response.data);
            setClientes(response.data);
        } catch (error) {
            console.error('Error al cargar clientes:', error);
            toast.error('Error al cargar clientes');
        }
    };

    const cargarCuentasFiltradas = async (monedaId: string) => {
        if (!monedaId) {
            console.log('No hay moneda ID, limpiando cuentas filtradas');
            setCuentasFiltradas([]);
            return;
        }

        setCargandoCuentas(true);
        try {
            console.log('Cargando cuentas filtradas para moneda ID:', monedaId);
            const response = await axios.get(route('ventas.getCuentasFiltradas'), {
                params: { moneda_id: monedaId },
            });
            console.log('Cuentas filtradas cargadas:', response.data);
            setCuentasFiltradas(response.data);
        } catch (error: unknown) {
            console.error('Error al cargar cuentas filtradas:', error);
            if (axios.isAxiosError(error)) {
                console.error('Detalles del error:', error.response?.data);
            }
            toast.error('Error al cargar cuentas');
            setCuentasFiltradas([]);
        } finally {
            setCargandoCuentas(false);
        }
    };

    const cargarProductos = async (almacenId: string) => {
        if (!almacenId) {
            setProductos([]);
            return;
        }

        try {
            console.log('Cargando productos para almacén:', almacenId);
            const response = await axios.get(route('ventas.getProductosPorAlmacen', almacenId));
            const productosProcesados = response.data.map((producto: Producto) => ({
                ...producto,
                precio_venta: producto.precio_venta ? Number(producto.precio_venta) : null,
                precio_compra_producto: producto.precio_compra_producto ? Number(producto.precio_compra_producto) : 0,
                stock_disponible: Number(producto.stock_disponible) || 0,
                imagen_url: producto.imagen_url || '/placeholder-product.png',
                codigo_barras: producto.codigo_barras || 'N/A',
            }));
            console.log('Productos cargados:', productosProcesados.length);
            setProductos(productosProcesados);
        } catch (error: unknown) {
            console.error('Error al cargar productos:', error);
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                toast.error('No tienes acceso a este almacén');
            } else {
                toast.error('Error al cargar productos');
            }
            setProductos([]);
        }
    };

    useEffect(() => {
        cargarAlmacenes();
        cargarClientes();
    }, []);

    const handleAlmacenChange = (value: string) => {
        console.log('Almacén seleccionado:', value);
        setAlmacenSeleccionado(value);
        cargarProductos(value);
        setBusqueda('');
        setCarrito([]);
    };

    const handleClienteChange = (value: string) => {
        console.log('Cliente seleccionado:', value);
        setClienteSeleccionado(value);
    };

    const handleMonedaChange = (monedaId: string) => {
        const selectedCurrency = currencies.find((c) => c.id === monedaId);
        setCurrentPayment({
            ...currentPayment,
            moneda_id: monedaId,
            exchangeRate: selectedCurrency ? selectedCurrency.exchangeRate.toString() : '',
            cuenta_id: '',
        });
        cargarCuentasFiltradas(monedaId);
    };

    const productosFiltrados = useMemo(() => {
        if (!busqueda.trim()) return productos;
        const termino = busqueda.toLowerCase().trim();
        return productos.filter(
            (producto) =>
                (producto.nombre_producto?.toLowerCase().includes(termino) ||
                    producto.marca_producto?.toLowerCase().includes(termino) ||
                    producto.codigo_barras?.toLowerCase().includes(termino) ||
                    producto.categoria_nombre?.toLowerCase().includes(termino)) ??
                false,
        );
    }, [productos, busqueda]);

    const limpiarBusqueda = () => {
        setBusqueda('');
    };

    const agregarAlCarrito = (producto: Producto) => {
        if (!producto.tiene_precio || !producto.precio_venta || producto.precio_venta <= 0) {
            toast.error('Este producto no tiene un precio de venta configurado');
            return;
        }

        if (producto.stock_disponible <= 0) {
            toast.error('Stock insuficiente para este producto');
            return;
        }

        const idItem = `${producto.id}`;
        const itemExistente = carrito.find((item) => item.id === idItem);

        if (itemExistente) {
            const nuevaCantidad = Math.min(itemExistente.cantidad + 1, producto.stock_disponible);
            if (nuevaCantidad === itemExistente.cantidad) {
                toast.warning('No hay más stock disponible para este producto');
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
            const precioVenta = producto.precio_venta;
            const nuevoItem: ItemCarrito = {
                id: idItem,
                producto: producto,
                cantidad: 1,
                precio_venta: precioVenta,
                subtotal: precioVenta,
            };
            setCarrito([...carrito, nuevoItem]);
            toast.success('Producto agregado al carrito');
        }
    };

    const actualizarCantidad = (id: string, nuevaCantidad: number) => {
        if (nuevaCantidad < 1) return;
        const item = carrito.find((item) => item.id === id);
        if (!item) return;
        if (nuevaCantidad > item.producto.stock_disponible) {
            nuevaCantidad = item.producto.stock_disponible;
            toast.warning('No hay más stock disponible');
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

    const quitarDelCarrito = (id: string) => {
        setCarrito(carrito.filter((item) => item.id !== id));
        toast.info('Producto removido del carrito');
    };

    const calcularTotal = useMemo(() => {
        return carrito.reduce((total, item) => {
            const subtotal = item.cantidad * item.precio_venta;
            return total + (isNaN(subtotal) ? 0 : subtotal);
        }, 0);
    }, [carrito]);

    const incrementarCantidad = (id: string) => {
        const item = carrito.find((item) => item.id === id);
        if (item && item.cantidad < item.producto.stock_disponible) {
            actualizarCantidad(id, item.cantidad + 1);
        } else {
            toast.warning('No hay más stock disponible');
        }
    };

    const decrementarCantidad = (id: string) => {
        const item = carrito.find((item) => item.id === id);
        if (item && item.cantidad > 1) {
            actualizarCantidad(id, item.cantidad - 1);
        }
    };

    const totalPaid = useMemo(() => payments.reduce((sum, payment) => sum + payment.amountInUsd, 0), [payments]);
    const remainingInUsd = calcularTotal - totalPaid;

    const convertToUsd = (amount: number, exchangeRate: number): number => {
        if (!exchangeRate || exchangeRate <= 0) {
            return 0;
        }
        return amount / exchangeRate;
    };

    const handleAddPayment = () => {
        console.log('Intentando agregar pago:', currentPayment);
        console.log('Cuentas filtradas disponibles:', cuentasFiltradas);

        if (
            !currentPayment.method ||
            !currentPayment.moneda_id ||
            (currentPayment.method === 'transferencia' && !currentPayment.via) ||
            (currentPayment.method === 'transferencia' && !currentPayment.referencia) ||
            !currentPayment.amount ||
            parseFloat(currentPayment.amount) <= 0 ||
            !currentPayment.cuenta_id ||
            !currentPayment.exchangeRate ||
            parseFloat(currentPayment.exchangeRate) <= 0
        ) {
            console.log('Faltan campos requeridos:', {
                method: currentPayment.method,
                moneda_id: currentPayment.moneda_id,
                via: currentPayment.via,
                referencia: currentPayment.referencia,
                amount: currentPayment.amount,
                exchangeRate: currentPayment.exchangeRate,
                cuenta_id: currentPayment.cuenta_id,
            });
            toast.warning('Por favor, complete todos los campos del pago y asegure un monto y tasa de cambio válidos.');
            return;
        }

        const selectedAccount = cuentasFiltradas.find((c) => c.id.toString() === currentPayment.cuenta_id);
        const selectedCurrency = currencies.find((c) => c.id === currentPayment.moneda_id);

        console.log('Cuenta seleccionada:', selectedAccount);
        console.log('Moneda seleccionada:', selectedCurrency);

        if (!selectedAccount || !selectedCurrency) {
            toast.error('Error en la selección de cuenta o moneda');
            return;
        }

        const amount = parseFloat(currentPayment.amount);
        const exchangeRate = parseFloat(currentPayment.exchangeRate);
        const amountInUsd = convertToUsd(amount, exchangeRate);

        console.log(`Monto: ${amount}, Tasa: ${exchangeRate}, USD: ${amountInUsd}`);

        if (amountInUsd === 0 || isNaN(amountInUsd)) {
            toast.error('El monto en USD no puede ser cero o no es válido. Revise la tasa de cambio.');
            return;
        }

        const newPayment: Payment = {
            id: crypto.randomUUID(),
            method: currentPayment.method,
            moneda_id: currentPayment.moneda_id,
            amount: amount,
            via: currentPayment.method === 'transferencia' ? currentPayment.via : undefined,
            exchangeRate: exchangeRate,
            amountInUsd: amountInUsd,
            cuenta_id: currentPayment.cuenta_id,
            referencia: currentPayment.method === 'transferencia' ? currentPayment.referencia : undefined,
            moneda_info: {
                codigo: selectedCurrency.code,
                nombre: selectedCurrency.name,
                simbolo: selectedCurrency.symbol,
            },
        };

        console.log('Nuevo pago agregado:', newPayment);
        setPayments([...payments, newPayment]);

        setCurrentPayment({
            method: '',
            moneda_id: '',
            via: '',
            amount: '',
            exchangeRate: '',
            cuenta_id: '',
            referencia: '',
        });
        setCuentasFiltradas([]);
        setConversionCalculada(null); // 🆕 Limpiar cálculo al agregar pago

        toast.success('Pago agregado correctamente');
    };

    const handleRemovePayment = (id: string) => {
        setPayments(payments.filter((payment) => payment.id !== id));
        toast.info('Pago removido');
    };

    const handleCompleteSale = async () => {
        console.log('Iniciando proceso de venta...');

        if (!almacenSeleccionado) {
            toast.error('Selecciona un almacén antes de completar la venta.');
            return;
        }
        if (carrito.length === 0) {
            toast.error('El carrito está vacío.');
            return;
        }

        for (const item of carrito) {
            const producto = productos.find((p) => p.id === item.producto.id);
            if (!producto || producto.stock_disponible < item.cantidad) {
                toast.error(`Stock insuficiente para: ${item.producto.nombre_producto}`);
                return;
            }
        }

        for (const item of carrito) {
            if (!item.precio_venta || item.precio_venta <= 0) {
                toast.error(`Precio inválido para: ${item.producto.nombre_producto}`);
                return;
            }
        }

        if (remainingInUsd > 0.01) {
            toast.error(`El total a pagar no ha sido cubierto. Restante: $${remainingInUsd.toFixed(2)} USD`);
            return;
        }

        if (payments.length === 0) {
            toast.error('Debe agregar al menos un método de pago para completar la venta.');
            return;
        }

        const datosVenta = {
            almacen_id: almacenSeleccionado,
            cliente_id: clienteSeleccionado || null,
            items: carrito.map((item) => ({
                producto_id: item.producto.id,
                cantidad: item.cantidad,
                precio_venta: item.precio_venta,
                subtotal: item.subtotal,
            })),
            total: calcularTotal,
            pagos: payments.map((p) => ({
                metodo: p.method,
                moneda_id: p.moneda_id,
                monto: p.amount,
                via: p.via,
                tasa_cambio: p.exchangeRate,
                monto_equivalente: p.amountInUsd,
                cuenta_id: p.cuenta_id,
                referencia: p.referencia,
            })),
            moneda_principal_id: monedaPrincipal?.id,
            tasa_cambio_principal: tasaCambioPrincipal,
        };

        console.log('Datos de venta a enviar:', datosVenta);

        try {
            setProcesandoVenta(true);
            const response = await axios.post(route('ventas.procesar'), datosVenta);
            console.log('Respuesta del servidor:', response.data);

            if (response.data.success) {
                toast.success('✅ Venta creada correctamente. Stock reservado pendiente de aprobación.');
                setCarrito([]);
                setPayments([]);
                setAlmacenSeleccionado('');
                setClienteSeleccionado('');
                setProductos([]);

                if (response.data.redirect) {
                    setTimeout(() => {
                        window.location.href = response.data.redirect;
                    }, 2000);
                }
            } else {
                toast.error('Error al procesar la venta: ' + (response.data.message || response.data.error));
            }
        } catch (error: unknown) {
            console.error('Error al procesar venta:', error);
            if (axios.isAxiosError(error) && error.response) {
                console.error('Detalles del error:', error.response.data);
                const errorMessage = error.response.data.message || 'Ocurrió un error en el servidor.';
                toast.error(errorMessage);
            } else {
                toast.error('Error de red al procesar la venta');
            }
        } finally {
            setProcesandoVenta(false);
        }
    };

    const getCurrencyInfo = (currencyId: string) => {
        return currencies.find((c) => c.id === currencyId);
    };

    const getStockStatus = (stock: number) => {
        if (stock > 10) return { label: 'Disponible', variant: 'default' as const };
        if (stock > 5) return { label: 'Stock Medio', variant: 'secondary' as const };
        if (stock > 0) return { label: 'Stock Bajo', variant: 'outline' as const };
        return { label: 'Agotado', variant: 'destructive' as const };
    };

    const selectedCurrencyInfo = currentPayment.moneda_id ? getCurrencyInfo(currentPayment.moneda_id) : null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Punto de Venta" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative space-y-2 overflow-hidden rounded-2xl border border-dashed p-6">
                    <HeadingSmall title="Punto de Venta" description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento." />
                    <ShoppingBag
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-4 bottom-0 translate-y-[-20] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Información del usuario */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <p>
                        Rol Actual del Vendedor:{' '}
                        <span className="text-primary font-medium">{meta.role_usuario === 'admin' ? 'Administrador' : 'Vendedor'}</span>
                    </p>
                    <Link href={route('ventas.listado')}>
                        <Button variant="secondary" className="flex items-center gap-2">
                            <Eye size={16} />
                            Mis Ventas
                        </Button>
                    </Link>
                </div>

                <Separator />

                {/* Contenido principal */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Columna izquierda - Productos */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingBag className="h-5 w-5" />
                                    Configuración de Venta
                                </CardTitle>
                                <CardDescription>Seleccione el almacén y cliente para comenzar</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="almacen">Almacén</Label>
                                        <Select value={almacenSeleccionado} onValueChange={handleAlmacenChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar almacén" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {almacenes.map((almacen) => (
                                                    <SelectItem key={almacen.id} value={almacen.id.toString()}>
                                                        {almacen.nombre_almacen}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="cliente">Cliente</Label>
                                        <Select value={clienteSeleccionado} onValueChange={handleClienteChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar cliente" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {clientes.map((cliente) => (
                                                    <SelectItem key={cliente.id} value={cliente.id.toString()}>
                                                        {cliente.nombre_cliente}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Búsqueda */}
                                {almacenSeleccionado && (
                                    <div className="space-y-2">
                                        <Label htmlFor="busqueda">Buscar Productos</Label>
                                        <div className="relative">
                                            <Search className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                placeholder="Buscar por nombre, marca o categoría..."
                                                value={busqueda}
                                                onChange={(e) => setBusqueda(e.target.value)}
                                                className="pl-10"
                                            />
                                            {busqueda && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={limpiarBusqueda}
                                                    className="absolute top-1 right-1 h-8 w-8 p-0"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Grid de Productos */}
                        {almacenSeleccionado && (
                            <Card className="mt-6">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BoxesIcon className="h-5 w-5" />
                                        Productos Disponibles
                                        {productosFiltrados.length > 0 && (
                                            <Badge variant="secondary" className="ml-2">
                                                {productosFiltrados.length} productos
                                            </Badge>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {productosFiltrados.length > 0 ? (
                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                            {productosFiltrados.map((producto) => {
                                                const stockStatus = getStockStatus(producto.stock_disponible);
                                                return (
                                                    <Card key={producto.id} className="overflow-hidden transition-all hover:shadow-md">
                                                        <div className="aspect-square overflow-hidden bg-gray-100">
                                                            <img
                                                                src={producto.imagen_url}
                                                                alt={producto.nombre_producto}
                                                                className="h-full w-full object-cover transition-transform hover:scale-105"
                                                                onError={(e) => {
                                                                    e.currentTarget.src = '/placeholder-product.png';
                                                                }}
                                                            />
                                                        </div>

                                                        <CardContent className="p-4">
                                                            <div className="mb-3 space-y-1">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <h3 className="line-clamp-2 cursor-help leading-tight font-semibold">
                                                                            {producto.nombre_producto}
                                                                        </h3>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <div className="max-w-xs space-y-2">
                                                                            <p className="font-semibold">{producto.nombre_producto}</p>
                                                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                                                                                <span className="text-gray-500">Marca:</span>
                                                                                <span>{producto.marca_producto || 'N/A'}</span>
                                                                                <span className="text-gray-500">Categoría:</span>
                                                                                <span>{producto.categoria_nombre || 'N/A'}</span>
                                                                                <span className="text-gray-500">Stock:</span>
                                                                                <span>{producto.stock_disponible} unidades</span>
                                                                                <span className="text-gray-500">Código:</span>
                                                                                <span className="font-mono text-xs">{producto.codigo_barras}</span>
                                                                            </div>
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>

                                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                                    <span>{producto.marca_producto || 'Sin marca'}</span>
                                                                    <span>•</span>
                                                                    <span>{producto.categoria_nombre || 'Sin categoría'}</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between">
                                                                <div className="space-y-1">
                                                                    <p className="text-sm text-gray-500">Precio de venta</p>
                                                                    {producto.precio_venta && producto.precio_venta > 0 ? (
                                                                        <p className="text-lg font-bold text-emerald-600">
                                                                            ${producto.precio_venta.toFixed(2)}
                                                                        </p>
                                                                    ) : (
                                                                        <p className="text-sm text-red-500">Sin precio</p>
                                                                    )}
                                                                </div>

                                                                <Button
                                                                    onClick={() => agregarAlCarrito(producto)}
                                                                    disabled={
                                                                        !producto.tiene_precio ||
                                                                        producto.stock_disponible <= 0 ||
                                                                        !producto.precio_venta ||
                                                                        producto.precio_venta <= 0
                                                                    }
                                                                    size="sm"
                                                                >
                                                                    <PackagePlus className="mr-2 h-4 w-4" />
                                                                    Agregar
                                                                </Button>
                                                            </div>

                                                            <div className="mt-3 flex items-center justify-between">
                                                                <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Badge variant="outline" className="cursor-help">
                                                                            <Barcode className="mr-1 h-3 w-3" />
                                                                            Código
                                                                        </Badge>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="font-mono">{producto.codigo_barras}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex h-32 flex-col items-center justify-center text-center">
                                            <BoxesIcon className="mb-2 h-8 w-8 text-gray-400" />
                                            <p className="text-gray-500">
                                                {busqueda
                                                    ? 'No se encontraron productos que coincidan con la búsqueda'
                                                    : 'No hay productos disponibles en este almacén'}
                                            </p>
                                            {busqueda && (
                                                <Button variant="link" onClick={limpiarBusqueda} className="mt-2">
                                                    Limpiar búsqueda
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Columna derecha - Carrito */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader className="bg-muted/50">
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingCart className="h-5 w-5" />
                                    Carrito de Compras
                                    {carrito.length > 0 && (
                                        <Badge variant="secondary" className="ml-2">
                                            {carrito.length}
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {carrito.length === 0 ? (
                                    <div className="flex h-48 flex-col items-center justify-center p-6 text-center">
                                        <ShoppingCart className="mb-3 h-12 w-12 text-gray-300" />
                                        <p className="text-gray-500">Carrito vacío</p>
                                        <p className="mt-1 text-sm text-gray-400">Agregue productos del almacén seleccionado</p>
                                    </div>
                                ) : (
                                    <div className="max-h-96 space-y-4 overflow-y-auto p-6">
                                        {carrito.map((item) => (
                                            <div key={item.id} className="space-y-3 rounded-lg border p-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1 space-y-1">
                                                        <p className="text-sm font-medium">{item.producto.nombre_producto}</p>
                                                        <p className="text-xs text-gray-500">{item.producto.marca_producto || 'Sin marca'}</p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => quitarDelCarrito(item.id)}
                                                        className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => decrementarCantidad(item.id)}
                                                            disabled={item.cantidad <= 1}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>

                                                        <span className="w-8 text-center font-medium">{item.cantidad}</span>

                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => incrementarCantidad(item.id)}
                                                            disabled={item.cantidad >= item.producto.stock_disponible}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>

                                                    <div className="text-right">
                                                        <Input
                                                            type="number"
                                                            value={item.precio_venta}
                                                            onChange={(e) => {
                                                                const value = parseFloat(e.target.value);
                                                                if (!isNaN(value)) {
                                                                    actualizarPrecio(item.id, value);
                                                                }
                                                            }}
                                                            className="w-20 text-sm"
                                                            min="0"
                                                            step="0.01"
                                                        />
                                                        <p className="mt-1 text-sm font-medium text-emerald-600">${item.subtotal.toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {carrito.length > 0 && (
                                    <div className="border-t p-6">
                                        {/* Mensaje informativo sobre stock reservado */}
                                        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm">
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0">
                                                    <Info className="mt-0.5 h-4 w-4 text-blue-400" />
                                                </div>
                                                <div className="ml-2">
                                                    <p className="font-medium text-blue-700">Stock será reservado</p>
                                                    <p className="mt-1 text-xs text-blue-600">
                                                        Al procesar la venta, el stock será reservado inmediatamente y no estará disponible para otros
                                                        usuarios.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium">Total:</span>
                                                <span className="text-xl font-bold text-emerald-600">${calcularTotal.toFixed(2)}</span>
                                            </div>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button className="w-full" size="lg" disabled={procesandoVenta}>
                                                        {procesandoVenta ? (
                                                            <>
                                                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                                                                Procesando...
                                                            </>
                                                        ) : (
                                                            'Procesar Venta'
                                                        )}
                                                    </Button>
                                                </AlertDialogTrigger>

                                                <AlertDialogContent className="max-h-[500px] overflow-y-auto sm:max-w-[800px]">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Procesar Venta</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Complete la información de pago para finalizar la venta
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>

                                                    <div className="max-h-[60vh] space-y-6 overflow-y-auto py-4">
                                                        {/* Resumen de pagos existentes */}
                                                        {payments.length > 0 && (
                                                            <div className="rounded-lg border p-4">
                                                                <h4 className="mb-3 font-medium">Pagos Agregados ({payments.length})</h4>
                                                                <div className="space-y-2">
                                                                    {payments.map((payment) => (
                                                                        <div
                                                                            key={payment.id}
                                                                            className="flex items-center justify-between rounded border p-3"
                                                                        >
                                                                            <div className="flex-1">
                                                                                <p className="font-medium">
                                                                                    {payment.method === 'transferencia'
                                                                                        ? `Transferencia (${payment.via})`
                                                                                        : 'Efectivo'}
                                                                                </p>
                                                                                <p className="text-sm text-gray-500">
                                                                                    {payment.amount.toFixed(2)} {payment.moneda_info?.simbolo}
                                                                                    {payment.referencia && ` - Ref: ${payment.referencia}`}
                                                                                </p>
                                                                                <p className="text-sm text-green-600">
                                                                                    = ${payment.amountInUsd.toFixed(2)} USD
                                                                                </p>
                                                                            </div>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                onClick={() => handleRemovePayment(payment.id)}
                                                                                className="text-red-500 hover:text-red-700"
                                                                            >
                                                                                <X className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Formulario de pago */}
                                                        <div className="space-y-4">
                                                            <h4 className="font-medium">Agregar Pago</h4>
                                                            <div className="grid gap-4 md:grid-cols-2">
                                                                <div className="space-y-2">
                                                                    <Label>Método de pago</Label>
                                                                    <Select
                                                                        value={currentPayment.method}
                                                                        onValueChange={(value: 'transferencia' | 'efectivo' | '') => {
                                                                            const newPayment = {
                                                                                ...currentPayment,
                                                                                method: value,
                                                                                via: value === 'efectivo' ? 'efectivo' : '',
                                                                                referencia: value === 'efectivo' ? '' : currentPayment.referencia,
                                                                            };
                                                                            console.log('Método de pago cambiado:', newPayment);
                                                                            setCurrentPayment(newPayment);
                                                                        }}
                                                                    >
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Seleccione método" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="transferencia">Transferencia</SelectItem>
                                                                            <SelectItem value="efectivo">Efectivo</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <Label>Moneda</Label>
                                                                    <Select
                                                                        value={currentPayment.moneda_id}
                                                                        onValueChange={handleMonedaChange}
                                                                        disabled={!currentPayment.method}
                                                                    >
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Seleccione moneda" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {currencies.map((currency) => (
                                                                                <SelectItem key={currency.id} value={currency.id.toString()}>
                                                                                    {currency.name} ({currency.symbol}) - Tasa:{' '}
                                                                                    {currency.exchangeRate}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <Label>Tasa de Cambio</Label>
                                                                    <Input
                                                                        type="number"
                                                                        value={currentPayment.exchangeRate}
                                                                        onChange={(e) =>
                                                                            setCurrentPayment({ ...currentPayment, exchangeRate: e.target.value })
                                                                        }
                                                                        placeholder="Tasa de cambio"
                                                                        disabled={!currentPayment.moneda_id}
                                                                        min="0.0001"
                                                                        step="0.0001"
                                                                    />
                                                                </div>

                                                                <div className="space-y-2">
                                                                    <Label>Cuenta Destino</Label>
                                                                    <Select
                                                                        value={currentPayment.cuenta_id}
                                                                        onValueChange={(value) => {
                                                                            console.log('Cuenta seleccionada:', value);
                                                                            setCurrentPayment({ ...currentPayment, cuenta_id: value });
                                                                        }}
                                                                        disabled={!currentPayment.moneda_id || cargandoCuentas}
                                                                    >
                                                                        <SelectTrigger>
                                                                            <SelectValue
                                                                                placeholder={
                                                                                    cargandoCuentas
                                                                                        ? 'Cargando cuentas...'
                                                                                        : cuentasFiltradas.length === 0
                                                                                          ? 'No hay cuentas disponibles'
                                                                                          : 'Seleccione cuenta'
                                                                                }
                                                                            />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {cuentasFiltradas.map((account) => (
                                                                                <SelectItem key={account.id} value={account.id.toString()}>
                                                                                    {account.nombre_cuenta}
                                                                                    {account.moneda
                                                                                        ? ` (${account.moneda.codigo})`
                                                                                        : ` (${account.tipo_moneda})`}
                                                                                    {account.saldo_actual !== undefined
                                                                                        ? ` - $${account.saldo_actual}`
                                                                                        : ''}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>

                                                                {currentPayment.method === 'transferencia' && (
                                                                    <div className="space-y-2">
                                                                        <Label>Vía de pago</Label>
                                                                        <Select
                                                                            value={currentPayment.via}
                                                                            onValueChange={(value) => {
                                                                                console.log('Vía de pago seleccionada:', value);
                                                                                setCurrentPayment({ ...currentPayment, via: value });
                                                                            }}
                                                                        >
                                                                            <SelectTrigger>
                                                                                <SelectValue placeholder="Seleccione vía" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {paymentVias
                                                                                    .filter((via) => via.method === 'transferencia')
                                                                                    .map((via) => (
                                                                                        <SelectItem key={via.id} value={via.id}>
                                                                                            {via.name}
                                                                                        </SelectItem>
                                                                                    ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {currentPayment.method === 'transferencia' && (
                                                                <div className="space-y-2">
                                                                    <Label>Referencia / Número de Operación</Label>
                                                                    <Input
                                                                        value={currentPayment.referencia}
                                                                        onChange={(e) => {
                                                                            console.log('Referencia cambiada:', e.target.value);
                                                                            setCurrentPayment({ ...currentPayment, referencia: e.target.value });
                                                                        }}
                                                                        placeholder="Ingrese el número de referencia"
                                                                        required
                                                                    />
                                                                </div>
                                                            )}

                                                            <div className="space-y-2">
                                                                <Label>Monto a Pagar</Label>
                                                                <div className="grid gap-4 md:grid-cols-4">
                                                                    <div className="space-y-2 md:col-span-3">
                                                                        <Input
                                                                            type="number"
                                                                            min="0"
                                                                            step="0.01"
                                                                            value={currentPayment.amount}
                                                                            onChange={(e) => {
                                                                                console.log('Monto cambiado:', e.target.value);
                                                                                setCurrentPayment({ ...currentPayment, amount: e.target.value });
                                                                            }}
                                                                            placeholder="0.00"
                                                                            className="text-lg font-medium"
                                                                        />

                                                                        {/* 🆕 NUEVO: Cálculo en tiempo real debajo del input */}
                                                                        {conversionCalculada && (
                                                                            <div className="rounded-lg bg-green-50 p-2 text-center">
                                                                                <p className="text-sm font-medium text-green-700">
                                                                                    {conversionCalculada.montoOriginal.toFixed(2)}{' '}
                                                                                    {conversionCalculada.monedaSimbolo} ={' '}
                                                                                    <span className="font-bold">
                                                                                        {conversionCalculada.montoUSD.toFixed(2)} USD
                                                                                    </span>
                                                                                </p>
                                                                                <p className="mt-1 text-xs text-green-600">
                                                                                    Tasa aplicada: {conversionCalculada.tasaCambio}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-end">
                                                                        <Button
                                                                            onClick={handleAddPayment}
                                                                            disabled={
                                                                                !currentPayment.method ||
                                                                                !currentPayment.moneda_id ||
                                                                                (currentPayment.method === 'transferencia' && !currentPayment.via) ||
                                                                                (currentPayment.method === 'transferencia' &&
                                                                                    !currentPayment.referencia) ||
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
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="border-t pt-4">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium">Total a pagar:</span>
                                                            <span className="text-lg font-bold text-emerald-600">
                                                                ${calcularTotal.toFixed(2)} USD
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium">Pagado:</span>
                                                            <span className="text-lg font-bold text-emerald-600">${totalPaid.toFixed(2)} USD</span>
                                                        </div>
                                                        <div className="flex items-center justify-between border-t pt-2">
                                                            <span className="font-medium">Restante:</span>
                                                            <span
                                                                className={`text-lg font-bold ${remainingInUsd > 0.01 ? 'text-red-600' : 'text-emerald-600'}`}
                                                            >
                                                                ${remainingInUsd.toFixed(2)} USD
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <AlertDialogFooter>
                                                        <Button
                                                            onClick={handleCompleteSale}
                                                            disabled={remainingInUsd > 0.01 || payments.length === 0 || procesandoVenta}
                                                            className="w-full"
                                                            size="lg"
                                                        >
                                                            {procesandoVenta ? (
                                                                <>
                                                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                                                                    Procesando...
                                                                </>
                                                            ) : (
                                                                'Confirmar Venta'
                                                            )}
                                                        </Button>
                                                        <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Toaster position="top-center" />
            </div>
        </AppLayout>
    );
}
