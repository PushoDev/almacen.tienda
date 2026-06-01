import HeadingSmall from '@/components/heading-small';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import * as Collapsible from '@radix-ui/react-collapsible';
import {
    ArrowDown,
    ArrowUp,
    Banknote,
    Briefcase,
    ChevronDown,
    CreditCard,
    DollarSign,
    Eye,
    Receipt,
    ShoppingCart,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Toaster } from 'sonner';

const CollapsibleRoot = Collapsible.Root;
const CollapsibleTrigger = Collapsible.CollapsibleTrigger;
const CollapsibleContent = Collapsible.CollapsibleContent;

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
    es_receptor?: boolean;
}

interface ItemVenta {
    id: string;
    venta_id?: string;
    monto: number;
    monto_equivalente?: number;
    tipo_pago: string;
    confirmada?: boolean;
    referencia?: string;
    cliente: string;
    hora: string;
    detalles?: any;
    moneda_codigo?: string;
    via_pago?: string | null;
    cuenta_nombre?: string | null;
    cliente_nombre?: string | null;
    destino_nombre?: string | null;
}

interface ProductItem {
    cantidad: number;
    descripcion: string;
    marca: string;
    modelo: string;
    capacidad: string;
    categoria: string;
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
    ventas_efectivo_cuentas?: number;
    ventas_transferencia_cuentas?: number;
    ventas_a_cuentas_total?: number;
    ventas_efectivo_clientes?: number;
    ventas_transferencia_clientes?: number;
    ventas_a_clientes_total?: number;
    comisiones_gestor?: number;
    comisiones_gestor_detalles?: ComisionGestorItem[];
    items_ventas: ItemVenta[];
    items_gastos: Array<{ id?: string; desc: string; monto: number; hora: string; origen?: string; destino?: string }>;
    items_ingresos: Array<{ id?: string; desc: string; monto: number; hora: string; origen?: string; destino?: string }>;
    items_transferencias_salientes: TransferenciaItem[];
    items_transferencias_entrantes: TransferenciaItem[];
    productos_resumen?: Record<
        string,
        {
            id: number;
            almacen_id?: number;
            nombre: string;
            marca: string;
            modelo: string;
            capacidad: string;
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

interface TransferenciaCompleta extends TransferenciaItem {
    tipo: 'saliente' | 'entrante';
}

interface TransferenciasResumen {
    total_salientes: number;
    total_entrantes: number;
    por_moneda: Record<
        string,
        {
            moneda: string;
            tasa_cambio: number;
            salientes: number;
            entrantes: number;
            neto: number;
            items_salientes: TransferenciaItem[];
            items_entrantes: TransferenciaItem[];
        }
    >;
    detalles_completos: TransferenciaCompleta[];
}

interface Cierre {
    id: number;
    user_id?: number;
    revisor_id?: number;
    fecha_apertura: string;
    fecha_cierre: string;
    saldo_inicial?: number;
    ventas_efectivo?: number;
    ventas_otros?: number;
    total_gastos?: number;
    total_devoluciones?: number;
    saldo_esperado?: number;
    saldo_contado?: number;
    diferencia?: number;
    observaciones?: string | null;
    estado?: string;
    usuario?: { name: string };
    revisor?: { name: string } | null;
    confirmacion_transferencias?: string[];
    detalles?: DetalleMoneda[] | null;
    snapshot_cuentas?: Array<{ id: number; nombre: string; tipo: string; moneda: string; saldo: number }>;
    snapshot_clientes?: Array<{ id: number; nombre: string; deuda: number }>;
    comisiones_gestor?: number;
    comisiones_gestor_detalles?: ComisionGestorItem[];
}

interface VentaEspecialItemShow {
    venta_id: number;
    motivo: string;
    total: number;
    costo?: number;
    impacto?: number;
    es_regalo: boolean;
    fecha: string;
}

interface VentaAnuladaItemShow {
    venta_id: number;
    total: number;
    motivo: string;
    detalle: string | null;
    fecha: string;
    tenia_impacto_financiero: boolean;
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

interface Props extends PageProps {
    cierre: Cierre;
    almacenes?: Array<{ id: number; nombre: string }>;
    userRole?: string;
    comision_pv_total?: number;
    comision_gestor_total?: number;
    ganancia_agencia_total?: number;
    ventas_especiales_count?: number;
    ventas_especiales_total_usd?: number;
    ventas_especiales_costo_usd?: number;
    ventas_especiales_impacto_usd?: number;
    ventas_especiales_detalles?: VentaEspecialItemShow[];
    ventas_anuladas_count?: number;
    ventas_anuladas_total_usd?: number;
    ventas_anuladas_detalles?: VentaAnuladaItemShow[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Cierres de Caja', href: '/vendor/cierres' },
    { title: 'Detalle de Cierre', href: '#' },
];

export default function Show({
    cierre,
    almacenes = [],
    userRole = 'vendedor',
    comision_pv_total = 0,
    comision_gestor_total = 0,
    ganancia_agencia_total = 0,
    ventas_especiales_count = 0,
    ventas_especiales_total_usd = 0,
    ventas_especiales_costo_usd = 0,
    ventas_especiales_impacto_usd = 0,
    ventas_especiales_detalles = [],
    ventas_anuladas_count = 0,
    ventas_anuladas_total_usd = 0,
    ventas_anuladas_detalles = [],
}: Props) {
    const canViewEspecialesCostImpact = userRole === 'admin' || userRole === 'moderador';

    const [showTransaccionesDialog, setShowTransaccionesDialog] = useState(false);
    const [selectedVentaDetails, setSelectedVentaDetails] = useState<{
        show: boolean;
        ventaId: number | null;
    }>({ show: false, ventaId: null });

    const getAlmacenNombre = (almacenId?: number) => {
        if (!almacenId) return 'Sin almacén';
        const almacen = almacenes.find((a) => a.id === almacenId);
        return almacen?.nombre || `Almacén #${almacenId}`;
    };

    const getOperacionesPorVenta = (ventaId: number) => {
        const todasOperaciones = (calculos.detalles ?? []).flatMap((d) => d.operaciones_detalle ?? []);
        return todasOperaciones.filter((op) => String(op.venta_id) === String(ventaId));
    };

    const operacionSeleccionada = selectedVentaDetails.ventaId ? getOperacionesPorVenta(selectedVentaDetails.ventaId) : [];

    const moneda_referencia = 'USD';

    const calculos = useMemo(() => {
        return {
            saldo_inicial: cierre.saldo_inicial || 0,
            ventas_efectivo: cierre.ventas_efectivo || 0,
            ventas_otros: cierre.ventas_otros || 0,
            total_gastos: cierre.total_gastos || 0,
            total_devoluciones: cierre.total_devoluciones || 0,
            saldo_esperado_global: cierre.saldo_esperado || 0,
            detalles: cierre.detalles || [],
            comisiones_gestor_total: cierre.comisiones_gestor || 0,
            comisiones_gestor_detalles: cierre.comisiones_gestor_detalles || [],
            ventas_a_cuentas_total_usd: calcularVentasACuentasTotal(),
            ventas_a_clientes_total_usd: calcularVentasAClientesTotal(),
            ventas_a_cuentas_efectivo_usd: calcularVentasACuentasEfectivo(),
            ventas_a_cuentas_transferencia_usd: calcularVentasACuentasTransferencia(),
            ventas_a_clientes_efectivo_usd: calcularVentasAClientesEfectivo(),
            ventas_a_clientes_transferencia_usd: calcularVentasAClientesTransferencia(),
        };
    }, [cierre]);

    function calcularVentasACuentasTotal(): number {
        let total = 0;
        (cierre.detalles || []).forEach((d) => {
            const tasa = d.tasa_cambio > 0 ? d.tasa_cambio : 1;
            total += (d.ventas_a_cuentas_total || d.ventas_efectivo_cuentas || d.ventas_transferencia_cuentas || 0) / tasa;
        });
        return total;
    }

    function calcularVentasAClientesTotal(): number {
        let total = 0;
        (cierre.detalles || []).forEach((d) => {
            const tasa = d.tasa_cambio > 0 ? d.tasa_cambio : 1;
            total += (d.ventas_a_clientes_total || d.ventas_efectivo_clientes || d.ventas_transferencia_clientes || 0) / tasa;
        });
        return total;
    }

    function calcularVentasACuentasEfectivo(): number {
        let total = 0;
        (cierre.detalles || []).forEach((d) => {
            const tasa = d.tasa_cambio > 0 ? d.tasa_cambio : 1;
            total += (d.ventas_efectivo_cuentas || 0) / tasa;
        });
        return total;
    }

    function calcularVentasACuentasTransferencia(): number {
        let total = 0;
        (cierre.detalles || []).forEach((d) => {
            const tasa = d.tasa_cambio > 0 ? d.tasa_cambio : 1;
            total += (d.ventas_transferencia_cuentas || 0) / tasa;
        });
        return total;
    }

    function calcularVentasAClientesEfectivo(): number {
        let total = 0;
        (cierre.detalles || []).forEach((d) => {
            const tasa = d.tasa_cambio > 0 ? d.tasa_cambio : 1;
            total += (d.ventas_efectivo_clientes || 0) / tasa;
        });
        return total;
    }

    function calcularVentasAClientesTransferencia(): number {
        let total = 0;
        (cierre.detalles || []).forEach((d) => {
            const tasa = d.tasa_cambio > 0 ? d.tasa_cambio : 1;
            total += (d.ventas_transferencia_clientes || 0) / tasa;
        });
        return total;
    }

    const todosItemsVentas = (calculos.detalles ?? []).flatMap((d) => d.items_ventas ?? []);
    const ventaIdsUnicos = new Set(todosItemsVentas.map((v) => v.venta_id || v.id));
    const totalVentasUnicas = ventaIdsUnicos.size;

    const lineasProductosRaw = (calculos.detalles ?? []).flatMap((d) => Object.values(d.productos_resumen ?? {}));
    const lineasProductos: Array<{
        id: number;
        almacen_id?: number;
        nombre: string;
        marca: string;
        modelo: string;
        capacidad: string;
        codigo: string;
        imagen_url: string;
        categoria: string;
        cantidad: number;
        precio_base: number;
        precio_venta: number;
        total: number;
    }> = lineasProductosRaw.map((p: any) => ({
        id: p.id || 0,
        almacen_id: p.almacen_id,
        nombre: p.nombre || '',
        marca: p.marca || '',
        modelo: p.modelo || '',
        capacidad: p.capacidad || '',
        codigo: p.codigo || '',
        imagen_url: p.imagen_url || '',
        categoria: p.categoria || '',
        cantidad: Number(p.cantidad) || 0,
        precio_base: Number(p.precio_base) || 0,
        precio_venta: Number(p.precio_venta) || 0,
        total: Number(p.total) || 0,
    }));
    const totalVentasProductos = lineasProductos.reduce((s: number, r) => s + r.total, 0);
    const totalEsperadoProductos = lineasProductos.reduce((s: number, r) => s + r.cantidad * r.precio_base, 0);

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

    const totalGastos = (calculos.detalles ?? []).reduce((sum: number, d) => sum + (d.gastos ?? 0), 0);
    const totalIngresos = (calculos.detalles ?? []).reduce((sum: number, d) => sum + (d.ingresos_extra ?? 0), 0);
    const totalTransferencias = (calculos.detalles ?? []).reduce((sum: number, d) => sum + (d.transferencias_salientes ?? 0), 0);

    const comisionesGestorDetalles = calculos.comisiones_gestor_detalles || [];
    const totalComisionesGestor = calculos.comisiones_gestor_total || 0;

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

    const todosGastos = (calculos.detalles ?? []).flatMap((d) => d.items_gastos ?? []);
    const todosIngresos = (calculos.detalles ?? []).flatMap((d) => d.items_ingresos ?? []);

    const todasTransferencias: TransferenciaCompleta[] = [];
    (calculos.detalles ?? []).forEach((d) => {
        (d.items_transferencias_salientes ?? []).forEach((t) => {
            todasTransferencias.push({ ...t, tipo: 'saliente' });
        });
        (d.items_transferencias_entrantes ?? []).forEach((t) => {
            todasTransferencias.push({ ...t, tipo: 'entrante' });
        });
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Cierre #${cierre.id}`} />
            <Toaster position="top-center" />

            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-6">
                    <HeadingSmall
                        title={`Reporte de Cierre #${cierre.id}`}
                        description={`Auditoría detallada de movimientos realizados por ${cierre.usuario?.name || 'usuario'}.`}
                    />
                    <Wallet
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 transform opacity-40"
                    />
                </div>

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

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Wallet className="text-primary h-5 w-5" />
                            Distribución del Dinero
                        </CardTitle>
                        <CardDescription>Separación entre dinero que entró a las cuentas y dinero que fue a deuda de clientes</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="border-border bg-primary/5 space-y-3 rounded-lg border p-4">
                                <div className="flex items-center gap-2">
                                    <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                                        <Banknote className="text-primary h-4 w-4" />
                                    </div>
                                    <h4 className="font-semibold">Montos Depositados a las Cuentas</h4>
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

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5" />
                            Ventas del Día
                        </CardTitle>
                        <CardDescription>
                            Productos vendidos el{' '}
                            {new Date(cierre.fecha_apertura).toLocaleDateString('es-ES', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                            . Importes en {moneda_referencia}.
                        </CardDescription>
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
                                                                                                                    <th className="px-2 py-1 text-center font-semibold">
                                                                                                                        Cant
                                                                                                                    </th>
                                                                                                                    <th className="px-2 py-1 text-right font-semibold">
                                                                                                                        Precio
                                                                                                                    </th>
                                                                                                                    <th className="px-2 py-1 text-right font-semibold">
                                                                                                                        Total
                                                                                                                    </th>
                                                                                                                    <th className="w-10"></th>
                                                                                                                </tr>
                                                                                                            </thead>
                                                                                                            <tbody>
                                                                                                                {operacion.productos.map(
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
                                                                                                                                                    Number(
                                                                                                                                                        operacion.venta_id,
                                                                                                                                                    ),
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

                        {comisionesGestorDetalles.length > 0 && (
                            <Card className="border-purple-200 bg-purple-500/5">
                                <CardContent className="p-3 text-center">
                                    <Briefcase className="mx-auto mb-1 h-5 w-5 text-purple-600" />
                                    <p className="text-muted-foreground text-[10px] uppercase">Gestores</p>
                                    <div className="space-y-0.5">
                                        {Object.entries(comisionesPorMoneda).map(([moneda, data]) => (
                                            <p key={moneda} className="text-lg font-bold text-purple-700">
                                                -${Number(data.total).toFixed(2)} {moneda}
                                            </p>
                                        ))}
                                    </div>
                                    <p className="text-muted-foreground text-[9px]">{comisionesGestorDetalles.length} oper.</p>
                                </CardContent>
                            </Card>
                        )}
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
                                <TabsTrigger value="ingresos">Ingresos ({todosIngresos.length})</TabsTrigger>
                                <TabsTrigger value="gastos">Gastos ({todosGastos.length})</TabsTrigger>
                                <TabsTrigger value="gestores">Gestores ({comisionesGestorDetalles.length})</TabsTrigger>
                                <TabsTrigger value="transferencias">Transferencias ({todasTransferencias.length})</TabsTrigger>
                            </TabsList>

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
                                    <p className="text-muted-foreground py-12 text-center italic">No hay transferencias registradas en este turno.</p>
                                )}
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold tracking-wider uppercase">Resumen del Cierre</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border-primary bg-primary/10 rounded-lg border p-4">
                            <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Total de Ventas del Turno</p>
                            <p className="text-4xl font-black text-emerald-600">${Number(totalVentasProductos).toFixed(2)}</p>
                            <p className="text-muted-foreground mt-2 text-xs">Total real de productos vendidos</p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {/* Comisión Punto de Venta — todos los roles */}
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:bg-blue-900/20">
                                <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Comisión P.V.</p>
                                <p className="text-xl font-black text-blue-700 dark:text-blue-300">
                                    ${Number(comision_pv_total).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">Sin gestor</p>
                            </div>

                            {/* Comisión Gestor — todos los roles */}
                            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 dark:bg-purple-900/20">
                                <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Comisión Gestor</p>
                                <p className="text-xl font-black text-purple-700 dark:text-purple-300">
                                    ${Number(comision_gestor_total).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">Con gestor</p>
                            </div>

                            {/* Ganancia Agencia — solo admin */}
                            {userRole === 'admin' && (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:bg-emerald-900/20">
                                    <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Ganancia Agencia</p>
                                    <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                                        ${Number(ganancia_agencia_total).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-xs">Neto agencia</p>
                                </div>
                            )}

                            {/* Ventas Especiales — si hubo en el turno */}
                            {ventas_especiales_count > 0 && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                                    <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Ventas Especiales</p>
                                    <p className="text-xl font-black text-amber-700 dark:text-amber-300">
                                        {ventas_especiales_count} venta{ventas_especiales_count > 1 ? 's' : ''}
                                    </p>
                                    {canViewEspecialesCostImpact && (
                                        <p className={`mt-1 text-xs font-semibold ${ventas_especiales_impacto_usd < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                                            Impacto: ${Number(ventas_especiales_impacto_usd).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Ventas Anuladas — si hubo en el turno */}
                            {ventas_anuladas_count > 0 && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                                    <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Ventas Anuladas</p>
                                    <p className="text-xl font-black text-red-700 dark:text-red-300">
                                        {ventas_anuladas_count} venta{ventas_anuladas_count > 1 ? 's' : ''}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
                                        Valor: ${Number(ventas_anuladas_total_usd).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Detalle de ventas especiales del turno */}
                        {ventas_especiales_count > 0 && (
                            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                                <p className="mb-3 text-sm font-bold text-amber-800 dark:text-amber-200">
                                    Ventas Especiales del Turno ({ventas_especiales_count})
                                </p>
                                <div className="space-y-2">
                                    {ventas_especiales_detalles.map((ve) => (
                                        <div key={ve.venta_id} className="flex items-center justify-between rounded-md border border-amber-200 bg-white px-3 py-2 text-xs dark:border-amber-700 dark:bg-amber-900/30">
                                            <div className="flex-1 space-y-0.5">
                                                <p className="font-semibold text-amber-800 dark:text-amber-200">
                                                    Venta #{ve.venta_id}{' '}
                                                    {ve.es_regalo && (
                                                        <span className="ml-1 rounded-full bg-amber-200 px-1.5 py-0.5 text-amber-700 dark:bg-amber-800 dark:text-amber-200">
                                                            Regalo
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="italic text-amber-600 dark:text-amber-400">{ve.motivo}</p>
                                                <p className="text-amber-500">{ve.fecha}</p>
                                            </div>
                                            <div className="ml-4 text-right">
                                                <p className="text-amber-700 dark:text-amber-300">Cobrado: <strong>${ve.total.toFixed(2)}</strong></p>
                                                {canViewEspecialesCostImpact && (
                                                    <>
                                                        <p className="text-red-600 dark:text-red-400">Costo: <strong>${Number(ve.costo ?? 0).toFixed(2)}</strong></p>
                                                        <p className={`font-bold ${(ve.impacto ?? 0) < 0 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-300'}`}>
                                                            Impacto: ${Number(ve.impacto ?? 0).toFixed(2)}
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
                                        <span>${Number(ventas_especiales_total_usd).toFixed(2)} USD</span>
                                    </div>
                                    {canViewEspecialesCostImpact && (
                                        <>
                                            <div className="flex justify-between text-xs font-bold text-red-700 dark:text-red-400">
                                                <span>Costo total especiales:</span>
                                                <span>${Number(ventas_especiales_costo_usd).toFixed(2)} USD</span>
                                            </div>
                                            <div className={`flex justify-between text-sm font-black ${ventas_especiales_impacto_usd < 0 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-300'}`}>
                                                <span>Impacto neto:</span>
                                                <span>${Number(ventas_especiales_impacto_usd).toFixed(2)} USD</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Detalle de ventas anuladas del turno */}
                        {ventas_anuladas_count > 0 && (
                            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                                <p className="mb-3 text-sm font-bold text-red-800 dark:text-red-200">
                                    Ventas Anuladas del Turno ({ventas_anuladas_count})
                                </p>
                                <div className="space-y-2">
                                    {ventas_anuladas_detalles.map((va) => (
                                        <div key={va.venta_id} className="flex items-start justify-between rounded-md border border-red-200 bg-white px-3 py-2 text-xs dark:border-red-700 dark:bg-red-900/30">
                                            <div className="flex-1 space-y-0.5">
                                                <p className="font-semibold text-red-800 dark:text-red-200">
                                                    Venta #{va.venta_id}
                                                    {va.tenia_impacto_financiero && (
                                                        <span className="ml-2 rounded-full bg-red-200 px-1.5 py-0.5 text-red-700 dark:bg-red-800 dark:text-red-300">
                                                            Afectó saldos
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="font-medium text-red-700 dark:text-red-300">
                                                    {MOTIVO_LABELS[va.motivo] ?? va.motivo}
                                                </p>
                                                {va.detalle && (
                                                    <p className="italic text-red-500 dark:text-red-400">{va.detalle}</p>
                                                )}
                                                <p className="text-red-400 dark:text-red-500">{va.fecha}</p>
                                            </div>
                                            <div className="ml-4 text-right">
                                                <p className="font-bold text-red-700 dark:text-red-300">
                                                    ${va.total.toFixed(2)} USD
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 border-t border-red-200 pt-2 dark:border-red-700">
                                    <div className="flex justify-between text-xs font-bold text-red-800 dark:text-red-200">
                                        <span>Valor total anulado:</span>
                                        <span>${Number(ventas_anuladas_total_usd).toFixed(2)} USD</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <AlertDialog
                    open={selectedVentaDetails.show}
                    onOpenChange={(open) => setSelectedVentaDetails({ ...selectedVentaDetails, show: open })}
                >
                    <AlertDialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Detalles de la Venta #{selectedVentaDetails.ventaId}</AlertDialogTitle>
                        </AlertDialogHeader>
                        <div className="space-y-4">
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
                                                            {op.productos.map((prod: any, pidx: number) => (
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
