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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import {
    BarChartIcon,
    BoxesIcon,
    Building2,
    DollarSign,
    Eye,
    Info,
    Minus,
    Plus,
    PlusCircle,
    Search,
    ShoppingBag,
    ShoppingCart,
    Trash2,
    Users,
    X,
} from 'lucide-react';
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
    { title: 'Productos', href: '/productos' },
    { title: 'Punto de Ventas', href: '#' },
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
        almacenes_usuario: { id: string | number; nombre: string }[];
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
    const [conversionCalculada, setConversionCalculada] = useState<{
        montoOriginal: number;
        montoUSD: number;
        tasaCambio: number;
        monedaSimbolo: string;
    } | null>(null);

    // Estado para el modal de crear cliente
    const [isCrearClienteDialogOpen, setIsCrearClienteDialogOpen] = useState(false);
    const [clienteErrors, setClienteErrors] = useState<Record<string, string>>({});


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
                const montoUSD = monto / exchangeRate;
                setConversionCalculada({
                    montoOriginal: monto,
                    montoUSD,
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
        setConversionCalculada(null);
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

    // 🆕 COMPONENTE DE CREACIÓN DE CLIENTE
    const CrearClienteDialogContent = () => {
        const [localCliente, setLocalCliente] = useState({
            nombre_cliente: '',
            telefono_cliente: '',
            direccion_cliente: '',
            ciudad_cliente: '',
        });

        const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

        const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const { name, value } = e.target;
            setLocalCliente((prev) => ({
                ...prev,
                [name]: value,
            }));
        };

        const crearClienteLocal = async () => {
            if (!localCliente.nombre_cliente.trim() || !localCliente.telefono_cliente.trim()) {
                toast.error('Nombre y teléfono son requeridos');
                return;
            }

            try {
                const response = await axios.post(route('ventas.cliente.store'), {
                    ...localCliente,
                    tipo_cliente: 'fisico',
                });

                const { cliente, existe, message } = response.data;

                if (existe) {
                    toast.info(message, {
                        description: 'El cliente ya existía en el sistema. Se ha seleccionado automáticamente.',
                    });
                } else {
                    toast.success(message, {
                        description: 'Cliente creado exitosamente.',
                    });
                    setClientes((prev) => [...prev, cliente]);
                }

                setClienteSeleccionado(cliente.id.toString());

                setLocalCliente({
                    nombre_cliente: '',
                    telefono_cliente: '',
                    direccion_cliente: '',
                    ciudad_cliente: '',
                });

                setLocalErrors({});
                setIsCrearClienteDialogOpen(false);
            } catch (error: any) {
                console.error('Error al crear cliente:', error);
                if (error.response?.data?.errors) {
                    setLocalErrors(error.response.data.errors);
                    toast.error('Error de validación', {
                        description: 'Por favor corrige los errores en el formulario.',
                    });
                } else {
                    toast.error('Error al crear cliente', {
                        description: 'Intenta nuevamente o contacta al administrador.',
                    });
                }
            }
        };

        const resetDialog = () => {
            setLocalCliente({
                nombre_cliente: '',
                telefono_cliente: '',
                direccion_cliente: '',
                ciudad_cliente: '',
            });
            setLocalErrors({});
            setIsCrearClienteDialogOpen(false);
        };

        return (
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Users className="h-5 w-5 text-blue-600" />
                        Crear Nuevo Cliente
                    </DialogTitle>
                    <DialogDescription>Añade un nuevo cliente al sistema para asociarlo a esta venta.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="dialog-nombre-cliente">
                            Nombre Completo <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="dialog-nombre-cliente"
                            name="nombre_cliente"
                            value={localCliente.nombre_cliente}
                            onChange={handleLocalChange}
                            placeholder="Ej: Juan Pérez"
                            className={localErrors.nombre_cliente ? 'border-red-500' : ''}
                        />
                        {localErrors.nombre_cliente && <p className="text-sm text-red-500">{localErrors.nombre_cliente}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dialog-telefono-cliente">
                            Teléfono <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="dialog-telefono-cliente"
                            name="telefono_cliente"
                            value={localCliente.telefono_cliente}
                            onChange={handleLocalChange}
                            placeholder="Ej: 555-1234"
                            className={localErrors.telefono_cliente ? 'border-red-500' : ''}
                        />
                        {localErrors.telefono_cliente && <p className="text-sm text-red-500">{localErrors.telefono_cliente}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="dialog-ciudad-cliente">Ciudad</Label>
                        <Input
                            id="dialog-ciudad-cliente"
                            name="ciudad_cliente"
                            value={localCliente.ciudad_cliente}
                            onChange={handleLocalChange}
                            placeholder="Ej: La Habana"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dialog-direccion-cliente">Dirección</Label>
                        <textarea
                            id="dialog-direccion-cliente"
                            name="direccion_cliente"
                            value={localCliente.direccion_cliente}
                            onChange={handleLocalChange}
                            placeholder="Dirección completa"
                            rows={3}
                            className="border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={resetDialog}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={crearClienteLocal}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={!localCliente.nombre_cliente.trim() || !localCliente.telefono_cliente.trim()}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Cliente
                    </Button>
                </DialogFooter>
            </DialogContent>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Punto de Venta" />
            <div className="bg-background min-h-screen">
                <div className="mx-auto flex h-full max-w-[1600px] flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
                    {/* Header de Lovable */}
                    <header className="from-primary to-primary/80 relative overflow-hidden rounded-xl bg-gradient-to-r p-6 shadow-lg">
                        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <h1 className="text-primary-foreground text-2xl font-bold tracking-tight sm:text-3xl">Punto de Venta</h1>
                                <p className="text-primary/70 text-sm">Gestión integral de ventas y transacciones</p>
                            </div>
                            <Badge
                                variant="secondary"
                                className="bg-primary/20 text-primary-foreground w-fit border-0 px-3 py-1.5 text-xs font-medium"
                            >
                                {meta.role_usuario === 'admin' ? 'Administrador' : 'Vendedor'}
                            </Badge>
                        </div>
                        <ShoppingBag size={120} className="text-primary-foreground/10 pointer-events-none absolute -right-6 -bottom-6" />
                    </header>

                    {/* Info usuario */}
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <p>
                            Rol Actual del Vendedor:{' '}
                            <span className="text-primary font-medium">{meta.role_usuario === 'admin' ? 'Administrador' : 'Vendedor'}</span>
                        </p>
                        <div className="flex items-center gap-2">
                            <Link href={route('ventas.cierres')}>
                                <Button variant="secondary" className="flex items-center gap-2">
                                    <BarChartIcon size={16} />
                                    Cierres de Caja
                                </Button>
                            </Link>
                            <Link href={route('ventas.listado')}>
                                <Button variant="secondary" className="flex items-center gap-2">
                                    <Eye size={16} />
                                    Mis Ventas
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <Separator />

                    {/* Main grid */}
                    <div className="grid flex-1 auto-rows-min gap-4 lg:grid-cols-3 lg:gap-6">
                        {/* Left column - Products */}
                        <div className="space-y-4 lg:col-span-2 lg:space-y-6">
                            {/* Configuración */}
                            <Card className="overflow-hidden border-0 shadow-lg">
                                <CardHeader className="from-secondary to-secondary/50 bg-gradient-to-r pb-4">
                                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                        <Building2 className="text-primary h-5 w-5" />
                                        Configuración de Venta
                                    </CardTitle>
                                    <CardDescription className="text-xs">Seleccione almacén y cliente para comenzar</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-5">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="almacen" className="text-sm font-medium">
                                                Almacén
                                            </Label>
                                            <Select value={almacenSeleccionado} onValueChange={handleAlmacenChange}>
                                                <SelectTrigger className="h-11">
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
                                            <Label htmlFor="cliente" className="text-sm font-medium">
                                                Cliente
                                            </Label>
                                            <Select value={clienteSeleccionado} onValueChange={handleClienteChange}>
                                                <SelectTrigger className="h-11">
                                                    <SelectValue placeholder="Seleccionar cliente (Opcional)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <ScrollArea className="max-h-60">
                                                        {clientes.map((cliente) => (
                                                            <SelectItem key={cliente.id} value={cliente.id.toString()}>
                                                                {cliente.nombre_cliente}
                                                            </SelectItem>
                                                        ))}
                                                    </ScrollArea>
                                                    <Separator className="my-1" />
                                                    <div
                                                        className="flex cursor-pointer items-center gap-2 p-2 text-sm text-blue-600 hover:bg-accent"
                                                        onClick={() => setIsCrearClienteDialogOpen(true)}
                                                    >
                                                        <PlusCircle className="h-4 w-4" />
                                                        Crear Nuevo Cliente
                                                    </div>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {almacenSeleccionado && (
                                        <div className="animate-fade-in mt-5 space-y-2">
                                            <Label htmlFor="busqueda" className="text-sm font-medium">
                                                Buscar Productos
                                            </Label>
                                            <div className="relative">
                                                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                                <Input
                                                    placeholder="Nombre, marca, categoría o código de barras..."
                                                    value={busqueda}
                                                    onChange={(e) => setBusqueda(e.target.value)}
                                                    className="h-11 pl-10"
                                                />
                                                {busqueda && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={limpiarBusqueda}
                                                        className="hover:bg-destructive/10 absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 p-0"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Productos */}
                            {almacenSeleccionado && (
                                <Card className="animate-fade-in overflow-hidden border-0 shadow-lg" style={{ minHeight: '500px' }}>
                                    <CardHeader className="from-secondary to-secondary/50 bg-gradient-to-r pb-4">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                                <BoxesIcon className="text-success h-5 w-5" />
                                                Productos Disponibles
                                            </CardTitle>
                                            {productosFiltrados.length > 0 && (
                                                <Badge variant="secondary" className="text-xs font-medium">
                                                    {productosFiltrados.length} productos
                                                </Badge>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-5">
                                        {productosFiltrados.length > 0 ? (
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                                {productosFiltrados.map((producto, index) => {
                                                    const stockStatus = getStockStatus(producto.stock_disponible);
                                                    return (
                                                        <div
                                                            key={producto.id}
                                                            className="group bg-card hover:border-primary/30 animate-fade-in overflow-hidden rounded-lg border transition-all duration-300 hover:shadow-xl"
                                                            style={{ animationDelay: `${index * 50}ms` }}
                                                        >
                                                            <div className="bg-secondary relative aspect-[4/3] overflow-hidden">
                                                                <img
                                                                    src={producto.imagen_url || '/placeholder-product.png'}
                                                                    alt={producto.nombre_producto}
                                                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                                    onError={(e) => (e.currentTarget.src = '/placeholder-product.png')}
                                                                />
                                                                <div className="absolute top-2 right-2">
                                                                    <Badge variant={stockStatus.variant} className="text-xs font-medium shadow-md">
                                                                        {stockStatus.label}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <div className="p-4">
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <h3 className="text-foreground hover:text-primary line-clamp-2 cursor-help text-sm leading-tight font-semibold transition-colors">
                                                                                {producto.nombre_producto}
                                                                            </h3>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="top" className="max-w-xs p-3">
                                                                            <div className="space-y-2">
                                                                                <p className="text-sm font-semibold">{producto.nombre_producto}</p>
                                                                                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                                                                                    <span className="text-muted-foreground">Marca:</span>
                                                                                    <span className="font-medium">
                                                                                        {producto.marca_producto || 'N/A'}
                                                                                    </span>
                                                                                    <span className="text-muted-foreground">Categoría:</span>
                                                                                    <span className="font-medium">
                                                                                        {producto.categoria_nombre || 'N/A'}
                                                                                    </span>
                                                                                    <span className="text-muted-foreground">Stock:</span>
                                                                                    <span className="text-success font-bold">
                                                                                        {producto.stock_disponible} unid.
                                                                                    </span>
                                                                                    <span className="text-muted-foreground">Código:</span>
                                                                                    <span className="font-mono text-xs">
                                                                                        {producto.codigo_barras}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                                <p className="text-muted-foreground mt-1.5 text-xs">
                                                                    {producto.marca_producto || 'Sin marca'} •{' '}
                                                                    {producto.categoria_nombre || 'Sin categoría'}
                                                                </p>
                                                                <div className="mt-4 flex items-end justify-between">
                                                                    <div>
                                                                        <p className="text-muted-foreground mb-0.5 text-xs">Precio</p>
                                                                        {producto.precio_venta && producto.precio_venta > 0 ? (
                                                                            <p className="text-success text-xl font-bold">
                                                                                ${producto.precio_venta.toFixed(2)}
                                                                            </p>
                                                                        ) : (
                                                                            <p className="text-destructive text-sm font-medium">Sin precio</p>
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
                                                                        className="bg-primary text-primary-foreground h-10 w-10 rounded-full p-0 shadow-md transition-all hover:scale-105 hover:shadow-lg disabled:opacity-50"
                                                                        title="Agregar al carrito"
                                                                    >
                                                                        <Plus className="h-5 w-5" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="flex h-48 flex-col items-center justify-center text-center">
                                                <BoxesIcon className="text-muted-foreground/30 mb-3 h-12 w-12" />
                                                <p className="text-muted-foreground text-sm">
                                                    {busqueda
                                                        ? 'No hay productos que coincidan con la búsqueda'
                                                        : 'Selecciona un almacén para ver productos'}
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

                        {/* Right column - Carrito Sticky */}
                        <div className="space-y-6 lg:sticky lg:top-4 lg:self-start">
                            <Card className="overflow-hidden border-0 shadow-lg">
                                <CardHeader className="from-primary/10 to-primary/5 bg-gradient-to-r pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                            <ShoppingCart className="text-primary h-5 w-5" />
                                            Carrito de Compras
                                        </CardTitle>
                                        {carrito.length > 0 && (
                                            <Badge variant="secondary" className="ml-2">
                                                {carrito.length}
                                            </Badge>
                                        )}
                                    </div>
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
                                                <div
                                                    key={item.id}
                                                    className="bg-secondary/30 hover:bg-secondary/50 space-y-3 rounded-lg border p-3 transition-colors"
                                                >
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
                                            <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm">
                                                <div className="flex items-start">
                                                    <div className="flex-shrink-0">
                                                        <Info className="mt-0.5 h-4 w-4 text-blue-400" />
                                                    </div>
                                                    <div className="ml-2">
                                                        <p className="font-medium text-blue-700">Stock será reservado</p>
                                                        <p className="mt-1 text-xs text-blue-600">
                                                            Al procesar la venta, el stock será reservado inmediatamente y no estará disponible para
                                                            otros usuarios.
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
                                                    <AlertDialogContent className="max-h-[500px] overflow-y-auto p-0 sm:max-w-[800px]">
                                                        <AlertDialogHeader className="from-secondary to-secondary/50 border-b bg-gradient-to-r px-6 pt-6 pb-4">
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    <AlertDialogTitle className="text-xl font-bold">Procesar Venta</AlertDialogTitle>
                                                                    <AlertDialogDescription className="mt-1 text-sm">
                                                                        Complete la información de pago para finalizar la venta
                                                                    </AlertDialogDescription>
                                                                </div>
                                                                <div className="bg-card min-w-[200px] rounded-lg border p-3 shadow-sm">
                                                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                                                        <div>
                                                                            <p className="text-muted-foreground mb-0.5">Total</p>
                                                                            <p className="text-primary text-sm font-bold">
                                                                                ${calcularTotal.toFixed(2)}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-muted-foreground mb-0.5">Pagado</p>
                                                                            <p className="text-sm font-bold text-green-600">
                                                                                ${totalPaid.toFixed(2)}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-muted-foreground mb-0.5">Restante</p>
                                                                            <p
                                                                                className={`text-sm font-bold ${remainingInUsd > 0.01 ? 'text-red-600' : 'text-green-600'}`}
                                                                            >
                                                                                ${Math.max(0, remainingInUsd).toFixed(2)}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </AlertDialogHeader>
                                                        <div className="grid max-h-[calc(90vh-200px)] overflow-hidden md:grid-cols-2">
                                                            <div className="overflow-y-auto border-r p-6">
                                                                <h4 className="mb-3 flex items-center gap-2 font-medium">
                                                                    <DollarSign className="text-primary h-4 w-4" />
                                                                    Agregar Pago
                                                                </h4>
                                                                <div className="space-y-4">
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
                                                                                        referencia:
                                                                                            value === 'efectivo' ? '' : currentPayment.referencia,
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
                                                                                    setCurrentPayment({
                                                                                        ...currentPayment,
                                                                                        exchangeRate: e.target.value,
                                                                                    })
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
                                                                                    setCurrentPayment({
                                                                                        ...currentPayment,
                                                                                        referencia: e.target.value,
                                                                                    });
                                                                                }}
                                                                                placeholder="Ingrese el número de referencia"
                                                                                required
                                                                                className="h-10"
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
                                                                                        setCurrentPayment({
                                                                                            ...currentPayment,
                                                                                            amount: e.target.value,
                                                                                        });
                                                                                    }}
                                                                                    placeholder="0.00"
                                                                                    className="h-12 text-lg font-medium"
                                                                                />
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
                                                                                        (currentPayment.method === 'transferencia' &&
                                                                                            !currentPayment.via) ||
                                                                                        (currentPayment.method === 'transferencia' &&
                                                                                            !currentPayment.referencia) ||
                                                                                        !currentPayment.amount ||
                                                                                        parseFloat(currentPayment.amount) <= 0 ||
                                                                                        !currentPayment.cuenta_id
                                                                                    }
                                                                                    className="h-12 w-full"
                                                                                >
                                                                                    Agregar
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="bg-secondary/30 overflow-y-auto p-6">
                                                                {payments.length > 0 && (
                                                                    <div className="mb-6 rounded-lg border p-4">
                                                                        <h4 className="mb-3 font-medium">Pagos Agregados ({payments.length})</h4>
                                                                        <div className="space-y-2">
                                                                            {payments.map((payment) => (
                                                                                <div
                                                                                    key={payment.id}
                                                                                    className="bg-card animate-scale-in flex items-center justify-between rounded border p-3 shadow-sm"
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
                                                            </div>
                                                        </div>
                                                        <div className="border-t p-6 pt-4">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-medium">Total a pagar:</span>
                                                                <span className="text-lg font-bold text-emerald-600">
                                                                    ${calcularTotal.toFixed(2)} USD
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-medium">Pagado:</span>
                                                                <span className="text-lg font-bold text-emerald-600">
                                                                    ${totalPaid.toFixed(2)} USD
                                                                </span>
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
                                                        <AlertDialogFooter className="border-t p-6">
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
                </div>
            </div>
            <Dialog open={isCrearClienteDialogOpen} onOpenChange={setIsCrearClienteDialogOpen}>
                <CrearClienteDialogContent />
            </Dialog>
            <Toaster position="top-center" />
        </AppLayout>
    );
}
