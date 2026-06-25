import AppLogoIcon from '@/components/app-logo-icon';
import HeadingSmall from '@/components/heading-small';
import PaymentForm, { type Moneda as MonedaForm, type Payment as PaymentEdit } from '@/components/ventas/PaymentForm';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollProgress } from '@/components/ui/scroll';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertTriangle,
    Calendar,
    CheckCircle,
    Clock,
    CreditCard,
    DollarSign,
    Edit,
    FileText,
    IdCard,
    MapPin,
    MessageSquare,
    Package,
    Phone,
    Printer,
    ShoppingBag,
    Store,
    TrendingUp,
    Truck,
    User,
    UserCheck,
    Users,
    XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────
// Breadcrumbs
// ─────────────────────────────────────────────
const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Productos', href: '/listado-productos' },
    { title: 'Ventas', href: '/punto-venta' },
    { title: 'Detalle de Venta', href: '#' },
];

// ─────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────
interface Producto {
    id: number;
    nombre: string;
    marca: string;
    modelo?: string;
    capacidad?: string;
    codigo?: string;
    imagen_url?: string;
    categoria: string;
}

interface Item {
    id?: number;
    producto: Producto;
    cantidad: number;
    precio_venta: number;
    precio_base: number;
    subtotal: number;
    costo_unitario: number;
    ganancia: number;
    comision_unitaria: number;
}

interface MonedaPago {
    id: number;
    codigo: string;
    nombre: string;
    simbolo?: string;
}

interface CuentaPago {
    id: number;
    nombre: string;
    moneda: MonedaPago | null;
}

interface ClienteDestino {
    id: number;
    nombre: string;
}

interface Cuenta {
    id: number;
    nombre_cuenta: string;
    saldo_actual: number;
    moneda: {
        codigo: string;
        simbolo: string;
        tasa_cambio?: number;
    };
    tipo: string;
    tipo_moneda: string;
}

interface Pago {
    metodo: string;
    moneda: MonedaPago | null;
    monto: number;
    via: string | null;
    tasa_cambio: number;
    monto_equivalente: number;
    cuenta: CuentaPago | null;
    referencia?: string | null;
    cliente_destino?: ClienteDestino | null;
}

interface Cliente {
    id: number;
    nombre: string;
}

interface Almacen {
    id: number;
    nombre: string;
    mensajero_cuenta_id?: number | null;
    mensajero_cuenta?: { id: number; nombre: string } | null;
}

interface Usuario {
    id: number;
    nombre: string;
    email: string;
    rol: string;
}

interface MonedaPrincipal {
    id: number;
    codigo: string;
    nombre: string;
    simbolo?: string;
}

interface MonedaParaReporte {
    id: number;
    codigo: string;
    nombre: string;
    simbolo: string | null;
    tasa: number;
}

interface Destinatario {
    id: number;
    nombre: string;
    apellidos: string;
    carnet_identidad: string;
    direccion_residencia: string;
    telefono_contacto: string | null;
    parentesco_cliente: string | null;
    observaciones: string | null;
}

interface Venta {
    id: number;
    almacen: Almacen;
    cliente: Cliente | null;
    destinatario: Destinatario | null;
    items: Item[];
    total: number;
    total_ganancia: number;
    total_comision: number;
    ganancia_agencia: number;
    ganancia_perdida_cambiaria: number;
    ganancia_real_total: number;
    fecha: string;
    usuario: Usuario;
    pagos: Pago[];
    total_pagado: number;
    restante: number;
    estado: 'pendiente' | 'completada' | 'cancelada';
    moneda_principal: MonedaPrincipal | null;
    tasa_cambio_principal: number;
    tasa_aplicada_venta: number | null;
    moneda_cobro: MonedaPrincipal | null;
    monedas_para_reporte: MonedaParaReporte[];
    gestor: {
        monto: number;
        monto_usd?: number;
        cuenta_id?: number;
        comentario?: string;
        cuenta_nombre?: string;
        saldo_disponible?: number;
        tasa_aplicada?: number;
        tasa_aplicada_gestor?: number;
        moneda?: {
            codigo: string;
            simbolo: string;
            nombre: string;
            tasa_cambio: number;
        };
    } | null;
    es_venta_especial: boolean;
    nota_venta_especial: string | null;
    decision_notificada: boolean;
    motivo_anulacion?: string | null;
    detalle_anulacion?: string | null;
    mensajero: {
        monto: number;
        tipo: 'propio' | 'externo';
        moneda: string;
        moneda_id?: number | null;
        monto_original?: number | null;
        tasa_entrada?: number | null;
        tasa?: number | null;
        monto_cup?: number | null;
        cuenta?: { id: number; nombre: string; moneda?: string } | null;
    } | null;
    comision_pago: {
        tasa: number | null;
        monto_cup: number | null;
        cuenta: {
            id: number;
            nombre: string;
            moneda?: string;
            saldo_disponible: number;
        } | null;
    } | null;
}

interface Props {
    venta: Venta;
    userRole: 'admin' | 'moderador' | 'vendedor';
    monedasSistema: MonedaParaReporte[];
}

// ─────────────────────────────────────────────
// Motivos de anulación predefinidos
// ─────────────────────────────────────────────
const MOTIVOS_ANULACION = [
    { value: 'error_precio',        label: 'Error en el precio' },
    { value: 'solicitud_cliente',   label: 'Solicitud del cliente' },
    { value: 'producto_defectuoso', label: 'Producto defectuoso' },
    { value: 'duplicado_venta',     label: 'Duplicado de venta' },
    { value: 'error_pedido',        label: 'Error en el pedido' },
    { value: 'otros',               label: 'Otros' },
];

const motivoLabel = (value: string | null | undefined) =>
    MOTIVOS_ANULACION.find((m) => m.value === value)?.label ?? value ?? '—';

// ─────────────────────────────────────────────
// Formulario vacío reutilizable
// ─────────────────────────────────────────────
const FORM_VACIO = {
    nombre: '',
    apellidos: '',
    carnet_identidad: '',
    direccion_residencia: '',
    telefono_contacto: '',
    parentesco_cliente: '',
    observaciones: '',
};

// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
export default function ResultadoCarrito({ venta, userRole, monedasSistema }: Props) {
    // ── Estado principal ──────────────────────
    const [currentVenta, setCurrentVenta] = useState<Venta>(venta);

    // ── Estados de carga ──────────────────────
    const [isCancelling, setIsCancelling] = useState(false);

    // ── Modal anulación ───────────────────────
    const [isAnularDialogOpen, setIsAnularDialogOpen] = useState(false);
    const [motivoAnulacion, setMotivoAnulacion] = useState('');
    const [detalleAnulacion, setDetalleAnulacion] = useState('');

    // ── Modal editar pendiente ────────────────
    const [isEditModalOpen, setIsEditModalOpen]     = useState(false);
    const [editPayments, setEditPayments]           = useState<PaymentEdit[]>([]);
    const [editPrecios, setEditPrecios]             = useState<Record<number, string>>({});
    const [isSavingEdit, setIsSavingEdit]           = useState(false);
    const [clientesFisicosEdit, setClientesFisicosEdit] = useState<{ id: number | string; nombre_cliente: string }[]>([]);
    const [isApproving, setIsApproving] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isSavingDestinatario, setIsSavingDestinatario] = useState(false);

    // ── Venta Especial ────────────────────────
    const [showDecisionAlert, setShowDecisionAlert] = useState(false);

    // ── Modal destinatario ────────────────────
    const [isDestinatarioDialogOpen, setIsDestinatarioDialogOpen] = useState(false);
    const [isEditingDestinatario, setIsEditingDestinatario] = useState(false);
    const [activeTab, setActiveTab] = useState<'receptor' | 'gestor'>('receptor');

    // ── Formulario destinatario ───────────────
    const [formDestinatario, setFormDestinatario] = useState(FORM_VACIO);

    // ── Gestor ────────────────────────────────
    const [esVentaGestor, setEsVentaGestor] = useState(false);
    const [gestorMonto, setGestorMonto] = useState('');
    const [gestorCuentaId, setGestorCuentaId] = useState('');
    const [gestorComentario, setGestorComentario] = useState('');
    const [tasaAplicadaGestor, setTasaAplicadaGestor] = useState('');
    const [cuentasGestor, setCuentasGestor] = useState<Cuenta[]>([]);
    const [cuentaGestorSeleccionada, setCuentaGestorSeleccionada] = useState<Cuenta | null>(null);

    // ── Distribución (mensajero + comisión) ──
    const [showCambiarAComisionPV, setShowCambiarAComisionPV] = useState(false);
    const [showMensajeroForm, setShowMensajeroForm] = useState(false);
    const [mensajeroFormMonto, setMensajeroFormMonto] = useState('');
    const [mensajeroFormTipo, setMensajeroFormTipo] = useState<'propio' | 'externo' | ''>('');
    const [mensajeroFormMoneda, setMensajeroFormMoneda] = useState<'USD' | 'CUP'>('USD');
    const [mensajeroFormTasa, setMensajeroFormTasa] = useState('');
    const [mensajeroFormCuentaExternaId, setMensajeroFormCuentaExternaId] = useState('');
    const [showComisionForm, setShowComisionForm] = useState(false);
    const [comisionFormCuentaId, setComisionFormCuentaId] = useState('');
    const [comisionFormTasa, setComisionFormTasa] = useState('');
    const [cuentasComision, setCuentasComision] = useState<Cuenta[]>([]);
    const [guardandoDistribucion, setGuardandoDistribucion] = useState(false);
    const [monedaGestorSeleccionada, setMonedaGestorSeleccionada] = useState<MonedaParaReporte | null>(null);

    // ── Reporte ───────────────────────────────
    const [monedaReporteSeleccionada, setMonedaReporteSeleccionada] = useState<string>(() =>
        String(venta.moneda_principal?.id ?? venta.monedas_para_reporte?.[0]?.id ?? ''),
    );

    // ─────────────────────────────────────────
    // Cargar cuentas para gestor al montar
    // ─────────────────────────────────────────
    useEffect(() => {
        axios
            .get(route('ventas.getCuentasParaGestor'))
            .then((r) => setCuentasGestor(r.data))
            .catch(() => {});
        // Cargar cuentas CUP para comisión vendedor (filtramos CUP en el cliente)
        axios
            .get(route('ventas.getCuentasParaGestor'))
            .then((r) => setCuentasComision((r.data as Cuenta[]).filter((c) => c.moneda?.codigo === 'CUP')))
            .catch(() => {});
    }, []);

    // Auto-abrir AlertDialog si el vendedor aún no vio el veredicto del admin
    useEffect(() => {
        if (
            currentVenta.es_venta_especial &&
            !currentVenta.decision_notificada &&
            (currentVenta.estado === 'pendiente' || currentVenta.estado === 'rechazada') &&
            userRole === 'vendedor'
        ) {
            setShowDecisionAlert(true);
        }
    }, []);

    // ─────────────────────────────────────────
    // Inicializar estado del gestor desde la venta
    // ─────────────────────────────────────────
    useEffect(() => {
        if (currentVenta.gestor) {
            setEsVentaGestor(true);
            setGestorMonto(String(currentVenta.gestor.monto || ''));
        }
    }, [currentVenta.gestor, cuentasGestor]);

    // ─────────────────────────────────────────
    // Cargar / limpiar formulario al abrir modal
    // cuentasGestor se maneja en un effect separado para evitar
    // resetear esVentaGestor cuando las cuentas cargan async
    // ─────────────────────────────────────────
    useEffect(() => {
        if (!isDestinatarioDialogOpen) return;

        if (isEditingDestinatario && currentVenta.destinatario) {
            const d = currentVenta.destinatario;
            setFormDestinatario({
                nombre: d.nombre,
                apellidos: d.apellidos,
                carnet_identidad: d.carnet_identidad,
                direccion_residencia: d.direccion_residencia,
                telefono_contacto: d.telefono_contacto || '',
                parentesco_cliente: d.parentesco_cliente || '',
                observaciones: d.observaciones || '',
            });

            if (currentVenta.gestor) {
                const g = currentVenta.gestor;
                setEsVentaGestor(true);
                setGestorMonto(String(g.monto || ''));
                setGestorCuentaId(String(g.cuenta_id || ''));
                setGestorComentario(g.comentario || '');
                setTasaAplicadaGestor(g.tasa_aplicada_gestor ? String(g.tasa_aplicada_gestor) : '');
            } else {
                const tasaDefault = currentVenta.tasa_aplicada_venta ?? currentVenta.tasa_cambio_principal;
                setTasaAplicadaGestor(String(tasaDefault));
                setGestorMonto((currentVenta.total_comision * tasaDefault).toFixed(2));
            }
        } else if (!isEditingDestinatario) {
            setFormDestinatario(FORM_VACIO);
            setEsVentaGestor(false);
            setGestorMonto('');
            setGestorCuentaId('');
            setGestorComentario('');
            setTasaAplicadaGestor('');
            setCuentaGestorSeleccionada(null);
            setMonedaGestorSeleccionada(null);
        }
    }, [isDestinatarioDialogOpen, isEditingDestinatario, currentVenta.destinatario, currentVenta.gestor]);

    // Buscar la cuenta seleccionada del gestor cuando cargan las cuentas (async)
    useEffect(() => {
        if (!isDestinatarioDialogOpen || !isEditingDestinatario || !currentVenta.gestor) return;
        const g = currentVenta.gestor;
        if (g.cuenta_id && cuentasGestor.length > 0) {
            const encontrada = cuentasGestor.find((c) => String(c.id) === String(g.cuenta_id));
            setCuentaGestorSeleccionada(encontrada ?? null);
        }
    }, [cuentasGestor, isDestinatarioDialogOpen, isEditingDestinatario, currentVenta.gestor]);

    // ─────────────────────────────────────────
    // Guardar distribución (mensajero + comisión)
    // ─────────────────────────────────────────
    const guardarDistribucion = async (payload: Record<string, unknown>) => {
        setGuardandoDistribucion(true);
        try {
            const { data } = await axios.post(route('ventas.distribucion.store', currentVenta.id), payload);
            if (data.success) {
                setCurrentVenta((prev) => ({
                    ...prev,
                    total: data.total,
                    mensajero: data.mensajero,
                    comision_pago: data.comision_pago,
                    ...(data.gestor === null ? { gestor: null } : {}),
                }));
                toast.success(data.message);
                setShowMensajeroForm(false);
                setShowComisionForm(false);
            }
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Error al guardar.';
            toast.error(msg);
        } finally {
            setGuardandoDistribucion(false);
        }
    };

    const guardarMensajero = () => {
        if (!mensajeroFormTipo) { toast.error('Selecciona el tipo de mensajero.'); return; }
        const monto = parseFloat(mensajeroFormMonto);
        if (isNaN(monto) || monto <= 0) { toast.error('Ingresa el monto real a dar al mensajero.'); return; }
        // Tasa solo aplica cuando el mensajero es USD (necesita conversión a CUP para mover la cuenta)
        const esUSD = !currentVenta.mensajero?.monto_original || currentVenta.mensajero.moneda === 'USD';
        const payload: Record<string, unknown> = {
            mensajero_monto: monto,
            mensajero_tipo: mensajeroFormTipo,
            mensajero_tasa: esUSD && mensajeroFormTasa ? parseFloat(mensajeroFormTasa) : null,
            mensajero_cuenta_id: mensajeroFormTipo === 'propio'
                ? (currentVenta.almacen.mensajero_cuenta_id ?? null)
                : (mensajeroFormCuentaExternaId ? Number(mensajeroFormCuentaExternaId) : null),
        };
        guardarDistribucion(payload);
    };

    const guardarComisionVendedor = () => {
        if (!comisionFormCuentaId) { toast.error('Selecciona una cuenta CUP.'); return; }
        if (!comisionFormTasa || parseFloat(comisionFormTasa) <= 0) { toast.error('Ingresa la tasa CUP/USD.'); return; }
        guardarDistribucion({
            comision_cuenta_id: Number(comisionFormCuentaId),
            comision_tasa: parseFloat(comisionFormTasa),
        });
    };

    // ─────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────
    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    const formatCurrency = (amount: number, currencyCode = 'USD') =>
        new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
        }).format(amount);

    const getCurrencySymbol = (moneda: MonedaPago | MonedaPrincipal | null) => moneda?.simbolo || moneda?.codigo || 'USD';

    const limpiarEstadosGestor = () => {
        setEsVentaGestor(false);
        setGestorMonto('');
        setGestorCuentaId('');
        setGestorComentario('');
        setTasaAplicadaGestor('');
        setCuentaGestorSeleccionada(null);
        setMonedaGestorSeleccionada(null);
    };

    const cerrarModal = () => {
        setIsDestinatarioDialogOpen(false);
        setIsEditingDestinatario(false);
        setActiveTab('receptor');
        setFormDestinatario(FORM_VACIO);
        limpiarEstadosGestor();
    };

    // ─────────────────────────────────────────
    // Derivados de estado
    // ─────────────────────────────────────────
    const monedasReporte = currentVenta.monedas_para_reporte ?? [];
    const monedaReporte = monedasReporte.find((m) => String(m.id) === monedaReporteSeleccionada) ?? monedasReporte[0];
    const tasaReporte = monedaReporte?.tasa ?? 1;
    const codigoReporte = monedaReporte?.codigo || 'USD';
    const convertirMontoReporte = (monto: number) => monto * tasaReporte;

    const isVentaPendiente          = currentVenta.estado === 'pendiente';
    const isVentaCompletada         = currentVenta.estado === 'completada';
    const isVentaCancelada          = currentVenta.estado === 'cancelada';
    const isVentaSolicitudEspecial  = currentVenta.estado === 'solicitud_especial';
    const isVentaRechazada          = currentVenta.estado === 'rechazada';

    // Verifica si la cuenta del gestor tiene saldo insuficiente para cubrir la comisión
    const gestorSinSaldo =
        currentVenta.gestor !== null &&
        currentVenta.gestor.saldo_disponible !== undefined &&
        currentVenta.gestor.saldo_disponible < currentVenta.gestor.monto;

    const comisionSinSaldo =
        currentVenta.comision_pago !== null &&
        currentVenta.comision_pago?.cuenta !== null &&
        currentVenta.comision_pago?.monto_cup !== null &&
        (currentVenta.comision_pago?.cuenta?.saldo_disponible ?? Infinity) <
            (currentVenta.comision_pago?.monto_cup ?? 0);

    const puedeAprobar = isVentaPendiente && currentVenta.destinatario !== null && !gestorSinSaldo && !comisionSinSaldo;

    const monedaPrincipal = currentVenta.moneda_principal;
    const simboloMonedaPrincipal = getCurrencySymbol(monedaPrincipal);

    const getEstadoConfig = () => {
        switch (currentVenta.estado) {
            case 'pendiente':
                return { color: 'bg-yellow-500', text: 'PENDIENTE', textColor: 'text-yellow-600' };
            case 'completada':
                return { color: 'bg-green-500', text: 'COMPLETADA', textColor: 'text-green-600' };
            case 'cancelada':
                return { color: 'bg-red-500', text: 'ANULADA', textColor: 'text-red-600' };
            case 'solicitud_especial':
                return { color: 'bg-amber-500', text: 'SOLICITUD ESPECIAL', textColor: 'text-amber-600' };
            case 'rechazada':
                return { color: 'bg-red-800', text: 'RECHAZADA', textColor: 'text-red-800' };
            default:
                return { color: 'bg-gray-500', text: 'DESCONOCIDO', textColor: 'text-gray-600' };
        }
    };
    const estadoConfig = getEstadoConfig();

    // ─────────────────────────────────────────
    // Acciones
    // ─────────────────────────────────────────

    /** Guardar destinatario (y gestor opcional) */
    const handleGuardarDestinatario = async () => {
        if (!formDestinatario.nombre?.trim() || !formDestinatario.apellidos?.trim()) {
            toast.error('Complete el nombre y apellidos del destinatario');
            setActiveTab('receptor');
            return;
        }
        if (!formDestinatario.carnet_identidad?.trim()) {
            toast.error('El carnet de identidad es obligatorio');
            setActiveTab('receptor');
            return;
        }

        if (esVentaGestor) {
            if (!gestorCuentaId) {
                toast.error('Seleccione una cuenta para el gestor');
                setActiveTab('gestor');
                return;
            }
            if (!gestorMonto || parseFloat(gestorMonto) <= 0) {
                toast.error('Ingrese el monto de la comisión');
                setActiveTab('gestor');
                return;
            }
            // El backend requiere tasa_aplicada_gestor para calcular monto_usd en el cierre de caja
            if (!tasaAplicadaGestor || parseFloat(tasaAplicadaGestor) <= 0) {
                toast.error('Ingrese la tasa de cambio del gestor');
                setActiveTab('gestor');
                return;
            }
        }

        setIsSavingDestinatario(true);
        try {
            const payload = {
                ...formDestinatario,
                telefono_contacto: formDestinatario.telefono_contacto?.trim() || '53 0000 0000',
                es_venta_gestor: esVentaGestor,
                gestor_monto: esVentaGestor ? parseFloat(gestorMonto) || 0 : 0,
                gestor_cuenta_id: esVentaGestor ? gestorCuentaId : null,
                gestor_comentario: esVentaGestor ? gestorComentario : null,
                tasa_aplicada_gestor: esVentaGestor && tasaAplicadaGestor ? parseFloat(tasaAplicadaGestor) : null,
            };

            const { data } = await axios.post(route('ventas.destinatario.store', currentVenta.id), payload);

            if (data.success) {
                const message =
                    data.message ||
                    (data.destinatario && data.gestor
                        ? 'Receptor y Gestor guardados correctamente'
                        : data.destinatario
                          ? isEditingDestinatario
                              ? 'Receptor actualizado correctamente'
                              : 'Receptor guardado correctamente'
                          : 'Gestor guardado correctamente');

                toast.success(message);

                // Actualizar estado local inmediatamente — sin setTimeout ni router.reload()
                setCurrentVenta((prev) => ({
                    ...prev,
                    destinatario: data.destinatario ?? prev.destinatario,
                    gestor: Object.prototype.hasOwnProperty.call(data, 'gestor') ? data.gestor : prev.gestor,
                    total_comision: data.total_comision ?? prev.total_comision,
                }));

                cerrarModal();
            } else {
                toast.error(data.message || 'Error al guardar la información');
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                toast.error(
                    error.response?.data?.message || error.response?.data?.error || `Error ${error.response?.status}: ${error.response?.statusText}`,
                );
            } else {
                toast.error('Error de conexión: No se pudo contactar al servidor');
            }
        } finally {
            setIsSavingDestinatario(false);
        }
    };

    /** Aprobar venta */
    const handleAprobarVenta = async () => {
        setIsApproving(true);
        try {
            const { data } = await axios.post(route('ventas.aprobar', currentVenta.id));
            if (data.success) {
                toast.success(data.message || 'Venta aprobada correctamente');
                setCurrentVenta((prev) => ({ ...prev, estado: 'completada' }));
            } else {
                toast.error(data.message || 'Error al aprobar la venta');
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                toast.error(
                    error.response?.data?.message || error.response?.data?.error || `Error ${error.response?.status}: ${error.response?.statusText}`,
                );
            } else {
                toast.error('Error de conexión: No se pudo contactar al servidor');
            }
        } finally {
            setIsApproving(false);
        }
    };

    /** Admin aprueba la solicitud especial → pasa a pendiente */
    const handleAprobarSolicitudEspecial = async () => {
        setIsApproving(true);
        try {
            const { data } = await axios.post(route('ventas.especial.aprobar', currentVenta.id));
            if (data.success) {
                toast.success(data.message);
                setCurrentVenta((prev) => ({ ...prev, estado: 'pendiente' }));
            } else {
                toast.error(data.message || 'Error al aprobar la solicitud');
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || 'Error al aprobar la solicitud');
            }
        } finally {
            setIsApproving(false);
        }
    };

    /** Admin rechaza la solicitud especial → revierte stock */
    const handleRechazarSolicitudEspecial = async () => {
        setIsRejecting(true);
        try {
            const { data } = await axios.post(route('ventas.especial.rechazar', currentVenta.id));
            if (data.success) {
                toast.success(data.message);
                setCurrentVenta((prev) => ({ ...prev, estado: 'rechazada' }));
            } else {
                toast.error(data.message || 'Error al rechazar la solicitud');
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || 'Error al rechazar la solicitud');
            }
        } finally {
            setIsRejecting(false);
        }
    };

    /** Vendedor cierra el AlertDialog de decisión y marca como notificado */
    const handleCerrarDecisionAlert = async () => {
        setShowDecisionAlert(false);
        try {
            await axios.post(route('ventas.decision.notificada', currentVenta.id));
            setCurrentVenta((prev) => ({ ...prev, decision_notificada: true }));
        } catch { /* silencioso */ }
    };

    /** Abrir modal de edición cargando clientes físicos */
    const handleAbrirEdicion = async () => {
        // Pre-cargar pagos actuales como editables
        const pagosActuales: PaymentEdit[] = currentVenta.pagos.map((p) => ({
            id:          crypto.randomUUID(),
            method:      p.metodo as 'transferencia' | 'efectivo',
            moneda_id:   p.moneda?.id?.toString() ?? '',
            amount:      p.monto,
            via:         p.via ?? undefined,
            exchangeRate: p.tasa_cambio,
            amountInUsd: p.monto_equivalente,
            cuenta_id:   p.cuenta?.id?.toString() ?? null,
            cliente_id:  p.cliente_destino?.id?.toString() ?? null,
            referencia:  undefined,
            moneda_info: p.moneda ? { codigo: p.moneda.codigo, nombre: p.moneda.nombre, simbolo: '' } : undefined,
        }));
        setEditPayments(pagosActuales);

        // Pre-cargar precios actuales usando el ID del detalle como clave
        const precios: Record<number, string> = {};
        currentVenta.items.forEach((item) => {
            const key = item.id ?? item.producto.id;
            precios[key] = Number(item.precio_venta).toString();
        });
        setEditPrecios(precios);

        // Cargar clientes físicos si aún no están cargados
        if (clientesFisicosEdit.length === 0) {
            try {
                const { data } = await axios.get(route('ventas.getClientesFisicosParaPago'));
                setClientesFisicosEdit(data);
            } catch {
                // Si falla, abre igual sin clientes físicos
            }
        }

        setIsEditModalOpen(true);
    };

    /** Guardar cambios de la venta pendiente */
    const handleGuardarEdicion = async () => {
        if (editPayments.length === 0) {
            toast.error('Debe agregar al menos un pago.');
            return;
        }

        const totalEditado = currentVenta.items.reduce((sum, item) => {
            const key    = item.id ?? item.producto.id;
            const pvFb   = Number(item.precio_venta);
            const precio = parseFloat(editPrecios[key] ?? pvFb.toString());
            return sum + (isNaN(precio) ? pvFb : precio) * Number(item.cantidad);
        }, 0);

        const totalPagado = editPayments.reduce((sum, p) => sum + p.amountInUsd, 0);
        if (totalPagado < totalEditado - 0.01) {
            toast.error(`Los pagos no cubren el total. Restante: $${(totalEditado - totalPagado).toFixed(2)} USD`);
            return;
        }

        setIsSavingEdit(true);
        try {
            const payload = {
                pagos: editPayments.map((p) => ({
                    metodo:            p.method,
                    moneda_id:         p.moneda_id,
                    monto:             p.amount,
                    via:               p.via ?? null,
                    tasa_cambio:       p.exchangeRate,
                    monto_equivalente: p.amountInUsd,
                    cuenta_id:         p.cuenta_id ?? null,
                    cliente_id:        p.cliente_id ?? null,
                    referencia:        p.referencia ?? null,
                })),
                items: currentVenta.items.map((item) => ({
                    venta_detalle_id: item.id,
                    precio_venta:     parseFloat(editPrecios[item.id ?? item.producto.id] ?? Number(item.precio_venta).toString()),
                })),
            };

            const { data } = await axios.post(route('ventas.editar.pendiente', currentVenta.id), payload);

            if (data.success) {
                toast.success(data.message || 'Venta actualizada correctamente.');
                // Actualizar estado local con los nuevos datos
                setCurrentVenta((prev) => ({
                    ...prev,
                    total:       data.total,
                    pagos:       data.pagos,
                    total_pagado: data.pagos.reduce((s: number, p: { monto_equivalente: number }) => s + p.monto_equivalente, 0),
                    items: prev.items.map((item) => {
                        const updated = data.items?.find((_: unknown, idx: number) => idx === prev.items.indexOf(item));
                        return updated ? { ...item, ...updated } : item;
                    }),
                }));
                setIsEditModalOpen(false);
            } else {
                toast.error(data.message || 'Error al actualizar la venta.');
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || 'Error al guardar los cambios.');
            } else {
                toast.error('Error de conexión.');
            }
        } finally {
            setIsSavingEdit(false);
        }
    };

    /** Anular venta */
    const handleAnularVenta = async () => {
        if (!motivoAnulacion) {
            toast.error('Debe seleccionar un motivo de anulación');
            return;
        }
        if (motivoAnulacion === 'otros' && !detalleAnulacion.trim()) {
            toast.error('Debe describir el motivo en el campo "Otros"');
            return;
        }
        setIsCancelling(true);
        try {
            const { data } = await axios.post(route('ventas.anular', currentVenta.id), {
                motivo_anulacion: motivoAnulacion,
                detalle_anulacion: motivoAnulacion === 'otros' ? detalleAnulacion.trim() : null,
            });
            if (data.success) {
                toast.success(data.message || 'Venta anulada correctamente');
                setCurrentVenta((prev) => ({
                    ...prev,
                    estado: 'cancelada',
                    motivo_anulacion: motivoAnulacion,
                    detalle_anulacion: motivoAnulacion === 'otros' ? detalleAnulacion.trim() : null,
                }));
                setIsAnularDialogOpen(false);
                setMotivoAnulacion('');
                setDetalleAnulacion('');
            } else {
                toast.error(data.message || 'Error al anular la venta');
            }
        } catch (error: unknown) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || error.response?.data?.error || 'Ocurrió un error al intentar anular la venta.');
            } else {
                toast.error('Error de conexión: No se pudo contactar al servidor');
            }
        } finally {
            setIsCancelling(false);
        }
    };

    // ─────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Detalle de Venta #${currentVenta.id}`} />

            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* ── Header ── */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title={`Detalle de Venta #${currentVenta.id}`} description="Resumen completo de la venta procesada" />
                    <div className={`absolute top-4 right-4 rounded-full px-3 py-1 text-sm font-bold text-white ${estadoConfig.color}`}>
                        {estadoConfig.text}
                    </div>
                    <ShoppingBag
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator />

                {/* ── AlertDialog de decisión para el vendedor ── */}
                <AlertDialog open={showDecisionAlert} onOpenChange={(open) => { if (!open) handleCerrarDecisionAlert(); }}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className={currentVenta.estado === 'pendiente' ? 'text-green-600' : 'text-red-600'}>
                                {currentVenta.estado === 'pendiente' ? '✅ Solicitud Aprobada' : '❌ Solicitud Rechazada'}
                            </AlertDialogTitle>
                            <AlertDialogDescription asChild>
                                <div className="space-y-3">
                                    {currentVenta.estado === 'pendiente' ? (
                                        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                                            <p>El administrador aprobó tu solicitud de venta especial.</p>
                                            <p className="mt-1 font-semibold">Ahora debes agregar el receptor para completar la venta.</p>
                                        </div>
                                    ) : (
                                        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                                            <p>El administrador rechazó tu solicitud de venta especial.</p>
                                            <p className="mt-1 font-semibold">El stock de los productos ha sido revertido automáticamente.</p>
                                        </div>
                                    )}
                                    {currentVenta.nota_venta_especial && (
                                        <p className="text-muted-foreground text-xs">Motivo registrado: <em>{currentVenta.nota_venta_especial}</em></p>
                                    )}
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction
                                onClick={handleCerrarDecisionAlert}
                                className={currentVenta.estado === 'pendiente' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                            >
                                Entendido
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* ── Banner venta especial ── */}
                {currentVenta.es_venta_especial && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                        <div className="flex flex-wrap items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                            <div className="flex-1">
                                <p className="font-semibold text-amber-800 dark:text-amber-200">Venta Especial</p>
                                {currentVenta.nota_venta_especial && (
                                    <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                                        <span className="font-medium">Motivo:</span> {currentVenta.nota_venta_especial}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                    Precio libre · Sin comisión para el vendedor
                                </p>
                            </div>
                            {/* Impacto financiero solo para admin/moderador */}
                            {(userRole === 'admin' || userRole === 'moderador') && (() => {
                                const costoTotal = currentVenta.items.reduce((acc, i) => acc + i.costo_unitario * i.cantidad, 0);
                                const perdida = currentVenta.total - costoTotal;
                                return (
                                    <div className="rounded-lg border border-amber-300 bg-amber-100 px-4 py-2 text-xs dark:border-amber-700 dark:bg-amber-900">
                                        <p className="text-amber-700 dark:text-amber-300">Costo total: <strong>{formatCurrency(costoTotal, simboloMonedaPrincipal)}</strong></p>
                                        <p className="text-amber-700 dark:text-amber-300">Cobrado: <strong>{formatCurrency(currentVenta.total, simboloMonedaPrincipal)}</strong></p>
                                        <p className={`font-bold ${perdida < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            Impacto: {formatCurrency(perdida, simboloMonedaPrincipal)}
                                        </p>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* ── Widgets vendedor: Total + Comisión PV + Comisión Gestor ── */}
                {userRole === 'vendedor' && (
                    <div className={`grid gap-4 ${[currentVenta.gestor, currentVenta.mensajero].filter(Boolean).length === 2 ? 'grid-cols-4' : [currentVenta.gestor, currentVenta.mensajero].filter(Boolean).length === 1 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        <div className="bg-card rounded-xl border p-4 text-center">
                            <ShoppingBag size={24} className="mx-auto mb-2 text-blue-500" />
                            <p className="text-muted-foreground mb-1 text-sm">Total de la Venta</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {formatCurrency(currentVenta.total, monedaPrincipal?.codigo || 'USD')}
                            </p>
                        </div>
                        <div className="bg-card rounded-xl border p-4 text-center">
                            <Store size={24} className="mx-auto mb-2 text-orange-500" />
                            <p className="text-muted-foreground mb-1 text-sm">Comisión P.V.</p>
                            <p className="text-2xl font-bold text-orange-600">
                                {formatCurrency(currentVenta.total_comision, monedaPrincipal?.codigo || 'USD')}
                            </p>
                            {currentVenta.comision_pago?.monto_cup ? (
                                <p className="mt-1 text-xs font-semibold text-orange-500">
                                    = {Number(currentVenta.comision_pago.monto_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                </p>
                            ) : (
                                <p className="text-muted-foreground mt-1 text-xs">Punto de venta</p>
                            )}
                        </div>
                        {currentVenta.gestor && (
                            <div className="bg-card rounded-xl border p-4 text-center">
                                <DollarSign size={24} className="mx-auto mb-2 text-purple-500" />
                                <p className="text-muted-foreground mb-1 text-sm">Comisión Gestor</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {Number(currentVenta.gestor.monto).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                                    {currentVenta.gestor.moneda?.codigo || ''}
                                </p>
                                {currentVenta.gestor.monto_usd !== undefined && (
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        ≈ {formatCurrency(currentVenta.gestor.monto_usd, 'USD')}
                                    </p>
                                )}
                            </div>
                        )}
                        {currentVenta.mensajero && (
                            <div className="bg-card rounded-xl border p-4 text-center">
                                <Truck size={24} className="mx-auto mb-2 text-sky-500" />
                                <p className="text-muted-foreground mb-1 text-sm">Mensajería</p>
                                <p className="text-2xl font-bold text-sky-600">
                                    {currentVenta.mensajero.monto_original && currentVenta.mensajero.moneda !== 'USD'
                                        ? `${Number(currentVenta.mensajero.monto_original).toLocaleString('es-ES', { minimumFractionDigits: 2 })} ${currentVenta.mensajero.moneda}`
                                        : formatCurrency(currentVenta.mensajero.monto, 'USD')}
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs capitalize">
                                    {currentVenta.mensajero.tipo === 'propio' ? 'Vehículo propio' : 'Mensajero externo'}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Widgets admin/moderador: 6 widgets en 2 filas de 3 ── */}
                {(userRole === 'admin' || userRole === 'moderador') && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="bg-card rounded-xl border p-4 text-center">
                            <DollarSign size={24} className="mx-auto mb-2 text-green-500" />
                            <p className="text-muted-foreground mb-1 text-sm">Ganancia Operacional</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(currentVenta.total_ganancia, monedaPrincipal?.codigo || 'USD')}
                            </p>
                        </div>
                        <div className="bg-card rounded-xl border p-4 text-center">
                            <Store size={24} className="mx-auto mb-2 text-orange-500" />
                            <p className="text-muted-foreground mb-1 text-sm">Comisión Vendedor</p>
                            <p className="text-2xl font-bold text-orange-600">
                                {formatCurrency(currentVenta.total_comision, monedaPrincipal?.codigo || 'USD')}
                            </p>
                            {currentVenta.comision_pago?.monto_cup ? (
                                <p className="mt-1 text-xs font-semibold text-orange-500">
                                    = {Number(currentVenta.comision_pago.monto_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                </p>
                            ) : currentVenta.gestor ? (
                                <p className="text-muted-foreground mt-1 text-xs italic">Absorbida por gestor</p>
                            ) : null}
                        </div>
                        <div className="bg-card rounded-xl border p-4 text-center">
                            <DollarSign
                                size={24}
                                className={`mx-auto mb-2 ${currentVenta.ganancia_perdida_cambiaria >= 0 ? 'text-green-500' : 'text-red-500'}`}
                            />
                            <p className="text-muted-foreground mb-1 text-sm">Ganancia/Pérdida Cambiaria</p>
                            <p className={`text-2xl font-bold ${currentVenta.ganancia_perdida_cambiaria >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(currentVenta.ganancia_perdida_cambiaria, monedaPrincipal?.codigo || 'USD')}
                            </p>
                        </div>
                        <div className="bg-card rounded-xl border p-4 text-center">
                            <TrendingUp size={24} className="mx-auto mb-2 text-indigo-500" />
                            <p className="text-muted-foreground mb-1 text-sm">Ganancia Agencia</p>
                            <p className="text-2xl font-bold text-indigo-600">
                                {formatCurrency(currentVenta.ganancia_agencia, monedaPrincipal?.codigo || 'USD')}
                            </p>
                        </div>
                        <div className="bg-card rounded-xl border p-4 text-center">
                            <DollarSign size={24} className="mx-auto mb-2 text-blue-500" />
                            <p className="text-muted-foreground mb-1 text-sm">Ganancia Real Total</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {formatCurrency(currentVenta.ganancia_real_total, monedaPrincipal?.codigo || 'USD')}
                            </p>
                        </div>
                        <div className="bg-card rounded-xl border p-4 text-center">
                            <DollarSign size={24} className="mx-auto mb-2 text-purple-500" />
                            <p className="text-muted-foreground mb-1 text-sm">Tasa Cambio Principal</p>
                            <p className="text-2xl font-bold text-purple-600">
                                1 {monedaPrincipal?.codigo || 'USD'} = {Number(currentVenta.tasa_cambio_principal)?.toFixed(2) || '0.00'}
                            </p>
                        </div>
                    </div>
                )}

                <Separator />

                {/* ── Botones de acción ── */}
                <div className="flex flex-wrap justify-end gap-2">
                    <Link
                        href="/punto-venta"
                        className="focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                        Nueva Venta
                    </Link>

                    <Link
                        href={route('ventas.listado')}
                        className="focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                        Ver Todas las Ventas
                    </Link>

                    {/* ── Acciones para Solicitud Especial ── */}
                    {isVentaSolicitudEspecial && (userRole === 'admin' || userRole === 'moderador') && (
                        <>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="default"
                                        className="flex cursor-pointer items-center gap-2 bg-green-600 text-white hover:bg-green-700"
                                        disabled={isApproving}
                                    >
                                        <CheckCircle size={16} />
                                        {isApproving ? 'Aprobando...' : 'Aprobar Solicitud'}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-green-600">Confirmar Aprobación</AlertDialogTitle>
                                        <AlertDialogDescription asChild>
                                            <div className="space-y-3">
                                                <p>¿Aprobar la solicitud especial <strong>#{currentVenta.id}</strong>?</p>
                                                {currentVenta.nota_venta_especial && (
                                                    <div className="rounded-md bg-amber-50 p-3 text-sm dark:bg-amber-950">
                                                        <p className="font-medium text-amber-700 dark:text-amber-300">Motivo del vendedor:</p>
                                                        <p className="mt-1 italic text-amber-600 dark:text-amber-400">{currentVenta.nota_venta_especial}</p>
                                                    </div>
                                                )}
                                                <div className="rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                                                    Al aprobar, la venta pasará a estado <strong>Pendiente</strong> y el vendedor podrá agregar el receptor para completarla.
                                                </div>
                                            </div>
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={isApproving}>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleAprobarSolicitudEspecial}
                                            className="bg-green-600 hover:bg-green-700"
                                            disabled={isApproving}
                                        >
                                            Sí, Aprobar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        className="flex cursor-pointer items-center gap-2"
                                        disabled={isRejecting}
                                    >
                                        <XCircle size={16} />
                                        {isRejecting ? 'Rechazando...' : 'Rechazar Solicitud'}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-red-600">Confirmar Rechazo</AlertDialogTitle>
                                        <AlertDialogDescription asChild>
                                            <div className="space-y-3">
                                                <p>¿Rechazar la solicitud especial <strong>#{currentVenta.id}</strong>?</p>
                                                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                                                    Al rechazar, el stock reservado se revertirá automáticamente y el vendedor será notificado.
                                                </div>
                                            </div>
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel disabled={isRejecting}>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleRechazarSolicitudEspecial}
                                            className="bg-red-600 hover:bg-red-700"
                                            disabled={isRejecting}
                                        >
                                            Sí, Rechazar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    )}

                    {/* Indicador de espera para el vendedor en solicitud_especial */}
                    {isVentaSolicitudEspecial && userRole === 'vendedor' && (
                        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-800 dark:bg-amber-950">
                            <Clock size={16} className="text-amber-500" />
                            <span className="text-amber-700 dark:text-amber-300">Esperando aprobación del administrador</span>
                        </div>
                    )}

                    {/* Agregar receptor — solo si pendiente y sin destinatario */}
                    {isVentaPendiente && !currentVenta.destinatario && (
                        <Button
                            variant="outline"
                            className="flex cursor-pointer items-center gap-2"
                            onClick={() => {
                                setIsEditingDestinatario(false);
                                setActiveTab('receptor');
                                setIsDestinatarioDialogOpen(true);
                            }}
                        >
                            <Users size={16} />
                            Agregar Receptor
                        </Button>
                    )}

                    {/* Agregar gestor — si ya tiene destinatario pero aún sin gestor */}
                    {isVentaPendiente && currentVenta.destinatario && !currentVenta.gestor && (
                        <Button
                            variant="outline"
                            className="flex cursor-pointer items-center gap-2 border-blue-300 text-blue-600 hover:bg-blue-50"
                            onClick={() => {
                                setIsEditingDestinatario(true);
                                setEsVentaGestor(true);  // pre-activar el switch
                                setActiveTab('gestor');
                                setIsDestinatarioDialogOpen(true);
                            }}
                        >
                            <DollarSign size={16} />
                            Agregar Gestor
                        </Button>
                    )}

                    {/* ── Modal destinatario/gestor ── */}
                    <AlertDialog
                        open={isDestinatarioDialogOpen}
                        onOpenChange={(open) => {
                            if (!open) cerrarModal();
                        }}
                    >
                        <AlertDialogTrigger asChild>
                            <span className="hidden" />
                        </AlertDialogTrigger>
                        <AlertDialogContent className="flex max-h-[92vh] max-w-2xl flex-col">
                            <AlertDialogHeader className="shrink-0">
                                <AlertDialogTitle className="flex items-center gap-2">
                                    <Users size={20} />
                                    {isEditingDestinatario ? 'Editar Información del Receptor' : 'Información del Receptor'}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {isEditingDestinatario
                                        ? 'Actualice los datos de la persona que recibirá el producto.'
                                        : 'Complete los datos de la persona que recibirá el producto.'}
                                </AlertDialogDescription>

                                {esVentaGestor && (
                                    <div className="bg-muted mt-3 rounded-lg border p-3">
                                        <div className="flex items-start gap-2">
                                            <DollarSign className="text-muted-foreground mt-0.5 h-4 w-4" />
                                            <div className="flex-1">
                                                <p className="text-foreground text-sm font-medium">Venta con Gestor activada</p>
                                                <p className="text-muted-foreground mt-1 text-xs">Se guardarán los datos del destinatario y del gestor.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </AlertDialogHeader>

                            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'receptor' | 'gestor')} className="flex min-h-0 flex-1 flex-col">
                                <TabsList className="grid w-full shrink-0 grid-cols-2">
                                    <TabsTrigger value="receptor" className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Receptor
                                    </TabsTrigger>
                                    <TabsTrigger value="gestor" className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Gestor
                                        {esVentaGestor && !gestorCuentaId && (
                                            <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                                                !
                                            </Badge>
                                        )}
                                        {esVentaGestor && gestorCuentaId && gestorMonto && parseFloat(gestorMonto) > 0 && (
                                            <Badge variant="default" className="ml-1 h-5 w-5 bg-green-600 p-0 text-xs">
                                                ✓
                                            </Badge>
                                        )}
                                    </TabsTrigger>
                                </TabsList>

                                <ScrollProgress className="min-h-0 flex-1">
                                {/* Tab: Receptor */}
                                <TabsContent value="receptor" className="mt-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="nombre">Nombre *</Label>
                                            <Input
                                                id="nombre"
                                                value={formDestinatario.nombre}
                                                onChange={(e) => setFormDestinatario((p) => ({ ...p, nombre: e.target.value }))}
                                                placeholder="Ingrese el nombre"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="apellidos">Apellidos *</Label>
                                            <Input
                                                id="apellidos"
                                                value={formDestinatario.apellidos}
                                                onChange={(e) => setFormDestinatario((p) => ({ ...p, apellidos: e.target.value }))}
                                                placeholder="Ingrese los apellidos"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="carnet_identidad">Carnet de Identidad *</Label>
                                            <Input
                                                id="carnet_identidad"
                                                value={formDestinatario.carnet_identidad}
                                                onChange={(e) => setFormDestinatario((p) => ({ ...p, carnet_identidad: e.target.value }))}
                                                placeholder="Número de carnet"
                                                maxLength={11}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="telefono_contacto">Teléfono Contacto *</Label>
                                            <Input
                                                id="telefono_contacto"
                                                value={formDestinatario.telefono_contacto}
                                                onChange={(e) => setFormDestinatario((p) => ({ ...p, telefono_contacto: e.target.value }))}
                                                placeholder="53 0000 0000"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="direccion_residencia">Dirección de Residencia</Label>
                                            <Textarea
                                                id="direccion_residencia"
                                                value={formDestinatario.direccion_residencia}
                                                onChange={(e) => setFormDestinatario((p) => ({ ...p, direccion_residencia: e.target.value }))}
                                                placeholder="Dirección completa donde se entregará el producto"
                                                rows={3}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="parentesco_cliente">Parentesco con Cliente</Label>
                                            <Input
                                                id="parentesco_cliente"
                                                value={formDestinatario.parentesco_cliente}
                                                onChange={(e) => setFormDestinatario((p) => ({ ...p, parentesco_cliente: e.target.value }))}
                                                placeholder="Ej: Familiar, Amigo, etc."
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="observaciones">Observaciones</Label>
                                            <Textarea
                                                id="observaciones"
                                                value={formDestinatario.observaciones}
                                                onChange={(e) => setFormDestinatario((p) => ({ ...p, observaciones: e.target.value }))}
                                                placeholder="Observaciones adicionales"
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Tab: Gestor */}
                                <TabsContent value="gestor" className="mt-4">
                                    <div className="space-y-4">
                                        <div className="bg-muted rounded-lg border p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col gap-1">
                                                    <Label htmlFor="gestor-switch" className="font-bold">
                                                        ¿Venta con Gestor?
                                                    </Label>
                                                    <span className="text-muted-foreground text-xs">Asignar comisión a un tercero</span>
                                                </div>
                                                <Switch
                                                    id="gestor-switch"
                                                    checked={esVentaGestor}
                                                    onCheckedChange={(checked) => {
                                                        setEsVentaGestor(checked);
                                                        if (!checked) limpiarEstadosGestor();
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {esVentaGestor && (
                                            <div className="space-y-4 rounded-lg border p-4">
                                                {/* Badges de todas las monedas del sistema */}
                                                {monedasSistema.length > 0 && (
                                                    <div className="space-y-2">
                                                        <Label>Moneda del Gestor</Label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {monedasSistema.map((m) => (
                                                                <button
                                                                    key={m.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setMonedaGestorSeleccionada(m);
                                                                        setTasaAplicadaGestor(String(m.tasa));
                                                                        setGestorCuentaId('');
                                                                        setCuentaGestorSeleccionada(null);
                                                                        const montoCalculado = currentVenta.total_comision * m.tasa;
                                                                        setGestorMonto(montoCalculado.toFixed(2));
                                                                    }}
                                                                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                                                                        monedaGestorSeleccionada?.id === m.id
                                                                            ? 'bg-primary text-primary-foreground border-primary'
                                                                            : 'bg-background text-foreground hover:bg-muted'
                                                                    }`}
                                                                >
                                                                    {m.codigo} · {m.tasa}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Tasa aplicada — editable */}
                                                <div className="space-y-2">
                                                    <Label>Tasa Aplicada del Gestor</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.0001"
                                                        min="0.0001"
                                                        value={tasaAplicadaGestor}
                                                        onChange={(e) => setTasaAplicadaGestor(e.target.value)}
                                                        placeholder="Ej: 500"
                                                    />
                                                </div>
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="space-y-2">
                                                        <Label>Cuenta del Gestor</Label>
                                                        <Select
                                                            value={gestorCuentaId}
                                                            onValueChange={(val) => {
                                                                setGestorCuentaId(val);
                                                                setCuentaGestorSeleccionada(cuentasGestor.find((c) => String(c.id) === val) || null);
                                                            }}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Seleccione cuenta..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {(monedaGestorSeleccionada
                                                                    ? cuentasGestor.filter((c) => (c.moneda?.codigo || c.tipo_moneda) === monedaGestorSeleccionada.codigo)
                                                                    : cuentasGestor
                                                                ).map((cuenta) => (
                                                                    <SelectItem key={cuenta.id} value={String(cuenta.id)}>
                                                                        {cuenta.nombre_cuenta} ({cuenta.moneda?.codigo || cuenta.tipo_moneda})
                                                                        {' · '}
                                                                        <span className={cuenta.saldo_actual <= 0 ? 'text-red-500' : 'text-green-600'}>
                                                                            Saldo: {cuenta.saldo_actual.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </span>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Monto de Comisión</Label>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-muted-foreground shrink-0 text-sm font-medium">
                                                                {cuentaGestorSeleccionada?.moneda?.codigo || monedaGestorSeleccionada?.codigo || 'USD'}
                                                            </span>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={gestorMonto}
                                                                onChange={(e) => setGestorMonto(e.target.value)}
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Gadget: monto a descontar de la cuenta + saldo disponible */}
                                                {parseFloat(gestorMonto) > 0 && parseFloat(tasaAplicadaGestor) > 0 && (() => {
                                                    const montoGestor = parseFloat(gestorMonto);
                                                    const saldoDisponible = cuentaGestorSeleccionada?.saldo_actual ?? 0;
                                                    const alcanza = saldoDisponible >= montoGestor;
                                                    const codigoMoneda = cuentaGestorSeleccionada?.moneda?.codigo || monedaGestorSeleccionada?.codigo || '';
                                                    return (
                                                        <div className="space-y-2">
                                                            {/* Saldo disponible */}
                                                            {cuentaGestorSeleccionada && (
                                                                <div className={`flex items-center justify-between rounded-lg border px-4 py-2 ${alcanza ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'}`}>
                                                                    <span className={`text-xs font-medium ${alcanza ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>
                                                                        Saldo disponible en cuenta:
                                                                    </span>
                                                                    <span className={`text-sm font-bold ${alcanza ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>
                                                                        {saldoDisponible.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {codigoMoneda}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {/* Monto a descontar */}
                                                            <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${alcanza ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' : 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950'}`}>
                                                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${alcanza ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                                                                    <DollarSign className={`h-4 w-4 ${alcanza ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className={`text-xs ${alcanza ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                                                        {alcanza ? 'Se descontará de la cuenta' : '⚠️ Saldo insuficiente para cubrir la comisión'}
                                                                    </p>
                                                                    <p className={`text-lg font-bold ${alcanza ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                                                        {montoGestor.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {codigoMoneda}
                                                                    </p>
                                                                    <p className={`text-xs ${alcanza ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                        ≈ {(montoGestor / parseFloat(tasaAplicadaGestor)).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                                <div className="space-y-2">
                                                    <Label>Comentario</Label>
                                                    <Textarea
                                                        placeholder="Ej: Gestor externo, acuerdo 50/50..."
                                                        value={gestorComentario}
                                                        onChange={(e) => setGestorComentario(e.target.value)}
                                                        rows={2}
                                                        className="resize-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                                </ScrollProgress>
                            </Tabs>

                            <AlertDialogFooter className="shrink-0">
                                <AlertDialogCancel disabled={isSavingDestinatario} onClick={cerrarModal}>
                                    Cancelar
                                </AlertDialogCancel>
                                <Button
                                    onClick={handleGuardarDestinatario}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                    disabled={
                                        isSavingDestinatario ||
                                        !formDestinatario.nombre?.trim() ||
                                        !formDestinatario.apellidos?.trim()
                                    }
                                >
                                    {isSavingDestinatario ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            Guardando...
                                        </div>
                                    ) : currentVenta.destinatario && esVentaGestor ? (
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="h-4 w-4" />
                                            Guardar Gestor
                                        </div>
                                    ) : currentVenta.destinatario ? (
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            Actualizar
                                        </div>
                                    ) : esVentaGestor ? (
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-4 w-4" />
                                            Guardar Todo
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            Guardar
                                        </div>
                                    )}
                                </Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* Exportar PDF */}
                    <Button variant="outline" className="hover:bg-chart-5 flex cursor-pointer items-center gap-2">
                        <FileText size={16} />
                        Exportar PDF
                    </Button>

                    {/* Imprimir Reporte */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="secondary" className="hover:bg-chart-2 flex cursor-pointer items-center gap-2">
                                <Printer size={16} />
                                Imprimir Reporte
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-2xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-center">
                                    <div className="flex justify-center">
                                        <AppLogoIcon />
                                    </div>
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-center">
                                    <h2 className="text-lg font-bold">
                                        Reporte de Venta #{currentVenta.id} - {currentVenta.almacen.nombre}
                                    </h2>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            {monedasReporte.length > 0 && (
                                <div className="flex items-center gap-2 px-4 pb-2">
                                    <Label htmlFor="moneda-reporte">Moneda del reporte</Label>
                                    <Select value={monedaReporteSeleccionada} onValueChange={setMonedaReporteSeleccionada}>
                                        <SelectTrigger id="moneda-reporte" className="w-[200px]">
                                            <SelectValue placeholder="Seleccionar moneda" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {monedasReporte.map((m) => (
                                                <SelectItem key={m.id} value={String(m.id)}>
                                                    {m.nombre} ({m.codigo})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="max-h-[70vh] overflow-y-auto">
                                <div className="p-4 font-mono text-sm">
                                    <div className="mb-4 border-b pb-2 text-center">
                                        <h2 className="text-lg font-bold">{currentVenta.almacen.nombre}</h2>
                                        <p className="text-xs">Boleta de Venta</p>
                                        <p className="text-xs">Venta #: {currentVenta.id}</p>
                                        <p className="text-xs">{formatDate(currentVenta.fecha)}</p>
                                    </div>
                                    <div className="mb-2">
                                        {currentVenta.destinatario && (
                                            <>
                                                <p>
                                                    <span className="font-bold">Receptor / Cliente:</span> {currentVenta.destinatario.nombre}{' '}
                                                    {currentVenta.destinatario.apellidos}
                                                </p>
                                                <p>
                                                    <span className="font-bold">CI:</span> {currentVenta.destinatario.carnet_identidad}
                                                </p>
                                                <p>
                                                    <span className="font-bold">Teléfono:</span>{' '}
                                                    {currentVenta.destinatario.telefono_contacto || 'No especificado'}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    <div className="mb-2 border-t pt-2">
                                        <h3 className="text-center font-bold">PRODUCTOS</h3>
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr>
                                                    <th className="text-left">Producto</th>
                                                    <th className="text-center">Cant</th>
                                                    <th className="text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentVenta.items.map((item, index) => (
                                                    <tr key={index} className="border-b">
                                                        <td className="text-left">{item.producto.nombre}</td>
                                                        <td className="text-center">{item.cantidad}</td>
                                                        <td className="text-right">
                                                            {formatCurrency(convertirMontoReporte(item.subtotal), codigoReporte)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mb-2 border-t pt-2">
                                        <div className="flex justify-between">
                                            <span>Total:</span>
                                            <span className="font-bold">
                                                {formatCurrency(convertirMontoReporte(currentVenta.total), codigoReporte)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Pagado:</span>
                                            <span>{formatCurrency(convertirMontoReporte(currentVenta.total_pagado), codigoReporte)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Restante:</span>
                                            <span>{formatCurrency(convertirMontoReporte(currentVenta.restante), codigoReporte)}</span>
                                        </div>
                                    </div>
                                    <div className="mb-2 border-t pt-2">
                                        <p className="text-xs">
                                            <span className="font-bold">Vendedor:</span> {currentVenta.usuario.nombre}
                                        </p>
                                    </div>
                                    <div className="mt-4 text-center text-xs">
                                        <p>Gracias por su compra</p>
                                        <p>¡Vuelva pronto!</p>
                                    </div>
                                </div>
                            </div>
                            <AlertDialogFooter>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        const printContent = document.querySelector('[aria-label="alert-dialog-content"]');
                                        if (printContent) {
                                            const originalContents = document.body.innerHTML;
                                            document.body.innerHTML = printContent.innerHTML;
                                            window.print();
                                            document.body.innerHTML = originalContents;
                                        } else {
                                            toast.error('No se pudo generar el reporte para imprimir');
                                        }
                                    }}
                                    className="cursor-pointer"
                                >
                                    Imprimir Ticket
                                </Button>
                                <AlertDialogCancel className="bg-destructive hover:bg-destructive-foreground cursor-pointer text-white">
                                    Cerrar
                                </AlertDialogCancel>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* Aprobar venta */}
                    {isVentaPendiente && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="default"
                                    className="flex cursor-pointer items-center gap-2 bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={isApproving || !puedeAprobar}
                                >
                                    <CheckCircle size={16} />
                                    {isApproving
                                        ? 'Aprobando...'
                                        : !currentVenta.destinatario
                                          ? 'Falta Receptor'
                                          : gestorSinSaldo
                                            ? 'Sin Fondos Gestor'
                                            : comisionSinSaldo
                                              ? 'Sin Fondos Comisión'
                                              : 'Aprobar Venta'}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-green-600">Confirmar Aprobación</AlertDialogTitle>
                                    <AlertDialogDescription asChild>
                                        <div className="space-y-3">
                                            <p>
                                                ¿Está seguro que desea aprobar la Venta <strong>#{currentVenta.id}</strong>?
                                            </p>
                                            <div className="rounded-md bg-green-50 p-3 text-sm font-semibold text-green-600 dark:bg-green-950 dark:text-green-400">
                                                Al aprobar se ejecutará:
                                                <ul className="mt-1 list-inside list-disc space-y-1 font-normal">
                                                    <li>Acreditará pagos en cuentas bancarias</li>
                                                    <li>Registrará deudas de clientes destino</li>
                                                    <li>Cambiará el estado a "Completada"</li>
                                                    {currentVenta.mensajero && currentVenta.mensajero.monto > 0 && (
                                                        <li>
                                                            {currentVenta.mensajero.tipo === 'propio' ? 'Acreditará' : 'Debitará'}{' '}
                                                            <strong>
                                                                {currentVenta.mensajero.monto_original && currentVenta.mensajero.moneda !== 'USD'
                                                                    ? `${Number(currentVenta.mensajero.monto_original).toLocaleString('es-ES', { minimumFractionDigits: 2 })} ${currentVenta.mensajero.moneda}`
                                                                    : currentVenta.mensajero.monto_cup
                                                                        ? `${Number(currentVenta.mensajero.monto_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP`
                                                                        : `${Number(currentVenta.mensajero.monto).toFixed(2)} USD`}
                                                            </strong>{' '}
                                                            en cuenta mensajería ({currentVenta.mensajero.tipo === 'propio' ? 'vehículo propio' : 'externo'})
                                                        </li>
                                                    )}
                                                    {currentVenta.gestor && (
                                                        <li>
                                                            Debitará{' '}
                                                            <strong>
                                                                {currentVenta.gestor.monto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                                                                {currentVenta.gestor.moneda?.codigo || ''}
                                                            </strong>{' '}
                                                            de <strong>{currentVenta.gestor.cuenta_nombre}</strong> (gestor)
                                                        </li>
                                                    )}
                                                    {currentVenta.comision_pago?.monto_cup && currentVenta.comision_pago.cuenta && (
                                                        <li>
                                                            Debitará{' '}
                                                            <strong>
                                                                {Number(currentVenta.comision_pago.monto_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                                            </strong>{' '}
                                                            de <strong>{currentVenta.comision_pago.cuenta.nombre}</strong> (comisión vendedor)
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                            {/* Alerta de saldo del gestor */}
                                            {currentVenta.gestor && currentVenta.gestor.saldo_disponible !== undefined && (
                                                <div className={`rounded-md border p-3 text-sm ${currentVenta.gestor.saldo_disponible >= currentVenta.gestor.monto ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300'}`}>
                                                    {currentVenta.gestor.saldo_disponible >= currentVenta.gestor.monto ? (
                                                        <span>
                                                            ✅ Cuenta del gestor con saldo suficiente:{' '}
                                                            <strong>
                                                                {currentVenta.gestor.saldo_disponible.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                                                                {currentVenta.gestor.moneda?.codigo || ''}
                                                            </strong>
                                                        </span>
                                                    ) : (
                                                        <span>
                                                            ❌ Saldo insuficiente en cuenta del gestor.{' '}
                                                            Disponible:{' '}
                                                            <strong>
                                                                {currentVenta.gestor.saldo_disponible.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                                                                {currentVenta.gestor.moneda?.codigo || ''}
                                                            </strong>{' '}
                                                            — Necesario:{' '}
                                                            <strong>
                                                                {currentVenta.gestor.monto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                                                                {currentVenta.gestor.moneda?.codigo || ''}
                                                            </strong>
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isApproving}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleAprobarVenta}
                                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                                        disabled={isApproving}
                                    >
                                        {isApproving ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                Aprobando...
                                            </div>
                                        ) : (
                                            'Sí, Aprobar Venta'
                                        )}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}

                    {/* Editar pagos / precios */}
                    {isVentaPendiente && (
                        <Button
                            variant="outline"
                            className="flex cursor-pointer items-center gap-2"
                            onClick={handleAbrirEdicion}
                        >
                            <Edit size={16} />
                            Editar Pagos / Precios
                        </Button>
                    )}

                    {/* Anular venta */}
                    {isVentaPendiente && (
                        <>
                            <Button
                                variant="destructive"
                                className="flex cursor-pointer items-center gap-2"
                                disabled={isVentaCancelada || isCancelling}
                                onClick={() => setIsAnularDialogOpen(true)}
                            >
                                <XCircle size={16} />
                                {isVentaCancelada ? 'Anulada' : 'Anular Venta'}
                            </Button>

                            <Dialog
                                open={isAnularDialogOpen}
                                onOpenChange={(open) => {
                                    if (!isCancelling) {
                                        setIsAnularDialogOpen(open);
                                        if (!open) {
                                            setMotivoAnulacion('');
                                            setDetalleAnulacion('');
                                        }
                                    }
                                }}
                            >
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle className="text-red-600">Anular Venta #{currentVenta.id}</DialogTitle>
                                        <DialogDescription>
                                            Esta acción es <strong>irreversible</strong>. Se revertirá el stock reservado.
                                            Las cuentas y deudas de clientes no serán afectadas ya que la venta no fue aprobada.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-4 py-2">
                                        <div className="space-y-1">
                                            <Label htmlFor="motivo-anulacion">
                                                Motivo de anulación <span className="text-red-500">*</span>
                                            </Label>
                                            <Select
                                                value={motivoAnulacion}
                                                onValueChange={setMotivoAnulacion}
                                            >
                                                <SelectTrigger id="motivo-anulacion">
                                                    <SelectValue placeholder="Seleccione un motivo..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {MOTIVOS_ANULACION.map((m) => (
                                                        <SelectItem key={m.value} value={m.value}>
                                                            {m.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {motivoAnulacion === 'otros' && (
                                            <div className="space-y-1">
                                                <Label htmlFor="detalle-anulacion">
                                                    Describa el motivo <span className="text-red-500">*</span>
                                                </Label>
                                                <Textarea
                                                    id="detalle-anulacion"
                                                    placeholder="Ingrese el motivo específico..."
                                                    value={detalleAnulacion}
                                                    onChange={(e) => setDetalleAnulacion(e.target.value)}
                                                    rows={3}
                                                    maxLength={500}
                                                />
                                                <p className="text-muted-foreground text-right text-xs">
                                                    {detalleAnulacion.length}/500
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <DialogFooter className="gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setIsAnularDialogOpen(false);
                                                setMotivoAnulacion('');
                                                setDetalleAnulacion('');
                                            }}
                                            disabled={isCancelling}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={handleAnularVenta}
                                            disabled={isCancelling || !motivoAnulacion}
                                        >
                                            {isCancelling ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                    Anulando...
                                                </div>
                                            ) : (
                                                'Confirmar Anulación'
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                </div>

                {/* ── Panel Distribución unificado ── */}
                {isVentaPendiente && (
                    <div className="bg-card border-sidebar-accent rounded-lg border p-6 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                            Distribución de la Venta
                        </h3>

                        {/* ── Resumen de cobro ── */}
                        <div className="mb-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                            <p className="mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Resumen de cobro</p>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Productos:</span>
                                    <span className="font-medium">
                                        {formatCurrency(currentVenta.items.reduce((s, i) => s + i.subtotal, 0), monedaPrincipal?.codigo || 'USD')}
                                    </span>
                                </div>
                                {currentVenta.mensajero && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground flex items-center gap-1">
                                            <Truck className="h-3 w-3" /> Mensajería:
                                        </span>
                                        <span className="font-medium text-sky-600">
                                            {currentVenta.mensajero.monto_original && currentVenta.mensajero.moneda !== 'USD'
                                                ? `+${Number(currentVenta.mensajero.monto_original).toLocaleString('es-ES', { minimumFractionDigits: 2 })} ${currentVenta.mensajero.moneda}${currentVenta.mensajero.tasa_entrada ? ` ≈ ${formatCurrency(Number(currentVenta.mensajero.monto_original) / currentVenta.mensajero.tasa_entrada, 'USD')}` : ''}`
                                                : `+${formatCurrency(currentVenta.mensajero.monto, 'USD')}`}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between border-t pt-1 font-semibold">
                                    <span>Total cliente:</span>
                                    <span className="text-emerald-600">{formatCurrency(currentVenta.total, monedaPrincipal?.codigo || 'USD')}</span>
                                </div>
                            </div>
                            {/* Pagos recibidos */}
                            {currentVenta.pagos.length > 0 && (
                                <div className="mt-3 border-t pt-2">
                                    <p className="mb-1 text-xs font-medium text-slate-400">Pagos recibidos:</p>
                                    <div className="space-y-1">
                                        {currentVenta.pagos.map((p, i) => (
                                            <div key={i} className="flex justify-between text-xs">
                                                <span className="text-muted-foreground capitalize">
                                                    {p.metodo}{p.via ? ` · ${p.via}` : ''}{p.moneda ? ` (${p.moneda.codigo})` : ''}
                                                </span>
                                                <span className="font-medium">
                                                    {p.monto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} {p.moneda?.codigo}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Mensajero ── */}
                        <div className="mb-4 border-t pt-4">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="flex items-center gap-2 text-sm font-semibold">
                                    <Truck className="h-4 w-4 text-sky-600" />
                                    Mensajería
                                    {currentVenta.mensajero && (
                                        <Badge variant="outline" className="text-sky-600 text-xs">
                                            {currentVenta.mensajero.tipo === 'propio' ? 'Propio' : 'Externo'}
                                        </Badge>
                                    )}
                                </h4>
                                <Button size="sm" variant="outline" onClick={() => {
                                    if (currentVenta.mensajero) {
                                        // Pre-llenar con el monto original si existe, si no con USD
                                        const montoRef = currentVenta.mensajero.monto_original ?? currentVenta.mensajero.monto;
                                        setMensajeroFormMonto(String(montoRef));
                                        setMensajeroFormTipo(currentVenta.mensajero.tipo);
                                        setMensajeroFormTasa(
                                            currentVenta.mensajero.tasa
                                                ? String(currentVenta.mensajero.tasa)
                                                : String(currentVenta.tasa_aplicada_venta ?? currentVenta.tasa_cambio_principal ?? '')
                                        );
                                        setMensajeroFormCuentaExternaId('');
                                    }
                                    setShowMensajeroForm(!showMensajeroForm);
                                }}>
                                    {showMensajeroForm ? 'Cancelar' : currentVenta.mensajero ? 'Editar' : 'Agregar'}
                                </Button>
                            </div>

                            {currentVenta.mensajero && !showMensajeroForm && (
                                <div className="flex items-center justify-between rounded-md bg-sky-50 px-3 py-2 text-sm dark:bg-sky-950">
                                    <span className="text-muted-foreground">
                                        {currentVenta.mensajero.tipo === 'propio' ? '🚗' : '🛵'}{' '}
                                        {currentVenta.mensajero.cuenta?.nombre ?? 'Sin cuenta asignada'}
                                    </span>
                                    <span className="font-semibold text-sky-700">
                                        {currentVenta.mensajero.monto_original && currentVenta.mensajero.moneda !== 'USD'
                                            ? (() => {
                                                const base = `${Number(currentVenta.mensajero.monto_original).toLocaleString('es-ES', { minimumFractionDigits: 2 })} ${currentVenta.mensajero.moneda}`;
                                                const usd = currentVenta.mensajero.tasa_entrada
                                                    ? ` ≈ ${formatCurrency(Number(currentVenta.mensajero.monto_original) / currentVenta.mensajero.tasa_entrada, 'USD')}`
                                                    : '';
                                                return base + usd;
                                            })()
                                            : formatCurrency(currentVenta.mensajero.monto, 'USD')}
                                        {(!currentVenta.mensajero.monto_original || currentVenta.mensajero.moneda === 'USD') && currentVenta.mensajero.monto_cup
                                            ? ` = ${currentVenta.mensajero.monto_cup.toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP`
                                            : ''}
                                    </span>
                                </div>
                            )}

                            {showMensajeroForm && (
                                <div className="mt-2 space-y-3 rounded-lg border p-3">
                                    {/* Referencia del POS */}
                                    {currentVenta.mensajero && (
                                        <div className="rounded-md bg-sky-50 px-3 py-2 text-xs text-muted-foreground dark:bg-sky-950">
                                            <span>Cobrado al cliente (POS): </span>
                                            <span className="font-semibold text-sky-700">
                                                {currentVenta.mensajero.monto_original && currentVenta.mensajero.moneda !== 'USD'
                                                    ? `${Number(currentVenta.mensajero.monto_original).toLocaleString('es-ES', { minimumFractionDigits: 2 })} ${currentVenta.mensajero.moneda}${currentVenta.mensajero.tasa_entrada ? ` ≈ ${formatCurrency(Number(currentVenta.mensajero.monto_original) / currentVenta.mensajero.tasa_entrada, 'USD')}` : ''}`
                                                    : formatCurrency(currentVenta.mensajero.monto, 'USD')}
                                            </span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Monto real al mensajero</Label>
                                            <Input type="number" min="0.01" step="0.01" value={mensajeroFormMonto}
                                                onChange={e => setMensajeroFormMonto(e.target.value)}
                                                placeholder={currentVenta.mensajero?.monto_original
                                                    ? String(currentVenta.mensajero.monto_original)
                                                    : String(currentVenta.mensajero?.monto ?? '')}
                                                className="h-8 text-sm" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Tipo</Label>
                                            <Select value={mensajeroFormTipo} onValueChange={v => setMensajeroFormTipo(v as 'propio' | 'externo')}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="propio">🚗 Vehículo propio</SelectItem>
                                                    <SelectItem value="externo">🛵 Mensajero externo</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {/* Tasa CUP/USD solo cuando el mensajero era USD */}
                                    {(!currentVenta.mensajero?.monto_original || currentVenta.mensajero.moneda === 'USD') && (
                                        <div className="space-y-1">
                                            <Label className="text-xs">Tasa CUP/USD (para mover a cuenta)</Label>
                                            <Input type="number" min="0.01" step="0.01" value={mensajeroFormTasa}
                                                onChange={e => setMensajeroFormTasa(e.target.value)}
                                                className="h-8 text-sm" />
                                        </div>
                                    )}
                                    {mensajeroFormTipo === 'propio' && currentVenta.almacen.mensajero_cuenta && (
                                        <p className="text-xs text-sky-600">
                                            Fondos → <strong>{currentVenta.almacen.mensajero_cuenta.nombre}</strong>
                                        </p>
                                    )}
                                    {mensajeroFormTipo === 'propio' && !currentVenta.almacen.mensajero_cuenta && (
                                        <p className="text-xs text-amber-600">⚠️ Este almacén no tiene cuenta de mensajería configurada.</p>
                                    )}
                                    {mensajeroFormTipo === 'externo' && (
                                        <div className="space-y-1">
                                            <Label className="text-xs">Cuenta destino (externo)</Label>
                                            <Select value={mensajeroFormCuentaExternaId} onValueChange={setMensajeroFormCuentaExternaId}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar cuenta..." /></SelectTrigger>
                                                <SelectContent>
                                                    {cuentasGestor.map(c => (
                                                        <SelectItem key={c.id} value={String(c.id)}>{c.nombre_cuenta}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div className="flex gap-2 justify-end">
                                        {currentVenta.mensajero && (
                                            <Button size="sm" variant="outline" className="text-red-600" disabled={guardandoDistribucion}
                                                onClick={() => guardarDistribucion({ limpiar_mensajero: true })}>
                                                Quitar
                                            </Button>
                                        )}
                                        <Button size="sm" disabled={guardandoDistribucion} onClick={guardarMensajero}>
                                            {guardandoDistribucion ? 'Guardando...' : 'Guardar'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Comisión: vendedor O gestor (XOR) ── */}
                        <div className="border-t pt-4">
                            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                <Store className="h-4 w-4 text-amber-600" />
                                Comisión
                                <span className="text-xs font-normal text-muted-foreground">
                                    {formatCurrency(currentVenta.total_comision, 'USD')}
                                </span>
                            </h4>

                            {/* Selector XOR */}
                            <div className="flex gap-2 mb-3">
                                <Button
                                    size="sm"
                                    variant={!currentVenta.gestor ? 'default' : 'outline'}
                                    className={!currentVenta.gestor ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'text-amber-700'}
                                    onClick={() => {
                                        if (currentVenta.gestor) setShowCambiarAComisionPV(true);
                                    }}
                                >
                                    🏪 Punto de Venta
                                </Button>
                                <Button
                                    size="sm"
                                    variant={currentVenta.gestor ? 'default' : 'outline'}
                                    className={currentVenta.gestor ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-blue-700'}
                                    onClick={() => {
                                        if (!currentVenta.gestor) {
                                            setIsEditingDestinatario(!!currentVenta.destinatario);
                                            setEsVentaGestor(true);
                                            setActiveTab('gestor');
                                            setIsDestinatarioDialogOpen(true);
                                        }
                                    }}
                                >
                                    💼 Gestor
                                </Button>
                            </div>

                            {/* Diálogo confirmación cambio a PV */}
                            <AlertDialog open={showCambiarAComisionPV} onOpenChange={setShowCambiarAComisionPV}>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Cambiar a Punto de Venta?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Se eliminará la configuración del gestor. La comisión pasará al punto de venta y deberás configurar cuenta y tasa.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="bg-amber-600 hover:bg-amber-700"
                                            onClick={() => {
                                                guardarDistribucion({ limpiar_gestor: true });
                                                setShowCambiarAComisionPV(false);
                                            }}
                                        >
                                            Sí, cambiar
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            {/* Si hay gestor: info de solo lectura */}
                            {currentVenta.gestor ? (
                                <div className="rounded-md bg-blue-50 px-3 py-2 text-sm dark:bg-blue-950">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">→ {currentVenta.gestor.cuenta_nombre}:</span>
                                        <span className="font-semibold text-blue-700">
                                            {currentVenta.gestor.monto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                                            {currentVenta.gestor.moneda?.codigo}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-blue-500">Edita desde la card "Gestor" → botón Editar</p>
                                </div>
                            ) : (
                                /* Sin gestor: comisión va al vendedor */
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-sm">
                                            <span className="text-muted-foreground">Comisión total:</span>{' '}
                                            <span className="font-bold text-amber-700">
                                                {formatCurrency(currentVenta.total_comision, 'USD')}
                                            </span>
                                            {currentVenta.comision_pago?.monto_cup && (
                                                <span className="ml-1 text-amber-600">
                                                    = {Number(currentVenta.comision_pago.monto_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                                </span>
                                            )}
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => {
                                            if (currentVenta.comision_pago) {
                                                setComisionFormCuentaId(String(currentVenta.comision_pago.cuenta?.id ?? ''));
                                                setComisionFormTasa(
                                                    currentVenta.comision_pago.tasa
                                                        ? String(currentVenta.comision_pago.tasa)
                                                        : String(currentVenta.tasa_aplicada_venta ?? currentVenta.tasa_cambio_principal ?? '')
                                                );
                                            }
                                            setShowComisionForm(!showComisionForm);
                                        }}>
                                            {showComisionForm ? 'Cancelar' : currentVenta.comision_pago?.cuenta ? 'Editar' : 'Configurar'}
                                        </Button>
                                    </div>

                                    {currentVenta.comision_pago?.cuenta && !showComisionForm && (
                                        <div className="flex justify-between rounded-md bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950">
                                            <span className="text-muted-foreground">{currentVenta.comision_pago.cuenta.nombre}</span>
                                            <span className="font-semibold text-amber-700">
                                                {Number(currentVenta.comision_pago.monto_cup ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                                {currentVenta.comision_pago.cuenta.saldo_disponible !== undefined && (
                                                    <span className={`ml-2 text-xs ${currentVenta.comision_pago.cuenta.saldo_disponible >= (currentVenta.comision_pago.monto_cup ?? 0) ? 'text-green-600' : 'text-red-600'}`}>
                                                        (saldo: {currentVenta.comision_pago.cuenta.saldo_disponible.toLocaleString('es-ES', { minimumFractionDigits: 2 })})
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    )}

                                    {showComisionForm && (
                                        <div className="mt-2 space-y-3 rounded-lg border p-3">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Cuenta CUP</Label>
                                                    <Select value={comisionFormCuentaId} onValueChange={setComisionFormCuentaId}>
                                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                                        <SelectContent>
                                                            {cuentasComision.map(c => (
                                                                <SelectItem key={c.id} value={String(c.id)}>
                                                                    {c.nombre_cuenta} · {c.saldo_actual.toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-xs">Tasa CUP/USD</Label>
                                                    <Input type="number" min="0.01" step="0.01" value={comisionFormTasa}
                                                        onChange={e => setComisionFormTasa(e.target.value)}
                                                        className="h-8 text-sm" />
                                                </div>
                                            </div>
                                            {comisionFormCuentaId && comisionFormTasa && (
                                                <p className="text-xs text-amber-600">
                                                    Se debitarán <strong>
                                                        {(currentVenta.total_comision * parseFloat(comisionFormTasa)).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                                    </strong> al aprobar.
                                                </p>
                                            )}
                                            <div className="flex justify-end gap-2">
                                                {currentVenta.comision_pago?.cuenta && (
                                                    <Button size="sm" variant="outline" className="text-red-600" disabled={guardandoDistribucion}
                                                        onClick={() => guardarDistribucion({ limpiar_comision: true })}>
                                                        Quitar
                                                    </Button>
                                                )}
                                                <Button size="sm" disabled={guardandoDistribucion} onClick={guardarComisionVendedor}>
                                                    {guardandoDistribucion ? 'Guardando...' : 'Guardar'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Cards: Destinatario, Comisión PV, Gestor y Mensajero ── */}
                {(currentVenta.destinatario || currentVenta.gestor || currentVenta.mensajero || currentVenta.comision_pago) && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Card Destinatario */}
                        {currentVenta.destinatario && (
                            <div className="bg-card border-sidebar-accent rounded-lg border p-6 shadow-sm">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="flex items-center gap-2 text-base font-semibold">
                                        <Users className="h-5 w-5 text-green-600" />
                                        <span className="text-foreground">✅ Receptor Registrado</span>
                                    </h3>
                                    {isVentaPendiente && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setIsEditingDestinatario(true);
                                                setActiveTab('receptor');
                                                setIsDestinatarioDialogOpen(true);
                                            }}
                                        >
                                            <Edit size={14} />
                                            <span className="ml-1">Editar</span>
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-2">
                                        <User className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                                        <div className="flex-1">
                                            <p className="text-muted-foreground text-xs font-medium">Nombre Completo:</p>
                                            <p className="text-sm">
                                                {currentVenta.destinatario.nombre} {currentVenta.destinatario.apellidos}
                                            </p>
                                        </div>
                                    </div>
                                    {currentVenta.destinatario.carnet_identidad && (
                                        <div className="flex items-start gap-2">
                                            <IdCard className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                                            <div className="flex-1">
                                                <p className="text-muted-foreground text-xs font-medium">Carnet de Identidad:</p>
                                                <p className="text-sm">{currentVenta.destinatario.carnet_identidad}</p>
                                            </div>
                                        </div>
                                    )}
                                    {currentVenta.destinatario.telefono_contacto && (
                                        <div className="flex items-start gap-2">
                                            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                                            <div className="flex-1">
                                                <p className="text-muted-foreground text-xs font-medium">Teléfono Contacto:</p>
                                                <p className="text-sm">{currentVenta.destinatario.telefono_contacto}</p>
                                            </div>
                                        </div>
                                    )}
                                    {currentVenta.destinatario.direccion_residencia && (
                                        <div className="flex items-start gap-2">
                                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                                            <div className="flex-1">
                                                <p className="text-muted-foreground text-xs font-medium">Dirección de Residencia:</p>
                                                <p className="text-sm">{currentVenta.destinatario.direccion_residencia}</p>
                                            </div>
                                        </div>
                                    )}
                                    {currentVenta.destinatario.parentesco_cliente && (
                                        <div className="flex items-start gap-2">
                                            <Users className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                                            <div className="flex-1">
                                                <p className="text-muted-foreground text-xs font-medium">Parentesco:</p>
                                                <p className="text-sm">{currentVenta.destinatario.parentesco_cliente}</p>
                                            </div>
                                        </div>
                                    )}
                                    {currentVenta.destinatario.observaciones && (
                                        <div className="flex items-start gap-2">
                                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                                            <div className="flex-1">
                                                <p className="text-muted-foreground text-xs font-medium">Observaciones:</p>
                                                <p className="text-sm">{currentVenta.destinatario.observaciones}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Card Comisión Vendedor */}
                        {currentVenta.comision_pago && (
                            <div className="bg-card border-sidebar-accent rounded-lg border p-6 shadow-sm">
                                <div className="mb-4 flex items-center gap-2">
                                    <Store className="h-5 w-5 text-orange-600" />
                                    <h3 className="text-foreground text-base font-semibold">💰 Comisión Punto de Venta</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground text-xs font-medium">Monto en USD:</span>
                                        <Badge variant="outline" className="font-bold text-orange-600">
                                            {formatCurrency(currentVenta.total_comision, 'USD')}
                                        </Badge>
                                    </div>
                                    {currentVenta.comision_pago.tasa && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-xs font-medium">Tasa aplicada:</span>
                                            <span className="text-sm font-medium">
                                                1 USD = {currentVenta.comision_pago.tasa} CUP
                                            </span>
                                        </div>
                                    )}
                                    {currentVenta.comision_pago.monto_cup && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-xs font-medium">Monto en CUP:</span>
                                            <Badge variant="secondary" className="font-bold text-orange-700">
                                                {Number(currentVenta.comision_pago.monto_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                            </Badge>
                                        </div>
                                    )}
                                    {currentVenta.comision_pago.cuenta && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-xs font-medium">
                                                {currentVenta.estado === 'completada' ? 'Cuenta debitada:' : 'Cuenta a debitar:'}
                                            </span>
                                            <span className="text-sm font-medium">{currentVenta.comision_pago.cuenta.nombre}</span>
                                        </div>
                                    )}
                                    {isVentaPendiente && currentVenta.comision_pago.cuenta?.saldo_disponible !== undefined && currentVenta.comision_pago.monto_cup && (
                                        <div className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                                            currentVenta.comision_pago.cuenta.saldo_disponible >= currentVenta.comision_pago.monto_cup
                                                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
                                                : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                                        }`}>
                                            <span className="text-xs font-medium">Saldo disponible:</span>
                                            <span className={`text-sm font-bold ${
                                                currentVenta.comision_pago.cuenta.saldo_disponible >= currentVenta.comision_pago.monto_cup
                                                    ? 'text-green-700 dark:text-green-300'
                                                    : 'text-red-700 dark:text-red-300'
                                            }`}>
                                                {currentVenta.comision_pago.cuenta.saldo_disponible.toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Card Gestor */}
                        {currentVenta.gestor && (
                            <div className="bg-card border-sidebar-accent rounded-lg border p-6 shadow-sm">
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="h-5 w-5 text-blue-600" />
                                        <h3 className="text-foreground text-base font-semibold">💼 Gestor - Comisión</h3>
                                    </div>
                                    {isVentaPendiente && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setIsEditingDestinatario(true);
                                                setActiveTab('gestor');
                                                setIsDestinatarioDialogOpen(true);
                                            }}
                                        >
                                            <Edit size={14} />
                                            <span className="ml-1">Editar</span>
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    {/* Monto descontado en moneda local */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-4 w-4 text-green-600" />
                                            <span className="text-muted-foreground text-xs font-medium">Descontado:</span>
                                        </div>
                                        <Badge variant="outline" className="font-bold text-green-600">
                                            {Number(currentVenta.gestor.monto).toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                                            {currentVenta.gestor.moneda?.codigo || ''}
                                        </Badge>
                                    </div>
                                    {/* Equivalente en USD para control */}
                                    {currentVenta.gestor.monto_usd !== undefined && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4 text-blue-600" />
                                                <span className="text-muted-foreground text-xs font-medium">Equivalente USD:</span>
                                            </div>
                                            <Badge variant="secondary" className="font-bold">
                                                {Number(currentVenta.gestor.monto_usd).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                                            </Badge>
                                        </div>
                                    )}
                                    {currentVenta.gestor.cuenta_nombre && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="h-4 w-4 text-blue-600" />
                                                <span className="text-muted-foreground text-xs font-medium">Cuenta:</span>
                                            </div>
                                            <span className="text-sm font-medium">{currentVenta.gestor.cuenta_nombre}</span>
                                        </div>
                                    )}
                                    {/* Saldo disponible de la cuenta del gestor */}
                                    {currentVenta.gestor.saldo_disponible !== undefined && isVentaPendiente && (
                                        <div className={`flex items-center justify-between rounded-md border px-3 py-2 ${currentVenta.gestor.saldo_disponible >= currentVenta.gestor.monto ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'}`}>
                                            <div className="flex items-center gap-2">
                                                <DollarSign className={`h-4 w-4 ${currentVenta.gestor.saldo_disponible >= currentVenta.gestor.monto ? 'text-green-600' : 'text-red-600'}`} />
                                                <span className="text-xs font-medium">Saldo disponible:</span>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-sm font-bold ${currentVenta.gestor.saldo_disponible >= currentVenta.gestor.monto ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                                    {currentVenta.gestor.saldo_disponible.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currentVenta.gestor.moneda?.codigo || ''}
                                                </span>
                                                {currentVenta.gestor.saldo_disponible < currentVenta.gestor.monto && (
                                                    <p className="text-xs text-red-600 dark:text-red-400">⚠️ Fondos insuficientes para aprobar</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {currentVenta.gestor.tasa_aplicada_gestor && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                                <span className="text-muted-foreground text-xs font-medium">Tasa:</span>
                                            </div>
                                            <span className="text-sm font-medium">
                                                1 USD = {currentVenta.gestor.tasa_aplicada_gestor} {currentVenta.gestor.moneda?.codigo || ''}
                                            </span>
                                        </div>
                                    )}
                                    {currentVenta.gestor.comentario && (
                                        <div className="bg-muted rounded-md p-3">
                                            <div className="flex items-start gap-2">
                                                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                                                <div className="flex-1">
                                                    <p className="text-muted-foreground text-xs font-medium">Comentario:</p>
                                                    <p className="text-sm italic">{currentVenta.gestor.comentario}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Card Mensajero */}
                        {currentVenta.mensajero && (
                            <div className="bg-card border-sidebar-accent rounded-lg border p-6 shadow-sm">
                                <div className="mb-4 flex items-center gap-2">
                                    <Truck className="h-5 w-5 text-sky-600" />
                                    <h3 className="text-foreground text-base font-semibold">
                                        {currentVenta.mensajero.tipo === 'propio' ? '🚗 Mensajería — Vehículo Propio' : '🛵 Mensajería — Externo'}
                                    </h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground text-xs font-medium">Monto cobrado al cliente:</span>
                                        <Badge variant="outline" className="font-bold text-sky-600">
                                            {currentVenta.mensajero.monto_original && currentVenta.mensajero.moneda !== 'USD'
                                                ? `${Number(currentVenta.mensajero.monto_original).toLocaleString('es-ES', { minimumFractionDigits: 2 })} ${currentVenta.mensajero.moneda}`
                                                : formatCurrency(currentVenta.mensajero.monto, 'USD')}
                                        </Badge>
                                    </div>
                                    {currentVenta.mensajero.tasa_entrada && currentVenta.mensajero.moneda !== 'USD' && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-xs font-medium">Equivalente USD:</span>
                                            <span className="text-sm font-medium">
                                                {formatCurrency(
                                                    Number(currentVenta.mensajero.monto_original) / currentVenta.mensajero.tasa_entrada,
                                                    'USD'
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {currentVenta.mensajero.tasa && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-xs font-medium">Tasa aplicada:</span>
                                            <span className="text-sm font-medium">1 USD = {currentVenta.mensajero.tasa} CUP</span>
                                        </div>
                                    )}
                                    {currentVenta.mensajero.monto_cup && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-xs font-medium">
                                                {currentVenta.mensajero.tipo === 'propio' ? 'Acreditado en cuenta:' : 'Pagado al mensajero:'}
                                            </span>
                                            <Badge variant="secondary" className="font-bold">
                                                {Number(currentVenta.mensajero.monto_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                            </Badge>
                                        </div>
                                    )}
                                    {currentVenta.mensajero.cuenta && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-xs font-medium">
                                                {currentVenta.mensajero.tipo === 'propio' ? 'Cuenta acreditada:' : 'Cuenta debitada:'}
                                            </span>
                                            <span className="text-sm font-medium">{currentVenta.mensajero.cuenta.nombre}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Info general de la venta ── */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Calendar className="text-muted-foreground h-5 w-5" />
                            <h3 className="font-semibold">Fecha y Hora</h3>
                        </div>
                        <p className="mt-2 text-sm">{formatDate(currentVenta.fecha)}</p>
                    </div>
                    <div className="bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <Store className="text-muted-foreground h-5 w-5" />
                            <h3 className="font-semibold">Almacén</h3>
                        </div>
                        <p className="mt-2 text-sm">{currentVenta.almacen.nombre}</p>
                    </div>
                    <div className="bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <User className="text-muted-foreground h-5 w-5" />
                            <h3 className="font-semibold">Cliente</h3>
                        </div>
                        <p className="mt-2 text-sm">{currentVenta.cliente?.nombre ?? 'Cliente no especificado'}</p>
                    </div>
                    <div className="bg-card rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <UserCheck className="text-muted-foreground h-5 w-5" />
                            <h3 className="font-semibold">Vendedor</h3>
                        </div>
                        <p className="mt-2 text-sm">
                            {currentVenta.usuario.nombre} ({currentVenta.usuario.rol})
                        </p>
                    </div>
                </div>

                {/* ── Tabla de productos ── */}
                <div className="bg-card rounded-lg p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                        <Package className="h-5 w-5" />
                        Productos Vendidos
                    </h3>
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Producto</th>
                                    <th className="px-4 py-3 text-left font-semibold">Marca</th>
                                    <th className="px-4 py-3 text-left font-semibold">Modelo</th>
                                    <th className="px-4 py-3 text-left font-semibold">Capacidad</th>
                                    <th className="px-4 py-3 text-left font-semibold">Categoría</th>
                                    <th className="px-4 py-3 text-center font-semibold">Cantidad</th>
                                    <th className="px-4 py-3 text-left font-semibold">Precio Unitario</th>
                                    {userRole !== 'vendedor' && <th className="px-4 py-3 text-left font-semibold">Costo Unitario</th>}
                                    {userRole !== 'vendedor' && <th className="px-4 py-3 text-left font-semibold">Ganancia Unitaria</th>}
                                    <th className="px-4 py-3 text-left font-semibold">Comisión Unit.</th>
                                    <th className="px-4 py-3 text-left font-semibold">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {currentVenta.items.map((item, index) => (
                                    <tr key={index} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={item.producto.imagen_url || 'https://via.placeholder.com/40'}
                                                    alt={item.producto.nombre}
                                                    className="h-10 w-10 rounded-md object-cover"
                                                />
                                                <div>
                                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{item.producto.nombre}</p>
                                                    {item.producto.codigo && <p className="text-xs text-gray-500">{item.producto.codigo}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{item.producto.marca}</td>
                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{item.producto.modelo || 'N/A'}</td>
                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{item.producto.capacidad || 'N/A'}</td>
                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{item.producto.categoria}</td>
                                        <td className="px-4 py-2 text-center">
                                            <span className="font-semibold">{item.cantidad}</span>
                                        </td>
                                        <td className="px-4 py-2">{formatCurrency(item.precio_venta, simboloMonedaPrincipal)}</td>
                                        {userRole !== 'vendedor' && (
                                            <td className="px-4 py-2 text-red-600">{formatCurrency(item.costo_unitario, simboloMonedaPrincipal)}</td>
                                        )}
                                        {userRole !== 'vendedor' && (
                                            <td className="px-4 py-2 text-green-600">{formatCurrency(item.ganancia, simboloMonedaPrincipal)}</td>
                                        )}
                                        <td className="px-4 py-2 text-orange-600">
                                            {item.comision_unitaria > 0 ? formatCurrency(item.comision_unitaria, simboloMonedaPrincipal) : '—'}
                                        </td>
                                        <td className="px-4 py-2 font-medium">{formatCurrency(item.subtotal, simboloMonedaPrincipal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-sidebar-accent">
                                <tr>
                                    <td colSpan={userRole === 'vendedor' ? 8 : 10} className="px-4 py-3 text-right font-semibold text-white">
                                        Total Venta:
                                    </td>
                                    <td className="px-4 py-3 text-center text-lg font-semibold text-white">
                                        {formatCurrency(currentVenta.total, simboloMonedaPrincipal)}
                                    </td>
                                </tr>
                                {userRole !== 'vendedor' && (
                                    <tr className="bg-green-50 dark:bg-green-900/20">
                                        <td colSpan={10} className="px-4 py-3 text-right font-semibold text-green-800 dark:text-green-400">
                                            Ganancia Total:
                                        </td>
                                        <td className="px-4 py-3 text-center text-lg font-semibold text-green-800 dark:text-green-400">
                                            {formatCurrency(currentVenta.total_ganancia, simboloMonedaPrincipal)}
                                        </td>
                                    </tr>
                                )}
                                {currentVenta.total_comision > 0 && (
                                    <tr className="bg-orange-50 dark:bg-orange-900/20">
                                        <td colSpan={userRole === 'vendedor' ? 8 : 10} className="px-4 py-3 text-right font-semibold text-orange-700 dark:text-orange-400">
                                            Comisión Vendedor:
                                        </td>
                                        <td className="px-4 py-3 text-center text-lg font-semibold text-orange-700 dark:text-orange-400">
                                            {formatCurrency(currentVenta.total_comision, simboloMonedaPrincipal)}
                                        </td>
                                    </tr>
                                )}
                                {userRole !== 'vendedor' && (
                                    <tr className="bg-blue-50 dark:bg-blue-900/20">
                                        <td colSpan={10} className="px-4 py-3 text-right font-semibold text-blue-700 dark:text-blue-400">
                                            Ganancia Agencia:
                                        </td>
                                        <td className="px-4 py-3 text-center text-lg font-semibold text-blue-700 dark:text-blue-400">
                                            {formatCurrency(currentVenta.ganancia_agencia, simboloMonedaPrincipal)}
                                        </td>
                                    </tr>
                                )}
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* ── Pagos y resumen financiero ── */}
                <div
                    className="animate__animated animate__flipInX grid auto-rows-min gap-6 grid-cols-1 md:grid-cols-2"
                >
                    {/* Detalles de pagos */}
                    <div className="bg-card rounded-lg p-6 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                            <CreditCard className="h-5 w-5" />
                            Detalles de Pago
                        </h3>
                        {currentVenta.pagos.length > 0 ? (
                            currentVenta.pagos.map((pago, index) => {
                                const simboloMonedaPago = getCurrencySymbol(pago.moneda);
                                const simboloMonedaCuenta = getCurrencySymbol(pago.cuenta?.moneda || null);
                                return (
                                    <div key={index} className="bg-muted mb-4 rounded-md p-3 last:mb-0">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-sm font-medium">Método:</p>
                                                <p className="text-sm capitalize">{pago.metodo}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Moneda:</p>
                                                <p className="text-sm">{pago.moneda?.nombre || 'No especificada'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Monto Original:</p>
                                                <p className="text-sm">{formatCurrency(pago.monto, simboloMonedaPago)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Equivalente {simboloMonedaPrincipal}:</p>
                                                <p className="text-sm">{formatCurrency(pago.monto_equivalente, simboloMonedaPrincipal)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Tasa Cambio:</p>
                                                <p className="text-sm">{pago.tasa_cambio}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">Destino:</p>
                                                <p className="text-sm">
                                                    {pago.cliente_destino?.nombre
                                                        ? `Cliente: ${pago.cliente_destino.nombre}`
                                                        : pago.cuenta?.nombre
                                                          ? `${pago.cuenta.nombre} (${pago.cuenta.moneda?.nombre || simboloMonedaCuenta})`
                                                          : 'No especificado'}
                                                </p>
                                            </div>
                                            {pago.via && (
                                                <div className="col-span-2">
                                                    <p className="text-sm font-medium">Vía:</p>
                                                    <p className="text-sm capitalize">{pago.via}</p>
                                                </div>
                                            )}
                                            {pago.referencia && (
                                                <div className="col-span-2">
                                                    <p className="text-sm font-medium">Referencia:</p>
                                                    <p className="text-sm">{pago.referencia}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-muted-foreground text-center">No hay pagos registrados</p>
                        )}
                    </div>

                    {/* Resumen financiero — todos los roles, ganancia de agencia oculta para vendedor */}
                    <div className="bg-card rounded-lg p-6 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                            <DollarSign className="h-5 w-5" />
                            Resumen Financiero
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total de la Venta:</span>
                                <span className="font-semibold">{formatCurrency(currentVenta.total, simboloMonedaPrincipal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Pagado:</span>
                                <span className="font-semibold text-green-600">
                                    {formatCurrency(currentVenta.total_pagado, simboloMonedaPrincipal)}
                                </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Restante por Pagar:</span>
                                <span className={`font-semibold ${currentVenta.restante > 0 ? 'text-orange-500' : 'text-green-600'}`}>
                                    {formatCurrency(currentVenta.restante, simboloMonedaPrincipal)}
                                </span>
                            </div>
                            {/* Ganancia Operacional — solo admin/moderador */}
                            {userRole !== 'vendedor' && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Ganancia Operacional:</span>
                                    <span className="font-semibold text-green-600">
                                        {formatCurrency(currentVenta.total_ganancia, simboloMonedaPrincipal)}
                                    </span>
                                </div>
                            )}
                            {currentVenta.total_comision > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Comisión P.V.:</span>
                                    <span className="font-semibold text-orange-600">
                                        {formatCurrency(currentVenta.total_comision, simboloMonedaPrincipal)}
                                    </span>
                                </div>
                            )}
                            {currentVenta.comision_pago?.monto_cup && (
                                <div className="flex justify-between pl-4 text-sm">
                                    <span className="text-muted-foreground">→ Pago vendedor (CUP):</span>
                                    <span className="font-semibold text-orange-500">
                                        {Number(currentVenta.comision_pago.monto_cup).toLocaleString('es-ES', { minimumFractionDigits: 2 })} CUP
                                    </span>
                                </div>
                            )}
                            {/* Comisión Gestor — visible para todos si existe */}
                            {currentVenta.gestor && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Comisión Gestor:</span>
                                    <span className="font-semibold text-purple-600">
                                        {Number(currentVenta.gestor.monto).toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                                        {currentVenta.gestor.moneda?.codigo || ''}
                                    </span>
                                </div>
                            )}
                            {/* Ganancia Agencia — solo admin/moderador */}
                            {userRole !== 'vendedor' && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Ganancia Agencia:</span>
                                    <span className="font-semibold text-indigo-600">
                                        {formatCurrency(currentVenta.ganancia_agencia, simboloMonedaPrincipal)}
                                    </span>
                                </div>
                            )}
                            {/* Ganancia/Pérdida Cambiaria y Real — solo admin/moderador */}
                            {userRole !== 'vendedor' && isVentaCompletada && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Ganancia/Pérdida Cambiaria:</span>
                                        <span
                                            className={`font-semibold ${currentVenta.ganancia_perdida_cambiaria < 0 ? 'text-red-500' : 'text-green-600'}`}
                                        >
                                            {formatCurrency(currentVenta.ganancia_perdida_cambiaria, simboloMonedaPrincipal)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Ganancia Real Total:</span>
                                        <span className="font-semibold text-green-600">
                                            {formatCurrency(currentVenta.ganancia_real_total, simboloMonedaPrincipal)}
                                        </span>
                                    </div>
                                </>
                            )}
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Estado:</span>
                                    <span className={`font-semibold ${estadoConfig.textColor}`}>{estadoConfig.text}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Moneda Principal:</span>
                                    <span className="font-semibold">{monedaPrincipal?.nombre || 'No especificada'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Tasa Cambio Principal:</span>
                                    <span className="font-semibold">{currentVenta.tasa_cambio_principal}</span>
                                </div>
                            </div>

                            {isVentaPendiente && (
                                <div className="mt-4 space-y-2">
                                    <div className="rounded-md bg-yellow-50 p-3">
                                        <p className="text-sm text-yellow-800">
                                            <strong>Venta Pendiente:</strong> Esta venta requiere aprobación para afectar stock y cuentas.
                                            {!currentVenta.destinatario ? (
                                                <span className="mt-1 block font-semibold">
                                                    ❌ Para aprobar, primero debe registrar la información del receptor.
                                                </span>
                                            ) : (
                                                <span className="mt-1 block font-semibold text-green-600">
                                                    ✅ Receptor registrado.
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    {/* Estado del saldo del gestor */}
                                    {currentVenta.gestor && currentVenta.gestor.saldo_disponible !== undefined && (
                                        <div className={`rounded-md p-3 text-sm ${currentVenta.gestor.saldo_disponible >= currentVenta.gestor.monto ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                            {currentVenta.gestor.saldo_disponible >= currentVenta.gestor.monto ? (
                                                <span>
                                                    ✅ Cuenta del gestor <strong>({currentVenta.gestor.cuenta_nombre})</strong> con fondos suficientes:{' '}
                                                    <strong>
                                                        {currentVenta.gestor.saldo_disponible.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                                                        {currentVenta.gestor.moneda?.codigo || ''}
                                                    </strong>
                                                </span>
                                            ) : (
                                                <span>
                                                    ❌ La cuenta del gestor <strong>({currentVenta.gestor.cuenta_nombre})</strong> no tiene fondos suficientes.{' '}
                                                    Saldo actual:{' '}
                                                    <strong>
                                                        {currentVenta.gestor.saldo_disponible.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                                                        {currentVenta.gestor.moneda?.codigo || ''}
                                                    </strong>{' '}
                                                    — Necesario:{' '}
                                                    <strong>
                                                        {currentVenta.gestor.monto.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                                                        {currentVenta.gestor.moneda?.codigo || ''}
                                                    </strong>.{' '}
                                                    Recargue la cuenta para poder aprobar.
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {isVentaCancelada && (
                                <div className="mt-4 space-y-1 rounded-md bg-red-50 p-3">
                                    <p className="text-sm text-red-800">
                                        <strong>Venta Anulada:</strong> Esta venta fue cancelada y el stock fue revertido.
                                    </p>
                                    {currentVenta.motivo_anulacion && (
                                        <p className="text-sm text-red-700">
                                            <strong>Motivo:</strong> {motivoLabel(currentVenta.motivo_anulacion)}
                                        </p>
                                    )}
                                    {currentVenta.detalle_anulacion && (
                                        <p className="text-sm text-red-700">
                                            <strong>Detalle:</strong> {currentVenta.detalle_anulacion}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                </div>

                {/* ── Info del sistema (solo si el vendedor de la venta es admin) ── */}
                {userRole === 'admin' && (
                    <div className="bg-card rounded-lg p-6 shadow-sm">
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                            <UserCheck className="h-5 w-5" />
                            Información del Sistema
                        </h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <p className="text-sm font-medium">ID de Venta:</p>
                                <p className="text-muted-foreground text-sm">#{currentVenta.id}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium">Vendedor ID:</p>
                                <p className="text-muted-foreground text-sm">{currentVenta.usuario.id}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium">Almacén ID:</p>
                                <p className="text-muted-foreground text-sm">{currentVenta.almacen.id}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* ── Modal Editar Venta Pendiente ── */}
            <Dialog
                open={isEditModalOpen}
                onOpenChange={(open) => { if (!isSavingEdit) setIsEditModalOpen(open); }}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="h-5 w-5 text-blue-600" />
                            Editar Venta Pendiente #{currentVenta.id}
                        </DialogTitle>
                        <DialogDescription>
                            Ajusta los precios de los productos y/o los métodos de pago. Los pagos actuales serán reemplazados por los nuevos.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-2">
                        {/* ── Precios ── */}
                        <div className="space-y-3">
                            <h4 className="flex items-center gap-2 font-medium">
                                <Package className="h-4 w-4 text-gray-500" />
                                Precios por Producto
                            </h4>
                            <div className="space-y-2">
                                {currentVenta.items.map((item) => {
                                    const key            = item.id ?? item.producto.id;
                                    const pvOrig         = Number(item.precio_venta);
                                    const comisionOrig   = Number(item.comision_unitaria);
                                    const precioBase     = Number(item.precio_base ?? item.precio_venta);
                                    const precioActual   = parseFloat(editPrecios[key] ?? pvOrig.toString());

                                    // Derivar comisión base desde precio_base y comision_unitaria original
                                    const comisionBase = pvOrig >= precioBase
                                        ? comisionOrig - (pvOrig - precioBase)
                                        : comisionOrig + (precioBase - pvOrig);

                                    // Recalcular comisión con el precio que está editando
                                    const nuevaComision = !isNaN(precioActual)
                                        ? precioActual >= precioBase
                                            ? comisionBase + (precioActual - precioBase)
                                            : Math.max(0, comisionBase - (precioBase - precioActual))
                                        : comisionOrig;

                                    const markupExtra = !isNaN(precioActual) && precioActual > precioBase
                                        ? precioActual - precioBase
                                        : 0;

                                    return (
                                        <div key={key} className="bg-secondary/30 rounded-lg border p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">{item.producto.nombre}</p>
                                                    <p className="text-muted-foreground text-xs">
                                                        {item.producto.marca} · Cant: {item.cantidad} · Base: ${precioBase.toFixed(2)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-muted-foreground text-xs">$</span>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="w-24 text-right text-sm"
                                                        value={editPrecios[key] ?? pvOrig.toString()}
                                                        onChange={(e) =>
                                                            setEditPrecios((prev) => ({ ...prev, [key]: e.target.value }))
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            {/* Comisión estimada con el precio actual */}
                                            <div className="mt-2 flex items-center justify-between border-t pt-1.5 text-xs">
                                                <span className="text-amber-600">
                                                    Comisión estimada × {item.cantidad}:
                                                </span>
                                                <span className="font-semibold text-amber-700">
                                                    ${(nuevaComision * item.cantidad).toFixed(2)}
                                                    {markupExtra > 0 && (
                                                        <span className="text-green-600 ml-1">
                                                            (base ${(comisionBase * item.cantidad).toFixed(2)} + markup ${(markupExtra * item.cantidad).toFixed(2)})
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <Separator />

                        {/* ── Pagos actuales ── */}
                        <PaymentList
                            payments={editPayments}
                            total={currentVenta.items.reduce((sum, item) => {
                                const key    = item.id ?? item.producto.id;
                                const pvFb   = Number(item.precio_venta);
                                const precio = parseFloat(editPrecios[key] ?? pvFb.toString());
                                return sum + (isNaN(precio) ? pvFb : precio) * Number(item.cantidad);
                            }, 0)}
                            onRemovePayment={(id) => setEditPayments((prev) => prev.filter((p) => p.id !== id))}
                        />

                        <Separator />

                        {/* ── Formulario de nuevo pago ── */}
                        <PaymentForm
                            monedas={monedasSistema.map((m): MonedaForm => ({
                                id:              m.id,
                                codigo_moneda:   m.codigo,
                                nombre_moneda:   m.nombre,
                                simbolo_moneda:  m.simbolo ?? '',
                                tasa_cambio:     m.tasa,
                            }))}
                            clientesFisicos={clientesFisicosEdit}
                            remainingInUsd={Math.max(
                                0,
                                currentVenta.items.reduce((sum, item) => {
                                    const key    = item.id ?? item.producto.id;
                                    const pvFb   = Number(item.precio_venta);
                                    const precio = parseFloat(editPrecios[key] ?? pvFb.toString());
                                    return sum + (isNaN(precio) ? pvFb : precio) * Number(item.cantidad);
                                }, 0) - editPayments.reduce((s, p) => s + p.amountInUsd, 0),
                            )}
                            onAddPayment={(payment) => setEditPayments((prev) => [...prev, payment])}
                        />
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsEditModalOpen(false)}
                            disabled={isSavingEdit}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleGuardarEdicion}
                            disabled={isSavingEdit || editPayments.length === 0}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {isSavingEdit ? (
                                <div className="flex items-center gap-2">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Guardando...
                                </div>
                            ) : (
                                'Guardar Cambios'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ScrollProgress />
        </AppLayout>
    );
}
