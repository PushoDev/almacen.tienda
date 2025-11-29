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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    Calendar,
    CheckCircle,
    CreditCard,
    DollarSign,
    Edit,
    FileText,
    Hash,
    Home,
    IdCard,
    MapPin,
    Package,
    Phone,
    Printer,
    Receipt,
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
        title: 'Ventas',
        href: '/punto-venta',
    },
    {
        title: 'Listado',
        href: '/listado-ventas',
    },
    {
        title: 'Detalle de Venta',
        href: '#',
    },
];

// Interfaces
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
    total_esperado_usd: number | null;
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

const StatCard = ({
    title,
    value,
    icon: Icon,
    color = 'text-gray-600',
    bgColor = 'bg-gray-50',
}: {
    title: string;
    value: string;
    icon: React.ElementType;
    color?: string;
    bgColor?: string;
}) => (
    <Card className="overflow-hidden">
        <CardContent className="flex items-center justify-between p-4">
            <div>
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
            <div className={`rounded-full p-3 ${bgColor}`}>
                <Icon className={`h-6 w-6 ${color}`} />
            </div>
        </CardContent>
    </Card>
);

export default function DetalleVenta({ venta }: Props) {
    const [isCancelling, setIsCancelling] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [isSavingDestinatario, setIsSavingDestinatario] = useState(false);
    const [currentVenta, setCurrentVenta] = useState<Venta>(venta);
    const [isDestinatarioDialogOpen, setIsDestinatarioDialogOpen] = useState(false);
    const [isEditingDestinatario, setIsEditingDestinatario] = useState(false);
    const [formDestinatario, setFormDestinatario] = useState({
        nombre: '',
        apellidos: '',
        carnet_identidad: '',
        direccion_residencia: '',
        telefono_contacto: '',
        parentesco_cliente: '',
        observaciones: '',
    });

    useEffect(() => {
        if (isDestinatarioDialogOpen) {
            const destinatario = currentVenta.destinatario;
            setFormDestinatario({
                nombre: destinatario?.nombre || '',
                apellidos: destinatario?.apellidos || '',
                carnet_identidad: destinatario?.carnet_identidad || '',
                direccion_residencia: destinatario?.direccion_residencia || '',
                telefono_contacto: destinatario?.telefono_contacto || '',
                parentesco_cliente: destinatario?.parentesco_cliente || '',
                observaciones: destinatario?.observaciones || '',
            });
        }
    }, [isDestinatarioDialogOpen, currentVenta.destinatario]);

    const formatDate = (dateString: string) => new Date(dateString).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
    const formatCurrency = (amount: number, currencyCode: string = 'USD') =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: currencyCode }).format(amount);
    const getCurrencySymbol = (moneda: MonedaPago | MonedaPrincipal | null) => moneda?.codigo || 'USD';

    const isVentaPendiente = currentVenta.estado === 'pendiente';
    const isVentaCompletada = currentVenta.estado === 'completada';
    const isVentaCancelada = currentVenta.estado === 'cancelada';
    const puedeAprobar = isVentaPendiente && currentVenta.destinatario !== null;

    const getEstadoConfig = () => {
        switch (currentVenta.estado) {
            case 'pendiente':
                return { color: 'bg-yellow-500', text: 'Pendiente', icon: Clock };
            case 'completada':
                return { color: 'bg-green-500', text: 'Completada', icon: CheckCircle };
            case 'cancelada':
                return { color: 'bg-red-500', text: 'Anulada', icon: XCircle };
            default:
                return { color: 'bg-gray-500', text: 'Desconocido', icon: AlertTriangle };
        }
    };

    const estadoConfig = getEstadoConfig();
    const simboloMonedaPrincipal = getCurrencySymbol(currentVenta.moneda_principal);

    const handleApiCall = async (action: 'approve' | 'cancel' | 'saveDestinatario', payload?: any) => {
        const actions = {
            approve: {
                stateSetter: setIsApproving,
                url: route('ventas.aprobar', currentVenta.id),
                successMessage: 'Venta aprobada correctamente',
            },
            cancel: {
                stateSetter: setIsCancelling,
                url: route('ventas.anular', currentVenta.id),
                successMessage: 'Venta anulada correctamente',
            },
            saveDestinatario: {
                stateSetter: setIsSavingDestinatario,
                url: route('ventas.destinatario.store', currentVenta.id),
                successMessage: 'Información del receptor guardada',
            },
        };

        const currentAction = actions[action];
        currentAction.stateSetter(true);
        try {
            const response = await axios.post(currentAction.url, payload);
            if (response.data.success) {
                toast.success(response.data.message || currentAction.successMessage);
                router.reload({
                    onSuccess: () => {
                        if (action === 'saveDestinatario') {
                            setIsDestinatarioDialogOpen(false);
                            setIsEditingDestinatario(false);
                        }
                    },
                });
            } else {
                toast.error(response.data.message || 'Ocurrió un error');
            }
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || 'Error de comunicación con el servidor.';
            toast.error(errorMessage);
        } finally {
            currentAction.stateSetter(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Detalle de Venta #${currentVenta.id}`} />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 sm:p-6">
                <Card className="relative overflow-hidden">
                    <CardHeader>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-2xl">Venta #{currentVenta.id}</CardTitle>
                                <p className="text-muted-foreground">Resumen completo de la transacción.</p>
                            </div>
                            <div
                                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white ${estadoConfig.color}`}
                            >
                                <estadoConfig.icon size={16} />
                                {estadoConfig.text}
                            </div>
                        </div>
                    </CardHeader>
                    <ShoppingBag
                        size={90}
                        className="pointer-events-none absolute -bottom-4 -right-4 text-gray-200/40 dark:text-gray-500/10"
                    />
                </Card>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <StatCard
                        title="Ganancia Operacional"
                        value={formatCurrency(currentVenta.total_ganancia, simboloMonedaPrincipal)}
                        icon={ArrowUp}
                        color="text-green-600"
                        bgColor="bg-green-50"
                    />
                    <StatCard
                        title="Ingreso Esperado"
                        value={formatCurrency(currentVenta.total_esperado_usd || 0, simboloMonedaPrincipal)}
                        icon={Receipt}
                        color="text-sky-600"
                        bgColor="bg-sky-50"
                    />
                    <StatCard
                        title="Ingreso Real"
                        value={formatCurrency(currentVenta.total_pagado, simboloMonedaPrincipal)}
                        icon={DollarSign}
                        color="text-emerald-600"
                        bgColor="bg-emerald-50"
                    />
                    <StatCard
                        title="Ganancia Cambiaria"
                        value={formatCurrency(currentVenta.ganancia_perdida_cambiaria, simboloMonedaPrincipal)}
                        icon={currentVenta.ganancia_perdida_cambiaria >= 0 ? ArrowUp : ArrowDown}
                        color={currentVenta.ganancia_perdida_cambiaria >= 0 ? 'text-green-600' : 'text-red-600'}
                        bgColor={currentVenta.ganancia_perdida_cambiaria >= 0 ? 'bg-green-50' : 'bg-red-50'}
                    />
                    <StatCard
                        title="Ganancia Real Total"
                        value={formatCurrency(currentVenta.ganancia_real_total, simboloMonedaPrincipal)}
                        icon={CheckCircle}
                        color="text-blue-600"
                        bgColor="bg-blue-50"
                    />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                    {isVentaPendiente && (
                        <AlertDialog open={isDestinatarioDialogOpen} onOpenChange={setIsDestinatarioDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                    onClick={() => setIsEditingDestinatario(!!currentVenta.destinatario)}
                                >
                                    {currentVenta.destinatario ? <Edit size={16} /> : <Users size={16} />}
                                    <span className="ml-2">{currentVenta.destinatario ? 'Editar Receptor' : 'Agregar Receptor'}</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Información del Receptor</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Complete los datos de la persona que recibirá el producto.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="grid max-h-[60vh] grid-cols-1 gap-4 overflow-y-auto p-1 md:grid-cols-2">
                                    {/* Form fields */}
                                    <div className="space-y-2">
                                        <Label htmlFor="nombre">Nombre *</Label>
                                        <Input id="nombre" value={formDestinatario.nombre} onChange={e => setFormDestinatario(p => ({...p, nombre: e.target.value}))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="apellidos">Apellidos *</Label>
                                        <Input id="apellidos" value={formDestinatario.apellidos} onChange={e => setFormDestinatario(p => ({...p, apellidos: e.target.value}))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="carnet_identidad">Carnet de Identidad *</Label>
                                        <Input id="carnet_identidad" value={formDestinatario.carnet_identidad} onChange={e => setFormDestinatario(p => ({...p, carnet_identidad: e.target.value}))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="telefono_contacto">Teléfono</Label>
                                        <Input id="telefono_contacto" value={formDestinatario.telefono_contacto} onChange={e => setFormDestinatario(p => ({...p, telefono_contacto: e.target.value}))} />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="direccion_residencia">Dirección *</Label>
                                        <Textarea id="direccion_residencia" value={formDestinatario.direccion_residencia} onChange={e => setFormDestinatario(p => ({...p, direccion_residencia: e.target.value}))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="parentesco_cliente">Parentesco</Label>
                                        <Input id="parentesco_cliente" value={formDestinatario.parentesco_cliente} onChange={e => setFormDestinatario(p => ({...p, parentesco_cliente: e.target.value}))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="observaciones">Observaciones</Label>
                                        <Input id="observaciones" value={formDestinatario.observaciones} onChange={e => setFormDestinatario(p => ({...p, observaciones: e.target.value}))} />
                                    </div>
                                </div>
                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isSavingDestinatario}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={() => handleApiCall('saveDestinatario', formDestinatario)}
                                        disabled={isSavingDestinatario || !formDestinatario.nombre || !formDestinatario.apellidos || !formDestinatario.carnet_identidad || !formDestinatario.direccion_residencia}
                                    >
                                        {isSavingDestinatario ? 'Guardando...' : 'Guardar'}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    {isVentaPendiente && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button className="bg-green-600 hover:bg-green-700" disabled={isApproving || !puedeAprobar}>
                                    <CheckCircle size={16} />
                                    <span className="ml-2">{isApproving ? 'Aprobando...' : 'Aprobar Venta'}</span>
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Aprobación</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        ¿Está seguro de aprobar la Venta <strong>#{currentVenta.id}</strong>? Esta acción actualizará
                                        el stock y los saldos de las cuentas.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction className="bg-green-600 hover:bg-green-700" onClick={() => handleApiCall('approve')}>
                                        Sí, Aprobar
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    {!isVentaCancelada && (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={isCancelling}>
                                     <XCircle size={16} />
                                     <span className="ml-2">{isCancelling ? 'Anulando...' : 'Anular Venta'}</span>
                                 </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                                 <AlertDialogHeader>
                                     <AlertDialogTitle>Confirmar Anulación</AlertDialogTitle>
                                     <AlertDialogDescription>
                                         ¿Está seguro de anular la Venta <strong>#{currentVenta.id}</strong>? Esta acción es
                                         irreversible.
                                     </AlertDialogDescription>
                                 </AlertDialogHeader>
                                 <AlertDialogFooter>
                                     <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                     <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleApiCall('cancel')}>
                                         Sí, Anular
                                     </AlertDialogAction>
                                 </AlertDialogFooter>
                             </AlertDialogContent>
                         </AlertDialog>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Productos Vendidos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Producto</TableHead>
                                            <TableHead className="text-center">Cant.</TableHead>
                                            <TableHead className="text-right">Precio</TableHead>
                                            <TableHead className="text-right">Ganancia</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentVenta.items.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{item.producto.nombre}</TableCell>
                                                <TableCell className="text-center">{item.cantidad}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.precio_venta, simboloMonedaPrincipal)}</TableCell>
                                                <TableCell className="text-right text-green-600">{formatCurrency(item.ganancia, simboloMonedaPrincipal)}</TableCell>
                                                <TableCell className="text-right font-semibold">{formatCurrency(item.subtotal, simboloMonedaPrincipal)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {currentVenta.destinatario && (
                             <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Información del Receptor</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                                     <div className="flex items-start gap-3">
                                         <User className="mt-1 h-4 w-4 text-muted-foreground" />
                                         <div><span className="font-medium">Nombre:</span> {currentVenta.destinatario.nombre} {currentVenta.destinatario.apellidos}</div>
                                     </div>
                                     <div className="flex items-start gap-3">
                                         <IdCard className="mt-1 h-4 w-4 text-muted-foreground" />
                                         <div><span className="font-medium">CI:</span> {currentVenta.destinatario.carnet_identidad}</div>
                                     </div>
                                     <div className="flex items-start gap-3">
                                         <Phone className="mt-1 h-4 w-4 text-muted-foreground" />
                                         <div><span className="font-medium">Teléfono:</span> {currentVenta.destinatario.telefono_contacto || 'N/A'}</div>
                                     </div>
                                     <div className="flex items-start gap-3">
                                         <Home className="mt-1 h-4 w-4 text-muted-foreground" />
                                         <div><span className="font-medium">Parentesco:</span> {currentVenta.destinatario.parentesco_cliente || 'N/A'}</div>
                                     </div>
                                     <div className="flex items-start gap-3 md:col-span-2">
                                         <MapPin className="mt-1 h-4 w-4 text-muted-foreground" />
                                         <div><span className="font-medium">Dirección:</span> {currentVenta.destinatario.direccion_residencia}</div>
                                     </div>
                                 </CardContent>
                             </Card>
                        )}
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Detalles de Pago</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {currentVenta.pagos.map((pago, index) => (
                                    <div key={index} className="rounded-md border p-3 text-sm">
                                        <div className="flex justify-between font-semibold">
                                            <span>{pago.metodo === 'transferencia' ? `Transferencia (${pago.via})` : 'Efectivo'}</span>
                                            <span>{formatCurrency(pago.monto, getCurrencySymbol(pago.moneda))}</span>
                                        </div>
                                        <div className="text-muted-foreground">
                                            <p>Equivale a: {formatCurrency(pago.monto_equivalente, simboloMonedaPrincipal)}</p>
                                            <p>Cuenta: {pago.cuenta.nombre}</p>
                                            {pago.referencia && <p>Ref: {pago.referencia}</p>}
                                        </div>
                                    </div>
                                ))}
                                <Separator />
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span> <span>{formatCurrency(currentVenta.items.reduce((acc, i) => acc + i.subtotal, 0), simboloMonedaPrincipal)}</span></div>
                                    <div className="flex justify-between font-bold text-lg"><span >Total Venta</span> <span>{formatCurrency(currentVenta.total, simboloMonedaPrincipal)}</span></div>
                                    <div className="flex justify-between text-green-600"><span >Total Pagado</span> <span>{formatCurrency(currentVenta.total_pagado, simboloMonedaPrincipal)}</span></div>
                                    <div className="flex justify-between font-semibold"><span >Restante</span> <span>{formatCurrency(currentVenta.restante, simboloMonedaPrincipal)}</span></div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                             <CardHeader>
                                 <CardTitle className="flex items-center gap-2"><Hash className="h-5 w-5" /> Información General</CardTitle>
                             </CardHeader>
                             <CardContent className="space-y-3 text-sm">
                                <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-muted-foreground" /> <div><span className="font-medium">Fecha:</span> {formatDate(currentVenta.fecha)}</div></div>
                                 <div className="flex items-center gap-3"><Store className="h-4 w-4 text-muted-foreground" /> <div><span className="font-medium">Almacén:</span> {currentVenta.almacen.nombre}</div></div>
                                 <div className="flex items-center gap-3"><User className="h-4 w-4 text-muted-foreground" /> <div><span className="font-medium">Cliente:</span> {currentVenta.cliente?.nombre || 'N/A'}</div></div>
                                 <div className="flex items-center gap-3"><UserCheck className="h-4 w-4 text-muted-foreground" /> <div><span className="font-medium">Vendedor:</span> {currentVenta.usuario.nombre}</div></div>
                             </CardContent>
                         </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}