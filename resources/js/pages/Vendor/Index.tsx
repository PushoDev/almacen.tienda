import HeadingSmall from '@/components/heading-small';
import PaymentForm from '@/components/ventas/PaymentForm';
import PaymentList from '@/components/ventas/PaymentList';
import {
    AlertDialog,
    AlertDialogAction,
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
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertTriangle,
    BarChartIcon,
    BoxesIcon,
    Building2,
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
interface ProductoCodigoVenta {
    id: number;
    codigo_barras: string;
    cantidad: number;
    es_default?: boolean;
}
interface Producto {
    id: number | string;
    nombre_producto: string;
    marca_producto: string;
    modelo_producto?: string;
    capacidad_producto?: string;
    categoria_nombre: string;
    precio_compra_producto: number;
    stock_disponible: number;
    precio_venta: number | null;
    tiene_precio: boolean;
    imagen_url: string;
    codigo_barras: string;
    codigos?: ProductoCodigoVenta[];
    barcode_image_url: string | null;
    precio_base: number | null;
    comision: number;
    es_precio_vendedor: boolean;
}
interface ItemCarrito {
    id: string;
    producto: Producto;
    producto_codigo_id: number;
    codigo_barras_usado: string;
    cantidad: number;
    precio_venta: number;
    precio_base: number;
    comision: number;
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
    cuenta_id?: string | null;
    cliente_id?: string | null;
    referencia?: string;
    moneda_info?: {
        codigo: string;
        nombre: string;
        simbolo: string;
    };
}
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Productos', href: '/listado-productos' },
    { title: 'Punto de Ventas', href: '#' },
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
    const [codigoSeleccionadoPorProducto, setCodigoSeleccionadoPorProducto] = useState<Record<string, number>>({});
    const [procesandoVenta, setProcesandoVenta] = useState<boolean>(false);
    const [payments, setPayments] = useState<Payment[]>([]);
    // ── Venta Especial ────────────────────────────────────────────────────────
    const [esVentaEspecial, setEsVentaEspecial] = useState<boolean>(false);
    const [motivoEspecial, setMotivoEspecial] = useState<string>('');
    const [productoSinComisionPendiente, setProductoSinComisionPendiente] = useState<{ id: string; nuevoPrecio: number } | null>(null);
    // Valores de texto del input de precio por item — se aplican solo al salir del campo
    const [preciosInput, setPreciosInput] = useState<Record<string, string>>({});

    const [clientesFisicos, setClientesFisicos] = useState<Cliente[]>([]);
    const [cargandoClientesFisicos, setCargandoClientesFisicos] = useState<boolean>(false);

    const [isCrearClienteDialogOpen, setIsCrearClienteDialogOpen] = useState(false);

    const [productoVistaRapida, setProductoVistaRapida] = useState<Producto | null>(null);
    const [isVistaRapidaOpen, setIsVistaRapidaOpen] = useState(false);

    const currencies = useMemo(() => {
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
            setMonedas(meta.monedas);
            const principal = meta.monedas.find((m) => m.principal) || meta.monedas[0];
            if (principal) {
                setMonedaPrincipal(principal);
                setTasaCambioPrincipal(principal.tasa_cambio);
            }
        }
    }, [meta.monedas]);

    const cargarAlmacenes = async () => {
        try {
            const response = await axios.get(route('ventas.getAlmacenes'));
            setAlmacenes(response.data);
        } catch (error) {
            console.error('Error al cargar almacenes:', error);
            toast.error('Error al cargar almacenes');
        }
    };

    const cargarClientes = async () => {
        try {
            const response = await axios.get(route('ventas.getClientes'));
            setClientes(response.data);
        } catch (error) {
            console.error('Error al cargar clientes:', error);
            toast.error('Error al cargar clientes');
        }
    };

    const cargarClientesFisicos = async () => {
        setCargandoClientesFisicos(true);
        try {
            const response = await axios.get(route('ventas.getClientesFisicosParaPago'));
            setClientesFisicos(response.data);
        } catch (error) {
            console.error('Error al cargar clientes físicos:', error);
            toast.error('Error al cargar clientes físicos');
            setClientesFisicos([]);
        } finally {
            setCargandoClientesFisicos(false);
        }
    };

    const cargarProductos = async (almacenId: string) => {
        if (!almacenId) {
            setProductos([]);
            return;
        }
        try {
            const response = await axios.get(route('ventas.getProductosPorAlmacen', almacenId));
            const productosProcesados = response.data.map((producto: Producto) => ({
                ...producto,
                precio_venta: producto.precio_venta ? Number(producto.precio_venta) : null,
                precio_compra_producto: producto.precio_compra_producto ? Number(producto.precio_compra_producto) : 0,
                stock_disponible: Number(producto.stock_disponible) || 0,
                imagen_url: producto.imagen_url || '/placeholder-product.png',
                codigo_barras: producto.codigo_barras || 'N/A',
                codigos: (producto.codigos || []).map((codigo) => ({
                    ...codigo,
                    id: Number(codigo.id),
                    cantidad: Number(codigo.cantidad) || 0,
                })),
            }));
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
        cargarClientesFisicos();
    }, []);

    const handleAlmacenChange = (value: string) => {
        console.log('Almacén seleccionado:', value);
        setAlmacenSeleccionado(value);
        cargarProductos(value);
        setBusqueda('');
        setCarrito([]);
        setCodigoSeleccionadoPorProducto({});
    };

    const handleClienteChange = (value: string) => {
        console.log('Cliente seleccionado:', value);
        setClienteSeleccionado(value);
    };

    const productosFiltrados = useMemo(() => {
        if (!busqueda.trim()) return productos;
        const termino = busqueda.toLowerCase().trim();
        return productos.filter(
                (producto) =>
                    (producto.nombre_producto?.toLowerCase().includes(termino) ||
                        producto.marca_producto?.toLowerCase().includes(termino) ||
                        producto.codigo_barras?.toLowerCase().includes(termino) ||
                        producto.codigos?.some((codigo) => codigo.codigo_barras.toLowerCase().includes(termino)) ||
                        producto.categoria_nombre?.toLowerCase().includes(termino)) ??
                false,
        );
    }, [productos, busqueda]);

    const limpiarBusqueda = () => {
        setBusqueda('');
    };

    const obtenerCodigosDisponibles = (producto: Producto): ProductoCodigoVenta[] => {
        return (producto.codigos || []).filter((codigo) => codigo.cantidad > 0);
    };

    const resolverCodigoParaVenta = (producto: Producto, codigoForzadoId?: number): ProductoCodigoVenta | null => {
        const codigosDisponibles = obtenerCodigosDisponibles(producto);

        if (codigosDisponibles.length === 0) {
            return null;
        }

        if (codigoForzadoId) {
            return codigosDisponibles.find((codigo) => codigo.id === codigoForzadoId) || null;
        }

        const keyProducto = String(producto.id);
        const codigoSeleccionado = codigoSeleccionadoPorProducto[keyProducto];
        if (codigoSeleccionado) {
            const codigoPorSeleccion = codigosDisponibles.find((codigo) => codigo.id === codigoSeleccionado);
            if (codigoPorSeleccion) {
                return codigoPorSeleccion;
            }
        }

        const termino = busqueda.trim().toLowerCase();
        if (termino) {
            const codigoEscaneado = codigosDisponibles.find((codigo) => codigo.codigo_barras.toLowerCase() === termino);
            if (codigoEscaneado) {
                return codigoEscaneado;
            }
        }

        if (codigosDisponibles.length === 1) {
            return codigosDisponibles[0];
        }

        return codigosDisponibles.find((codigo) => codigo.es_default) || codigosDisponibles[0];
    };

    const agregarAlCarrito = (producto: Producto, codigoForzadoId?: number) => {
        if (!esVentaEspecial && (!producto.tiene_precio || !producto.precio_venta || producto.precio_venta <= 0)) {
            toast.error('Este producto no tiene un precio de venta configurado');
            return;
        }
        if (producto.stock_disponible <= 0) {
            toast.error('Stock insuficiente para este producto');
            return;
        }

        const codigoVenta = resolverCodigoParaVenta(producto, codigoForzadoId);
        if (!codigoVenta) {
            toast.error('No hay stock disponible en los códigos de barras de este producto');
            return;
        }

        const stockMaximoPorCodigo = Math.min(producto.stock_disponible, codigoVenta.cantidad);
        const idItem = `${producto.id}-${codigoVenta.id}`;
        const itemExistente = carrito.find((item) => item.id === idItem);

        if (itemExistente) {
            const nuevaCantidad = Math.min(itemExistente.cantidad + 1, stockMaximoPorCodigo);
            if (nuevaCantidad === itemExistente.cantidad) {
                toast.warning(`No hay más stock disponible para el código ${codigoVenta.codigo_barras}`);
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
            const precioVenta = producto.precio_venta ?? 0;
            const precioBase  = producto.precio_base ?? precioVenta;
            const nuevoItem: ItemCarrito = {
                id: idItem,
                producto: producto,
                producto_codigo_id: codigoVenta.id,
                codigo_barras_usado: codigoVenta.codigo_barras,
                cantidad: 1,
                precio_venta: precioVenta,
                precio_base: precioBase,
                comision: producto.comision ?? 0,
                subtotal: precioVenta,
            };
            setCarrito([...carrito, nuevoItem]);
            toast.success(`Producto agregado (${codigoVenta.codigo_barras})`);
        }
    };

    const actualizarCantidad = (id: string, nuevaCantidad: number) => {
        if (nuevaCantidad < 1) return;
        const item = carrito.find((item) => item.id === id);
        if (!item) return;
        const codigo = item.producto.codigos?.find((c) => c.id === item.producto_codigo_id);
        const stockCodigo = codigo ? Number(codigo.cantidad) : 0;
        const stockMaximo = Math.min(item.producto.stock_disponible, stockCodigo);

        if (nuevaCantidad > stockMaximo) {
            nuevaCantidad = stockMaximo;
            toast.warning(`No hay más stock disponible para el código ${item.codigo_barras_usado}`);
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

        const item = carrito.find((i) => i.id === id);
        if (!item) return;

        const precioMinimo = item.precio_base - item.comision;

        if (!esVentaEspecial && nuevoPrecio < precioMinimo) {
            if (item.comision === 0) {
                // Sin comisión: mostrar AlertDialog antes de convertir en especial
                setProductoSinComisionPendiente({ id, nuevoPrecio });
                return;
            } else {
                // Por debajo del límite: activar venta especial automáticamente
                setEsVentaEspecial(true);
                toast.warning('Precio por debajo del límite permitido. Se activó Venta Especial automáticamente.');
            }
        }

        setCarrito((prev) =>
            prev.map((i) =>
                i.id === id
                    ? { ...i, precio_venta: nuevoPrecio, subtotal: i.cantidad * nuevoPrecio }
                    : i,
            ),
        );
    };

    // Aplica el precio solo cuando el usuario sale del campo (onBlur / Enter)
    const confirmarPrecio = (id: string) => {
        const texto = preciosInput[id];

        // Limpiar siempre el estado temporal
        setPreciosInput((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });

        if (texto === undefined) return;

        const valor = parseFloat(texto);
        if (isNaN(valor) || valor < 0) return; // valor inválido: el input vuelve al precio del carrito

        actualizarPrecio(id, valor);
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
        const codigo = item?.producto.codigos?.find((c) => c.id === item?.producto_codigo_id);
        const stockCodigo = codigo ? Number(codigo.cantidad) : 0;
        const stockMaximo = item ? Math.min(item.producto.stock_disponible, stockCodigo) : 0;

        if (item && item.cantidad < stockMaximo) {
            actualizarCantidad(id, item.cantidad + 1);
        } else {
            toast.warning(item ? `No hay más stock para el código ${item.codigo_barras_usado}` : 'No hay más stock disponible');
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

    const handleRemovePayment = (id: string) => {
        setPayments(payments.filter((payment) => payment.id !== id));
        toast.info('Pago removido');
    };

    const handleSeleccionCodigoProducto = (productoId: string | number, codigoId: string) => {
        if (!codigoId) {
            return;
        }

        setCodigoSeleccionadoPorProducto((prev) => ({
            ...prev,
            [String(productoId)]: Number(codigoId),
        }));
    };

    const handleAgregarDesdeBusqueda = () => {
        const termino = busqueda.trim().toLowerCase();
        if (!termino) {
            return;
        }

        for (const producto of productos) {
            const codigoExacto = (producto.codigos || []).find((codigo) => codigo.codigo_barras.toLowerCase() === termino);
            if (codigoExacto) {
                agregarAlCarrito(producto, codigoExacto.id);
                setBusqueda('');
                return;
            }
        }

        const productoPrincipal = productos.find((producto) => (producto.codigo_barras || '').toLowerCase() === termino);
        if (productoPrincipal) {
            agregarAlCarrito(productoPrincipal);
            setBusqueda('');
        }
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

            const codigo = producto.codigos?.find((c) => c.id === item.producto_codigo_id);
            if (!codigo || codigo.cantidad < item.cantidad) {
                toast.error(`Stock insuficiente para el código ${item.codigo_barras_usado}`);
                return;
            }
        }
        for (const item of carrito) {
            // En ventas especiales el precio puede ser 0 (regalo)
            if (!esVentaEspecial && (!item.precio_venta || item.precio_venta < 0)) {
                toast.error(`Precio inválido para: ${item.producto.nombre_producto}`);
                return;
            }
        }
        if (esVentaEspecial && !motivoEspecial.trim()) {
            toast.error('Debe ingresar el motivo de la venta especial');
            return;
        }
        const esRegalo = esVentaEspecial && calcularTotal === 0;
        if (!esRegalo && remainingInUsd > 0.01) {
            toast.error(`El total a pagar no ha sido cubierto. Restante: $${remainingInUsd.toFixed(2)} USD`);
            return;
        }
        if (!esRegalo && payments.length === 0) {
            toast.error('Debe agregar al menos un método de pago para completar la venta.');
            return;
        }

        const datosVenta = {
            almacen_id: almacenSeleccionado,
            cliente_id: clienteSeleccionado || null,
            items: carrito.map((item) => ({
                producto_id: item.producto.id,
                producto_codigo_id: item.producto_codigo_id,
                cantidad: item.cantidad,
                precio_venta: item.precio_venta,
                precio_base: item.precio_base, // Usar el precio original guardado
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
                cuenta_id: p.cuenta_id || null,
                cliente_id: p.cliente_id || null,
                referencia: p.referencia,
            })),
            moneda_principal_id: monedaPrincipal?.id,
            tasa_cambio_principal: tasaCambioPrincipal,
            es_venta_especial: esVentaEspecial,
            nota_venta_especial: esVentaEspecial ? motivoEspecial.trim() : undefined,
        };

        console.log('Datos de venta a enviar:', datosVenta);

        try {
            setProcesandoVenta(true);
            const response = await axios.post(route('ventas.procesar'), datosVenta);
            console.log('Respuesta del servidor:', response.data);

            if (response.data.success) {
                const msgExito = esVentaEspecial
                    ? '✅ Solicitud especial enviada. El admin revisará tu solicitud.'
                    : '✅ Venta creada correctamente. Stock reservado pendiente de aprobación.';
                toast.success(msgExito);
                setCarrito([]);
                setPayments([]);
                setAlmacenSeleccionado('');
                setClienteSeleccionado('');
                setProductos([]);
                setCodigoSeleccionadoPorProducto({});
                setEsVentaEspecial(false);
                setMotivoEspecial('');
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

    const getStockStatus = (stock: number) => {
        if (stock > 10) return { label: 'Disponible', variant: 'default' as const };
        if (stock > 5) return { label: 'Stock Medio', variant: 'secondary' as const };
        if (stock > 0) return { label: 'Stock Bajo', variant: 'outline' as const };
        return { label: 'Agotado', variant: 'destructive' as const };
    };

    const selectedAlmacen = almacenes.find((almacen) => almacen.id.toString() === almacenSeleccionado) || null;
    const selectedCliente = clientes.find((cliente) => cliente.id.toString() === clienteSeleccionado) || null;

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
            } catch (error: unknown) {
                console.error('Error al crear cliente:', error);
                if (axios.isAxiosError(error) && error.response?.data?.errors) {
                    // setLocalErrors(error.response.data.errors); // Assuming setLocalErrors is local to this component or accessible
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
                    <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                        <HeadingSmall
                            title="Punto de Venta"
                            description="Lugar donde se realizan la entas de los Productos disponibles en La Glorieta Tienda"
                        />
                        <ShoppingBag
                            size={70}
                            color="#f59e0b"
                            className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                        />
                    </div>

                    {/* Info usuario */}
                    <div className="flex items-center justify-between text-sm text-gray-600">
                        <p>
                            Rol Actual del Vendedor:{' '}
                            <span className="text-primary font-medium">
                                {meta.role_usuario === 'admin' ? 'Administrador' : meta.role_usuario === 'moderador' ? 'Moderador' : 'Vendedor'}
                            </span>
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
                                <CardHeader className="from-secondary to-secondary/50 bg-linear-to-r pb-4">
                                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                        <Building2 className="text-primary h-5 w-5" />
                                        Configuración de Venta
                                    </CardTitle>
                                    <CardDescription className="text-xs">Seleccione almacén y cliente para comenzar</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-5">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {/* Seleccionar Almacen */}
                                        <div className="space-y-2">
                                            <Label htmlFor="almacen" className="text-sm font-medium">
                                                Almacén
                                            </Label>
                                            <Combobox
                                                items={almacenes}
                                                itemToStringLabel={(item) => item.nombre_almacen}
                                                itemToStringValue={(item) => item.nombre_almacen}
                                                value={selectedAlmacen}
                                                onValueChange={(almacen) => handleAlmacenChange(almacen ? almacen.id.toString() : '')}
                                            >
                                                <ComboboxInput
                                                    placeholder="Seleccionar almacén"
                                                    showClear={!!almacenSeleccionado}
                                                    className="uppercase"
                                                />
                                                <ComboboxContent>
                                                    <ComboboxEmpty>No se encontraron almacenes.</ComboboxEmpty>
                                                    <ComboboxList>
                                                        {(almacen) => (
                                                            <ComboboxItem key={almacen.id} value={almacen}>
                                                                <span className="uppercase">{almacen.nombre_almacen}</span>
                                                            </ComboboxItem>
                                                        )}
                                                    </ComboboxList>
                                                </ComboboxContent>
                                            </Combobox>
                                        </div>
                                        {/* Seleccionar Cliente registrado del sistema */}
                                        <div className="space-y-2">
                                            <Label htmlFor="cliente" className="text-sm font-medium">
                                                Cliente
                                            </Label>
                                            <Combobox
                                                items={clientes}
                                                itemToStringLabel={(item) => item.nombre_cliente}
                                                itemToStringValue={(item) => item.nombre_cliente}
                                                value={selectedCliente}
                                                onValueChange={(cliente) => handleClienteChange(cliente ? cliente.id.toString() : '')}
                                            >
                                                <ComboboxInput
                                                    placeholder="Seleccionar cliente (Opcional)"
                                                    showClear={!!clienteSeleccionado}
                                                    className="uppercase"
                                                />
                                                <ComboboxContent>
                                                    <ComboboxEmpty>No se encontraron clientes.</ComboboxEmpty>
                                                    <ComboboxList>
                                                        {(cliente) => (
                                                            <ComboboxItem key={cliente.id} value={cliente}>
                                                                <span className="uppercase">{cliente.nombre_cliente}</span>
                                                            </ComboboxItem>
                                                        )}
                                                    </ComboboxList>
                                                    <Separator className="my-1" />
                                                    <div
                                                        className="hover:bg-accent flex cursor-pointer items-center gap-2 p-2 text-sm text-blue-600"
                                                        onClick={() => setIsCrearClienteDialogOpen(true)}
                                                    >
                                                        <PlusCircle className="h-4 w-4" />
                                                        Crear Nuevo Cliente
                                                    </div>
                                                </ComboboxContent>
                                            </Combobox>
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
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleAgregarDesdeBusqueda();
                                                        }
                                                    }}
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
                                <Card className="animate-fade-in min-h-[500px] overflow-hidden border-0 shadow-lg">
                                    <CardHeader className="from-secondary to-secondary/50 bg-linear-to-r pb-4">
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
                                                    const codigosDisponibles = (producto.codigos || []).filter((codigo) => codigo.cantidad > 0);
                                                    const codigoSeleccionadoActual = codigoSeleccionadoPorProducto[String(producto.id)]?.toString() || '';
                                                    return (
                                                        <div
                                                            key={producto.id}
                                                            className="group bg-card hover:border-primary/30 animate-fade-in overflow-hidden rounded-lg border transition-all duration-300 hover:shadow-xl"
                                                            style={{ animationDelay: `${index * 50}ms` }}
                                                        >
                                                            <div className="bg-secondary relative aspect-4/3 overflow-hidden">
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
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                                                                    <Button
                                                                        variant="secondary"
                                                                        size="icon"
                                                                        className="h-12 w-12 cursor-pointer rounded-full shadow-lg transition-transform hover:scale-110"
                                                                        title="Vista Rápida"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setProductoVistaRapida(producto);
                                                                            setIsVistaRapidaOpen(true);
                                                                        }}
                                                                    >
                                                                        <Eye className="h-6 w-6" />
                                                                    </Button>
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
                                                                <div className="mt-2 space-y-1 text-xs">
                                                                    <div className="text-muted-foreground flex gap-1">
                                                                        <span className="font-semibold">Marca:</span>
                                                                        <span className="text-foreground truncate">
                                                                            {producto.marca_producto || 'N/A'}
                                                                        </span>
                                                                    </div>
                                                                {producto.modelo_producto && (
                                                                        <div className="text-muted-foreground flex gap-1">
                                                                            <span className="font-semibold">Modelo:</span>
                                                                            <span className="text-foreground truncate">
                                                                                {producto.modelo_producto}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {producto.capacidad_producto && (
                                                                        <div className="text-muted-foreground flex gap-1">
                                                                            <span className="font-semibold">Capacidad:</span>
                                                                            <span className="text-foreground truncate">
                                                                                {producto.capacidad_producto}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {codigosDisponibles.length > 1 && (
                                                                    <div className="mt-3 space-y-1">
                                                                        <Label className="text-xs">Codebar para esta venta</Label>
                                                                        <Select
                                                                            value={codigoSeleccionadoActual}
                                                                            onValueChange={(value) => handleSeleccionCodigoProducto(producto.id, value)}
                                                                        >
                                                                            <SelectTrigger className="h-8 text-xs">
                                                                                <SelectValue placeholder="Seleccionar código" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {codigosDisponibles.map((codigo) => (
                                                                                    <SelectItem key={codigo.id} value={codigo.id.toString()}>
                                                                                        {codigo.codigo_barras} ({codigo.cantidad})
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                )}
                                                                <div className="mt-4 flex items-end justify-between">
                                                                    <div>
                                                                        <p className="text-muted-foreground mb-0.5 text-xs">Precio</p>
                                                                        {producto.precio_venta && producto.precio_venta > 0 ? (
                                                                            <p className="text-success text-xl font-bold">
                                                                                $
                                                                                {Number(producto.precio_venta).toLocaleString('es-ES', {
                                                                                    minimumFractionDigits: 2,
                                                                                    maximumFractionDigits: 2,
                                                                                })}
                                                                            </p>
                                                                        ) : (
                                                                            <p className="text-destructive text-sm font-medium">Sin precio</p>
                                                                        )}
                                                                    </div>
                                                                    <Button
                                                                        onClick={() => agregarAlCarrito(producto)}
                                                                        disabled={
                                                                            (!esVentaEspecial && (!producto.tiene_precio || !producto.precio_venta || producto.precio_venta <= 0)) ||
                                                                            producto.stock_disponible <= 0 ||
                                                                            codigosDisponibles.length === 0
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
                            <Card className={`overflow-hidden border-0 shadow-lg ${esVentaEspecial ? 'ring-2 ring-amber-400' : ''}`}>
                                <CardHeader className={`pb-4 ${esVentaEspecial ? 'bg-amber-50 dark:bg-amber-950' : 'from-primary/10 to-primary/5 bg-linear-to-r'}`}>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                            <ShoppingCart className={`h-5 w-5 ${esVentaEspecial ? 'text-amber-600' : 'text-primary'}`} />
                                            {esVentaEspecial ? 'Venta Especial' : 'Carrito de Compras'}
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            {carrito.length > 0 && (
                                                <Badge variant={esVentaEspecial ? 'outline' : 'secondary'} className={esVentaEspecial ? 'border-amber-400 text-amber-700' : ''}>
                                                    {carrito.length}
                                                </Badge>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEsVentaEspecial(!esVentaEspecial);
                                                    if (esVentaEspecial) setMotivoEspecial('');
                                                }}
                                                className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors ${
                                                    esVentaEspecial
                                                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300'
                                                        : 'bg-muted text-muted-foreground hover:bg-amber-50 hover:text-amber-600'
                                                }`}
                                                title="Activar modo Venta Especial"
                                            >
                                                <AlertTriangle className="h-3 w-3" />
                                                Especial
                                            </button>
                                        </div>
                                    </div>
                                    {esVentaEspecial && (
                                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                            Precio libre · Sin comisión · Requiere aprobación del admin
                                        </p>
                                    )}
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
                                                            <p className="font-mono text-xs text-gray-500">Codebar: {item.codigo_barras_usado}</p>
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
                                                                disabled={
                                                                    item.cantidad >=
                                                                    Math.min(
                                                                        item.producto.stock_disponible,
                                                                        item.producto.codigos?.find((c) => c.id === item.producto_codigo_id)?.cantidad || 0,
                                                                    )
                                                                }
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <Plus className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                        <div className="text-right">
                                                            <Input
                                                                type="number"
                                                                value={preciosInput[item.id] ?? item.precio_venta}
                                                                onChange={(e) =>
                                                                    setPreciosInput((prev) => ({ ...prev, [item.id]: e.target.value }))
                                                                }
                                                                onBlur={() => confirmarPrecio(item.id)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') e.currentTarget.blur();
                                                                }}
                                                                className="w-20 text-sm"
                                                                min="0"
                                                                step="0.01"
                                                            />
                                                            <p className="mt-1 text-sm font-medium text-emerald-600">
                                                                $
                                                                {Number(item.subtotal).toLocaleString('es-ES', {
                                                                    minimumFractionDigits: 2,
                                                                    maximumFractionDigits: 2,
                                                                })}
                                                            </p>
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
                                                    <div className="shrink-0">
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
                                                    <span className="text-xl font-bold text-emerald-600">
                                                        $
                                                        {Number(calcularTotal).toLocaleString('es-ES', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}
                                                    </span>
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
                                                    <AlertDialogContent className="max-h-[700px] overflow-y-auto p-0 sm:max-w-[1024px]">
                                                        <AlertDialogHeader className="from-secondary to-secondary/50 border-b bg-linear-to-r px-6 pt-6 pb-4">
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
                                                                                $
                                                                                {Number(calcularTotal).toLocaleString('es-ES', {
                                                                                    minimumFractionDigits: 2,
                                                                                    maximumFractionDigits: 2,
                                                                                })}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-muted-foreground mb-0.5">Pagado</p>
                                                                            <p className="text-sm font-bold text-green-600">
                                                                                $
                                                                                {Number(totalPaid).toLocaleString('es-ES', {
                                                                                    minimumFractionDigits: 2,
                                                                                    maximumFractionDigits: 2,
                                                                                })}
                                                                            </p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-muted-foreground mb-0.5">Restante</p>
                                                                            <p
                                                                                className={`text-sm font-bold ${remainingInUsd > 0.01 ? 'text-red-600' : 'text-green-600'}`}
                                                                            >
                                                                                $
                                                                                {Number(Math.max(0, remainingInUsd)).toLocaleString('es-ES', {
                                                                                    minimumFractionDigits: 2,
                                                                                    maximumFractionDigits: 2,
                                                                                })}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </AlertDialogHeader>
                                                        <div className="grid max-h-[calc(90vh-200px)] overflow-hidden md:grid-cols-2">
                                                            <div className="overflow-y-auto border-r p-6">
                                                                {/* Motivo venta especial */}
                                                                {esVentaEspecial && (
                                                                    <div className="mb-4 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                                                                        <Label className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300">
                                                                            <AlertTriangle className="h-4 w-4" />
                                                                            Motivo de la Venta Especial *
                                                                        </Label>
                                                                        <textarea
                                                                            value={motivoEspecial}
                                                                            onChange={(e) => setMotivoEspecial(e.target.value)}
                                                                            placeholder="Ej: Rotura de equipo, regalo al cliente..."
                                                                            rows={2}
                                                                            className="border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Regalo: sin pagos */}
                                                                {esVentaEspecial && calcularTotal === 0 ? (
                                                                    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-8 text-center dark:border-amber-700 dark:bg-amber-950">
                                                                        <ShoppingBag className="h-10 w-10 text-amber-400" />
                                                                        <p className="font-semibold text-amber-700 dark:text-amber-300">Este producto será entregado como regalo</p>
                                                                        <p className="text-sm text-amber-600 dark:text-amber-400">
                                                                            Precio $0.00 — No se requiere ningún pago.
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    <PaymentForm
                                                                        monedas={monedas}
                                                                        clientesFisicos={clientesFisicos}
                                                                        remainingInUsd={remainingInUsd}
                                                                        onAddPayment={(payment) => setPayments((prev) => [...prev, payment])}
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="bg-secondary/30 overflow-y-auto p-6">
                                                                <PaymentList
                                                                    payments={payments}
                                                                    total={calcularTotal}
                                                                    onRemovePayment={handleRemovePayment}
                                                                />
                                                            </div>
                                                        </div>
                                                        <AlertDialogFooter className="border-t p-6">
                                                            <Button
                                                                onClick={handleCompleteSale}
                                                                disabled={
                                                                    procesandoVenta ||
                                                                    (esVentaEspecial && calcularTotal === 0
                                                                        ? false
                                                                        : remainingInUsd > 0.01 || payments.length === 0)
                                                                }
                                                                className={`w-full ${esVentaEspecial ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                                                                size="lg"
                                                            >
                                                                {procesandoVenta ? (
                                                                    <>
                                                                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                                                                        Procesando...
                                                                    </>
                                                                ) : esVentaEspecial ? (
                                                                    <>
                                                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                                                        Enviar Solicitud Especial
                                                                    </>
                                                                ) : (
                                                                    'Procesar Venta'
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
            {/* Modal de Vista Rápida */}
            <Dialog open={isVistaRapidaOpen} onOpenChange={setIsVistaRapidaOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Detalles del Producto</DialogTitle>
                        <DialogDescription>Información detallada del producto seleccionado.</DialogDescription>
                    </DialogHeader>

                    {productoVistaRapida && (() => {
                        const codigosDisponiblesModal = (productoVistaRapida.codigos || []).filter((c) => c.cantidad > 0);
                        const codigoSeleccionadoModal = codigoSeleccionadoPorProducto[String(productoVistaRapida.id)]?.toString() || '';
                        return (
                        <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2">
                            {/* Columna de Imagen */}
                            <div className="space-y-4">
                                <div className="bg-muted relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border">
                                    <img
                                        src={productoVistaRapida.imagen_url}
                                        alt={productoVistaRapida.nombre_producto}
                                        className="h-full w-full object-contain"
                                    />
                                </div>
                                {productoVistaRapida.barcode_image_url && (
                                    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border bg-white p-2">
                                        <img
                                            src={productoVistaRapida.barcode_image_url}
                                            alt="Código de Barras"
                                            className="h-16 max-w-full object-contain"
                                        />
                                        <span className="text-muted-foreground font-mono text-xs">{productoVistaRapida.codigo_barras}</span>
                                    </div>
                                )}
                            </div>

                            {/* Columna de Detalles */}
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg leading-tight font-bold">{productoVistaRapida.nombre_producto}</h3>
                                    <p className="text-muted-foreground mt-1 text-sm">
                                        {productoVistaRapida.marca_producto} {productoVistaRapida.modelo_producto}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground text-xs tracking-wider uppercase">Categoría</p>
                                        <p className="font-medium">{productoVistaRapida.categoria_nombre}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground text-xs tracking-wider uppercase">Capacidad</p>
                                        <p className="font-medium">{productoVistaRapida.capacidad_producto || 'N/A'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground text-xs tracking-wider uppercase">Stock</p>
                                        <Badge variant={getStockStatus(productoVistaRapida.stock_disponible).variant}>
                                            {productoVistaRapida.stock_disponible} Unidades
                                        </Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-muted-foreground text-xs tracking-wider uppercase">Código</p>
                                        {codigosDisponiblesModal.length > 1 ? (
                                            <Select
                                                value={codigoSeleccionadoModal}
                                                onValueChange={(value) => handleSeleccionCodigoProducto(productoVistaRapida.id, value)}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue placeholder="Seleccionar código" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {codigosDisponiblesModal.map((codigo) => (
                                                        <SelectItem key={codigo.id} value={codigo.id.toString()}>
                                                            {codigo.codigo_barras} ({codigo.cantidad})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <p className="font-mono">{codigosDisponiblesModal[0]?.codigo_barras ?? productoVistaRapida.codigo_barras}</p>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-3">
                                    <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
                                        <span className="font-medium">Precio de Venta</span>
                                        <div className="text-right">
                                            {productoVistaRapida.tiene_precio ? (
                                                <span className="text-primary text-xl font-bold">
                                                    ${Number(productoVistaRapida.precio_venta).toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="text-destructive text-sm font-medium">No definido</span>
                                            )}
                                        </div>
                                    </div>

                                    {(meta.role_usuario === 'admin' || meta.role_usuario === 'moderador') && (
                                        <div className="text-muted-foreground flex items-center justify-between px-2 text-xs">
                                            <span>Costo unitario:</span>
                                            <span>${Number(productoVistaRapida.precio_compra_producto).toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-4">
                                    <Button
                                        className="w-full"
                                        onClick={() => {
                                            agregarAlCarrito(productoVistaRapida);
                                            setIsVistaRapidaOpen(false);
                                        }}
                                        disabled={
                                            !productoVistaRapida.tiene_precio ||
                                            productoVistaRapida.stock_disponible <= 0 ||
                                            codigosDisponiblesModal.length === 0
                                        }
                                    >
                                        <ShoppingCart className="mr-2 h-4 w-4" />
                                        Agregar a la Venta
                                    </Button>
                                </div>
                            </div>
                        </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* AlertDialog: producto sin comisión — requiere aprobación del admin */}
            <AlertDialog
                open={!!productoSinComisionPendiente}
                onOpenChange={(open) => { if (!open) setProductoSinComisionPendiente(null); }}
            >
                <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
                            <AlertTriangle className="h-5 w-5" />
                            Producto sin comisión configurada
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2 text-sm">
                            <span className="block">
                                Este producto no tiene comisión asignada. No puedes aplicar un descuento sin autorización del administrador.
                            </span>
                            <span className="block font-medium text-amber-700">
                                Si deseas continuar, la venta se convertirá en una Venta Especial que requiere aprobación del admin antes de completarse.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setProductoSinComisionPendiente(null)}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-amber-600 hover:bg-amber-700"
                            onClick={() => {
                                if (productoSinComisionPendiente) {
                                    const { id, nuevoPrecio } = productoSinComisionPendiente;
                                    setEsVentaEspecial(true);
                                    setCarrito((prev) =>
                                        prev.map((i) =>
                                            i.id === id
                                                ? { ...i, precio_venta: nuevoPrecio, subtotal: i.cantidad * nuevoPrecio }
                                                : i,
                                        ),
                                    );
                                    toast.warning('Venta Especial activada. Recuerda agregar el motivo.');
                                }
                                setProductoSinComisionPendiente(null);
                            }}
                        >
                            Continuar como Venta Especial
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
