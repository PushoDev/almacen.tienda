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
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { AlertCircle, ArrowLeft, CheckCircle, DollarSign, Home, Info, MapPin, Phone, Save, User, UserCheck, UserCog } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Clientes',
        href: '/clientes',
    },
    {
        title: 'Crear Cliente',
        href: '#',
    },
];

export default function CreateClientePage() {
    const { data, setData, post, reset, errors, processing } = useForm({
        nombre_cliente: '',
        tipo_cliente: 'fisico',
        deuda_pago_cliente: 0,
        telefono_cliente: '',
        direccion_cliente: '',
        ciudad_cliente: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        post(route('clientes.store'), {
            onSuccess: () => {
                reset();
                toast.success('Cliente creado correctamente');
            },
            onError: () => {
                toast.error('Error al crear el cliente');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Cliente" />
            <TooltipProvider>
                <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
                    {/* Header */}
                    <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-6">
                        <HeadingSmall
                            title="Nuevo Cliente"
                            description="Complete todos los datos requeridos para agregar un nuevo cliente al sistema"
                        />
                    </div>

                    {/* Formulario de Creación */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Información del Cliente
                            </CardTitle>
                            <CardDescription>Complete los datos básicos del cliente. Los campos marcados con * son obligatorios.</CardDescription>
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
                                        {/* Estado Financiero Inicial */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor="deuda_pago_cliente" className="flex items-center gap-1">
                                                    Estado Financiero Inicial
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
                                                {data.deuda_pago_cliente > 0 ? (
                                                    <>
                                                        <CheckCircle size={14} />
                                                        <span>La empresa tendrá fondo disponible con el cliente</span>
                                                    </>
                                                ) : data.deuda_pago_cliente < 0 ? (
                                                    <>
                                                        <AlertCircle size={14} />
                                                        <span>La empresa tendrá deuda pendiente con el cliente</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle size={14} />
                                                        <span>Sin deudas ni fondos iniciales</span>
                                                    </>
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

                                {/* Resumen de Creación */}
                                <Card className="bg-muted/50">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-semibold">Resumen del Cliente</h4>
                                                <p className="text-muted-foreground text-sm">
                                                    {data.nombre_cliente || 'Nuevo cliente'} •{' '}
                                                    {data.tipo_cliente === 'fisico' ? 'Cliente Físico' : 'Cliente Asociado'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-medium">
                                                    Estado financiero inicial:
                                                    <span
                                                        className={
                                                            data.deuda_pago_cliente > 0
                                                                ? 'text-green-600'
                                                                : data.deuda_pago_cliente < 0
                                                                  ? 'text-red-600'
                                                                  : 'text-gray-600'
                                                        }
                                                    >
                                                        {data.deuda_pago_cliente > 0
                                                            ? ` Fondo: $${Math.abs(data.deuda_pago_cliente).toFixed(2)}`
                                                            : data.deuda_pago_cliente < 0
                                                              ? ` Deuda: $${Math.abs(data.deuda_pago_cliente).toFixed(2)}`
                                                              : ' Neutral'}
                                                    </span>
                                                </p>
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
                                                        Creando...
                                                    </span>
                                                ) : (
                                                    'Registrar Cliente'
                                                )}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {!data.nombre_cliente || !data.tipo_cliente ? (
                                                <p>Complete los campos obligatorios para continuar</p>
                                            ) : (
                                                <p>Guardar nuevo cliente en el sistema</p>
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
