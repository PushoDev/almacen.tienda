import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Calendar, CheckCircle2, Package, ReceiptText, Store, Truck } from 'lucide-react';

interface Proveedor {
    nombre_proveedor: string;
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Compra #${compra.id} - Completada`} />

            <div className="container mx-auto max-w-5xl px-4 py-8">
                {/* Header de éxito premium */}
                <div className="mb-8 text-center">
                    <CheckCircle2 className="mx-auto h-16 w-16 text-green-600" />
                    <h1 className="mt-4 text-4xl font-bold text-gray-900 dark:text-white">¡Compra Registrada Exitosamente!</h1>
                    <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
                        Comprobante oficial de adquisición • #{compra.id.toString().padStart(6, '0')}
                    </p>
                </div>

                {success && (
                    <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-center text-green-800 dark:border-green-800/30 dark:bg-green-950/30 dark:text-green-300">
                        {success}
                    </div>
                )}

                <Card className="overflow-hidden border shadow-xl">
                    {/* Header del comprobante */}
                    <CardHeader className="bg-gradient-to-r from-emerald-600 to-green-700 px-8 py-6 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="flex items-center gap-3 text-2xl font-bold">
                                    <ReceiptText className="h-8 w-8" />
                                    COMPROBANTE DE COMPRA
                                </h2>
                                <p className="mt-1 opacity-90">Fecha de emisión: {formatDate(compra.fecha_compra)}</p>
                            </div>
                            <div className="text-right">
                                <Badge variant={isDeuda ? 'destructive' : 'default'} className="mb-2 px-4 py-2 text-lg font-semibold">
                                    {isDeuda ? 'CRÉDITO A PROVEEDOR' : 'PAGO DE CONTADO'}
                                </Badge>
                                <p className="mt-3 text-3xl font-bold">TOTAL: {formatCurrency(compra.total_compra)}</p>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {/* Información general en dos columnas */}
                        <div className="grid grid-cols-1 gap-0 md:grid-cols-3">
                            <div className="border-r bg-gray-50 p-6 dark:bg-gray-900/50">
                                <p className="text-sm font-semibold text-gray-600 uppercase dark:text-gray-400">Proveedor</p>
                                <div className="mt-2">
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                        {compra.proveedor?.nombre_proveedor || 'Sin proveedor registrado'}
                                    </p>
                                    <p className="flex items-center gap-2 text-sm text-gray-500">
                                        <Truck className="mr-1 h-4 w-4" /> Proveedor externo
                                    </p>
                                </div>
                            </div>

                            <div className="border-r p-6">
                                <p className="text-sm font-semibold text-gray-600 uppercase dark:text-gray-400">Fecha de compra</p>
                                <p className="mt-2 flex items-center gap-2 text-lg font-medium">
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                    {new Date(compra.fecha_compra).toLocaleDateString('es-MX')}
                                </p>
                                <p className="text-sm text-gray-500">
                                    Hora: {new Date(compra.fecha_compra).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>

                            <div className="bg-emerald-50 p-6 dark:bg-emerald-950/30">
                                <p className="text-sm font-semibold text-gray-600 uppercase dark:text-gray-400">Total registrado</p>
                                <p className="mt-2 text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">
                                    {formatCurrency(compra.total_compra)}
                                </p>
                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                                    {productos.length} {productos.length === 1 ? 'producto' : 'productos'} adquiridos
                                </p>
                            </div>
                        </div>

                        <Separator />

                        {/* Tabla de productos - Diseño tipo factura profesional */}
                        <div className="p-6">
                            <h3 className="mb-5 flex items-center gap-3 text-xl font-bold text-gray-800 dark:text-gray-200">
                                <Package className="h-6 w-6 text-emerald-600" />
                                Detalle de Productos Adquiridos
                            </h3>

                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-100 dark:bg-gray-800">
                                        <TableHead className="w-[30%]">Producto / Código</TableHead>
                                        <TableHead>Especificaciones</TableHead>
                                        <TableHead>Almacén Destino</TableHead>
                                        <TableHead className="text-center">Cant.</TableHead>
                                        <TableHead className="text-right">P. Unitario</TableHead>
                                        <TableHead className="text-right font-bold">Subtotal</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {productos.map((p, i) => (
                                        <TableRow key={i} className="hover:bg-muted/50">
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
                                                    <span className="text-muted-foreground">Sin especificaciones adicionales</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-medium">
                                                    <Store className="mr-1 h-3 w-3" />
                                                    {p.almacen.nombre_almacen}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center text-lg font-bold">{p.pivot.cantidad}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(p.pivot.precio)}</TableCell>
                                            <TableCell className="text-right text-lg font-bold text-emerald-700 dark:text-emerald-400">
                                                {formatCurrency(p.pivot.cantidad * p.pivot.precio)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Total final resaltado */}
                            <div className="mt-6 flex justify-end">
                                <div className="w-full max-w-md rounded-lg border bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-900/70">
                                    <div className="flex justify-between text-lg font-semibold">
                                        <span>Total de la compra:</span>
                                        <span className="text-2xl text-emerald-700 dark:text-emerald-400">{formatCurrency(compra.total_compra)}</span>
                                    </div>
                                    <Separator className="my-3" />
                                    <div className="text-muted-foreground flex justify-between text-sm">
                                        <span>Método:</span>
                                        <span className="font-medium">{isDeuda ? 'A crédito con proveedor' : 'Pago inmediato'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Footer con acciones */}
                        <div className="flex flex-col items-center justify-center gap-4 bg-gray-50 p-8 sm:flex-row dark:bg-gray-900/50">
                            <Link href="/comprar">
                                <Button
                                    size="lg"
                                    className="w-full cursor-pointer bg-emerald-600 font-semibold text-white hover:bg-emerald-700 sm:w-auto"
                                >
                                    <Package className="mr-2 h-5 w-5" />
                                    Realizar Nueva Compra
                                </Button>
                            </Link>
                            <Link href="/dashboard">
                                <Button size="lg" variant="outline" className="w-full cursor-pointer sm:w-auto">
                                    Volver al Dashboard
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

                {/* Nota final elegante */}
                <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    Esta compra ha sido registrada en el inventario general. Los productos ya están disponibles en sus respectivos almacenes.
                </p>
            </div>
        </AppLayout>
    );
}
