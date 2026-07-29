import HeadingSmall from '@/components/heading-small';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import * as Collapsible from '@radix-ui/react-collapsible';
import {
    ArrowDown,
    ArrowRightLeft,
    ArrowUp,
    Banknote,
    Briefcase,
    CheckCircle2,
    ChevronDown,
    CreditCard,
    DollarSign,
    Eye,
    Globe,
    Receipt,
    Search,
    ShoppingCart,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { toast, Toaster } from 'sonner';

const CollapsibleRoot = Collapsible.Root;
const CollapsibleTrigger = Collapsible.CollapsibleTrigger;
const CollapsibleContent = Collapsible.CollapsibleContent;

interface Props extends PageProps {
    calculos: Calculos;
    fecha_apertura: string;
    moneda_referencia?: string;
    // NUEVO: Comparativa con cierre anterior
    comparativa_cuentas?: ComparativaItem[];
    comparativa_clientes?: ComparativaClienteItem[];
    tiene_cierre_anterior?: boolean;
}

interface ComparativaItem {
    id: number;
    nombre: string;
    tipo: string;
    moneda: string;
    saldo_anterior: number;
    saldo_actual: number;
    diferencia: number;
    estado: 'subio' | 'bajo' | 'igual';
}

interface ComparativaClienteItem {
    id: number;
    nombre: string;
    deuda_anterior: number;
    deuda_actual: number;
    diferencia: number;
    estado: 'mejoro' | 'empeoro' | 'igual';
}

interface ProductItem {
    cantidad: number;
    descripcion: string;
    precio_unitario: number;
    total: number;
    precio_equivalente?: number;
    total_equivalente?: number;
}

interface OperacionDetaile {
    venta_id: string;
    pago_id: number;
    cliente: string;
    monto: number;
    tasa_cambio_aplicada?: number;
    hora: string;
    tipo_pago: string;
    via_pago?: string | null;
    cuenta_nombre?: string | null;
    destino_nombre?: string | null;
    productos: ProductItem[];
}

interface DetalleMoneda {
    moneda: string;
    tasa_cambio: number;
    ventas_efectivo: number;
    ventas_transferencia: number;
    ingresos_extra: number;
    gastos: number;
    transferencias_salientes: number;
    transferencias_entrantes: number;
    saldo_calculado: number;
    items_ventas: ItemVenta[];
    items_gastos: ItemMovimiento[];
    items_ingresos: ItemMovimiento[];
    items_transferencias: ItemMovimiento[];
    items_transferencias_salientes: TransferenciaItem[];
    items_transferencias_entrantes: TransferenciaItem[];
    productos_resumen: Record<
        string,
        {
            id: number;
            nombre: string;
            marca: string;
            modelo: string;
            capacidad: string;
            color: string;
            codigo: string;
            imagen_url: string;
            categoria: string;
            cantidad: number;
            precio_base: number;
            precio_venta: number;
            total: number;
        }
    >;
    operaciones_detalle: OperacionDetaile[];
}

interface ItemVenta {
    id: string;
    venta_id: string;
    monto: number;
    monto_equivalente?: number;
    tasa_cambio_aplicada?: number;
    tipo_pago: string;
    confirmada: boolean;
    referencia?: string;
    cliente: string;
    hora: string;
    detalles: ProductItem[];
    moneda_codigo?: string;
    via_pago?: string | null;
    cuenta_nombre?: string | null;
    cliente_nombre?: string | null;
    destino_nombre?: string | null;
}

interface ItemMovimiento {
    id: string;
    desc: string;
    monto: number;
    hora: string;
    origen: string;
    destino: string;
    usuario_nombre?: string;
    es_propio?: boolean;
}

interface TransferenciaItem {
    id: string;
    desc: string;
    monto_origen: number;
    moneda_origen: string;
    origen_tipo: string;
    origen_nombre: string;
    monto_destino: number;
    moneda_destino: string;
    destino_tipo: string;
    destino_nombre: string;
    tasa_cambio: number;
    hora: string;
    afecta_saldo_usuario?: boolean;
    es_entrada?: boolean;
    usuario_nombre?: string;
    es_propio?: boolean;
}

interface TransferenciaCompleta extends TransferenciaItem {
    tipo: 'saliente' | 'entrante';
}

interface TransferenciaPorMoneda {
    moneda: string;
    tasa_cambio: number;
    salientes: number;
    entrantes: number;
    neto: number;
    items_salientes: TransferenciaItem[];
    items_entrantes: TransferenciaItem[];
}

interface TransferenciasResumen {
    total_salientes: number;
    total_entrantes: number;
    por_moneda: Record<string, TransferenciaPorMoneda>;
    detalles_completos: TransferenciaCompleta[];
}

interface Calculos {
    saldo_inicial: number;
    ventas_efectivo: number;
    ventas_otros: number;
    total_gastos: number;
    total_devoluciones: number;
    saldo_esperado_global: number;
    detalles: DetalleMoneda[];
    transferencias_resumen?: TransferenciasResumen;
    // NUEVO: Totales separados por destino
    ventas_a_cuentas_total_usd?: number;
    ventas_a_clientes_total_usd?: number;
    ventas_a_cuentas_efectivo_usd?: number;
    ventas_a_cuentas_transferencia_usd?: number;
    ventas_a_clientes_efectivo_usd?: number;
    ventas_a_clientes_transferencia_usd?: number;
    // Comisiones a gestores
    comisiones_gestor_total?: number;
    comisiones_gestor_detalles?: ComisionGestorItem[];
    // Comisiones y ganancia agencia
    comision_pv_total?: number;
    comision_gestor_total?: number;
    comisiones_pv_detalles?: ComisionPVItem[];
    ganancia_agencia_total?: number;
    // Resumen financiero
    ventas_brutas_usd?: number;
    comisiones_pv_cup?: number;
    comisiones_gestor_cup?: number;
    comisiones_total_cup?: number;
    // Ventas especiales
    ventas_especiales_count?: number;
    ventas_especiales_total_usd?: number;
    ventas_especiales_costo_usd?: number;
    ventas_especiales_impacto_usd?: number;
    ventas_especiales_detalles?: VentaEspecialItem[];
    // Ventas anuladas
    ventas_anuladas_count?: number;
    ventas_anuladas_total_usd?: number;
    ventas_anuladas_detalles?: VentaAnuladaItem[];
    // Mensajero del turno
    mensajero_total_usd?: number;
    mensajero_total_cup?: number;
    mensajero_count?: number;
    mensajero_detalles?: MensajeroDetalleItem[];
}

interface MensajeroDetalleItem {
    venta_id: number;
    monto_usd: number;
    monto_cup: number;
    tipo: string;
}

interface VentaEspecialItem {
    venta_id: number;
    motivo: string;
    total: number;
    costo: number;
    impacto: number;
    es_regalo: boolean;
    fecha: string;
}

interface VentaAnuladaItem {
    venta_id: number;
    total: number;
    motivo: string;
    detalle: string | null;
    fecha: string;
}

const MOTIVO_LABELS: Record<string, string> = {
    error_precio:        'Error en el precio',
    solicitud_cliente:   'Solicitud del cliente',
    producto_defectuoso: 'Producto defectuoso',
    duplicado_venta:     'Duplicado de venta',
    error_pedido:        'Error en el pedido',
    otros:               'Otros',
    sin_motivo:          'Sin motivo registrado',
};

interface ComisionPVItem {
    venta_id: number;
    comision_usd: number;
    comision_cup: number;
    fecha: string;
}

interface ComisionGestorItem {
    venta_id: number;
    monto: number;
    moneda_codigo: string;
    monto_usd: number;
    cuenta_nombre: string;
    cuenta_tipo: string;
    comentario: string;
    fecha: string;
}

const DENOMINACIONES = [
    { label: '100 USD', val: 100, m: 'USD' },
    { label: '50 USD', val: 50, m: 'USD' },
    { label: '20 USD', val: 20, m: 'USD' },
    { label: '10 USD', val: 10, m: 'USD' },
    { label: '5 USD', val: 5, m: 'USD' },
    { label: '1 USD', val: 1, m: 'USD' },
    { label: '1000 CUP', val: 1000, m: 'CUP' },
    { label: '500 CUP', val: 500, m: 'CUP' },
    { label: '200 CUP', val: 200, m: 'CUP' },
    { label: '100 CUP', val: 100, m: 'CUP' },
    { label: '50 CUP', val: 50, m: 'CUP' },
    { label: '20 CUP', val: 20, m: 'CUP' },
    { label: '10 CUP', val: 10, m: 'CUP' },
    { label: '5 CUP', val: 5, m: 'CUP' },
    { label: '1 CUP', val: 1, m: 'CUP' },
];

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Cierres de Caja', href: '/vendor/cierres' },
    { title: 'Nuevo Cierre', href: '#' },
];

export default function Create({
    calculos,
    fecha_apertura,
    moneda_referencia = 'USD',
    almacenes = [],
    comparativa_cuentas = [],
    comparativa_clientes = [],
    tiene_cierre_anterior = false,
    auth,
}: Props) {
    const { data, setData, post, processing } = useForm({
        saldo_inicial: calculos.saldo_inicial || 0,
        ventas_efectivo: calculos.ventas_efectivo || 0,
        ventas_otros: calculos.ventas_otros || 0,
        total_gastos: calculos.total_gastos || 0,
        total_devoluciones: calculos.total_devoluciones || 0,
        saldo_contado: calculos.saldo_esperado_global || 0,
        observaciones: '',
        fecha_apertura: fecha_apertura,
        confirmacion_transferencias: [] as string[],
    });
    const canViewEspecialesCostImpact = auth.user.role === 'admin' || auth.user.role === 'moderador';

    const getAlmacenNombre = (almacenId: number) => {
        const almacen = almacenes.find((a: { id: number; nombre: string }) => a.id === almacenId);
        return almacen?.nombre || `Almacén #${almacenId}`;
    };

    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showAnuladasDialog, setShowAnuladasDialog] = useState(false);
    const [showMensajeriaDialog, setShowMensajeriaDialog] = useState(false);
    const [showComisionPVDialog, setShowComisionPVDialog] = useState(false);
    const [showComisionGestorDialog, setShowComisionGestorDialog] = useState(false);
    const [selectedVentaDetails, setSelectedVentaDetails] = useState<{
        show: boolean;
        ventaId: number | null;
    }>({ show: false, ventaId: null });

    // Obtener todas las operaciones de una venta específica
    const getOperacionesPorVenta = (ventaId: number) => {
        const todasOperaciones = (calculos.detalles ?? []).flatMap((d) => d.operaciones_detalle ?? []);
        return todasOperaciones.filter((op) => op.venta_id === ventaId);
    };

    const operacionSeleccionada = selectedVentaDetails.ventaId ? getOperacionesPorVenta(selectedVentaDetails.ventaId) : [];

    // Todas las ventas de todas las monedas juntas
    const todosItemsVentas = (calculos.detalles ?? []).flatMap((d) => d.items_ventas ?? []);
    // Contar ventas únicas (por venta_id) - no por número de pagos
    const ventaIdsUnicos = new Set(todosItemsVentas.map((v: ItemVenta) => v.venta_id));
    const totalVentasUnicas = ventaIdsUnicos.size;

    // Lista plana de productos vendidos desde productos_resumen (ya deduplicado por venta)
    const lineasProductosRaw = (calculos.detalles ?? []).flatMap((d) => Object.values(d.productos_resumen ?? {}));
    const lineasProductos = lineasProductosRaw.map((p) => ({
        id: p.id,
        almacen_id: p.almacen_id,
        nombre: p.nombre || '',
        marca: p.marca || '',
        modelo: p.modelo || '',
        capacidad: p.capacidad || '',
        color: p.color || '',
        codigo: p.codigo || '',
        imagen_url: p.imagen_url || '',
        categoria: p.categoria || '',
        cantidad: Number(p.cantidad) || 0,
        precio_base: Number(p.precio_base) || 0,
        precio_venta: Number(p.precio_venta) || 0,
        total: Number(p.total) || 0,
    }));
    const totalVentasProductos = lineasProductos.reduce((s, r) => s + r.total, 0);
    const totalEsperadoProductos = lineasProductos.reduce((s, r) => s + r.cantidad * r.precio_base, 0);

    // Por dónde entraron: agrupado primero por MONEDA, luego por método/destino.
    // Incluye tanto el total en moneda original como el equivalente USD.
    const pagosPorMonedaYMetodo = todosItemsVentas.reduce(
        (acc, p) => {
            const moneda = p.moneda_codigo ?? 'USD';
            const via = (p.via_pago || '').toString().trim().toUpperCase();
            const destino = (p.destino_nombre || '').toString().trim();
            let etiqueta: string;
            if (p.tipo_pago === 'efectivo') {
                etiqueta = moneda;
            } else {
                etiqueta = via ? (destino ? `${via} ${destino}` : via) : destino ? `Transferencia ${destino}` : `Transferencia ${moneda}`;
            }
            if (!acc[moneda]) acc[moneda] = {};
            if (!acc[moneda][etiqueta]) acc[moneda][etiqueta] = { total: 0, cantidad: 0, totalEquivalente: 0 };
            const monto = Number(p.monto) || 0;
            const equivalente = Number(p.monto_equivalente) || monto;
            acc[moneda][etiqueta].total += monto;
            acc[moneda][etiqueta].totalEquivalente += equivalente;
            acc[moneda][etiqueta].cantidad += 1;
            return acc;
        },
        {} as Record<string, Record<string, { total: number; cantidad: number; totalEquivalente: number }>>,
    );

    const monedasConPagos = Object.keys(pagosPorMonedaYMetodo).sort();

    // Calcular total general USD de todos los pagos (suma de equivalentes)
    const totalGeneralUSD = Object.values(pagosPorMonedaYMetodo).reduce((sumMoneda, metodos) => {
        return sumMoneda + Object.values(metodos).reduce((sumMetodo, m) => sumMetodo + m.totalEquivalente, 0);
    }, 0);

    // Calcular totales de transacciones del turno
    const totalGastos = (calculos.detalles ?? []).reduce((sum, d) => sum + (d.gastos ?? 0), 0);
    const totalIngresos = (calculos.detalles ?? []).reduce((sum, d) => sum + (d.ingresos_extra ?? 0), 0);
    const totalTransferencias = (calculos.detalles ?? []).reduce((sum, d) => sum + (d.transferencias_salientes ?? 0), 0);

    // NUEVO: Calcular total de comisiones a gestores
    const totalComisionesGestor = calculos.comisiones_gestor_total ?? 0;
    const comisionesGestorDetalles = calculos.comisiones_gestor_detalles ?? [];

    // Agrupar comisiones de gestores por moneda
    const comisionesPorMoneda = comisionesGestorDetalles.reduce(
        (acc, item) => {
            const moneda = item.moneda_codigo || 'USD';
            if (!acc[moneda]) {
                acc[moneda] = { total: 0, count: 0 };
            }
            acc[moneda].total += Number(item.monto) || 0;
            acc[moneda].count += 1;
            return acc;
        },
        {} as Record<string, { total: number; count: number }>,
    );

    // Obtener todos los items de transacciones
    const todosGastos = (calculos.detalles ?? []).flatMap((d) => d.items_gastos ?? []);
    const todosIngresos = (calculos.detalles ?? []).flatMap((d) => d.items_ingresos ?? []);
    const todasTransferencias = calculos.transferencias_resumen?.detalles_completos ?? [];

    // Transacciones externas: operaciones de otros usuarios que afectan las cuentas del vendedor
    const transaccionesExternas = useMemo(() => {
        const externas: Array<{
            hora: string;
            tipo: string;
            desc: string;
            cuenta: string;
            usuario_nombre: string;
            monto: number;
            moneda: string;
            es_entrante: boolean;
            origen?: string;
            destino?: string;
        }> = [];

        (todosGastos ?? []).forEach((item) => {
            if (item.es_propio === false) {
                externas.push({
                    hora: item.hora,
                    tipo: 'Gasto',
                    desc: item.desc,
                    cuenta: item.origen || '-',
                    usuario_nombre: item.usuario_nombre || 'Sistema',
                    monto: item.monto,
                    moneda: 'USD',
                    es_entrante: false,
                });
            }
        });

        (todosIngresos ?? []).forEach((item) => {
            if (item.es_propio === false) {
                externas.push({
                    hora: item.hora,
                    tipo: 'Ingreso',
                    desc: item.desc,
                    cuenta: item.destino || '-',
                    usuario_nombre: item.usuario_nombre || 'Sistema',
                    monto: item.monto,
                    moneda: 'USD',
                    es_entrante: true,
                });
            }
        });

        (todasTransferencias ?? []).forEach((item) => {
            if (item.es_propio === false) {
                externas.push({
                    hora: item.hora,
                    tipo: item.tipo === 'entrante' ? 'Transferencia Entrante' : 'Transferencia Saliente',
                    desc: item.desc,
                    cuenta: item.tipo === 'entrante' ? item.destino_nombre : item.origen_nombre,
                    origen: item.origen_nombre || '-',
                    destino: item.destino_nombre || '-',
                    usuario_nombre: item.usuario_nombre || 'Sistema',
                    monto: item.monto_origen,
                    moneda: item.moneda_origen || 'USD',
                    es_entrante: item.tipo === 'entrante',
                });
            }
        });

        externas.sort((a, b) => a.hora.localeCompare(b.hora));
        return externas;
    }, [todosGastos, todosIngresos, todasTransferencias]);

    const [busquedaExternas, setBusquedaExternas] = useState('');
    const gastosExternos = useMemo(() => transaccionesExternas.filter(i => i.tipo === 'Gasto' && (!busquedaExternas || i.desc.toLowerCase().includes(busquedaExternas.toLowerCase()) || i.cuenta.toLowerCase().includes(busquedaExternas.toLowerCase()))), [transaccionesExternas, busquedaExternas]);
    const ingresosExternos = useMemo(() => transaccionesExternas.filter(i => i.tipo === 'Ingreso' && (!busquedaExternas || i.desc.toLowerCase().includes(busquedaExternas.toLowerCase()) || i.cuenta.toLowerCase().includes(busquedaExternas.toLowerCase()))), [transaccionesExternas, busquedaExternas]);
    const transferenciasExternas = useMemo(() => transaccionesExternas.filter(i => (i.tipo === 'Transferencia Saliente' || i.tipo === 'Transferencia Entrante') && (!busquedaExternas || i.desc.toLowerCase().includes(busquedaExternas.toLowerCase()) || i.cuenta.toLowerCase().includes(busquedaExternas.toLowerCase()))), [transaccionesExternas, busquedaExternas]);

    const submit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        console.log('--- INICIANDO ENVÍO DE CIERRE ---');

        post(route('ventas.cierres.store'), {
            preserveScroll: true,
            onSuccess: () => {
                console.log('Cierre exitoso');
                toast.success('Cierre realizado con éxito');
            },
            onError: (err) => {
                console.error('Errores en el cierre:', err);
                toast.error('Error al realizar el cierre. Revise los datos.');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Realizar Cierre de Caja" />
            <Toaster position="top-center" />

            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-6">
                    <HeadingSmall
                        title="Proceso de Cierre de Caja"
                        description="Finaliza tu turno laboral. Revisa los movimientos del sistema y confirma los datos del cierre."
                    />
                    <Wallet
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 transform opacity-40"
                    />
                </div>

                {/* Widgets de Estadísticas */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <Card className="border-emerald-200 bg-emerald-500/5">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                                        <ShoppingCart className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">Ventas Realizadas</p>
                                        <p className="text-2xl font-bold">{totalVentasUnicas}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-blue-200 bg-blue-500/5">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                        <DollarSign className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">Total Efectivo</p>
                                        <p className="text-2xl font-bold">${Number(calculos.ventas_efectivo || 0).toFixed(2)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-purple-200 bg-purple-500/5">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                                        <CreditCard className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">Transferencias</p>
                                        <p className="text-2xl font-bold">${Number(calculos.ventas_otros || 0).toFixed(2)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-amber-200 bg-amber-500/5">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                                        <Banknote className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">Monedas Usadas</p>
                                        <p className="text-2xl font-bold">{monedasConPagos.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                        <Card className="border-emerald-200 bg-emerald-500/5">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                                        <DollarSign className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">USD Efectivo</p>
                                        <p className="text-2xl font-bold">$999.99</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-blue-200 bg-blue-500/5">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                        <Banknote className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">CUP Efectivo</p>
                                        <p className="text-2xl font-bold">$888.88</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-sky-200 bg-sky-500/5">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100">
                                        <Globe className="h-5 w-5 text-sky-600" />
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">USD Internacional</p>
                                        <p className="text-2xl font-bold">$1,234.56</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-purple-200 bg-purple-500/5">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                                        <ArrowRightLeft className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">CUP Transferencias</p>
                                        <p className="text-2xl font-bold">$777.77</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-amber-200 bg-amber-500/5">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                                        <CreditCard className="h-5 w-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">USD Transferencia</p>
                                        <p className="text-2xl font-bold">$666.66</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* NUEVO: Widget de Resumen por Destino (Cuentas vs Clientes) */}
                {false && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Wallet className="text-primary h-5 w-5" />
                                Distribución del Dinero
                            </CardTitle>
                            <CardDescription>Separación entre dinero que entró a tus cuentas y dinero que fue a deuda de clientes</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {/* Columna: Dinero en MIS CUENTAS */}
                                <div className="border-border bg-primary/5 space-y-3 rounded-lg border p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                                            <Banknote className="text-primary h-4 w-4" />
                                        </div>
                                        <h4 className="font-semibold">Montos Depositados a mis Cuentas</h4>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">En Efectivo:</span>
                                            <span className="font-mono font-medium">
                                                ${Number(calculos.ventas_a_cuentas_efectivo_usd || 0).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Por Transferencia:</span>
                                            <span className="font-mono font-medium">
                                                ${Number(calculos.ventas_a_cuentas_transferencia_usd || 0).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="border-border border-t pt-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold">Total en Cuentas:</span>
                                                <span className="text-primary text-xl font-bold">
                                                    ${Number(calculos.ventas_a_cuentas_total_usd || 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Columna: Dinero a DEUDA de CLIENTES */}
                                <div className="border-border bg-muted/50 space-y-3 rounded-lg border p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                                            <CreditCard className="text-muted-foreground h-4 w-4" />
                                        </div>
                                        <h4 className="font-semibold">Depósitos a Clientes</h4>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">En Efectivo:</span>
                                            <span className="font-mono font-medium">
                                                ${Number(calculos.ventas_a_clientes_efectivo_usd || 0).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Por Transferencia:</span>
                                            <span className="font-mono font-medium">
                                                ${Number(calculos.ventas_a_clientes_transferencia_usd || 0).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="border-border border-t pt-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold">Total a Clientes:</span>
                                                <span className="text-muted-foreground text-xl font-bold">
                                                    ${Number(calculos.ventas_a_clientes_total_usd || 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Tabla Ventas: todos los productos del turno */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5" />
                            Ventas
                        </CardTitle>
                        <CardDescription>Productos vendidos en el turno. Importes en {moneda_referencia} (moneda de referencia).</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Producto</th>
                                        <th className="px-4 py-3 text-left font-semibold">Marca</th>
                                        <th className="px-4 py-3 text-left font-semibold">Modelo</th>
                                        <th className="px-4 py-3 text-left font-semibold">Capacidad</th>
                                        <th className="px-4 py-3 text-left font-semibold">Color</th>
                                        <th className="px-4 py-3 text-left font-semibold">Categoría</th>
                                        <th className="px-4 py-3 text-center font-semibold">Cantidad</th>
                                        <th className="px-4 py-3 text-right font-semibold">Precio Unit</th>
                                        <th className="px-4 py-3 text-right font-semibold">Total Esperado</th>
                                        <th className="px-4 py-3 text-right font-semibold">Total Real</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-border divide-y">
                                    {lineasProductos.length > 0 ? (
                                        lineasProductos.map((linea, idx) => (
                                            <tr key={idx} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={linea.imagen_url || 'https://via.placeholder.com/40'}
                                                            alt={linea.nombre}
                                                            className="h-10 w-10 rounded-md object-cover"
                                                        />
                                                        <div>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="cursor-help font-semibold">{linea.nombre}</div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="text-xs">Almacén: {getAlmacenNombre(linea.almacen_id)}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            <div className="text-muted-foreground text-xs">{linea.codigo}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="text-muted-foreground px-4 py-2">{linea.marca}</td>
                                                <td className="text-muted-foreground px-4 py-2">{linea.modelo}</td>
                                                <td className="text-muted-foreground px-4 py-2">{linea.capacidad || 'N/A'}</td>
                                                <td className="text-muted-foreground px-4 py-2">{linea.color || 'N/A'}</td>
                                                <td className="text-muted-foreground px-4 py-2">{linea.categoria}</td>
                                                <td className="px-4 py-2 text-center">
                                                    <span className="text-primary font-bold">{linea.cantidad}</span>
                                                </td>
                                                <td className="px-4 py-2 text-right font-mono">${Number(linea.precio_base).toFixed(2)}</td>
                                                <td className="px-4 py-2 text-right font-mono">
                                                    ${Number(linea.cantidad * linea.precio_base).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-2 text-right font-mono font-medium">${Number(linea.total).toFixed(2)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="text-muted-foreground px-4 py-8 text-center italic">
                                                No hay ventas en este turno
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot className="bg-muted/50">
                                    <tr>
                                        <td colSpan={5} className="px-4 py-3 text-right font-bold">
                                            Total
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold">{lineasProductos.reduce((sum, p) => sum + p.cantidad, 0)}</td>
                                        <td className="px-4 py-3"></td>
                                        <td className="px-4 py-3 text-right font-mono font-bold">${totalEsperadoProductos.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-right font-mono text-lg font-bold text-green-600">
                                            ${totalVentasProductos.toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Por dónde entraron: una tabla por moneda con desglose de operaciones */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Banknote className="h-5 w-5" />
                            Por dónde entraron
                        </CardTitle>
                        <CardDescription>
                            Cantidad de ventas y total por método, separado por moneda. Cada total es en su propia moneda.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {monedasConPagos.length > 0 ? (
                            monedasConPagos.map((moneda) => {
                                const metodos = pagosPorMonedaYMetodo[moneda];
                                const totalMoneda = Object.values(metodos).reduce((s, x) => s + (Number(x.total) || 0), 0);
                                const cantidadMoneda = Object.values(metodos).reduce((s, x) => s + (x.cantidad || 0), 0);
                                const totalEquivalenteMoneda = Object.values(metodos).reduce((s, x) => s + (x.totalEquivalente || 0), 0);
                                const detalleMoneda = calculos.detalles?.find((d) => d.moneda === moneda);

                                return (
                                    <div key={moneda} className="space-y-2">
                                        <h4 className="text-muted-foreground text-sm font-semibold">{moneda}</h4>
                                        <Table>
                                            <TableHeader>
                                                <TableRow data-state="open:bg-muted/40">
                                                    <TableHead>Método / Destino</TableHead>
                                                    <TableHead className="w-20 text-center">Ventas</TableHead>
                                                    <TableHead className="w-32 text-right">Total</TableHead>
                                                    <TableHead className="w-32 text-right">Equiv. USD</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {Object.entries(metodos).map(([etiqueta, data]) => {
                                                    const total = Number(data.total) || 0;
                                                    const totalEquivalente = Number(data.totalEquivalente) || 0;
                                                    const operacionesPorMetodo = (detalleMoneda?.operaciones_detalle || []).filter((op) => {
                                                        const via = (op.via_pago || '').toString().trim().toUpperCase();
                                                        const destino = (op.destino_nombre || '').toString().trim();
                                                        let etiquetaMetodo: string;
                                                        if (op.tipo_pago === 'efectivo') {
                                                            etiquetaMetodo = moneda;
                                                        } else {
                                                            etiquetaMetodo = via
                                                                ? destino
                                                                    ? `${via} ${destino}`
                                                                    : via
                                                                : destino
                                                                  ? `Transferencia ${destino}`
                                                                  : `Transferencia ${moneda}`;
                                                        }
                                                        return etiquetaMetodo === etiqueta;
                                                    });

                                                    return (
                                                        <CollapsibleRoot key={`${moneda}-${etiqueta}`} asChild>
                                                            <>
                                                                {/* FILA PRINCIPAL */}
                                                                <CollapsibleTrigger asChild>
                                                                    <TableRow className="hover:bg-muted/50 cursor-pointer">
                                                                        <TableCell className="flex items-center gap-2 font-medium">
                                                                            <ChevronDown className="collapsible-trigger-icon h-4 w-4 transition-transform" />
                                                                            {etiqueta}
                                                                        </TableCell>

                                                                        <TableCell className="text-center font-mono">{data.cantidad}</TableCell>

                                                                        <TableCell className="text-right font-mono">{total.toFixed(2)}</TableCell>

                                                                        <TableCell className="text-right font-mono font-medium text-green-600">
                                                                            ${totalEquivalente.toFixed(2)}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                </CollapsibleTrigger>

                                                                {/* FILA EXPANDIDA */}
                                                                <CollapsibleContent asChild>
                                                                    <TableRow>
                                                                        <TableCell colSpan={4} className="p-0">
                                                                            <div className="bg-muted/30 w-full p-4">
                                                                                <div className="border-muted space-y-3 border-l-2 pl-4">
                                                                                    {operacionesPorMetodo.length > 0 ? (
                                                                                        operacionesPorMetodo.map((operacion, idx) => (
                                                                                            <div
                                                                                                key={idx}
                                                                                                className="bg-card w-full rounded-md border p-4 shadow-sm"
                                                                                            >
                                                                                                {/* HEADER OPERACION */}
                                                                                                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-sm">
                                                                                                    <div className="flex items-center gap-2">
                                                                                                        <span className="font-semibold">
                                                                                                            Venta #{operacion.venta_id}
                                                                                                        </span>

                                                                                                        <span className="text-muted-foreground">
                                                                                                            -
                                                                                                        </span>

                                                                                                        <span>{operacion.cliente}</span>

                                                                                                        <span className="text-muted-foreground">
                                                                                                            -
                                                                                                        </span>

                                                                                                        <span className="text-muted-foreground">
                                                                                                            {operacion.hora}
                                                                                                        </span>

                                                                                                        {operacion.tasa_cambio_aplicada && (
                                                                                                            <>
                                                                                                                <span className="text-muted-foreground">
                                                                                                                    -
                                                                                                                </span>
                                                                                                                <span className="font-mono text-xs text-blue-600">
                                                                                                                    Tasa:{' '}
                                                                                                                    {operacion.tasa_cambio_aplicada}
                                                                                                                </span>
                                                                                                            </>
                                                                                                        )}
                                                                                                    </div>

                                                                                                    <div className="flex items-center gap-4">
                                                                                                        <span className="text-muted-foreground text-sm">
                                                                                                            {operacion.cuenta_nombre
                                                                                                                ? `Cuenta: ${operacion.cuenta_nombre}`
                                                                                                                : ''}
                                                                                                            {operacion.destino_nombre
                                                                                                                ? ` - ${operacion.destino_nombre}`
                                                                                                                : ''}
                                                                                                        </span>

                                                                                                        <span className="font-mono font-bold text-green-600">
                                                                                                            ${Number(operacion.monto).toFixed(2)}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </div>

                                                                                                {/* TABLA PRODUCTOS */}
                                                                                                {(operacion.productos?.length ?? 0) > 0 && (
                                                                                                    <div className="mt-3 w-full overflow-x-auto">
                                                                                                        <table className="w-full text-xs">
                                                                                                            <thead className="bg-muted/50">
                                                                                                                <tr>
                                                                                                                    <th className="px-2 py-1 text-left font-semibold">
                                                                                                                        Producto
                                                                                                                    </th>
                                                                                                                    <th className="px-2 py-1 text-left font-semibold">
                                                                                                                        Marca
                                                                                                                    </th>
                                                                                                                    <th className="px-2 py-1 text-left font-semibold">
                                                                                                                        Modelo
                                                                                                                    </th>
                                                                                                                    <th className="px-2 py-1 text-left font-semibold">
                                                                                                                        Categoría
                                                                                                                    </th>
                                                                                                                    <th className="px-2 py-1 text-left font-semibold">
                                                                                                                        Capacidad
                                                                                                                    </th>
                                                                                                                    <th className="px-2 py-1 text-left font-semibold">
                                                                                                                        Color
                                                                                                                    </th>

                                                                                                                    <th className="px-2 py-1 text-center font-semibold">
                                                                                                                        Cant
                                                                                                                    </th>

                                                                                                                    <th className="px-2 py-1 text-right font-semibold">
                                                                                                                        Precio
                                                                                                                    </th>

                                                                                                                    <th className="px-2 py-1 text-right font-semibold">
                                                                                                                        Total
                                                                                                                    </th>

                                                                                                                    <th className="px-2 py-1 text-right font-semibold text-green-600">
                                                                                                                        Entró
                                                                                                                    </th>

                                                                                                                    <th className="w-10"></th>
                                                                                                                </tr>
                                                                                                            </thead>

                                                                                                            <tbody>
                                                                                                                {operacion.productos?.map(
                                                                                                                    (prod, pidx) => (
                                                                                                                        <tr
                                                                                                                            key={pidx}
                                                                                                                            className="border-t"
                                                                                                                        >
                                                                                                                            <td className="px-2 py-1">
                                                                                                                                {prod.descripcion}
                                                                                                                            </td>

                                                                                                                            <td className="text-muted-foreground px-2 py-1">
                                                                                                                                {prod.marca || '-'}
                                                                                                                            </td>

                                                                                                                            <td className="text-muted-foreground px-2 py-1">
                                                                                                                                {prod.modelo || '-'}
                                                                                                                            </td>

                                                                                                                            <td className="text-muted-foreground px-2 py-1">
                                                                                                                                {prod.categoria ||
                                                                                                                                    '-'}
                                                                                                                            </td>

                                                                                                                            <td className="text-muted-foreground px-2 py-1">
                                                                                                                                {prod.capacidad ||
                                                                                                                                    '-'}
                                                                                                                            </td>
                                                                                                                            <td className="text-muted-foreground px-2 py-1">
                                                                                                                                {prod.color ||
                                                                                                                                    '-'}
                                                                                                                            </td>

                                                                                                                            <td className="px-2 py-1 text-center">
                                                                                                                                {prod.cantidad}
                                                                                                                            </td>

                                                                                                                            <td className="px-2 py-1 text-right font-mono">
                                                                                                                                $
                                                                                                                                {Number(
                                                                                                                                    prod.precio_unitario ||
                                                                                                                                        prod.total /
                                                                                                                                            prod.cantidad,
                                                                                                                                ).toFixed(2)}
                                                                                                                            </td>

                                                                                                                            <td className="px-2 py-1 text-right font-mono font-medium">
                                                                                                                                $
                                                                                                                                {Number(
                                                                                                                                    prod.total,
                                                                                                                                ).toFixed(2)}
                                                                                                                            </td>

                                                                                                                            <td className="px-2 py-1 text-right font-mono font-medium text-green-600">
                                                                                                                                $
                                                                                                                                {Number(
                                                                                                                                    operacion.monto,
                                                                                                                                ).toFixed(2)}
                                                                                                                            </td>

                                                                                                                            <td className="px-2 py-1 text-center">
                                                                                                                                <Button
                                                                                                                                    variant="ghost"
                                                                                                                                    size="icon"
                                                                                                                                    className="text-muted-foreground hover:text-primary h-6 w-6 cursor-pointer"
                                                                                                                                    onClick={() =>
                                                                                                                                        setSelectedVentaDetails(
                                                                                                                                            {
                                                                                                                                                show: true,
                                                                                                                                                ventaId:
                                                                                                                                                    operacion.venta_id,
                                                                                                                                            },
                                                                                                                                        )
                                                                                                                                    }
                                                                                                                                >
                                                                                                                                    <Eye className="h-3 w-3" />
                                                                                                                                </Button>
                                                                                                                            </td>
                                                                                                                        </tr>
                                                                                                                    ),
                                                                                                                )}
                                                                                                            </tbody>
                                                                                                        </table>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        ))
                                                                                    ) : (
                                                                                        <p className="text-muted-foreground text-xs italic">
                                                                                            Sin detalle de operaciones
                                                                                        </p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                </CollapsibleContent>
                                                            </>
                                                        </CollapsibleRoot>
                                                    );
                                                })}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow>
                                                    <TableCell className="font-bold">Total {moneda}</TableCell>
                                                    <TableCell className="text-center font-mono font-bold">{cantidadMoneda}</TableCell>
                                                    <TableCell className="text-right font-mono font-bold">
                                                        {Number(totalMoneda).toFixed(2)} {moneda}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-bold text-green-600">
                                                        ${totalEquivalenteMoneda.toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-muted-foreground text-center italic">No hay pagos registrados</p>
                        )}
                    </CardContent>
                </Card>

                {/* Movimientos Financieros */}
                <div className="space-y-2">
                    <h3 className="text-sm font-bold tracking-wide uppercase">Movimientos Financieros</h3>
                    <div className="grid grid-cols-4 gap-2">
                        <Card className="border-red-200 bg-red-500/5">
                            <CardContent className="p-3 text-center">
                                <ArrowUp className="mx-auto mb-1 h-5 w-5 text-red-600" />
                                <p className="text-muted-foreground text-[10px] uppercase">Gastos</p>
                                <p className="text-lg font-bold text-red-700">${Number(totalGastos).toFixed(2)}</p>
                                <p className="text-muted-foreground text-[9px]">{todosGastos.length} oper.</p>
                            </CardContent>
                        </Card>

                        <Card className="border-green-200 bg-green-500/5">
                            <CardContent className="p-3 text-center">
                                <ArrowDown className="mx-auto mb-1 h-5 w-5 text-green-600" />
                                <p className="text-muted-foreground text-[10px] uppercase">Ingresos</p>
                                <p className="text-lg font-bold text-green-700">${Number(totalIngresos).toFixed(2)}</p>
                                <p className="text-muted-foreground text-[9px]">{todosIngresos.length} oper.</p>
                            </CardContent>
                        </Card>

                        <Card className="border-blue-200 bg-blue-500/5">
                            <CardContent className="p-3 text-center">
                                <TrendingUp className="mx-auto mb-1 h-5 w-5 text-blue-600" />
                                <p className="text-muted-foreground text-[10px] uppercase">Transfer.</p>
                                <p className="text-lg font-bold text-blue-700">${Number(totalTransferencias).toFixed(2)}</p>
                                <p className="text-muted-foreground text-[9px]">{todasTransferencias.length} oper.</p>
                            </CardContent>
                        </Card>

                        <Card className="border-purple-200 bg-purple-500/5">
                            <CardContent className="p-3 text-center">
                                <Briefcase className="mx-auto mb-1 h-5 w-5 text-purple-600" />
                                <p className="text-muted-foreground text-[10px] uppercase">Gestores</p>
                                <div className="space-y-0.5">
                                    {comisionesGestorDetalles.length > 0 ? (
                                        Object.entries(comisionesPorMoneda).map(([moneda, data]) => (
                                            <p key={moneda} className="text-lg font-bold text-purple-700">
                                                -${Number(data.total).toFixed(2)} {moneda}
                                            </p>
                                        ))
                                    ) : (
                                        <p className="text-lg font-bold text-purple-700">$0.00</p>
                                    )}
                                </div>
                                <p className="text-muted-foreground text-[9px]">{comisionesGestorDetalles.length} oper.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            Detalle de Transacciones
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="gastos" className="w-full">
                            <TabsList className="mb-4 grid w-full grid-cols-4">
                                <TabsTrigger value="gastos">Gastos ({todosGastos.length})</TabsTrigger>
                                <TabsTrigger value="ingresos">Ingresos ({todosIngresos.length})</TabsTrigger>
                                <TabsTrigger value="transferencias">Transferencias ({todasTransferencias.length})</TabsTrigger>
                                <TabsTrigger value="gestores">Gestores ({comisionesGestorDetalles.length})</TabsTrigger>
                            </TabsList>

                            <TabsContent value="gastos" className="mt-0">
                                {todosGastos.length > 0 ? (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-16">Hora</TableHead>
                                                    <TableHead>Descripción</TableHead>
                                                    <TableHead>Origen</TableHead>
                                                    <TableHead>Destino</TableHead>
                                                    <TableHead className="w-28 text-right">Monto</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {todosGastos.map((item, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                                        <TableCell className="text-sm">{item.desc}</TableCell>
                                                        <TableCell className="text-muted-foreground text-xs">{item.origen || '-'}</TableCell>
                                                        <TableCell className="text-muted-foreground text-xs">{item.destino || '-'}</TableCell>
                                                        <TableCell className="text-right font-mono font-medium text-red-600">
                                                            -${Number(item.monto).toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow>
                                                    <TableCell colSpan={4} className="font-bold">
                                                        Total Gastos
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-red-600">
                                                        ${Number(totalGastos).toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground py-12 text-center italic">No hay gastos registrados en este turno.</p>
                                )}
                            </TabsContent>

                            <TabsContent value="ingresos" className="mt-0">
                                {todosIngresos.length > 0 ? (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-16">Hora</TableHead>
                                                    <TableHead>Descripción</TableHead>
                                                    <TableHead>Origen</TableHead>
                                                    <TableHead>Destino</TableHead>
                                                    <TableHead className="w-28 text-right">Monto</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {todosIngresos.map((item, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                                        <TableCell className="text-sm">{item.desc}</TableCell>
                                                        <TableCell className="text-muted-foreground text-xs">{item.origen || '-'}</TableCell>
                                                        <TableCell className="text-muted-foreground text-xs">{item.destino || '-'}</TableCell>
                                                        <TableCell className="text-right font-mono font-medium text-green-600">
                                                            +${Number(item.monto).toFixed(2)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow>
                                                    <TableCell colSpan={4} className="font-bold">
                                                        Total Ingresos
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-green-600">
                                                        ${Number(totalIngresos).toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground py-12 text-center italic">No hay ingresos registrados en este turno.</p>
                                )}
                            </TabsContent>

                            <TabsContent value="gestores" className="mt-0">
                                {comisionesGestorDetalles.length > 0 ? (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Venta #</TableHead>
                                                    <TableHead>Cuenta</TableHead>
                                                    <TableHead>Comentario</TableHead>
                                                    <TableHead className="w-36 text-right">Monto Local</TableHead>
                                                    <TableHead className="w-28 text-right">Equiv. USD</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {comisionesGestorDetalles.map((item) => (
                                                    <TableRow key={item.venta_id}>
                                                        <TableCell className="font-mono text-xs">
                                                            <a
                                                                href={`/ventas/${item.venta_id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-600 hover:underline"
                                                            >
                                                                #{item.venta_id}
                                                            </a>
                                                        </TableCell>
                                                        <TableCell className="text-sm">
                                                            <div className="font-medium">{item.cuenta_nombre}</div>
                                                            <div className="text-muted-foreground text-xs">{item.cuenta_tipo}</div>
                                                        </TableCell>
                                                        <TableCell className="max-w-xs text-sm" title={item.comentario || undefined}>
                                                            {item.comentario ? (
                                                                <span className="block max-w-[150px] truncate">{item.comentario}</span>
                                                            ) : (
                                                                <span className="text-muted-foreground italic">Sin comentario</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono font-medium text-red-600">
                                                            -{Number(item.monto).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.moneda_codigo}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs text-purple-600">
                                                            ≈ {Number(item.monto_usd).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow>
                                                    <TableCell colSpan={3} className="font-bold">Total</TableCell>
                                                    <TableCell className="text-right font-bold text-red-600" colSpan={1}>
                                                        {Object.entries(comisionesPorMoneda).map(([moneda, data]) => (
                                                            <div key={moneda}>
                                                                -{Number(data.total).toLocaleString('es-ES', { minimumFractionDigits: 2 })} {moneda}
                                                            </div>
                                                        ))}
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-purple-600">
                                                        ≈ {comisionesGestorDetalles.reduce((s, i) => s + (Number(i.monto_usd) || 0), 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                                                    </TableCell>
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground py-12 text-center italic">No hay comisiones a gestores en este turno.</p>
                                )}
                            </TabsContent>

                            <TabsContent value="transferencias" className="mt-0">
                                {todasTransferencias.length > 0 ? (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-16">Hora</TableHead>
                                                    <TableHead>Descripción</TableHead>
                                                    <TableHead>Origen</TableHead>
                                                    <TableHead>Destino</TableHead>
                                                    <TableHead className="w-32 text-right">Monto</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {todasTransferencias.map((item, idx) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                                        <TableCell className="max-w-xs truncate text-sm">{item.desc}</TableCell>
                                                        <TableCell className="text-muted-foreground text-xs">
                                                            <div className="max-w-[120px] truncate" title={item.origen_nombre}>
                                                                {item.origen_nombre}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-xs">
                                                            <div className="max-w-[120px] truncate" title={item.destino_nombre}>
                                                                {item.destino_nombre}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs">
                                                            <span className={item.tipo === 'entrante' ? 'text-green-600' : 'text-blue-600'}>
                                                                {item.tipo === 'entrante' ? '+' : '-'}${Number(item.monto_origen).toFixed(2)}{' '}
                                                                {item.moneda_origen}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow>
                                                    <TableCell colSpan={4} className="font-bold">
                                                        Total Transferencias
                                                    </TableCell>
                                                    <TableCell className="text-right font-bold text-blue-600">
                                                        ${Number(totalTransferencias).toFixed(2)}
                                                    </TableCell>
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground py-12 text-center italic">
                                        No hay transferencias registradas en este turno.
                                    </p>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Transacciones Externas */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="h-5 w-5 text-orange-600" />
                            Transacciones Externas
                        </CardTitle>
                        <CardDescription>
                            Operaciones realizadas por otros usuarios en tus cuentas durante este turno
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {transaccionesExternas.length === 0 ? (
                            <p className="text-muted-foreground py-12 text-center italic">
                                No hay operaciones registradas en este turno.
                            </p>
                        ) : (
                            <div className="contents">
                                <div className="relative">
                                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                    <Input
                                        placeholder="Buscar en transacciones externas..."
                                        value={busquedaExternas}
                                        onChange={(e) => setBusquedaExternas(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Tabs defaultValue="gastos">
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="gastos">Gastos ({gastosExternos.length})</TabsTrigger>
                                        <TabsTrigger value="ingresos">Ingresos ({ingresosExternos.length})</TabsTrigger>
                                        <TabsTrigger value="transferencias">Transferencias ({transferenciasExternas.length})</TabsTrigger>
                                    </TabsList>
                                    {[
                                        { value: 'gastos', items: gastosExternos, esGasto: true },
                                        { value: 'ingresos', items: ingresosExternos, esGasto: false },
                                        { value: 'transferencias', items: transferenciasExternas, esGasto: false },
                                    ].map((tab) => (
                                        <TabsContent key={tab.value} value={tab.value} className="mt-4">
                                            <div className="rounded-md border">
                                                <Table>
                                                    <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-16">Hora</TableHead>
                                                        <TableHead>Descripción</TableHead>
                                                        {tab.value === 'transferencias' ? (
                                                            <>
                                                                <TableHead>Origen</TableHead>
                                                                <TableHead>Destino</TableHead>
                                                            </>
                                                        ) : (
                                                            <TableHead>Cuenta</TableHead>
                                                        )}
                                                        <TableHead className="w-28">Creado por</TableHead>
                                                        <TableHead className="w-32 text-right">Monto</TableHead>
                                                    </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {tab.items.length > 0 ? tab.items.map((item, idx) => (
                                                            <TableRow key={idx}>
                                                                <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                                                <TableCell className="max-w-xs truncate text-sm" title={item.desc}>{item.desc}</TableCell>
                                                                {tab.value === 'transferencias' ? (
                                                                    <>
                                                                        <TableCell className="text-muted-foreground text-xs">{item.origen}</TableCell>
                                                                        <TableCell className="text-muted-foreground text-xs">{item.destino}</TableCell>
                                                                    </>
                                                                ) : (
                                                                    <TableCell className="text-muted-foreground text-xs">{item.cuenta}</TableCell>
                                                                )}
                                                                <TableCell className="text-muted-foreground text-xs">{item.usuario_nombre}</TableCell>
                                                                <TableCell className="text-right font-mono font-medium">
                                                                    <span className={tab.esGasto ? 'text-red-600' : 'text-green-600'}>
                                                                        {tab.esGasto ? '-' : '+'}${Number(item.monto).toFixed(2)} {item.moneda}
                                                                    </span>
                                                                </TableCell>
                                                            </TableRow>
                                                        )) : (
                                                            <TableRow>
                                                                <TableCell colSpan={tab.value === 'transferencias' ? 6 : 5} className="text-muted-foreground py-8 text-center italic">
                                                                    {busquedaExternas ? 'No se encontraron resultados' : 'No hay operaciones de este tipo'}
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Comparativa con Cierre Anterior */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            Comparativa con Cierre Anterior
                        </CardTitle>
                        <CardDescription>Comparación de saldos y deudas respecto al cierre anterior</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Pestañas Cuentas / Clientes */}
                        <Tabs defaultValue="cuentas" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="cuentas">Cuentas ({comparativa_cuentas?.length ?? 0})</TabsTrigger>
                                <TabsTrigger value="clientes">Clientes ({comparativa_clientes?.length ?? 0})</TabsTrigger>
                            </TabsList>

                            {/* Tab Cuentas */}
                            <TabsContent value="cuentas" className="mt-4">
                                {!tiene_cierre_anterior && comparativa_cuentas.length > 0 && (
                                    <p className="text-muted-foreground mb-2 text-xs italic">
                                        Primer cierre: estos son los saldos iniciales actuales.
                                    </p>
                                )}
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Cuenta</TableHead>
                                                <TableHead>Tipo</TableHead>
                                                <TableHead>Moneda</TableHead>
                                                <TableHead className="text-right">Cierre Anterior</TableHead>
                                                <TableHead className="text-right">Cierre Hoy</TableHead>
                                                <TableHead className="text-right">Diferencia</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {comparativa_cuentas && comparativa_cuentas.length > 0 ? (
                                                comparativa_cuentas.map((item: ComparativaItem) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell className="font-medium">{item.nombre}</TableCell>
                                                        <TableCell>
                                                            <span className="bg-muted rounded px-2 py-0.5 text-xs font-medium">
                                                                {item.tipo === 'efectivo'
                                                                    ? 'Efectivo'
                                                                    : item.tipo === 'tarjeta'
                                                                      ? 'Tarjeta'
                                                                      : item.tipo || '-'}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="bg-muted rounded px-2 py-0.5 text-xs font-medium">{item.moneda}</span>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            ${Number(item.saldo_anterior).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono font-medium">
                                                            ${Number(item.saldo_actual).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            {item.diferencia > 0 ? (
                                                                <span className="text-green-600">+${Number(item.diferencia).toFixed(2)}</span>
                                                            ) : item.diferencia < 0 ? (
                                                                <span className="text-red-600">${Number(item.diferencia).toFixed(2)}</span>
                                                            ) : (
                                                                <span className="text-muted-foreground">-</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-muted-foreground py-8 text-center italic">
                                                        {!tiene_cierre_anterior
                                                            ? 'No hay cierre anterior para comparar'
                                                            : 'No hay cuentas para mostrar'}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>

                            {/* Tab Clientes */}
                            <TabsContent value="clientes" className="mt-4">
                                {comparativa_clientes && comparativa_clientes.length > 0 ? (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Cliente</TableHead>
                                                    <TableHead className="text-right">Deuda Anterior</TableHead>
                                                    <TableHead className="text-right">Deuda Actual</TableHead>
                                                    <TableHead className="text-right">Diferencia</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {comparativa_clientes.map((item: ComparativaClienteItem) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell className="font-medium">{item.nombre}</TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            ${Number(item.deuda_anterior).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono font-medium">
                                                            ${Number(item.deuda_actual).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">
                                                            {item.diferencia < 0 ? (
                                                                <span className="text-green-600">${Number(item.diferencia).toFixed(2)} ✅</span>
                                                            ) : item.diferencia > 0 ? (
                                                                <span className="text-red-600">+${Number(item.diferencia).toFixed(2)} ⚠️</span>
                                                            ) : (
                                                                <span className="text-muted-foreground">-</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground py-8 text-center italic">No hay clientes con deuda registrada.</p>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Acción Final */}
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold tracking-wider uppercase">Finalizar Cierre</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Total de Venta */}
                        <div className="border-primary bg-primary/10 rounded-lg border p-4">
                            <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Total de Ventas del Turno</p>
                            <p className="text-4xl font-black text-emerald-600">${Number(totalVentasProductos).toFixed(2)}</p>
                            <p className="text-muted-foreground mt-2 text-xs">Total real de productos vendidos</p>
                        </div>

                        {/* Widgets: Comisión PV, Comisión Gestor, Ganancia Agencia */}
                        <div className="grid grid-cols-3 gap-3">
                            {/* Comisión Punto de Venta — todos los roles */}
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:bg-blue-900/20">
                                <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Comisión P.V.</p>
                                <p className="text-xl font-black text-blue-700 dark:text-blue-300">
                                    ${Number(calculos.comision_pv_total ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="mt-0.5 text-xs text-blue-500 dark:text-blue-400">
                                    {Number(calculos.comisiones_pv_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                </p>
                                {(calculos.comisiones_pv_detalles ?? []).length > 0 && (
                                    <button onClick={() => setShowComisionPVDialog(true)} className="mt-1 text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400">
                                        Ver detalles
                                    </button>
                                )}
                            </div>

                            {/* Comisión Gestor — todos los roles */}
                            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:bg-purple-900/20">
                                <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Comisión Gestor</p>
                                <p className="text-xl font-black text-purple-700 dark:text-purple-300">
                                    ${Number(calculos.comision_gestor_total ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="mt-0.5 text-xs text-purple-500 dark:text-purple-400">
                                    {Number(calculos.comisiones_gestor_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                </p>
                                {comisionesGestorDetalles.length > 0 && (
                                    <button onClick={() => setShowComisionGestorDialog(true)} className="mt-1 text-xs text-purple-600 underline hover:text-purple-800 dark:text-purple-400">
                                        Ver detalles
                                    </button>
                                )}
                            </div>

                            {/* Ganancia Agencia — solo admin */}
                            {auth.user.role === 'admin' && (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:bg-emerald-900/20">
                                    <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Ganancia Agencia</p>
                                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                                        ${Number(calculos.ganancia_agencia_total ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-xs">Neto agencia</p>
                                </div>
                            )}

                            {/* Ventas Especiales — si existen en el turno */}
                            {(calculos.ventas_especiales_count ?? 0) > 0 && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                                    <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Ventas Especiales</p>
                                    <p className="text-xl font-black text-amber-700 dark:text-amber-300">
                                        {calculos.ventas_especiales_count} venta{(calculos.ventas_especiales_count ?? 0) > 1 ? 's' : ''}
                                    </p>
                                    {canViewEspecialesCostImpact && (
                                        <p className={`mt-1 text-xs font-semibold ${(calculos.ventas_especiales_impacto_usd ?? 0) < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                                            Impacto: ${Number(calculos.ventas_especiales_impacto_usd ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Resumen Financiero del Turno */}
                        {(calculos.ventas_brutas_usd ?? 0) > 0 && (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950">
                                <p className="text-muted-foreground mb-2 text-xs font-bold uppercase">Resumen Financiero del Turno</p>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-emerald-700 dark:text-emerald-400">Ventas brutas</span>
                                        <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                                            ${Number(calculos.ventas_brutas_usd ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                                        </span>
                                    </div>
                                    {(calculos.comisiones_total_cup ?? 0) > 0 && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-amber-600 dark:text-amber-400">
                                                Comisiones
                                                {(calculos.comisiones_pv_cup ?? 0) > 0 && (calculos.comisiones_gestor_cup ?? 0) > 0
                                                    ? ' (PV + Gestor)'
                                                    : (calculos.comisiones_gestor_cup ?? 0) > 0 ? ' (Gestor)' : ' (PV)'}
                                            </span>
                                            <span className="font-semibold text-amber-700 dark:text-amber-300">
                                                −{Number(calculos.comisiones_total_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                            </span>
                                        </div>
                                    )}
                                    {(calculos.mensajero_total_cup ?? 0) > 0 && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sky-600 dark:text-sky-400">Mensajería</span>
                                            <span className="font-semibold text-sky-700 dark:text-sky-300">
                                                −{Number(calculos.mensajero_total_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                            </span>
                                        </div>
                                    )}
                                    <div className="mt-1.5 flex items-center justify-between border-t border-emerald-200 pt-1.5 dark:border-emerald-700">
                                        <span className="font-bold text-emerald-800 dark:text-emerald-200">Ganancia neta agencia</span>
                                        <span className="font-black text-emerald-700 dark:text-emerald-300">
                                            ${Number(calculos.ganancia_agencia_total ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Mensajería del turno — informativo */}
                        {(calculos.mensajero_count ?? 0) > 0 && (
                            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-950">
                                <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Mensajería del Turno</p>
                                <p className="text-xl font-black text-sky-700 dark:text-sky-300">
                                    {Number(calculos.mensajero_total_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                </p>
                                <p className="mt-1 text-xs text-sky-600 dark:text-sky-400">
                                    ≈ ${Number(calculos.mensajero_total_usd ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD · {calculos.mensajero_count} entrega{(calculos.mensajero_count ?? 0) > 1 ? 's' : ''}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Ya descontado del saldo esperado (pass-through)
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 h-7 border-sky-300 text-xs text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:text-sky-300"
                                    onClick={() => setShowMensajeriaDialog(true)}
                                >
                                    Ver entregas
                                </Button>
                            </div>
                        )}

                        {/* Ventas Anuladas — tarjeta resumen */}
                        {(calculos.ventas_anuladas_count ?? 0) > 0 && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                                <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Ventas Anuladas</p>
                                <p className="text-xl font-black text-red-700 dark:text-red-300">
                                    {calculos.ventas_anuladas_count} venta{(calculos.ventas_anuladas_count ?? 0) > 1 ? 's' : ''}
                                </p>
                                <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
                                    Valor: ${Number(calculos.ventas_anuladas_total_usd ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 h-7 border-red-300 text-xs text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300"
                                    onClick={() => setShowAnuladasDialog(true)}
                                >
                                    Ver detalles
                                </Button>
                            </div>
                        )}

                        {/* Detalle de ventas especiales del turno */}
                        {(calculos.ventas_especiales_count ?? 0) > 0 && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                                <p className="mb-3 text-sm font-bold text-amber-800 dark:text-amber-200">
                                    Ventas Especiales del Turno ({calculos.ventas_especiales_count})
                                </p>
                                <div className="space-y-2">
                                    {(calculos.ventas_especiales_detalles ?? []).map((ve) => (
                                        <div key={ve.venta_id} className="flex items-center justify-between rounded-md border border-amber-200 bg-white px-3 py-2 text-xs dark:border-amber-700 dark:bg-amber-900/30">
                                            <div className="flex-1 space-y-0.5">
                                                <p className="font-semibold text-amber-800 dark:text-amber-200">
                                                    Venta #{ve.venta_id} {ve.es_regalo && <span className="ml-1 rounded-full bg-amber-200 px-1.5 py-0.5 text-amber-700">Regalo</span>}
                                                </p>
                                                <p className="text-amber-600 dark:text-amber-400 italic">{ve.motivo}</p>
                                                <p className="text-amber-500 dark:text-amber-500">{ve.fecha}</p>
                                            </div>
                                            <div className="ml-4 text-right">
                                                <p className="text-amber-700 dark:text-amber-300">Cobrado: <strong>${ve.total.toFixed(2)}</strong></p>
                                                {canViewEspecialesCostImpact && (
                                                    <>
                                                        <p className="text-red-600 dark:text-red-400">Costo: <strong>${ve.costo.toFixed(2)}</strong></p>
                                                        <p className={`font-bold ${ve.impacto < 0 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-300'}`}>
                                                            Impacto: ${ve.impacto.toFixed(2)}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 border-t border-amber-200 pt-2 dark:border-amber-700">
                                    <div className="flex justify-between text-xs font-bold text-amber-800 dark:text-amber-200">
                                        <span>Total cobrado especiales:</span>
                                        <span>${Number(calculos.ventas_especiales_total_usd ?? 0).toFixed(2)} USD</span>
                                    </div>
                                    {canViewEspecialesCostImpact && (
                                        <>
                                            <div className="flex justify-between text-xs font-bold text-red-700 dark:text-red-400">
                                                <span>Costo total especiales:</span>
                                                <span>${Number(calculos.ventas_especiales_costo_usd ?? 0).toFixed(2)} USD</span>
                                            </div>
                                            <div className={`flex justify-between text-sm font-black ${(calculos.ventas_especiales_impacto_usd ?? 0) < 0 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-300'}`}>
                                                <span>Impacto neto:</span>
                                                <span>${Number(calculos.ventas_especiales_impacto_usd ?? 0).toFixed(2)} USD</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}


                        {/* Dialog detalle ventas anuladas */}
                        {(calculos.ventas_anuladas_count ?? 0) > 0 && (
                            <Dialog open={showAnuladasDialog} onOpenChange={setShowAnuladasDialog}>
                                <DialogContent className="sm:max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle className="text-red-700">
                                            Ventas Anuladas del Turno ({calculos.ventas_anuladas_count})
                                        </DialogTitle>
                                        <DialogDescription>
                                            Valor total anulado: <strong>${Number(calculos.ventas_anuladas_total_usd ?? 0).toFixed(2)} USD</strong>
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                                        {(calculos.ventas_anuladas_detalles ?? []).map((va) => (
                                            <div key={va.venta_id} className="flex items-start justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs dark:border-red-700 dark:bg-red-900/30">
                                                <div className="flex-1 space-y-0.5">
                                                    <p className="font-semibold text-red-800 dark:text-red-200">Venta #{va.venta_id}</p>
                                                    <p className="font-medium text-red-700 dark:text-red-300">
                                                        {MOTIVO_LABELS[va.motivo] ?? va.motivo}
                                                    </p>
                                                    {va.detalle && (
                                                        <p className="italic text-red-500 dark:text-red-400">{va.detalle}</p>
                                                    )}
                                                    <p className="text-red-400 dark:text-red-500">{va.fecha}</p>
                                                </div>
                                                <p className="ml-4 font-bold text-red-700 dark:text-red-300">
                                                    ${va.total.toFixed(2)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}

                        {/* Dialog detalles de mensajería */}
                        {(calculos.mensajero_count ?? 0) > 0 && (
                            <Dialog open={showMensajeriaDialog} onOpenChange={setShowMensajeriaDialog}>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="text-sky-700 dark:text-sky-300">
                                            Mensajería del Turno ({calculos.mensajero_count})
                                        </DialogTitle>
                                        <DialogDescription>
                                            Total pagado al mensajero: <strong>{Number(calculos.mensajero_total_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP</strong>
                                            {' '}≈ <strong>${Number(calculos.mensajero_total_usd ?? 0).toFixed(2)} USD</strong>
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="text-xs">Venta</TableHead>
                                                    <TableHead className="text-right text-xs">USD cobrado</TableHead>
                                                    <TableHead className="text-right text-xs">CUP pagado</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(calculos.mensajero_detalles ?? []).map((d) => (
                                                    <TableRow key={d.venta_id}>
                                                        <TableCell className="text-xs font-medium">#{d.venta_id}</TableCell>
                                                        <TableCell className="text-right text-xs">${d.monto_usd.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right text-xs font-semibold text-sky-700 dark:text-sky-300">
                                                            {d.monto_cup.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow>
                                                    <TableCell className="text-xs font-bold">Total</TableCell>
                                                    <TableCell className="text-right text-xs font-bold">${Number(calculos.mensajero_total_usd ?? 0).toFixed(2)}</TableCell>
                                                    <TableCell className="text-right text-xs font-bold text-sky-700 dark:text-sky-300">
                                                        {Number(calculos.mensajero_total_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}

                        {/* Dialog detalles Comisión PV */}
                        {(calculos.comisiones_pv_detalles ?? []).length > 0 && (
                            <Dialog open={showComisionPVDialog} onOpenChange={setShowComisionPVDialog}>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="text-blue-700 dark:text-blue-300">
                                            Comisiones P.V. del Turno
                                        </DialogTitle>
                                        <DialogDescription>
                                            Total: <strong>${Number(calculos.comision_pv_total ?? 0).toFixed(2)} USD</strong>
                                            {' '}≈ <strong>{Number(calculos.comisiones_pv_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP</strong>
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="text-xs">Venta</TableHead>
                                                    <TableHead className="text-right text-xs">USD</TableHead>
                                                    <TableHead className="text-right text-xs">CUP</TableHead>
                                                    <TableHead className="text-right text-xs">Fecha</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(calculos.comisiones_pv_detalles ?? []).map((d) => (
                                                    <TableRow key={d.venta_id}>
                                                        <TableCell className="text-xs font-medium">#{d.venta_id}</TableCell>
                                                        <TableCell className="text-right text-xs">${d.comision_usd.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right text-xs font-semibold text-blue-700 dark:text-blue-300">
                                                            {d.comision_cup.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs text-muted-foreground">{d.fecha}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow>
                                                    <TableCell className="text-xs font-bold">Total</TableCell>
                                                    <TableCell className="text-right text-xs font-bold">${Number(calculos.comision_pv_total ?? 0).toFixed(2)}</TableCell>
                                                    <TableCell className="text-right text-xs font-bold text-blue-700 dark:text-blue-300">
                                                        {Number(calculos.comisiones_pv_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell />
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}

                        {/* Dialog detalles Comisión Gestor */}
                        {comisionesGestorDetalles.length > 0 && (
                            <Dialog open={showComisionGestorDialog} onOpenChange={setShowComisionGestorDialog}>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="text-purple-700 dark:text-purple-300">
                                            Comisiones Gestor del Turno
                                        </DialogTitle>
                                        <DialogDescription>
                                            Total: <strong>${Number(calculos.comision_gestor_total ?? 0).toFixed(2)} USD</strong>
                                            {' '}≈ <strong>{Number(calculos.comisiones_gestor_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP</strong>
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="text-xs">Venta</TableHead>
                                                    <TableHead className="text-right text-xs">USD</TableHead>
                                                    <TableHead className="text-right text-xs">CUP</TableHead>
                                                    <TableHead className="text-xs">Cuenta</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {comisionesGestorDetalles.map((d) => (
                                                    <TableRow key={d.venta_id}>
                                                        <TableCell className="text-xs font-medium">#{d.venta_id}</TableCell>
                                                        <TableCell className="text-right text-xs">${d.monto_usd.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right text-xs font-semibold text-purple-700 dark:text-purple-300">
                                                            {d.moneda_codigo === 'CUP'
                                                                ? d.monto.toLocaleString('es-ES', { minimumFractionDigits: 2 })
                                                                : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">{d.cuenta_nombre}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow>
                                                    <TableCell className="text-xs font-bold">Total</TableCell>
                                                    <TableCell className="text-right text-xs font-bold">${Number(calculos.comision_gestor_total ?? 0).toFixed(2)}</TableCell>
                                                    <TableCell className="text-right text-xs font-bold text-purple-700 dark:text-purple-300">
                                                        {Number(calculos.comisiones_gestor_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell />
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}

                        <div className="space-y-1">
                            <Label className="text-muted-foreground text-xs font-bold uppercase">Observaciones del Turno</Label>
                            <Input
                                placeholder="Ej: Faltó dinero por cambio mal dado..."
                                value={data.observaciones}
                                onChange={(e) => setData('observaciones', e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                            <Button type="button" className="h-12 w-full text-base font-bold" disabled={processing} onClick={() => submit()}>
                                <CheckCircle2 className="mr-2 h-5 w-5" /> FINALIZAR CIERRE
                            </Button>
                            <p className="text-muted-foreground px-4 text-center text-[10px] leading-tight italic">
                                Al finalizar se notificará a los administradores y se cerrará tu sesión de venta.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Modal de Confirmación */}
                <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Finalizar Cierre?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Al finalizar se registrará el cierre con los datos calculados del sistema.
                                <br />
                                <br />
                                <span className="font-bold text-emerald-600">¿Estás seguro de que deseas finalizar el cierre?</span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
                            <AlertDialogAction type="button" onClick={() => submit()} className="bg-primary cursor-pointer">
                                Sí, Finalizar Cierre
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Modal de Detalles de la Venta Completa */}
                <AlertDialog
                    open={selectedVentaDetails.show}
                    onOpenChange={(open) => setSelectedVentaDetails({ ...selectedVentaDetails, show: open })}
                >
                    <AlertDialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Detalles de la Venta #{selectedVentaDetails.ventaId}</AlertDialogTitle>
                        </AlertDialogHeader>
                        <div className="space-y-4">
                            {/* Todas las operaciones de esta venta */}
                            {operacionSeleccionada.length > 0 && (
                                <>
                                    <div className="bg-muted/50 rounded-md p-3">
                                        <p className="text-muted-foreground text-xs font-semibold uppercase">
                                            Pagos Realizados ({operacionSeleccionada.length})
                                        </p>
                                    </div>
                                    {operacionSeleccionada.map((op, idx) => (
                                        <div key={idx} className="rounded-md border p-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">
                                                        {op.tipo_pago === 'efectivo' ? 'Efectivo' : op.via_pago || 'Transferencia'}
                                                    </span>
                                                    {op.cuenta_nombre && <span className="text-muted-foreground text-sm">- {op.cuenta_nombre}</span>}
                                                </div>
                                                <span className="font-mono font-bold text-green-600">${Number(op.monto || 0).toFixed(2)}</span>
                                            </div>
                                            <div className="text-muted-foreground mt-2 text-xs">
                                                <span>Cliente: {op.cliente}</span>
                                                <span className="mx-2">|</span>
                                                <span>Hora: {op.hora}</span>
                                                {op.destino_nombre && (
                                                    <>
                                                        <span className="mx-2">|</span>
                                                        <span>Destino: {op.destino_nombre}</span>
                                                    </>
                                                )}
                                            </div>
                                            {/* Productos de esta operación */}
                                            {(op.productos?.length ?? 0) > 0 && (
                                                <div className="mt-3">
                                                    <table className="w-full text-xs">
                                                        <thead className="bg-muted/30">
                                                            <tr>
                                                                <th className="px-2 py-1 text-left font-semibold">Producto</th>
                                                                <th className="px-2 py-1 text-center font-semibold">Cant</th>
                                                                <th className="px-2 py-1 text-right font-semibold">Precio</th>
                                                                <th className="px-2 py-1 text-right font-semibold">Total</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {op.productos?.map((prod: any, pidx: number) => (
                                                                <tr key={pidx} className="border-t">
                                                                    <td className="px-2 py-1">
                                                                        {prod.descripcion}
                                                                        <div className="text-muted-foreground text-[10px]">
                                                                            {prod.marca && `${prod.marca} `}
                                                                            {prod.modelo && `${prod.modelo} `}
                                                                            {prod.categoria && `(${prod.categoria})`}
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-2 py-1 text-center">{prod.cantidad}</td>
                                                                    <td className="px-2 py-1 text-right font-mono">
                                                                        ${Number(prod.precio_unitario || 0).toFixed(2)}
                                                                    </td>
                                                                    <td className="px-2 py-1 text-right font-mono font-medium">
                                                                        ${Number(prod.total || 0).toFixed(2)}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {/* Total de la venta */}
                                    {(() => {
                                        const mensajeroItem = (calculos.mensajero_detalles ?? []).find(
                                            (d) => d.venta_id === selectedVentaDetails.ventaId,
                                        );
                                        if (!mensajeroItem) return null;
                                        return (
                                            <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                                                <p className="mb-2 text-xs font-semibold uppercase text-blue-700 dark:text-blue-300">
                                                    Mensajería
                                                </p>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-muted-foreground">Mensajería</span>
                                                    <div className="text-right font-mono">
                                                        <span className="font-semibold text-blue-600">
                                                            {Number(mensajeroItem.monto_cup).toLocaleString('es-ES', {
                                                                minimumFractionDigits: 2,
                                                            })}{' '}
                                                            CUP
                                                        </span>
                                                        <span className="text-muted-foreground ml-2 text-xs">
                                                            ≈ ${Number(mensajeroItem.monto_usd).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                    <div className="rounded-md bg-green-50 p-3 dark:bg-green-900/20">
                                        <div className="flex justify-between">
                                            <span className="font-semibold">Total Venta:</span>
                                            <span className="font-mono text-lg font-bold text-green-600">
                                                ${operacionSeleccionada.reduce((sum, op) => sum + (Number(op.monto) || 0), 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="cursor-pointer">Cerrar</AlertDialogCancel>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}
