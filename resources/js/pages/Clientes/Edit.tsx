import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { ClienteProps, type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    CheckCircle,
    DollarSign,
    History,
    Home,
    Info,
    MapPin,
    Phone,
    Save,
    User,
    UserCheck,
    UserCog,
} from 'lucide-react';
import { toast } from 'sonner';

interface EditClientePageProps {
    cliente: ClienteProps;
}

const breadcrumbs = (clienteNombre: string): BreadcrumbItem[] => [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Clientes',
        href: '/clientes',
    },
    {
        title: `Editar ${clienteNombre}`,
        href: '#',
    },
];

export default function EditClientePage({ cliente }: EditClientePageProps) {
    const { data, setData, put, processing, errors } = useForm({
        nombre_cliente: cliente.nombre_cliente || '',
        tipo_cliente: cliente.tipo_cliente || 'fisico',
        deuda_pago_cliente: cliente.deuda_pago_cliente || 0,
        telefono_cliente: cliente.telefono_cliente || '',
        direccion_cliente: cliente.direccion_cliente || '',
        ciudad_cliente: cliente.ciudad_cliente || '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        put(route('clientes.update', { cliente: cliente.id }), {
            onSuccess: () => {
                toast.success('Cliente actualizado correctamente');
            },
            onError: () => {
                toast.error('Error al actualizar el cliente');
            },
        });
    };

    const formatearMoneda = (valor: number | null) => {
        if (valor === null || valor === undefined) return '$0.00';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 8,
        }).format(valor);
    };

    // ACTUALIZADO: Nueva lógica coherente con Proveedores
    const getEstadoFinanciero = (saldo: number | null) => {
        if (saldo === null || saldo === undefined) {
            return { tipo: 'sin-info', color: 'gray', icon: History, texto: 'Sin información' };
        }

        // NUEVA LÓGICA (igual que Proveedores):
        if (saldo > 0) {
            return {
                tipo: 'fondo',
                color: 'green',
                icon: CheckCircle,
                texto: 'Fondo disponible',
                descripcion: 'Tienes fondo disponible con el cliente',
            };
        } else if (saldo < 0) {
            return {
                tipo: 'deuda',
                color: 'red',
                icon: AlertCircle,
                texto: 'Deuda pendiente',
                descripcion: 'Tienes deuda pendiente con el cliente',
            };
        } else {
            return {
                tipo: 'neutral',
                color: 'gray',
                icon: CheckCircle,
                texto: 'Al día',
                descripcion: 'Sin deudas ni fondos pendientes',
            };
        }
    };

    const estadoActual = getEstadoFinanciero(cliente.deuda_pago_cliente);
    const estadoNuevo = getEstadoFinanciero(data.deuda_pago_cliente);
    const EstadoActualIcon = estadoActual.icon;
    const EstadoNuevoIcon = estadoNuevo.icon;

    return (
        <AppLayout breadcrumbs={breadcrumbs(cliente.nombre_cliente)}>
            <Head title={`Editar ${cliente.nombre_cliente}`} />
            <TooltipProvider>
                <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
                    {/* Header */}
                    <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-6">
                        <HeadingSmall
                            title={`Editar Cliente: ${cliente.nombre_cliente}`}
                            description="Actualice la información del cliente según sea necesario"
                        />
                        <div className="absolute top-1/2 right-4 flex -translate-y-1/2 transform items-center gap-2 opacity-40">
                            <User size={24} />
                            <span className="text-sm">ID: {cliente.id}</span>
                        </div>
                    </div>

                    {/* Información Actual del Cliente */}
                    <Card className="bg-muted/30 border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h4 className="font-semibold">Estado Actual del Cliente</h4>
                                    <div className="text-muted-foreground flex items-center gap-4 text-sm">
                                        <div className="flex items-center gap-1">
                                            <User size={12} />
                                            <span>{cliente.nombre_cliente}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <EstadoActualIcon
                                                size={12}
                                                className={`${
                                                    estadoActual.color === 'red'
                                                        ? 'text-red-500'
                                                        : estadoActual.color === 'green'
                                                          ? 'text-green-500'
                                                          : 'text-gray-500'
                                                }`}
                                            />
                                            <span
                                                className={
                                                    estadoActual.color === 'red'
                                                        ? 'text-red-600'
                                                        : estadoActual.color === 'green'
                                                          ? 'text-green-600'
                                                          : 'text-gray-600'
                                                }
                                            >
                                                {formatearMoneda(cliente.deuda_pago_cliente)} - {estadoActual.texto}
                                            </span>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={
                                                cliente.tipo_cliente === 'asociado'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-500'
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-500'
                                            }
                                        >
                                            {cliente.tipo_cliente === 'asociado' ? 'Asociado' : 'Físico'}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="text-muted-foreground text-right text-xs">
                                    <div className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        <span>Última actualización</span>
                                    </div>
                                    <span>Al guardar cambios</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Formulario de Edición */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Editar Información del Cliente
                            </CardTitle>
                            <CardDescription>
                                Modifique los datos que necesite actualizar. Los campos marcados con * son obligatorios.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-6">
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {/* Columna 1 */}
                                    <div className="space-y-4">
                                        {/* Nombre del Cliente */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor="nombre_cliente" className="flex items-center gap-1">
                                                    Nombre Completo *
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info size={14} className="text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Nombre completo del cliente</p>
                                                            <p className="text-muted-foreground text-xs">
                                                                Se convertirá automáticamente a mayúsculas
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </Label>
                                            </div>
                                            <div className="relative">
                                                <User className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                                                <Input
                                                    id="nombre_cliente"
                                                    value={data.nombre_cliente}
                                                    onChange={(e) => setData('nombre_cliente', e.target.value.toUpperCase())}
                                                    placeholder="Ej: LUIS A. PUSHODEV"
                                                    className="pl-10"
                                                    required
                                                />
                                            </div>
                                            <InputError message={errors.nombre_cliente} />
                                        </div>

                                        {/* Tipo de Cliente */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor="tipo_cliente" className="flex items-center gap-1">
                                                    Tipo de Cliente *
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info size={14} className="text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <div className="space-y-1">
                                                                <p>
                                                                    <strong>Cliente Físico:</strong> Persona natural
                                                                </p>
                                                                <p>
                                                                    <strong>Cliente Asociado:</strong> Empresa o negocio
                                                                </p>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </Label>
                                            </div>
                                            <Select value={data.tipo_cliente} onValueChange={(value) => setData('tipo_cliente', value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccione un tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="fisico" className="flex items-center gap-2">
                                                        <UserCheck size={14} />
                                                        Cliente Físico
                                                    </SelectItem>
                                                    <SelectItem value="asociado" className="flex items-center gap-2">
                                                        <UserCog size={14} />
                                                        Cliente Asociado
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <div className="flex gap-2">
                                                <Badge
                                                    variant={data.tipo_cliente === 'fisico' ? 'default' : 'outline'}
                                                    className={
                                                        data.tipo_cliente === 'fisico'
                                                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/30 dark:text-blue-500'
                                                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                    }
                                                >
                                                    Físico
                                                </Badge>
                                                <Badge
                                                    variant={data.tipo_cliente === 'asociado' ? 'default' : 'outline'}
                                                    className={
                                                        data.tipo_cliente === 'asociado'
                                                            ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/30 dark:text-green-500'
                                                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                    }
                                                >
                                                    Asociado
                                                </Badge>
                                            </div>
                                            <InputError message={errors.tipo_cliente} />
                                        </div>

                                        {/* Teléfono */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor="telefono_cliente" className="flex items-center gap-1">
                                                    Teléfono de Contacto
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info size={14} className="text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Número de teléfono principal del cliente</p>
                                                            <p className="text-muted-foreground text-xs">Debe ser único en el sistema</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </Label>
                                            </div>
                                            <div className="relative">
                                                <Phone className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                                                <Input
                                                    id="telefono_cliente"
                                                    value={data.telefono_cliente}
                                                    onChange={(e) => setData('telefono_cliente', e.target.value)}
                                                    placeholder="Ej: 555-1234-567"
                                                    className="pl-10"
                                                />
                                            </div>
                                            <InputError message={errors.telefono_cliente} />
                                        </div>
                                    </div>

                                    {/* Columna 2 */}
                                    <div className="space-y-4">
                                        {/* Estado Financiero */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor="deuda_pago_cliente" className="flex items-center gap-1">
                                                    Estado Financiero
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info size={14} className="text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <div className="space-y-2">
                                                                <p className="flex items-center gap-1">
                                                                    <CheckCircle size={12} className="text-green-500" />
                                                                    <strong>&gt; 0:</strong> Fondo disponible (tienes fondo con cliente)
                                                                </p>
                                                                <p className="flex items-center gap-1">
                                                                    <AlertCircle size={12} className="text-red-500" />
                                                                    <strong>&lt; 0:</strong> Deuda pendiente (le debes al cliente)
                                                                </p>
                                                                <p className="flex items-center gap-1">
                                                                    <CheckCircle size={12} className="text-gray-500" />
                                                                    <strong>= 0:</strong> Sin movimientos
                                                                </p>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </Label>
                                            </div>
                                            <div className="relative">
                                                <DollarSign className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                                                <Input
                                                    id="deuda_pago_cliente"
                                                    type="number"
                                                    step="0.00000001"
                                                    min="-9999999"
                                                    max="9999999"
                                                    value={data.deuda_pago_cliente || ''}
                                                    onChange={(e) => setData('deuda_pago_cliente', parseFloat(e.target.value) || 0)}
                                                    placeholder="0.00"
                                                    className="[appearance:textfield] pl-10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                />
                                            </div>
                                            <div
                                                className={`flex items-center gap-1 text-sm ${
                                                    data.deuda_pago_cliente > 0
                                                        ? 'text-green-600'
                                                        : data.deuda_pago_cliente < 0
                                                          ? 'text-red-600'
                                                          : 'text-gray-600'
                                                }`}
                                            >
                                                <EstadoNuevoIcon size={14} />
                                                {data.deuda_pago_cliente > 0 ? (
                                                    <span>La empresa tendrá fondo disponible con el cliente</span>
                                                ) : data.deuda_pago_cliente < 0 ? (
                                                    <span>La empresa tendrá deuda pendiente con el cliente</span>
                                                ) : (
                                                    <span>Sin deudas ni fondos</span>
                                                )}
                                            </div>
                                            <InputError message={errors.deuda_pago_cliente} />
                                        </div>

                                        {/* Dirección */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor="direccion_cliente" className="flex items-center gap-1">
                                                    Dirección
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info size={14} className="text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Dirección física del cliente</p>
                                                            <p className="text-muted-foreground text-xs">
                                                                Se convertirá automáticamente a mayúsculas
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </Label>
                                            </div>
                                            <div className="relative">
                                                <Home className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                                                <Input
                                                    id="direccion_cliente"
                                                    value={data.direccion_cliente}
                                                    onChange={(e) => setData('direccion_cliente', e.target.value.toUpperCase())}
                                                    placeholder="Ej: CALLE PRINCIPAL #123"
                                                    className="pl-10"
                                                />
                                            </div>
                                            <InputError message={errors.direccion_cliente} />
                                        </div>

                                        {/* Ciudad */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor="ciudad_cliente" className="flex items-center gap-1">
                                                    Ciudad
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info size={14} className="text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Ciudad o localidad del cliente</p>
                                                            <p className="text-muted-foreground text-xs">
                                                                Se convertirá automáticamente a mayúsculas
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </Label>
                                            </div>
                                            <div className="relative">
                                                <MapPin className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                                                <Input
                                                    id="ciudad_cliente"
                                                    value={data.ciudad_cliente}
                                                    onChange={(e) => setData('ciudad_cliente', e.target.value.toUpperCase())}
                                                    placeholder="Ej: CIUDAD DE MANZANILLO"
                                                    className="pl-10"
                                                />
                                            </div>
                                            <InputError message={errors.ciudad_cliente} />
                                        </div>
                                    </div>
                                </div>

                                {/* Resumen de Cambios */}
                                <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-semibold">Resumen de Cambios</h4>
                                                <div className="text-muted-foreground flex items-center gap-4 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">Estado Financiero:</span>
                                                        <div className="flex items-center gap-1">
                                                            <EstadoActualIcon
                                                                size={12}
                                                                className={
                                                                    estadoActual.color === 'red'
                                                                        ? 'text-red-500'
                                                                        : estadoActual.color === 'green'
                                                                          ? 'text-green-500'
                                                                          : 'text-gray-500'
                                                                }
                                                            />
                                                            <span
                                                                className={
                                                                    estadoActual.color === 'red'
                                                                        ? 'text-red-600'
                                                                        : estadoActual.color === 'green'
                                                                          ? 'text-green-600'
                                                                          : 'text-gray-600'
                                                                }
                                                            >
                                                                {formatearMoneda(cliente.deuda_pago_cliente)}
                                                            </span>
                                                            <span>→</span>
                                                            <EstadoNuevoIcon
                                                                size={12}
                                                                className={
                                                                    estadoNuevo.color === 'red'
                                                                        ? 'text-red-500'
                                                                        : estadoNuevo.color === 'green'
                                                                          ? 'text-green-500'
                                                                          : 'text-gray-500'
                                                                }
                                                            />
                                                            <span
                                                                className={
                                                                    estadoNuevo.color === 'red'
                                                                        ? 'text-red-600'
                                                                        : estadoNuevo.color === 'green'
                                                                          ? 'text-green-600'
                                                                          : 'text-gray-600'
                                                                }
                                                            >
                                                                {formatearMoneda(data.deuda_pago_cliente)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {cliente.tipo_cliente !== data.tipo_cliente && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">Tipo:</span>
                                                            <Badge
                                                                variant="outline"
                                                                className={
                                                                    cliente.tipo_cliente === 'asociado'
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : 'bg-blue-100 text-blue-800'
                                                                }
                                                            >
                                                                {cliente.tipo_cliente === 'asociado' ? 'Asociado' : 'Físico'}
                                                            </Badge>
                                                            <span>→</span>
                                                            <Badge
                                                                variant="outline"
                                                                className={
                                                                    data.tipo_cliente === 'asociado'
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : 'bg-blue-100 text-blue-800'
                                                                }
                                                            >
                                                                {data.tipo_cliente === 'asociado' ? 'Asociado' : 'Físico'}
                                                            </Badge>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Botones de Acción */}
                                <div className="flex justify-end gap-3 pt-4">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => window.history.back()}
                                                className="flex cursor-pointer items-center gap-2"
                                            >
                                                <ArrowLeft size={16} />
                                                Cancelar
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Volver sin guardar cambios</p>
                                        </TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                type="submit"
                                                disabled={processing || !data.nombre_cliente || !data.tipo_cliente}
                                                className="bg-primary hover:bg-primary/90 flex cursor-pointer items-center gap-2 px-6 font-semibold"
                                            >
                                                <Save size={16} />
                                                {processing ? (
                                                    <span className="flex items-center gap-2">
                                                        <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                                                        Actualizando...
                                                    </span>
                                                ) : (
                                                    'Actualizar Cliente'
                                                )}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {!data.nombre_cliente || !data.tipo_cliente ? (
                                                <p>Complete los campos obligatorios para continuar</p>
                                            ) : (
                                                <p>Guardar cambios del cliente</p>
                                            )}
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </TooltipProvider>
        </AppLayout>
    );
}
