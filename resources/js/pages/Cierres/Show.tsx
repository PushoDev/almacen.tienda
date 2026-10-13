import { type ComparativaClienteItem, type ComparativaItem, type CuentaDeCobro, TarjetaComparativa } from '@/components/cierres/comparativa';
import { TarjetaTurnos, type TurnoResumen } from '@/components/cierres/piezas';
import {
    type EnvioAbierto,
    type ItemMovimiento,
    type OperacionesMultiplesCierre,
    TarjetaTransaccionesTurno,
    type TransferenciaCompleta,
    type TransferenciaItem,
} from '@/components/cierres/transacciones-turno';
import HeadingSmall from '@/components/heading-small';
import { ViaLogo } from '@/components/monedas/via-logo';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SpotlightCard from '@/components/ui/spotlightcard';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import * as Collapsible from '@radix-ui/react-collapsible';
import {
    AlertTriangle,
    ArrowDown,
    ArrowRightLeft,
    ArrowUp,
    Banknote,
    Briefcase,
    Building2,
    ChevronDown,
    CreditCard,
    DollarSign,
    Eye,
    Globe,
    HandCoins,
    Package,
    Shuffle,
    ShoppingCart,
    Store,
    TrendingUp,
    Truck,
    Undo2,
    Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';

const CollapsibleRoot = Collapsible.Root;
const CollapsibleTrigger = Collapsible.CollapsibleTrigger;
const CollapsibleContent = Collapsible.CollapsibleContent;

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
    color: string;
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
    via_info?: { slug: string; nombre: string; imagen_url: string | null } | null;
    cuenta_nombre?: string | null;
    destino_nombre?: string | null;
    /** Logo de la cuenta destino; null si no tiene uno asignado (y en cierres viejos, que no lo traen). */
    banco?: { slug: string; nombre: string; imagen_url: string } | null;
    moneda_imagen_url?: string | null;
    productos: ProductItem[];
}

interface DetalleMoneda {
    moneda: string;
    moneda_imagen_url?: string | null;
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
    items_gastos: ItemMovimiento[];
    items_ingresos: ItemMovimiento[];
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

interface ProductoItem {
    nombre: string;
    marca: string | null;
    modelo: string | null;
    cantidad: number;
}

interface ComisionPVItemShow {
    venta_id: number;
    comision_usd: number;
    comision_cup: number;
    fecha: string;
    total_venta: number;
    productos: ProductoItem[];
}

interface ComisionGestorItem {
    venta_id: number;
    monto: number;
    moneda_codigo: string;
    monto_usd: number;
    tasa?: number | null;
    cuenta_nombre: string;
    cuenta_tipo: string;
    comentario: string;
    fecha: string;
    total_venta: number;
    productos: ProductoItem[];
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

/** Venta sin comisión (de la agencia); costo e impacto solo los recibe admin o moderador. */
interface VentaSinComisionItemShow {
    venta_id: number;
    total: number;
    costo?: number;
    impacto?: number;
    fecha: string;
}

interface VentaAnuladaItemShow {
    venta_id: number;
    total: number;
    motivo: string;
    detalle: string | null;
    fecha: string;
}

interface MensajeroDetalleItemShow {
    venta_id: number;
    monto_usd: number;
    monto_cup: number;
    tasa?: number | null;
    tipo: string;
    total_venta?: number;
    productos?: ProductoItem[];
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
    comisiones_pv_detalles?: ComisionPVItemShow[];
    ganancia_agencia_total?: number;
    ventas_especiales_count?: number;
    ventas_especiales_total_usd?: number;
    ventas_especiales_costo_usd?: number;
    ventas_especiales_impacto_usd?: number;
    ventas_especiales_detalles?: VentaEspecialItemShow[];
    ventas_sin_comision_count?: number;
    ventas_sin_comision_total_usd?: number;
    ventas_sin_comision_costo_usd?: number;
    ventas_sin_comision_impacto_usd?: number;
    ventas_sin_comision_detalles?: VentaSinComisionItemShow[];
    ventas_anuladas_count?: number;
    ventas_anuladas_total_usd?: number;
    ventas_anuladas_detalles?: VentaAnuladaItemShow[];
    mensajero_total_usd?: number;
    mensajero_total_cup?: number;
    mensajero_count?: number;
    mensajero_detalles?: MensajeroDetalleItemShow[];
    ventas_brutas_usd?: number;
    comisiones_pv_cup?: number;
    comisiones_gestor_cup?: number;
    comisiones_total_cup?: number;
    comparativa_cuentas?: ComparativaItem[];
    /** Lo cobrado en las cuentas de cobro del dueño del cierre (sin su saldo). */
    comparativa_cuentas_cobro?: CuentaDeCobro[];
    comparativa_clientes?: ComparativaClienteItem[];
    tiene_cierre_anterior?: boolean;
    /** Quién cerró (turno "Atendido por") y los turnos del periodo; null en los cierres anteriores a guardarlos. */
    turno_cierre?: string | null;
    turnos?: TurnoResumen[] | null;
    ventas_devueltas_count?: number;
    ventas_devueltas_total_usd?: number;
    ventas_devueltas_detalles?: Array<{ venta_id: number }>;
    /** Envíos que seguían en tránsito al cerrar (se guardan desde el 10-09); false en los cierres anteriores. */
    envios_guardados?: boolean;
    envios_en_transito?: EnviosGuardados | null;
    /** Solo admin y moderador (`visible`); se recalcula por las fechas del cierre. */
    operaciones_multiples?: OperacionesMultiplesCierre;
    transacciones_externas?: Array<{
        hora: string;
        tipo: string;
        desc: string;
        cuenta: string;
        usuario_nombre: string;
        monto: number;
        moneda: string;
        es_entrante: boolean;
    }>;
}

/** Lo que el cierre guardó de los envíos de dinero que seguían en tránsito al cerrarlo. */
interface EnviosGuardados {
    resumen?: { total: number; montos: Array<{ moneda: string; monto: number }> };
    enviados?: EnvioAbierto[];
    por_recibir?: EnvioAbierto[];
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
    comisiones_pv_detalles = [],
    ganancia_agencia_total = 0,
    ventas_especiales_count = 0,
    ventas_especiales_total_usd = 0,
    ventas_especiales_costo_usd = 0,
    ventas_especiales_impacto_usd = 0,
    ventas_especiales_detalles = [],
    ventas_sin_comision_count = 0,
    ventas_sin_comision_total_usd = 0,
    ventas_sin_comision_costo_usd = 0,
    ventas_sin_comision_impacto_usd = 0,
    ventas_sin_comision_detalles = [],
    ventas_anuladas_count = 0,
    ventas_anuladas_total_usd = 0,
    ventas_anuladas_detalles = [],
    mensajero_total_usd = 0,
    mensajero_total_cup = 0,
    mensajero_count = 0,
    mensajero_detalles = [],
    ventas_brutas_usd = 0,
    comisiones_pv_cup = 0,
    comisiones_gestor_cup = 0,
    comisiones_total_cup = 0,
    comparativa_cuentas = [],
    comparativa_cuentas_cobro = [],
    comparativa_clientes = [],
    tiene_cierre_anterior = false,
    transacciones_externas = [],
    turno_cierre = null,
    turnos = null,
    ventas_devueltas_count = 0,
    ventas_devueltas_total_usd = 0,
    ventas_devueltas_detalles = [],
    envios_guardados = false,
    envios_en_transito = null,
    operaciones_multiples,
}: Props) {
    const canViewEspecialesCostImpact = userRole === 'admin' || userRole === 'moderador';

    const enviosGuardadosLista = [...(envios_en_transito?.enviados ?? []), ...(envios_en_transito?.por_recibir ?? [])];
    const enviosGuardadosTotal = envios_en_transito?.resumen?.total ?? enviosGuardadosLista.length;
    const enviosGuardadosAtrasados = enviosGuardadosLista.filter((envio) => envio.atrasado).length;

    const [showVentasSinComisionDialog, setShowVentasSinComisionDialog] = useState(false);
    const [showAnuladasDialog, setShowAnuladasDialog] = useState(false);
    const [showMensajeriaDialog, setShowMensajeriaDialog] = useState(false);
    const [showComisionPVDialog, setShowComisionPVDialog] = useState(false);
    const [showComisionGestorDialog, setShowComisionGestorDialog] = useState(false);
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
        const todasOperaciones = (cierre.detalles ?? []).flatMap((d: any) => d.operaciones_detalle ?? []);
        return todasOperaciones.filter((op: any) => String(op.venta_id) === String(ventaId));
    };

    const operacionSeleccionada = selectedVentaDetails.ventaId ? getOperacionesPorVenta(selectedVentaDetails.ventaId) : [];

    const moneda_referencia = 'USD';

    const calculos = useMemo(() => {
        const detalles = cierre.detalles || [];
        const usdDetalle = detalles.find((d) => d.moneda === 'USD');
        const eurDetalle = detalles.find((d) => d.moneda === 'EUR');
        const cupDetalle = detalles.find((d) => d.moneda === 'CUP');

        const usdEfectivo = (usdDetalle?.ventas_efectivo_cuentas ?? 0) + ((eurDetalle?.ventas_efectivo_cuentas ?? 0) / (eurDetalle?.tasa_cambio ?? 1));
        const cupEfectivo = cupDetalle?.ventas_efectivo_cuentas ?? 0;
        const usdTransferencia = usdDetalle?.ventas_transferencia_cuentas ?? 0;
        const cupTransferencias = cupDetalle?.ventas_transferencia_cuentas ?? 0;

        return {
            saldo_inicial: cierre.saldo_inicial || 0,
            ventas_efectivo: cierre.ventas_efectivo || 0,
            ventas_otros: cierre.ventas_otros || 0,
            total_gastos: cierre.total_gastos || 0,
            total_devoluciones: cierre.total_devoluciones || 0,
            saldo_esperado_global: cierre.saldo_esperado || 0,
            detalles,
            comisiones_gestor_total: cierre.comisiones_gestor || 0,
            comisiones_gestor_detalles: cierre.comisiones_gestor_detalles || [],
            ventas_a_cuentas_total_usd: calcularVentasACuentasTotal(),
            ventas_a_clientes_total_usd: calcularVentasAClientesTotal(),
            ventas_a_cuentas_efectivo_usd: calcularVentasACuentasEfectivo(),
            ventas_a_cuentas_transferencia_usd: calcularVentasACuentasTransferencia(),
            ventas_a_clientes_efectivo_usd: calcularVentasAClientesEfectivo(),
            ventas_a_clientes_transferencia_usd: calcularVentasAClientesTransferencia(),
            usd_efectivo: usdEfectivo,
            cup_efectivo: cupEfectivo,
            usd_transferencia: usdTransferencia,
            cup_transferencias: cupTransferencias,
            usd_internacional: calcularVentasAClientesTotal(),
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
        color: string;
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
        color: p.color || '',
        codigo: p.codigo || '',
        imagen_url: p.imagen_url || '',
        categoria: p.categoria || '',
        cantidad: Number(p.cantidad) || 0,
        precio_base: Number(p.precio_base) || 0,
        precio_venta: Number(p.precio_venta) || 0,
        total: Number(p.total) || 0,
        comision: Number(p.comision) || 0,
    }));
    const totalVentasProductos = lineasProductos.reduce((s: number, r) => s + r.total, 0);
    const totalComisionProductos = lineasProductos.reduce((s: number, r) => s + r.comision, 0);

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

    // d.gastos/d.ingresos_extra/d.transferencias_salientes vienen en la moneda de cada `d` (no en USD).
    // Hay que dividir por la tasa de esa moneda antes de sumar entre monedas distintas — mismo patrón
    // que MonedaController::calcularCapitalTotal() y el saldo_esperado del backend ($monto / $tasa).
    const totalGastos = (calculos.detalles ?? []).reduce((sum: number, d) => sum + (d.gastos ?? 0) / (d.tasa_cambio > 0 ? d.tasa_cambio : 1), 0);
    const totalIngresos = (calculos.detalles ?? []).reduce((sum: number, d) => sum + (d.ingresos_extra ?? 0) / (d.tasa_cambio > 0 ? d.tasa_cambio : 1), 0);
    const totalTransferencias = (calculos.detalles ?? []).reduce((sum: number, d) => sum + (d.transferencias_salientes ?? 0) / (d.tasa_cambio > 0 ? d.tasa_cambio : 1), 0);

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

    // Deduplicado por movimiento_id: cada transferencia genera un item "saliente" en el
    // bucket de su moneda origen y un item "entrante" en el bucket de su moneda destino
    // (mismos datos, vistos desde cada lado) — sin esto se listaría cada una 2 veces.
    // Mismo criterio que CierreCajaController::obtenerResumenTransferencias() en PHP.
    const vistosTransferencias = new Set<string>();
    const todasTransferencias: TransferenciaCompleta[] = [];
    (calculos.detalles ?? []).forEach((d) => {
        (d.items_transferencias_salientes ?? []).forEach((t) => {
            const baseId = String(t.id ?? '').replace('t_entrada_', '').replace('t_', '');
            if (vistosTransferencias.has(baseId)) return;
            vistosTransferencias.add(baseId);
            todasTransferencias.push({ ...t, tipo: 'saliente' });
        });
        (d.items_transferencias_entrantes ?? []).forEach((t) => {
            const baseId = String(t.id ?? '').replace('t_entrada_', '').replace('t_', '');
            if (vistosTransferencias.has(baseId)) return;
            vistosTransferencias.add(baseId);
            todasTransferencias.push({ ...t, tipo: 'entrante' });
        });
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Cierre #${cierre.id}`} />

            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-6">
                    <HeadingSmall
                        title={`Reporte de Cierre #${cierre.id}`}
                        description={`Auditoría detallada de movimientos realizados por ${cierre.usuario?.name || 'usuario'}.${turno_cierre ? ` Cerrado por ${turno_cierre}.` : ''}`}
                    />
                    <Wallet
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 transform opacity-40"
                    />
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                        <Card className="border-emerald-200 bg-emerald-500/5">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                                        <DollarSign className="h-5 w-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground text-xs">USD Efectivo</p>
                                        <p className="text-2xl font-bold">${Number(calculos.usd_efectivo || 0).toFixed(2)}</p>
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
                                        <p className="text-2xl font-bold">${Number(calculos.cup_efectivo || 0).toFixed(2)}</p>
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
                                        <p className="text-2xl font-bold">${Number(calculos.usd_internacional || 0).toFixed(2)}</p>
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
                                        <p className="text-2xl font-bold">${Number(calculos.cup_transferencias || 0).toFixed(2)}</p>
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
                                        <p className="text-2xl font-bold">${Number(calculos.usd_transferencia || 0).toFixed(2)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {false && (
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
                )}

                <Card className="gap-0 overflow-hidden border-l-4 border-teal-500/30 py-0 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader className="border-b bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Package className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Ventas</CardTitle>
                                <CardDescription className="text-teal-100">
                                    Productos vendidos el{' '}
                                    {new Date(cierre.fecha_apertura).toLocaleDateString('es-ES', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                    . Importes en {moneda_referencia} (moneda de referencia).
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Producto</th>
                                        <th className="px-4 py-3 text-left font-semibold">Marca</th>
                                        <th className="px-4 py-3 text-left font-semibold">Modelo</th>
                                        <th className="px-4 py-3 text-left font-semibold">Capacidad</th>
                                        <th className="px-4 py-3 text-center font-semibold">Cantidad</th>
                                        <th className="px-4 py-3 text-right font-semibold">Precio Unit</th>
                                        <th className="px-4 py-3 text-right font-semibold">Total Real</th>
                                        <th className="px-4 py-3 text-right font-semibold">Comisión Asignada</th>
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
                                                <td className="px-4 py-2 text-center">
                                                    <Badge className="border border-teal-400/30 bg-teal-500/10 px-2.5 py-0.5 font-bold text-teal-700 backdrop-blur-sm dark:text-teal-300">
                                                        {linea.cantidad}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-2 text-right font-mono">${Number(linea.precio_base).toFixed(2)}</td>
                                                <td className="px-4 py-2 text-right font-mono font-medium">${Number(linea.total).toFixed(2)}</td>
                                                <td className="px-4 py-2 text-right">
                                                    <Badge className="border border-emerald-400/30 bg-emerald-500/10 font-mono text-emerald-700 backdrop-blur-sm dark:text-emerald-300">
                                                        ${Number(linea.comision).toFixed(2)}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="text-muted-foreground px-4 py-8 text-center italic">
                                                No hay ventas en este turno
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                <tfoot className="bg-muted/50">
                                    <tr>
                                        <td colSpan={4} className="px-4 py-3 text-right font-bold">
                                            Total
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Badge className="border-0 bg-gradient-to-r from-teal-500 to-teal-600 px-3 py-0.5 font-black text-white shadow-md shadow-teal-500/30">
                                                {lineasProductos.reduce((sum, p) => sum + p.cantidad, 0)}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3"></td>
                                        <td className="px-4 py-3 text-right font-mono text-lg font-bold text-teal-700 dark:text-teal-300">
                                            ${totalVentasProductos.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-lg font-bold text-emerald-600">
                                            ${totalComisionProductos.toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                <Card className="gap-0 overflow-hidden border-l-4 border-emerald-500/30 py-0 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader className="border-b bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Banknote className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Por dónde entraron</CardTitle>
                                <CardDescription className="text-emerald-100">
                                    Cantidad de ventas y total por método, separado por moneda. Cada total es en su propia moneda.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                        {monedasConPagos.length > 0 ? (
                            monedasConPagos.map((moneda) => {
                                const metodos = pagosPorMonedaYMetodo[moneda];
                                const totalMoneda = Object.values(metodos).reduce((s, x) => s + (Number(x.total) || 0), 0);
                                const cantidadMoneda = Object.values(metodos).reduce((s, x) => s + (x.cantidad || 0), 0);
                                const totalEquivalenteMoneda = Object.values(metodos).reduce((s, x) => s + (x.totalEquivalente || 0), 0);
                                const detalleMoneda = calculos.detalles?.find((d) => d.moneda === moneda);

                                return (
                                    <div key={moneda} className="space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-400/30 bg-emerald-500/5 px-4 py-3 backdrop-blur-sm dark:bg-emerald-500/10">
                                            <div className="flex items-center gap-3">
                                                {detalleMoneda?.moneda_imagen_url ? (
                                                    <img src={detalleMoneda.moneda_imagen_url} alt={moneda} className="h-9 w-auto object-contain drop-shadow-md" />
                                                ) : (
                                                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                                        <DollarSign className="h-5 w-5" />
                                                    </span>
                                                )}
                                                <Badge className="border-0 bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-0.5 text-sm font-black text-white shadow-md shadow-emerald-500/30">
                                                    {moneda}
                                                </Badge>
                                            </div>
                                            <Badge className="border border-emerald-400/30 bg-emerald-500/10 text-emerald-700 backdrop-blur-sm dark:text-emerald-300">
                                                {cantidadMoneda} {cantidadMoneda === 1 ? 'venta' : 'ventas'} · {Number(totalMoneda).toFixed(2)} {moneda}
                                            </Badge>
                                        </div>
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
                                                    const primeraOperacion = operacionesPorMetodo[0];
                                                    const esEfectivoMetodo = primeraOperacion?.tipo_pago === 'efectivo';

                                                    return (
                                                        <CollapsibleRoot key={`${moneda}-${etiqueta}`} asChild>
                                                            <>
                                                                <CollapsibleTrigger asChild>
                                                                    <TableRow className="hover:bg-muted/50 cursor-pointer">
                                                                        <TableCell className="flex items-center gap-3 font-medium">
                                                                            <ChevronDown className="collapsible-trigger-icon h-4 w-4 shrink-0 transition-transform" />
                                                                            {esEfectivoMetodo ? (
                                                                                primeraOperacion?.banco?.imagen_url || primeraOperacion?.moneda_imagen_url ? (
                                                                                    <img
                                                                                        src={primeraOperacion.banco?.imagen_url ?? primeraOperacion.moneda_imagen_url ?? ''}
                                                                                        alt=""
                                                                                        aria-hidden="true"
                                                                                        className="h-8 w-auto max-w-14 object-contain"
                                                                                    />
                                                                                ) : (
                                                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                                                                        <Banknote className="h-4 w-4" />
                                                                                    </span>
                                                                                )
                                                                            ) : (
                                                                                <>
                                                                                    {primeraOperacion?.via_info && (
                                                                                        <ViaLogo
                                                                                            slug={primeraOperacion.via_info.slug}
                                                                                            nombre={primeraOperacion.via_info.nombre}
                                                                                            imagenUrl={primeraOperacion.via_info.imagen_url}
                                                                                            className="h-6"
                                                                                        />
                                                                                    )}
                                                                                    {primeraOperacion?.banco?.imagen_url && primeraOperacion.banco.slug !== primeraOperacion.via_info?.slug ? (
                                                                                        <img
                                                                                            src={primeraOperacion.banco.imagen_url}
                                                                                            alt={primeraOperacion.banco.nombre}
                                                                                            className="h-8 w-auto max-w-14 rounded-sm object-contain shadow-sm"
                                                                                        />
                                                                                    ) : (
                                                                                        !primeraOperacion?.via_info &&
                                                                                        !primeraOperacion?.banco && (
                                                                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">
                                                                                                <CreditCard className="h-4 w-4" />
                                                                                            </span>
                                                                                        )
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                            <span className="flex flex-col gap-1">
                                                                                <span>{etiqueta}</span>
                                                                                <Badge
                                                                                    className={
                                                                                        esEfectivoMetodo
                                                                                            ? 'w-fit border border-emerald-400/30 bg-emerald-500/10 text-emerald-700 backdrop-blur-sm dark:text-emerald-300'
                                                                                            : 'w-fit border border-sky-400/30 bg-sky-500/10 text-sky-700 backdrop-blur-sm dark:text-sky-300'
                                                                                    }
                                                                                >
                                                                                    {esEfectivoMetodo ? 'Efectivo' : 'Transferencia'}
                                                                                </Badge>
                                                                            </span>
                                                                        </TableCell>

                                                                        <TableCell className="text-center">
                                                                            <Badge className="border border-teal-400/30 bg-teal-500/10 px-2.5 font-mono font-bold text-teal-700 backdrop-blur-sm dark:text-teal-300">
                                                                                {data.cantidad}
                                                                            </Badge>
                                                                        </TableCell>

                                                                        <TableCell className="text-right font-mono">{total.toFixed(2)}</TableCell>

                                                                        <TableCell className="text-right">
                                                                            <Badge className="border-0 bg-gradient-to-r from-emerald-500 to-green-600 font-mono font-bold text-white shadow-md shadow-emerald-500/30">
                                                                                ${totalEquivalente.toFixed(2)}
                                                                            </Badge>
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
                                                                                                        {operacion.cuenta_nombre ? (
                                                                                                            <span className="flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/5 py-1 pr-3 pl-1.5 text-sm backdrop-blur-sm">
                                                                                                                {operacion.banco?.imagen_url ? (
                                                                                                                    <img
                                                                                                                        src={operacion.banco.imagen_url}
                                                                                                                        alt={operacion.banco.nombre}
                                                                                                                        className="h-6 w-auto max-w-10 object-contain"
                                                                                                                    />
                                                                                                                ) : (
                                                                                                                    <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                                                                                )}
                                                                                                                <span className="font-medium">{operacion.cuenta_nombre}</span>
                                                                                                            </span>
                                                                                                        ) : (
                                                                                                            operacion.destino_nombre && (
                                                                                                                <Badge className="border border-sky-400/30 bg-sky-500/10 text-sky-700 backdrop-blur-sm dark:text-sky-300">
                                                                                                                    {operacion.destino_nombre}
                                                                                                                </Badge>
                                                                                                            )
                                                                                                        )}

                                                                                                        <Badge className="border-0 bg-gradient-to-r from-emerald-500 to-green-600 font-mono font-bold text-white shadow-md shadow-emerald-500/30">
                                                                                                            ${Number(operacion.monto).toFixed(2)}
                                                                                                        </Badge>
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
                                                    <TableCell className="text-center">
                                                        <Badge className="border-0 bg-gradient-to-r from-teal-500 to-teal-600 px-3 font-mono font-black text-white shadow-md shadow-teal-500/30">
                                                            {cantidadMoneda}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-bold">
                                                        {Number(totalMoneda).toFixed(2)} {moneda}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge className="border-0 bg-gradient-to-r from-emerald-500 to-green-600 px-3 font-mono text-base font-black text-white shadow-md shadow-emerald-500/30">
                                                            ${totalEquivalenteMoneda.toFixed(2)}
                                                        </Badge>
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
                    <div className={`grid grid-cols-2 gap-4 md:grid-cols-3 ${operaciones_multiples?.visible ? 'xl:grid-cols-7' : 'xl:grid-cols-6'}`}>
                        <SpotlightCard
                            estado="agotado"
                            className="rounded-xl border border-red-400/30 bg-red-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-red-500/10"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md shadow-red-500/30">
                                    <ArrowUp className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Gastos</p>
                                    <p className="text-2xl font-black text-red-600 dark:text-red-400">${Number(totalGastos).toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                                <Badge className="border border-red-400/30 bg-red-500/10 text-red-700 backdrop-blur-sm dark:text-red-300">USD</Badge>
                                <Badge className="border-0 bg-gradient-to-r from-red-500 to-rose-600 shadow-md shadow-red-500/30">{todosGastos.length} oper.</Badge>
                            </div>
                        </SpotlightCard>

                        <SpotlightCard
                            estado="disponible"
                            className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-emerald-500/10"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/30">
                                    <ArrowDown className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Ingresos</p>
                                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">${Number(totalIngresos).toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                                <Badge className="border border-emerald-400/30 bg-emerald-500/10 text-emerald-700 backdrop-blur-sm dark:text-emerald-300">USD</Badge>
                                <Badge className="border-0 bg-gradient-to-r from-emerald-500 to-green-600 shadow-md shadow-emerald-500/30">{todosIngresos.length} oper.</Badge>
                            </div>
                        </SpotlightCard>

                        <SpotlightCard
                            estado="tarjeta"
                            className="rounded-xl border border-blue-400/30 bg-blue-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-blue-500/10"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30">
                                    <TrendingUp className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Transferencias</p>
                                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400">${Number(totalTransferencias).toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                                <Badge className="border border-blue-400/30 bg-blue-500/10 text-blue-700 backdrop-blur-sm dark:text-blue-300">USD</Badge>
                                <Badge className="border-0 bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md shadow-blue-500/30">{todasTransferencias.length} oper.</Badge>
                            </div>
                        </SpotlightCard>

                        <SpotlightCard
                            estado="global"
                            className="rounded-xl border border-purple-400/30 bg-purple-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-purple-500/10"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-violet-600 text-white shadow-md shadow-purple-500/30">
                                    <Briefcase className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Gestores</p>
                                    {comisionesGestorDetalles.length > 0 ? (
                                        Object.entries(comisionesPorMoneda).map(([moneda, data]) => (
                                            <p key={moneda} className="text-2xl leading-tight font-black text-purple-600 dark:text-purple-400">
                                                -${Number(data.total).toFixed(2)} <span className="text-sm font-bold">{moneda}</span>
                                            </p>
                                        ))
                                    ) : (
                                        <p className="text-2xl font-black text-purple-600 dark:text-purple-400">$0.00</p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                                <Badge className="border border-purple-400/30 bg-purple-500/10 text-purple-700 backdrop-blur-sm dark:text-purple-300">Comisión</Badge>
                                <Badge className="border-0 bg-gradient-to-r from-purple-500 to-violet-600 shadow-md shadow-purple-500/30">{comisionesGestorDetalles.length} oper.</Badge>
                            </div>
                        </SpotlightCard>

                        {/* En tránsito: lo que quedó guardado al cerrar. Los cierres anteriores a guardarlo no lo tienen. */}
                        <SpotlightCard
                            estado="especial"
                            className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-amber-500/10"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30">
                                    <Truck className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">En tránsito al cerrar</p>
                                    {!envios_guardados ? (
                                        <p className="text-muted-foreground text-sm font-medium italic">No se guardó en este cierre</p>
                                    ) : (envios_en_transito?.resumen?.montos ?? []).length > 0 ? (
                                        (envios_en_transito?.resumen?.montos ?? []).map(({ moneda, monto }) => (
                                            <p key={moneda} className="text-2xl leading-tight font-black text-amber-600 dark:text-amber-400">
                                                ${Number(monto).toFixed(2)} <span className="text-sm font-bold">{moneda}</span>
                                            </p>
                                        ))
                                    ) : (
                                        <p className="text-2xl font-black text-amber-600 dark:text-amber-400">$0.00</p>
                                    )}
                                </div>
                            </div>
                            {envios_guardados && (
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                    <Badge className="border-0 bg-gradient-to-r from-amber-500 to-orange-600 shadow-md shadow-amber-500/30">
                                        {enviosGuardadosTotal} {enviosGuardadosTotal === 1 ? 'envío' : 'envíos'}
                                    </Badge>
                                    {enviosGuardadosAtrasados > 0 && (
                                        <Badge className="border border-red-400/40 bg-red-500/15 text-red-700 backdrop-blur-sm dark:text-red-300">
                                            {enviosGuardadosAtrasados} atrasado{enviosGuardadosAtrasados === 1 ? '' : 's'}
                                        </Badge>
                                    )}
                                </div>
                            )}
                        </SpotlightCard>

                        {operaciones_multiples?.visible && (
                            <SpotlightCard
                                estado="indigo"
                                className="rounded-xl border border-cyan-400/30 bg-cyan-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-cyan-500/10"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/30">
                                        <Shuffle className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Op. Múltiples</p>
                                        <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{operaciones_multiples.resumen.total}</p>
                                    </div>
                                </div>
                                <div className="mt-3 space-y-1 text-xs">
                                    {operaciones_multiples.resumen.entradas.map(({ moneda, monto }) => (
                                        <p key={`e-${moneda}`} className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                            Entró +${Number(monto).toFixed(2)} {moneda}
                                        </p>
                                    ))}
                                    {operaciones_multiples.resumen.salidas.map(({ moneda, monto }) => (
                                        <p key={`s-${moneda}`} className="font-mono font-bold text-red-600 dark:text-red-400">
                                            Salió -${Number(monto).toFixed(2)} {moneda}
                                        </p>
                                    ))}
                                    <div className="flex justify-end pt-1">
                                        <Badge className="border-0 bg-gradient-to-r from-cyan-500 to-sky-600 shadow-md shadow-cyan-500/30">
                                            {operaciones_multiples.resumen.total} oper.
                                        </Badge>
                                    </div>
                                </div>
                            </SpotlightCard>
                        )}

                        <SpotlightCard
                            estado="sin-comision"
                            className="rounded-xl border border-pink-400/30 bg-pink-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-pink-500/10"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/30">
                                    <Undo2 className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Devueltas</p>
                                    <p className="text-2xl font-black text-pink-600 dark:text-pink-400">
                                        ${Number(ventas_devueltas_total_usd).toFixed(2)} <span className="text-sm font-bold">USD</span>
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                <Badge className="border border-pink-400/30 bg-pink-500/10 font-mono text-pink-700 dark:text-pink-300">
                                    {ventas_devueltas_detalles
                                        .slice(0, 3)
                                        .map((v) => `#${v.venta_id}`)
                                        .join(' ') || 'Ninguna'}
                                    {ventas_devueltas_detalles.length > 3 ? ' …' : ''}
                                </Badge>
                                <Badge className="border-0 bg-gradient-to-r from-pink-500 to-rose-600 shadow-md shadow-pink-500/30">
                                    {ventas_devueltas_count} {ventas_devueltas_count === 1 ? 'venta' : 'ventas'}
                                </Badge>
                            </div>
                        </SpotlightCard>
                    </div>
                </div>

                {/* Turnos de este cierre: quién atendió ("Atendido por") y qué movió cada uno */}
                <TarjetaTurnos turnos={turnos} nota={turno_cierre ? `Cerró el cierre: ${turno_cierre}.` : undefined} />

                {/* Transacciones del Turno: Gastos, Ingresos, Transferencias, envíos en tránsito y Op. Múltiples */}
                <TarjetaTransaccionesTurno
                    gastos={todosGastos}
                    ingresos={todosIngresos}
                    transferencias={todasTransferencias}
                    enviosEnviados={envios_en_transito?.enviados ?? []}
                    enviosPorRecibir={envios_en_transito?.por_recibir ?? []}
                    operacionesMultiples={operaciones_multiples}
                    descripcion={`Gastos, ingresos y transferencias del turno — propias y de otros usuarios sobre las cuentas de ${cierre.usuario?.name || 'este vendedor'}. Las filas resaltadas son de otros usuarios.`}
                    etiquetaPropio={userRole === 'vendedor' ? 'Tú' : cierre.usuario?.name || 'Dueño del cierre'}
                    cierreGuardado
                    enviosGuardados={envios_guardados}
                />

                {/* Comparativa con Cierre Anterior */}
                <TarjetaComparativa
                    cuentas={comparativa_cuentas}
                    cuentasCobro={comparativa_cuentas_cobro}
                    clientes={comparativa_clientes}
                    tieneCierreAnterior={tiene_cierre_anterior}
                    verClientes={userRole !== 'vendedor'}
                    cierreGuardado
                />

                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold tracking-wider uppercase">Resumen del Cierre</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Total de Venta — ícono/etiqueta a un lado, el número protagonista al otro */}
                        <SpotlightCard estado="disponible" className="border-primary/30 bg-primary/5 relative overflow-hidden rounded-lg border p-4 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-primary/15 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                                            <ShoppingCart className="h-4.5 w-4.5" />
                                        </span>
                                        <p className="text-muted-foreground text-xs font-bold uppercase">Total de Ventas del Turno</p>
                                    </div>
                                    <p className="text-muted-foreground mt-2 text-sm">Total real de productos vendidos</p>
                                </div>
                                <p className="text-5xl font-black text-emerald-600">${Number(totalVentasProductos).toFixed(2)}</p>
                            </div>
                        </SpotlightCard>

                        {/* Widgets: Comisión PV, Comisión Gestor, Ganancia Agencia, Especiales, Sin Comisión —
                            flex-wrap en vez de grid-cols fijo: con 3 a 5 widgets activos se acomodan solos. */}
                        <div className="flex flex-wrap gap-3">
                            {/* Comisión Punto de Venta — todos los roles */}
                            <SpotlightCard estado="tarjeta" className="min-w-[220px] flex-1 rounded-lg border border-blue-400/30 bg-blue-500/5 p-3 shadow-sm backdrop-blur-sm dark:bg-blue-500/10">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400">
                                        <Store className="h-4 w-4" />
                                    </span>
                                    <p className="text-muted-foreground text-xs font-bold uppercase">Comisión P.V.</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge className="gap-1 border-0 bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-1 text-2xl font-black text-white shadow-md shadow-blue-500/30">
                                        ${Number(comision_pv_total).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Badge>
                                    <Badge className="gap-1 border border-blue-400/30 bg-blue-500/10 text-sm font-semibold text-blue-700 backdrop-blur-sm dark:text-blue-300">
                                        {Number(comisiones_pv_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                    </Badge>
                                </div>
                                {comisiones_pv_detalles.length > 0 && (
                                    <button onClick={() => setShowComisionPVDialog(true)} className="mt-1 text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400">
                                        Ver detalles
                                    </button>
                                )}
                            </SpotlightCard>

                            {/* Comisión Gestor — todos los roles */}
                            <SpotlightCard estado="global" className="min-w-[220px] flex-1 rounded-lg border border-purple-400/30 bg-purple-500/5 p-3 shadow-sm backdrop-blur-sm dark:bg-purple-500/10">
                                <div className="mb-2 flex items-center gap-2">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400">
                                        <HandCoins className="h-4 w-4" />
                                    </span>
                                    <p className="text-muted-foreground text-xs font-bold uppercase">Comisión Gestor</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge className="gap-1 border-0 bg-gradient-to-r from-purple-500 to-purple-600 px-3 py-1 text-2xl font-black text-white shadow-md shadow-purple-500/30">
                                        ${Number(comision_gestor_total).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Badge>
                                    <Badge className="gap-1 border border-purple-400/30 bg-purple-500/10 text-sm font-semibold text-purple-700 backdrop-blur-sm dark:text-purple-300">
                                        {Number(comisiones_gestor_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                    </Badge>
                                </div>
                                {comisionesGestorDetalles.length > 0 && (
                                    <button onClick={() => setShowComisionGestorDialog(true)} className="mt-1 text-xs text-purple-600 underline hover:text-purple-800 dark:text-purple-400">
                                        Ver detalles
                                    </button>
                                )}
                            </SpotlightCard>

                            {/* Ganancia Agencia — solo admin — efecto metálico, es el dato que más le importa al dueño */}
                            {userRole === 'admin' && (
                                <SpotlightCard estado="especial" className="min-w-[220px] flex-1 rounded-lg border border-amber-300/40 bg-amber-500/5 p-3 shadow-sm backdrop-blur-sm dark:bg-amber-500/10">
                                    <div className="mb-2 flex items-center gap-2">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                            <TrendingUp className="h-4 w-4" />
                                        </span>
                                        <p className="text-muted-foreground text-xs font-bold uppercase">Ganancia Agencia</p>
                                    </div>
                                    <Badge className="gap-1 border border-amber-200 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 px-3 py-1 text-2xl font-black text-amber-950 shadow-md shadow-amber-500/40 transition-transform hover:scale-105">
                                        ${Number(ganancia_agencia_total).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Badge>
                                    <p className="text-muted-foreground mt-1.5 text-sm">Neto agencia</p>
                                </SpotlightCard>
                            )}

                            {/* Ventas Especiales — si hubo en el turno */}
                            {ventas_especiales_count > 0 && (
                                <SpotlightCard estado="especial" className="min-w-[220px] flex-1 rounded-lg border border-amber-400/30 bg-amber-500/5 p-3 shadow-sm backdrop-blur-sm dark:bg-amber-500/10">
                                    <div className="mb-2 flex items-center gap-2">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                            <AlertTriangle className="h-4 w-4" />
                                        </span>
                                        <p className="text-muted-foreground text-xs font-bold uppercase">Ventas Especiales</p>
                                    </div>
                                    <Badge className="gap-1 border-0 bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1 text-2xl font-black text-white shadow-md shadow-amber-500/30">
                                        {ventas_especiales_count} venta{ventas_especiales_count > 1 ? 's' : ''}
                                    </Badge>
                                    {canViewEspecialesCostImpact && (
                                        <p className={`mt-1.5 text-sm font-semibold ${ventas_especiales_impacto_usd < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                                            Impacto: ${Number(ventas_especiales_impacto_usd).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                        </p>
                                    )}
                                </SpotlightCard>
                            )}

                            {/* Ventas sin comisión (de la agencia) — si hubo en el turno */}
                            {ventas_sin_comision_count > 0 && (
                                <SpotlightCard estado="sin-comision" className="min-w-[220px] flex-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-3 shadow-sm backdrop-blur-sm dark:bg-fuchsia-500/10">
                                    <div className="mb-2 flex items-center gap-2">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400">
                                            <Building2 className="h-4 w-4" />
                                        </span>
                                        <p className="text-muted-foreground text-xs font-bold uppercase">Ventas sin Comisión</p>
                                    </div>
                                    <Badge className="gap-1 border-0 bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 px-3 py-1 text-2xl font-black text-white shadow-md shadow-fuchsia-500/30">
                                        {ventas_sin_comision_count} venta{ventas_sin_comision_count > 1 ? 's' : ''}
                                    </Badge>
                                    {canViewEspecialesCostImpact && (
                                        <p className="mt-1.5 text-sm font-semibold text-fuchsia-600">
                                            Impacto: ${Number(ventas_sin_comision_impacto_usd).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                        </p>
                                    )}
                                </SpotlightCard>
                            )}
                        </div>

                        {/* Resumen Financiero del Turno + resumen de Ventas sin Comisión — en la misma fila
                            (el detalle completo de ventas sin comisión vive en un modal, como Comisión P.V./Gestor/Anuladas/Mensajería). */}
                        <div className="flex flex-wrap gap-3">
                            {userRole !== 'vendedor' && ventas_brutas_usd > 0 && (
                                <SpotlightCard estado="disponible" className="min-w-[280px] flex-1 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
                                    <p className="text-muted-foreground mb-2 text-xs font-bold uppercase">Resumen Financiero del Turno</p>
                                    <div className="space-y-2 text-base">
                                        <div className="flex items-center justify-between">
                                            <span className="text-emerald-700 dark:text-emerald-400">Ventas brutas</span>
                                            <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                                                ${Number(ventas_brutas_usd).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                                            </span>
                                        </div>
                                        {comisiones_total_cup > 0 && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-amber-600 dark:text-amber-400">
                                                    Comisiones
                                                    {comisiones_pv_cup > 0 && comisiones_gestor_cup > 0
                                                        ? ' (PV + Gestor)'
                                                        : comisiones_gestor_cup > 0 ? ' (Gestor)' : ' (PV)'}
                                                </span>
                                                <span className="font-semibold text-amber-700 dark:text-amber-300">
                                                    −{Number(comisiones_total_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                                </span>
                                            </div>
                                        )}
                                        {mensajero_total_cup > 0 && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sky-600 dark:text-sky-400">Mensajería</span>
                                                <span className="font-semibold text-sky-700 dark:text-sky-300">
                                                    −{Number(mensajero_total_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                                </span>
                                            </div>
                                        )}
                                        <div className="mt-2 flex items-center justify-between border-t border-emerald-200 pt-2 dark:border-emerald-700">
                                            <span className="font-bold text-emerald-800 dark:text-emerald-200">Ganancia neta agencia</span>
                                            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                                                ${Number(ganancia_agencia_total).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                                            </span>
                                        </div>
                                    </div>
                                </SpotlightCard>
                            )}

                            {/* Ventas sin comisión — resumen compacto, detalle completo en el modal */}
                            {ventas_sin_comision_count > 0 && (
                                <SpotlightCard estado="sin-comision" className="min-w-[220px] flex-1 rounded-lg border border-fuchsia-300 bg-fuchsia-100 p-3 dark:border-fuchsia-800 dark:bg-fuchsia-950">
                                    <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Ventas sin Comisión</p>
                                    <p className="text-xl font-black text-fuchsia-700 dark:text-fuchsia-300">
                                        {ventas_sin_comision_count} venta{ventas_sin_comision_count > 1 ? 's' : ''}
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-fuchsia-600 dark:text-fuchsia-400">
                                        Cobrado: ${Number(ventas_sin_comision_total_usd).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                                    </p>
                                    {canViewEspecialesCostImpact && (
                                        <p className={`text-sm font-semibold ${ventas_sin_comision_impacto_usd < 0 ? 'text-red-600' : 'text-fuchsia-600 dark:text-fuchsia-400'}`}>
                                            Impacto: ${Number(ventas_sin_comision_impacto_usd).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                                        </p>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-2 h-7 border-fuchsia-400 text-xs text-fuchsia-700 hover:bg-fuchsia-200 dark:border-fuchsia-700 dark:text-fuchsia-300"
                                        onClick={() => setShowVentasSinComisionDialog(true)}
                                    >
                                        Ver detalles
                                    </Button>
                                </SpotlightCard>
                            )}
                        </div>

                        {/* Mensajería del turno — informativo */}
                        {mensajero_count > 0 && (
                            <SpotlightCard estado="tarjeta" className="rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-950">
                                <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Mensajería del Turno</p>
                                <p className="text-xl font-black text-sky-700 dark:text-sky-300">
                                    {Number(mensajero_total_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                </p>
                                <p className="mt-1 text-sm text-sky-600 dark:text-sky-400">
                                    ≈ ${Number(mensajero_total_usd).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD · {mensajero_count} entrega{mensajero_count > 1 ? 's' : ''}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs">Ya descontado del saldo esperado (pass-through)</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 h-7 border-sky-300 text-xs text-sky-700 hover:bg-sky-100 dark:border-sky-700 dark:text-sky-300"
                                    onClick={() => setShowMensajeriaDialog(true)}
                                >
                                    Ver entregas
                                </Button>
                            </SpotlightCard>
                        )}

                        {/* Ventas Anuladas — tarjeta resumen */}
                        {ventas_anuladas_count > 0 && (
                            <SpotlightCard estado="agotado" className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                                <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Ventas Anuladas</p>
                                <p className="text-xl font-black text-red-700 dark:text-red-300">
                                    {ventas_anuladas_count} venta{ventas_anuladas_count > 1 ? 's' : ''}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400">
                                    Valor: ${Number(ventas_anuladas_total_usd).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 h-7 border-red-300 text-xs text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300"
                                    onClick={() => setShowAnuladasDialog(true)}
                                >
                                    Ver detalles
                                </Button>
                            </SpotlightCard>
                        )}

                        {/* Detalle de ventas especiales del turno */}
                        {ventas_especiales_count > 0 && (
                            <SpotlightCard estado="especial" className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
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
                            </SpotlightCard>
                        )}

                        {/* Dialog detalle Ventas sin Comisión */}
                        {ventas_sin_comision_count > 0 && (
                            <Dialog open={showVentasSinComisionDialog} onOpenChange={setShowVentasSinComisionDialog}>
                                <DialogContent className="sm:max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-fuchsia-700 dark:text-fuchsia-300">Ventas sin Comisión del Turno</DialogTitle>
                                        <DialogDescription>
                                            Total cobrado: <strong>${Number(ventas_sin_comision_total_usd).toFixed(2)} USD</strong>
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[80px] text-xs">Venta</TableHead>
                                                    <TableHead className="text-xs">Fecha</TableHead>
                                                    <TableHead className="text-right text-xs">Cobrado</TableHead>
                                                    {canViewEspecialesCostImpact && (
                                                        <>
                                                            <TableHead className="text-right text-xs">Costo</TableHead>
                                                            <TableHead className="text-right text-xs">Impacto</TableHead>
                                                        </>
                                                    )}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {ventas_sin_comision_detalles.map((vsc) => (
                                                    <TableRow key={vsc.venta_id}>
                                                        <TableCell className="text-xs font-medium">#{vsc.venta_id}</TableCell>
                                                        <TableCell className="text-muted-foreground text-xs">{vsc.fecha}</TableCell>
                                                        <TableCell className="text-right text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300">
                                                            ${vsc.total.toFixed(2)}
                                                        </TableCell>
                                                        {canViewEspecialesCostImpact && (
                                                            <>
                                                                <TableCell className="text-right text-xs text-red-600 dark:text-red-400">
                                                                    ${Number(vsc.costo ?? 0).toFixed(2)}
                                                                </TableCell>
                                                                <TableCell
                                                                    className={`text-right text-xs font-bold ${(vsc.impacto ?? 0) < 0 ? 'text-red-700 dark:text-red-400' : 'text-fuchsia-700 dark:text-fuchsia-300'}`}
                                                                >
                                                                    ${Number(vsc.impacto ?? 0).toFixed(2)}
                                                                </TableCell>
                                                            </>
                                                        )}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow>
                                                    <TableCell className="text-xs font-bold">Total</TableCell>
                                                    <TableCell />
                                                    <TableCell className="text-right text-xs font-bold text-fuchsia-700 dark:text-fuchsia-300">
                                                        ${Number(ventas_sin_comision_total_usd).toFixed(2)}
                                                    </TableCell>
                                                    {canViewEspecialesCostImpact && (
                                                        <>
                                                            <TableCell className="text-right text-xs font-bold text-red-700 dark:text-red-400">
                                                                ${Number(ventas_sin_comision_costo_usd).toFixed(2)}
                                                            </TableCell>
                                                            <TableCell
                                                                className={`text-right text-xs font-bold ${ventas_sin_comision_impacto_usd < 0 ? 'text-red-700 dark:text-red-400' : 'text-fuchsia-700 dark:text-fuchsia-300'}`}
                                                            >
                                                                ${Number(ventas_sin_comision_impacto_usd).toFixed(2)}
                                                            </TableCell>
                                                        </>
                                                    )}
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}

                        {/* Dialog detalles Comisión PV */}
                        {comisiones_pv_detalles.length > 0 && (
                            <Dialog open={showComisionPVDialog} onOpenChange={setShowComisionPVDialog}>
                                <DialogContent className="sm:max-w-3xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-blue-700 dark:text-blue-300">
                                            Comisiones P.V. del Turno
                                        </DialogTitle>
                                        <DialogDescription>
                                            Total: <strong>${Number(comision_pv_total).toFixed(2)} USD</strong>
                                            {' '}≈ <strong>{Number(comisiones_pv_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP</strong>
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="text-xs w-[80px]">Venta</TableHead>
                                                    <TableHead className="text-right text-xs w-[100px]">Total Venta</TableHead>
                                                    <TableHead className="text-xs">Productos</TableHead>
                                                    <TableHead className="text-right text-xs w-[140px]">Comisión</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {comisiones_pv_detalles.map((d) => (
                                                    <TableRow key={d.venta_id}>
                                                        <TableCell className="text-xs font-medium">#{d.venta_id}</TableCell>
                                                        <TableCell className="text-right text-xs">
                                                            ${d.total_venta?.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-xs max-w-[300px]">
                                                            {d.productos && d.productos.length > 0 ? (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="cursor-default truncate block">
                                                                                {d.productos.map(p =>
                                                                                    [p.nombre, p.marca, p.modelo].filter(Boolean).join(' ') + ' x' + p.cantidad
                                                                                ).join(', ')}
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="bottom" align="start" className="max-w-md">
                                                                            <ul className="list-disc list-inside space-y-0.5">
                                                                                {d.productos.map((p, i) => (
                                                                                    <li key={i}>
                                                                                        {[p.nombre, p.marca, p.modelo].filter(Boolean).join(' ')}
                                                                                        {' '}x{p.cantidad}
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            ) : (
                                                                <span className="text-muted-foreground">Sin productos</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs whitespace-nowrap">
                                                            <span className="font-medium">${d.comision_usd.toFixed(2)}</span>
                                                            {' / '}
                                                            <span className="font-semibold text-blue-700 dark:text-blue-300">
                                                                {d.comision_cup.toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow>
                                                    <TableCell className="text-xs font-bold">Total</TableCell>
                                                    <TableCell />
                                                    <TableCell />
                                                    <TableCell className="text-right text-xs font-bold whitespace-nowrap">
                                                        ${Number(comision_pv_total).toFixed(2)}
                                                        {' / '}
                                                        <span className="text-blue-700 dark:text-blue-300">
                                                            {Number(comisiones_pv_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                                        </span>
                                                    </TableCell>
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
                                <DialogContent className="sm:max-w-3xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-purple-700 dark:text-purple-300">
                                            Comisiones Gestor del Turno
                                        </DialogTitle>
                                        <DialogDescription>
                                            Total: <strong>${Number(comision_gestor_total).toFixed(2)} USD</strong>
                                            {' '}≈ <strong>{Number(comisiones_gestor_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP</strong>
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="text-xs w-[80px]">Venta</TableHead>
                                                    <TableHead className="text-right text-xs w-[100px]">Total Venta</TableHead>
                                                    <TableHead className="text-xs">Productos</TableHead>
                                                    <TableHead className="text-right text-xs">Tasa</TableHead>
                                                    <TableHead className="text-right text-xs w-[140px]">Comisión</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {comisionesGestorDetalles.map((d) => (
                                                    <TableRow key={d.venta_id}>
                                                        <TableCell className="text-xs font-medium">#{d.venta_id}</TableCell>
                                                        <TableCell className="text-right text-xs">
                                                            ${d.total_venta?.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-xs max-w-[300px]">
                                                            {d.productos && d.productos.length > 0 ? (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="cursor-default truncate block">
                                                                                {d.productos.map(p =>
                                                                                    [p.nombre, p.marca, p.modelo].filter(Boolean).join(' ') + ' x' + p.cantidad
                                                                                ).join(', ')}
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="bottom" align="start" className="max-w-md">
                                                                            <ul className="list-disc list-inside space-y-0.5">
                                                                                {d.productos.map((p, i) => (
                                                                                    <li key={i}>
                                                                                        {[p.nombre, p.marca, p.modelo].filter(Boolean).join(' ')}
                                                                                        {' '}x{p.cantidad}
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            ) : (
                                                                <span className="text-muted-foreground">Sin productos</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs text-muted-foreground">
                                                            {d.tasa ? d.tasa.toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs whitespace-nowrap">
                                                            <span className="font-medium">${d.monto_usd.toFixed(2)}</span>
                                                            {' / '}
                                                            <span className="font-semibold text-purple-700 dark:text-purple-300">
                                                                {d.moneda_codigo === 'CUP'
                                                                    ? d.monto.toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' CUP'
                                                                    : '—'}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow>
                                                    <TableCell className="text-xs font-bold">Total</TableCell>
                                                    <TableCell />
                                                    <TableCell />
                                                    <TableCell />
                                                    <TableCell className="text-right text-xs font-bold whitespace-nowrap">
                                                        ${Number(comision_gestor_total).toFixed(2)}
                                                        {' / '}
                                                        <span className="text-purple-700 dark:text-purple-300">
                                                            {Number(comisiones_gestor_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        )}

                        {/* Dialog detalle ventas anuladas */}
                        {ventas_anuladas_count > 0 && (
                            <Dialog open={showAnuladasDialog} onOpenChange={setShowAnuladasDialog}>
                                <DialogContent className="sm:max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle className="text-red-700">
                                            Ventas Anuladas del Turno ({ventas_anuladas_count})
                                        </DialogTitle>
                                        <DialogDescription>
                                            Valor total anulado: <strong>${Number(ventas_anuladas_total_usd).toFixed(2)} USD</strong>
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
                                        {ventas_anuladas_detalles.map((va) => (
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
                        {mensajero_count > 0 && (
                            <Dialog open={showMensajeriaDialog} onOpenChange={setShowMensajeriaDialog}>
                                <DialogContent className="sm:max-w-3xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-sky-700 dark:text-sky-300">
                                            Mensajería del Turno ({mensajero_count})
                                        </DialogTitle>
                                        <DialogDescription>
                                            Total pagado al mensajero: <strong>{Number(mensajero_total_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP</strong>
                                            {' '}≈ <strong>${Number(mensajero_total_usd).toFixed(2)} USD</strong>
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="text-xs w-[80px]">Venta</TableHead>
                                                    <TableHead className="text-right text-xs w-[100px]">Total Venta</TableHead>
                                                    <TableHead className="text-xs">Productos</TableHead>
                                                    <TableHead className="text-right text-xs">USD cobrado</TableHead>
                                                    <TableHead className="text-right text-xs">Tasa</TableHead>
                                                    <TableHead className="text-right text-xs">CUP pagado</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {mensajero_detalles.map((d) => (
                                                    <TableRow key={d.venta_id}>
                                                        <TableCell className="text-xs font-medium">#{d.venta_id}</TableCell>
                                                        <TableCell className="text-right text-xs">
                                                            {d.total_venta != null ? `$${d.total_venta.toFixed(2)}` : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-xs max-w-[260px]">
                                                            {d.productos && d.productos.length > 0 ? (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="cursor-default truncate block">
                                                                                {d.productos.map((p) =>
                                                                                    [p.nombre, p.marca, p.modelo].filter(Boolean).join(' ') + ' x' + p.cantidad
                                                                                ).join(', ')}
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="bottom" align="start" className="max-w-md">
                                                                            <ul className="list-disc list-inside space-y-0.5">
                                                                                {d.productos.map((p, i) => (
                                                                                    <li key={i}>
                                                                                        {[p.nombre, p.marca, p.modelo].filter(Boolean).join(' ')}
                                                                                        {' '}x{p.cantidad}
                                                                                    </li>
                                                                                ))}
                                                                            </ul>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            ) : (
                                                                <span className="text-muted-foreground">Sin productos</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs">${d.monto_usd.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right text-xs text-muted-foreground">
                                                            {d.tasa ? d.tasa.toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-right text-xs font-semibold text-sky-700 dark:text-sky-300">
                                                            {d.monto_cup.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                            <TableFooter>
                                                <TableRow>
                                                    <TableCell className="text-xs font-bold">Total</TableCell>
                                                    <TableCell />
                                                    <TableCell />
                                                    <TableCell className="text-right text-xs font-bold">${Number(mensajero_total_usd).toFixed(2)}</TableCell>
                                                    <TableCell />
                                                    <TableCell className="text-right text-xs font-bold text-sky-700 dark:text-sky-300">
                                                        {Number(mensajero_total_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                </TableRow>
                                            </TableFooter>
                                        </Table>
                                    </div>
                                </DialogContent>
                            </Dialog>
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
                                                    {op.tipo_pago !== 'efectivo' && op.via_info && (
                                                        <ViaLogo
                                                            slug={op.via_info.slug}
                                                            nombre={op.via_info.nombre}
                                                            imagenUrl={op.via_info.imagen_url}
                                                            className="h-4"
                                                        />
                                                    )}
                                                    <span className="font-medium">
                                                        {op.tipo_pago === 'efectivo' ? 'Efectivo' : (op.via_info?.nombre ?? op.via_pago) || 'Transferencia'}
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
                                    {(() => {
                                        const mensajeroItem = mensajero_detalles.find(
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
                                                            {mensajeroItem.tasa ? ` · tasa ${Number(mensajeroItem.tasa).toLocaleString('es-ES', { minimumFractionDigits: 2 })}` : ''}
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
