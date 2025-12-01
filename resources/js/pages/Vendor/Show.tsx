import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    Calendar,
    CheckCircle,
    Coins,
    CreditCard,
    DollarSign,
    Hash,
    Home,
    IdCard,
    MapPin,
    Package,
    Percent,
    Phone,
    Receipt,
    ShoppingBag,
    Store,
    TrendingDown,
    TrendingUp,
    User,
    UserCheck,
    Users,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Ventas', href: '/punto-venta' },
    { title: 'Listado', href: '/listado-ventas' },
    { title: 'Detalle de Venta', href: '#' },
];

// Interfaces actualizadas
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
interface MonedaInfo {
    id: number;
    codigo: string;
    nombre: string;
    simbolo: string;
}
interface Pago {
    metodo: string;
    moneda: MonedaInfo | null;
    monto: number;
    via: string | null;
    tasa_cambio: number;
    monto_equivalente: number;
    cuenta: { id: number; nombre: string; moneda: MonedaInfo | null };
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
    moneda_principal: MonedaInfo | null;
    tasa_cambio_principal: number;
    // NUEVOS CAMPOS CLAVE
    tasa_aplicada_venta: number | null;
    moneda_cobro: MonedaInfo | null;
    monto_diferencia_cambiaria: number | null;
}

interface Props {
    venta: Venta;
}

// Badge de diferencia cambiaria (reutilizable)
const DiferenciaCambiariaBadge = ({ monto, simbolo }: { monto: number | null; simbolo: string }) => {
    if (!monto || monto === 0) {
        return (
            <div className="text-muted-foreground flex items-center gap-2">
                <Coins className="h-5 w-5" />
                <span>Tasa oficial aplicada</span>
            </div>
        );
    }

    const esGanancia = monto > 0;

    return (
        <div className={`flex flex-col gap-1 ${esGanancia ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            <div className="flex items-center gap-2 text-2xl font-bold">
                {esGanancia ? <TrendingUp className="h-7 w-7" /> : <TrendingDown className="h-7 w-7" />}
                {simbolo}
                {Math.abs(monto).toFixed(2)}
            </div>
            <span className="text-sm font-medium">{esGanancia ? '¡Ganancia extra por tasa!' : 'Pérdida por tasa baja'}</span>
        </div>
    );
};

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
    <Card>
        <CardContent className="flex items-center justify-between p-5">
            <div>
                <p className="text-muted-foreground text-sm">{title}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
            <div className={`rounded-full p-3 ${bgColor}`}>
                <Icon className={`h-6 w-6 ${color}`} />
            </div>
        </CardContent>
    </Card>
);

export default function DetalleVenta({ venta }: Props) {
    const [currentVenta] = useState<Venta>(venta);

    const formatDate = (dateString: string) =>
        new Date(dateString).toLocaleString('es-CU', {
            dateStyle: 'long',
            timeStyle: 'short',
        });

    const formatCurrency = (amount: number, currency = 'USD') => new Intl.NumberFormat('es-CU', { style: 'currency', currency }).format(amount);

    const simboloPrincipal = currentVenta.moneda_principal?.simbolo || '$';
    const simboloCobro = currentVenta.moneda_cobro?.simbolo || 'CUP';

    const estadoConfig = {
        pendiente: { color: 'bg-yellow-500', text: 'Pendiente', icon: AlertTriangle },
        completada: { color: 'bg-green-600', text: 'Completada', icon: CheckCircle },
        cancelada: { color: 'bg-red-600', text: 'Anulada', icon: XCircle },
    }[currentVenta.estado] || { color: 'bg-gray-500', text: 'Desconocido', icon: AlertTriangle };

    const EstadoIcon = estadoConfig.icon;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Venta #${currentVenta.id} - Detalle`} />

            <div className="flex flex-col gap-6 p-4 sm:p-6">
                {/* Header con estado */}
                <Card className="border-primary/10 overflow-hidden border-2">
                    <CardHeader className="relative">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-3xl font-bold">Venta #{currentVenta.id}</CardTitle>
                                <p className="text-muted-foreground">Detalle completo de la transacción</p>
                            </div>
                            <Badge className={`flex items-center gap-2 px-6 py-3 text-lg text-white ${estadoConfig.color}`}>
                                <EstadoIcon className="h-5 w-5" />
                                {estadoConfig.text}
                            </Badge>
                        </div>
                        <ShoppingBag className="text-primary/5 absolute -right-6 -bottom-6 h-32 w-32" />
                    </CardHeader>
                </Card>

                {/* DIFERENCIA CAMBIARIA DESTACADA */}
                {currentVenta.moneda_cobro && (
                    <Card
                        className={`border-2 ${currentVenta.monto_diferencia_cambiaria && currentVenta.monto_diferencia_cambiaria > 0 ? 'border-green-500/50' : currentVenta.monto_diferencia_cambiaria && currentVenta.monto_diferencia_cambiaria < 0 ? 'border-red-500/50' : 'border-primary/20'}`}
                    >
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <Percent className="h-6 w-6" />
                                Control de Tasa de Cambio
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            <div className="space-y-2">
                                <p className="text-muted-foreground text-sm">Moneda de cobro</p>
                                <p className="text-2xl font-bold">
                                    {currentVenta.moneda_cobro.nombre} ({simboloCobro})
                                </p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-muted-foreground text-sm">Tasa oficial</p>
                                <p className="text-2xl font-bold">{currentVenta.moneda_cobro.tasa_cambio ?? 'N/A'}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-muted-foreground text-sm">Tasa aplicada al cliente</p>
                                <p className="text-primary text-2xl font-bold">{currentVenta.tasa_aplicada_venta?.toFixed(4) || 'No registrada'}</p>
                            </div>
                        </CardContent>
                        <Separator />
                        <CardContent className="pt-6">
                            <DiferenciaCambiariaBadge monto={currentVenta.monto_diferencia_cambiaria} simbolo={simboloCobro} />
                        </CardContent>
                    </Card>
                )}

                {/* Stats principales */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                    <StatCard
                        title="Ganancia Bruta"
                        value={formatCurrency(currentVenta.total_ganancia, simboloPrincipal)}
                        icon={ArrowUp}
                        color="text-green-600"
                        bgColor="bg-green-50"
                    />
                    <StatCard
                        title="Total Esperado"
                        value={formatCurrency(currentVenta.total_esperado_usd || 0, simboloPrincipal)}
                        icon={Receipt}
                        color="text-blue-600"
                        bgColor="bg-blue-50"
                    />
                    <StatCard
                        title="Total Cobrado"
                        value={formatCurrency(currentVenta.total_pagado, simboloPrincipal)}
                        icon={DollarSign}
                        color="text-emerald-600"
                        bgColor="bg-emerald-50"
                    />
                    <StatCard
                        title="Ganancia Cambiaria"
                        value={formatCurrency(currentVenta.ganancia_perdida_cambiaria, simboloPrincipal)}
                        icon={currentVenta.ganancia_perdida_cambiaria >= 0 ? ArrowUp : ArrowDown}
                        color={currentVenta.ganancia_perdida_cambiaria >= 0 ? 'text-green-600' : 'text-red-600'}
                        bgColor={currentVenta.ganancia_perdida_cambiaria >= 0 ? 'bg-green-50' : 'bg-red-50'}
                    />
                    <StatCard
                        title="Ganancia Neta Total"
                        value={formatCurrency(currentVenta.ganancia_real_total, simboloPrincipal)}
                        icon={CheckCircle}
                        color="text-indigo-600"
                        bgColor="bg-indigo-50"
                    />
                </div>

                {/* Productos + Receptor */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5" /> Productos Vendidos
                                </CardTitle>
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
                                        {currentVenta.items.map((item, i) => (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium">
                                                    {item.producto.nombre}
                                                    <span className="text-muted-foreground block text-sm">{item.producto.marca}</span>
                                                </TableCell>
                                                <TableCell className="text-center font-bold">{item.cantidad}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.precio_venta, simboloPrincipal)}</TableCell>
                                                <TableCell className="text-right font-bold text-green-600">
                                                    +{formatCurrency(item.ganancia, simboloPrincipal)}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">
                                                    {formatCurrency(item.subtotal, simboloPrincipal)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {currentVenta.destinatario && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5" /> Receptor del Producto
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                                    <div className="flex gap-3">
                                        <User className="mt-0.5 h-4 w-4" />{' '}
                                        <div>
                                            <strong>Nombre:</strong> {currentVenta.destinatario.nombre} {currentVenta.destinatario.apellidos}
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <IdCard className="mt-0.5 h-4 w-4" />{' '}
                                        <div>
                                            <strong>CI:</strong> {currentVenta.destinatario.carnet_identidad}
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Phone className="mt-0.5 h-4 w-4" />{' '}
                                        <div>
                                            <strong>Teléfono:</strong> {currentVenta.destinatario.telefono_contacto || 'No registrado'}
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Home className="mt-0.5 h-4 w-4" />{' '}
                                        <div>
                                            <strong>Parentesco:</strong> {currentVenta.destinatario.parentesco_cliente || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="flex gap-3 md:col-span-2">
                                        <MapPin className="mt-0.5 h-4 w-4" />{' '}
                                        <div>
                                            <strong>Dirección:</strong> {currentVenta.destinatario.direccion_residencia}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Pagos + Info general */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" /> Formas de Pago
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {currentVenta.pagos.map((pago, i) => (
                                    <div key={i} className="rounded-lg border p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-bold">
                                                    {pago.metodo.charAt(0).toUpperCase() + pago.metodo.slice(1)} {pago.via && `(${pago.via})`}
                                                </p>
                                                <p className="text-muted-foreground text-sm">Cuenta: {pago.cuenta.nombre}</p>
                                                {pago.referencia && <p className="text-muted-foreground text-xs">Ref: {pago.referencia}</p>}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold">{formatCurrency(pago.monto, pago.moneda?.simbolo || '')}</p>
                                                <p className="text-sm text-green-600">= {formatCurrency(pago.monto_equivalente, simboloPrincipal)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <Separator className="my-4" />
                                <div className="space-y-2 text-right">
                                    <p className="text-muted-foreground">
                                        Total venta: <span className="text-lg font-bold">{formatCurrency(currentVenta.total, simboloPrincipal)}</span>
                                    </p>
                                    <p className="font-bold text-green-600">Pagado: {formatCurrency(currentVenta.total_pagado, simboloPrincipal)}</p>
                                    <p className={currentVenta.restante > 0 ? 'text-red-600' : 'text-green-600'}>
                                        {currentVenta.restante > 0 ? 'Falta' : 'Completo'}: {formatCurrency(currentVenta.restante, simboloPrincipal)}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Hash className="h-5 w-5" /> Información General
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex gap-3">
                                    <Calendar className="text-muted-foreground h-4 w-4" />{' '}
                                    <span>
                                        <strong>Fecha:</strong> {formatDate(currentVenta.fecha)}
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    <Store className="text-muted-foreground h-4 w-4" />{' '}
                                    <span>
                                        <strong>Almacén:</strong> {currentVenta.almacen.nombre}
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    <User className="text-muted-foreground h-4 w-4" />{' '}
                                    <span>
                                        <strong>Cliente:</strong> {currentVenta.cliente?.nombre || 'Mostrador'}
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    <UserCheck className="text-muted-foreground h-4 w-4" />{' '}
                                    <span>
                                        <strong>Vendedor:</strong> {currentVenta.usuario.nombre}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
