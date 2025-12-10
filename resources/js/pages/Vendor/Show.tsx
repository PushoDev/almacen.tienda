import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { ArrowUp, Calendar, Coins, CreditCard, DollarSign, Hash, Package, Percent, Store, TrendingUp, User, UserCheck } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Ventas', href: '/punto-venta' },
    { title: 'Listado', href: '/ventas/listado' },
    { title: 'Detalle de Venta', href: '#' },
];

interface Pago {
    metodo: string;
    via?: string | null;
    cuenta: { nombre: string };
    referencia?: string | null;
    monto: number;
    monto_equivalente: number;
    tasa_cambio_aplicada?: number;
    moneda?: { id: number; codigo: string; simbolo: string; tasa_cambio?: number } | null;
}

interface Venta {
    id: number;
    almacen: { nombre: string };
    cliente: { nombre: string } | null;
    destinatario: any;
    items: any[];
    total: string;
    total_ganancia: string;
    ganancia_perdida_cambiaria: string;
    ganancia_real_total: string;
    fecha: string;
    usuario: { nombre: string };
    pagos: Pago[];
    estado: 'pendiente' | 'completada' | 'cancelada';
    moneda_principal: { simbolo: string };
    tasa_aplicada_venta?: number | null;
    moneda_cobro?: { tasa_cambio?: number } | null;
}

interface Props {
    venta: Venta;
}

const formatCurrency = (amount: string | number, symbol = '$') => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (
        new Intl.NumberFormat('es-CU', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num) +
        ' ' +
        symbol
    );
};

export default function DetalleVenta({ venta }: Props) {
    const esCompletada = venta.estado === 'completada';
    const gananciaExtra = parseFloat(venta.ganancia_perdida_cambiaria) > 0;

    // Detectar tasas usadas en pagos (excluyendo USD)
    const pagosConTasa = venta.pagos.filter((p) => p.moneda && p.moneda.codigo !== 'USD' && p.tasa_cambio_aplicada && p.tasa_cambio_aplicada > 1);
    const tasaTemporal = venta.tasa_aplicada_venta || pagosConTasa[0]?.tasa_cambio_aplicada || null;
    const monedaTasa = pagosConTasa[0]?.moneda;
    const tasaGeneral = monedaTasa?.tasa_cambio || 356;

    const tieneTasaTemporal = tasaTemporal && tasaTemporal > tasaGeneral;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Venta #${venta.id}`} />

            <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10">
                {/* CABECERA */}
                <Card className="border-border/50 bg-card border shadow-xl">
                    <CardHeader>
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h1 className="text-4xl font-bold tracking-tight">Venta #{venta.id}</h1>
                                <p className="text-muted-foreground mt-1">Detalle completo de la transacción</p>
                            </div>
                            <Badge
                                className={`px-8 py-3 text-lg font-bold ${esCompletada ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                            >
                                {esCompletada ? 'COMPLETADA' : 'PENDIENTE'}
                            </Badge>
                        </div>
                    </CardHeader>
                </Card>

                {/* TASA GENERAL vs TASA TEMPORAL - LO QUE TÚ QUIERES VER */}
                {tieneTasaTemporal && (
                    <Card className="border-2 border-orange-500/30 bg-gradient-to-br from-orange-50/50 to-amber-50/30 shadow-2xl dark:from-orange-950/40 dark:to-amber-950/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-4 text-2xl text-orange-700 dark:text-orange-400">
                                <Percent className="h-10 w-10" />
                                Tasas de Cambio Aplicadas en Esta Venta
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-10 md:grid-cols-2">
                            <div className="text-center">
                                <p className="text-muted-foreground mb-3 text-lg">Tasa General (Oficial del Sistema)</p>
                                <p className="text-foreground/80 text-7xl font-black">{tasaGeneral.toFixed(0)}</p>
                                <p className="text-muted-foreground mt-2 text-sm">{monedaTasa?.simbolo || 'CUP'} → 1 USD</p>
                            </div>
                            <div className="text-center">
                                <p className="text-muted-foreground mb-3 text-lg">Tasa Temporal (Calle - Cobrada)</p>
                                <div className="flex items-center justify-center gap-4">
                                    <p className="text-8xl font-black text-orange-600 dark:text-orange-400">{tasaTemporal.toFixed(0)}</p>
                                    <TrendingUp className="h-20 w-20 animate-pulse text-emerald-600" />
                                </div>
                                <p className="mt-4 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                    +{(tasaTemporal - tasaGeneral).toFixed(0)} más alta → ¡Ganaste extra!
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* GANANCIAS */}
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    <Card className="border-emerald-600/40 bg-gradient-to-br from-emerald-50 to-green-50 shadow-xl dark:from-emerald-950/40 dark:to-green-950/40">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-2xl text-emerald-700 dark:text-emerald-400">
                                <ArrowUp className="h-10 w-10" />
                                Ganancia Bruta (Productos)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-5xl font-extrabold text-emerald-700 dark:text-emerald-400">+{formatCurrency(venta.total_ganancia)}</p>
                        </CardContent>
                    </Card>

                    <Card
                        className={`${gananciaExtra ? 'border-emerald-600 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-xl dark:from-emerald-950/50 dark:to-teal-950/40' : 'border-border/50'}`}
                    >
                        <CardHeader>
                            <CardTitle
                                className={`flex items-center gap-3 text-2xl ${gananciaExtra ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}
                            >
                                <Coins className="h-10 w-10" />
                                Ganancia Extra por Tasa Calle
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p
                                className={`text-5xl font-extrabold ${gananciaExtra ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}
                            >
                                {gananciaExtra ? '+' : ''}
                                {formatCurrency(venta.ganancia_perdida_cambiaria)}
                            </p>
                            {gananciaExtra && (
                                <p className="mt-4 text-xl font-bold text-emerald-600 dark:text-emerald-400">¡Por cobrar a tasa más alta!</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-indigo-600/50 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-2xl dark:from-indigo-950/50 dark:to-purple-950/40">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-3xl text-indigo-700 dark:text-indigo-400">
                                <DollarSign className="h-12 w-12" />
                                GANANCIA REAL TOTAL
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-6xl font-extrabold text-indigo-700 dark:text-indigo-400">
                                {formatCurrency(venta.ganancia_real_total)}
                            </p>
                            <p className="mt-3 text-xl font-medium text-indigo-600 dark:text-indigo-400">Esto es lo que de verdad ganaste</p>
                        </CardContent>
                    </Card>
                </div>

                {/* PRODUCTOS */}
                <Card className="border-border/50 bg-card shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <Package className="h-7 w-7" />
                            Productos Vendidos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-center">Cant.</TableHead>
                                    <TableHead className="text-right">Precio</TableHead>
                                    <TableHead className="text-right">Costo</TableHead>
                                    <TableHead className="text-right">Ganancia</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {venta.items.map((item: any, i: number) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-medium">
                                            {item.producto.nombre}
                                            <br />
                                            <span className="text-muted-foreground text-sm">
                                                {item.producto.marca} • {item.producto.categoria}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center font-bold">{item.cantidad}</TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(item.precio_venta)}</TableCell>
                                        <TableCell className="text-muted-foreground text-right">{formatCurrency(item.costo_unitario)}</TableCell>
                                        <TableCell className="text-right font-bold text-emerald-600">+{formatCurrency(item.ganancia || 0)}</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(item.subtotal)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Separator className="my-6" />
                        <div className="space-y-3 text-right">
                            <p className="text-3xl font-bold">Total Venta: {formatCurrency(venta.total)}</p>
                            <p className="text-2xl font-bold text-emerald-600">Ganancia Bruta: +{formatCurrency(venta.total_ganancia)}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* PAGOS */}
                <Card className="border-border/50 bg-card shadow-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <CreditCard className="h-7 w-7" />
                            Formas de Pago
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {venta.pagos.map((pago, i) => (
                            <div key={i} className="bg-muted/30 flex items-center justify-between rounded-xl border p-6">
                                <div>
                                    <p className="text-xl font-bold">
                                        {pago.metodo.toUpperCase()} {pago.via && `(${pago.via})`}
                                    </p>
                                    <p className="text-muted-foreground">Cuenta: {pago.cuenta.nombre}</p>
                                    {pago.referencia && <p className="text-muted-foreground mt-1 text-xs">Ref: {pago.referencia}</p>}
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-bold">
                                        {pago.monto.toLocaleString()} {pago.moneda?.simbolo || 'CUP'}
                                    </p>
                                    {pago.tasa_cambio_aplicada && pago.tasa_cambio_aplicada > 1 && (
                                        <p className="text-lg font-semibold text-emerald-600">
                                            Tasa {pago.tasa_cambio_aplicada} → {formatCurrency(pago.monto_equivalente)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* INFO GENERAL */}
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {venta.destinatario && (
                        <Card className="border-border/50 bg-card shadow-xl">
                            <CardHeader className="bg-emerald-50/50 dark:bg-emerald-950/30">
                                <CardTitle className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                                    <UserCheck className="h-7 w-7" />
                                    Receptor Registrado
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-6 text-lg">
                                <p>
                                    <strong>Nombre:</strong> {venta.destinatario.nombre} {venta.destinatario.apellidos}
                                </p>
                                <p>
                                    <strong>CI:</strong> {venta.destinatario.carnet_identidad}
                                </p>
                                <p>
                                    <strong>Dirección:</strong> {venta.destinatario.direccion_residencia}
                                </p>
                                {venta.destinatario.telefono_contacto && (
                                    <p>
                                        <strong>Tel:</strong> {venta.destinatario.telefono_contacto}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card className="border-border/50 bg-card shadow-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <Hash className="h-7 w-7" />
                                Información General
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 text-lg">
                            <p>
                                <Calendar className="mr-2 inline h-5 w-5" /> {new Date(venta.fecha).toLocaleString('es-CU')}
                            </p>
                            <p>
                                <Store className="mr-2 inline h-5 w-5" /> {venta.almacen.nombre}
                            </p>
                            <p>
                                <User className="mr-2 inline h-5 w-5" /> {venta.cliente?.nombre || 'Mostrador'}
                            </p>
                            <p>
                                <UserCheck className="mr-2 inline h-5 w-5" /> {venta.usuario.nombre}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
