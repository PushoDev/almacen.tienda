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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
    Package,
    Phone,
    Printer,
    ShoppingBag,
    Store,
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
        href: '/productos',
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

interface Pago {
    metodo: string;
    moneda: MonedaPago | null;
    monto: number;
    via: string | null;
    tasa_cambio: number;
    monto_equivalente: number;
    cuenta: CuentaPago;
    referencia?: string | null;
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
}

interface Props {
    venta: Venta;
}

export default function ResultadoCarrito({ venta }: Props) {
    console.log('🔍 Venta recibida en el frontend:', venta);

    // Estados para gestionar las acciones
    const [isCancelling, setIsCancelling] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isSavingDestinatario, setIsSavingDestinatario] = useState(false);
    const [currentVenta, setCurrentVenta] = useState<Venta>(venta);
    const [isDestinatarioDialogOpen, setIsDestinatarioDialogOpen] = useState(false);
    const [isEditingDestinatario, setIsEditingDestinatario] = useState(false);

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

    // Cargar datos del destinatario existente cuando se abre el diálogo
    useEffect(() => {
        if (isDestinatarioDialogOpen && currentVenta.destinatario && isEditingDestinatario) {
            console.log('📝 Cargando datos del destinatario existente para edición:', currentVenta.destinatario);
            setFormDestinatario({
                nombre: currentVenta.destinatario.nombre,
                apellidos: currentVenta.destinatario.apellidos,
                carnet_identidad: currentVenta.destinatario.carnet_identidad,
                direccion_residencia: currentVenta.destinatario.direccion_residencia,
                telefono_contacto: currentVenta.destinatario.telefono_contacto || '',
                parentesco_cliente: currentVenta.destinatario.parentesco_cliente || '',
                observaciones: currentVenta.destinatario.observaciones || '',
            });
        } else if (isDestinatarioDialogOpen && !isEditingDestinatario) {
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
        }
    }, [isDestinatarioDialogOpen, currentVenta.destinatario, isEditingDestinatario]);

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
        console.log('📦 Guardando destinatario:', formDestinatario);
        console.log('🆔 ID de venta:', currentVenta.id);
        console.log('✏️ Modo edición:', isEditingDestinatario);

        setIsSavingDestinatario(true);

        try {
            // ✅ CORRECCIÓN: Usar la ruta correcta según Laravel
            const url = route('ventas.destinatario.store', currentVenta.id);
            console.log('🌐 URL de la petición:', url);

            const response = await axios.post(url, formDestinatario);
            console.log('✅ Respuesta del servidor:', response.data);

            if (response.data.success) {
                const message = isEditingDestinatario
                    ? 'Información del receptor actualizada correctamente'
                    : 'Información del receptor guardada correctamente';

                toast.success(response.data.message || message);

                // Actualizar el estado local con el nuevo destinatario
                setCurrentVenta((prev) => ({
                    ...prev,
                    destinatario: response.data.destinatario,
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

                console.log('🎉 Destinatario guardado/actualizado exitosamente');
            } else {
                toast.error(response.data.message || 'Error al guardar la información');
            }
        } catch (error: any) {
            console.error('💥 Error completo al guardar destinatario:', error);

            if (error.response) {
                console.error('📋 Detalles del error del servidor:', {
                    status: error.response.status,
                    data: error.response.data,
                    headers: error.response.headers,
                });

                const errorMessage =
                    error.response.data?.message || error.response.data?.error || `Error ${error.response.status}: ${error.response.statusText}`;
                toast.error(errorMessage);
            } else if (error.request) {
                console.error('🌐 Error de conexión - No se recibió respuesta:', error.request);
                toast.error('Error de conexión: No se pudo contactar al servidor');
            } else {
                console.error('⚙️ Error de configuración:', error.message);
                toast.error('Error al configurar la petición');
            }
        } finally {
            setIsSavingDestinatario(false);
        }
    };

    // FUNCIÓN: Abrir diálogo para editar destinatario
    const handleEditarDestinatario = () => {
        console.log('✏️ Abriendo editor de destinatario');
        setIsEditingDestinatario(true);
        setIsDestinatarioDialogOpen(true);
    };

    // FUNCIÓN: Abrir diálogo para nuevo destinatario
    const handleNuevoDestinatario = () => {
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
        } catch (error: any) {
            console.error('💥 Error completo al aprobar venta:', error);

            if (error.response) {
                console.error('📋 Detalles del error del servidor:', error.response.data);
                const errorMessage =
                    error.response.data?.message || error.response.data?.error || `Error ${error.response.status}: ${error.response.statusText}`;
                toast.error(errorMessage);
            } else if (error.request) {
                console.error('🌐 Error de conexión:', error.request);
                toast.error('Error de conexión: No se pudo contactar al servidor');
            } else {
                console.error('⚙️ Error de configuración:', error.message);
                toast.error('Error al configurar la petición');
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
        } catch (error: any) {
            console.error('💥 Error completo al anular venta:', error);

            if (error.response) {
                console.error('📋 Detalles del error:', error.response.data);
                const errorMessage = error.response.data?.message || error.response.data?.error || 'Ocurrió un error al intentar anular la venta.';
                toast.error(errorMessage);
            } else if (error.request) {
                console.error('🌐 Error de conexión:', error.request);
                toast.error('Error de conexión: No se pudo contactar al servidor');
            } else {
                console.error('⚙️ Error de configuración:', error.message);
                toast.error('Error al configurar la petición');
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

                    {/* Botón para agregar/editar destinatario (solo para ventas pendientes) */}
                    {isVentaPendiente && (
                        <>
                            {!currentVenta.destinatario ? (
                                <AlertDialog open={isDestinatarioDialogOpen} onOpenChange={setIsDestinatarioDialogOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="flex cursor-pointer items-center gap-2 border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                            onClick={handleNuevoDestinatario}
                                        >
                                            <Users size={16} />
                                            Agregar Receptor
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="max-w-2xl">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2 text-blue-600">
                                                <Users size={20} />
                                                Información del Receptor
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Complete los datos de la persona que recibirá el producto en casa.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="nombre">Nombre *</Label>
                                                <Input
                                                    id="nombre"
                                                    value={formDestinatario.nombre}
                                                    onChange={(e) => setFormDestinatario((prev) => ({ ...prev, nombre: e.target.value }))}
                                                    placeholder="Ingrese el nombre"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="apellidos">Apellidos *</Label>
                                                <Input
                                                    id="apellidos"
                                                    value={formDestinatario.apellidos}
                                                    onChange={(e) => setFormDestinatario((prev) => ({ ...prev, apellidos: e.target.value }))}
                                                    placeholder="Ingrese los apellidos"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="carnet_identidad">Carnet de Identidad *</Label>
                                                <Input
                                                    id="carnet_identidad"
                                                    value={formDestinatario.carnet_identidad}
                                                    onChange={(e) => setFormDestinatario((prev) => ({ ...prev, carnet_identidad: e.target.value }))}
                                                    placeholder="Número de carnet"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="telefono_contacto">Teléfono Contacto</Label>
                                                <Input
                                                    id="telefono_contacto"
                                                    value={formDestinatario.telefono_contacto}
                                                    onChange={(e) => setFormDestinatario((prev) => ({ ...prev, telefono_contacto: e.target.value }))}
                                                    placeholder="Número de teléfono"
                                                />
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="direccion_residencia">Dirección de Residencia *</Label>
                                                <Textarea
                                                    id="direccion_residencia"
                                                    value={formDestinatario.direccion_residencia}
                                                    onChange={(e) =>
                                                        setFormDestinatario((prev) => ({ ...prev, direccion_residencia: e.target.value }))
                                                    }
                                                    placeholder="Dirección completa donde se entregará el producto"
                                                    rows={3}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="parentesco_cliente">Parentesco con Cliente</Label>
                                                <Input
                                                    id="parentesco_cliente"
                                                    value={formDestinatario.parentesco_cliente}
                                                    onChange={(e) => setFormDestinatario((prev) => ({ ...prev, parentesco_cliente: e.target.value }))}
                                                    placeholder="Ej: Familiar, Amigo, etc."
                                                />
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <Label htmlFor="observaciones">Observaciones</Label>
                                                <Textarea
                                                    id="observaciones"
                                                    value={formDestinatario.observaciones}
                                                    onChange={(e) => setFormDestinatario((prev) => ({ ...prev, observaciones: e.target.value }))}
                                                    placeholder="Observaciones adicionales"
                                                    rows={2}
                                                />
                                            </div>
                                        </div>

                                        <AlertDialogFooter>
                                            <AlertDialogCancel
                                                disabled={isSavingDestinatario}
                                                onClick={() => {
                                                    setIsEditingDestinatario(false);
                                                    setFormDestinatario({
                                                        nombre: '',
                                                        apellidos: '',
                                                        carnet_identidad: '',
                                                        direccion_residencia: '',
                                                        telefono_contacto: '',
                                                        parentesco_cliente: '',
                                                        observaciones: '',
                                                    });
                                                }}
                                            >
                                                Cancelar
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleGuardarDestinatario}
                                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                                                disabled={
                                                    isSavingDestinatario ||
                                                    !formDestinatario.nombre ||
                                                    !formDestinatario.apellidos ||
                                                    !formDestinatario.carnet_identidad ||
                                                    !formDestinatario.direccion_residencia
                                                }
                                            >
                                                {isSavingDestinatario ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                                        Guardando...
                                                    </div>
                                                ) : (
                                                    'Guardar Receptor'
                                                )}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="flex cursor-pointer items-center gap-2 border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                                    onClick={handleEditarDestinatario}
                                >
                                    <Edit size={16} />
                                    Editar Receptor
                                </Button>
                            )}
                        </>
                    )}

                    {/* Botón para exportar a PDF */}
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="hover:bg-chart-5 flex cursor-pointer items-center gap-2">
                                <FileText size={16} />
                                Exportar PDF
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-3xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    <div className="flex items-center justify-center">
                                        <AppLogoIcon />
                                    </div>
                                </AlertDialogTitle>
                            </AlertDialogHeader>
                            <div className="max-h-[70vh] overflow-y-auto">
                                <div className="p-6">
                                    <div className="mb-6 text-center">
                                        <AppLogoIcon />
                                        <h1 className="mt-4 text-xl font-bold">REPORTE DE VENTA</h1>
                                        <p className="text-sm text-gray-600">Venta #: {currentVenta.id}</p>
                                        <p className="text-sm text-gray-600">Fecha: {formatDate(currentVenta.fecha)}</p>
                                    </div>

                                    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <h3 className="border-b pb-1 font-semibold">Almacén</h3>
                                            <p>{currentVenta.almacen.nombre}</p>
                                        </div>

                                        <div>
                                            <h3 className="border-b pb-1 font-semibold">Cliente</h3>
                                            <p>{currentVenta.cliente ? currentVenta.cliente.nombre : 'Cliente no especificado'}</p>
                                        </div>
                                    </div>

                                    {currentVenta.destinatario && (
                                        <div className="mb-6">
                                            <h3 className="border-b pb-1 font-semibold">Datos del Receptor</h3>
                                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                                <p>
                                                    <span className="font-medium">Nombre:</span> {currentVenta.destinatario.nombre}{' '}
                                                    {currentVenta.destinatario.apellidos}
                                                </p>
                                                <p>
                                                    <span className="font-medium">CI:</span> {currentVenta.destinatario.carnet_identidad}
                                                </p>
                                                <p>
                                                    <span className="font-medium">Teléfono:</span>{' '}
                                                    {currentVenta.destinatario.telefono_contacto || 'No especificado'}
                                                </p>
                                                <p>
                                                    <span className="font-medium">Dirección:</span>{' '}
                                                    {currentVenta.destinatario.direccion_residencia || 'No especificada'}
                                                </p>
                                                <p>
                                                    <span className="font-medium">Parentesco:</span>{' '}
                                                    {currentVenta.destinatario.parentesco_cliente || 'No especificado'}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-6">
                                        <h3 className="border-b pb-1 font-semibold">Productos Vendidos</h3>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead>
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                            Producto
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                            Cant
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                            Precio Unitario
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                            Costo Unitario
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                            Ganancia Unitaria
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                            Subtotal
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {currentVenta.items.map((item, index) => (
                                                        <tr key={index}>
                                                            <td className="px-4 py-2 text-sm">
                                                                {item.producto.nombre} - {item.producto.marca} ({item.producto.categoria})
                                                            </td>
                                                            <td className="px-4 py-2 text-sm">{item.cantidad}</td>
                                                            <td className="px-4 py-2 text-sm">
                                                                {formatCurrency(item.precio_venta, simboloMonedaPrincipal)}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm">
                                                                {formatCurrency(item.costo_unitario, simboloMonedaPrincipal)}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm">
                                                                {formatCurrency(item.ganancia, simboloMonedaPrincipal)}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm">
                                                                {formatCurrency(item.subtotal, simboloMonedaPrincipal)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="font-semibold">
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-2 text-right">
                                                            TOTAL:
                                                        </td>
                                                        <td className="px-4 py-2">{formatCurrency(currentVenta.total, simboloMonedaPrincipal)}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="border-b pb-1 font-semibold">Detalles de Pago</h3>
                                        {currentVenta.pagos.length > 0 ? (
                                            currentVenta.pagos.map((pago, index) => {
                                                const simboloMonedaPago = getCurrencySymbol(pago.moneda);
                                                return (
                                                    <div key={index} className="mb-2 rounded border p-3">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <p>
                                                                <span className="font-medium">Método:</span> {pago.metodo}
                                                            </p>
                                                            <p>
                                                                <span className="font-medium">Moneda:</span>{' '}
                                                                {pago.moneda?.nombre || 'No especificada'}
                                                            </p>
                                                            <p>
                                                                <span className="font-medium">Monto Original:</span>{' '}
                                                                {formatCurrency(pago.monto, simboloMonedaPago)}
                                                            </p>
                                                            <p>
                                                                <span className="font-medium">Equivalente USD:</span>{' '}
                                                                {formatCurrency(pago.monto_equivalente, 'USD')}
                                                            </p>
                                                            <p>
                                                                <span className="font-medium">Tasa Cambio:</span>{' '}
                                                                {Number(pago.tasa_cambio)?.toFixed(2) || '0.00'}
                                                            </p>
                                                            <p>
                                                                <span className="font-medium">Cuenta:</span> {pago.cuenta.nombre}
                                                            </p>
                                                            {pago.via && (
                                                                <p>
                                                                    <span className="font-medium">Vía:</span> {pago.via}
                                                                </p>
                                                            )}
                                                            {pago.referencia && (
                                                                <p>
                                                                    <span className="font-medium">Referencia:</span> {pago.referencia}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p>No hay pagos registrados</p>
                                        )}
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="border-b pb-1 font-semibold">Resumen Financiero</h3>
                                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                            <p>
                                                <span className="font-medium">Total de la Venta:</span>{' '}
                                                {formatCurrency(currentVenta.total, simboloMonedaPrincipal)}
                                            </p>
                                            <p>
                                                <span className="font-medium">Total Pagado:</span>{' '}
                                                {formatCurrency(currentVenta.total_pagado, simboloMonedaPrincipal)}
                                            </p>
                                            <p>
                                                <span className="font-medium">Restante por Pagar:</span>{' '}
                                                {formatCurrency(currentVenta.restante, simboloMonedaPrincipal)}
                                            </p>
                                            <p>
                                                <span className="font-medium">Ganancia Operacional:</span>{' '}
                                                {formatCurrency(currentVenta.total_ganancia, simboloMonedaPrincipal)}
                                            </p>
                                            <p>
                                                <span className="font-medium">Ganancia/Pérdida Cambiaria:</span>{' '}
                                                <span className={currentVenta.ganancia_perdida_cambiaria >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                    {formatCurrency(currentVenta.ganancia_perdida_cambiaria, simboloMonedaPrincipal)}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="font-medium">Ganancia Real Total:</span>{' '}
                                                <span className="font-bold text-blue-600">
                                                    {formatCurrency(currentVenta.ganancia_real_total, simboloMonedaPrincipal)}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="font-medium">Estado:</span> {currentVenta.estado}
                                            </p>
                                            <p>
                                                <span className="font-medium">Tasa Cambio Principal:</span> 1 {simboloMonedaPrincipal} ={' '}
                                                {Number(currentVenta.tasa_cambio_principal)?.toFixed(2) || '0.00'}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="border-b pb-1 font-semibold">Información del Vendedor</h3>
                                        <p>
                                            <span className="font-medium">Nombre:</span> {currentVenta.usuario.nombre}
                                        </p>
                                        <p>
                                            <span className="font-medium">Rol:</span> {currentVenta.usuario.rol}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <AlertDialogFooter>
                                <Button
                                    variant="secondary"
                                    onClick={async () => {
                                        try {
                                            // Importar jsPDF y jspdf-autotable
                                            const { jsPDF } = await import('jspdf');
                                            await import('jspdf-autotable');

                                            // Crear un nuevo documento PDF
                                            const doc = new jsPDF();

                                            // Agregar título
                                            doc.setFontSize(18);
                                            doc.text('REPORTE DE VENTA', 105, 20, null, null, 'center');

                                            // Agregar información básica
                                            doc.setFontSize(12);
                                            doc.text(`Venta #: ${currentVenta.id}`, 20, 40);
                                            doc.text(`Fecha: ${formatDate(currentVenta.fecha)}`, 20, 50);
                                            doc.text(`Almacén: ${currentVenta.almacen.nombre}`, 20, 60);
                                            doc.text(
                                                `Cliente: ${currentVenta.cliente ? currentVenta.cliente.nombre : 'Cliente no especificado'}`,
                                                20,
                                                70,
                                            );

                                            // Agregar información del destinatario si existe
                                            let startY = 80;
                                            if (currentVenta.destinatario) {
                                                doc.text('Datos del Receptor:', 20, startY);
                                                startY += 10;
                                                doc.text(
                                                    `Nombre: ${currentVenta.destinatario.nombre} ${currentVenta.destinatario.apellidos}`,
                                                    20,
                                                    startY,
                                                );
                                                startY += 10;
                                                doc.text(`CI: ${currentVenta.destinatario.carnet_identidad}`, 20, startY);
                                                startY += 10;
                                                if (currentVenta.destinatario.telefono_contacto) {
                                                    doc.text(`Teléfono: ${currentVenta.destinatario.telefono_contacto}`, 20, startY);
                                                    startY += 10;
                                                }
                                                if (currentVenta.destinatario.direccion_residencia) {
                                                    doc.text(`Dirección: ${currentVenta.destinatario.direccion_residencia}`, 20, startY);
                                                    startY += 10;
                                                }
                                                if (currentVenta.destinatario.parentesco_cliente) {
                                                    doc.text(`Parentesco: ${currentVenta.destinatario.parentesco_cliente}`, 20, startY);
                                                    startY += 10;
                                                }
                                                startY += 10;
                                            }

                                            // Agregar tabla de productos
                                            const productosData = currentVenta.items.map((item) => [
                                                `${item.producto.nombre} - ${item.producto.marca} (${item.producto.categoria})`,
                                                item.cantidad.toString(),
                                                formatCurrency(item.precio_venta, simboloMonedaPrincipal),
                                                formatCurrency(item.costo_unitario, simboloMonedaPrincipal),
                                                formatCurrency(item.ganancia, simboloMonedaPrincipal),
                                                formatCurrency(item.subtotal, simboloMonedaPrincipal),
                                            ]);

                                            // Configurar idioma español para la tabla
                                            (doc as any).autoTable({
                                                startY: startY,
                                                head: [['Producto', 'Cant', 'Precio Unitario', 'Costo Unitario', 'Ganancia Unitaria', 'Subtotal']],
                                                body: productosData,
                                                margin: { top: startY, right: 20, bottom: 20, left: 20 },
                                                styles: {
                                                    fontSize: 10,
                                                },
                                                headStyles: {
                                                    fillColor: [59, 130, 246], // bg-blue-500
                                                },
                                            });

                                            // Agregar resumen financiero
                                            const finalY = (doc as any).lastAutoTable.finalY || startY;
                                            doc.text(
                                                `Total de la Venta: ${formatCurrency(currentVenta.total, simboloMonedaPrincipal)}`,
                                                20,
                                                finalY + 20,
                                            );
                                            doc.text(
                                                `Total Pagado: ${formatCurrency(currentVenta.total_pagado, simboloMonedaPrincipal)}`,
                                                20,
                                                finalY + 30,
                                            );
                                            doc.text(
                                                `Restante por Pagar: ${formatCurrency(currentVenta.restante, simboloMonedaPrincipal)}`,
                                                20,
                                                finalY + 40,
                                            );
                                            doc.text(
                                                `Ganancia Operacional: ${formatCurrency(currentVenta.total_ganancia, simboloMonedaPrincipal)}`,
                                                20,
                                                finalY + 50,
                                            );
                                            if (currentVenta.estado === 'completada') {
                                                doc.text(
                                                    `Ganancia/Pérdida Cambiaria: ${formatCurrency(currentVenta.ganancia_perdida_cambiaria, simboloMonedaPrincipal)}`,
                                                    20,
                                                    finalY + 60,
                                                );
                                                doc.text(
                                                    `Ganancia Real Total: ${formatCurrency(currentVenta.ganancia_real_total, simboloMonedaPrincipal)}`,
                                                    20,
                                                    finalY + 70,
                                                );
                                                doc.text(`Estado: ${currentVenta.estado}`, 20, finalY + 80);
                                            } else {
                                                doc.text(`Estado: ${currentVenta.estado}`, 20, finalY + 60);
                                            }

                                            // Guardar el PDF
                                            doc.save(`venta_${currentVenta.id}_reporte.pdf`);

                                            toast.success('PDF generado exitosamente');
                                        } catch (error) {
                                            console.error('Error al generar PDF:', error);
                                            toast.error('No se pudo generar el PDF. Asegúrate de tener las dependencias instaladas correctamente.');
                                        }
                                    }}
                                >
                                    Exportar PDF
                                </Button>
                                <AlertDialogCancel className="bg-destructive hover:bg-destructive-foreground cursor-pointer text-white">
                                    Cerrar
                                </AlertDialogCancel>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

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
                                <AlertDialogTitle>
                                    <div className="flex items-center justify-center">
                                        <AppLogoIcon />
                                    </div>
                                </AlertDialogTitle>
                            </AlertDialogHeader>
                            <div className="max-h-[70vh] overflow-y-auto">
                                <div className="p-4 font-mono text-sm">
                                    {/* Formato para impresora térmica - Ticket para el cliente */}
                                    <div className="mb-4 border-b pb-2 text-center">
                                        <AppLogoIcon />
                                        <h2 className="text-lg font-bold">{currentVenta.almacen.nombre}</h2>
                                        <p className="text-xs">Boleta de Venta</p>
                                        <p className="text-xs">Venta #: {currentVenta.id}</p>
                                        <p className="text-xs">{formatDate(currentVenta.fecha)}</p>
                                    </div>

                                    <div className="mb-2">
                                        <p>
                                            <span className="font-bold">Cliente:</span>{' '}
                                            {currentVenta.cliente ? currentVenta.cliente.nombre : 'Cliente no especificado'}
                                        </p>
                                        {currentVenta.destinatario && (
                                            <>
                                                <p>
                                                    <span className="font-bold">Receptor:</span> {currentVenta.destinatario.nombre}{' '}
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
                                                    <th className="text-right">Precio</th>
                                                    <th className="text-right">Ganancia</th>
                                                    <th className="text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentVenta.items.map((item, index) => (
                                                    <tr key={index} className="border-b">
                                                        <td className="text-left">{item.producto.nombre}</td>
                                                        <td className="text-center">{item.cantidad}</td>
                                                        <td className="text-right">{formatCurrency(item.precio_venta, simboloMonedaPrincipal)}</td>
                                                        <td className="text-right">{formatCurrency(item.ganancia, simboloMonedaPrincipal)}</td>
                                                        <td className="text-right">{formatCurrency(item.subtotal, simboloMonedaPrincipal)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mb-2 border-t pt-2">
                                        <div className="flex justify-between">
                                            <span>Total:</span>
                                            <span className="font-bold">{formatCurrency(currentVenta.total, simboloMonedaPrincipal)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Pagado:</span>
                                            <span>{formatCurrency(currentVenta.total_pagado, simboloMonedaPrincipal)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Restante:</span>
                                            <span>{formatCurrency(currentVenta.restante, simboloMonedaPrincipal)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Ganancia Operacional:</span>
                                            <span>{formatCurrency(currentVenta.total_ganancia, simboloMonedaPrincipal)}</span>
                                        </div>
                                        {currentVenta.estado === 'completada' && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span>Ganancia/Pérdida Cambiaria:</span>
                                                    <span>{formatCurrency(currentVenta.ganancia_perdida_cambiaria, simboloMonedaPrincipal)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Ganancia Real Total:</span>
                                                    <span>{formatCurrency(currentVenta.ganancia_real_total, simboloMonedaPrincipal)}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="mb-2 border-t pt-2">
                                        <h3 className="text-center font-bold">DETALLES DE PAGO</h3>
                                        {currentVenta.pagos.length > 0 ? (
                                            currentVenta.pagos.map((pago, index) => {
                                                const simboloMonedaPago = getCurrencySymbol(pago.moneda);
                                                return (
                                                    <div key={index} className="mb-1 text-xs">
                                                        <p>
                                                            <span className="font-bold">Método:</span> {pago.metodo}
                                                        </p>
                                                        <p>
                                                            <span className="font-bold">Monto:</span> {formatCurrency(pago.monto, simboloMonedaPago)}
                                                        </p>
                                                        {pago.via && (
                                                            <p>
                                                                <span className="font-bold">Vía:</span> {pago.via}
                                                            </p>
                                                        )}
                                                        {pago.referencia && (
                                                            <p>
                                                                <span className="font-bold">Ref:</span> {pago.referencia}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p>No hay pagos registrados</p>
                                        )}
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

                {/* Sección de Información del Destinatario */}
                {currentVenta.destinatario && (
                    <div className="rounded-lg border border-green-200 p-6 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-green-800">
                                <Users className="h-5 w-5" />✅ Receptor Registrado
                            </h3>
                            {isVentaPendiente && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-100"
                                    onClick={handleEditarDestinatario}
                                >
                                    <Edit size={14} />
                                    Editar
                                </Button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-700">Nombre Completo:</span>
                                </div>
                                <p className="text-sm">
                                    {currentVenta.destinatario.nombre} {currentVenta.destinatario.apellidos}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <IdCard className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-700">Carnet de Identidad:</span>
                                </div>
                                <p className="text-sm">{currentVenta.destinatario.carnet_identidad}</p>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-700">Teléfono Contacto:</span>
                                </div>
                                <p className="text-sm">{currentVenta.destinatario.telefono_contacto || 'No especificado'}</p>
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-700">Dirección de Residencia:</span>
                                </div>
                                <p className="text-sm">{currentVenta.destinatario.direccion_residencia}</p>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-green-600" />
                                    <span className="text-sm font-medium text-green-700">Parentesco:</span>
                                </div>
                                <p className="text-sm">{currentVenta.destinatario.parentesco_cliente || 'No especificado'}</p>
                            </div>

                            {currentVenta.destinatario.observaciones && (
                                <div className="space-y-1 md:col-span-3">
                                    <span className="text-sm font-medium text-green-700">Observaciones:</span>
                                    <p className="text-sm">{currentVenta.destinatario.observaciones}</p>
                                </div>
                            )}
                        </div>
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

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted">
                                <tr className="border-b">
                                    <th className="p-3 text-left">Producto</th>
                                    <th className="p-3 text-left">Cantidad</th>
                                    <th className="p-3 text-left">Precio Unitario</th>
                                    <th className="p-3 text-left">Costo Unitario</th>
                                    <th className="p-3 text-left">Ganancia Unitaria</th>
                                    <th className="p-3 text-left">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentVenta.items.map((item, index) => {
                                    const gananciaUnitaria = item.precio_venta - item.costo_unitario;
                                    const gananciaTotalItem = gananciaUnitaria * item.cantidad;

                                    return (
                                        <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                                            <td className="p-3">
                                                <div>
                                                    <p className="font-medium">{item.producto.nombre}</p>
                                                    <p className="text-muted-foreground text-sm">
                                                        {item.producto.marca} - {item.producto.categoria}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-3">{item.cantidad}</td>
                                            <td className="p-3">{formatCurrency(item.precio_venta, simboloMonedaPrincipal)}</td>
                                            <td className="p-3 text-red-600">{formatCurrency(item.costo_unitario, simboloMonedaPrincipal)}</td>
                                            <td className="p-3 text-green-600">{formatCurrency(item.ganancia, simboloMonedaPrincipal)}</td>
                                            <td className="p-3 font-medium">{formatCurrency(item.subtotal, simboloMonedaPrincipal)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-sidebar-accent">
                                    <td colSpan={5} className="py-3 text-right font-semibold text-white">
                                        Total Venta:
                                    </td>
                                    <td className="py-3 text-center text-lg font-semibold text-white">
                                        {formatCurrency(currentVenta.total, simboloMonedaPrincipal)}
                                    </td>
                                </tr>
                                <tr className="bg-green-50">
                                    <td colSpan={5} className="py-3 text-right font-semibold text-green-800">
                                        Ganancia Total:
                                    </td>
                                    <td className="py-3 text-center text-lg font-semibold text-green-800">
                                        {formatCurrency(currentVenta.total_ganancia, simboloMonedaPrincipal)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Información de pagos y resumen */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
                                const simboloMonedaCuenta = getCurrencySymbol(pago.cuenta.moneda);

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
                                                <p className="text-sm font-medium">Cuenta:</p>
                                                <p className="text-sm">
                                                    {pago.cuenta.nombre} ({pago.cuenta.moneda?.nombre || simboloMonedaCuenta})
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
        </AppLayout>
    );
}
