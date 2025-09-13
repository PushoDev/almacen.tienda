import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle } from 'lucide-react';

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
    pivot: ProductoPivot;
    almacen: Almacen; // Agregar la propiedad 'almacen' al producto
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
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Compras" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Reporte Compra */}

                <div className="container mx-auto py-8">
                    <Card className="mx-auto max-w-2xl">
                        <CardHeader className="text-center">
                            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
                            <CardTitle className="text-2xl">¡Compra Realizada con Éxito!</CardTitle>
                            <CardDescription>La compra ha sido registrada correctamente en el sistema.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {success && <div className="rounded-md bg-green-100 p-3 text-green-800">{success}</div>}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold">Número de Compra</h3>
                                    <p>{compra.id}</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Fecha</h3>
                                    <p>{new Date(compra.fecha_compra).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Proveedor</h3>
                                    <p>{compra.proveedor?.nombre_proveedor}</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Total</h3>
                                    <p>${compra.total_compra}</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Tipo de Compra</h3>
                                    <p>{compra.tipo_compra === 'deuda_proveedor' ? 'Deuda a Proveedor' : 'Pago Inmediato'}</p>
                                </div>
                            </div>

                            <div className="mt-6">
                                <h3 className="mb-2 font-semibold">Productos Comprados</h3>
                                <div className="divide-y rounded-md border">
                                    <div className="grid grid-cols-5 gap-2 bg-gray-100 p-3 font-semibold dark:bg-gray-800">
                                        <div>Producto</div>
                                        <div>Almacén</div>
                                        <div>Cantidad</div>
                                        <div>Precio unitario</div>
                                        <div className="text-right">Importe</div>
                                    </div>
                                    {productos.map((producto: Producto, index: number) => (
                                        <div key={index} className="grid grid-cols-5 gap-2 p-3">
                                            <div>{producto.nombre_producto}</div>
                                            <div>{producto.almacen.nombre_almacen}</div>
                                            <div>{producto.pivot.cantidad} unidades</div>
                                            <div>${producto.pivot.precio.toFixed(2)} c/u</div>
                                            <div className="text-right font-medium">
                                                ${(producto.pivot.cantidad * producto.pivot.precio).toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-8 flex justify-center gap-4">
                                <Link href="/comprar">
                                    <Button className="cursor-pointer">Realizar Otra Compra</Button>
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
