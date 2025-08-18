import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { AlmacenProps, BreadcrumbItem, ProductoPorAlmacenDetalleRef } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { CarFront } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';

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
    console.log('🔄 Componente MovimientosPage montado');

    const [almacens, setAlmacens] = useState<AlmacenProps[]>([]);
    const [productosEmisor, setProductosEmisor] = useState<ProductoPorAlmacenDetalleRef[]>([]);
    const [almacenEmisorId, setAlmacenEmisorId] = useState<string>('');
    const [almacenReceptorId, setAlmacenReceptorId] = useState<string>('');
    const [loading, setLoading] = useState(false);

    // Cargar almacenes desde la API
    useEffect(() => {
        console.log('📂 Cargando almacenes desde /movimientos/almacenes');
        fetch('/movimientos/almacenes')
            .then((res) => {
                console.log('📥 Respuesta de almacenes:', res.status);
                return res.json();
            })
            .then((data) => {
                console.log('📦 Almacenes cargados:', data);
                setAlmacens(data);
            })
            .catch((err) => {
                console.error('❌ Error al cargar almacenes:', err);
            });
    }, []);

    // Cargar productos del almacén emisor
    const handleAlmacenEmisorChange = (value: string) => {
        console.log('🔄 Almacén emisor seleccionado:', value);
        setAlmacenEmisorId(value);
        const almacenId = parseInt(value);
        fetch(`/movimientos/almacenes/${almacenId}/productos`)
            .then((res) => {
                console.log('📥 Respuesta de productos del almacén:', res.status);
                return res.json();
            })
            .then((data) => {
                console.log('📦 Productos del almacén emisor:', data);
                setProductosEmisor(data);
            })
            .catch((err) => {
                console.error('❌ Error al cargar productos del almacén:', err);
            });
    };

    // Manejar el envío del formulario
    const handleSubmit = () => {
        console.log('📤 Iniciando envío del formulario');

        if (!almacenEmisorId || !almacenReceptorId) {
            console.warn('⚠️ Almacén emisor o receptor no seleccionado');
            toast.warning('Debes seleccionar un almacén emisor y un almacén receptor.');
            return;
        }

        // Recopilar cantidades de productos
        const productosTrasladados = productosEmisor
            .map((producto) => {
                const input = document.getElementById(`cantidad-${producto.producto_id}`) as HTMLInputElement;
                const cantidad = parseInt(input?.value || '0');
                console.log(`📊 Producto ID ${producto.producto_id}: Cantidad ingresada:`, cantidad);
                return cantidad > 0 ? { producto_id: producto.producto_id, cantidad } : null;
            })
            .filter((item) => item !== null);

        if (productosTrasladados.length === 0) {
            console.warn('⚠️ No se seleccionaron productos para trasladar');
            alert('Debes especificar al menos una cantidad a trasladar.');
            return;
        }

        console.log('📦 Datos a enviar:', {
            almacen_origen_id: almacenEmisorId,
            almacen_destino_id: almacenReceptorId,
            productos: productosTrasladados,
        });

        setLoading(true);
        router.post(
            '/movimientos',
            {
                almacen_origen_id: almacenEmisorId,
                almacen_destino_id: almacenReceptorId,
                productos: productosTrasladados,
            },
            {
                onSuccess: (page) => {
                    console.log('✅ Movimiento exitoso:', page);
                    toast.success('Movimiento registrado exitosamente.');
                    setProductosEmisor([]); // Limpiar tabla
                    setAlmacenEmisorId(''); // Reiniciar almacén emisor
                    setAlmacenReceptorId(''); // Reiniciar almacén receptor
                },
                onError: (errors) => {
                    console.error('❌ Errores de validación:', errors);
                    toast.error('Error al registrar el movimiento. Verifica los datos ingresados.');
                },
                onFinish: () => {
                    setLoading(false); // Quitar estado de carga
                    console.log('🏁 Finalizado: Carga completada');
                },
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Movimientos" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento."
                    />
                    <CarFront
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
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
                                    <Select onValueChange={handleAlmacenEmisorChange} value={almacenEmisorId}>
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
                                    <Select onValueChange={(value) => setAlmacenReceptorId(value)} value={almacenReceptorId}>
                                        <SelectTrigger id="almacen_receptor">
                                            <SelectValue placeholder="Selecciona el almacén receptor..." />
                                        </SelectTrigger>
                                        <SelectContent position="popper">
                                            {almacens
                                                .filter((alm) => (almacenEmisorId ? alm.id.toString() !== almacenEmisorId : true))
                                                .map((almacen) => (
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
                        <Button onClick={handleSubmit} className="hover:bg-chart-2 cursor-pointer" disabled={loading}>
                            {loading ? 'Procesando...' : 'Realizar Movimiento'}
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
                                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                                Nombre del Producto
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                                Cantidad Disponible
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-300">
                                                Cantidad a Trasladar
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                                        {productosEmisor.map((producto) => (
                                            <tr key={producto.producto_id}>
                                                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-200">
                                                    {producto.nombre_producto}
                                                </td>
                                                <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-200">
                                                    {producto.cantidad}
                                                </td>
                                                <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                    <input
                                                        id={`cantidad-${producto.producto_id}`}
                                                        type="number"
                                                        min="0"
                                                        max={producto.cantidad}
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
            <Toaster position="top-center" />
        </AppLayout>
    );
}
