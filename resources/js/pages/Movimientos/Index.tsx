import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { AlmacenProps, BreadcrumbItem, ProductoPorAlmacenDetalleRef } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Movimientos',
        href: '#',
    },
];

export default function MovimientosPage() {
    const [almacens, setAlmacens] = useState<AlmacenProps[]>([]);
    const [productosEmisor, setProductosEmisor] = useState<ProductoPorAlmacenDetalleRef[]>([]);
    const [almacenEmisorId, setAlmacenEmisorId] = useState<string | null>(null);
    const [almacenReceptorId, setAlmacenReceptorId] = useState<string | null>(null);

    useEffect(() => {
        fetch('/movimientos/almacenes')
            .then((res) => res.json())
            .then((data) => setAlmacens(data))
            .catch((err) => console.error(err));
    }, []);

    const handleAlmacenEmisorChange = (value: string) => {
        setAlmacenEmisorId(value);
        const almacenId = parseInt(value);
        fetch(`/movimientos/almacenes/${almacenId}/productos`)
            .then((res) => res.json())
            .then((data) => setProductosEmisor(data))
            .catch((err) => console.error(err));
    };

    const handleSubmit = () => {
        if (!almacenEmisorId || !almacenReceptorId) {
            alert('Debes seleccionar un almacén emisor y un almacén receptor.');
            return;
        }

        const productosTrasladados = productosEmisor
            .map((producto) => {
                const cantidadInput = document.getElementById(`cantidad-${producto.producto_id}`) as HTMLInputElement;
                const cantidad = parseInt(cantidadInput?.value || '0');
                return cantidad > 0 ? { producto_id: producto.producto_id, cantidad } : null;
            })
            .filter((item) => item !== null);

        if (productosTrasladados.length === 0) {
            alert('Debes especificar al menos una cantidad a trasladar.');
            return;
        }

        fetch('/movimientos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
            },
            body: JSON.stringify({
                almacen_origen_id: almacenEmisorId,
                almacen_destino_id: almacenReceptorId,
                productos: productosTrasladados,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                alert(data.message || 'Movimiento registrado exitosamente.');
                setProductosEmisor([]); // Limpiar la tabla
            })
            .catch((err) => {
                console.error('Error al registrar el movimiento:', err);
                alert('Error al registrar el movimiento.');
            });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Movimientos" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento."
                    />
                </div>

                {/* Seleccionar Almacenes */}
                <Card>
                    <CardHeader>
                        <CardTitle>Gestionar Movimiento</CardTitle>
                        <CardDescription>Envíos internos de uno o varios productos de un almacén a otro.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {/* Almacén Emisor */}
                                <div className="flex flex-col space-y-1.5">
                                    <Label htmlFor="almacen_emisor">Almacén Emisor</Label>
                                    <Select onValueChange={handleAlmacenEmisorChange}>
                                        <SelectTrigger id="almacen_emisor">
                                            <SelectValue placeholder="Selecciona el almacén emisor..." />
                                        </SelectTrigger>
                                        <SelectContent position="popper">
                                            {almacens.map((almacen) => (
                                                <SelectItem key={almacen.id} value={almacen.id.toString()}>
                                                    {almacen.nombre_almacen}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Almacén Receptor */}
                                <div className="flex flex-col space-y-1.5">
                                    <Label htmlFor="almacen_receptor">Almacén Receptor</Label>
                                    <Select onValueChange={(value) => setAlmacenReceptorId(value)}>
                                        <SelectTrigger id="almacen_receptor">
                                            <SelectValue placeholder="Selecciona el almacén receptor..." />
                                        </SelectTrigger>
                                        <SelectContent position="popper">
                                            {almacens.map((almacen) => (
                                                <SelectItem key={almacen.id} value={almacen.id.toString()}>
                                                    {almacen.nombre_almacen}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </form>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Link href={route('dashboard')}>
                            <Button variant="outline" className="hover:bg-destructive-foreground cursor-pointer">
                                Cancelar
                            </Button>
                        </Link>
                        <Button onClick={handleSubmit} className="hover:bg-chart-2 cursor-pointer">
                            Realizar Movimiento
                        </Button>
                    </CardFooter>
                </Card>

                {/* Tabla de Productos del Almacén Emisor */}
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="text-sidebar-accent">Productos Disponibles en el Almacén Emisor</CardTitle>
                        <CardDescription>Listado de productos con sus cantidades disponibles en el almacén emisor</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {productosEmisor.length === 0 ? (
                            <p className="py-4 text-center text-gray-500">No hay productos disponibles en este almacén.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th
                                                scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300"
                                            >
                                                Nombre del Producto
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300"
                                            >
                                                Cantidad Disponible
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300"
                                            >
                                                Cantidad a Trasladar
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                                        {productosEmisor.map((producto) => (
                                            <tr key={producto.producto_id}>
                                                {/* Nombre del Producto */}
                                                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-200">
                                                    {producto.nombre_producto}
                                                </td>
                                                {/* Cantidad Disponible */}
                                                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-200">
                                                    {producto.cantidad_total}
                                                </td>
                                                {/* Cantidad a Trasladar */}
                                                <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                    <input
                                                        id={`cantidad-${producto.producto_id}`}
                                                        type="number"
                                                        min="0"
                                                        max={producto.cantidad_total}
                                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
