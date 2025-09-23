import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { AlmacenProps, BreadcrumbItem, Movimiento, ProductoPorAlmacenDetalleRef } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { CarFront, CheckCircle, Eye, Package, Truck, XCircle } from 'lucide-react';
import { useState } from 'react';
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

interface MovimientoWithDetails extends Movimiento {
    detalles: any[];
    seguimientos: any[];
    almacen_origen: AlmacenProps;
    almacen_destino: AlmacenProps;
    usuario: {
        name: string;
    };
}

export default function MovimientosPage({
    movimientos: initialMovimientos,
    almacenes: initialAlmacenes,
    estados,
}: {
    movimientos: any;
    almacenes: AlmacenProps[];
    estados: Record<string, string>;
}) {
    const [almacenes, setAlmacenes] = useState<AlmacenProps[]>(initialAlmacenes || []);
    const [productosEmisor, setProductosEmisor] = useState<ProductoPorAlmacenDetalleRef[]>([]);
    const [almacenOrigenId, setAlmacenOrigenId] = useState<string>('');
    const [almacenDestinoId, setAlmacenDestinoId] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [movimientos, setMovimientos] = useState<any>(initialMovimientos);
    const [selectedMovimiento, setSelectedMovimiento] = useState<MovimientoWithDetails | null>(null);
    const [showSeguimiento, setShowSeguimiento] = useState(false);
    const [showRecibirModal, setShowRecibirModal] = useState(false);
    const [productosRecibidos, setProductosRecibidos] = useState<{ [key: string]: number }>({});

    // Cargar productos del almacén origen
    const handleAlmacenOrigenChange = (value: string) => {
        setAlmacenOrigenId(value);
        const almacenId = parseInt(value);

        fetch(`/movimientos/almacenes/${almacenId}/productos`)
            .then((res) => res.json())
            .then((data) => {
                setProductosEmisor(data);
            })
            .catch((err) => {
                console.error('Error al cargar productos del almacén:', err);
                toast.error('Error al cargar productos del almacén');
            });
    };

    // Manejar el envío del formulario
    const handleSubmit = () => {
        if (!almacenOrigenId || !almacenDestinoId) {
            toast.warning('Debes seleccionar un almacén origen y un almacén destino.');
            return;
        }

        // Recopilar cantidades de productos
        const productosTrasladados = productosEmisor
            .map((producto) => {
                const input = document.getElementById(`cantidad-${producto.id}`) as HTMLInputElement;
                const cantidad = parseInt(input?.value || '0');
                const observacionesInput = document.getElementById(`observaciones-${producto.id}`) as HTMLInputElement;

                return cantidad > 0
                    ? {
                          id: producto.id,
                          cantidad,
                          observaciones: observacionesInput?.value || '',
                      }
                    : null;
            })
            .filter((item) => item !== null);

        if (productosTrasladados.length === 0) {
            toast.warning('Debes especificar al menos una cantidad a trasladar.');
            return;
        }

        setLoading(true);

        router.post(
            '/movimientos',
            {
                almacen_origen_id: almacenOrigenId,
                almacen_destino_id: almacenDestinoId,
                productos: productosTrasladados,
            },
            {
                onSuccess: (page) => {
                    toast.success('Solicitud de movimiento creada exitosamente.');
                    setProductosEmisor([]);
                    setAlmacenOrigenId('');
                    setAlmacenDestinoId('');
                    // Recargar la lista de movimientos
                    router.reload({ only: ['movimientos'] });
                },
                onError: (errors) => {
                    toast.error('Error al crear la solicitud de movimiento.');
                },
                onFinish: () => {
                    setLoading(false);
                },
            },
        );
    };

    // Acciones sobre movimientos
    const handleAprobar = (movimiento: Movimiento) => {
        router.post(
            `/movimientos/${movimiento.id}/aprobar`,
            {},
            {
                onSuccess: () => {
                    toast.success('Movimiento aprobado exitosamente.');
                    router.reload({ only: ['movimientos'] });
                },
                onError: () => {
                    toast.error('Error al aprobar el movimiento.');
                },
            },
        );
    };

    const handleEnviar = (movimiento: Movimiento) => {
        const guia = prompt('Número de guía de transporte (opcional):');
        const transportista = prompt('Transportista (opcional):');

        router.post(
            `/movimientos/${movimiento.id}/enviar`,
            {
                guia_transporte: guia,
                transportista: transportista,
            },
            {
                onSuccess: () => {
                    toast.success('Movimiento marcado como en tránsito.');
                    router.reload({ only: ['movimientos'] });
                },
                onError: () => {
                    toast.error('Error al enviar el movimiento.');
                },
            },
        );
    };

    const handleRecibir = (movimiento: Movimiento) => {
        setSelectedMovimiento(movimiento as MovimientoWithDetails);
        setShowRecibirModal(true);

        // Inicializar cantidades recibidas
        const initialCantidades: { [key: string]: number } = {};
        movimiento.detalles.forEach((detalle: any) => {
            initialCantidades[detalle.producto_id] = detalle.cantidad_despachada;
        });
        setProductosRecibidos(initialCantidades);
    };

    const confirmarRecepcion = () => {
        if (!selectedMovimiento) return;

        const productos = selectedMovimiento.detalles.map((detalle: any) => ({
            id: detalle.producto_id,
            cantidad_recibida: productosRecibidos[detalle.producto_id] || 0,
        }));

        router.post(
            `/movimientos/${selectedMovimiento.id}/recibir`,
            {
                productos: productos,
            },
            {
                onSuccess: () => {
                    toast.success('Movimiento recibido exitosamente.');
                    setShowRecibirModal(false);
                    router.reload({ only: ['movimientos'] });
                },
                onError: () => {
                    toast.error('Error al recibir el movimiento.');
                },
            },
        );
    };

    const handleRechazar = (movimiento: Movimiento) => {
        const observaciones = prompt('Motivo del rechazo:');
        if (observaciones) {
            router.post(
                `/movimientos/${movimiento.id}/rechazar`,
                {
                    observaciones,
                },
                {
                    onSuccess: () => {
                        toast.success('Movimiento rechazado.');
                        router.reload({ only: ['movimientos'] });
                    },
                    onError: () => {
                        toast.error('Error al rechazar el movimiento.');
                    },
                },
            );
        }
    };

    const verSeguimiento = (movimiento: Movimiento) => {
        setSelectedMovimiento(movimiento as MovimientoWithDetails);
        setShowSeguimiento(true);

        // Cargar seguimiento
        fetch(`/movimientos/${movimiento.id}/seguimiento`)
            .then((res) => res.json())
            .then((data) => {
                setSelectedMovimiento({ ...movimiento, seguimientos: data } as MovimientoWithDetails);
            });
    };

    const handleCantidadRecibidaChange = (productoId: number, cantidad: number) => {
        setProductosRecibidos((prev) => ({
            ...prev,
            [productoId]: cantidad,
        }));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Movimientos" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Sistema de Movimientos Logísticos"
                        description="Gestión profesional de traslados entre almacenes con control de estados y aprobaciones."
                    />
                    <CarFront
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Crear nuevo movimiento */}
                <Card>
                    <CardHeader>
                        <CardTitle>Nuevo Movimiento</CardTitle>
                        <CardDescription>Solicitud de traslado entre almacenes (requiere aprobación)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {/* Almacén Origen */}
                                <div className="flex flex-col space-y-1.5">
                                    <Label htmlFor="almacen_origen">Almacén Origen</Label>
                                    <Select onValueChange={handleAlmacenOrigenChange} value={almacenOrigenId}>
                                        <SelectTrigger id="almacen_origen">
                                            <SelectValue placeholder="Selecciona el almacén origen..." />
                                        </SelectTrigger>
                                        <SelectContent position="popper">
                                            {almacenes.map((almacen) => (
                                                <SelectItem key={almacen.id} value={almacen.id.toString()}>
                                                    {almacen.nombre_almacen}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Almacén Destino */}
                                <div className="flex flex-col space-y-1.5">
                                    <Label htmlFor="almacen_destino">Almacén Destino</Label>
                                    <Select onValueChange={(value) => setAlmacenDestinoId(value)} value={almacenDestinoId}>
                                        <SelectTrigger id="almacen_destino">
                                            <SelectValue placeholder="Selecciona el almacén destino..." />
                                        </SelectTrigger>
                                        <SelectContent position="popper">
                                            {almacenes
                                                .filter((alm) => (almacenOrigenId ? alm.id.toString() !== almacenOrigenId : true))
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

                        {/* Tabla de Productos */}
                        {productosEmisor.length > 0 && (
                            <div className="mt-6">
                                <h3 className="text-lg font-medium">Productos Disponibles</h3>
                                <div className="mt-2 overflow-x-auto">
                                    <table className="min-w-full divide-y">
                                        <thead className="bg-primary text-white">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Producto</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Stock Disponible</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Cantidad a Trasladar</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Observaciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {productosEmisor.map((producto) => (
                                                <tr key={producto.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">{producto.nombre}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{producto.stock_actual}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <input
                                                            id={`cantidad-${producto.id}`}
                                                            type="number"
                                                            min="0"
                                                            max={producto.stock_actual}
                                                            className="border-sidebar-accent block w-full rounded-md border-1 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <input
                                                            id={`observaciones-${producto.id}`}
                                                            type="text"
                                                            placeholder=" Observaciones opcionales"
                                                            className="border-primary block w-full rounded-md border-1 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Link href={route('dashboard')}>
                            <Button variant="outline">Cancelar</Button>
                        </Link>
                        <Button onClick={handleSubmit} disabled={loading || productosEmisor.length === 0}>
                            {loading ? 'Enviando solicitud...' : 'Solicitar Movimiento'}
                        </Button>
                    </CardFooter>
                </Card>

                {/* Lista de Movimientos */}
                <Card>
                    <CardHeader>
                        <CardTitle>Historial de Movimientos</CardTitle>
                        <CardDescription>Gestiona las solicitudes de movimiento y su seguimiento</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y">
                                <thead className="bg-primary text-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Producto</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Origen</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Destino</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Cantidad</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Solicitado por</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {movimientos.data.map((movimiento: MovimientoWithDetails) => (
                                        <tr key={movimiento.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {movimiento.detalles && movimiento.detalles.length > 0 ? (
                                                    <span>{movimiento.detalles.length} producto(s)</span>
                                                ) : (
                                                    <span>Sin productos</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">{movimiento.almacen_origen?.nombre_almacen}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{movimiento.almacen_destino?.nombre_almacen}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {movimiento.detalles &&
                                                    movimiento.detalles.reduce(
                                                        (total: number, detalle: any) => total + detalle.cantidad_solicitada,
                                                        0,
                                                    )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                                                        movimiento.estado === 'pendiente'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : movimiento.estado === 'aprobado'
                                                              ? 'bg-blue-100 text-blue-800'
                                                              : movimiento.estado === 'en_transito'
                                                                ? 'bg-orange-100 text-orange-800'
                                                                : movimiento.estado === 'recibido_completo'
                                                                  ? 'bg-green-100 text-green-800'
                                                                  : movimiento.estado === 'recibido_parcial'
                                                                    ? 'bg-teal-100 text-teal-800'
                                                                    : 'bg-red-100 text-red-800'
                                                    }`}
                                                >
                                                    {estados[movimiento.estado]}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">{movimiento.usuario?.name}</td>
                                            <td className="flex space-x-2 px-6 py-4 whitespace-nowrap">
                                                <Button variant="outline" size="sm" onClick={() => verSeguimiento(movimiento)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {movimiento.estado === 'pendiente' && (
                                                    <>
                                                        <Button size="sm" onClick={() => handleAprobar(movimiento)}>
                                                            <CheckCircle className="mr-1 h-4 w-4" /> Aprobar
                                                        </Button>
                                                        <Button variant="destructive" size="sm" onClick={() => handleRechazar(movimiento)}>
                                                            <XCircle className="mr-1 h-4 w-4" /> Rechazar
                                                        </Button>
                                                    </>
                                                )}
                                                {movimiento.estado === 'aprobado' && (
                                                    <Button size="sm" onClick={() => handleEnviar(movimiento)}>
                                                        <Truck className="mr-1 h-4 w-4" /> Enviar
                                                    </Button>
                                                )}
                                                {movimiento.estado === 'en_transito' && (
                                                    <Button size="sm" onClick={() => handleRecibir(movimiento)}>
                                                        <Package className="mr-1 h-4 w-4" /> Recibir
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        {movimientos.links && (
                            <div className="mt-4 flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                    Mostrando {movimientos.from} a {movimientos.to} de {movimientos.total} resultados
                                </div>
                                <div className="flex space-x-2">
                                    {movimientos.links.map((link: any, index: number) => (
                                        <Button
                                            key={index}
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            disabled={!link.url}
                                            onClick={() => router.get(link.url || '#')}
                                        >
                                            {link.label.replace('&laquo;', '«').replace('&raquo;', '»')}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Modal de Seguimiento */}
                {showSeguimiento && selectedMovimiento && (
                    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
                        <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
                            <div className="p-6">
                                <h3 className="mb-4 text-lg font-medium">Seguimiento del Movimiento #{selectedMovimiento.id}</h3>

                                <div className="space-y-4">
                                    {selectedMovimiento.seguimientos?.map((seguimiento, index) => (
                                        <div key={seguimiento.id} className="relative border-l-2 border-gray-200 pl-4">
                                            <div className="absolute top-2 -left-1.5 h-3 w-3 rounded-full bg-gray-200"></div>
                                            <div className="ml-4">
                                                <div className="flex justify-between">
                                                    <span
                                                        className={`text-sm font-medium ${
                                                            seguimiento.estado === 'pendiente'
                                                                ? 'text-yellow-600'
                                                                : seguimiento.estado === 'aprobado'
                                                                  ? 'text-blue-600'
                                                                  : seguimiento.estado === 'en_transito'
                                                                    ? 'text-orange-600'
                                                                    : seguimiento.estado === 'recibido_completo'
                                                                      ? 'text-green-600'
                                                                      : seguimiento.estado === 'recibido_parcial'
                                                                        ? 'text-teal-600'
                                                                        : 'text-red-600'
                                                        }`}
                                                    >
                                                        {estados[seguimiento.estado]}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{new Date(seguimiento.created_at).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm text-gray-600">{seguimiento.observaciones}</p>
                                                <p className="text-xs text-gray-500">Por: {seguimiento.usuario?.name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <Button onClick={() => setShowSeguimiento(false)}>Cerrar</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Recepción */}
                {showRecibirModal && selectedMovimiento && (
                    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
                        <div className="max-h-[80vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
                            <div className="p-6">
                                <h3 className="mb-4 text-lg font-medium">Registrar Recepción - Movimiento #{selectedMovimiento.id}</h3>

                                <div className="mt-4 overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Cantidad Despachada
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cantidad Recibida</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                            {selectedMovimiento.detalles.map((detalle: any) => (
                                                <tr key={detalle.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">{detalle.producto?.nombre_producto}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">{detalle.cantidad_despachada}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={detalle.cantidad_despachada}
                                                            value={productosRecibidos[detalle.producto_id] || 0}
                                                            onChange={(e) =>
                                                                handleCantidadRecibidaChange(detalle.producto_id, parseInt(e.target.value))
                                                            }
                                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="mt-6 flex justify-end space-x-2">
                                    <Button variant="outline" className="cursor-pointer" onClick={() => setShowRecibirModal(false)}>
                                        Cancelar
                                    </Button>
                                    <Button onClick={confirmarRecepcion}>Confirmar Recepción</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <Toaster position="top-center" />
        </AppLayout>
    );
}
