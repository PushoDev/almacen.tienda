import { Badge } from '@/components/ui/badge'; // Importamos Badge para tipos de compra
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'; // Importamos componentes de tabla
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle, Package, Receipt, Warehouse } from 'lucide-react';

// Definir interfaces para los tipos
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
    marca_producto: string | null; // Nuevo
    modelo_producto: string | null; // Nuevo
    capacidad_producto: string | null; // Nuevo
    codigo_producto: string; // Aseguramos que el código está aquí
    pivot: ProductoPivot;
    almacen: Almacen;
    categoria: string;
}

interface CompraShowProps {
    compra: Compra;
    productos: Producto[];
    success?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Caja Principal',
        href: '/dashboard',
    },
    {
        title: 'Productos',
        href: '/productos',
    },
    {
        title: 'Adquirir Nuevos Productos',
        href: '/comprar',
    },
    {
        title: 'Reporte de Compra',
        href: '#',
    },
];

export default function CompraShow({ compra, productos, success }: CompraShowProps) {
    const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

    const getTipoCompraBadge = (tipo: string) => {
        if (tipo === 'deuda_proveedor') {
            return <Badge variant="destructive">Deuda a Proveedor</Badge>;
        }
        return (
            <Badge variant="default" className="bg-green-600 hover:bg-green-600">
                Pago Inmediato
            </Badge>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Compra #${compra.id}`} />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="container mx-auto py-8">
                    <Card className="mx-auto max-w-4xl shadow-lg dark:shadow-xl dark:shadow-gray-700/50">
                        <CardHeader className="rounded-t-lg border-b bg-green-50 text-center dark:bg-green-900/10">
                            <CheckCircle className="mx-auto mb-2 h-12 w-12 text-green-600" />
                            <CardTitle className="text-3xl text-green-800 dark:text-green-400">¡Compra Realizada con Éxito!</CardTitle>
                            <CardDescription className="text-gray-600 dark:text-gray-400">
                                Los detalles de la adquisición han sido registrados bajo el número **#{compra.id}**.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-8 p-6">
                            {success && (
                                <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                                    {success}
                                </div>
                            )}

                            {/* Sección de Datos Generales (Más compacta y legible) */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="rounded-lg border p-3 dark:border-gray-700">
                                    <Receipt className="mr-2 inline h-5 w-5 text-blue-500" />
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">No. de Compra:</span>
                                    <p className="ml-7 text-lg font-bold">{compra.id}</p>
                                </div>
                                <div className="rounded-lg border p-3 dark:border-gray-700">
                                    <Warehouse className="mr-2 inline h-5 w-5 text-orange-500" />
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Proveedor:</span>
                                    <p className="ml-7 text-lg font-bold">{compra.proveedor?.nombre_proveedor ?? 'N/A'}</p>
                                </div>
                                <div className="rounded-lg border p-3 dark:border-gray-700">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Fecha:</span>
                                    <p className="ml-7 text-lg font-bold">{new Date(compra.fecha_compra).toLocaleDateString()}</p>
                                </div>
                                <div className="rounded-lg border p-3 dark:border-gray-700">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Total:</span>
                                    <p className="ml-7 text-xl font-extrabold text-red-600 dark:text-red-400">
                                        {formatCurrency(compra.total_compra)}
                                    </p>
                                </div>
                                <div className="col-span-1 rounded-lg border p-3 text-center md:col-span-2">
                                    <span className="mr-2 font-semibold text-gray-700 dark:text-gray-300">Estado de Pago:</span>
                                    {getTipoCompraBadge(compra.tipo_compra)}
                                </div>
                            </div>

                            {/* Sección de Productos Comprados (Uso de Tabla para mejor UI) */}
                            <div className="mt-8">
                                <h3 className="mb-4 flex items-center text-xl font-bold text-gray-800 dark:text-gray-200">
                                    <Package className="mr-2 h-6 w-6" /> Productos Adquiridos
                                </h3>

                                <div className="overflow-x-auto rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-800">
                                                <TableHead>Producto/Código</TableHead>
                                                <TableHead>Especificación</TableHead>
                                                <TableHead>Almacén</TableHead>
                                                <TableHead className="text-right">Cantidad</TableHead>
                                                <TableHead className="text-right">P. Unitario</TableHead>
                                                <TableHead className="text-right">Importe</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {productos.map((producto: Producto, index: number) => (
                                                <TableRow key={index} className="hover:bg-gray-100 dark:hover:bg-gray-800/50">
                                                    <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                                                        <div className="flex flex-col">
                                                            <span>{producto.nombre_producto}</span>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                {producto.codigo_producto}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col text-sm text-gray-600 dark:text-gray-400">
                                                            <span>**Marca:** {producto.marca_producto || 'N/A'}</span>
                                                            <span>**Modelo:** {producto.modelo_producto || 'N/A'}</span>
                                                            <span>**Capacidad:** {producto.capacidad_producto || 'N/A'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                                        {producto.almacen.nombre_almacen}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">{producto.pivot.cantidad}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(producto.pivot.precio)}</TableCell>
                                                    <TableCell className="text-right text-lg font-bold text-red-600 dark:text-red-400">
                                                        {formatCurrency(producto.pivot.cantidad * producto.pivot.precio)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Botones de Acción */}
                            <div className="mt-10 flex justify-center gap-4 border-t pt-6 dark:border-gray-700">
                                <Link href="/comprar">
                                    <Button className="cursor-pointer bg-blue-600 text-white hover:bg-blue-700">Realizar Otra Compra</Button>
                                </Link>
                                <Link href="/dashboard">
                                    <Button className="cursor-pointer" variant="outline">
                                        Regresar a la Caja
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
