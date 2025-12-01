import HeadingSmall from '@/components/heading-small';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { Eye, Minus, PackagePlus, Plus, Search, ShoppingCart, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
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
    moneda?: { id: number | string; codigo: string };
    saldo_actual?: number;
}
interface Producto {
    id: number | string;
    nombre_producto: string;
    marca_producto: string;
    categoria_nombre: string;
    stock_disponible: number;
    precio_venta: number | null;
    tiene_precio: boolean;
    imagen_url: string;
    codigo_barras: string;
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
    moneda_info?: { simbolo: string };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Punto de Ventas', href: '#' }];
const paymentVias = [
    { id: 'zelle', name: 'Zelle' },
    { id: 'cashapp', name: 'CashApp' },
    { id: 'visa', name: 'Visa' },
    { id: 'mastercard', name: 'MasterCard' },
    { id: 'stripe', name: 'Stripe' },
    { id: 'paypal', name: 'Paypal' },
    { id: 'qvapay', name: 'QvaPay' },
    { id: 'enzona', name: 'EnZona' },
    { id: 'transfermovil', name: 'Transfermóvil' },
];

export default function PuntoDeVenta({ meta }: { meta: { monedas: Moneda[] } }) {
    const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [monedas, setMonedas] = useState<Moneda[]>(meta.monedas || []);
    const [monedaPrincipal, setMonedaPrincipal] = useState<Moneda | null>(null);
    const [monedaCobro, setMonedaCobro] = useState<Moneda | null>(null);
    const [tasaAplicada, setTasaAplicada] = useState<string>('');
    const [productos, setProductos] = useState<Producto[]>([]);
    const [almacenSeleccionado, setAlmacenSeleccionado] = useState<string>('');
    const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('');
    const [busqueda, setBusqueda] = useState<string>('');
    const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
    const [procesandoVenta, setProcesandoVenta] = useState<boolean>(false);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [cuentasFiltradas, setCuentasFiltradas] = useState<Cuenta[]>([]);
    const [cargandoCuentas, setCargandoCuentas] = useState<boolean>(false);

    const [currentPayment, setCurrentPayment] = useState({
        method: '' as 'transferencia' | 'efectivo' | '',
        moneda_id: '',
        via: '',
        amount: '',
        exchangeRate: '',
        cuenta_id: '',
        referencia: '',
    });

    useEffect(() => {
        axios.get(route('ventas.getAlmacenes')).then((res) => setAlmacenes(res.data));
        axios.get(route('ventas.getClientes')).then((res) => setClientes(res.data));
        if (meta.monedas && meta.monedas.length > 0) {
            const monedasData = meta.monedas;
            setMonedas(monedasData);
            const principal = monedasData.find((m) => m.principal) || monedasData[0];
            setMonedaPrincipal(principal);
            setMonedaCobro(principal);
        }
    }, [meta.monedas]);

    const cargarProductos = async (almacenId: string) => {
        if (!almacenId) {
            setProductos([]);
            return;
        }
        try {
            const response = await axios.get(route('ventas.getProductosPorAlmacen', almacenId));
            setProductos(response.data);
        } catch (error) {
            toast.error('Error al cargar productos.');
            setProductos([]);
        }
    };

    const cargarCuentasFiltradas = async (monedaId: string) => {
        if (!monedaId) {
            setCuentasFiltradas([]);
            return;
        }
        setCargandoCuentas(true);
        try {
            const response = await axios.get(route('ventas.getCuentasFiltradas'), { params: { moneda_id: monedaId } });
            setCuentasFiltradas(response.data);
        } catch (error) {
            toast.error('Error al cargar cuentas.');
        } finally {
            setCargandoCuentas(false);
        }
    };

    const handleAlmacenChange = (value: string) => {
        setAlmacenSeleccionado(value);
        cargarProductos(value);
        setCarrito([]);
    };

    const handleMonedaCobroChange = (monedaId: string) => {
        const moneda = monedas.find((m) => m.id.toString() === monedaId);
        setMonedaCobro(moneda || null);
        if (moneda) {
            setTasaAplicada(moneda.tasa_cambio.toString());
        }
    };

    const handleMonedaPagoChange = (monedaId: string) => {
        const moneda = monedas.find((m) => m.id.toString() === monedaId);
        setCurrentPayment((p) => ({
            ...p,
            moneda_id: monedaId,
            exchangeRate: moneda ? moneda.tasa_cambio.toString() : '',
            cuenta_id: '',
        }));
        cargarCuentasFiltradas(monedaId);
    };

    const agregarAlCarrito = (producto: Producto) => {
        if (!producto.tiene_precio || !producto.precio_venta || producto.precio_venta <= 0) {
            toast.error('Producto sin precio de venta asignado.');
            return;
        }
        if (producto.stock_disponible <= 0) {
            toast.error('Producto sin stock.');
            return;
        }

        const itemExistente = carrito.find((item) => item.producto.id === producto.id);
        if (itemExistente) {
            if (itemExistente.cantidad < producto.stock_disponible) {
                actualizarCantidad(itemExistente.id, itemExistente.cantidad + 1);
            } else {
                toast.warning('Stock máximo alcanzado.');
            }
        } else {
            setCarrito([
                ...carrito,
                {
                    id: producto.id.toString(),
                    producto,
                    cantidad: 1,
                    precio_venta: producto.precio_venta,
                    subtotal: producto.precio_venta,
                },
            ]);
            toast.success(`${producto.nombre_producto} agregado.`);
        }
    };

    const actualizarCantidad = (id: string, nuevaCantidad: number) => {
        const item = carrito.find((i) => i.id === id);
        if (!item || nuevaCantidad < 1 || nuevaCantidad > item.producto.stock_disponible) return;
        setCarrito(carrito.map((i) => (i.id === id ? { ...i, cantidad: nuevaCantidad, subtotal: nuevaCantidad * i.precio_venta } : i)));
    };

    const quitarDelCarrito = (id: string) => setCarrito(carrito.filter((item) => item.id !== id));

    const totalCarrito = useMemo(() => carrito.reduce((total, item) => total + item.subtotal, 0), [carrito]);
    const totalPagado = useMemo(() => payments.reduce((sum, p) => sum + p.amountInUsd, 0), [payments]);
    const restantePorPagar = totalCarrito - totalPagado;

    // CÁLCULO DE DIFERENCIA CAMBIARIA
    const diferenciaCambiaria = useMemo(() => {
        if (!monedaCobro || !tasaAplicada || totalCarrito === 0) return 0;
        const tasaOficial = monedaCobro.tasa_cambio;
        const tasaCliente = parseFloat(tasaAplicada) || 0;
        if (tasaCliente <= 0) return 0;
        const montoEsperado = totalCarrito * tasaOficial;
        const montoCobrado = totalCarrito * tasaCliente;
        return montoCobrado - montoEsperado;
    }, [totalCarrito, monedaCobro, tasaAplicada]);

    const handleAddPayment = () => {
        const { method, moneda_id, amount, exchangeRate, cuenta_id, via, referencia } = currentPayment;
        if (!method || !moneda_id || !amount || !exchangeRate || !cuenta_id || (method === 'transferencia' && (!via || !referencia))) {
            toast.warning('Complete todos los campos del pago.');
            return;
        }

        const amountNum = parseFloat(amount);
        const exchangeRateNum = parseFloat(exchangeRate);
        if (amountNum <= 0 || exchangeRateNum <= 0) {
            toast.warning('Monto y tasa deben ser mayores a cero.');
            return;
        }

        const moneda = monedas.find((m) => m.id.toString() === moneda_id);
        if (!moneda) return;

        setPayments([
            ...payments,
            {
                id: crypto.randomUUID(),
                method,
                moneda_id,
                amount: amountNum,
                exchangeRate: exchangeRateNum,
                amountInUsd: amountNum / exchangeRateNum,
                cuenta_id,
                via,
                referencia,
                moneda_info: { simbolo: moneda.simbolo_moneda },
            },
        ]);

        setCurrentPayment({ method: '', moneda_id: '', via: '', amount: '', exchangeRate: '', cuenta_id: '', referencia: '' });
        setCuentasFiltradas([]);
        toast.success('Pago agregado.');
    };

    const handleCompleteSale = async () => {
        if (!almacenSeleccionado || carrito.length === 0 || payments.length === 0 || restantePorPagar > 0.01) {
            toast.error('Verifique el almacén, carrito, pagos y monto restante.');
            return;
        }
        if (!monedaCobro || !tasaAplicada || parseFloat(tasaAplicada) <= 0) {
            toast.error('Seleccione moneda de cobro y tasa aplicada.');
            return;
        }

        setProcesandoVenta(true);
        try {
            const response = await axios.post(route('ventas.procesar'), {
                almacen_id: almacenSeleccionado,
                cliente_id: clienteSeleccionado || null,
                items: carrito.map((item) => ({
                    producto_id: item.producto.id,
                    cantidad: item.cantidad,
                    precio_venta: item.precio_venta,
                    subtotal: item.subtotal,
                })),
                total: totalCarrito,
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
                tasa_cambio_principal: monedaPrincipal?.tasa_cambio,
                moneda_cobro_id: monedaCobro?.id,
                tasa_aplicada_venta: parseFloat(tasaAplicada),
            });

            if (response.data.success) {
                toast.success('Venta creada exitosamente!');
                setCarrito([]);
                setPayments([]);
                setTasaAplicada('');
                setTimeout(() => (window.location.href = response.data.redirect), 1500);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error al procesar la venta.');
        } finally {
            setProcesandoVenta(false);
        }
    };

    const productosFiltrados = useMemo(() => {
        if (!busqueda) return productos;
        const termino = busqueda.toLowerCase();
        return productos.filter(
            (p) =>
                p.nombre_producto.toLowerCase().includes(termino) ||
                p.marca_producto.toLowerCase().includes(termino) ||
                p.codigo_barras.toLowerCase().includes(termino),
        );
    }, [productos, busqueda]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Punto de Venta" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 sm:p-6">
                <div className="flex items-center justify-between">
                    <HeadingSmall title="Punto de Venta" description="Crea ventas con control total de tasas y ganancias." />
                    <Link href={route('ventas.listado')}>
                        <Button variant="outline" className="flex items-center gap-2">
                            <Eye size={16} /> Mis Ventas
                        </Button>
                    </Link>
                </div>

                <div className="grid flex-1 gap-6 lg:grid-cols-3">
                    <div className="flex-1 space-y-6 lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Configuración de Venta</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="space-y-1">
                                    <Label>Almacén</Label>
                                    <Select value={almacenSeleccionado} onValueChange={handleAlmacenChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar almacén" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {almacenes.map((a) => (
                                                <SelectItem key={a.id} value={a.id.toString()}>
                                                    {a.nombre_almacen}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Cliente (Opcional)</Label>
                                    <Select value={clienteSeleccionado} onValueChange={setClienteSeleccionado}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar cliente" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clientes.map((c) => (
                                                <SelectItem key={c.id} value={c.id.toString()}>
                                                    {c.nombre_cliente}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Moneda de Cobro</Label>
                                    <Select value={monedaCobro?.id.toString() || ''} onValueChange={handleMonedaCobroChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Moneda que recibe el cliente" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {monedas.map((m) => (
                                                <SelectItem key={m.id} value={m.id.toString()}>
                                                    {m.nombre_moneda} ({m.simbolo_moneda}) - Tasa oficial: {m.tasa_cambio}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        {monedaCobro && (
                            <Card className="border-blue-200 dark:border-blue-900">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                        <TrendingUp className="h-5 w-5" />
                                        Tasa Aplicada al Cliente
                                    </CardTitle>
                                    <CardDescription>Puedes modificar la tasa que le das al cliente (descuento o ganancia extra)</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-end gap-4">
                                        <div className="flex-1 space-y-1">
                                            <Label>Tasa aplicada (oficial: {monedaCobro.tasa_cambio})</Label>
                                            <Input
                                                type="number"
                                                step="0.0001"
                                                value={tasaAplicada}
                                                onChange={(e) => setTasaAplicada(e.target.value)}
                                                placeholder={monedaCobro.tasa_cambio.toString()}
                                                className="text-lg font-semibold"
                                            />
                                        </div>
                                        <div className="text-right">
                                            <p className="text-muted-foreground text-sm">Diferencia cambiaria</p>
                                            <p
                                                className={`flex items-center gap-1 text-2xl font-bold ${diferenciaCambiaria > 0 ? 'text-green-600 dark:text-green-400' : diferenciaCambiaria < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}
                                            >
                                                {diferenciaCambiaria > 0 && <TrendingUp className="h-6 w-6" />}
                                                {diferenciaCambiaria < 0 && <TrendingDown className="h-6 w-6" />}
                                                {monedaCobro.simbolo_moneda}
                                                {Math.abs(diferenciaCambiaria).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Productos y carrito aquí (sin cambios) */}
                        {almacenSeleccionado && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Productos Disponibles</CardTitle>
                                    <div className="relative mt-2">
                                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                        <Input
                                            placeholder="Buscar por nombre, marca o código..."
                                            value={busqueda}
                                            onChange={(e) => setBusqueda(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid max-h-[60vh] gap-4 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
                                        {productosFiltrados.map((producto) => (
                                            <Card
                                                key={producto.id}
                                                className="hover:ring-primary flex cursor-pointer flex-col transition-all hover:ring-2"
                                                onClick={() => agregarAlCarrito(producto)}
                                            >
                                                <img
                                                    src={producto.imagen_url || '/placeholder-product.png'}
                                                    alt={producto.nombre_producto}
                                                    className="aspect-square w-full rounded-t-lg object-cover"
                                                />
                                                <div className="flex flex-1 flex-col p-4">
                                                    <h3 className="font-semibold">{producto.nombre_producto}</h3>
                                                    <p className="text-muted-foreground text-sm">{producto.marca_producto}</p>
                                                    <Badge
                                                        variant={producto.stock_disponible > 0 ? 'secondary' : 'destructive'}
                                                        className="mt-2 w-fit"
                                                    >
                                                        {producto.stock_disponible} en stock
                                                    </Badge>
                                                    <div className="mt-auto flex items-end justify-between pt-4">
                                                        <span className="text-lg font-bold">
                                                            {monedaPrincipal?.simbolo_moneda}
                                                            {producto.precio_venta?.toFixed(2)}
                                                        </span>
                                                        <Button
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                agregarAlCarrito(producto);
                                                            }}
                                                            disabled={!producto.tiene_precio || producto.stock_disponible <= 0}
                                                        >
                                                            <PackagePlus className="mr-2 h-4 w-4" /> Agregar
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Carrito con diferencia cambiaria incluida */}
                    <div className="space-y-6">
                        <Card className="flex h-full flex-col">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ShoppingCart className="h-5 w-5" /> Carrito
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4 overflow-y-auto p-4">
                                {carrito.map((item) => (
                                    <div key={item.id} className="flex items-center gap-4">
                                        <img
                                            src={item.producto.imagen_url}
                                            alt={item.producto.nombre_producto}
                                            className="h-16 w-16 rounded-md object-cover"
                                        />
                                        <div className="flex-1">
                                            <p className="font-semibold">{item.producto.nombre_producto}</p>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                                                >
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span>{item.cantidad}</span>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">
                                                {monedaPrincipal?.simbolo_moneda}
                                                {item.subtotal.toFixed(2)}
                                            </p>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-red-500"
                                                onClick={() => quitarDelCarrito(item.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {carrito.length === 0 && <p className="text-muted-foreground text-center">El carrito está vacío.</p>}
                            </CardContent>

                            {carrito.length > 0 && (
                                <>
                                    <Separator />
                                    <CardContent className="space-y-3">
                                        <div className="flex justify-between text-lg font-semibold">
                                            <span>Total USD</span>
                                            <span>${totalCarrito.toFixed(2)}</span>
                                        </div>
                                        {diferenciaCambiaria !== 0 && (
                                            <div
                                                className={`flex justify-between text-xl font-bold ${diferenciaCambiaria > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                                            >
                                                <span className="flex items-center gap-1">
                                                    {diferenciaCambiaria > 0 ? (
                                                        <TrendingUp className="h-5 w-5" />
                                                    ) : (
                                                        <TrendingDown className="h-5 w-5" />
                                                    )}
                                                    Diferencia Cambiaria
                                                </span>
                                                <span>
                                                    {monedaCobro?.simbolo_moneda}
                                                    {Math.abs(diferenciaCambiaria).toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button className="w-full text-lg" size="lg" disabled={procesandoVenta}>
                                                    Proceder al Pago
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="max-w-2xl">
                                                {/* ... resto del modal de pagos sin cambios ... */}
                                                {/* Solo cambia el botón final para incluir tasa_aplicada_venta */}
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <Button onClick={handleCompleteSale} disabled={procesandoVenta || restantePorPagar > 0.01}>
                                                        {procesandoVenta ? 'Procesando...' : 'Completar Venta'}
                                                    </Button>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </CardContent>
                                </>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
            <Toaster position="top-center" />
        </AppLayout>
    );
}
