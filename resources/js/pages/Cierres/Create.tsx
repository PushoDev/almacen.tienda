import HeadingSmall from '@/components/heading-small';
import { ViaLogo } from '@/components/monedas/via-logo';
import { type Banco, Insignia, type TipoEntidad } from '@/components/transacciones/entidad';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SpotlightCard from '@/components/ui/spotlightcard';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import * as Collapsible from '@radix-ui/react-collapsible';
import {
    AlertTriangle,
    ArrowDown,
    ArrowRightLeft,
    ArrowUp,
    Banknote,
    Briefcase,
    Building2,
    CheckCircle2,
    ChevronDown,
    CreditCard,
    DollarSign,
    Eye,
    Globe,
    HandCoins,
    Loader2,
    Package,
    Scale,
    Search,
    Shuffle,
    ShoppingCart,
    Store,
    TrendingUp,
    Truck,
    Undo2,
    Users,
    Wallet,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { sileo } from '@/lib/sileo';
import { Toaster } from '@/components/ui/sileo-toaster';

const CollapsibleRoot = Collapsible.Root;
const CollapsibleTrigger = Collapsible.CollapsibleTrigger;
const CollapsibleContent = Collapsible.CollapsibleContent;

interface Props extends PageProps {
    calculos: Calculos;
    fecha_apertura: string;
    moneda_referencia?: string;
    // NUEVO: Comparativa con cierre anterior
    comparativa_cuentas?: ComparativaItem[];
    comparativa_cuentas_cobro?: CuentaDeCobro[];
    comparativa_clientes?: ComparativaClienteItem[];
    tiene_cierre_anterior?: boolean;
}

interface ComparativaItem {
    id: number;
    nombre: string;
    tipo: string;
    /** Logo de la cuenta; null si no tiene uno asignado (y en cierres guardados antes de este dato). */
    banco?: Banco | null;
    /** Cuenta que no estaba en el cierre anterior: no hay saldo anterior real con qué compararla. */
    es_nueva?: boolean;
    /** Dinero enviado desde esta cuenta que sigue en tránsito (ya salió de su saldo). */
    en_transito_salida?: number;
    /** Dinero en camino hacia esta cuenta que todavía no se acredita. */
    en_transito_entrada?: number;
    moneda: string;
    saldo_anterior: number;
    saldo_actual: number;
    diferencia: number;
    estado: 'subio' | 'bajo' | 'igual';
}

/** Cuenta que el vendedor tiene solo para cobrar: no se le muestra su saldo, solo lo cobrado en el turno. */
interface CuentaDeCobro {
    id: number;
    nombre: string;
    tipo: string | null;
    banco: Banco | null;
    moneda: string | null;
    operado_turno: number;
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
    moneda?: string;
    moneda_imagen_url?: string | null;
    hora: string;
    origen: string;
    destino: string;
    /** Logo de la cuenta de la operación; null si no tiene uno asignado (y en cierres viejos). */
    banco?: Banco | null;
    usuario_nombre?: string;
    es_propio?: boolean;
    /** false = movimiento de un cliente: se lista pero no cambia la caja (solo informativo). */
    afecta_caja?: boolean;
    /** Quién atendió ("Atendido por"); null si la operación no tiene turno. */
    turno_nombre?: string | null;
}

/** Quién atendió en el periodo y qué movió cada turno. */
interface TurnoResumen {
    turno_id: number | null;
    nombre: string | null;
    desde: string | null;
    ventas_count: number;
    ventas_total_usd: number;
    gastos_count: number;
    ingresos_count: number;
    transferencias_count: number;
}

/** Separa "Cuenta: X" / "Cliente: Y" / "Proveedor: Z" (como lo arma el servidor) en tipo y nombre. */
const partirEntidad = (texto: string): { tipo: TipoEntidad; nombre: string } => {
    const [prefijo, ...resto] = texto.split(': ');
    if (resto.length === 0) {
        return { tipo: 'cuenta', nombre: texto };
    }
    return { tipo: prefijo === 'Cliente' ? 'cliente' : prefijo === 'Proveedor' ? 'proveedor' : 'cuenta', nombre: resto.join(': ') };
};

/** `origen_tipo`/`destino_tipo` del servidor también puede traer 'desconocido'; se trata como cuenta. */
const tipoEntidadDe = (tipo: string): TipoEntidad => (tipo === 'cliente' || tipo === 'proveedor' ? tipo : 'cuenta');

/** Envío de dinero que sigue en tránsito (sin confirmar). Informativo: no entra en el saldo esperado. */
interface EnvioAbierto {
    id: number;
    fecha: string;
    origen_nombre: string;
    banco_origen: Banco | null;
    destino_nombre: string;
    banco_destino: Banco | null;
    monto: number;
    moneda: string;
    moneda_imagen_url: string | null;
    monto_destino: number;
    moneda_destino: string;
    tasa_cambio: number | null;
    usuario_nombre: string;
    es_propio: boolean;
    comentario: string | null;
    por_recibir: boolean;
    /** Días que lleva en tránsito; a partir de 2 se marca atrasado (el efectivo puede tardar días). */
    dias_en_transito?: number;
    atrasado?: boolean;
}

/** Una pata (entrada, salida o mensajero) de una Operación Múltiple. */
interface PataOperacionMultiple {
    tipo: string;
    nombre: string;
    monto: number;
    moneda: string;
    banco: Banco | null;
}

/** Operación Múltiple (remesa) del turno. Solo la ven admin y moderador; es informativa: no entra en el saldo esperado. */
interface OperacionMultiple {
    id: number;
    hora: string;
    usuario_nombre: string;
    es_propio: boolean;
    estado: string;
    anulada: boolean;
    notas: string | null;
    entrada: PataOperacionMultiple;
    salida: PataOperacionMultiple;
    mensajero: PataOperacionMultiple | null;
}

interface OperacionesMultiplesCierre {
    visible: boolean;
    items: OperacionMultiple[];
    resumen: { total: number; entradas: Array<{ moneda: string; monto: number }>; salidas: Array<{ moneda: string; monto: number }> };
}

/** Cuánto cambió respecto al cierre anterior: `bueno` pinta de verde (mejoró) o rojo (empeoró); null = sin cambio. */
function BadgeDiferencia({ diferencia, moneda, bueno }: { diferencia: number; moneda: string; bueno: boolean | null }) {
    // Menos de un centavo no es un cambio: evita un "-$0.00" si llega un residuo de redondeo.
    if (bueno === null || Math.abs(diferencia) < 0.005) {
        return <Badge className="text-muted-foreground border border-white/10 bg-white/5 font-mono">—</Badge>;
    }
    const Flecha = diferencia > 0 ? ArrowUp : ArrowDown;
    const clase = bueno
        ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
        : 'border border-red-400/30 bg-red-500/10 text-red-700 dark:text-red-300';
    // Sin backdrop-blur: se repite en cada fila (más de cien) y las capas de desenfoque saturan la GPU.
    return (
        <Badge className={`gap-1 font-mono font-bold whitespace-nowrap ${clase}`}>
            <Flecha className="h-3 w-3" />
            {diferencia > 0 ? '+' : '-'}${Math.abs(diferencia).toFixed(2)} {moneda}
        </Badge>
    );
}

const COLORES_WIDGET_CAMBIO = {
    emerald: { caja: 'border-emerald-400/30 bg-emerald-500/5 dark:bg-emerald-500/10', icono: 'from-emerald-500 to-green-600 shadow-emerald-500/30', cifra: 'text-emerald-600 dark:text-emerald-400' },
    red: { caja: 'border-red-400/30 bg-red-500/5 dark:bg-red-500/10', icono: 'from-red-500 to-rose-600 shadow-red-500/30', cifra: 'text-red-600 dark:text-red-400' },
    indigo: { caja: 'border-indigo-400/30 bg-indigo-500/5 dark:bg-indigo-500/10', icono: 'from-indigo-500 to-violet-600 shadow-indigo-500/30', cifra: 'text-indigo-600 dark:text-indigo-400' },
} as const;

/** Widget de conteo de la Comparativa (subieron / bajaron / sin cambio), con el borde animado como los demás. */
function WidgetCambio({ estado, color, icono: Icono, titulo, valor }: { estado: 'disponible' | 'agotado' | 'indigo'; color: keyof typeof COLORES_WIDGET_CAMBIO; icono: React.ElementType; titulo: string; valor: number }) {
    const c = COLORES_WIDGET_CAMBIO[color];
    return (
        <SpotlightCard estado={estado} className={`rounded-xl border p-3 shadow-sm backdrop-blur-sm ${c.caja}`}>
            <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md ${c.icono}`}>
                    <Icono className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{titulo}</p>
                    <p className={`text-2xl font-black ${c.cifra}`}>{valor}</p>
                </div>
            </div>
        </SpotlightCard>
    );
}

/** Tabla de las Operaciones Múltiples del turno: entrada, salida y mensajero con el logo de cada cuenta. */
function TablaOperacionesMultiples({ operaciones, mensajeVacio }: { operaciones: OperacionMultiple[]; mensajeVacio: string }) {
    const pata = (p: PataOperacionMultiple, clase: string, signo: string, anulada: boolean) => (
        <div className={anulada ? 'space-y-1 line-through opacity-60' : 'space-y-1'}>
            <EntidadFila tipo={tipoEntidadDe(p.tipo)} nombre={p.nombre} banco={p.banco} />
            <Badge className={`font-mono font-bold whitespace-nowrap backdrop-blur-sm ${clase}`}>
                {signo}${Number(p.monto).toFixed(2)} {p.moneda}
            </Badge>
        </div>
    );

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-16">Hora</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Salida</TableHead>
                        <TableHead>Mensajero</TableHead>
                        <TableHead className="w-28">Creado por</TableHead>
                        <TableHead className="w-28 text-center">Estado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {operaciones.length > 0 ? (
                        operaciones.map((op) => (
                            <TableRow key={op.id} className={!op.es_propio ? 'bg-orange-50/60 dark:bg-orange-950/20' : undefined}>
                                <TableCell className="font-mono text-xs">{op.hora}</TableCell>
                                <TableCell className="text-xs">
                                    {pata(op.entrada, 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', '+', op.anulada)}
                                </TableCell>
                                <TableCell className="text-xs">
                                    {pata(op.salida, 'border border-red-400/30 bg-red-500/10 text-red-700 dark:text-red-300', '-', op.anulada)}
                                </TableCell>
                                <TableCell className="text-xs">
                                    {op.mensajero ? (
                                        pata(op.mensajero, 'border border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300', '-', op.anulada)
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-xs">
                                    {op.es_propio ? (
                                        <Badge className="border border-violet-400/30 bg-violet-500/10 text-violet-700 backdrop-blur-sm dark:text-violet-300">Tú</Badge>
                                    ) : (
                                        op.usuario_nombre
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Link href={route('transacciones.remesa.show', op.id)}>
                                        {op.anulada ? (
                                            <Badge className="border border-red-400/30 bg-red-500/10 text-red-700 backdrop-blur-sm dark:text-red-300">Anulada</Badge>
                                        ) : (
                                            <Badge className="border border-cyan-400/30 bg-cyan-500/10 text-cyan-700 backdrop-blur-sm dark:text-cyan-300">Ver detalle</Badge>
                                        )}
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-muted-foreground py-8 text-center italic">
                                {mensajeVacio}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

/** Quién creó la operación ("Tú" o su nombre) y, debajo, la persona que atendía ("Atendido por") si hay turno. */
function CreadoPor({ esPropio, usuario, turno }: { esPropio?: boolean; usuario?: string; turno?: string | null }) {
    return (
        <div className="space-y-0.5">
            {esPropio ? (
                <Badge className="border border-violet-400/30 bg-violet-500/10 text-violet-700 backdrop-blur-sm dark:text-violet-300">Tú</Badge>
            ) : (
                <span>{usuario || 'Sistema'}</span>
            )}
            {turno && <p className="text-muted-foreground text-[10px] leading-tight">Atendió: {turno}</p>}
        </div>
    );
}

/** Marca de un movimiento de cliente: se lista pero no cambia la caja. */
function MarcaInformativa({ afectaCaja }: { afectaCaja?: boolean }) {
    if (afectaCaja !== false) {
        return null;
    }

    return (
        <Badge className="mt-1 border border-slate-400/30 bg-slate-500/10 text-[10px] text-slate-600 backdrop-blur-sm dark:text-slate-300">
            Solo informativo: no cambia la caja
        </Badge>
    );
}

/** Tabla de los envíos de dinero abiertos: los que enviaste (esperan confirmación) o los que te toca recibir. */
function TablaEnviosAbiertos({ envios, mensajeVacio, porRecibir }: { envios: EnvioAbierto[]; mensajeVacio: string; porRecibir: boolean }) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-24">Fecha</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead className="w-32">Enviado por</TableHead>
                        <TableHead className="w-48 text-right">Monto</TableHead>
                        <TableHead className="w-32 text-center">Estado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {envios.length > 0 ? (
                        envios.map((envio) => (
                            <TableRow key={envio.id} className={envio.atrasado ? 'bg-red-50/60 dark:bg-red-950/20' : undefined}>
                                <TableCell className="font-mono text-xs">
                                    {envio.fecha}
                                    {envio.dias_en_transito !== undefined && envio.dias_en_transito > 0 && (
                                        <p className="text-muted-foreground text-[10px]">hace {envio.dias_en_transito} {envio.dias_en_transito === 1 ? 'día' : 'días'}</p>
                                    )}
                                </TableCell>
                                <TableCell className="text-xs">
                                    <EntidadFila tipo="cuenta" nombre={envio.origen_nombre} banco={envio.banco_origen} />
                                </TableCell>
                                <TableCell className="text-xs">
                                    <EntidadFila tipo="cuenta" nombre={envio.destino_nombre} banco={envio.banco_destino} />
                                </TableCell>
                                <TableCell className="text-xs">
                                    {envio.es_propio ? (
                                        <Badge className="border border-violet-400/30 bg-violet-500/10 text-violet-700 backdrop-blur-sm dark:text-violet-300">Tú</Badge>
                                    ) : (
                                        envio.usuario_nombre
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Badge className="gap-1.5 border border-amber-400/30 bg-amber-500/10 font-mono font-bold whitespace-nowrap text-amber-700 backdrop-blur-sm dark:text-amber-300">
                                        {envio.moneda_imagen_url && <img src={envio.moneda_imagen_url} alt="" aria-hidden="true" className="h-4 w-auto" />}
                                        ${Number(envio.monto).toFixed(2)} {envio.moneda}
                                    </Badge>
                                    {envio.moneda !== envio.moneda_destino && (
                                        <div className="text-muted-foreground mt-0.5 font-mono text-[10px] leading-tight whitespace-nowrap">
                                            ≈ ${Number(envio.monto_destino).toFixed(2)} {envio.moneda_destino}
                                            {envio.tasa_cambio ? <span className="ml-0.5">@ {Number(envio.tasa_cambio).toFixed(2)}</span> : null}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="space-y-1 text-center">
                                    {envio.atrasado && (
                                        <Badge className="border border-red-400/40 bg-red-500/15 text-red-700 backdrop-blur-sm dark:text-red-300">
                                            Atrasado · {envio.dias_en_transito} días
                                        </Badge>
                                    )}
                                    <Link className="block" href={route('transacciones.envios.index', { estado: porRecibir ? 'por_confirmar' : 'en_transito' })}>
                                        {porRecibir ? (
                                            <Badge className="border-0 bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/30">Confirma tú</Badge>
                                        ) : (
                                            <Badge className="border border-amber-400/30 bg-amber-500/10 text-amber-700 backdrop-blur-sm dark:text-amber-300">Sin confirmar</Badge>
                                        )}
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-muted-foreground py-8 text-center italic">
                                {mensajeVacio}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

/** Logo de la cuenta (o ícono de cliente/proveedor) junto a su nombre. */
function EntidadFila({ tipo, nombre, banco }: { tipo: TipoEntidad; nombre: string; banco: Banco | null }) {
    return (
        <div className="flex items-center gap-2" title={nombre}>
            <Insignia entidad={{ id: '0', tipo, nombre, monedaCodigo: '', simbolo: '', saldo: null, banco }} tamano="sm" />
            <span className="max-w-[140px] truncate">{nombre}</span>
        </div>
    );
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
    banco_origen?: Banco | null;
    banco_destino?: Banco | null;
    tasa_cambio: number;
    hora: string;
    afecta_saldo_usuario?: boolean;
    es_entrada?: boolean;
    usuario_nombre?: string;
    es_propio?: boolean;
    turno_nombre?: string | null;
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
    /** Envíos de dinero abiertos que el usuario puede ver (informativo: no entra en el saldo esperado). */
    envios_en_transito?: { total: number; por_confirmar: number; montos: Array<{ moneda: string; monto: number }> };
    envios_en_transito_detalle?: { atrasados?: number; enviados: EnvioAbierto[]; por_recibir: EnvioAbierto[] };
    /** Turnos ("Atendido por") del periodo, con lo que movió cada uno. */
    turnos?: TurnoResumen[];
    turno_actual?: string | null;
    operaciones_multiples?: OperacionesMultiplesCierre;
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
    ventas_sin_comision_count?: number;
    ventas_sin_comision_total_usd?: number;
    ventas_sin_comision_costo_usd?: number;
    ventas_sin_comision_impacto_usd?: number;
    ventas_sin_comision_detalles?: VentaSinComisionItem[];
    // Ventas anuladas
    ventas_anuladas_count?: number;
    ventas_anuladas_total_usd?: number;
    ventas_anuladas_detalles?: VentaAnuladaItem[];
    // Ventas completadas que después se devolvieron (mismo formato que las anuladas)
    ventas_devueltas_count?: number;
    ventas_devueltas_total_usd?: number;
    ventas_devueltas_detalles?: VentaAnuladaItem[];
    // Mensajero del turno
    mensajero_total_usd?: number;
    mensajero_total_cup?: number;
    mensajero_count?: number;
    mensajero_detalles?: MensajeroDetalleItem[];
    // Widgets: Totales por moneda (sin conversión global)
    usd_efectivo?: number;
    cup_efectivo?: number;
    usd_transferencia?: number;
    cup_transferencias?: number;
    usd_internacional?: number;
}

interface MensajeroDetalleItem {
    venta_id: number;
    monto_usd: number;
    monto_cup: number;
    tasa?: number | null;
    tipo: string;
    total_venta?: number;
    productos?: ProductoItem[];
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

/** Venta marcada manualmente como "de la agencia" — nadie gana comisión por ella. */
interface VentaSinComisionItem {
    venta_id: number;
    total: number;
    costo: number;
    impacto: number;
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

interface ProductoItem {
    nombre: string;
    marca: string | null;
    modelo: string | null;
    cantidad: number;
}

interface ComisionPVItem {
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
    comparativa_cuentas_cobro = [],
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
    const [showVentasSinComisionDialog, setShowVentasSinComisionDialog] = useState(false);
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
        comision: Number(p.comision) || 0,
    }));
    const totalVentasProductos = lineasProductos.reduce((s, r) => s + r.total, 0);
    const totalComisionProductos = lineasProductos.reduce((s, r) => s + r.comision, 0);

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
    // d.gastos/d.ingresos_extra/d.transferencias_salientes vienen en la moneda de cada `d` (no en USD).
    // Hay que dividir por la tasa de esa moneda antes de sumar entre monedas distintas — mismo patrón
    // que MonedaController::calcularCapitalTotal() y el saldo_esperado del backend ($monto / $tasa).
    const totalGastos = (calculos.detalles ?? []).reduce((sum, d) => sum + (d.gastos ?? 0) / (d.tasa_cambio > 0 ? d.tasa_cambio : 1), 0);
    const totalIngresos = (calculos.detalles ?? []).reduce((sum, d) => sum + (d.ingresos_extra ?? 0) / (d.tasa_cambio > 0 ? d.tasa_cambio : 1), 0);
    const totalTransferencias = (calculos.detalles ?? []).reduce((sum, d) => sum + (d.transferencias_salientes ?? 0) / (d.tasa_cambio > 0 ? d.tasa_cambio : 1), 0);

    // NUEVO: Calcular total de comisiones a gestores
    const totalComisionesGestor = calculos.comisiones_gestor_total ?? 0;
    const comisionesGestorDetalles = calculos.comisiones_gestor_detalles ?? [];
    const enviosEnTransito = calculos.envios_en_transito ?? { total: 0, por_confirmar: 0, montos: [] };

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

    // Sección unificada "Transacciones del Turno" (Gastos/Ingresos/Transferencias, propias + externas)
    const [busquedaTransacciones, setBusquedaTransacciones] = useState('');
    const [filtroOrigenTransacciones, setFiltroOrigenTransacciones] = useState<'todas' | 'propias' | 'externas'>('todas');
    const [filtroMonedaTransacciones, setFiltroMonedaTransacciones] = useState('todas');

    // Monedas presentes en los datos del turno (no hardcodeado, se arma según lo que exista)
    const monedasTransacciones = useMemo(() => {
        const set = new Set<string>();
        (todosGastos ?? []).forEach((i) => set.add(i.moneda || 'USD'));
        (todosIngresos ?? []).forEach((i) => set.add(i.moneda || 'USD'));
        (todasTransferencias ?? []).forEach((i) => {
            set.add(i.moneda_origen || 'USD');
            set.add(i.moneda_destino || 'USD');
        });
        return ['todas', ...Array.from(set).sort()];
    }, [todosGastos, todosIngresos, todasTransferencias]);

    const coincideFiltrosTransaccion = (esPropio: boolean | undefined, texto: string, monedasItem: string[]) => {
        const matchOrigen =
            filtroOrigenTransacciones === 'todas' ||
            (filtroOrigenTransacciones === 'propias' ? esPropio === true : esPropio === false);
        const matchMoneda = filtroMonedaTransacciones === 'todas' || monedasItem.includes(filtroMonedaTransacciones);
        const matchTexto = !busquedaTransacciones || texto.toLowerCase().includes(busquedaTransacciones.toLowerCase());
        return matchOrigen && matchMoneda && matchTexto;
    };

    const gastosFiltrados = useMemo(
        () =>
            (todosGastos ?? []).filter((i) =>
                coincideFiltrosTransaccion(i.es_propio, `${i.desc} ${i.origen ?? ''}`, [i.moneda || 'USD']),
            ),
        [todosGastos, busquedaTransacciones, filtroOrigenTransacciones, filtroMonedaTransacciones],
    );
    const ingresosFiltrados = useMemo(
        () =>
            (todosIngresos ?? []).filter((i) =>
                coincideFiltrosTransaccion(i.es_propio, `${i.desc} ${i.destino ?? ''}`, [i.moneda || 'USD']),
            ),
        [todosIngresos, busquedaTransacciones, filtroOrigenTransacciones, filtroMonedaTransacciones],
    );
    const transferenciasFiltradas = useMemo(
        () =>
            (todasTransferencias ?? []).filter((i) =>
                coincideFiltrosTransaccion(
                    i.es_propio,
                    `${i.desc} ${i.origen_nombre ?? ''} ${i.destino_nombre ?? ''}`,
                    [i.moneda_origen || 'USD', i.moneda_destino || 'USD'],
                ),
            ),
        [todasTransferencias, busquedaTransacciones, filtroOrigenTransacciones, filtroMonedaTransacciones],
    );

    // Envíos de dinero sin confirmar: los que salieron de ti y los que te toca recibir (mismos filtros que lo demás).
    const enviosEnviados = calculos.envios_en_transito_detalle?.enviados ?? [];
    const enviosPorRecibir = calculos.envios_en_transito_detalle?.por_recibir ?? [];
    const filtrarEnvios = (envios: EnvioAbierto[]) =>
        envios.filter((e) =>
            coincideFiltrosTransaccion(
                e.es_propio,
                `${e.origen_nombre} ${e.destino_nombre} ${e.usuario_nombre} ${e.comentario ?? ''}`,
                [e.moneda, e.moneda_destino],
            ),
        );
    const enviosEnviadosFiltrados = filtrarEnvios(enviosEnviados);
    const enviosPorRecibirFiltrados = filtrarEnvios(enviosPorRecibir);

    // Operaciones Múltiples (solo admin/moderador): el servidor manda `visible: false` al resto.
    const operacionesMultiples = calculos.operaciones_multiples;
    const verOperacionesMultiples = operacionesMultiples?.visible === true;
    const operacionesFiltradas = (operacionesMultiples?.items ?? []).filter((op) =>
        coincideFiltrosTransaccion(
            op.es_propio,
            `${op.entrada.nombre} ${op.salida.nombre} ${op.mensajero?.nombre ?? ''} ${op.usuario_nombre} ${op.notas ?? ''}`,
            [op.entrada.moneda, op.salida.moneda, ...(op.mensajero ? [op.mensajero.moneda] : [])],
        ),
    );

    // Cuando se filtra por una moneda específica, mostrar la transferencia desde la
    // perspectiva de esa moneda (signo/monto principal) en vez del `tipo` canónico
    // que trae el backend (pensado solo para la vista "Todas").
    const tipoEfectivoTransferencia = (item: TransferenciaCompleta): 'entrante' | 'saliente' => {
        if (filtroMonedaTransacciones === 'todas' || item.moneda_origen === item.moneda_destino) {
            return item.tipo;
        }
        if (filtroMonedaTransacciones === item.moneda_origen) return 'saliente';
        if (filtroMonedaTransacciones === item.moneda_destino) return 'entrante';
        return item.tipo;
    };

    // Filtros para Comparativa
    const [busquedaCuentas, setBusquedaCuentas] = useState('');
    const [filtroTipoCuentas, setFiltroTipoCuentas] = useState('todos');
    const [busquedaClientes, setBusquedaClientes] = useState('');
    const [soloConCambios, setSoloConCambios] = useState(false);

    const tiposUnicos = useMemo(() => {
        const tipos = new Set((comparativa_cuentas ?? []).map(c => c.tipo));
        return ['todos', ...Array.from(tipos).sort()];
    }, [comparativa_cuentas]);

    // Las que más cambiaron primero (el cambio se mide en la moneda de cada cuenta); a igual cambio, por nombre.
    const cuentasFiltradas = useMemo(() => {
        return (comparativa_cuentas ?? [])
            .filter(c => {
                const matchTexto = !busquedaCuentas || c.nombre.toLowerCase().includes(busquedaCuentas.toLowerCase());
                const matchTipo = filtroTipoCuentas === 'todos' || c.tipo === filtroTipoCuentas;
                const matchCambio = !soloConCambios || c.estado !== 'igual' || c.es_nueva === true;
                return matchTexto && matchTipo && matchCambio;
            })
            .sort(
                (a, b) =>
                    Number(b.es_nueva ?? false) - Number(a.es_nueva ?? false) ||
                    Math.abs(b.diferencia) - Math.abs(a.diferencia) ||
                    a.nombre.localeCompare(b.nombre),
            );
    }, [comparativa_cuentas, busquedaCuentas, filtroTipoCuentas, soloConCambios]);

    const clientesFiltrados = useMemo(() => {
        return (comparativa_clientes ?? [])
            .filter(c => {
                const matchTexto = !busquedaClientes || c.nombre.toLowerCase().includes(busquedaClientes.toLowerCase());
                const matchCambio = !soloConCambios || c.estado !== 'igual';
                return matchTexto && matchCambio;
            })
            .sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia) || a.nombre.localeCompare(b.nombre));
    }, [comparativa_clientes, busquedaClientes, soloConCambios]);

    // Resumen de la comparativa: cuántas subieron/bajaron y cuánto se movió por moneda (o el saldo actual si es el primer cierre).
    const resumenCuentas = useMemo(() => {
        const lista = comparativa_cuentas ?? [];
        const porMoneda: Record<string, { saldo: number; diferencia: number }> = {};
        lista.forEach((c) => {
            porMoneda[c.moneda] = porMoneda[c.moneda] ?? { saldo: 0, diferencia: 0 };
            porMoneda[c.moneda].saldo += Number(c.saldo_actual) || 0;
            // Una cuenta nueva no tiene saldo anterior: su saldo entero no es un "movimiento" y distorsionaría el neto.
            if (!c.es_nueva) {
                porMoneda[c.moneda].diferencia += Number(c.diferencia) || 0;
            }
        });
        return {
            nuevas: lista.filter((c) => c.es_nueva).length,
            subieron: lista.filter((c) => !c.es_nueva && c.estado === 'subio').length,
            bajaron: lista.filter((c) => !c.es_nueva && c.estado === 'bajo').length,
            iguales: lista.filter((c) => !c.es_nueva && c.estado === 'igual').length,
            porMoneda: Object.entries(porMoneda).sort(([a], [b]) => a.localeCompare(b)),
        };
    }, [comparativa_cuentas]);

    const resumenClientes = useMemo(() => {
        const lista = comparativa_clientes ?? [];
        return {
            mejoraron: lista.filter((c) => c.estado === 'mejoro').length,
            empeoraron: lista.filter((c) => c.estado === 'empeoro').length,
            iguales: lista.filter((c) => c.estado === 'igual').length,
            deudaTotal: lista.reduce((s, c) => s + (Number(c.deuda_actual) || 0), 0),
            diferenciaTotal: lista.reduce((s, c) => s + (Number(c.diferencia) || 0), 0),
        };
    }, [comparativa_clientes]);

    const submit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        console.log('--- INICIANDO ENVÍO DE CIERRE ---');

        post(route('ventas.cierres.store'), {
            preserveScroll: true,
            onSuccess: () => {
                console.log('Cierre exitoso');
                sileo.success({ title: 'Cierre realizado', description: 'El cierre se realizó con éxito' });
            },
            onError: (err) => {
                console.error('Errores en el cierre:', err);
                sileo.error({ title: 'Error al cerrar', description: err.cierre ?? 'Revisa los datos e inténtalo de nuevo' });
            },
            onFinish: () => setShowConfirmModal(false),
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
                <Card className="gap-0 overflow-hidden border-l-4 border-teal-500/30 py-0 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader className="border-b bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Package className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Ventas</CardTitle>
                                <CardDescription className="text-teal-100">
                                    Productos vendidos en el turno. Importes en {moneda_referencia} (moneda de referencia).
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

                {/* Por dónde entraron: una tabla por moneda con desglose de operaciones */}
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
                                                                {/* FILA PRINCIPAL */}
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
                    <div className={`grid grid-cols-2 gap-4 md:grid-cols-3 ${verOperacionesMultiples ? 'xl:grid-cols-7' : 'xl:grid-cols-6'}`}>
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

                        <Link href={route('transacciones.envios.index', { estado: 'en_transito' })} className="block">
                            <SpotlightCard
                                estado="especial"
                                className="h-full rounded-xl border border-amber-400/30 bg-amber-500/5 p-4 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md dark:bg-amber-500/10"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30">
                                        <Truck className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">En tránsito</p>
                                        {enviosEnTransito.montos.length > 0 ? (
                                            enviosEnTransito.montos.map(({ moneda, monto }) => (
                                                <p key={moneda} className="text-2xl leading-tight font-black text-amber-600 dark:text-amber-400">
                                                    ${Number(monto).toFixed(2)} <span className="text-sm font-bold">{moneda}</span>
                                                </p>
                                            ))
                                        ) : (
                                            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">$0.00</p>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                    {enviosEnTransito.por_confirmar > 0 ? (
                                        <Badge className="border-0 bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/30">
                                            {enviosEnTransito.por_confirmar} por confirmar por ti
                                        </Badge>
                                    ) : (
                                        <Badge className="border border-amber-400/30 bg-amber-500/10 text-amber-700 backdrop-blur-sm dark:text-amber-300">
                                            Sin confirmar
                                        </Badge>
                                    )}
                                    <Badge className="border-0 bg-gradient-to-r from-amber-500 to-orange-600 shadow-md shadow-amber-500/30">
                                        {enviosEnTransito.total} {enviosEnTransito.total === 1 ? 'envío' : 'envíos'}
                                    </Badge>
                                    {(calculos.envios_en_transito_detalle?.atrasados ?? 0) > 0 && (
                                        <Badge className="border border-red-400/40 bg-red-500/15 text-red-700 backdrop-blur-sm dark:text-red-300">
                                            {calculos.envios_en_transito_detalle?.atrasados} atrasado{calculos.envios_en_transito_detalle?.atrasados === 1 ? '' : 's'}
                                        </Badge>
                                    )}
                                </div>
                            </SpotlightCard>
                        </Link>

                        {verOperacionesMultiples && operacionesMultiples && (
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
                                        <p className="text-2xl font-black text-cyan-600 dark:text-cyan-400">{operacionesMultiples.resumen.total}</p>
                                    </div>
                                </div>
                                <div className="mt-3 space-y-1 text-xs">
                                    {operacionesMultiples.resumen.entradas.map(({ moneda, monto }) => (
                                        <p key={`e-${moneda}`} className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                            Entró +${Number(monto).toFixed(2)} {moneda}
                                        </p>
                                    ))}
                                    {operacionesMultiples.resumen.salidas.map(({ moneda, monto }) => (
                                        <p key={`s-${moneda}`} className="font-mono font-bold text-red-600 dark:text-red-400">
                                            Salió -${Number(monto).toFixed(2)} {moneda}
                                        </p>
                                    ))}
                                    <div className="flex justify-end pt-1">
                                        <Badge className="border-0 bg-gradient-to-r from-cyan-500 to-sky-600 shadow-md shadow-cyan-500/30">
                                            {operacionesMultiples.resumen.total} oper.
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
                                        ${Number(calculos.ventas_devueltas_total_usd ?? 0).toFixed(2)} <span className="text-sm font-bold">USD</span>
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                <Badge className="border border-pink-400/30 bg-pink-500/10 font-mono text-pink-700 dark:text-pink-300">
                                    {(calculos.ventas_devueltas_detalles ?? [])
                                        .slice(0, 3)
                                        .map((v) => `#${v.venta_id}`)
                                        .join(' ') || 'Ninguna'}
                                    {(calculos.ventas_devueltas_detalles?.length ?? 0) > 3 ? ' …' : ''}
                                </Badge>
                                <Badge className="border-0 bg-gradient-to-r from-pink-500 to-rose-600 shadow-md shadow-pink-500/30">
                                    {calculos.ventas_devueltas_count ?? 0} {(calculos.ventas_devueltas_count ?? 0) === 1 ? 'venta' : 'ventas'}
                                </Badge>
                            </div>
                        </SpotlightCard>
                    </div>
                </div>

                {/* Turnos de este cierre: quién atendió ("Atendido por") y qué movió cada uno */}
                <Card className="gap-0 overflow-hidden border-l-4 border-cyan-500/30 py-0 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader className="border-b bg-gradient-to-r from-cyan-600 to-cyan-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Turnos de este cierre</CardTitle>
                                <CardDescription className="text-cyan-100">
                                    Quién atendió en el periodo y qué movió cada persona.
                                    {calculos.turno_actual ? ` Atiende ahora: ${calculos.turno_actual}.` : ''}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted hover:bg-muted">
                                    <TableHead>Atendió</TableHead>
                                    <TableHead className="w-36">Desde</TableHead>
                                    <TableHead className="w-44 text-right">Ventas</TableHead>
                                    <TableHead className="w-24 text-center">Gastos</TableHead>
                                    <TableHead className="w-24 text-center">Ingresos</TableHead>
                                    <TableHead className="w-32 text-center">Transferencias</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(calculos.turnos ?? []).length > 0 ? (
                                    (calculos.turnos ?? []).map((turno, idx) => (
                                        <TableRow key={turno.turno_id ?? `sin-turno-${idx}`}>
                                            <TableCell className="text-sm font-medium">
                                                {turno.nombre ?? <span className="text-muted-foreground italic">Sin turno registrado</span>}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{turno.desde ?? '—'}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge className="border border-cyan-400/30 bg-cyan-500/10 font-mono whitespace-nowrap text-cyan-700 backdrop-blur-sm dark:text-cyan-300">
                                                    {turno.ventas_count} · ${Number(turno.ventas_total_usd).toFixed(2)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-sm">{turno.gastos_count}</TableCell>
                                            <TableCell className="text-center font-mono text-sm">{turno.ingresos_count}</TableCell>
                                            <TableCell className="text-center font-mono text-sm">{turno.transferencias_count}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-muted-foreground py-8 text-center italic">
                                            Sin operaciones en este periodo.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Transacciones del Turno: Gastos, Ingresos, Transferencias — propias y externas, unificado */}
                <Card className="gap-0 overflow-hidden border-l-4 border-violet-500/30 py-0 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader className="border-b bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Transacciones del Turno</CardTitle>
                                <CardDescription className="text-violet-100">
                                    Gastos, ingresos y transferencias del turno — propias y de otros usuarios sobre tus cuentas. Las filas resaltadas son de otros usuarios.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                        <div className="relative">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input
                                placeholder="Buscar en transacciones..."
                                value={busquedaTransacciones}
                                onChange={(e) => setBusquedaTransacciones(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex flex-wrap items-center gap-1">
                                <span className="text-muted-foreground mr-1 text-xs font-medium">Origen:</span>
                                {(['todas', 'propias', 'externas'] as const).map((opt) => (
                                    <Button
                                        key={opt}
                                        variant={filtroOrigenTransacciones === opt ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setFiltroOrigenTransacciones(opt)}
                                        className="h-7 text-xs"
                                    >
                                        {opt === 'todas' ? 'Todas' : opt === 'propias' ? 'Internas' : 'Externas'}
                                    </Button>
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                <span className="text-muted-foreground mr-1 text-xs font-medium">Moneda:</span>
                                {monedasTransacciones.map((m) => (
                                    <Button
                                        key={m}
                                        variant={filtroMonedaTransacciones === m ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setFiltroMonedaTransacciones(m)}
                                        className="h-7 text-xs"
                                    >
                                        {m === 'todas' ? 'Todas' : m}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <Tabs defaultValue="gastos" className="w-full">
                            <TabsList className={`grid h-auto w-full grid-cols-2 ${verOperacionesMultiples ? 'xl:grid-cols-6' : 'xl:grid-cols-5'}`}>
                                <TabsTrigger
                                    value="gastos"
                                    className="gap-2 data-[state=active]:bg-red-500/15 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-400"
                                >
                                    <ArrowUp className="h-4 w-4" />
                                    Gastos
                                    <Badge className="border border-red-400/30 bg-red-500/10 px-2 text-red-700 backdrop-blur-sm dark:text-red-300">
                                        {gastosFiltrados.length}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="ingresos"
                                    className="gap-2 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400"
                                >
                                    <ArrowDown className="h-4 w-4" />
                                    Ingresos
                                    <Badge className="border border-emerald-400/30 bg-emerald-500/10 px-2 text-emerald-700 backdrop-blur-sm dark:text-emerald-300">
                                        {ingresosFiltrados.length}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="transferencias"
                                    className="gap-2 data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                                >
                                    <ArrowRightLeft className="h-4 w-4" />
                                    Transferencias
                                    <Badge className="border border-blue-400/30 bg-blue-500/10 px-2 text-blue-700 backdrop-blur-sm dark:text-blue-300">
                                        {transferenciasFiltradas.length}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="enviados"
                                    className="gap-2 data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
                                >
                                    <Truck className="h-4 w-4" />
                                    Enviados sin confirmar
                                    <Badge className="border border-amber-400/30 bg-amber-500/10 px-2 text-amber-700 backdrop-blur-sm dark:text-amber-300">
                                        {enviosEnviadosFiltrados.length}
                                    </Badge>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="por-recibir"
                                    className="gap-2 data-[state=active]:bg-sky-500/15 data-[state=active]:text-sky-600 dark:data-[state=active]:text-sky-400"
                                >
                                    <HandCoins className="h-4 w-4" />
                                    Por recibir
                                    <Badge className="border border-sky-400/30 bg-sky-500/10 px-2 text-sky-700 backdrop-blur-sm dark:text-sky-300">
                                        {enviosPorRecibirFiltrados.length}
                                    </Badge>
                                </TabsTrigger>
                                {verOperacionesMultiples && (
                                    <TabsTrigger
                                        value="operaciones-multiples"
                                        className="gap-2 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400"
                                    >
                                        <Shuffle className="h-4 w-4" />
                                        Op. Múltiples
                                        <Badge className="border border-cyan-400/30 bg-cyan-500/10 px-2 text-cyan-700 backdrop-blur-sm dark:text-cyan-300">
                                            {operacionesFiltradas.length}
                                        </Badge>
                                    </TabsTrigger>
                                )}
                            </TabsList>

                            <TabsContent value="gastos" className="mt-4">
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-16">Hora</TableHead>
                                                <TableHead>Descripción</TableHead>
                                                <TableHead>Cuenta de Operación</TableHead>
                                                <TableHead className="w-28">Creado por</TableHead>
                                                <TableHead className="w-48 text-right">Monto</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {gastosFiltrados.length > 0 ? (
                                                gastosFiltrados.map((item, idx) => (
                                                    <TableRow key={idx} className={!item.es_propio ? 'bg-orange-50/60 dark:bg-orange-950/20' : undefined}>
                                                        <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                                        <TableCell className="text-sm">
                                                            {item.desc}
                                                            <MarcaInformativa afectaCaja={item.afecta_caja} />
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            <EntidadFila {...partirEntidad(item.origen || '-')} banco={item.banco ?? null} />
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            <CreadoPor esPropio={item.es_propio} usuario={item.usuario_nombre} turno={item.turno_nombre} />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Badge className="gap-1.5 border border-red-400/30 whitespace-nowrap bg-red-500/10 font-mono font-bold text-red-700 backdrop-blur-sm dark:text-red-300">
                                                                {item.moneda_imagen_url && <img src={item.moneda_imagen_url} alt="" aria-hidden="true" className="h-4 w-auto" />}
                                                                -${Number(item.monto).toFixed(2)} {item.moneda || 'USD'}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center italic">
                                                        {busquedaTransacciones || filtroOrigenTransacciones !== 'todas' || filtroMonedaTransacciones !== 'todas'
                                                            ? 'No se encontraron resultados con los filtros aplicados'
                                                            : 'No hay gastos registrados en este turno.'}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>

                            <TabsContent value="ingresos" className="mt-4">
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-16">Hora</TableHead>
                                                <TableHead>Descripción</TableHead>
                                                <TableHead>Cuenta de Operación</TableHead>
                                                <TableHead className="w-28">Creado por</TableHead>
                                                <TableHead className="w-48 text-right">Monto</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {ingresosFiltrados.length > 0 ? (
                                                ingresosFiltrados.map((item, idx) => (
                                                    <TableRow key={idx} className={!item.es_propio ? 'bg-orange-50/60 dark:bg-orange-950/20' : undefined}>
                                                        <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                                        <TableCell className="text-sm">
                                                            {item.desc}
                                                            <MarcaInformativa afectaCaja={item.afecta_caja} />
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            <EntidadFila {...partirEntidad(item.destino || '-')} banco={item.banco ?? null} />
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            <CreadoPor esPropio={item.es_propio} usuario={item.usuario_nombre} turno={item.turno_nombre} />
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Badge className="gap-1.5 border border-emerald-400/30 whitespace-nowrap bg-emerald-500/10 font-mono font-bold text-emerald-700 backdrop-blur-sm dark:text-emerald-300">
                                                                {item.moneda_imagen_url && <img src={item.moneda_imagen_url} alt="" aria-hidden="true" className="h-4 w-auto" />}
                                                                +${Number(item.monto).toFixed(2)} {item.moneda || 'USD'}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-muted-foreground py-8 text-center italic">
                                                        {busquedaTransacciones || filtroOrigenTransacciones !== 'todas' || filtroMonedaTransacciones !== 'todas'
                                                            ? 'No se encontraron resultados con los filtros aplicados'
                                                            : 'No hay ingresos registrados en este turno.'}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>

                            <TabsContent value="transferencias" className="mt-4">
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-16">Hora</TableHead>
                                                <TableHead className="max-w-[160px]">Descripción</TableHead>
                                                <TableHead className="w-[170px]">Origen</TableHead>
                                                <TableHead className="w-[170px]">Destino</TableHead>
                                                <TableHead className="w-28">Creado por</TableHead>
                                                <TableHead className="w-40 text-right">Monto</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {transferenciasFiltradas.length > 0 ? (
                                                transferenciasFiltradas.map((item, idx) => {
                                                    const tEfectivo = tipoEfectivoTransferencia(item);
                                                    return (
                                                    <TableRow key={idx} className={!item.es_propio ? 'bg-orange-50/60 dark:bg-orange-950/20' : undefined}>
                                                        <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                                        <TableCell className="max-w-[160px] truncate text-sm">{item.desc}</TableCell>
                                                        <TableCell className="text-xs">
                                                            <EntidadFila
                                                                tipo={tipoEntidadDe(item.origen_tipo)}
                                                                nombre={item.origen_nombre}
                                                                banco={item.banco_origen ?? null}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            <EntidadFila
                                                                tipo={tipoEntidadDe(item.destino_tipo)}
                                                                nombre={item.destino_nombre}
                                                                banco={item.banco_destino ?? null}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-xs">
                                                            <CreadoPor esPropio={item.es_propio} usuario={item.usuario_nombre} turno={item.turno_nombre} />
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs">
                                                            <div>
                                                                <Badge
                                                                    className={
                                                                        tEfectivo === 'entrante'
                                                                            ? 'border border-emerald-400/30 bg-emerald-500/10 font-mono font-bold text-emerald-700 backdrop-blur-sm dark:text-emerald-300'
                                                                            : 'border border-blue-400/30 bg-blue-500/10 font-mono font-bold text-blue-700 backdrop-blur-sm dark:text-blue-300'
                                                                    }
                                                                >
                                                                    {tEfectivo === 'entrante' ? '+' : '-'}${Number(tEfectivo === 'entrante' ? item.monto_destino : item.monto_origen).toFixed(2)}{' '}
                                                                    {tEfectivo === 'entrante' ? item.moneda_destino : item.moneda_origen}
                                                                </Badge>
                                                                {(item.moneda_origen ?? item.moneda_destino) && item.moneda_origen !== item.moneda_destino && (
                                                                    <div className="text-muted-foreground mt-0.5 text-[10px] leading-tight whitespace-nowrap">
                                                                        ≈ ${Number(tEfectivo === 'entrante' ? item.monto_origen : item.monto_destino).toFixed(2)}{' '}
                                                                        {tEfectivo === 'entrante' ? item.moneda_origen : item.moneda_destino}
                                                                        <span className="ml-0.5">@ {Number(item.tasa_cambio).toFixed(2)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                    );
                                                })
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-muted-foreground py-8 text-center italic">
                                                        {busquedaTransacciones || filtroOrigenTransacciones !== 'todas' || filtroMonedaTransacciones !== 'todas'
                                                            ? 'No se encontraron resultados con los filtros aplicados'
                                                            : 'No hay transferencias registradas en este turno.'}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>

                            <TabsContent value="enviados" className="mt-4">
                                <TablaEnviosAbiertos
                                    envios={enviosEnviadosFiltrados}
                                    porRecibir={false}
                                    mensajeVacio={
                                        enviosEnviados.length > 0
                                            ? 'No se encontraron resultados con los filtros aplicados'
                                            : 'No hay envíos tuyos esperando confirmación.'
                                    }
                                />
                            </TabsContent>

                            <TabsContent value="por-recibir" className="mt-4">
                                <TablaEnviosAbiertos
                                    envios={enviosPorRecibirFiltrados}
                                    porRecibir
                                    mensajeVacio={
                                        enviosPorRecibir.length > 0
                                            ? 'No se encontraron resultados con los filtros aplicados'
                                            : 'No tienes envíos por recibir.'
                                    }
                                />
                            </TabsContent>

                            {verOperacionesMultiples && (
                                <TabsContent value="operaciones-multiples" className="mt-4">
                                    <TablaOperacionesMultiples
                                        operaciones={operacionesFiltradas}
                                        mensajeVacio={
                                            (operacionesMultiples?.items.length ?? 0) > 0
                                                ? 'No se encontraron resultados con los filtros aplicados'
                                                : 'No hay operaciones múltiples registradas en este turno.'
                                        }
                                    />
                                </TabsContent>
                            )}
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Comparativa con Cierre Anterior */}
                <Card className="gap-0 overflow-hidden border-l-4 border-indigo-500/30 py-0 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader className="border-b bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Scale className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Comparativa con Cierre Anterior</CardTitle>
                                <CardDescription className="text-indigo-100">Comparación de saldos y deudas respecto al cierre anterior</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 p-6">
                        {/* Pestañas Cuentas / Clientes */}
                        <Tabs defaultValue="cuentas" className="w-full">
                            <TabsList className={`grid h-auto w-full ${auth.user.role !== 'vendedor' ? 'grid-cols-2' : ''}`}>
                                <TabsTrigger
                                    value="cuentas"
                                    className="gap-2 data-[state=active]:bg-indigo-500/15 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400"
                                >
                                    <Wallet className="h-4 w-4" />
                                    Cuentas
                                    <Badge className="border border-indigo-400/30 bg-indigo-500/10 px-2 text-indigo-700 backdrop-blur-sm dark:text-indigo-300">
                                        {comparativa_cuentas?.length ?? 0}
                                    </Badge>
                                </TabsTrigger>
                                {auth.user.role !== 'vendedor' && (
                                    <TabsTrigger
                                        value="clientes"
                                        className="gap-2 data-[state=active]:bg-indigo-500/15 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400"
                                    >
                                        <Users className="h-4 w-4" />
                                        Clientes
                                        <Badge className="border border-indigo-400/30 bg-indigo-500/10 px-2 text-indigo-700 backdrop-blur-sm dark:text-indigo-300">
                                            {comparativa_clientes?.length ?? 0}
                                        </Badge>
                                    </TabsTrigger>
                                )}
                            </TabsList>

                            {/* Tab Cuentas */}
                            <TabsContent value="cuentas" className="mt-4 space-y-4">
                                {tiene_cierre_anterior ? (
                                    <>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            <WidgetCambio estado="disponible" color="emerald" icono={ArrowUp} titulo="Subieron" valor={resumenCuentas.subieron} />
                                            <WidgetCambio estado="agotado" color="red" icono={ArrowDown} titulo="Bajaron" valor={resumenCuentas.bajaron} />
                                            <WidgetCambio estado="indigo" color="indigo" icono={CheckCircle2} titulo="Sin cambio" valor={resumenCuentas.iguales} />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-muted-foreground text-xs font-medium">Movimiento neto:</span>
                                            {resumenCuentas.porMoneda.map(([moneda, { diferencia }]) => (
                                                <BadgeDiferencia key={moneda} diferencia={diferencia} moneda={moneda} bueno={diferencia > 0 ? true : diferencia < 0 ? false : null} />
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    comparativa_cuentas.length > 0 && (
                                        <div className="space-y-2 rounded-lg border border-indigo-400/30 bg-indigo-500/5 p-4 backdrop-blur-sm dark:bg-indigo-500/10">
                                            <p className="text-sm font-semibold">Primer cierre</p>
                                            <p className="text-muted-foreground text-xs">
                                                Todavía no hay un cierre anterior con qué comparar. Estos son los saldos actuales; desde el próximo cierre verás aquí lo que cambió.
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-muted-foreground text-xs font-medium">Saldo actual:</span>
                                                {resumenCuentas.porMoneda.map(([moneda, { saldo }]) => (
                                                    <Badge key={moneda} className="border-0 bg-gradient-to-r from-indigo-500 to-violet-600 font-mono font-bold text-white shadow-md shadow-indigo-500/30">
                                                        ${saldo.toFixed(2)} {moneda}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                )}

                                <div className="relative">
                                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                    <Input
                                        placeholder="Buscar cuenta..."
                                        value={busquedaCuentas}
                                        onChange={(e) => setBusquedaCuentas(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <div className="flex flex-wrap items-center gap-1">
                                    <span className="text-muted-foreground mr-1 text-xs font-medium">Tipo:</span>
                                    {tiposUnicos.map(tipo => (
                                        <Button
                                            key={tipo}
                                            variant={filtroTipoCuentas === tipo ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setFiltroTipoCuentas(tipo)}
                                            className="h-7 text-xs capitalize"
                                        >
                                            {tipo === 'todos' ? 'Todos' : tipo}
                                        </Button>
                                    ))}
                                    {tiene_cierre_anterior && (
                                        <Button
                                            variant={soloConCambios ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setSoloConCambios((v) => !v)}
                                            className="ml-2 h-7 text-xs"
                                        >
                                            Solo con cambios
                                        </Button>
                                    )}
                                </div>

                                {/* El contenedor interno de <Table> tiene overflow-x-auto y rompe el sticky: se anula aquí para que el encabezado se fije dentro de este scroll. */}
                                <div className="max-h-[520px] overflow-y-auto rounded-md border [&_[data-slot=table-container]]:overflow-visible">
                                    <Table>
                                        <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                                            <TableRow>
                                                <TableHead>Cuenta</TableHead>
                                                <TableHead>Tipo</TableHead>
                                                <TableHead>Moneda</TableHead>
                                                <TableHead className="text-right">Saldo anterior</TableHead>
                                                <TableHead className="text-right">Saldo actual</TableHead>
                                                <TableHead className="w-44 text-right">En tránsito</TableHead>
                                                {tiene_cierre_anterior && <TableHead className="w-44 text-right">Diferencia</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {cuentasFiltradas.length > 0 ? (
                                                cuentasFiltradas.map((item: ComparativaItem) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell className="text-sm font-medium">
                                                            <EntidadFila tipo="cuenta" nombre={item.nombre} banco={item.banco ?? null} />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                className={
                                                                    item.tipo === 'efectivo'
                                                                        ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                                        : 'border border-sky-400/30 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                                                                }
                                                            >
                                                                {item.tipo === 'efectivo' ? 'Efectivo' : item.tipo === 'tarjeta' ? 'Tarjeta' : item.tipo || '-'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge className="border border-indigo-400/30 bg-indigo-500/10 font-mono text-indigo-700 dark:text-indigo-300">
                                                                {item.moneda}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-right font-mono">
                                                            {item.es_nueva ? '—' : `$${Number(item.saldo_anterior).toFixed(2)}`}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono font-medium">
                                                            ${Number(item.saldo_actual).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {Number(item.en_transito_salida) > 0 || Number(item.en_transito_entrada) > 0 ? (
                                                                <div className="flex flex-col items-end gap-1">
                                                                    {Number(item.en_transito_salida) > 0 && (
                                                                        <Badge
                                                                            className="gap-1 border border-amber-400/30 bg-amber-500/10 font-mono whitespace-nowrap text-amber-700 dark:text-amber-300"
                                                                            title="Ya salió de esta cuenta y todavía no se confirma que llegó"
                                                                        >
                                                                            <Truck className="h-3 w-3" />-${Number(item.en_transito_salida).toFixed(2)} {item.moneda}
                                                                        </Badge>
                                                                    )}
                                                                    {Number(item.en_transito_entrada) > 0 && (
                                                                        <Badge
                                                                            className="gap-1 border border-sky-400/30 bg-sky-500/10 font-mono whitespace-nowrap text-sky-700 dark:text-sky-300"
                                                                            title="Viene en camino a esta cuenta y todavía no se acredita"
                                                                        >
                                                                            <HandCoins className="h-3 w-3" />+${Number(item.en_transito_entrada).toFixed(2)} {item.moneda}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground">—</span>
                                                            )}
                                                        </TableCell>
                                                        {tiene_cierre_anterior && (
                                                            <TableCell className="text-right">
                                                                {item.es_nueva ? (
                                                                    <Badge className="border border-indigo-400/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">Nueva</Badge>
                                                                ) : (
                                                                    <BadgeDiferencia
                                                                        diferencia={Number(item.diferencia)}
                                                                        moneda={item.moneda}
                                                                        bueno={item.estado === 'subio' ? true : item.estado === 'bajo' ? false : null}
                                                                    />
                                                                )}
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={tiene_cierre_anterior ? 7 : 6} className="text-muted-foreground py-8 text-center italic">
                                                        {busquedaCuentas || filtroTipoCuentas !== 'todos' || soloConCambios
                                                            ? 'No se encontraron cuentas con los filtros aplicados'
                                                            : 'No hay cuentas para mostrar'}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>

                                {comparativa_cuentas_cobro.length > 0 && (
                                    <div className="space-y-3 rounded-lg border border-amber-400/30 bg-amber-500/5 p-4 dark:bg-amber-500/10">
                                        <div>
                                            <p className="text-sm font-semibold">Cuentas de cobro</p>
                                            <p className="text-muted-foreground text-xs">
                                                Solo sirven para recibir pagos: no se muestra su saldo general ni se comparan con el cierre anterior, únicamente lo que cobraste en este turno.
                                            </p>
                                        </div>
                                        <div className="rounded-md border">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Cuenta</TableHead>
                                                        <TableHead>Moneda</TableHead>
                                                        <TableHead className="text-right">Cobrado en el turno</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {comparativa_cuentas_cobro.map((cuenta) => (
                                                        <TableRow key={cuenta.id}>
                                                            <TableCell className="text-sm font-medium">
                                                                <EntidadFila tipo="cuenta" nombre={cuenta.nombre} banco={cuenta.banco} />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge className="border border-indigo-400/30 bg-indigo-500/10 font-mono text-indigo-700 dark:text-indigo-300">
                                                                    {cuenta.moneda}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Badge className="border-0 bg-gradient-to-r from-amber-500 to-orange-600 font-mono font-bold text-white shadow-md shadow-amber-500/30">
                                                                    ${Number(cuenta.operado_turno).toFixed(2)} {cuenta.moneda}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            {auth.user.role !== 'vendedor' && (
                            <TabsContent value="clientes" className="mt-4 space-y-4">
                                {tiene_cierre_anterior ? (
                                    <>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            <WidgetCambio estado="disponible" color="emerald" icono={ArrowDown} titulo="Deuda bajó" valor={resumenClientes.mejoraron} />
                                            <WidgetCambio estado="agotado" color="red" icono={ArrowUp} titulo="Deuda subió" valor={resumenClientes.empeoraron} />
                                            <WidgetCambio estado="indigo" color="indigo" icono={CheckCircle2} titulo="Sin cambio" valor={resumenClientes.iguales} />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-muted-foreground text-xs font-medium">Cambio neto de la deuda:</span>
                                            <BadgeDiferencia
                                                diferencia={resumenClientes.diferenciaTotal}
                                                moneda="USD"
                                                bueno={resumenClientes.diferenciaTotal < 0 ? true : resumenClientes.diferenciaTotal > 0 ? false : null}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    comparativa_clientes.length > 0 && (
                                        <div className="space-y-2 rounded-lg border border-indigo-400/30 bg-indigo-500/5 p-4 backdrop-blur-sm dark:bg-indigo-500/10">
                                            <p className="text-sm font-semibold">Primer cierre</p>
                                            <p className="text-muted-foreground text-xs">
                                                Todavía no hay un cierre anterior con qué comparar. Estas son las deudas actuales.
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-muted-foreground text-xs font-medium">Deuda total:</span>
                                                <Badge className="border-0 bg-gradient-to-r from-indigo-500 to-violet-600 font-mono font-bold text-white shadow-md shadow-indigo-500/30">
                                                    ${resumenClientes.deudaTotal.toFixed(2)} USD
                                                </Badge>
                                            </div>
                                        </div>
                                    )
                                )}

                                <div className="relative">
                                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                    <Input
                                        placeholder="Buscar cliente..."
                                        value={busquedaClientes}
                                        onChange={(e) => setBusquedaClientes(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                {tiene_cierre_anterior && (
                                    <div className="flex flex-wrap items-center gap-1">
                                        <Button
                                            variant={soloConCambios ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setSoloConCambios((v) => !v)}
                                            className="h-7 text-xs"
                                        >
                                            Solo con cambios
                                        </Button>
                                    </div>
                                )}

                                <div className="max-h-[520px] overflow-y-auto rounded-md border [&_[data-slot=table-container]]:overflow-visible">
                                    <Table>
                                        <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                                            <TableRow>
                                                <TableHead>Cliente</TableHead>
                                                <TableHead className="text-right">Deuda anterior</TableHead>
                                                <TableHead className="text-right">Deuda actual</TableHead>
                                                {tiene_cierre_anterior && <TableHead className="w-44 text-right">Diferencia</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {clientesFiltrados.length > 0 ? (
                                                clientesFiltrados.map((item: ComparativaClienteItem) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell className="text-sm font-medium">
                                                            <EntidadFila tipo="cliente" nombre={item.nombre} banco={null} />
                                                        </TableCell>
                                                        <TableCell className="text-muted-foreground text-right font-mono">
                                                            ${Number(item.deuda_anterior).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono font-medium">
                                                            ${Number(item.deuda_actual).toFixed(2)}
                                                        </TableCell>
                                                        {tiene_cierre_anterior && (
                                                            <TableCell className="text-right">
                                                                <BadgeDiferencia
                                                                    diferencia={Number(item.diferencia)}
                                                                    moneda="USD"
                                                                    bueno={item.estado === 'mejoro' ? true : item.estado === 'empeoro' ? false : null}
                                                                />
                                                            </TableCell>
                                                        )}
                                                    </TableRow>
                                                ))
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={tiene_cierre_anterior ? 4 : 3} className="text-muted-foreground py-8 text-center italic">
                                                        {busquedaClientes || soloConCambios
                                                            ? 'No se encontraron clientes con los filtros aplicados'
                                                            : 'No hay clientes con deuda registrada.'}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>
                            )}
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Acción Final */}
                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-sm font-bold tracking-wider uppercase">Finalizar Cierre</CardTitle>
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
                            flex-wrap en vez de grid-cols fijo: con 3 a 5 widgets activos (los últimos 2 son
                            condicionales) se acomodan solos llenando el ancho, sin dejar ninguno huérfano. */}
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
                                        ${Number(calculos.comision_pv_total ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Badge>
                                    <Badge className="gap-1 border border-blue-400/30 bg-blue-500/10 text-sm font-semibold text-blue-700 backdrop-blur-sm dark:text-blue-300">
                                        {Number(calculos.comisiones_pv_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                    </Badge>
                                </div>
                                {(calculos.comisiones_pv_detalles ?? []).length > 0 && (
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
                                        ${Number(calculos.comision_gestor_total ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Badge>
                                    <Badge className="gap-1 border border-purple-400/30 bg-purple-500/10 text-sm font-semibold text-purple-700 backdrop-blur-sm dark:text-purple-300">
                                        {Number(calculos.comisiones_gestor_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                    </Badge>
                                </div>
                                {comisionesGestorDetalles.length > 0 && (
                                    <button onClick={() => setShowComisionGestorDialog(true)} className="mt-1 text-xs text-purple-600 underline hover:text-purple-800 dark:text-purple-400">
                                        Ver detalles
                                    </button>
                                )}
                            </SpotlightCard>

                            {/* Ganancia Agencia — solo admin — efecto metálico, es el dato que más le importa al dueño */}
                            {auth.user.role === 'admin' && (
                                <SpotlightCard estado="especial" className="min-w-[220px] flex-1 rounded-lg border border-amber-300/40 bg-amber-500/5 p-3 shadow-sm backdrop-blur-sm dark:bg-amber-500/10">
                                    <div className="mb-2 flex items-center gap-2">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                            <TrendingUp className="h-4 w-4" />
                                        </span>
                                        <p className="text-muted-foreground text-xs font-bold uppercase">Ganancia Agencia</p>
                                    </div>
                                    <Badge className="gap-1 border border-amber-200 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 px-3 py-1 text-2xl font-black text-amber-950 shadow-md shadow-amber-500/40 transition-transform hover:scale-105">
                                        ${Number(calculos.ganancia_agencia_total ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </Badge>
                                    <p className="text-muted-foreground mt-1.5 text-sm">Neto agencia</p>
                                </SpotlightCard>
                            )}

                            {/* Ventas Especiales — si existen en el turno */}
                            {(calculos.ventas_especiales_count ?? 0) > 0 && (
                                <SpotlightCard estado="especial" className="min-w-[220px] flex-1 rounded-lg border border-amber-400/30 bg-amber-500/5 p-3 shadow-sm backdrop-blur-sm dark:bg-amber-500/10">
                                    <div className="mb-2 flex items-center gap-2">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                            <AlertTriangle className="h-4 w-4" />
                                        </span>
                                        <p className="text-muted-foreground text-xs font-bold uppercase">Ventas Especiales</p>
                                    </div>
                                    <Badge className="gap-1 border-0 bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1 text-2xl font-black text-white shadow-md shadow-amber-500/30">
                                        {calculos.ventas_especiales_count} venta{(calculos.ventas_especiales_count ?? 0) > 1 ? 's' : ''}
                                    </Badge>
                                    {canViewEspecialesCostImpact && (
                                        <p className={`mt-1.5 text-sm font-semibold ${(calculos.ventas_especiales_impacto_usd ?? 0) < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                                            Impacto: ${Number(calculos.ventas_especiales_impacto_usd ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                        </p>
                                    )}
                                </SpotlightCard>
                            )}

                            {/* Ventas sin comisión (de la agencia) — si existen en el turno */}
                            {(calculos.ventas_sin_comision_count ?? 0) > 0 && (
                                <SpotlightCard estado="sin-comision" className="min-w-[220px] flex-1 rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/5 p-3 shadow-sm backdrop-blur-sm dark:bg-fuchsia-500/10">
                                    <div className="mb-2 flex items-center gap-2">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400">
                                            <Building2 className="h-4 w-4" />
                                        </span>
                                        <p className="text-muted-foreground text-xs font-bold uppercase">Ventas sin Comisión</p>
                                    </div>
                                    <Badge className="gap-1 border-0 bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 px-3 py-1 text-2xl font-black text-white shadow-md shadow-fuchsia-500/30">
                                        {calculos.ventas_sin_comision_count} venta{(calculos.ventas_sin_comision_count ?? 0) > 1 ? 's' : ''}
                                    </Badge>
                                    {canViewEspecialesCostImpact && (
                                        <p className="mt-1.5 text-sm font-semibold text-fuchsia-600">
                                            Impacto: ${Number(calculos.ventas_sin_comision_impacto_usd ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                        </p>
                                    )}
                                </SpotlightCard>
                            )}
                        </div>

                        {/* Resumen Financiero del Turno + resumen de Ventas sin Comisión — en la misma fila
                            (el detalle completo de ventas sin comisión vive en un modal, como ya hacen
                            Comisión P.V./Gestor/Anuladas/Mensajería — no todo tiene que ser un bloque inline). */}
                        <div className="flex flex-wrap gap-3">
                            {auth.user.role !== 'vendedor' && (calculos.ventas_brutas_usd ?? 0) > 0 && (
                                <SpotlightCard estado="disponible" className="min-w-[280px] flex-1 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950">
                                    <p className="text-muted-foreground mb-2 text-xs font-bold uppercase">Resumen Financiero del Turno</p>
                                    <div className="space-y-2 text-base">
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
                                        <div className="mt-2 flex items-center justify-between border-t border-emerald-200 pt-2 dark:border-emerald-700">
                                            <span className="font-bold text-emerald-800 dark:text-emerald-200">Ganancia neta agencia</span>
                                            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                                                ${Number(calculos.ganancia_agencia_total ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                                            </span>
                                        </div>
                                    </div>
                                </SpotlightCard>
                            )}

                            {/* Ventas sin comisión — resumen compacto, detalle completo en el modal */}
                            {(calculos.ventas_sin_comision_count ?? 0) > 0 && (
                                <SpotlightCard estado="sin-comision" className="min-w-[220px] flex-1 rounded-lg border border-fuchsia-300 bg-fuchsia-100 p-3 dark:border-fuchsia-800 dark:bg-fuchsia-950">
                                    <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Ventas sin Comisión</p>
                                    <p className="text-xl font-black text-fuchsia-700 dark:text-fuchsia-300">
                                        {calculos.ventas_sin_comision_count} venta{(calculos.ventas_sin_comision_count ?? 0) > 1 ? 's' : ''}
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-fuchsia-600 dark:text-fuchsia-400">
                                        Cobrado: ${Number(calculos.ventas_sin_comision_total_usd ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                                    </p>
                                    {canViewEspecialesCostImpact && (
                                        <p className={`text-sm font-semibold ${(calculos.ventas_sin_comision_impacto_usd ?? 0) < 0 ? 'text-red-600' : 'text-fuchsia-600 dark:text-fuchsia-400'}`}>
                                            Impacto: ${Number(calculos.ventas_sin_comision_impacto_usd ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
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
                        {(calculos.mensajero_count ?? 0) > 0 && (
                            <SpotlightCard estado="tarjeta" className="rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-800 dark:bg-sky-950">
                                <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Mensajería del Turno</p>
                                <p className="text-xl font-black text-sky-700 dark:text-sky-300">
                                    {Number(calculos.mensajero_total_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                </p>
                                <p className="mt-1 text-sm text-sky-600 dark:text-sky-400">
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
                            </SpotlightCard>
                        )}

                        {/* Ventas Anuladas — tarjeta resumen */}
                        {(calculos.ventas_anuladas_count ?? 0) > 0 && (
                            <SpotlightCard estado="agotado" className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                                <p className="text-muted-foreground mb-1 text-xs font-bold uppercase">Ventas Anuladas</p>
                                <p className="text-xl font-black text-red-700 dark:text-red-300">
                                    {calculos.ventas_anuladas_count} venta{(calculos.ventas_anuladas_count ?? 0) > 1 ? 's' : ''}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400">
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
                            </SpotlightCard>
                        )}

                        {/* Detalle de ventas especiales del turno */}
                        {(calculos.ventas_especiales_count ?? 0) > 0 && (
                            <SpotlightCard estado="especial" className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
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
                            </SpotlightCard>
                        )}

                        {/* Dialog detalle Ventas sin Comisión */}
                        {(calculos.ventas_sin_comision_count ?? 0) > 0 && (
                            <Dialog open={showVentasSinComisionDialog} onOpenChange={setShowVentasSinComisionDialog}>
                                <DialogContent className="sm:max-w-2xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-fuchsia-700 dark:text-fuchsia-300">
                                            Ventas sin Comisión del Turno
                                        </DialogTitle>
                                        <DialogDescription>
                                            Total cobrado: <strong>${Number(calculos.ventas_sin_comision_total_usd ?? 0).toFixed(2)} USD</strong>
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="text-xs w-[80px]">Venta</TableHead>
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
                                                {(calculos.ventas_sin_comision_detalles ?? []).map((vsc) => (
                                                    <TableRow key={vsc.venta_id}>
                                                        <TableCell className="text-xs font-medium">#{vsc.venta_id}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">{vsc.fecha}</TableCell>
                                                        <TableCell className="text-right text-xs font-semibold text-fuchsia-700 dark:text-fuchsia-300">
                                                            ${vsc.total.toFixed(2)}
                                                        </TableCell>
                                                        {canViewEspecialesCostImpact && (
                                                            <>
                                                                <TableCell className="text-right text-xs text-red-600 dark:text-red-400">
                                                                    ${vsc.costo.toFixed(2)}
                                                                </TableCell>
                                                                <TableCell className={`text-right text-xs font-bold ${vsc.impacto < 0 ? 'text-red-700 dark:text-red-400' : 'text-fuchsia-700 dark:text-fuchsia-300'}`}>
                                                                    ${vsc.impacto.toFixed(2)}
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
                                                        ${Number(calculos.ventas_sin_comision_total_usd ?? 0).toFixed(2)}
                                                    </TableCell>
                                                    {canViewEspecialesCostImpact && (
                                                        <>
                                                            <TableCell className="text-right text-xs font-bold text-red-700 dark:text-red-400">
                                                                ${Number(calculos.ventas_sin_comision_costo_usd ?? 0).toFixed(2)}
                                                            </TableCell>
                                                            <TableCell className={`text-right text-xs font-bold ${(calculos.ventas_sin_comision_impacto_usd ?? 0) < 0 ? 'text-red-700 dark:text-red-400' : 'text-fuchsia-700 dark:text-fuchsia-300'}`}>
                                                                ${Number(calculos.ventas_sin_comision_impacto_usd ?? 0).toFixed(2)}
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
                                <DialogContent className="sm:max-w-3xl">
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
                                                    <TableHead className="text-xs w-[80px]">Venta</TableHead>
                                                    <TableHead className="text-right text-xs w-[100px]">Total Venta</TableHead>
                                                    <TableHead className="text-xs">Productos</TableHead>
                                                    <TableHead className="text-right text-xs">USD cobrado</TableHead>
                                                    <TableHead className="text-right text-xs">Tasa</TableHead>
                                                    <TableHead className="text-right text-xs">CUP pagado</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(calculos.mensajero_detalles ?? []).map((d) => (
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
                                                    <TableCell className="text-right text-xs font-bold">${Number(calculos.mensajero_total_usd ?? 0).toFixed(2)}</TableCell>
                                                    <TableCell />
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
                                <DialogContent className="sm:max-w-3xl">
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
                                                    <TableHead className="text-xs w-[80px]">Venta</TableHead>
                                                    <TableHead className="text-right text-xs w-[100px]">Total Venta</TableHead>
                                                    <TableHead className="text-xs">Productos</TableHead>
                                                    <TableHead className="text-right text-xs w-[140px]">Comisión</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {(calculos.comisiones_pv_detalles ?? []).map((d) => (
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
                                                        ${Number(calculos.comision_pv_total ?? 0).toFixed(2)}
                                                        {' / '}
                                                        <span className="text-blue-700 dark:text-blue-300">
                                                            {Number(calculos.comisiones_pv_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
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
                                            Total: <strong>${Number(calculos.comision_gestor_total ?? 0).toFixed(2)} USD</strong>
                                            {' '}≈ <strong>{Number(calculos.comisiones_gestor_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP</strong>
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
                                                        ${Number(calculos.comision_gestor_total ?? 0).toFixed(2)}
                                                        {' / '}
                                                        <span className="text-purple-700 dark:text-purple-300">
                                                            {Number(calculos.comisiones_gestor_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                                        </span>
                                                    </TableCell>
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
                            <Button type="button" className="h-12 w-full text-base font-bold" disabled={processing} onClick={() => setShowConfirmModal(true)}>
                                <CheckCircle2 className="mr-2 h-5 w-5" /> FINALIZAR CIERRE
                            </Button>
                            <p className="text-muted-foreground px-4 text-center text-[10px] leading-tight italic">
                                Al finalizar se notificará a los administradores y se cerrará tu sesión de venta.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Modal de Confirmación */}
                <Dialog open={showConfirmModal} onOpenChange={(abierto) => !processing && setShowConfirmModal(abierto)}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader className="items-center text-center sm:text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <DialogTitle className="text-xl">¿Finalizar Cierre?</DialogTitle>
                            <DialogDescription>Revisa el resumen: al confirmar se registra el cierre con los datos calculados del sistema.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-800 dark:bg-emerald-900/20">
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Total de ventas del turno</span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-300">${Number(totalVentasProductos).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Saldo esperado</span>
                                <span className="font-bold">
                                    {Number(calculos.saldo_esperado_global || 0) < 0 ? '-' : ''}${Math.abs(Number(calculos.saldo_esperado_global || 0)).toFixed(2)}
                                </span>
                            </div>
                            {data.observaciones.trim() !== '' && (
                                <div className="border-t border-emerald-200 pt-2 text-left dark:border-emerald-800">
                                    <span className="text-muted-foreground text-xs font-bold uppercase">Observaciones</span>
                                    <p className="break-words">{data.observaciones}</p>
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                            <h4 className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-200">Qué va a pasar</h4>
                            <ul className="space-y-1 text-left text-sm text-amber-700 dark:text-amber-300">
                                <li>• Se notificará a los administradores.</li>
                                <li>• Se cerrará tu sesión de venta.</li>
                            </ul>
                        </div>

                        <DialogFooter className="gap-2 sm:justify-center">
                            <Button type="button" variant="outline" onClick={() => setShowConfirmModal(false)} disabled={processing} className="cursor-pointer">
                                Cancelar
                            </Button>
                            <Button type="button" onClick={() => submit()} disabled={processing} className="cursor-pointer gap-2 bg-emerald-600 hover:bg-emerald-700">
                                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                {processing ? 'Finalizando...' : 'Sí, Finalizar Cierre'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

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
