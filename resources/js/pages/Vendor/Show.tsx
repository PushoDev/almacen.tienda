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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollProgress } from '@/components/ui/scroll';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
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

// Rutas breadcrumb
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Productos',
        href: '/listado-productos',
    },
    {
        title: 'Ventas',
        href: '/punto-venta',
    },
    {
        title: 'Detalle de Venta',
        href: '#',
    },
];

// Interfaces actualizadas según el controlador
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

// Cliente destino para pagos
interface ClienteDestino {
    id: number;
    nombre: string;
}

// Cuenta para Gestor
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
    cuenta: CuentaPago | null; // Cambiado a nullable
    referencia?: string | null;
    cliente_destino?: ClienteDestino | null; // Agregado opcional
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

// Nueva interfaz para el destinatario
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
    } | null;
}

interface Props {
    venta: Venta;
    userRole: 'admin' | 'moderador' | 'vendedor';
}

export default function ResultadoCarrito({ venta, userRole }: Props) {
    // ========================================================================
    // CONSOLE.LOG 1: DATOS QUE LLEGAN DEL BACKEND AL CARGAR LA PÁGINA
    // ========================================================================
    console.log('📦 DATOS DE VENTA RECIBIDOS DEL BACKEND:', {
        venta,
        destinatario: venta.destinatario,
        gestor: venta.gestor,
        todos_los_campos_venta: Object.keys(venta),
        campos_gestor: venta.gestor ? Object.keys(venta.gestor) : 'NO HAY GESTOR',
        campos_destinatario: venta.destinatario ? Object.keys(venta.destinatario) : 'NO HAY DESTINATARIO',
    });
    console.log('=====================================');
    console.log('🔍 ANÁLISIS INICIAL DE DATOS:');
    console.log('  • ¿venta.destinatario existe?', !!venta.destinatario);
    console.log('  • ¿venta.gestor existe?', !!venta.gestor);
    console.log('  • ¿Ambos existen?', !!venta.destinatario && !!venta.gestor);
    console.log('  • ¿Solo destinatario existe?', !!venta.destinatario && !venta.gestor);
    console.log('  • ¿Solo gestor existe?', !venta.destinatario && !!venta.gestor);
    console.log('=====================================');

    // Estados para gestionar las acciones
    const [isCancelling, setIsCancelling] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isSavingDestinatario, setIsSavingDestinatario] = useState(false);
    const [currentVenta, setCurrentVenta] = useState<Venta>(venta);
    const [isDestinatarioDialogOpen, setIsDestinatarioDialogOpen] = useState(false);
    const [isEditingDestinatario, setIsEditingDestinatario] = useState(false);
    const [activeTab, setActiveTab] = useState<'receptor' | 'gestor'>('receptor');
    const [monedaReporteSeleccionada, setMonedaReporteSeleccionada] = useState<string>(() =>
        String(currentVenta.moneda_principal?.id ?? currentVenta.monedas_para_reporte?.[0]?.id ?? ''),
    );

    // Estado para el formulario del destinatario
    const [formDestinatario, setFormDestinatario] = useState({
        nombre: '',
        apellidos: '',
        carnet_identidad: '',
        direccion_residencia: '',
        telefono_contacto: '',
        parentesco_cliente: '',
        observaciones: '',
    });

    // Estados para el Gestor
    const [esVentaGestor, setEsVentaGestor] = useState<boolean>(false);
    const [gestorMonto, setGestorMonto] = useState<string>('');
    const [gestorCuentaId, setGestorCuentaId] = useState<string>('');
    const [gestorComentario, setGestorComentario] = useState<string>('');
    const [cuentasGestor, setCuentasGestor] = useState<Cuenta[]>([]);
    const [cuentaGestorSeleccionada, setCuentaGestorSeleccionada] = useState<Cuenta | null>(null);
    const [tasaAplicadaVenta, setTasaAplicadaVenta] = useState<string>('');

    // Cargar cuentas para gestor
    useEffect(() => {
        const cargarCuentasGestor = async () => {
            try {
                const response = await axios.get(route('ventas.getCuentasParaGestor'));
                setCuentasGestor(response.data);
            } catch (error) {
                console.error('Error al cargar cuentas para gestor:', error);
            }
        };
        cargarCuentasGestor();
    }, []);

    // Cargar datos del gestor existentes
    useEffect(() => {
        // ====================================================================
        // CONSOLE.LOG 5: USEFFECT - CARGANDO DATOS DEL GESTOR
        // ====================================================================
        console.log('🔄 USEFFECT - Cargando datos del gestor:', {
            ventaGestor: currentVenta.gestor,
            cuentasGestorDisponibles: cuentasGestor.length,
            gestorMontoSet: gestorMonto,
            gestorCuentaIdSet: gestorCuentaId,
            hayDatosGestor: !!currentVenta.gestor,
        });
        
        if (currentVenta.gestor) {
            setEsVentaGestor(true);
            setGestorMonto(String(currentVenta.gestor.monto || ''));
            console.log('  ✅ Gestor encontrado, configurando estados:', {
                monto: currentVenta.gestor.monto,
                cuenta_id: currentVenta.gestor.cuenta_id,
            });
            // La cuenta se cargará cuando estén disponibles las cuentas
        } else {
            console.log('  ❌ No hay datos de gestor en la venta');
        }
    }, [currentVenta.gestor, cuentasGestor]);

    // Cargar datos del destinatario existente cuando se abre el diálogo
    useEffect(() => {
        if (isDestinatarioDialogOpen && currentVenta.destinatario && isEditingDestinatario) {
            console.log('📝 CARGANDO DATOS DEL DESTINATARIO EXISTENTE PARA EDICIÓN');
            console.log('=====================================');
            console.log('  • isDestinatarioDialogOpen:', isDestinatarioDialogOpen);
            console.log('  • isEditingDestinatario:', isEditingDestinatario);
            console.log('  • currentVenta.destinatario:', currentVenta.destinatario);
            console.log('  • currentVenta.gestor:', currentVenta.gestor);
            console.log('  • ¿Hay gestor?', !!currentVenta.gestor);
            console.log('=====================================');
            
            // ==================================================================
            // CONSOLE.LOG 6: DATOS DEL DESTINATARIO AL EDITAR
            // ==================================================================
            console.log('👁️ USEFFECT EDITAR - Datos cargados:', {
                isDestinatarioDialogOpen,
                isEditingDestinatario,
                destinatarioExiste: !!currentVenta.destinatario,
                destinatarioData: currentVenta.destinatario,
                gestorData: currentVenta.gestor,
                formularioSeLlenaraCon: {
                    nombre: currentVenta.destinatario.nombre,
                    apellidos: currentVenta.destinatario.apellidos,
                    carnet_identidad: currentVenta.destinatario.carnet_identidad,
                }
            });

            // Cargar datos del destinatario
            setFormDestinatario({
                nombre: currentVenta.destinatario.nombre,
                apellidos: currentVenta.destinatario.apellidos,
                carnet_identidad: currentVenta.destinatario.carnet_identidad,
                direccion_residencia: currentVenta.destinatario.direccion_residencia,
                telefono_contacto: currentVenta.destinatario.telefono_contacto || '',
                parentesco_cliente: currentVenta.destinatario.parentesco_cliente || '',
                observaciones: currentVenta.destinatario.observaciones || '',
            });

            // Cargar datos del gestor si existen
            if (currentVenta.gestor) {
                console.log('  📦 CARGANDO DATOS DEL GESTOR:', currentVenta.gestor);
                console.log('  • monto:', currentVenta.gestor.monto);
                console.log('  • cuenta_id:', currentVenta.gestor.cuenta_id);
                console.log('  • comentario:', currentVenta.gestor.comentario);
                console.log('  • tasa_aplicada:', currentVenta.gestor.tasa_aplicada);
                
                setEsVentaGestor(true);
                setGestorMonto(String(currentVenta.gestor.monto || ''));
                setGestorCuentaId(String(currentVenta.gestor.cuenta_id || ''));
                setGestorComentario(currentVenta.gestor.comentario || '');
                setTasaAplicadaVenta(currentVenta.gestor.tasa_aplicada ? String(currentVenta.gestor.tasa_aplicada) : '');
                setActiveTab('gestor'); // Cambiar automáticamente al tab del gestor si hay datos

                // Buscar la cuenta en la lista de cuentas disponibles
                if (currentVenta.gestor.cuenta_id && cuentasGestor.length > 0) {
                    const cuentaEncontrada = cuentasGestor.find(c => String(c.id) === String(currentVenta.gestor.cuenta_id));
                    if (cuentaEncontrada) {
                        setCuentaGestorSeleccionada(cuentaEncontrada);
                        console.log('  ✅ CUENTA DEL GESTOR ENCONTRADA:', cuentaEncontrada);
                    } else {
                        console.log('  ⚠️ CUENTA DEL GESTOR NO ENCONTRADA EN LA LISTA:', currentVenta.gestor.cuenta_id);
                        console.log('  • Lista de cuentas disponibles:', cuentasGestor);
                    }
                }
            }
        } else if (isDestinatarioDialogOpen && !isEditingDestinatario) {
            console.log('🧹 LIMPIANDO FORMULARIO PARA NUEVO DESTINATARIO');
            console.log('=====================================');
            console.log('  • isDestinatarioDialogOpen:', isDestinatarioDialogOpen);
            console.log('  • isEditingDestinatario:', isEditingDestinatario);
            console.log('  • Limpiando formDestinatario y estados del gestor');
            console.log('  • activeTab se mantiene en:', activeTab);
            console.log('=====================================');
            // Limpiar formulario para nuevo destinatario
            setFormDestinatario({
                nombre: '',
                apellidos: '',
                carnet_identidad: '',
                direccion_residencia: '',
                telefono_contacto: '',
                parentesco_cliente: '',
                observaciones: '',
            });
            // Limpiar datos del gestor para nuevo destinatario
            setEsVentaGestor(false);
            setGestorMonto('');
            setGestorCuentaId('');
            setGestorComentario('');
            setTasaAplicadaVenta('');
            setCuentaGestorSeleccionada(null);
        }
    }, [isDestinatarioDialogOpen, currentVenta.destinatario, isEditingDestinatario, currentVenta.gestor, cuentasGestor]);

    // Formatear fechas
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Formatear moneda mejorado
    const formatCurrency = (amount: number, currencyCode: string = 'USD') => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 2,
        }).format(amount);
    };

    // Obtener símbolo de moneda
    const getCurrencySymbol = (moneda: MonedaPago | MonedaPrincipal | null) => {
        return moneda?.simbolo || moneda?.codigo || 'USD';
    };

    // Monedas para el reporte (con tasas de la operación)
    const monedasReporte = currentVenta.monedas_para_reporte ?? [];
    const monedaReporte = monedasReporte.find((m) => String(m.id) === monedaReporteSeleccionada) ?? monedasReporte[0];
    const tasaReporte = monedaReporte?.tasa ?? 1;
    const codigoReporte = monedaReporte?.codigo || 'USD';

    const convertirMontoReporte = (monto: number) => monto * tasaReporte;

    // Determinar estados
    const isVentaPendiente = currentVenta.estado === 'pendiente';
    const isVentaCompletada = currentVenta.estado === 'completada';
    const isVentaCancelada = currentVenta.estado === 'cancelada';

    // Verificar si puede aprobar (requiere destinatario)
    const puedeAprobar = isVentaPendiente && currentVenta.destinatario !== null;

    // Obtener color y texto del estado
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

    // FUNCIÓN CORREGIDA: Guardar información del destinatario
    const handleGuardarDestinatario = async () => {
        console.log('📦 GUARDANDO - INICIO');
        console.log('=====================================');
        console.log('📋 ESTADO ACTUAL:');
        console.log('  • currentVenta.destinatario existe:', !!currentVenta.destinatario);
        console.log('  • esVentaGestor:', esVentaGestor);
        console.log('  • gestorMonto:', gestorMonto);
        console.log('  • gestorCuentaId:', gestorCuentaId);
        console.log('  • formDestinatario:', formDestinatario);
        console.log('=====================================');
        
        // ====================================================================
        // ✅ VALIDACIÓN 1: Verificar que el destinatario esté completo
        // ====================================================================
        if (!formDestinatario.nombre?.trim() || !formDestinatario.apellidos?.trim()) {
            console.log('❌ VALIDACIÓN FALLIDA: Faltan nombre o apellidos');
            toast.error('❌ Complete el nombre y apellidos del destinatario');
            setActiveTab('receptor');
            return;
        }

        // ====================================================================
        // ✅ VALIDACIÓN 2: Si el gestor está activo, validar sus campos
        // ====================================================================
        if (esVentaGestor) {
            console.log('🔍 VALIDANDO DATOS DEL GESTOR...');
            
            if (!gestorCuentaId) {
                console.log('❌ VALIDACIÓN FALLIDA: No se seleccionó cuenta');
                toast.error('❌ Seleccione una cuenta para el gestor');
                setActiveTab('gestor');
                return;
            }
            
            if (!gestorMonto || parseFloat(gestorMonto) <= 0) {
                console.log('❌ VALIDACIÓN FALLIDA: Monto inválido');
                toast.error('❌ Ingrese el monto de la comisión');
                setActiveTab('gestor');
                return;
            }
            
            console.log('✅ VALIDACIÓN DEL GESTOR EXITOSA');
        }
        
        console.log('✅ TODAS LAS VALIDACIONES PASARON');
        
        setIsSavingDestinatario(true);

        try {
            const url = route('ventas.destinatario.store', currentVenta.id);
            console.log('🌐 URL:', url);

            // Si el destinatario YA existe, solo actualizar gestor
            if (currentVenta.destinatario && esVentaGestor) {
                console.log('📝 ACTUALIZANDO SOLO GESTOR (destinatario ya existe)');
            } else {
                console.log('💾 GUARDANDO DESTINATARIO + GESTOR');
            }

            const payload = {
                ...formDestinatario,
                es_venta_gestor: esVentaGestor,
                gestor_monto: esVentaGestor ? parseFloat(gestorMonto) || 0 : 0,
                gestor_cuenta_id: esVentaGestor ? gestorCuentaId : null,
                gestor_comentario: esVentaGestor ? gestorComentario : null,
                tasa_aplicada_venta: esVentaGestor && tasaAplicadaVenta ? parseFloat(tasaAplicadaVenta) : null,
            };
            
            console.log('📦 PAYLOAD:', JSON.stringify(payload, null, 2));

            const response = await axios.post(url, payload);
            
            // ==================================================================
            // CONSOLE.LOG 3: DESPUÉS DE RECIBIR RESPUESTA DEL BACKEND
            // ==================================================================
            console.log('📥 RESPUESTA DEL BACKEND:', {
                success: response.data.success,
                message: response.data.message,
                destinatario: response.data.destinatario,
                gestor: response.data.gestor,
                respuesta_completa: response.data,
            });
            console.log('=====================================');
            console.log('🔍 ANÁLISIS DE LA RESPUESTA:');
            console.log('  • ¿success?:', response.data.success);
            console.log('  • destinatario devuelto:', response.data.destinatario);
            console.log('  • gestor devuelto:', response.data.gestor);
            console.log('  • ¿gestor es null?', response.data.gestor === null);
            console.log('  • ¿destinatario es null?', response.data.destinatario === null);
            console.log('=====================================');

            if (response.data.success) {
                // Mensaje personalizado según qué se guardó
                let message = response.data.message;
                
                if (!message) {
                    if (response.data.destinatario && response.data.gestor) {
                        message = '✅ Destinatario y Gestor guardados correctamente';
                    } else if (response.data.destinatario) {
                        message = isEditingDestinatario
                            ? 'Información del receptor actualizada correctamente'
                            : 'Información del receptor guardada correctamente';
                    } else if (response.data.gestor) {
                        message = 'Información del gestor guardada correctamente';
                    }
                }

                toast.success(message);

                console.log('🔄 ACTUALIZANDO currentVenta CON:');
                console.log('  • destinatario:', response.data.destinatario);
                console.log('  • gestor:', response.data.gestor);
                
                // Actualizar el estado local con el nuevo destinatario
                setCurrentVenta((prev) => ({
                    ...prev,
                    destinatario: response.data.destinatario,
                    gestor: response.data.gestor,
                }));

                setIsDestinatarioDialogOpen(false);
                setIsEditingDestinatario(false);

                // Limpiar el formulario
                setFormDestinatario({
                    nombre: '',
                    apellidos: '',
                    carnet_identidad: '',
                    direccion_residencia: '',
                    telefono_contacto: '',
                    parentesco_cliente: '',
                    observaciones: '',
                });

                // Limpiar estados del gestor
                setEsVentaGestor(false);
                setGestorMonto('');
                setGestorCuentaId('');
                setGestorComentario('');
                setCuentaGestorSeleccionada(null);
                setTasaAplicadaVenta('');

                console.log('🎉 Destinatario guardado/actualizado exitosamente');
                console.log('=====================================');
                console.log('✅ RESUMEN DEL GUARDADO:');
                console.log('  • ¿Se guardó destinatario?', !!response.data.destinatario);
                console.log('  • ¿Se guardó gestor?', !!response.data.gestor);
                console.log('  • ¿Ambos se guardaron?', !!response.data.destinatario && !!response.data.gestor);
                console.log('=====================================');
                
                console.log('🔍 VERIFICANDO currentVenta DESPUÉS DE ACTUALIZAR:');
                console.log('  • currentVenta.destinatario:', response.data.destinatario);
                console.log('  • currentVenta.gestor:', response.data.gestor);
                console.log('  • ¿destinatario existe?', !!response.data.destinatario);
                console.log('  • ¿gestor existe?', !!response.data.gestor);
                console.log('=====================================');
            } else {
                toast.error(response.data.message || 'Error al guardar la información');
            }
        } catch (error: unknown) {
            console.error('💥 Error completo al guardar destinatario:', error);

            if (axios.isAxiosError(error)) {
                console.error('📋 Detalles del error del servidor:', {
                    status: error.response?.status,
                    data: error.response?.data,
                    headers: error.response?.headers,
                });

                const errorMessage =
                    error.response?.data?.message || error.response?.data?.error || `Error ${error.response?.status}: ${error.response?.statusText}`;
                toast.error(errorMessage);
            } else if (error instanceof Error) {
                console.error('⚙️ Error de configuración:', error.message);
                toast.error('Error al configurar la petición');
            } else {
                toast.error('Error de conexión: No se pudo contactar al servidor');
            }
        } finally {
            setIsSavingDestinatario(false);
        }
    };

    // FUNCIÓN: Abrir diálogo para editar destinatario
    const handleEditarDestinatario = () => {
        // ====================================================================
        // CONSOLE.LOG 4: CLICK EN EDITAR - DEPURACIÓN
        // ====================================================================
        console.log('✏️ CLICK EN EDITAR - Estados antes:', {
            isDestinatarioDialogOpen,
            isEditingDestinatario,
            destinatarioExiste: !!currentVenta.destinatario,
            gestorExiste: !!currentVenta.gestor,
            formDestinatarioActual: formDestinatario,
            activeTabActual: activeTab,
        });
        console.log('🔴 CAMBIANDO ESTADOS:');
        console.log('  - isEditingDestinatario: false → true');
        console.log('  - isDestinatarioDialogOpen: false → true');

        console.log('✏️ Abriendo editor de destinatario');
        setIsEditingDestinatario(true);
        setIsDestinatarioDialogOpen(true);

        console.log('🟢 ESTADOS DESPUÉS DEL CAMBIO:');
        console.log('  - isEditingDestinatario:', true);
        console.log('  - isDestinatarioDialogOpen:', true);
    };

    // FUNCIÓN: Abrir diálogo para nuevo destinatario
    const handleNuevoDestinatario = () => {
        console.log('➕ ABRIENDO DIÁLOGO PARA NUEVO DESTINATARIO');
        console.log('=====================================');
        console.log('📋 ESTADO ACTUAL ANTES DE ABRIR:');
        console.log('  • currentVenta.destinatario:', currentVenta.destinatario);
        console.log('  • currentVenta.gestor:', currentVenta.gestor);
        console.log('  • activeTab:', activeTab);
        console.log('=====================================');
        console.log('➕ Abriendo formulario para nuevo destinatario');
        setIsEditingDestinatario(false);
        setIsDestinatarioDialogOpen(true);
    };

    // FUNCIÓN: Manejar la aprobación de la venta
    const handleAprobarVenta = async () => {
        console.log('🔄 Iniciando aprobación de venta:', currentVenta.id);
        setIsApproving(true);
        try {
            const url = route('ventas.aprobar', currentVenta.id);
            console.log('🌐 URL de aprobación:', url);

            const response = await axios.post(url);
            console.log('✅ Respuesta del backend al aprobar:', response.data);

            if (response.data.success) {
                toast.success(response.data.message || 'Venta aprobada correctamente');

                // Actualizar el estado local de la venta
                setCurrentVenta((prev) => ({
                    ...prev,
                    estado: 'completada',
                }));

                console.log('🎉 Venta aprobada exitosamente');

                // Recargar la página para mostrar el nuevo estado
                setTimeout(() => {
                    router.reload();
                }, 1500);
            } else {
                console.error('❌ Error en respuesta del backend:', response.data);
                toast.error(response.data.message || 'Error al aprobar la venta');
            }
        } catch (error: unknown) {
            console.error('💥 Error completo al aprobar venta:', error);

            if (axios.isAxiosError(error)) {
                console.error('📋 Detalles del error del servidor:', error.response?.data);
                const errorMessage =
                    error.response?.data?.message || error.response?.data?.error || `Error ${error.response?.status}: ${error.response?.statusText}`;
                toast.error(errorMessage);
            } else if (error instanceof Error) {
                console.error('⚙️ Error de configuración:', error.message);
                toast.error('Error al configurar la petición');
            } else {
                toast.error('Error de conexión: No se pudo contactar al servidor');
            }
        } finally {
            setIsApproving(false);
        }
    };

    // FUNCIÓN: Manejar la anulación de la venta
    const handleAnularVenta = async () => {
        console.log('🔄 Iniciando anulación de venta:', currentVenta.id);
        setIsCancelling(true);
        try {
            const url = route('ventas.anular', currentVenta.id);
            console.log('🌐 URL de anulación:', url);

            const response = await axios.post(url);
            console.log('✅ Respuesta del backend al anular:', response.data);

            if (response.data.success) {
                toast.success(response.data.message || 'Venta anulada correctamente');

                // Actualizar el estado local de la venta
                setCurrentVenta((prev) => ({
                    ...prev,
                    estado: 'cancelada',
                }));

                console.log('🗑️ Venta anulada exitosamente');

                // Recargar la página para mostrar el nuevo estado
                setTimeout(() => {
                    router.reload();
                }, 1500);
            } else {
                console.error('❌ Error en respuesta del backend:', response.data);
                toast.error(response.data.message || 'Error al anular la venta');
            }
        } catch (error: unknown) {
            console.error('💥 Error completo al anular venta:', error);

            if (axios.isAxiosError(error)) {
                console.error('📋 Detalles del error:', error.response?.data);
                const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Ocurrió un error al intentar anular la venta.';
                toast.error(errorMessage);
            } else if (error instanceof Error) {
                console.error('⚙️ Error de configuración:', error.message);
                toast.error('Error al configurar la petición');
            } else {
                toast.error('Error de conexión: No se pudo contactar al servidor');
            }
        } finally {
            setIsCancelling(false);
        }
    };

    // Obtener moneda principal
    const monedaPrincipal = currentVenta.moneda_principal;
    const simboloMonedaPrincipal = getCurrencySymbol(monedaPrincipal);

    console.log('🎯 Moneda principal:', monedaPrincipal);
    console.log('📊 Pagos recibidos:', currentVenta.pagos);
    console.log('👤 Destinatario actual:', currentVenta.destinatario);
    console.log('🚦 Estado de la venta:', currentVenta.estado);
    console.log('✅ Puede aprobar:', puedeAprobar);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Detalle de Venta #${currentVenta.id}`} />

            {/* Contenedor principal */}
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title={`Detalle de Venta #${currentVenta.id}`} description="Resumen completo de la venta procesada" />

                    {/* Indicador de estado de la venta */}
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

                {/* Resumen de Ganancias - NUEVO */}
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

                {/* Botones de acción */}
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

                    {/* Botón para agregar destinatario (solo cuando NO hay destinatario) */}
                    {isVentaPendiente && !currentVenta.destinatario && (
                        <Button
                            variant="outline"
                            className="flex cursor-pointer items-center gap-2"
                            onClick={handleNuevoDestinatario}
                        >
                            <Users size={16} />
                            Agregar Receptor
                        </Button>
                    )}

                    {/* AlertDialog para agregar/editar destinatario - SIEMPRE PRESENTE */}
                    <AlertDialog open={isDestinatarioDialogOpen} onOpenChange={setIsDestinatarioDialogOpen}>
                        {/* Trigger invisible - los botones reales están arriba */}
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
                                        ? 'Actualice los datos de la persona que recibirá el producto en casa.'
                                        : 'Complete los datos de la persona que recibirá el producto en casa.'}
                                </AlertDialogDescription>
                                {/* Mensaje de ayuda cuando el gestor está activo */}
                                {esVentaGestor && (
                                    <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                                        <div className="flex items-start gap-2">
                                            <DollarSign className="h-4 w-4 text-blue-600 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-blue-900">
                                                    📦 Venta con Gestor activada
                                                </p>
                                                <p className="text-xs text-blue-700 mt-1">
                                                    Al guardar, se guardarán tanto los datos del destinatario como los del gestor.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </AlertDialogHeader>

                            {/* NUEVO: Tabs para separar Receptor y Gestor */}
                            <Tabs value={activeTab} onValueChange={async (v) => {
                                console.log('🔄 CAMBIANDO TAB ACTIVO:', activeTab, '→', v);
                                
                                // Si está cambiando al tab de Gestor
                                if (v === 'gestor') {
                                    // Verificar si hay datos del destinatario
                                    if (!formDestinatario.nombre?.trim() || !formDestinatario.apellidos?.trim()) {
                                        toast.warning('⚠️ Primero complete el nombre y apellidos del destinatario');
                                        setActiveTab('receptor');
                                        return;
                                    }
                                    
                                    // AUTO-GUARDAR DESTINATARIO PRIMERO
                                    console.log('💾 AUTO-GUARDANDO DESTINATARIO ANTES DE CAMBIAR A GESTOR...');
                                    
                                    try {
                                        const payload = {
                                            ...formDestinatario,
                                            es_venta_gestor: false,
                                            gestor_monto: 0,
                                            gestor_cuenta_id: null,
                                            gestor_comentario: null,
                                            tasa_aplicada_venta: null,
                                        };
                                        
                                        const url = route('ventas.destinatario.store', currentVenta.id);
                                        const response = await axios.post(url, payload);
                                        
                                        if (response.data.success) {
                                            console.log('✅ Destinatario auto-guardado exitosamente');
                                            console.log('📥 RESPUESTA:', response.data);
                                            
                                            // Recargar la página para actualizar currentVenta
                                            setCurrentVenta((prev) => ({
                                                ...prev,
                                                destinatario: response.data.destinatario,
                                            }));
                                            
                                            toast.success('✅ Destinatario guardado. Ahora llene los datos del gestor.');
                                            
                                            // Esperar un poco y cambiar al tab
                                            setTimeout(() => {
                                                setActiveTab('gestor');
                                            }, 500);
                                        } else {
                                            toast.error('Error al guardar destinatario: ' + response.data.message);
                                        }
                                    } catch (error: any) {
                                        console.error('❌ Error al auto-guardar destinatario:', error);
                                        const errorMsg = error?.response?.data?.message || 'Error al guardar destinatario';
                                        toast.error(errorMsg);
                                    }
                                } else {
                                    // Cambio normal a receptor
                                    setActiveTab('receptor');
                                }
                            }} className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="receptor" className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        Receptor
                                    </TabsTrigger>
                                    <TabsTrigger value="gestor" className="flex items-center gap-2">
                                        <DollarSign className="h-4 w-4" />
                                        Gestor
                                        {/* Indicador visual si el gestor está activo pero incompleto */}
                                        {esVentaGestor && !gestorCuentaId && (
                                            <Badge variant="destructive" className="h-5 w-5 p-0 text-xs ml-1">!</Badge>
                                        )}
                                        {/* Indicador visual si el gestor está completo */}
                                        {esVentaGestor && gestorCuentaId && gestorMonto && parseFloat(gestorMonto) > 0 && (
                                            <Badge variant="default" className="h-5 w-5 p-0 text-xs ml-1 bg-green-600">✓</Badge>
                                        )}
                                    </TabsTrigger>
                                </TabsList>

                                {/* TAB 1: RECEPTOR */}
                                <TabsContent value="receptor" className="mt-4">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="nombre">Nombre *</Label>
                                            <Input
                                                id="nombre"
                                                value={formDestinatario.nombre}
                                                onChange={(e) => {
                                                    console.log('📝 ESCRIBIENDO EN NOMBRE:', e.target.value);
                                                    setFormDestinatario((prev) => ({ ...prev, nombre: e.target.value }));
                                                }}
                                                placeholder="Ingrese el nombre"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="apellidos">Apellidos *</Label>
                                            <Input
                                                id="apellidos"
                                                value={formDestinatario.apellidos}
                                                onChange={(e) => {
                                                    console.log('📝 ESCRIBIENDO EN APELLIDOS:', e.target.value);
                                                    setFormDestinatario((prev) => ({ ...prev, apellidos: e.target.value }));
                                                }}
                                                placeholder="Ingrese los apellidos"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="carnet_identidad">Carnet de Identidad</Label>
                                            <Input
                                                id="carnet_identidad"
                                                value={formDestinatario.carnet_identidad}
                                                onChange={(e) => {
                                                    console.log('📝 ESCRIBIENDO EN CARNET:', e.target.value);
                                                    setFormDestinatario((prev) => ({ ...prev, carnet_identidad: e.target.value }))
                                                }}
                                                placeholder="Número de carnet"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="telefono_contacto">Teléfono Contacto</Label>
                                            <Input
                                                id="telefono_contacto"
                                                value={formDestinatario.telefono_contacto}
                                                onChange={(e) => {
                                                    console.log('📝 ESCRIBIENDO EN TELÉFONO:', e.target.value);
                                                    setFormDestinatario((prev) => ({ ...prev, telefono_contacto: e.target.value }))
                                                }}
                                                placeholder="Número de teléfono"
                                            />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="direccion_residencia">Dirección de Residencia</Label>
                                            <Textarea
                                                id="direccion_residencia"
                                                value={formDestinatario.direccion_residencia}
                                                onChange={(e) => {
                                                    console.log('📝 ESCRIBIENDO EN DIRECCIÓN:', e.target.value);
                                                    setFormDestinatario((prev) => ({ ...prev, direccion_residencia: e.target.value }))
                                                }}
                                                placeholder="Dirección completa donde se entregará el producto"
                                                rows={3}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="parentesco_cliente">Parentesco con Cliente</Label>
                                            <Input
                                                id="parentesco_cliente"
                                                value={formDestinatario.parentesco_cliente}
                                                onChange={(e) => {
                                                    console.log('📝 ESCRIBIENDO EN PARENTESCO:', e.target.value);
                                                    setFormDestinatario((prev) => ({ ...prev, parentesco_cliente: e.target.value }))
                                                }}
                                                placeholder="Ej: Familiar, Amigo, etc."
                                            />
                                        </div>

                                        <div className="space-y-2 md:col-span-2">
                                            <Label htmlFor="observaciones">Observaciones</Label>
                                            <Textarea
                                                id="observaciones"
                                                value={formDestinatario.observaciones}
                                                onChange={(e) => {
                                                    console.log('📝 ESCRIBIENDO EN OBSERVACIONES:', e.target.value);
                                                    setFormDestinatario((prev) => ({ ...prev, observaciones: e.target.value }))
                                                }}
                                                placeholder="Observaciones adicionales"
                                                rows={2}
                                            />
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* TAB 2: GESTOR */}
                                <TabsContent value="gestor" className="mt-4">
                                    <div className="space-y-4">
                                        {/* Switch Venta con Gestor */}
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
                                                        console.log('🔘 SWITCH GESTOR CAMBIADO:', checked ? 'ACTIVADO' : 'DESACTIVADO');
                                                        setEsVentaGestor(checked);
                                                        if (!checked) {
                                                            setGestorCuentaId('');
                                                            setCuentaGestorSeleccionada(null);
                                                            setGestorMonto('');
                                                            setGestorComentario('');
                                                            setTasaAplicadaVenta('');
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {esVentaGestor && (
                                            <div className="space-y-4 rounded-lg border p-4">
                                                {/* Tasa Aplicada */}
                                                <div className="space-y-2">
                                                    <Label>Tasa Aplicada para Comisión</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.0001"
                                                        min="0.0001"
                                                        value={tasaAplicadaVenta}
                                                        onChange={(e) => {
                                                            console.log('📊 TASA APLICADA ESCRITA:', e.target.value);
                                                            setTasaAplicadaVenta(e.target.value)}
                                                        }
                                                        placeholder="Ej: 365"
                                                    />
                                                </div>

                                                <div className="grid gap-4 md:grid-cols-2">
                                                    {/* Cuenta del Gestor */}
                                                    <div className="space-y-2">
                                                        <Label>Cuenta del Gestor</Label>
                                                        <Select
                                                            value={gestorCuentaId}
                                                            onValueChange={(val) => {
                                                                console.log('🏦 CUENTA GESTOR SELECCIONADA:', val);
                                                                setGestorCuentaId(val);
                                                                const account = cuentasGestor.find((c) => String(c.id) === val);
                                                                setCuentaGestorSeleccionada(account || null);
                                                                console.log('  → Cuenta objeto:', account);
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

                                                    {/* Monto */}
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
                                                                onChange={(e) => {
                                                                    console.log('💰 MONTO GESTOR ESCRITO:', e.target.value);
                                                                    setGestorMonto(e.target.value)}
                                                                }
                                                                placeholder="0.00"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Comentario */}
                                                <div className="space-y-2">
                                                    <Label>Comentario</Label>
                                                    <Textarea
                                                        placeholder="Ej: Gestor externo, acuerdo 50/50..."
                                                        value={gestorComentario}
                                                        onChange={(e) => {
                                                            console.log('💬 COMENTARIO GESTOR ESCRITO:', e.target.value);
                                                            setGestorComentario(e.target.value)}
                                                        }
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
                                            <AlertDialogCancel
                                                disabled={isSavingDestinatario}
                                                onClick={() => {
                                                    setIsEditingDestinatario(false);
                                                    setActiveTab('receptor'); // Resetear al tab de receptor
                                                    setFormDestinatario({
                                                        nombre: '',
                                                        apellidos: '',
                                                        carnet_identidad: '',
                                                        direccion_residencia: '',
                                                        telefono_contacto: '',
                                                        parentesco_cliente: '',
                                                        observaciones: '',
                                                    });
                                                    // Limpiar estados del gestor
                                                    setEsVentaGestor(false);
                                                    setGestorMonto('');
                                                    setGestorCuentaId('');
                                                    setGestorComentario('');
                                                    setTasaAplicadaVenta('');
                                                    setCuentaGestorSeleccionada(null);
                                                }}
                                            >
                                                Cancelar
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleGuardarDestinatario}
                                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                                disabled={isSavingDestinatario || !formDestinatario.nombre?.trim() || !formDestinatario.apellidos?.trim()}
                                            >
                                                {isSavingDestinatario ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
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

                    {/* Botón para exportar a PDF */}
                    <Button variant="outline" className="hover:bg-chart-5 flex cursor-pointer items-center gap-2">
                        <FileText size={16} />
                        Exportar PDF
                    </Button>

                    {/* Botón para imprimir reporte - Versión para cliente (formato de ticket) */}
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
                                    {/* Formato para impresora térmica - Ticket para el cliente */}
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
                                        <div className="mt-2 text-xs">
                                            <p>
                                                <span className="font-bold">Vendedor:</span> {currentVenta.usuario.nombre}
                                            </p>
                                        </div>
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

                    {/* Botón de Aprobar Venta (solo para ventas pendientes con destinatario) */}
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
                                        ¿Está seguro que desea aprobar la Venta <strong>#{currentVenta.id}</strong>?
                                        <br />
                                        <span className="font-semibold text-green-500">
                                            Esta acción:
                                            <br />• Descontará stock de los productos
                                            <br />• Actualizará saldos de cuentas bancarias
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
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
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

                    {/* Botón de Anular Venta (para ventas pendientes y completadas) */}
                    {(isVentaPendiente || isVentaCompletada) && (
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
                                        <strong>#{currentVenta.id}</strong>?
                                        <br />
                                        <span className="font-semibold text-red-500">
                                            {isVentaCompletada
                                                ? 'Se revertirá el stock de los productos y se deducirán los montos de las cuentas bancarias asociadas.'
                                                : 'Se cancelará la venta sin afectar stock ni cuentas (estado pendiente).'}
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
                                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
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

                {/* Sección de Información del Destinatario y Gestor - GRID */}
                {console.log('🖼️ RENDERIZANDO CARDS - Estado actual:', {
                    destinatarioExiste: !!currentVenta.destinatario,
                    gestorExiste: !!currentVenta.gestor,
                    destinatario: currentVenta.destinatario,
                    gestor: currentVenta.gestor,
                })}
                {(currentVenta.destinatario || currentVenta.gestor) && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Tarjeta de Destinatario */}
                        {currentVenta.destinatario && (
                            <div className="bg-card rounded-lg border border-sidebar-accent p-6 shadow-sm">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="flex items-center gap-2 text-base font-semibold">
                                        <Users className="h-5 w-5 text-green-600" />
                                        <span className="text-foreground">✅ Receptor Registrado</span>
                                    </h3>
                                    {isVentaPendiente && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                console.log('🔴 CLICK EN BOTÓN EDITAR');
                                                handleEditarDestinatario();
                                            }}
                                        >
                                            <Edit size={14} />
                                            <span className="ml-1">Editar</span>
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-2">
                                        <User className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-muted-foreground">Nombre Completo:</p>
                                            <p className="text-sm">
                                                {currentVenta.destinatario.nombre} {currentVenta.destinatario.apellidos}
                                            </p>
                                        </div>
                                    </div>

                                    {currentVenta.destinatario.carnet_identidad && (
                                        <div className="flex items-start gap-2">
                                            <IdCard className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-xs font-medium text-muted-foreground">Carnet de Identidad:</p>
                                                <p className="text-sm">{currentVenta.destinatario.carnet_identidad}</p>
                                            </div>
                                        </div>
                                    )}

                                    {currentVenta.destinatario.telefono_contacto && (
                                        <div className="flex items-start gap-2">
                                            <Phone className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-xs font-medium text-muted-foreground">Teléfono Contacto:</p>
                                                <p className="text-sm">{currentVenta.destinatario.telefono_contacto}</p>
                                            </div>
                                        </div>
                                    )}

                                    {currentVenta.destinatario.direccion_residencia && (
                                        <div className="flex items-start gap-2">
                                            <MapPin className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-xs font-medium text-muted-foreground">Dirección de Residencia:</p>
                                                <p className="text-sm">{currentVenta.destinatario.direccion_residencia}</p>
                                            </div>
                                        </div>
                                    )}

                                    {currentVenta.destinatario.parentesco_cliente && (
                                        <div className="flex items-start gap-2">
                                            <Users className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-xs font-medium text-muted-foreground">Parentesco:</p>
                                                <p className="text-sm">{currentVenta.destinatario.parentesco_cliente}</p>
                                            </div>
                                        </div>
                                    )}

                                    {currentVenta.destinatario.observaciones && (
                                        <div className="flex items-start gap-2">
                                            <FileText className="mt-0.5 h-4 w-4 text-green-600 shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-xs font-medium text-muted-foreground">Observaciones:</p>
                                                <p className="text-sm">{currentVenta.destinatario.observaciones}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tarjeta de Gestor */}
                        {currentVenta.gestor && (
                            <div className="bg-card rounded-lg border border-sidebar-accent p-6 shadow-sm">
                                <div className="mb-4 flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-blue-600" />
                                    <h3 className="text-base font-semibold text-foreground">💼 Gestor - Comisión</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <DollarSign className="h-4 w-4 text-blue-600" />
                                            <span className="text-xs font-medium text-muted-foreground">Monto:</span>
                                        </div>
                                        <Badge variant="secondary" className="font-bold">
                                            {currentVenta.gestor.monto || 0} {currentVenta.moneda_cobro?.simbolo || ''}
                                        </Badge>
                                    </div>

                                    {currentVenta.gestor.cuenta_nombre && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="h-4 w-4 text-blue-600" />
                                                <span className="text-xs font-medium text-muted-foreground">Cuenta:</span>
                                            </div>
                                            <span className="text-sm font-medium">{currentVenta.gestor.cuenta_nombre}</span>
                                        </div>
                                    )}

                                    {currentVenta.gestor.tasa_aplicada && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-blue-600" />
                                                <span className="text-xs font-medium text-muted-foreground">Tasa Aplicada:</span>
                                            </div>
                                            <span className="text-sm font-medium">{currentVenta.gestor.tasa_aplicada}</span>
                                        </div>
                                    )}

                                    {currentVenta.gestor.comentario && (
                                        <div className="rounded-md bg-muted p-3">
                                            <div className="flex items-start gap-2">
                                                <MessageSquare className="mt-0.5 h-4 w-4 text-blue-600 shrink-0" />
                                                <div className="flex-1">
                                                    <p className="text-xs font-medium text-muted-foreground">Comentario:</p>
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

                {/* Información general de la venta */}
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
                        <p className="mt-2 text-sm">{currentVenta.cliente ? currentVenta.cliente.nombre : 'Cliente no especificado'}</p>
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

                {/* Productos vendidos */}
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
                                {currentVenta.items.map((item, index) => {
                                    return (
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
                                                <td className="px-4 py-2 text-red-600">
                                                    {formatCurrency(item.costo_unitario, simboloMonedaPrincipal)}
                                                </td>
                                            )}
                                            {userRole !== 'vendedor' && (
                                                <td className="px-4 py-2 text-green-600">{formatCurrency(item.ganancia, simboloMonedaPrincipal)}</td>
                                            )}
                                            <td className="px-4 py-2 font-medium">{formatCurrency(item.subtotal, simboloMonedaPrincipal)}</td>
                                        </tr>
                                    );
                                })}
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

                {/* Información de pagos y resumen */}

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
                                console.log(`📄 Procesando pago ${index}:`, pago);
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

                    {/* Reporte de la Venta */}
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
                                {currentVenta.estado === 'completada' && (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Ganancia/Pérdida Cambiaria:</span>
                                            <span
                                                className={`font-semibold ${
                                                    currentVenta.ganancia_perdida_cambiaria < 0 ? 'text-red-500' : 'text-green-600'
                                                }`}
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

                            {/* Información adicional según estado */}
                            {isVentaPendiente && (
                                <div className="mt-4 rounded-md bg-yellow-50 p-3">
                                    <p className="text-sm text-yellow-800">
                                        <strong>Venta Pendiente:</strong> Esta venta requiere aprobación para afectar stock y cuentas.
                                        {!currentVenta.destinatario && (
                                            <span className="mt-1 block font-semibold">
                                                ❌ Para aprobar, primero debe registrar la información del receptor.
                                            </span>
                                        )}
                                        {currentVenta.destinatario && (
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

                {/* Información adicional para administradores */}
                {currentVenta.usuario.rol === 'admin' && (
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
