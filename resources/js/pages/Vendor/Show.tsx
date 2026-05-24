import AppLogoIcon from '@/components/app-logo-icon';
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
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
    Calendar,
    CheckCircle,
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
    producto: Producto;
    cantidad: number;
    precio_venta: number;
    subtotal: number;
    costo_unitario: number;
    ganancia: number;
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
        cuenta_id?: number;
        comentario?: string;
        cuenta_nombre?: string;
        tasa_aplicada?: number;
        tasa_aplicada_gestor?: number;
        monto_usd?: number;
    } | null;
}

interface Props {
    venta: Venta;
    userRole: 'admin' | 'moderador' | 'vendedor';
}

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
export default function ResultadoCarrito({ venta, userRole }: Props) {
    // ── Estado principal ──────────────────────
    const [currentVenta, setCurrentVenta] = useState<Venta>(venta);

    // ── Estados de carga ──────────────────────
    const [isCancelling, setIsCancelling] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isSavingDestinatario, setIsSavingDestinatario] = useState(false);

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
    // ─────────────────────────────────────────
    useEffect(() => {
        if (!isDestinatarioDialogOpen) return;

        if (isEditingDestinatario && currentVenta.destinatario) {
            // Modo edición: pre-rellenar datos del destinatario
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

            // Si ya existe gestor, pre-rellenar sus datos
            if (currentVenta.gestor) {
                const g = currentVenta.gestor;
                setEsVentaGestor(true);
                setGestorMonto(String(g.monto || ''));
                setGestorCuentaId(String(g.cuenta_id || ''));
                setGestorComentario(g.comentario || '');
                setTasaAplicadaGestor(g.tasa_aplicada_gestor ? String(g.tasa_aplicada_gestor) : '');

                if (g.cuenta_id && cuentasGestor.length > 0) {
                    const encontrada = cuentasGestor.find((c) => String(c.id) === String(g.cuenta_id));
                    setCuentaGestorSeleccionada(encontrada ?? null);
                }
            }
            // Nota: activeTab y esVentaGestor son seteados por el botón que abre el modal,
            // así que no los sobreescribimos aquí para respetar la intención del usuario.
        } else if (!isEditingDestinatario) {
            // Modo nuevo: limpiar todo
            setFormDestinatario(FORM_VACIO);
            setEsVentaGestor(false);
            setGestorMonto('');
            setGestorCuentaId('');
            setGestorComentario('');
            setTasaAplicadaGestor('');
            setCuentaGestorSeleccionada(null);
        }
    }, [isDestinatarioDialogOpen, isEditingDestinatario, currentVenta.destinatario, currentVenta.gestor, cuentasGestor]);

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

    const isVentaPendiente = currentVenta.estado === 'pendiente';
    const isVentaCompletada = currentVenta.estado === 'completada';
    const isVentaCancelada = currentVenta.estado === 'cancelada';
    const puedeAprobar = isVentaPendiente && currentVenta.destinatario !== null;

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
        if (!formDestinatario.telefono_contacto?.trim()) {
            toast.error('El teléfono de contacto es obligatorio');
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
                // data.gestor es null cuando no aplica gestor, y eso es correcto limpiarlo
                setCurrentVenta((prev) => ({
                    ...prev,
                    destinatario: data.destinatario ?? prev.destinatario,
                    gestor: Object.prototype.hasOwnProperty.call(data, 'gestor') ? data.gestor : prev.gestor,
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

    /** Anular venta */
    const handleAnularVenta = async () => {
        setIsCancelling(true);
        try {
            const { data } = await axios.post(route('ventas.anular', currentVenta.id));
            if (data.success) {
                toast.success(data.message || 'Venta anulada correctamente');
                setCurrentVenta((prev) => ({ ...prev, estado: 'cancelada' }));
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

                {/* ── Resumen de Ganancias (admin/moderador) ── */}
                {(userRole === 'admin' || userRole === 'moderador') && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div className="bg-card rounded-xl border p-4 text-center">
                            <DollarSign size={24} className="mx-auto mb-2 text-green-500" />
                            <p className="text-muted-foreground mb-1 text-sm">Ganancia Operacional</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(currentVenta.total_ganancia, monedaPrincipal?.codigo || 'USD')}
                            </p>
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
                        <AlertDialogContent className="max-w-2xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2 text-blue-600">
                                    <Users size={20} />
                                    {isEditingDestinatario ? 'Editar Información del Receptor' : 'Información del Receptor'}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {isEditingDestinatario
                                        ? 'Actualice los datos de la persona que recibirá el producto.'
                                        : 'Complete los datos de la persona que recibirá el producto.'}
                                </AlertDialogDescription>

                                {esVentaGestor && (
                                    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                                        <div className="flex items-start gap-2">
                                            <DollarSign className="mt-0.5 h-4 w-4 text-blue-600" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-blue-900">Venta con Gestor activada</p>
                                                <p className="mt-1 text-xs text-blue-700">Se guardarán los datos del destinatario y del gestor.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </AlertDialogHeader>

                            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'receptor' | 'gestor')} className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
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
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="telefono_contacto">Teléfono Contacto *</Label>
                                            <Input
                                                id="telefono_contacto"
                                                value={formDestinatario.telefono_contacto}
                                                onChange={(e) => setFormDestinatario((p) => ({ ...p, telefono_contacto: e.target.value }))}
                                                placeholder="Número de teléfono"
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
                                        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col gap-1">
                                                    <Label htmlFor="gestor-switch" className="font-bold text-blue-900">
                                                        ¿Venta con Gestor?
                                                    </Label>
                                                    <span className="text-xs text-blue-700">Asignar comisión a un tercero</span>
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
                                                                {cuentasGestor.map((cuenta) => (
                                                                    <SelectItem key={cuenta.id} value={String(cuenta.id)}>
                                                                        {cuenta.nombre_cuenta} ({cuenta.moneda?.codigo || cuenta.tipo_moneda})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label>Monto de Comisión</Label>
                                                        <div className="relative">
                                                            <span className="text-muted-foreground absolute top-2.5 left-3 text-sm">
                                                                {cuentaGestorSeleccionada?.moneda?.simbolo || '$'}
                                                            </span>
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                className="pl-8"
                                                                value={gestorMonto}
                                                                onChange={(e) => setGestorMonto(e.target.value)}
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
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
                            </Tabs>

                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isSavingDestinatario} onClick={cerrarModal}>
                                    Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleGuardarDestinatario}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                    disabled={
                                        isSavingDestinatario ||
                                        !formDestinatario.nombre?.trim() ||
                                        !formDestinatario.apellidos?.trim() ||
                                        !formDestinatario.carnet_identidad?.trim() ||
                                        !formDestinatario.telefono_contacto?.trim()
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
                                </AlertDialogAction>
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
                                    className="flex cursor-pointer items-center gap-2 bg-green-600 text-white hover:bg-green-700"
                                    disabled={isApproving || !puedeAprobar}
                                >
                                    <CheckCircle size={16} />
                                    {isApproving ? 'Aprobando...' : puedeAprobar ? 'Aprobar Venta' : 'Falta Receptor'}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-green-600">Confirmar Aprobación</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        ¿Está seguro que desea aprobar la Venta <strong>#{currentVenta.id}</strong>?<br />
                                        <span className="font-semibold text-green-500">
                                            Esta acción:
                                            <br />
                                            • Descontará stock de los productos
                                            <br />
                                            • Actualizará saldos de cuentas bancarias
                                            <br />• Cambiará el estado a "Completada"
                                        </span>
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

                    {/* Anular venta */}
                    {isVentaPendiente && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    className="flex cursor-pointer items-center gap-2"
                                    disabled={isVentaCancelada || isCancelling}
                                >
                                    <XCircle size={16} />
                                    {isVentaCancelada ? 'Anulada' : 'Anular Venta'}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-red-600">Confirmar Anulación</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción es <strong>irreversible</strong>. ¿Está seguro que desea anular la Venta{' '}
                                        <strong>#{currentVenta.id}</strong>?<br />
                                        <span className="font-semibold text-red-500">
                                            {isVentaCompletada
                                                ? 'Se revertirá el stock de los productos y se deducirán los montos de las cuentas bancarias asociadas.'
                                                : 'Se revertirá el stock reservado. Las cuentas y deudas de clientes no serán afectadas ya que la venta no fue aprobada.'}
                                        </span>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isCancelling}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleAnularVenta}
                                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                                        disabled={isCancelling}
                                    >
                                        {isCancelling ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                Anulando...
                                            </div>
                                        ) : (
                                            'Sí, Anular Venta'
                                        )}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>

                {/* ── Cards: Destinatario y Gestor ── */}
                {(currentVenta.destinatario || currentVenta.gestor) && (
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
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="h-4 w-4 text-blue-600" />
                                            <span className="text-muted-foreground text-xs font-medium">Monto:</span>
                                        </div>
                                        <Badge variant="secondary" className="font-bold">
                                            {currentVenta.gestor.monto || 0} {currentVenta.gestor.moneda?.simbolo || ''}
                                        </Badge>
                                    </div>
                                    {currentVenta.gestor.monto_usd && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4 text-green-600" />
                                                <span className="text-muted-foreground text-xs font-medium">Equivalente USD:</span>
                                            </div>
                                            <Badge variant="outline" className="font-bold text-green-600">
                                                {currentVenta.gestor.monto_usd} USD
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
                                    {currentVenta.gestor.tasa_aplicada_gestor && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                                <span className="text-muted-foreground text-xs font-medium">Tasa Gestor:</span>
                                            </div>
                                            <span className="text-sm font-medium">{currentVenta.gestor.tasa_aplicada_gestor}</span>
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
                                        <td className="px-4 py-2 font-medium">{formatCurrency(item.subtotal, simboloMonedaPrincipal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-sidebar-accent">
                                <tr>
                                    <td colSpan={userRole === 'vendedor' ? 7 : 9} className="px-4 py-3 text-right font-semibold text-white">
                                        Total Venta:
                                    </td>
                                    <td className="px-4 py-3 text-center text-lg font-semibold text-white">
                                        {formatCurrency(currentVenta.total, simboloMonedaPrincipal)}
                                    </td>
                                </tr>
                                {userRole !== 'vendedor' && (
                                    <tr className="bg-green-50 dark:bg-green-900/20">
                                        <td colSpan={9} className="px-4 py-3 text-right font-semibold text-green-800 dark:text-green-400">
                                            Ganancia Total:
                                        </td>
                                        <td className="px-4 py-3 text-center text-lg font-semibold text-green-800 dark:text-green-400">
                                            {formatCurrency(currentVenta.total_ganancia, simboloMonedaPrincipal)}
                                        </td>
                                    </tr>
                                )}
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* ── Pagos y resumen financiero ── */}
                <div
                    className={`animate__animated animate__flipInX grid auto-rows-min gap-6 ${userRole === 'vendedor' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}
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

                    {/* Resumen financiero (admin/moderador) */}
                    {(userRole === 'admin' || userRole === 'moderador') && (
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
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Ganancia Operacional:</span>
                                    <span className="font-semibold text-green-600">
                                        {formatCurrency(currentVenta.total_ganancia, simboloMonedaPrincipal)}
                                    </span>
                                </div>
                                {isVentaCompletada && (
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
                                <div className="mt-4 rounded-md bg-yellow-50 p-3">
                                    <p className="text-sm text-yellow-800">
                                        <strong>Venta Pendiente:</strong> Esta venta requiere aprobación para afectar stock y cuentas.
                                        {!currentVenta.destinatario ? (
                                            <span className="mt-1 block font-semibold">
                                                ❌ Para aprobar, primero debe registrar la información del receptor.
                                            </span>
                                        ) : (
                                            <span className="mt-1 block font-semibold text-green-600">
                                                ✅ Receptor registrado. Ya puede aprobar la venta.
                                            </span>
                                        )}
                                    </p>
                                </div>
                            )}

                            {isVentaCancelada && (
                                <div className="mt-4 rounded-md bg-red-50 p-3">
                                    <p className="text-sm text-red-800">
                                        <strong>Venta Anulada:</strong> Esta venta fue cancelada.
                                        {isVentaCompletada && ' Stock y saldos de cuentas fueron revertidos.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
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
            <ScrollProgress />
        </AppLayout>
    );
}
