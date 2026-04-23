import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle2, Package, Store, Truck, Users } from 'lucide-react';

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

interface Compra {
    id: number;
    fecha_compra: string;
    total_compra: number;
    tipo_compra: string;
    proveedor?: Proveedor;
    cliente?: Cliente;
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
    codigo_producto: string;
    pivot: ProductoPivot;
    almacen: Almacen;
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
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sidebar-accent flex items-center gap-2">
                            {esProveedor ? <Truck className="h-5 w-5" /> : <Users className="h-5 w-5" />}
                            {tipoPersona}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{nombrePersona}</p>
                                <p className="text-sm text-gray-500">
                                    {esProveedor ? 'Proveedor externo registrado' : esCliente ? 'Cliente como proveedor' : 'Sin registro'}
                                </p>
                            </div>
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
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Productos Adquiridos
                            <Badge variant="outline" className="ml-auto">
                                {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
                            </Badge>
                        </CardTitle>
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
                                            <div>{p.nombre_producto}</div>
                                            <div className="text-muted-foreground font-mono text-xs">{p.codigo_producto}</div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {p.marca_producto && (
                                                <div>
                                                    • Marca: <span className="font-medium">{p.marca_producto}</span>
                                                </div>
                                            )}
                                            {p.modelo_producto && (
                                                <div>
                                                    • Modelo: <span className="font-medium">{p.modelo_producto}</span>
                                                </div>
                                            )}
                                            {p.capacidad_producto && (
                                                <div>
                                                    • Capacidad: <span className="font-medium">{p.capacidad_producto}</span>
                                                </div>
                                            )}
                                            {!p.marca_producto && !p.modelo_producto && !p.capacidad_producto && (
                                                <span className="text-muted-foreground">Sin specs</span>
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

                        {/* Footer con totales */}
                        <div className="flex items-center justify-between bg-gray-50 p-6 dark:bg-gray-900/50">
                            <div className="flex gap-4">
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
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Total general</p>
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(compra.total_compra)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Nota final */}
                {success && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center text-green-800 dark:border-green-800/30 dark:bg-green-950/30 dark:text-green-300">
                        {success}
                    </div>
                )}

                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    Los productos han sido registrados en el inventario y están disponibles en sus almacenes.
                </p>
            </div>
        </AppLayout>
    );
}
