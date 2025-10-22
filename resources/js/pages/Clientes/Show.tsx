import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { ClienteProps, type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowDownCircle,
    ArrowLeft,
    ArrowRightLeft,
    Building,
    Calendar,
    CheckCircle,
    CreditCard,
    DollarSign,
    Edit3,
    Eye,
    FileText,
    History,
    Home,
    MapPin,
    Phone,
    ShoppingCart,
    TrendingDown,
    TrendingUp,
    User,
    Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface ShowClientePageProps {
    cliente: ClienteProps;
    operaciones: Array<{
        tipo: string;
        fecha: string;
        descripcion: string;
        monto: number;
        moneda: string;
        referencia: string;
        es_origen?: boolean;
        detalles: any;
    }>;
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
        title: `Detalles: ${clienteNombre}`,
        href: '#',
    },
];

export default function ShowClientePage({ cliente, operaciones }: ShowClientePageProps) {
    const [activeTab, setActiveTab] = useState('resumen');

    const formatearMoneda = (valor: number | null) => {
        if (valor === null || valor === undefined) return '$0.00';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 8,
        }).format(valor);
    };

    const formatearFecha = (fecha: string) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Calcular métricas
    const metricas = useMemo(() => {
        const totalOperaciones = operaciones.length;
        const compras = operaciones.filter((op) => op.tipo === 'compra_pago').length;
        const ventas = operaciones.filter((op) => op.tipo === 'venta').length;
        const transacciones = operaciones.filter((op) => ['gasto', 'ingreso', 'transferencia'].includes(op.tipo)).length;

        const montoTotal = operaciones.reduce((sum, op) => sum + Math.abs(op.monto), 0);
        const deudaActual = cliente.deuda_pago_cliente || 0;

        return {
            totalOperaciones,
            compras,
            ventas,
            transacciones,
            montoTotal,
            deudaActual,
        };
    }, [operaciones, cliente.deuda_pago_cliente]);

    // Obtener estado financiero
    const getEstadoFinanciero = (deuda: number | null) => {
        if (deuda === null || deuda === undefined) {
            return { tipo: 'sin-info', color: 'gray', icon: History, texto: 'Sin información' };
        }

        if (deuda > 0) {
            return {
                tipo: 'deuda',
                color: 'red',
                icon: AlertCircle,
                texto: 'Deuda pendiente',
                descripcion: 'El cliente tiene deuda con la empresa',
            };
        } else if (deuda < 0) {
            return {
                tipo: 'fondo',
                color: 'green',
                icon: ArrowDownCircle,
                texto: 'Fondo disponible',
                descripcion: 'La empresa tiene fondo con el cliente',
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

    const estado = getEstadoFinanciero(cliente.deuda_pago_cliente);
    const EstadoIcon = estado.icon;

    // Obtener icono para tipo de operación
    const getOperacionIcon = (tipo: string) => {
        switch (tipo) {
            case 'compra_pago':
                return ShoppingCart;
            case 'venta':
                return CreditCard;
            case 'gasto':
                return TrendingDown;
            case 'ingreso':
                return TrendingUp;
            case 'transferencia':
                return ArrowRightLeft;
            default:
                return FileText;
        }
    };

    // Obtener color para tipo de operación
    const getOperacionColor = (tipo: string) => {
        switch (tipo) {
            case 'compra_pago':
                return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'venta':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'gasto':
                return 'text-red-600 bg-red-50 border-red-200';
            case 'ingreso':
                return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            case 'transferencia':
                return 'text-purple-600 bg-purple-50 border-purple-200';
            default:
                return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    // Filtrar operaciones por tipo para las pestañas
    const operacionesFiltradas = useMemo(() => {
        switch (activeTab) {
            case 'todas':
                return operaciones;
            case 'compras':
                return operaciones.filter((op) => op.tipo === 'compra_pago');
            case 'ventas':
                return operaciones.filter((op) => op.tipo === 'venta');
            case 'transacciones':
                return operaciones.filter((op) => ['gasto', 'ingreso', 'transferencia'].includes(op.tipo));
            default:
                return operaciones.slice(0, 10); // Últimas 10 para resumen
        }
    }, [operaciones, activeTab]);

    return (
        <AppLayout breadcrumbs={breadcrumbs(cliente.nombre_cliente)}>
            <Head title={`Detalles: ${cliente.nombre_cliente}`} />
            <TooltipProvider>
                <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
                    {/* Header */}
                    <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-6">
                        <div className="flex items-center justify-between">
                            <HeadingSmall
                                title={`Cliente: ${cliente.nombre_cliente}`}
                                description="Información detallada y historial completo de operaciones"
                            />
                            <div className="flex items-center gap-3">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Link href={route('clientes.edit', { cliente: cliente.id })}>
                                            <Button variant="outline" className="flex items-center gap-2">
                                                <Edit3 size={16} />
                                                Editar
                                            </Button>
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Editar información del cliente</p>
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Link href={route('clientes.index')}>
                                            <Button variant="outline" className="flex items-center gap-2">
                                                <ArrowLeft size={16} />
                                                Volver
                                            </Button>
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Volver al listado de clientes</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    </div>

                    {/* Información Principal */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Tarjeta de Información del Cliente */}
                        <Card className="lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Información del Cliente
                                </CardTitle>
                                <CardDescription>Datos básicos y contacto</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <User className="text-muted-foreground h-4 w-4" />
                                        <span className="text-sm font-medium">ID:</span>
                                    </div>
                                    <Badge variant="outline">#{cliente.id}</Badge>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Building className="text-muted-foreground h-4 w-4" />
                                        <span className="text-sm font-medium">Tipo:</span>
                                    </div>
                                    <Badge
                                        variant={cliente.tipo_cliente === 'asociado' ? 'default' : 'secondary'}
                                        className={
                                            cliente.tipo_cliente === 'asociado'
                                                ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800/30 dark:text-green-500'
                                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800/30 dark:text-blue-500'
                                        }
                                    >
                                        {cliente.tipo_cliente === 'asociado' ? 'Asociado' : 'Físico'}
                                    </Badge>
                                </div>

                                {cliente.telefono_cliente && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Phone className="text-muted-foreground h-4 w-4" />
                                            <span className="text-sm font-medium">Teléfono:</span>
                                        </div>
                                        <span className="text-sm">{cliente.telefono_cliente}</span>
                                    </div>
                                )}

                                {cliente.ciudad_cliente && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="text-muted-foreground h-4 w-4" />
                                            <span className="text-sm font-medium">Ciudad:</span>
                                        </div>
                                        <span className="text-sm">{cliente.ciudad_cliente}</span>
                                    </div>
                                )}

                                {cliente.direccion_cliente && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Home className="text-muted-foreground h-4 w-4" />
                                            <span className="text-sm font-medium">Dirección:</span>
                                        </div>
                                        <span className="text-muted-foreground max-w-[120px] truncate text-xs">{cliente.direccion_cliente}</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Estado Financiero y Métricas */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Estado Financiero
                                </CardTitle>
                                <CardDescription>Resumen de la situación financiera con el cliente</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                                    {/* Estado Actual */}
                                    <Card
                                        className={`border-l-4 ${
                                            estado.color === 'red'
                                                ? 'border-l-red-500'
                                                : estado.color === 'green'
                                                  ? 'border-l-green-500'
                                                  : 'border-l-gray-500'
                                        }`}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <EstadoIcon
                                                    className={`h-4 w-4 ${
                                                        estado.color === 'red'
                                                            ? 'text-red-500'
                                                            : estado.color === 'green'
                                                              ? 'text-green-500'
                                                              : 'text-gray-500'
                                                    }`}
                                                />
                                                <span className="text-sm font-medium">Estado Actual</span>
                                            </div>
                                            <div
                                                className={`mt-2 text-2xl font-bold ${
                                                    estado.color === 'red'
                                                        ? 'text-red-600'
                                                        : estado.color === 'green'
                                                          ? 'text-green-600'
                                                          : 'text-gray-600'
                                                }`}
                                            >
                                                {formatearMoneda(cliente.deuda_pago_cliente)}
                                            </div>
                                            <p className="text-muted-foreground text-xs">{estado.texto}</p>
                                        </CardContent>
                                    </Card>

                                    {/* Total Operaciones */}
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <History className="h-4 w-4 text-blue-500" />
                                                <span className="text-sm font-medium">Total Operaciones</span>
                                            </div>
                                            <div className="mt-2 text-2xl font-bold text-blue-600">{metricas.totalOperaciones}</div>
                                            <p className="text-muted-foreground text-xs">Operaciones registradas</p>
                                        </CardContent>
                                    </Card>

                                    {/* Monto Total */}
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4 text-emerald-500" />
                                                <span className="text-sm font-medium">Monto Total</span>
                                            </div>
                                            <div className="mt-2 text-2xl font-bold text-emerald-600">{formatearMoneda(metricas.montoTotal)}</div>
                                            <p className="text-muted-foreground text-xs">En todas las operaciones</p>
                                        </CardContent>
                                    </Card>

                                    {/* Desglose */}
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-purple-500" />
                                                <span className="text-sm font-medium">Actividad</span>
                                            </div>
                                            <div className="mt-2 space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span>Compras:</span>
                                                    <span className="font-medium">{metricas.compras}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span>Ventas:</span>
                                                    <span className="font-medium">{metricas.ventas}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span>Transacciones:</span>
                                                    <span className="font-medium">{metricas.transacciones}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Historial de Operaciones */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Historial de Operaciones
                            </CardTitle>
                            <CardDescription>Todas las operaciones relacionadas con el cliente ordenadas por fecha</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="grid w-full grid-cols-5">
                                    <TabsTrigger value="resumen">Resumen</TabsTrigger>
                                    <TabsTrigger value="todas">Todas</TabsTrigger>
                                    <TabsTrigger value="compras">Compras</TabsTrigger>
                                    <TabsTrigger value="ventas">Ventas</TabsTrigger>
                                    <TabsTrigger value="transacciones">Transacciones</TabsTrigger>
                                </TabsList>

                                <TabsContent value={activeTab} className="space-y-4">
                                    <ScrollArea className="h-[400px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Operación</TableHead>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Descripción</TableHead>
                                                    <TableHead>Monto</TableHead>
                                                    <TableHead>Referencia</TableHead>
                                                    <TableHead>Detalles</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {operacionesFiltradas.length > 0 ? (
                                                    operacionesFiltradas.map((operacion, index) => {
                                                        const OperacionIcon = getOperacionIcon(operacion.tipo);
                                                        const colorClase = getOperacionColor(operacion.tipo);

                                                        return (
                                                            <TableRow key={index} className="hover:bg-muted/50">
                                                                <TableCell>
                                                                    <Badge variant="outline" className={`flex w-32 items-center gap-1 ${colorClase}`}>
                                                                        <OperacionIcon size={12} />
                                                                        {operacion.tipo === 'compra_pago'
                                                                            ? 'Pago Compra'
                                                                            : operacion.tipo === 'venta'
                                                                              ? 'Venta'
                                                                              : operacion.tipo}
                                                                    </Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex items-center gap-1">
                                                                        <Calendar size={12} className="text-muted-foreground" />
                                                                        <span className="text-sm">{formatearFecha(operacion.fecha)}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="max-w-[200px]">
                                                                        <span className="text-sm">{operacion.descripcion}</span>
                                                                        {operacion.detalles && (
                                                                            <div className="text-muted-foreground text-xs">
                                                                                {operacion.detalles.proveedor &&
                                                                                    `Proveedor: ${operacion.detalles.proveedor}`}
                                                                                {operacion.detalles.almacen &&
                                                                                    `Almacén: ${operacion.detalles.almacen}`}
                                                                                {operacion.detalles.vendedor &&
                                                                                    `Vendedor: ${operacion.detalles.vendedor}`}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div
                                                                        className={`flex items-center gap-1 ${
                                                                            operacion.monto < 0 ? 'text-red-600' : 'text-green-600'
                                                                        }`}
                                                                    >
                                                                        <span className="font-medium">
                                                                            {operacion.monto < 0 ? '-' : '+'}
                                                                            {formatearMoneda(Math.abs(operacion.monto))}
                                                                        </span>
                                                                        <span className="text-muted-foreground text-xs">{operacion.moneda}</span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <code className="bg-muted rounded px-2 py-1 text-xs">{operacion.referencia}</code>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Button variant="ghost" size="sm">
                                                                                <Eye size={14} />
                                                                            </Button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <div className="space-y-1 text-xs">
                                                                                <p>
                                                                                    <strong>Tipo:</strong> {operacion.tipo}
                                                                                </p>
                                                                                <p>
                                                                                    <strong>Monto:</strong> {formatearMoneda(operacion.monto)}
                                                                                </p>
                                                                                <p>
                                                                                    <strong>Moneda:</strong> {operacion.moneda}
                                                                                </p>
                                                                                {operacion.es_origen !== undefined && (
                                                                                    <p>
                                                                                        <strong>Dirección:</strong>{' '}
                                                                                        {operacion.es_origen ? 'Salida' : 'Entrada'}
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <History size={32} className="opacity-50" />
                                                                <p>No hay operaciones registradas</p>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>

                                    {/* Resumen de Filtro */}
                                    {operacionesFiltradas.length > 0 && (
                                        <div className="text-muted-foreground flex items-center justify-between text-sm">
                                            <span>
                                                Mostrando {operacionesFiltradas.length} operación{operacionesFiltradas.length !== 1 ? 'es' : ''}
                                                {activeTab !== 'todas' && ` de ${activeTab}`}
                                            </span>
                                            <span>Total: {formatearMoneda(operacionesFiltradas.reduce((sum, op) => sum + op.monto, 0))}</span>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </TooltipProvider>
        </AppLayout>
    );
}
