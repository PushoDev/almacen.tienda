import HeadingSmall from '@/components/heading-small';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollProgress } from '@/components/ui/scroll';
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink } from '@/components/ui/pagination';
import { Toaster } from '@/components/ui/sileo-toaster';
import { sileo } from '@/lib/sileo';
import AppLayout from '@/layouts/app-layout';
import { AlmacenProps, BreadcrumbItem, Movimiento, ProductoPorAlmacenDetalleRef } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeftRight, Caravan, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, Eye, History, ListCheck, Package, PackageCheck, PackageSearch, Search, Send, TrendingUp, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

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

interface MovimientoDetalle {
    id: number;
    movimiento_id: number;
    producto_id: number;
    cantidad_solicitada: number;
    cantidad_despachada: number;
    cantidad_recibida: number;
    costo_unitario?: number;
    observaciones?: string;
    created_at: string;
    updated_at: string;
    producto?: {
        id: number;
        nombre_producto: string;
        marca_producto?: string;
        modelo_producto?: string;
        capacidad_producto?: string;
        color_producto?: string;
        codigo_producto?: string;
        imagen_url?: string;
        barcode_image_url?: string | null;
        categoria?: {
            id: number;
            nombre_categoria: string;
        };
    };
}

interface MovimientoSeguimiento {
    id: number;
    movimiento_id: number;
    estado: string;
    observaciones?: string;
    user_id: number;
    ubicacion?: string;
    evidencia?: string;
    created_at: string;
    updated_at: string;
    usuario?: {
        name: string;
    };
}

interface ProductoConStock extends ProductoPorAlmacenDetalleRef {
    stock_total: number;
    stock_en_transito: number;
    stock_disponible: number;
    marca?: string;
    modelo?: string;
    capacidad?: string;
    color?: string;
    codigo?: string;
    codigos_adicionales?: string[];
    categoria?: string;
    imagen_url?: string;
}

interface MovimientoWithDetails extends Movimiento {
    detalles: MovimientoDetalle[];
    seguimientos: MovimientoSeguimiento[];
    almacen_origen: AlmacenProps;
    almacen_destino: AlmacenProps;
    usuario: {
        name: string;
    };
}

interface MovimientoPaginado {
    data: MovimientoWithDetails[];
    from: number;
    to: number;
    total: number;
    links: Array<{
        url?: string;
        label: string;
        active: boolean;
    }>;
}

interface ErrorResponse {
    general?: string;
    [key: string]: string | undefined;
}

// Mismos tokens que Show.tsx (basados en opacidad, funcionan en claro/oscuro) —
// un solo lugar para no repetir esta lógica en la tabla y en el timeline de seguimiento.
const ESTADO_BADGE: Record<string, { badgeClass: string; icon: React.ReactNode }> = {
    pendiente_confirmacion: { badgeClass: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20', icon: <Clock className="h-3.5 w-3.5" /> },
    en_transito: { badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', icon: <Send className="h-3.5 w-3.5" /> },
    recibido_parcial: { badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20', icon: <Package className="h-3.5 w-3.5" /> },
    recibido_completo: { badgeClass: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    rechazado: { badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', icon: <XCircle className="h-3.5 w-3.5" /> },
    cancelado: { badgeClass: 'bg-muted text-muted-foreground border-border', icon: <XCircle className="h-3.5 w-3.5" /> },
};

function EstadoBadge({ estado, label }: { estado: string; label: string }) {
    const config = ESTADO_BADGE[estado] ?? ESTADO_BADGE.cancelado;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${config.badgeClass}`}>
            {config.icon}
            {label}
        </span>
    );
}

export default function MovimientosPage({
    movimientos,
    almacenes,
    estados,
    userAlmacenesIds,
}: {
    movimientos: MovimientoPaginado;
    almacenes: AlmacenProps[];
    estados: Record<string, string>;
    userAlmacenesIds: number[];
}) {
    const [productosEmisor, setProductosEmisor] = useState<ProductoConStock[]>([]);
    const [almacenOrigenId, setAlmacenOrigenId] = useState<string>('');
    const [almacenDestinoId, setAlmacenDestinoId] = useState<string>('');
    const [origenSearch, setOrigenSearch] = useState('');
    const [destinoSearch, setDestinoSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedMovimiento, setSelectedMovimiento] = useState<MovimientoWithDetails | null>(null);
    const [productosRecibidos, setProductosRecibidos] = useState<{ [key: string]: number | undefined }>({});

    const [cantidades, setCantidades] = useState<Record<number, number>>({});
    const [observacionesProd, setObservacionesProd] = useState<Record<number, string>>({});
    const [paginaProductos, setPaginaProductos] = useState(1);
    const [busquedaProducto, setBusquedaProducto] = useState('');
    const PRODUCTOS_POR_PAGINA = 15;

    useEffect(() => {
        setCantidades({});
        setObservacionesProd({});
        setPaginaProductos(1);
        setBusquedaProducto('');
    }, [productosEmisor]);

    const productosFiltrados = productosEmisor.filter((p) => {
        if (!busquedaProducto.trim()) return true;
        const termino = busquedaProducto.toLowerCase();
        return (
            p.nombre?.toLowerCase().includes(termino) ||
            p.codigo?.toLowerCase().includes(termino) ||
            p.codigos_adicionales?.some(c => c.toLowerCase().includes(termino)) ||
            p.marca?.toLowerCase().includes(termino) ||
            p.modelo?.toLowerCase().includes(termino) ||
            p.capacidad?.toLowerCase().includes(termino)
        );
    });

    const totalPaginasProductos = Math.ceil(productosFiltrados.length / PRODUCTOS_POR_PAGINA);
    const productosPaginados = productosFiltrados.slice((paginaProductos - 1) * PRODUCTOS_POR_PAGINA, paginaProductos * PRODUCTOS_POR_PAGINA);

    const [showDialogs, setShowDialogs] = useState({
        seguimiento: false,
        recibir: false,
        enviar: false,
        rechazar: false,
        producto: false,
        verProductos: false,
    });

    const [selectedProductDetails, setSelectedProductDetails] = useState<ProductoConStock | null>(null);

    const [dialogData, setDialogData] = useState({
        guia: '',
        transportista: '',
        observaciones: '',
    });

    const { props } = usePage();
    const usuario = props.auth?.user as any;
    const isVendedor = usuario?.role === 'vendedor';

    const almacenesOrigen = isVendedor && userAlmacenesIds.length > 0 ? almacenes.filter((a) => userAlmacenesIds.includes(a.id)) : almacenes;

    const almacenesDestino = almacenOrigenId ? almacenes.filter((a) => a.id !== parseInt(almacenOrigenId)) : almacenes;

    const totalDespachadoRecibir = selectedMovimiento?.detalles.reduce((sum, d) => sum + d.cantidad_despachada, 0) ?? 0;
    const totalRecibidoRecibir = selectedMovimiento?.detalles.reduce((sum, d) => sum + (productosRecibidos[d.producto_id] || 0), 0) ?? 0;

    const handleAlmacenOrigenChange = (value: string | null) => {
        if (!value) {
            setAlmacenOrigenId('');
            setProductosEmisor([]);
            return;
        }
        console.log('[Movimientos] Cambiando almacén origen a:', value);
        setAlmacenOrigenId(value);
        const almacenId = parseInt(value);

        fetch(`/movimientos/almacenes/${almacenId}/productos`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then((data) => {
                console.log('[Movimientos] Productos cargados:', data);
                setProductosEmisor(data);
            })
            .catch((err) => {
                console.error('[Movimientos] Error al cargar productos:', err);
                sileo.error({ title: 'No se pudieron cargar los productos del almacén' });
            });
    };

    const handleSubmit = () => {
        console.log('[Movimientos] Iniciando creación de movimiento');

        if (!almacenOrigenId || !almacenDestinoId) {
            console.warn('[Movimientos] Faltan almacenes origen o destino');
            sileo.warning({ title: 'Faltan datos', description: 'Debes seleccionar un almacén origen y un almacén destino.' });
            return;
        }

        const productosTrasladados = productosEmisor
            .map((producto) => {
                const cantidad = cantidades[producto.id] || 0;
                const observaciones = observacionesProd[producto.id] || '';

                return cantidad > 0
                    ? {
                          id: producto.id,
                          cantidad,
                          observaciones,
                      }
                    : null;
            })
            .filter((item) => item !== null);

        console.log('[Movimientos] Productos a trasladar:', productosTrasladados);

        if (productosTrasladados.length === 0) {
            console.warn('[Movimientos] No hay productos para trasladar');
            sileo.warning({ title: 'Faltan datos', description: 'Debes especificar al menos una cantidad a trasladar.' });
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
                onSuccess: () => {
                    console.log('[Movimientos] Movimiento creado exitosamente');
                    sileo.success({ title: 'Movimiento creado', description: 'Listo para enviar.' });
                    setProductosEmisor([]);
                    setAlmacenOrigenId('');
                    setAlmacenDestinoId('');
                    setCantidades({});
                    setObservacionesProd({});
                    router.reload({ only: ['movimientos'] });
                },
                onError: (errors: ErrorResponse) => {
                    console.error('[Movimientos] Error al crear movimiento:', errors);
                    const errorMsg = errors?.general || 'Error al crear el movimiento';
                    sileo.error({ title: 'No se pudo crear el movimiento', description: errorMsg });
                },
                onFinish: () => {
                    setLoading(false);
                },
            },
        );
    };

    const handleEnviarClick = (movimiento: MovimientoWithDetails) => {
        console.log('[Movimientos] Abriendo diálogo de envío para movimiento:', movimiento.id);
        setSelectedMovimiento(movimiento);
        setDialogData({ guia: '', transportista: '', observaciones: '' });
        setShowDialogs({ ...showDialogs, enviar: true });
    };

    const handleEnviarConfirm = () => {
        if (!selectedMovimiento) return;

        console.log('[Movimientos] Enviando movimiento:', selectedMovimiento.id);

        router.post(
            `/movimientos/${selectedMovimiento.id}/enviar`,
            {
                guia_transporte: dialogData.guia,
                transportista: dialogData.transportista,
            },
            {
                onSuccess: () => {
                    console.log('[Movimientos] Movimiento enviado exitosamente');
                    sileo.success({ title: 'Movimiento despachado', description: 'En tránsito hacia el destino.' });
                    setShowDialogs({ ...showDialogs, enviar: false });
                    router.reload({ only: ['movimientos'] });
                },
                onError: (errors: ErrorResponse) => {
                    console.error('[Movimientos] Error al enviar:', errors);
                    sileo.error({ title: 'No se pudo despachar el movimiento', description: errors?.general });
                },
            },
        );
    };

    const handleRecibirClick = (movimiento: MovimientoWithDetails) => {
        console.log('[Movimientos] Abriendo diálogo de recepción para movimiento:', movimiento.id);
        setSelectedMovimiento(movimiento);

        const initialCantidades: { [key: string]: number } = {};
        movimiento.detalles.forEach((detalle) => {
            initialCantidades[detalle.producto_id] = detalle.cantidad_despachada;
        });
        setProductosRecibidos(initialCantidades);
        setShowDialogs({ ...showDialogs, recibir: true });
    };

    const handleRecibirConfirm = () => {
        if (!selectedMovimiento) return;

        console.log('[Movimientos] Confirmando recepción para movimiento:', selectedMovimiento.id);

        const productos = selectedMovimiento.detalles.map((detalle) => ({
            id: detalle.producto_id,
            cantidad_recibida: productosRecibidos[detalle.producto_id] || 0,
        }));

        console.log('[Movimientos] Productos recibidos:', productos);

        router.post(
            `/movimientos/${selectedMovimiento.id}/recibir`,
            {
                productos: productos,
            },
            {
                onSuccess: () => {
                    console.log('[Movimientos] Recepción confirmada exitosamente');
                    sileo.success({ title: 'Recepción confirmada', description: 'Movimiento recibido exitosamente.' });
                    setShowDialogs({ ...showDialogs, recibir: false });
                    router.reload({ only: ['movimientos'] });
                },
                onError: (errors: ErrorResponse) => {
                    console.error('[Movimientos] Error al recibir:', errors);
                    sileo.error({ title: 'No se pudo confirmar la recepción', description: errors?.general });
                },
            },
        );
    };

    const handleRechazarClick = (movimiento: MovimientoWithDetails) => {
        console.log('[Movimientos] Abriendo diálogo de rechazo para movimiento:', movimiento.id);
        setSelectedMovimiento(movimiento);
        setDialogData({ ...dialogData, observaciones: '' });
        setShowDialogs({ ...showDialogs, rechazar: true });
    };

    const handleRechazarConfirm = () => {
        if (!selectedMovimiento || !dialogData.observaciones) return;

        console.log('[Movimientos] Rechazando movimiento:', selectedMovimiento.id);

        router.post(
            `/movimientos/${selectedMovimiento.id}/rechazar`,
            {
                observaciones: dialogData.observaciones,
            },
            {
                onSuccess: () => {
                    console.log('[Movimientos] Movimiento rechazado exitosamente');
                    sileo.success({ title: 'Movimiento rechazado', description: 'Stock liberado en el origen.' });
                    setShowDialogs({ ...showDialogs, rechazar: false });
                    router.reload({ only: ['movimientos'] });
                },
                onError: (errors: ErrorResponse) => {
                    console.error('[Movimientos] Error al rechazar:', errors);
                    sileo.error({ title: 'No se pudo rechazar el movimiento', description: errors?.general });
                },
            },
        );
    };

    const handleVerSeguimiento = (movimiento: MovimientoWithDetails) => {
        console.log('[Movimientos] Cargando seguimiento para movimiento:', movimiento.id);
        setSelectedMovimiento(movimiento);
        setShowDialogs({ ...showDialogs, seguimiento: true });

        fetch(`/movimientos/${movimiento.id}/seguimiento`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then((data) => {
                console.log('[Movimientos] Seguimiento cargado:', data);
                setSelectedMovimiento((prev) => (prev ? { ...prev, seguimientos: data } : null));
            })
            .catch((err) => {
                console.error('[Movimientos] Error al cargar seguimiento:', err);
                sileo.error({ title: 'No se pudo cargar el seguimiento' });
            });
    };

    const handleVerProductosClick = (movimiento: MovimientoWithDetails) => {
        setSelectedMovimiento(movimiento);
        setShowDialogs({ ...showDialogs, verProductos: true });
    };

    const handleCantidadRecibidaChange = (productoId: number, cantidad: number | undefined) => {
        setProductosRecibidos((prev) => ({
            ...prev,
            [productoId]: cantidad,
        }));
    };

    const handleProductClick = (producto: ProductoConStock) => {
        console.log('[Movimientos] Viendo detalles de producto:', producto.id);
        setSelectedProductDetails(producto);
        setShowDialogs({ ...showDialogs, producto: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Movimientos" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Movimientos Logísticos" description="Gestión y Solicitud de Movimientos de Mercancía entre Almacenes" />
                    <Caravan
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Crear nuevo movimiento */}
                <Card className="overflow-hidden border-l-4 border-cyan-500/30 pt-0 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader className="border-b bg-gradient-to-r from-cyan-600 to-cyan-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <ArrowLeftRight className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Nuevo Movimiento</CardTitle>
                                <CardDescription className="text-cyan-100">Crea un movimiento entre almacenes. El stock se reservará al enviar.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {/* Almacén Origen */}
                                <div className="flex flex-col space-y-1.5">
                                    <Label htmlFor="almacen_origen">Almacén Origen</Label>
                                    <Combobox
                                        value={almacenOrigenId || null}
                                        onValueChange={handleAlmacenOrigenChange}
                                        onInputValueChange={setOrigenSearch}
                                        itemToStringLabel={(id: string) => almacenes.find(a => a.id.toString() === id)?.nombre_almacen ?? ''}
                                    >
                                        <ComboboxInput id="almacen_origen" className="w-full" placeholder="Buscar almacén origen..." showClear />
                                        <ComboboxContent>
                                            <ComboboxList>
                                                {almacenesOrigen
                                                    .filter(a => !origenSearch || a.nombre_almacen.toLowerCase().includes(origenSearch.toLowerCase()))
                                                    .map(almacen => (
                                                        <ComboboxItem key={almacen.id} value={almacen.id.toString()}>
                                                            {almacen.nombre_almacen}
                                                        </ComboboxItem>
                                                    ))
                                                }
                                                {almacenesOrigen.filter(a => !origenSearch || a.nombre_almacen.toLowerCase().includes(origenSearch.toLowerCase())).length === 0 && (
                                                    <div className="py-2 text-center text-sm text-muted-foreground">Sin resultados</div>
                                                )}
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                </div>

                                {/* Almacén Destino */}
                                <div className="flex flex-col space-y-1.5">
                                    <Label htmlFor="almacen_destino">Almacén Destino</Label>
                                    <Combobox
                                        value={almacenDestinoId || null}
                                        onValueChange={(val) => setAlmacenDestinoId(val ?? '')}
                                        onInputValueChange={setDestinoSearch}
                                        itemToStringLabel={(id: string) => almacenes.find(a => a.id.toString() === id)?.nombre_almacen ?? ''}
                                    >
                                        <ComboboxInput id="almacen_destino" className="w-full" placeholder="Buscar almacén destino..." showClear />
                                        <ComboboxContent>
                                            <ComboboxList>
                                                {almacenesDestino
                                                    .filter(a => !destinoSearch || a.nombre_almacen.toLowerCase().includes(destinoSearch.toLowerCase()))
                                                    .map(almacen => (
                                                        <ComboboxItem key={almacen.id} value={almacen.id.toString()}>
                                                            {almacen.nombre_almacen}
                                                        </ComboboxItem>
                                                    ))
                                                }
                                                {almacenesDestino.filter(a => !destinoSearch || a.nombre_almacen.toLowerCase().includes(destinoSearch.toLowerCase())).length === 0 && (
                                                    <div className="py-2 text-center text-sm text-muted-foreground">Sin resultados</div>
                                                )}
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                </div>
                            </div>
                        </form>

                        {/* Tabla de Productos */}
                        {productosEmisor.length > 0 && (
                            <div className="mt-6 space-y-3">
                                <h3 className="flex items-center gap-2 text-lg font-semibold">
                                    <Package className="h-5 w-5" /> Productos Disponibles
                                </h3>
                                <div className="relative">
                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <Input
                                        type="text"
                                        placeholder="Buscar por nombre, código, marca, modelo o capacidad..."
                                        value={busquedaProducto}
                                        onChange={(e) => {
                                            setBusquedaProducto(e.target.value);
                                            setPaginaProductos(1);
                                        }}
                                        className="pl-9 uppercase placeholder:normal-case"
                                    />
                                </div>
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-semibold">Producto</th>
                                                <th className="px-4 py-3 text-left font-semibold">Modelo</th>
                                                <th className="px-4 py-3 text-left font-semibold">Capacidad</th>
                                                <th className="px-4 py-3 text-left font-semibold">Color</th>
                                                <th className="px-4 py-3 text-left font-semibold">Categoría</th>
                                                <th className="px-4 py-3 text-center font-semibold">Disponible</th>
                                                <th className="px-4 py-3 text-center font-semibold">En Tránsito</th>
                                                <th className="w-[150px] px-4 py-3 text-left font-semibold">Cantidad</th>
                                                <th className="w-[200px] px-4 py-3 text-left font-semibold">Observaciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {productosPaginados.map((producto) => (
                                                <tr key={producto.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                    <td className="px-4 py-2">
                                                        <div className="flex items-center gap-3">
                                                            <img
                                                                src={producto.imagen_url || 'https://via.placeholder.com/40'}
                                                                alt={producto.nombre}
                                                                className="h-10 w-10 rounded-md object-cover"
                                                            />
                                                            <div>
                                                                <div
                                                                    className="cursor-pointer font-semibold text-gray-800 hover:text-blue-600 dark:text-gray-200 dark:hover:text-blue-400"
                                                                    onClick={() => handleProductClick(producto)}
                                                                >
                                                                    {producto.nombre}
                                                                </div>
                                                                <div className="text-xs text-gray-500">{producto.marca || 'N/A'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{producto.modelo}</td>
                                                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{producto.capacidad || 'N/A'}</td>
                                                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{producto.color || 'N/A'}</td>
                                                    <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{producto.categoria}</td>
                                                    <td className="px-4 py-2 text-center">
                                                        <span className="font-bold text-green-600 dark:text-green-400">
                                                            {producto.stock_disponible}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        <span className="font-medium text-amber-600 dark:text-amber-400">
                                                            {producto.stock_en_transito}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <Input
                                                            type="number"
                                                            className="w-full"
                                                            min="0"
                                                            max={producto.stock_disponible}
                                                            placeholder="0"
                                                            value={cantidades[producto.id] || ''}
                                                            onChange={(e) =>
                                                                setCantidades((prev) => ({
                                                                    ...prev,
                                                                    [producto.id]: parseInt(e.target.value) || 0,
                                                                }))
                                                            }
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <Input
                                                            type="text"
                                                            className="w-full"
                                                            placeholder="Opcional..."
                                                            value={observacionesProd[producto.id] || ''}
                                                            onChange={(e) =>
                                                                setObservacionesProd((prev) => ({
                                                                    ...prev,
                                                                    [producto.id]: e.target.value,
                                                                }))
                                                            }
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Paginación Productos */}
                                {totalPaginasProductos > 1 && (
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-muted-foreground">
                                            Mostrando {(paginaProductos - 1) * PRODUCTOS_POR_PAGINA + 1} a{' '}
                                            {Math.min(paginaProductos * PRODUCTOS_POR_PAGINA, productosEmisor.length)} de {productosEmisor.length}{' '}
                                            productos
                                        </div>
                                        <Pagination className="w-auto mx-0">
                                            <PaginationContent>
                                                <PaginationItem>
                                                    <PaginationLink
                                                        href="#"
                                                        onClick={(e) => { e.preventDefault(); if (paginaProductos > 1) setPaginaProductos(p => p - 1); }}
                                                        className={paginaProductos === 1 ? 'pointer-events-none opacity-50' : ''}
                                                    >
                                                        <ChevronLeft className="h-4 w-4" />
                                                    </PaginationLink>
                                                </PaginationItem>
                                                {Array.from({ length: totalPaginasProductos }, (_, i) => i + 1)
                                                    .filter(p => {
                                                        const delta = Math.abs(p - paginaProductos);
                                                        return delta <= 2 || p === 1 || p === totalPaginasProductos;
                                                    })
                                                    .map((p, idx, arr) => {
                                                        const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                                                        return (
                                                            <React.Fragment key={p}>
                                                                {showEllipsisBefore && (
                                                                    <PaginationItem>
                                                                        <PaginationEllipsis />
                                                                    </PaginationItem>
                                                                )}
                                                                <PaginationItem>
                                                                    <PaginationLink
                                                                        href="#"
                                                                        isActive={p === paginaProductos}
                                                                        onClick={(e) => { e.preventDefault(); setPaginaProductos(p); }}
                                                                    >
                                                                        {p}
                                                                    </PaginationLink>
                                                                </PaginationItem>
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                <PaginationItem>
                                                    <PaginationLink
                                                        href="#"
                                                        onClick={(e) => { e.preventDefault(); if (paginaProductos < totalPaginasProductos) setPaginaProductos(p => p + 1); }}
                                                        className={paginaProductos === totalPaginasProductos ? 'pointer-events-none opacity-50' : ''}
                                                    >
                                                        <ChevronRight className="h-4 w-4" />
                                                    </PaginationLink>
                                                </PaginationItem>
                                            </PaginationContent>
                                        </Pagination>
                                    </div>
                                )}
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
                <Card className="overflow-hidden border-l-4 border-violet-500/30 pt-0 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader className="border-b bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <History className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Historial de Movimientos</CardTitle>
                                <CardDescription className="text-violet-100">Gestiona y monitorea el flujo de tus movimientos logísticos</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                                    <tr>
                                        <th className="px-6 py-3 text-left font-semibold">#Productos</th>
                                        <th className="px-6 py-3 text-left font-semibold">Origen → Destino</th>
                                        <th className="px-6 py-3 text-left font-semibold">Cantidad</th>
                                        <th className="px-6 py-3 text-left font-semibold">Estado</th>
                                        <th className="px-6 py-3 text-left font-semibold">Solicitado por</th>
                                        <th className="px-6 py-3 text-left font-semibold">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {movimientos.data.map((movimiento: MovimientoWithDetails) => (
                                        <tr key={movimiento.id} className="transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                                                    {movimiento.detalles?.length || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{movimiento.almacen_origen?.nombre_almacen}</span>
                                                    <TrendingUp className="h-4 w-4 rotate-90" />
                                                    <span className="font-medium">{movimiento.almacen_destino?.nombre_almacen}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-semibold">
                                                    {movimiento.detalles?.reduce((total: number, detalle) => total + detalle.cantidad_solicitada, 0)}{' '}
                                                    unidades
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <EstadoBadge estado={movimiento.estado} label={estados[movimiento.estado]} />
                                            </td>
                                            <td className="px-6 py-4">{movimiento.usuario?.name}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleVerSeguimiento(movimiento)}
                                                        title="Ver seguimiento"
                                                        className="cursor-pointer"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        title="Ver productos del movimiento"
                                                        className="cursor-pointer"
                                                        onClick={() => handleVerProductosClick(movimiento)}
                                                    >
                                                        <PackageSearch className="h-4 w-4" />
                                                    </Button>

                                                    <Link href={`/movimientos/${movimiento.id}`}>
                                                        <Button variant="outline" size="sm" title="Ver detalle completo" className="cursor-pointer">
                                                            <ListCheck className="h-4 w-4" />
                                                        </Button>
                                                    </Link>

                                                    {movimiento.estado === 'pendiente_confirmacion' && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleEnviarClick(movimiento)}
                                                                title="Despachar movimiento"
                                                                className="gap-1"
                                                            >
                                                                <Send className="h-3.5 w-3.5" /> Enviar
                                                            </Button>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => handleRechazarClick(movimiento)}
                                                                title="Rechazar movimiento"
                                                            >
                                                                <XCircle className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </>
                                                    )}

                                                    {movimiento.estado === 'en_transito' &&
                                                        (!isVendedor || userAlmacenesIds.includes(movimiento.almacen_destino_id)) && (
                                                            <Button
                                                                size="sm"
                                                                className="gap-1"
                                                                onClick={() => handleRecibirClick(movimiento)}
                                                                title="Registrar recepción"
                                                            >
                                                                <Package className="h-3.5 w-3.5" /> Recibir
                                                            </Button>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        {movimientos.links && (
                            <div className="mt-4 flex items-center justify-between">
                                <div className="text-sm">
                                    Mostrando {movimientos.from} a {movimientos.to} de {movimientos.total} resultados
                                </div>
                                <div className="flex space-x-2">
                                    {movimientos.links.map((link, index: number) => {
                                        const displayLabel = link.label
                                            .replace('&laquo;', '«')
                                            .replace('&raquo;', '»')
                                            .replace('pagination.previous', '«')
                                            .replace('pagination.next', '»');

                                        return (
                                            <Button
                                                key={index}
                                                variant={link.active ? 'default' : 'outline'}
                                                size="sm"
                                                disabled={!link.url}
                                                onClick={() => router.get(link.url || '#')}
                                            >
                                                {displayLabel}
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* AlertDialog - Ver Seguimiento */}
                <AlertDialog open={showDialogs.seguimiento} onOpenChange={(open) => setShowDialogs({ ...showDialogs, seguimiento: open })}>
                    <AlertDialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl">Seguimiento del Movimiento #{selectedMovimiento?.id}</AlertDialogTitle>
                        </AlertDialogHeader>

                        <div className="space-y-3 py-4">
                            {selectedMovimiento?.seguimientos && selectedMovimiento.seguimientos.length > 0 ? (
                                selectedMovimiento.seguimientos.map((seguimiento) => (
                                    <div key={seguimiento.id} className="relative border-l-4 border-blue-300 pb-3 pl-4">
                                        <div className="mb-2 flex items-start justify-between">
                                            <EstadoBadge estado={seguimiento.estado} label={estados[seguimiento.estado]} />
                                            <span className="text-xs text-gray-500">{new Date(seguimiento.created_at).toLocaleString('es-ES')}</span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-700">{seguimiento.observaciones}</p>
                                        <p className="mt-1 text-xs text-gray-500">Por: {seguimiento.usuario?.name}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500">No hay registros de seguimiento</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2">
                            <AlertDialogCancel>Cerrar</AlertDialogCancel>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>

                {/* AlertDialog - Ver Productos (vista rápida, cualquier estado, sin salir del listado) */}
                <AlertDialog open={showDialogs.verProductos} onOpenChange={(open) => setShowDialogs({ ...showDialogs, verProductos: open })}>
                    <AlertDialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-3xl">
                        <AlertDialogHeader className="shrink-0 border-b bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <PackageSearch className="h-5 w-5" />
                                </div>
                                <div>
                                    <AlertDialogTitle className="text-white">Productos del Movimiento #{selectedMovimiento?.id}</AlertDialogTitle>
                                    <AlertDialogDescription className="text-blue-100">
                                        {selectedMovimiento?.almacen_origen?.nombre_almacen} → {selectedMovimiento?.almacen_destino?.nombre_almacen} ·{' '}
                                        {selectedMovimiento && estados[selectedMovimiento.estado]}
                                    </AlertDialogDescription>
                                </div>
                            </div>
                        </AlertDialogHeader>

                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 sticky top-0">
                                    <tr>
                                        <th className="px-2 py-2 text-left font-semibold">Producto</th>
                                        <th className="px-2 py-2 text-center font-semibold">Solicitada</th>
                                        <th className="px-2 py-2 text-center font-semibold">Despachada</th>
                                        <th className="px-2 py-2 text-center font-semibold">Recibida</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedMovimiento?.detalles.map((detalle) => (
                                        <tr key={detalle.id} className="border-b">
                                            <td className="px-2 py-2">
                                                <div className="font-medium">{detalle.producto?.nombre_producto}</div>
                                                <div className="text-muted-foreground text-xs">
                                                    {[
                                                        detalle.producto?.marca_producto,
                                                        detalle.producto?.modelo_producto,
                                                        detalle.producto?.capacidad_producto,
                                                        detalle.producto?.categoria?.nombre_categoria,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-center">{detalle.cantidad_solicitada}</td>
                                            <td className="px-2 py-2 text-center">{detalle.cantidad_despachada}</td>
                                            <td className="px-2 py-2 text-center">
                                                {selectedMovimiento.estado === 'pendiente_confirmacion' ? '—' : detalle.cantidad_recibida}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="shrink-0 border-t px-6 py-4">
                            {selectedMovimiento?.observaciones && (
                                <p className="text-muted-foreground mb-3 text-sm">
                                    <span className="font-medium">Observaciones:</span> {selectedMovimiento.observaciones}
                                </p>
                            )}
                            <div className="flex justify-end gap-2">
                                <AlertDialogCancel>Cerrar</AlertDialogCancel>
                            </div>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>

                {/* AlertDialog - Enviar Movimiento */}
                <AlertDialog open={showDialogs.enviar} onOpenChange={(open) => setShowDialogs({ ...showDialogs, enviar: open })}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Despachar Movimiento</AlertDialogTitle>
                            <AlertDialogDescription>
                                Confirma el despacho del movimiento #{selectedMovimiento?.id}. El stock se reservará en el almacén origen.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="space-y-3 py-4">
                            <div>
                                <Label htmlFor="guia">Guía de Transporte (Opcional)</Label>
                                <Input
                                    id="guia"
                                    placeholder="Ej: GT-2025-001"
                                    value={dialogData.guia}
                                    onChange={(e) => setDialogData({ ...dialogData, guia: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="transportista">Transportista (Opcional)</Label>
                                <Input
                                    id="transportista"
                                    placeholder="Nombre del transportista"
                                    value={dialogData.transportista}
                                    onChange={(e) => setDialogData({ ...dialogData, transportista: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleEnviarConfirm} className="bg-blue-600 hover:bg-blue-700">
                                Confirmar Envío
                            </AlertDialogAction>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>

                {/* AlertDialog - Recibir Movimiento */}
                <AlertDialog open={showDialogs.recibir} onOpenChange={(open) => setShowDialogs({ ...showDialogs, recibir: open })}>
                    <AlertDialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-3xl">
                        <AlertDialogHeader className="shrink-0 border-b bg-gradient-to-r from-green-600 to-green-700 px-6 py-5 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <PackageCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <AlertDialogTitle className="text-white">
                                        Registrar Recepción — Movimiento #{selectedMovimiento?.id}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-green-100">
                                        Confirma las cantidades recibidas por cada producto.
                                    </AlertDialogDescription>
                                </div>
                            </div>
                        </AlertDialogHeader>

                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            <table className="w-full border-collapse text-sm">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-2 py-2 text-left font-semibold">Producto</th>
                                        <th className="px-2 py-2 text-center font-semibold">Despachado</th>
                                        <th className="px-2 py-2 text-center font-semibold">Recibido</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {selectedMovimiento?.detalles.map((detalle) => {
                                        const recibido = productosRecibidos[detalle.producto_id] || 0;
                                        const diferencia = detalle.cantidad_despachada - recibido;
                                        return (
                                            <tr key={detalle.id} className="hover:bg-muted/50">
                                                <td className="px-2 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <img
                                                            src={detalle.producto?.imagen_url || 'https://via.placeholder.com/32'}
                                                            alt={detalle.producto?.nombre_producto}
                                                            className="h-8 w-8 rounded object-cover"
                                                        />
                                                        <div>
                                                            <div className="font-medium">{detalle.producto?.nombre_producto}</div>
                                                            <div className="text-muted-foreground text-xs">
                                                                {[
                                                                    detalle.producto?.marca_producto,
                                                                    detalle.producto?.modelo_producto,
                                                                    detalle.producto?.capacidad_producto,
                                                                    detalle.producto?.categoria?.nombre_categoria,
                                                                ]
                                                                    .filter(Boolean)
                                                                    .join(' · ')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-2 text-center font-semibold">{detalle.cantidad_despachada}</td>
                                                <td className="px-2 py-2">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            max={detalle.cantidad_despachada}
                                                            value={productosRecibidos[detalle.producto_id] ?? ''}
                                                            onChange={(e) =>
                                                                handleCantidadRecibidaChange(
                                                                    detalle.producto_id,
                                                                    e.target.value === '' ? undefined : parseInt(e.target.value) || 0,
                                                                )
                                                            }
                                                            className="h-8 max-w-20 text-center"
                                                        />
                                                        {diferencia === 0 ? (
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                                                                <Check className="h-3 w-3" /> Completo
                                                            </span>
                                                        ) : diferencia > 0 ? (
                                                            <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                                                                Faltan {diferencia}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                                                                +{Math.abs(diferencia)} de más
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="shrink-0 border-t px-6 py-4">
                            <div className="mb-3 flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                                <span className="text-muted-foreground">Total a confirmar</span>
                                <span className="font-semibold">
                                    {totalRecibidoRecibir} / {totalDespachadoRecibir} unidades
                                    {totalRecibidoRecibir !== totalDespachadoRecibir && (
                                        <span className="ml-2 font-normal text-amber-600 dark:text-amber-400">
                                            ({totalDespachadoRecibir - totalRecibidoRecibir > 0 ? 'faltan' : 'de más'}{' '}
                                            {Math.abs(totalDespachadoRecibir - totalRecibidoRecibir)})
                                        </span>
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-end gap-2">
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleRecibirConfirm} className="bg-green-600 hover:bg-green-700">
                                    Confirmar Recepción
                                </AlertDialogAction>
                            </div>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>

                {/* AlertDialog - Rechazar Movimiento */}
                <AlertDialog open={showDialogs.rechazar} onOpenChange={(open) => setShowDialogs({ ...showDialogs, rechazar: open })}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Rechazar Movimiento</AlertDialogTitle>
                            <AlertDialogDescription>
                                Ingresa el motivo del rechazo. El stock será liberado si el movimiento estaba en tránsito.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div className="py-4">
                            <Label htmlFor="observaciones">Motivo del Rechazo</Label>
                            <textarea
                                id="observaciones"
                                placeholder="Especifica el motivo del rechazo..."
                                value={dialogData.observaciones}
                                onChange={(e) => setDialogData({ ...dialogData, observaciones: e.target.value })}
                                className="mt-2 w-full rounded-md border border-gray-300 p-2 focus:border-transparent focus:ring-2 focus:ring-red-500"
                                rows={3}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRechazarConfirm} className="bg-red-600 hover:bg-red-700">
                                Confirmar Rechazo
                            </AlertDialogAction>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Dialog - Detalles del Producto */}
                <Dialog open={showDialogs.producto} onOpenChange={(open) => setShowDialogs({ ...showDialogs, producto: open })}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Detalles del Producto</DialogTitle>
                        </DialogHeader>
                        {selectedProductDetails && (
                            <div className="flex flex-col gap-4">
                                <div className="mx-auto flex h-48 w-48 items-center justify-center overflow-hidden rounded-lg border bg-gray-50 p-2">
                                    <img
                                        src={selectedProductDetails.imagen_url || '/placeholder.png'}
                                        alt={selectedProductDetails.nombre}
                                        className="h-full w-full object-contain"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="text-center">
                                        <h3 className="text-lg font-bold text-gray-900">{selectedProductDetails.nombre}</h3>
                                        <p className="text-sm text-gray-500">{selectedProductDetails.codigo}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-sm">
                                        <div>
                                            <p className="font-medium text-gray-500">Marca</p>
                                            <p className="font-semibold text-gray-900">{selectedProductDetails.marca || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-500">Modelo</p>
                                            <p className="font-semibold text-gray-900">{selectedProductDetails.modelo || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-500">Capacidad</p>
                                            <p className="font-semibold text-gray-900">{selectedProductDetails.capacidad || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-500">Color</p>
                                            <p className="font-semibold text-gray-900">{selectedProductDetails.color || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-500">Stock Disponible</p>
                                            <p className="font-semibold text-green-600">{selectedProductDetails.stock_disponible}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
            <Toaster position="top-center" />
            <ScrollProgress />
        </AppLayout>
    );
}
