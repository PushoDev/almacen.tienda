import HeadingSmall from '@/components/heading-small';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Clock,
    CreditCard,
    DollarSign,
    Hash,
    HardDrive,
    Layers,
    Loader2,
    Package,
    Palette,
    Pencil,
    PlusCircle,
    ShoppingBasket,
    Store,
    Tag,
    Trash2,
    Truck,
    Users,
    Wallet,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';

interface Proveedor {
    id?: number;
    nombre_proveedor?: string;
}

interface Cliente {
    id?: number;
    nombre_cliente?: string;
}

interface Almacen {
    id?: number;
    nombre_almacen: string;
}

interface CuentaPago {
    id: number;
    nombre_cuenta: string;
}

interface ClientePago {
    id: number;
    nombre_cliente: string;
}

interface Pago {
    tipo_pago: 'deuda_proveedor' | 'cuenta' | 'cliente';
    monto: number;
    cuenta: CuentaPago | null;
    cliente: ClientePago | null;
}

type EstadoCompra = 'pendiente' | 'aprobada' | 'anulada';
type TipoAnulacion = 'reversion' | 'fondo' | null;

interface Compra {
    id: number;
    fecha_compra: string;
    total_compra: number;
    tipo_compra: 'pago_cash' | 'deuda_proveedor';
    estado: EstadoCompra;
    tipo_anulacion: TipoAnulacion;
    motivo_anulacion: string | null;
    es_parcial: boolean;
    proveedor?: Proveedor;
    cliente?: Cliente;
    pagos: Pago[];
}

interface ProductoPivot {
    cantidad: number;
    precio: number;
}

interface Producto {
    nombre_producto: string;
    marca_producto: string | null;
    modelo_producto: string | null;
    capacidad_producto: string | null;
    color_producto: string | null;
    codigo_producto: string;
    categoria: string | null;
    pivot: ProductoPivot;
    almacen: Almacen;
    es_producto_nuevo: boolean | null;
}

interface CompraShowProps {
    compra: Compra;
    productos: Producto[];
    success?: string;
}

// Selects que se usan solo dentro del diálogo de edición — se cargan bajo demanda, no al entrar
// a la página, mismas rutas que ya consume Comprar/Index.tsx.
interface AlmacenOpcion {
    id: number;
    nombre_almacen: string;
}
interface CategoriaOpcion {
    id: number;
    nombre_categoria: string;
}
interface CuentaOpcion {
    id: number;
    nombre_cuenta: string;
    saldo_cuenta: number;
}
interface ClienteOpcion {
    id: number;
    nombre_cliente: string;
    deuda_pago_cliente: number | null;
}

interface LineaEditable {
    almacen_id: number | '';
    producto: string;
    marca: string;
    modelo: string;
    capacidad: string;
    color: string;
    categoria: string;
    codigo_barras: string;
    cantidad: number;
    precio: number;
}

interface PagoCuentaEditable {
    cuenta_id: number | '';
    monto: number;
}
interface PagoClienteEditable {
    cliente_id: number | '';
    monto: number;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Compras', href: '/comprar' },
    { title: 'Detalle de Compra', href: '#' },
];

const ESTADO_CONFIG: Record<EstadoCompra, { label: string; icon: typeof Clock; classes: string; iconClasses: string }> = {
    pendiente: {
        label: 'Pendiente de aprobación',
        icon: Clock,
        classes: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300',
        iconClasses: 'text-amber-600 dark:text-amber-400',
    },
    aprobada: {
        label: 'Aprobada',
        icon: CheckCircle2,
        classes: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300',
        iconClasses: 'text-emerald-600 dark:text-emerald-400',
    },
    anulada: {
        label: 'Anulada',
        icon: XCircle,
        classes: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300',
        iconClasses: 'text-red-600 dark:text-red-400',
    },
};

export default function CompraShow({ compra, productos, success }: CompraShowProps) {
    const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    const isDeuda = compra.tipo_compra === 'deuda_proveedor';
    const esProveedor = !!compra.proveedor?.nombre_proveedor;
    const esCliente = !!compra.cliente?.nombre_cliente;
    const nombrePersona = compra.proveedor?.nombre_proveedor || compra.cliente?.nombre_cliente || 'Sin registro';
    const tipoPersona = esProveedor ? 'Proveedor' : esCliente ? 'Cliente' : 'Proveedor';
    const tipoLabel = isDeuda ? 'Crédito' : compra.es_parcial ? 'Parcial' : 'Contado';
    const esPendiente = compra.estado === 'pendiente';
    const estadoInfo = ESTADO_CONFIG[compra.estado];
    const EstadoIcon = estadoInfo.icon;

    // Resumen narrativo de qué pasó con cada fuente de dinero al anular — con nombres y montos
    // reales, no solo "quedó como fondo" genérico. La porción de deuda siempre se cancela, elija
    // lo que elija el usuario; solo cuenta/cliente cambian según 'reversion' vs 'fondo'.
    const resumenAnulacion = (): string[] => {
        if (compra.estado !== 'anulada') return [];

        const lineas: string[] = [];
        const pagoDeuda = compra.pagos.find((p) => p.tipo_pago === 'deuda_proveedor');
        const pagosReales = compra.pagos.filter((p) => p.tipo_pago !== 'deuda_proveedor');

        if (compra.tipo_anulacion === 'reversion') {
            pagosReales.forEach((p) => {
                const nombre = p.tipo_pago === 'cuenta' ? (p.cuenta?.nombre_cuenta ?? 'la cuenta') : (p.cliente?.nombre_cliente ?? 'el cliente');
                lineas.push(`${formatCurrency(p.monto)} volvieron a ${nombre}.`);
            });
            if (pagoDeuda) {
                lineas.push(`La deuda de ${formatCurrency(pagoDeuda.monto)} con ${nombrePersona} se canceló.`);
            }
        } else if (compra.tipo_anulacion === 'fondo') {
            const totalFondo = pagosReales.reduce((acc, p) => acc + p.monto, 0);
            if (totalFondo > 0) {
                lineas.push(`${formatCurrency(totalFondo)} quedaron como fondo a favor con ${nombrePersona}.`);
            }
            pagosReales.forEach((p) => {
                if (p.tipo_pago === 'cliente') {
                    lineas.push(
                        `${p.cliente?.nombre_cliente ?? 'El cliente'} sigue con una deuda de ${formatCurrency(p.monto)} — no se le revirtió.`,
                    );
                } else {
                    lineas.push(`La cuenta ${p.cuenta?.nombre_cuenta ?? ''} no recuperó los ${formatCurrency(p.monto)} pagados.`);
                }
            });
            if (pagoDeuda) {
                lineas.push(`La deuda original de ${formatCurrency(pagoDeuda.monto)} con ${nombrePersona} se canceló (esa parte nunca se convierte en fondo).`);
            }
        }

        return lineas;
    };

    // ── Aprobar ──────────────────────────────────────────────────────────
    const [showAprobarDialog, setShowAprobarDialog] = useState(false);
    const [aprobando, setAprobando] = useState(false);

    const confirmarAprobar = () => {
        setAprobando(true);
        router.post(
            route('comprar.aprobar', compra.id),
            {},
            {
                onFinish: () => {
                    setAprobando(false);
                    setShowAprobarDialog(false);
                },
            },
        );
    };

    // ── Anular ───────────────────────────────────────────────────────────
    const [showAnularDialog, setShowAnularDialog] = useState(false);
    const anularForm = useForm({
        tipo_anulacion: 'reversion' as 'reversion' | 'fondo',
        motivo_anulacion: '',
    });

    const confirmarAnular = () => {
        anularForm.post(route('comprar.anular', compra.id), {
            onSuccess: () => setShowAnularDialog(false),
        });
    };

    // ── Editar (trata la compra como nueva: reemplaza líneas y pagos) ─────
    const [showEditarDialog, setShowEditarDialog] = useState(false);
    const [datosSelectCargados, setDatosSelectCargados] = useState(false);
    const [cargandoSelects, setCargandoSelects] = useState(false);
    const [almacenesOpciones, setAlmacenesOpciones] = useState<AlmacenOpcion[]>([]);
    const [categoriasOpciones, setCategoriasOpciones] = useState<CategoriaOpcion[]>([]);
    const [cuentasOpciones, setCuentasOpciones] = useState<CuentaOpcion[]>([]);
    const [clientesOpciones, setClientesOpciones] = useState<ClienteOpcion[]>([]);

    const editarForm = useForm({
        productos: [] as LineaEditable[],
        pagos: [] as PagoCuentaEditable[],
        pagos_clientes: [] as PagoClienteEditable[],
        permitir_deuda_parcial: false,
        nota: '',
    });

    const lineasDesdeProductos = (): LineaEditable[] =>
        productos.map((p) => ({
            almacen_id: p.almacen.id ?? '',
            producto: p.nombre_producto,
            marca: p.marca_producto ?? '',
            modelo: p.modelo_producto ?? '',
            capacidad: p.capacidad_producto ?? '',
            color: p.color_producto ?? '',
            categoria: p.categoria ?? '',
            codigo_barras: p.codigo_producto ?? '',
            cantidad: p.pivot.cantidad,
            precio: p.pivot.precio,
        }));

    const pagosDesdeCompra = (): PagoCuentaEditable[] =>
        compra.pagos.filter((pago) => pago.tipo_pago === 'cuenta').map((pago) => ({ cuenta_id: pago.cuenta?.id ?? '', monto: pago.monto }));

    const pagosClientesDesdeCompra = (): PagoClienteEditable[] =>
        compra.pagos.filter((pago) => pago.tipo_pago === 'cliente').map((pago) => ({ cliente_id: pago.cliente?.id ?? '', monto: pago.monto }));

    const abrirEditar = async () => {
        editarForm.clearErrors();
        editarForm.setData({
            productos: lineasDesdeProductos(),
            pagos: isDeuda ? [] : pagosDesdeCompra(),
            pagos_clientes: isDeuda ? [] : pagosClientesDesdeCompra(),
            permitir_deuda_parcial: compra.es_parcial,
            nota: '',
        });
        setShowEditarDialog(true);

        if (!datosSelectCargados) {
            setCargandoSelects(true);
            try {
                const [almacenesRes, categoriasRes, cuentasRes, clientesRes] = await Promise.all([
                    axios.get(route('compras.almacenes')),
                    axios.get(route('compras.categorias')),
                    axios.get(route('compras.cuentas.pago')),
                    axios.get(route('compras.clientes.fisicos')),
                ]);
                setAlmacenesOpciones(almacenesRes.data);
                setCategoriasOpciones(categoriasRes.data);
                setCuentasOpciones(cuentasRes.data);
                setClientesOpciones(clientesRes.data);
                setDatosSelectCargados(true);
            } finally {
                setCargandoSelects(false);
            }
        }
    };

    const actualizarLinea = (index: number, cambios: Partial<LineaEditable>) => {
        editarForm.setData(
            'productos',
            editarForm.data.productos.map((linea, i) => (i === index ? { ...linea, ...cambios } : linea)),
        );
    };

    const agregarLinea = () => {
        editarForm.setData('productos', [
            ...editarForm.data.productos,
            { almacen_id: '', producto: '', marca: '', modelo: '', capacidad: '', color: '', categoria: '', codigo_barras: '', cantidad: 1, precio: 0 },
        ]);
    };

    const quitarLinea = (index: number) => {
        editarForm.setData(
            'productos',
            editarForm.data.productos.filter((_, i) => i !== index),
        );
    };

    const agregarPagoCuenta = () => editarForm.setData('pagos', [...editarForm.data.pagos, { cuenta_id: '', monto: 0 }]);
    const quitarPagoCuenta = (index: number) =>
        editarForm.setData(
            'pagos',
            editarForm.data.pagos.filter((_, i) => i !== index),
        );

    const agregarPagoCliente = () => editarForm.setData('pagos_clientes', [...editarForm.data.pagos_clientes, { cliente_id: '', monto: 0 }]);
    const quitarPagoCliente = (index: number) =>
        editarForm.setData(
            'pagos_clientes',
            editarForm.data.pagos_clientes.filter((_, i) => i !== index),
        );

    const totalEditado = editarForm.data.productos.reduce((acc, l) => acc + Number(l.cantidad || 0) * Number(l.precio || 0), 0);
    const totalCubiertoEditado =
        editarForm.data.pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0) +
        editarForm.data.pagos_clientes.reduce((acc, p) => acc + Number(p.monto || 0), 0);

    const confirmarEditar = () => {
        editarForm.post(route('comprar.actualizar', compra.id), {
            onSuccess: () => setShowEditarDialog(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Compra #${compra.id} - ${estadoInfo.label}`} />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header principal — banner de identidad del proyecto, igual que Comprar/Index.tsx */}
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

                {/* Banner de estado — pendiente/aprobada/anulada */}
                <div className={cn('flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between', estadoInfo.classes)}>
                    <div className="flex items-center gap-3">
                        <EstadoIcon className={cn('h-6 w-6 shrink-0', estadoInfo.iconClasses)} />
                        <div>
                            <p className="font-semibold">{estadoInfo.label}</p>
                            <p className="text-sm opacity-90">
                                {compra.estado === 'pendiente' && 'El stock aún no se sumó a los almacenes — falta aprobar esta compra.'}
                                {compra.estado === 'aprobada' && 'El stock ya está disponible en los almacenes indicados.'}
                                {compra.estado === 'anulada' &&
                                    (compra.tipo_anulacion === 'fondo'
                                        ? 'El dinero pagado quedó como fondo a favor — no todo volvió a su origen.'
                                        : 'El dinero volvió exactamente a donde salió.')}
                            </p>
                            {compra.estado === 'anulada' && resumenAnulacion().length > 0 && (
                                <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm opacity-90">
                                    {resumenAnulacion().map((linea, i) => (
                                        <li key={i}>{linea}</li>
                                    ))}
                                </ul>
                            )}
                            {compra.estado === 'anulada' && compra.motivo_anulacion && (
                                <p className="mt-1 text-sm italic opacity-80">"{compra.motivo_anulacion}"</p>
                            )}
                        </div>
                    </div>

                    {esPendiente && (
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" className="cursor-pointer" onClick={abrirEditar}>
                                <Pencil className="mr-1.5 h-4 w-4" />
                                Editar
                            </Button>
                            <Button
                                size="sm"
                                className="cursor-pointer bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => setShowAprobarDialog(true)}
                            >
                                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                Aprobar
                            </Button>
                            <Button size="sm" variant="destructive" className="cursor-pointer" onClick={() => setShowAnularDialog(true)}>
                                <XCircle className="mr-1.5 h-4 w-4" />
                                Anular
                            </Button>
                        </div>
                    )}
                </div>

                {/* Información de la compra — 4 mini-widgets, mismo patrón que Vendor/Show.tsx */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="bg-card rounded-lg border-l-4 border-slate-400 p-4 shadow-sm dark:border-slate-600">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                <Hash className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                            </div>
                            <h3 className="text-sm font-semibold">N° Compra</h3>
                        </div>
                        <p className="mt-2 text-sm font-medium">#{compra.id.toString().padStart(6, '0')}</p>
                    </div>

                    <div className="bg-card rounded-lg border-l-4 border-violet-400 p-4 shadow-sm dark:border-violet-600">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
                                <Calendar className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                            </div>
                            <h3 className="text-sm font-semibold">Fecha</h3>
                        </div>
                        <p className="mt-2 text-sm font-medium">{formatDate(compra.fecha_compra)}</p>
                    </div>

                    <div
                        className={cn(
                            'bg-card rounded-lg border-l-4 p-4 shadow-sm',
                            isDeuda
                                ? 'border-red-400 dark:border-red-600'
                                : compra.es_parcial
                                  ? 'border-amber-400 dark:border-amber-600'
                                  : 'border-emerald-400 dark:border-emerald-600',
                        )}
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className={cn(
                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                                    isDeuda
                                        ? 'bg-red-100 dark:bg-red-900/40'
                                        : compra.es_parcial
                                          ? 'bg-amber-100 dark:bg-amber-900/40'
                                          : 'bg-emerald-100 dark:bg-emerald-900/40',
                                )}
                            >
                                {isDeuda ? (
                                    <CreditCard className="h-4 w-4 text-red-600 dark:text-red-400" />
                                ) : compra.es_parcial ? (
                                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                ) : (
                                    <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                )}
                            </div>
                            <h3 className="text-sm font-semibold">Tipo</h3>
                        </div>
                        <p className="mt-2 text-sm font-medium">{tipoLabel}</p>
                    </div>

                    <div className="bg-card rounded-lg border-l-4 border-blue-400 p-4 shadow-sm dark:border-blue-600">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                                <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-sm font-semibold">Total</h3>
                        </div>
                        <p className="mt-2 text-sm font-medium">{formatCurrency(compra.total_compra)}</p>
                    </div>
                </div>

                <Separator />

                {/* Información del proveedor/cliente estilo card */}
                <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                {esProveedor ? <Truck className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold text-white">{tipoPersona}</CardTitle>
                                <CardDescription className="text-xs text-indigo-100">
                                    {esProveedor ? 'Proveedor externo registrado' : esCliente ? 'Cliente como proveedor' : 'Sin registro'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{nombrePersona}</p>
                            <div className="text-right">
                                <p className="text-sm text-gray-500 uppercase">Total</p>
                                <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(compra.total_compra)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabla de productos */}
                <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Package className="h-5 w-5" />
                            </div>
                            <div className="flex flex-1 items-center justify-between">
                                <CardTitle className="text-base font-semibold text-white">Productos Adquiridos</CardTitle>
                                <Badge variant="outline" className="border-white/30 bg-white/20 text-white backdrop-blur-sm">
                                    {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-100 dark:bg-gray-800">
                                    <TableHead>Producto / Código</TableHead>
                                    <TableHead>Especificaciones</TableHead>
                                    <TableHead>Almacén</TableHead>
                                    <TableHead className="text-center">Cant.</TableHead>
                                    <TableHead className="text-right">P. Unit.</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {productos.map((p, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-semibold">
                                            <div className="flex items-center gap-2">
                                                <span>{p.nombre_producto}</span>
                                                {p.es_producto_nuevo && (
                                                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                                                        Nuevo
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-muted-foreground font-mono text-xs">{p.codigo_producto}</div>
                                            {p.categoria && (
                                                <Badge variant="outline" className="mt-1 text-xs font-normal">
                                                    {p.categoria}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {p.marca_producto || p.modelo_producto || p.capacidad_producto || p.color_producto ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {p.marca_producto && (
                                                        <Badge variant="secondary" className="font-normal">
                                                            <Tag />
                                                            <span className="text-muted-foreground">Marca:</span> {p.marca_producto}
                                                        </Badge>
                                                    )}
                                                    {p.modelo_producto && (
                                                        <Badge variant="secondary" className="font-normal">
                                                            <Layers />
                                                            <span className="text-muted-foreground">Modelo:</span> {p.modelo_producto}
                                                        </Badge>
                                                    )}
                                                    {p.capacidad_producto && (
                                                        <Badge variant="secondary" className="font-normal">
                                                            <HardDrive />
                                                            <span className="text-muted-foreground">Capacidad:</span> {p.capacidad_producto}
                                                        </Badge>
                                                    )}
                                                    {p.color_producto && (
                                                        <Badge variant="secondary" className="font-normal">
                                                            <Palette />
                                                            <span className="text-muted-foreground">Color:</span> {p.color_producto}
                                                        </Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">Sin especificaciones</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                <Store className="mr-1 h-3 w-3" />
                                                {p.almacen.nombre_almacen}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-bold">{p.pivot.cantidad}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(p.pivot.precio)}</TableCell>
                                        <TableCell className="text-right font-bold text-emerald-600">
                                            {formatCurrency(p.pivot.cantidad * p.pivot.precio)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <Separator />

                        {/* Footer con total */}
                        <div className="flex items-center justify-end bg-gray-50 p-6 dark:bg-gray-900/50">
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Total general</p>
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(compra.total_compra)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Detalles de Pago — cuentas/clientes de donde salió el dinero y cuánto puso cada uno.
                    Si la compra está anulada, estas mismas filas se conservan a propósito (no se
                    borran al anular) para poder mostrar qué pasó con cada fuente. */}
                {compra.pagos.length > 0 && (
                    <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-sky-600 to-sky-700 px-6 py-5 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <Wallet className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-semibold text-white">
                                        {compra.estado === 'anulada' ? 'Detalles de Pago (original) — qué pasó con cada fuente' : 'Detalles de Pago'}
                                    </CardTitle>
                                    <CardDescription className="text-xs text-sky-100">
                                        {compra.pagos.length} {compra.pagos.length === 1 ? 'fuente de pago' : 'fuentes de pago'}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-5">
                            <div className="space-y-2">
                                {compra.pagos.map((pago, index) => {
                                    const nombre =
                                        pago.tipo_pago === 'cuenta'
                                            ? (pago.cuenta?.nombre_cuenta ?? 'Cuenta')
                                            : pago.tipo_pago === 'cliente'
                                              ? (pago.cliente?.nombre_cliente ?? 'Cliente')
                                              : 'Deuda con proveedor';

                                    // Qué pasó con esta fuente si la compra terminó anulada. La porción de
                                    // deuda siempre se revierte a 0, haya elegido el usuario 'reversion' o
                                    // 'fondo' — solo cuenta/cliente cambian según la variante elegida.
                                    const estadoAnulacion =
                                        compra.estado === 'anulada'
                                            ? pago.tipo_pago === 'deuda_proveedor' || compra.tipo_anulacion === 'reversion'
                                                ? { label: 'Revertido', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' }
                                                : { label: 'Convertido en fondo', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' }
                                            : null;

                                    return (
                                        <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {pago.tipo_pago === 'cuenta' ? (
                                                    <Wallet className="h-4 w-4 text-blue-600" />
                                                ) : pago.tipo_pago === 'cliente' ? (
                                                    <Users className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <CreditCard className="h-4 w-4 text-amber-600" />
                                                )}
                                                <span className="font-medium">{nombre}</span>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'text-xs',
                                                        pago.tipo_pago === 'cuenta'
                                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                                            : pago.tipo_pago === 'cliente'
                                                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                                                    )}
                                                >
                                                    {pago.tipo_pago === 'cuenta' ? 'Cuenta' : pago.tipo_pago === 'cliente' ? 'Cliente' : 'Crédito'}
                                                </Badge>
                                                {estadoAnulacion && (
                                                    <Badge variant="outline" className={cn('text-xs', estadoAnulacion.className)}>
                                                        {estadoAnulacion.label}
                                                    </Badge>
                                                )}
                                            </div>
                                            <span
                                                className={cn(
                                                    'font-bold',
                                                    pago.tipo_pago === 'deuda_proveedor'
                                                        ? 'text-red-600 dark:text-red-400'
                                                        : 'text-emerald-600 dark:text-emerald-400',
                                                )}
                                            >
                                                {formatCurrency(pago.monto)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Nota final */}
                {success && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center text-green-800 dark:border-green-800/30 dark:bg-green-950/30 dark:text-green-300">
                        {success}
                    </div>
                )}

                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    {compra.estado === 'aprobada'
                        ? 'Los productos han sido registrados en el inventario y están disponibles en sus almacenes.'
                        : compra.estado === 'pendiente'
                          ? 'El dinero ya se movió, pero el stock solo se sumará al aprobar esta compra.'
                          : 'Esta compra fue anulada y no afecta el inventario.'}
                </p>

                {/* Acciones de la página */}
                <div className="flex justify-center gap-4">
                    <Link href="/comprar">
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                            <Package className="mr-2 h-4 w-4" />
                            Nueva Compra
                        </Button>
                    </Link>
                    <Link href="/dashboard">
                        <Button variant="outline">Dashboard</Button>
                    </Link>
                </div>
            </div>

            {/* ── Diálogo: Aprobar ─────────────────────────────────────────── */}
            <AlertDialog open={showAprobarDialog} onOpenChange={setShowAprobarDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Aprobar esta compra?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se sumará el stock a los almacenes indicados y quedará inmutable — ya no se podrá editar ni anular.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={aprobando}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmarAprobar} disabled={aprobando} className="bg-emerald-600 hover:bg-emerald-700">
                            {aprobando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Confirmar Aprobación
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Diálogo: Anular ──────────────────────────────────────────── */}
            <Dialog open={showAnularDialog} onOpenChange={setShowAnularDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Anular Compra #{compra.id}</DialogTitle>
                        <DialogDescription>Como el stock nunca se sumó, la anulación es puramente financiera.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>¿Qué pasa con el dinero?</Label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => anularForm.setData('tipo_anulacion', 'reversion')}
                                    className={cn(
                                        'rounded-lg border-2 p-3 text-left text-sm transition-colors',
                                        anularForm.data.tipo_anulacion === 'reversion'
                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20'
                                            : 'border-gray-200 dark:border-gray-700',
                                    )}
                                >
                                    <p className="font-semibold">Reversión total</p>
                                    <p className="text-muted-foreground text-xs">Todo el dinero vuelve exactamente a donde salió.</p>
                                </button>
                                <button
                                    type="button"
                                    disabled={isDeuda}
                                    onClick={() => !isDeuda && anularForm.setData('tipo_anulacion', 'fondo')}
                                    className={cn(
                                        'rounded-lg border-2 p-3 text-left text-sm transition-colors',
                                        isDeuda
                                            ? 'cursor-not-allowed border-gray-100 opacity-50 dark:border-gray-800'
                                            : anularForm.data.tipo_anulacion === 'fondo'
                                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
                                              : 'border-gray-200 dark:border-gray-700',
                                    )}
                                >
                                    <p className="font-semibold">Convertir en fondo</p>
                                    <p className="text-muted-foreground text-xs">
                                        {isDeuda
                                            ? 'No disponible: esta compra fue 100% a deuda, sin pago real.'
                                            : 'Lo pagado queda como crédito a favor con el proveedor/cliente.'}
                                    </p>
                                </button>
                            </div>
                            {anularForm.errors.tipo_anulacion && <p className="text-sm text-red-600">{anularForm.errors.tipo_anulacion}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="motivo_anulacion">Motivo</Label>
                            <Textarea
                                id="motivo_anulacion"
                                value={anularForm.data.motivo_anulacion}
                                onChange={(e) => anularForm.setData('motivo_anulacion', e.target.value)}
                                placeholder="¿Por qué se anula esta compra?"
                                rows={3}
                            />
                            {anularForm.errors.motivo_anulacion && <p className="text-sm text-red-600">{anularForm.errors.motivo_anulacion}</p>}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAnularDialog(false)} disabled={anularForm.processing}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmarAnular} disabled={anularForm.processing}>
                            {anularForm.processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                            Confirmar Anulación
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Diálogo: Editar (trata la compra como nueva) ────────────────── */}
            <Dialog open={showEditarDialog} onOpenChange={setShowEditarDialog}>
                <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Editar Compra #{compra.id}</DialogTitle>
                        <DialogDescription>
                            Se reemplazan por completo las líneas y los pagos — como si fuera una compra nueva. El stock sigue sin tocarse hasta
                            aprobar.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 space-y-6 overflow-y-auto px-1">
                        {cargandoSelects ? (
                            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
                                <Loader2 className="h-4 w-4 animate-spin" /> Cargando almacenes/cuentas...
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Productos</Label>
                                        <Button type="button" size="sm" variant="outline" onClick={agregarLinea}>
                                            <PlusCircle className="mr-1.5 h-4 w-4" />
                                            Agregar línea
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {editarForm.data.productos.map((linea, index) => (
                                            <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-12">
                                                <Input
                                                    className="sm:col-span-3"
                                                    placeholder="Producto"
                                                    value={linea.producto}
                                                    onChange={(e) => actualizarLinea(index, { producto: e.target.value })}
                                                />
                                                <Input
                                                    className="sm:col-span-2"
                                                    placeholder="Categoría"
                                                    list={`categorias-lote-${index}`}
                                                    value={linea.categoria}
                                                    onChange={(e) => actualizarLinea(index, { categoria: e.target.value })}
                                                />
                                                <datalist id={`categorias-lote-${index}`}>
                                                    {categoriasOpciones.map((c) => (
                                                        <option key={c.id} value={c.nombre_categoria} />
                                                    ))}
                                                </datalist>
                                                <Input
                                                    className="sm:col-span-2"
                                                    placeholder="Marca"
                                                    value={linea.marca}
                                                    onChange={(e) => actualizarLinea(index, { marca: e.target.value })}
                                                />
                                                <Input
                                                    className="sm:col-span-2"
                                                    placeholder="Modelo"
                                                    value={linea.modelo}
                                                    onChange={(e) => actualizarLinea(index, { modelo: e.target.value })}
                                                />
                                                <Select
                                                    value={linea.almacen_id ? String(linea.almacen_id) : ''}
                                                    onValueChange={(v) => actualizarLinea(index, { almacen_id: Number(v) })}
                                                >
                                                    <SelectTrigger className="sm:col-span-3">
                                                        <SelectValue placeholder="Almacén" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {almacenesOpciones.map((a) => (
                                                            <SelectItem key={a.id} value={String(a.id)}>
                                                                {a.nombre_almacen}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <Input
                                                    className="sm:col-span-2"
                                                    type="number"
                                                    min={1}
                                                    placeholder="Cantidad"
                                                    value={linea.cantidad}
                                                    onChange={(e) => actualizarLinea(index, { cantidad: Number(e.target.value) })}
                                                />
                                                <Input
                                                    className="sm:col-span-2"
                                                    type="number"
                                                    step="0.01"
                                                    min={0.01}
                                                    placeholder="Precio"
                                                    value={linea.precio}
                                                    onChange={(e) => actualizarLinea(index, { precio: Number(e.target.value) })}
                                                />
                                                <Input
                                                    className="sm:col-span-3"
                                                    placeholder="Código de barras (opcional)"
                                                    value={linea.codigo_barras}
                                                    onChange={(e) => actualizarLinea(index, { codigo_barras: e.target.value })}
                                                />
                                                <div className="flex items-center justify-end sm:col-span-2">
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="text-destructive"
                                                        disabled={editarForm.data.productos.length <= 1}
                                                        onClick={() => quitarLinea(index)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-sm font-semibold">Total: {formatCurrency(totalEditado)}</p>
                                    {editarForm.errors.productos && <p className="text-sm text-red-600">{editarForm.errors.productos}</p>}
                                </div>

                                {!isDeuda && (
                                    <div className="space-y-3 border-t pt-4">
                                        <div className="flex items-center justify-between">
                                            <Label>Pagos con cuenta</Label>
                                            <Button type="button" size="sm" variant="outline" onClick={agregarPagoCuenta}>
                                                <PlusCircle className="mr-1.5 h-4 w-4" />
                                                Agregar
                                            </Button>
                                        </div>
                                        {editarForm.data.pagos.map((pago, index) => (
                                            <div key={index} className="flex gap-2">
                                                <Select
                                                    value={pago.cuenta_id ? String(pago.cuenta_id) : ''}
                                                    onValueChange={(v) =>
                                                        editarForm.setData(
                                                            'pagos',
                                                            editarForm.data.pagos.map((p, i) => (i === index ? { ...p, cuenta_id: Number(v) } : p)),
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="flex-1">
                                                        <SelectValue placeholder="Cuenta" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {cuentasOpciones.map((c) => (
                                                            <SelectItem key={c.id} value={String(c.id)}>
                                                                {c.nombre_cuenta} (${c.saldo_cuenta.toFixed(2)})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    className="w-32"
                                                    placeholder="Monto"
                                                    value={pago.monto}
                                                    onChange={(e) =>
                                                        editarForm.setData(
                                                            'pagos',
                                                            editarForm.data.pagos.map((p, i) =>
                                                                i === index ? { ...p, monto: Number(e.target.value) } : p,
                                                            ),
                                                        )
                                                    }
                                                />
                                                <Button type="button" size="icon" variant="ghost" onClick={() => quitarPagoCuenta(index)}>
                                                    <Trash2 className="text-destructive h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}

                                        <div className="flex items-center justify-between pt-2">
                                            <Label>Pagos con cliente (deuda usada como pago)</Label>
                                            <Button type="button" size="sm" variant="outline" onClick={agregarPagoCliente}>
                                                <PlusCircle className="mr-1.5 h-4 w-4" />
                                                Agregar
                                            </Button>
                                        </div>
                                        {editarForm.data.pagos_clientes.map((pago, index) => (
                                            <div key={index} className="flex gap-2">
                                                <Select
                                                    value={pago.cliente_id ? String(pago.cliente_id) : ''}
                                                    onValueChange={(v) =>
                                                        editarForm.setData(
                                                            'pagos_clientes',
                                                            editarForm.data.pagos_clientes.map((p, i) =>
                                                                i === index ? { ...p, cliente_id: Number(v) } : p,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="flex-1">
                                                        <SelectValue placeholder="Cliente" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {clientesOpciones.map((c) => (
                                                            <SelectItem key={c.id} value={String(c.id)}>
                                                                {c.nombre_cliente}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    className="w-32"
                                                    placeholder="Monto"
                                                    value={pago.monto}
                                                    onChange={(e) =>
                                                        editarForm.setData(
                                                            'pagos_clientes',
                                                            editarForm.data.pagos_clientes.map((p, i) =>
                                                                i === index ? { ...p, monto: Number(e.target.value) } : p,
                                                            ),
                                                        )
                                                    }
                                                />
                                                <Button type="button" size="icon" variant="ghost" onClick={() => quitarPagoCliente(index)}>
                                                    <Trash2 className="text-destructive h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}

                                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                                            <Checkbox
                                                checked={editarForm.data.permitir_deuda_parcial}
                                                onCheckedChange={(checked) => editarForm.setData('permitir_deuda_parcial', checked === true)}
                                            />
                                            Permitir completar con deuda si no alcanza
                                        </label>

                                        <p className="text-sm">
                                            Cubierto: <span className="font-semibold">{formatCurrency(totalCubiertoEditado)}</span> de{' '}
                                            <span className="font-semibold">{formatCurrency(totalEditado)}</span>
                                        </p>
                                        {(editarForm.errors.pagos || editarForm.errors.pagos_clientes) && (
                                            <p className="text-sm text-red-600">Revisa los pagos — deben cubrir el total (o quedar como deuda).</p>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-2 border-t pt-4">
                                    <Label htmlFor="nota_edicion">Nota (obligatoria)</Label>
                                    <Textarea
                                        id="nota_edicion"
                                        value={editarForm.data.nota}
                                        onChange={(e) => editarForm.setData('nota', e.target.value)}
                                        placeholder="¿Por qué se edita esta compra?"
                                        rows={2}
                                    />
                                    {editarForm.errors.nota && <p className="text-sm text-red-600">{editarForm.errors.nota}</p>}
                                </div>

                                {editarForm.errors.error && <p className="text-sm text-red-600">{editarForm.errors.error}</p>}
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditarDialog(false)} disabled={editarForm.processing}>
                            Cancelar
                        </Button>
                        <Button onClick={confirmarEditar} disabled={editarForm.processing || cargandoSelects}>
                            {editarForm.processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
