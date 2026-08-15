import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, CreditCard, HardDrive, Layers, Package, Palette, Store, Tag, Truck, Users, Wallet } from 'lucide-react';

interface Proveedor {
    id?: number;
    nombre_proveedor?: string;
}

interface Cliente {
    id?: number;
    nombre_cliente?: string;
}

interface Almacen {
    nombre_almacen: string;
}

interface CuentaPago {
    id: number;
    nombre_cuenta: string;
}

interface ClientePago {
    id: number;
    nombre_cliente: string;
}

interface Pago {
    tipo_pago: 'deuda_proveedor' | 'cuenta' | 'cliente';
    monto: number;
    cuenta: CuentaPago | null;
    cliente: ClientePago | null;
}

interface Compra {
    id: number;
    fecha_compra: string;
    total_compra: number;
    tipo_compra: string;
    proveedor?: Proveedor;
    cliente?: Cliente;
    pagos: Pago[];
}

interface ProductoPivot {
    cantidad: number;
    precio: number;
}

interface Producto {
    nombre_producto: string;
    marca_producto: string | null;
    modelo_producto: string | null;
    capacidad_producto: string | null;
    color_producto: string | null;
    codigo_producto: string;
    categoria: string | null;
    pivot: ProductoPivot;
    almacen: Almacen;
    es_producto_nuevo: boolean | null;
}

interface CompraShowProps {
    compra: Compra;
    productos: Producto[];
    success?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Compras', href: '/comprar' },
    { title: 'Detalle de Compra', href: '#' },
];

export default function CompraShow({ compra, productos, success }: CompraShowProps) {
    const formatCurrency = (amount: number) => `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

    const isDeuda = compra.tipo_compra === 'deuda_proveedor';
    const esProveedor = !!compra.proveedor?.nombre_proveedor;
    const esCliente = !!compra.cliente?.nombre_cliente;
    const nombrePersona = compra.proveedor?.nombre_proveedor || compra.cliente?.nombre_cliente || 'Sin registro';
    const tipoPersona = esProveedor ? 'Proveedor' : esCliente ? 'Cliente' : 'Proveedor';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Compra #${compra.id} - Completada`} />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header principal estilo HeadingSmall */}
                <div
                    className={cn(
                        'bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4',
                        isDeuda
                            ? 'from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30'
                            : 'from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30',
                    )}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <HeadingSmall
                                title={`Compra #${compra.id.toString().padStart(6, '0')} - ${isDeuda ? 'CRÉDITO' : 'CONTADO'}`}
                                description={formatDate(compra.fecha_compra)}
                            />
                        </div>
                        <Badge variant={isDeuda ? 'destructive' : 'default'} className="px-4 py-2 text-lg font-bold">
                            {formatCurrency(compra.total_compra)}
                        </Badge>
                    </div>
                    <CheckCircle2
                        size={70}
                        className={cn(
                            'pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40',
                            isDeuda ? 'text-amber-500' : 'text-emerald-500',
                        )}
                    />
                </div>

                <Separator />

                {/* Información del proveedor/cliente estilo card */}
                <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                {esProveedor ? <Truck className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold text-white">{tipoPersona}</CardTitle>
                                <CardDescription className="text-xs text-indigo-100">
                                    {esProveedor ? 'Proveedor externo registrado' : esCliente ? 'Cliente como proveedor' : 'Sin registro'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{nombrePersona}</p>
                            <div className="text-right">
                                <p className="text-sm text-gray-500 uppercase">Total</p>
                                <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(compra.total_compra)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabla de productos */}
                <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Package className="h-5 w-5" />
                            </div>
                            <div className="flex flex-1 items-center justify-between">
                                <CardTitle className="text-base font-semibold text-white">Productos Adquiridos</CardTitle>
                                <Badge variant="outline" className="border-white/30 bg-white/20 text-white backdrop-blur-sm">
                                    {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
                                </Badge>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-100 dark:bg-gray-800">
                                    <TableHead>Producto / Código</TableHead>
                                    <TableHead>Especificaciones</TableHead>
                                    <TableHead>Almacén</TableHead>
                                    <TableHead className="text-center">Cant.</TableHead>
                                    <TableHead className="text-right">P. Unit.</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {productos.map((p, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-semibold">
                                            <div className="flex items-center gap-2">
                                                <span>{p.nombre_producto}</span>
                                                {p.es_producto_nuevo && (
                                                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                                                        Nuevo
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="text-muted-foreground font-mono text-xs">{p.codigo_producto}</div>
                                            {p.categoria && (
                                                <Badge variant="outline" className="mt-1 text-xs font-normal">
                                                    {p.categoria}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {p.marca_producto || p.modelo_producto || p.capacidad_producto || p.color_producto ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {p.marca_producto && (
                                                        <Badge variant="secondary" className="font-normal">
                                                            <Tag />
                                                            <span className="text-muted-foreground">Marca:</span> {p.marca_producto}
                                                        </Badge>
                                                    )}
                                                    {p.modelo_producto && (
                                                        <Badge variant="secondary" className="font-normal">
                                                            <Layers />
                                                            <span className="text-muted-foreground">Modelo:</span> {p.modelo_producto}
                                                        </Badge>
                                                    )}
                                                    {p.capacidad_producto && (
                                                        <Badge variant="secondary" className="font-normal">
                                                            <HardDrive />
                                                            <span className="text-muted-foreground">Capacidad:</span> {p.capacidad_producto}
                                                        </Badge>
                                                    )}
                                                    {p.color_producto && (
                                                        <Badge variant="secondary" className="font-normal">
                                                            <Palette />
                                                            <span className="text-muted-foreground">Color:</span> {p.color_producto}
                                                        </Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">Sin especificaciones</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                <Store className="mr-1 h-3 w-3" />
                                                {p.almacen.nombre_almacen}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-bold">{p.pivot.cantidad}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(p.pivot.precio)}</TableCell>
                                        <TableCell className="text-right font-bold text-emerald-600">
                                            {formatCurrency(p.pivot.cantidad * p.pivot.precio)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <Separator />

                        {/* Footer con total */}
                        <div className="flex items-center justify-end bg-gray-50 p-6 dark:bg-gray-900/50">
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Total general</p>
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(compra.total_compra)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Detalles de Pago — cuentas/clientes de donde salió el dinero y cuánto puso cada uno */}
                {compra.pagos.length > 0 && (
                    <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-sky-600 to-sky-700 px-6 py-5 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <Wallet className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-semibold text-white">Detalles de Pago</CardTitle>
                                    <CardDescription className="text-xs text-sky-100">
                                        {compra.pagos.length} {compra.pagos.length === 1 ? 'fuente de pago' : 'fuentes de pago'}
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-5">
                            <div className="space-y-2">
                                {compra.pagos.map((pago, index) => {
                                    const nombre =
                                        pago.tipo_pago === 'cuenta'
                                            ? (pago.cuenta?.nombre_cuenta ?? 'Cuenta')
                                            : pago.tipo_pago === 'cliente'
                                              ? (pago.cliente?.nombre_cliente ?? 'Cliente')
                                              : 'Deuda con proveedor';

                                    return (
                                        <div key={index} className="flex items-center justify-between rounded-lg border p-3">
                                            <div className="flex items-center gap-2">
                                                {pago.tipo_pago === 'cuenta' ? (
                                                    <Wallet className="h-4 w-4 text-blue-600" />
                                                ) : pago.tipo_pago === 'cliente' ? (
                                                    <Users className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <CreditCard className="h-4 w-4 text-amber-600" />
                                                )}
                                                <span className="font-medium">{nombre}</span>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'text-xs',
                                                        pago.tipo_pago === 'cuenta'
                                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                                            : pago.tipo_pago === 'cliente'
                                                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
                                                    )}
                                                >
                                                    {pago.tipo_pago === 'cuenta' ? 'Cuenta' : pago.tipo_pago === 'cliente' ? 'Cliente' : 'Crédito'}
                                                </Badge>
                                            </div>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(pago.monto)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Nota final */}
                {success && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center text-green-800 dark:border-green-800/30 dark:bg-green-950/30 dark:text-green-300">
                        {success}
                    </div>
                )}

                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Los productos han sido registrados en el inventario y están disponibles en sus almacenes.
                </p>

                {/* Acciones de la página */}
                <div className="flex justify-center gap-4">
                    <Link href="/comprar">
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                            <Package className="mr-2 h-4 w-4" />
                            Nueva Compra
                        </Button>
                    </Link>
                    <Link href="/dashboard">
                        <Button variant="outline">Dashboard</Button>
                    </Link>
                </div>
            </div>
        </AppLayout>
    );
}
