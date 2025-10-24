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
    Building,
    Calendar,
    CheckCircle,
    CreditCard,
    DollarSign,
    Edit3,
    Eye,
    History,
    Home,
    MapPin,
    Package,
    Phone,
    ShoppingCart,
    Store,
    User,
} from 'lucide-react';
import { useMemo, useState } from 'react';

// Definir tipos para las compras del cliente
interface CompraCliente {
    id: number;
    fecha_compra: string;
    total_compra: number;
    tipo_compra: string;
    proveedor: {
        id: number;
        nombre_proveedor: string;
    };
    productos: Array<{
        id: number;
        nombre_producto: string;
        codigo_producto?: string;
        pivot: {
            cantidad: number;
            precio: number;
            almacen_id: number;
        };
    }>;
    pagos: Array<{
        id: number;
        tipo_pago: string;
        monto: number;
        cuenta?: {
            id: number;
            nombre_cuenta: string;
        };
        cliente?: {
            id: number;
            nombre_cliente: string;
        };
    }>;
    pivot: {
        monto: number;
        tipo_pago: string;
    };
}

interface ShowClientePageProps {
    cliente: ClienteProps & {
        compras_como_pagador?: CompraCliente[];
    };
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

export default function ShowClientePage({ cliente }: ShowClientePageProps) {
    const [activeTab, setActiveTab] = useState('resumen');

    // ✅ CORREGIDO: Acepta number | null | undefined
    const formatearMoneda = (valor: number | null | undefined) => {
        if (valor === null || valor === undefined) return '$0.00';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(valor);
    };

    const formatearFecha = (fecha: string) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Calcular métricas basadas en las compras como pagador
    const metricas = useMemo(() => {
        const compras = cliente.compras_como_pagador || [];
        const totalCompras = compras.length;
        const montoTotalAportado = compras.reduce((sum, compra) => sum + compra.pivot.monto, 0);
        const montoTotalCompras = compras.reduce((sum, compra) => sum + compra.total_compra, 0);

        // ✅ CORREGIDO: Manejar null/undefined
        const deudaActual = cliente.deuda_pago_cliente ?? 0;

        return {
            totalCompras,
            montoTotalAportado,
            montoTotalCompras,
            deudaActual,
            comprasConProveedor: Array.from(new Set(compras.map((c) => c.proveedor.nombre_proveedor))).length,
        };
    }, [cliente.compras_como_pagador, cliente.deuda_pago_cliente]);

    // ✅ CORREGIDO: Acepta number | null | undefined
    const getEstadoFinanciero = (deuda: number | null | undefined) => {
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

    // ✅ CORREGIDO: Pasar el valor correcto (puede ser null/undefined)
    const estado = getEstadoFinanciero(cliente.deuda_pago_cliente);
    const EstadoIcon = estado.icon;

    console.log('Cliente data:', cliente);
    console.log('Compras como pagador:', cliente.compras_como_pagador);
    console.log('Métricas calculadas:', metricas);
    console.log('Active tab:', activeTab);

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
                                description="Información detallada e historial de compras como método de pago"
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
                                                {/* ✅ CORREGIDO: Pasar valor que puede ser null/undefined */}
                                                {formatearMoneda(cliente.deuda_pago_cliente)}
                                            </div>
                                            <p className="text-muted-foreground text-xs">{estado.texto}</p>
                                        </CardContent>
                                    </Card>

                                    {/* Total Compras */}
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <ShoppingCart className="h-4 w-4 text-blue-500" />
                                                <span className="text-sm font-medium">Compras Participadas</span>
                                            </div>
                                            <div className="mt-2 text-2xl font-bold text-blue-600">{metricas.totalCompras}</div>
                                            <p className="text-muted-foreground text-xs">Como método de pago</p>
                                        </CardContent>
                                    </Card>

                                    {/* Monto Total Aportado */}
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-4 w-4 text-emerald-500" />
                                                <span className="text-sm font-medium">Monto Aportado</span>
                                            </div>
                                            <div className="mt-2 text-2xl font-bold text-emerald-600">
                                                {formatearMoneda(metricas.montoTotalAportado)}
                                            </div>
                                            <p className="text-muted-foreground text-xs">En compras</p>
                                        </CardContent>
                                    </Card>

                                    {/* Desglose */}
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-2">
                                                <Store className="h-4 w-4 text-purple-500" />
                                                <span className="text-sm font-medium">Actividad</span>
                                            </div>
                                            <div className="mt-2 space-y-1">
                                                <div className="flex justify-between text-xs">
                                                    <span>Total Compras:</span>
                                                    <span className="font-medium">{formatearMoneda(metricas.montoTotalCompras)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span>Proveedores:</span>
                                                    <span className="font-medium">{metricas.comprasConProveedor}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span>Participación:</span>
                                                    <span className="font-medium">
                                                        {metricas.montoTotalCompras > 0
                                                            ? ((metricas.montoTotalAportado / metricas.montoTotalCompras) * 100).toFixed(1)
                                                            : 0}
                                                        %
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Historial de Compras como Pagador */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5" />
                                Compras como Método de Pago
                            </CardTitle>
                            <CardDescription>Historial de compras en las que este cliente ha sido utilizado como método de pago</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {/* ✅ CORREGIDO: Tabs con estructura correcta */}
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="resumen">Resumen General</TabsTrigger>
                                    <TabsTrigger value="detalles">Detalles de Compras</TabsTrigger>
                                </TabsList>

                                {/* ✅ CORREGIDO: TabsContent separados para cada pestaña */}
                                <TabsContent value="resumen" className="space-y-4">
                                    <ScrollArea className="h-[400px]">
                                        <div className="space-y-4">
                                            {cliente.compras_como_pagador && cliente.compras_como_pagador.length > 0 ? (
                                                cliente.compras_como_pagador.map((compra) => (
                                                    <Card key={compra.id} className="bg-muted/50">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-start justify-between">
                                                                <div className="space-y-2">
                                                                    <div className="flex items-center gap-3">
                                                                        <Badge variant="secondary">Compra #{compra.id}</Badge>
                                                                        <span className="text-muted-foreground text-sm">
                                                                            {formatearFecha(compra.fecha_compra)}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-semibold">{compra.proveedor.nombre_proveedor}</p>
                                                                        <p className="text-muted-foreground text-sm">
                                                                            Total: {formatearMoneda(compra.total_compra)}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center gap-4 text-sm">
                                                                        <span className="flex items-center gap-1">
                                                                            <Package size={14} />
                                                                            {compra.productos.length} producto(s)
                                                                        </span>
                                                                        <span className="flex items-center gap-1 text-green-600">
                                                                            <DollarSign size={14} />
                                                                            Aportó: {formatearMoneda(compra.pivot.monto)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <Badge
                                                                    variant={compra.tipo_compra === 'pago_cash' ? 'default' : 'outline'}
                                                                    className={
                                                                        compra.tipo_compra === 'pago_cash'
                                                                            ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                                                            : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                                                                    }
                                                                >
                                                                    {compra.tipo_compra === 'pago_cash' ? 'Pago Inmediato' : 'Deuda Proveedor'}
                                                                </Badge>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))
                                            ) : (
                                                <div className="text-muted-foreground py-8 text-center">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <ShoppingCart size={32} className="opacity-50" />
                                                        <p>No hay compras registradas como método de pago</p>
                                                        <p className="text-sm">
                                                            Las compras en las que este cliente sea utilizado como método de pago aparecerán aquí
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>

                                    {/* Resumen */}
                                    {cliente.compras_como_pagador && cliente.compras_como_pagador.length > 0 && (
                                        <div className="text-muted-foreground flex items-center justify-between text-sm">
                                            <span>
                                                Mostrando {cliente.compras_como_pagador.length} compra
                                                {cliente.compras_como_pagador.length !== 1 ? 's' : ''}
                                            </span>
                                            <span>Total aportado: {formatearMoneda(metricas.montoTotalAportado)}</span>
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="detalles" className="space-y-4">
                                    <ScrollArea className="h-[600px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Compra</TableHead>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Proveedor</TableHead>
                                                    <TableHead>Total Compra</TableHead>
                                                    <TableHead>Monto Aportado</TableHead>
                                                    <TableHead>Productos</TableHead>
                                                    <TableHead>Métodos de Pago</TableHead>
                                                    <TableHead>Detalles</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {cliente.compras_como_pagador && cliente.compras_como_pagador.length > 0 ? (
                                                    cliente.compras_como_pagador.map((compra) => (
                                                        <TableRow key={compra.id} className="hover:bg-muted/50">
                                                            <TableCell>
                                                                <Badge variant="outline">#{compra.id}</Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1">
                                                                    <Calendar size={12} className="text-muted-foreground" />
                                                                    <span className="text-sm">{formatearFecha(compra.fecha_compra)}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm font-medium">{compra.proveedor.nombre_proveedor}</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="font-medium">{formatearMoneda(compra.total_compra)}</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="font-medium text-green-600">
                                                                    {formatearMoneda(compra.pivot.monto)}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                            <Package size={14} />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <div className="space-y-1 text-xs">
                                                                            {compra.productos.map((producto) => (
                                                                                <div key={producto.id} className="flex justify-between gap-2">
                                                                                    <span>{producto.nombre_producto}</span>
                                                                                    <span>
                                                                                        {producto.pivot.cantidad} x{' '}
                                                                                        {formatearMoneda(producto.pivot.precio)}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                                            <CreditCard size={14} />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <div className="space-y-1 text-xs">
                                                                            {compra.pagos.map((pago) => (
                                                                                <div key={pago.id} className="flex justify-between gap-2">
                                                                                    {pago.tipo_pago === 'cliente' ? (
                                                                                        <span>Cliente: {pago.cliente?.nombre_cliente}</span>
                                                                                    ) : pago.tipo_pago === 'cuenta' ? (
                                                                                        <span>Cuenta: {pago.cuenta?.nombre_cuenta}</span>
                                                                                    ) : (
                                                                                        <span>Deuda Proveedor</span>
                                                                                    )}
                                                                                    <span>{formatearMoneda(pago.monto)}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
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
                                                                                <strong>Tipo:</strong> {compra.tipo_compra}
                                                                            </p>
                                                                            <p>
                                                                                <strong>Proveedor:</strong> {compra.proveedor.nombre_proveedor}
                                                                            </p>
                                                                            <p>
                                                                                <strong>Total:</strong> {formatearMoneda(compra.total_compra)}
                                                                            </p>
                                                                            <p>
                                                                                <strong>Aportado:</strong> {formatearMoneda(compra.pivot.monto)}
                                                                            </p>
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <ShoppingCart size={32} className="opacity-50" />
                                                                <p>No hay compras registradas como método de pago</p>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>

                                    {/* Resumen */}
                                    {cliente.compras_como_pagador && cliente.compras_como_pagador.length > 0 && (
                                        <div className="text-muted-foreground flex items-center justify-between text-sm">
                                            <span>
                                                Mostrando {cliente.compras_como_pagador.length} compra
                                                {cliente.compras_como_pagador.length !== 1 ? 's' : ''}
                                            </span>
                                            <span>Total aportado: {formatearMoneda(metricas.montoTotalAportado)}</span>
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
