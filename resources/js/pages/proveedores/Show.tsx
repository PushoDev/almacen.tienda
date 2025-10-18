import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { CompraProveedor, EstadisticasProveedor, ProveedorProps, TransaccionProveedor, type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Building,
    Calendar,
    CreditCard,
    DollarSign,
    Eye,
    FileText,
    Handshake,
    History,
    Mail,
    MapPin,
    Package,
    Phone,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

interface ShowProveedoresPageProps {
    proveedor: ProveedorProps;
    compras: CompraProveedor[];
    transacciones: TransaccionProveedor[];
    estadisticas: EstadisticasProveedor;
}

const breadcrumbs = (proveedor: ProveedorProps): BreadcrumbItem[] => [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Proveedores',
        href: '/proveedores',
    },
    {
        title: `Detalles - ${proveedor.nombre_proveedor}`,
        href: '#',
    },
];

// Componente Modal para detalles de compra
const DetallesCompraModal = ({ compra, isOpen, onClose }: { compra: CompraProveedor | null; isOpen: boolean; onClose: () => void }) => {
    if (!isOpen || !compra) return null;

    const formatearMoneda = (valor: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(valor);
    };

    return (
        <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
            <div className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-lg bg-white p-6 dark:bg-gray-800">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Detalles de Compra #{compra.id}</h3>
                    <Button variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <p>
                            <strong>Fecha:</strong> {new Date(compra.fecha_compra).toLocaleDateString('es-ES')}
                        </p>
                        <p>
                            <strong>Tipo:</strong>
                            <Badge variant={compra.tipo_compra === 'deuda_proveedor' ? 'destructive' : 'default'} className="ml-2">
                                {compra.tipo_compra === 'deuda_proveedor' ? 'A Crédito' : 'Al Contado'}
                            </Badge>
                        </p>
                    </div>
                    <div>
                        <p>
                            <strong>Total:</strong> {formatearMoneda(compra.total_compra)}
                        </p>
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Producto</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Cantidad</TableHead>
                            <TableHead>Precio Unitario</TableHead>
                            <TableHead>Subtotal</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {compra.productos.map((producto) => (
                            <TableRow key={producto.id}>
                                <TableCell>
                                    <div>
                                        <div className="font-medium">{producto.nombre_producto}</div>
                                        {producto.marca_producto && (
                                            <div className="text-muted-foreground text-sm">Marca: {producto.marca_producto}</div>
                                        )}
                                        {producto.codigo_producto && (
                                            <div className="text-muted-foreground text-sm">Código: {producto.codigo_producto}</div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>{producto.categoria?.nombre_categoria}</TableCell>
                                <TableCell>{producto.pivot.cantidad}</TableCell>
                                <TableCell>{formatearMoneda(producto.pivot.precio)}</TableCell>
                                <TableCell>{formatearMoneda(producto.pivot.cantidad * producto.pivot.precio)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default function ShowProveedoresPage({ proveedor, compras, transacciones, estadisticas }: ShowProveedoresPageProps) {
    const [compraSeleccionada, setCompraSeleccionada] = useState<CompraProveedor | null>(null);
    const [modalAbierto, setModalAbierto] = useState(false);

    // Función para formatear el saldo
    const formatearMoneda = (valor: number | null) => {
        if (valor === null || valor === undefined || isNaN(valor)) return '$0.00';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 8,
        }).format(valor);
    };

    // Función para formatear fecha
    const formatearFecha = (fecha: string) => {
        return new Date(fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    // Determinar el estado del saldo
    const getEstadoSaldo = (saldo: number) => {
        if (saldo < 0) return { texto: 'En Deuda', color: 'destructive', icon: TrendingDown };
        if (saldo > 0) return { texto: 'Con Fondo', color: 'default', icon: TrendingUp };
        return { texto: 'Neutral', color: 'secondary', icon: DollarSign };
    };

    // Función para abrir modal de detalles de compra
    const abrirDetallesCompra = (compra: CompraProveedor) => {
        setCompraSeleccionada(compra);
        setModalAbierto(true);
    };

    // Función para cerrar modal
    const cerrarModal = () => {
        setModalAbierto(false);
        setCompraSeleccionada(null);
    };

    const estadoSaldo = getEstadoSaldo(proveedor.saldo_proveedor);

    return (
        <AppLayout breadcrumbs={breadcrumbs(proveedor)}>
            <Head title={`Proveedor - ${proveedor.nombre_proveedor}`} />

            {/* Modal de detalles de compra */}
            <DetallesCompraModal compra={compraSeleccionada} isOpen={modalAbierto} onClose={cerrarModal} />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header Section */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <HeadingSmall
                                title={`Proveedor: ${proveedor.nombre_proveedor}`}
                                description="Detalles completos del proveedor y sus operaciones"
                            />
                        </div>
                    </div>
                    <Handshake
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Link href={route('proveedores.index')}>
                        <Button variant="outline" className="flex cursor-pointer items-center gap-2">
                            <ArrowLeft size={16} />
                            Volver
                        </Button>
                    </Link>
                    <Link href={route('proveedores.edit', { proveedor: proveedor.id })}>
                        <Button variant="default" className="flex cursor-pointer items-center gap-2">
                            Editar
                        </Button>
                    </Link>
                </div>
                <Separator className="col-span-4" />

                {/* Información Principal del Proveedor */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {/* Información Básica */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building className="h-5 w-5" />
                                Información del Proveedor
                            </CardTitle>
                            <CardDescription>Datos de contacto y ubicación</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="flex items-center gap-3">
                                    <Phone className="text-muted-foreground h-4 w-4" />
                                    <div>
                                        <p className="text-sm font-medium">Teléfono</p>
                                        <p className="text-muted-foreground text-sm">{proveedor.telefono_proveedor || 'No especificado'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Mail className="text-muted-foreground h-4 w-4" />
                                    <div>
                                        <p className="text-sm font-medium">Correo Electrónico</p>
                                        <p className="text-muted-foreground text-sm">{proveedor.correo_proveedor || 'No especificado'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <MapPin className="text-muted-foreground h-4 w-4" />
                                    <div>
                                        <p className="text-sm font-medium">Localidad</p>
                                        <p className="text-muted-foreground text-sm">{proveedor.localidad_proveedor || 'No especificado'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <FileText className="text-muted-foreground h-4 w-4" />
                                    <div>
                                        <p className="text-sm font-medium">Notas</p>
                                        <p className="text-muted-foreground text-sm">{proveedor.notas_proveedor || 'Sin notas adicionales'}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Estado Financiero */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="h-5 w-5" />
                                Estado Financiero
                            </CardTitle>
                            <CardDescription>Saldo y estadísticas</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Saldo Actual</span>
                                <Badge variant={estadoSaldo.color as 'destructive' | 'default' | 'secondary'} className="flex items-center gap-1">
                                    <estadoSaldo.icon className="h-3 w-3" />
                                    {estadoSaldo.texto}
                                </Badge>
                            </div>
                            <div className="text-2xl font-bold">{formatearMoneda(proveedor.saldo_proveedor)}</div>
                            <Separator />
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Total Compras:</span>
                                    <span className="font-medium">{estadisticas.total_compras}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Monto en Compras:</span>
                                    <span className="font-medium">{formatearMoneda(estadisticas.monto_total_compras)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Transacciones:</span>
                                    <span className="font-medium">{estadisticas.total_transacciones}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Ingresos Recibidos:</span>
                                    <span className="font-medium text-green-600">{formatearMoneda(estadisticas.monto_total_ingresos)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs para Compras y Transacciones */}
                <Tabs defaultValue="compras" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="compras" className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Compras ({compras.length})
                        </TabsTrigger>
                        <TabsTrigger value="transacciones" className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Transacciones ({transacciones.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab de Compras */}
                    <TabsContent value="compras" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <History className="h-5 w-5" />
                                    Historial de Compras
                                </CardTitle>
                                <CardDescription>Todas las compras realizadas a este proveedor</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {compras.length > 0 ? (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Tipo</TableHead>
                                                    <TableHead>Productos</TableHead>
                                                    <TableHead>Total</TableHead>
                                                    <TableHead>Detalles</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {compras.map((compra) => (
                                                    <TableRow key={compra.id}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="text-muted-foreground h-4 w-4" />
                                                                {formatearFecha(compra.fecha_compra)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={compra.tipo_compra === 'deuda_proveedor' ? 'destructive' : 'default'}>
                                                                {compra.tipo_compra === 'deuda_proveedor' ? 'A Crédito' : 'Al Contado'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="max-w-[200px]">
                                                                {compra.productos.slice(0, 2).map((producto) => (
                                                                    <div key={producto.id} className="truncate text-sm">
                                                                        {producto.nombre_producto} ({producto.pivot.cantidad})
                                                                    </div>
                                                                ))}
                                                                {compra.productos.length > 2 && (
                                                                    <div className="text-muted-foreground text-xs">
                                                                        +{compra.productos.length - 2} más
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-medium">{formatearMoneda(compra.total_compra)}</TableCell>
                                                        <TableCell>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => abrirDetallesCompra(compra)}
                                                                className="flex cursor-pointer items-center gap-1"
                                                            >
                                                                <Eye size={14} />
                                                                Ver Detalles
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="py-8 text-center">
                                        <Package className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                                        <p className="text-muted-foreground">No se han realizado compras a este proveedor</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab de Transacciones */}
                    <TabsContent value="transacciones" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CreditCard className="h-5 w-5" />
                                    Historial de Transacciones
                                </CardTitle>
                                <CardDescription>Transacciones financieras donde el proveedor recibió fondos</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {transacciones.length > 0 ? (
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Fecha</TableHead>
                                                    <TableHead>Tipo</TableHead>
                                                    <TableHead>Descripción</TableHead>
                                                    <TableHead>Monto</TableHead>
                                                    <TableHead>Moneda</TableHead>
                                                    <TableHead>Origen</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {transacciones.map((transaccion) => (
                                                    <TableRow key={transaccion.id}>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <Calendar className="text-muted-foreground h-4 w-4" />
                                                                {formatearFecha(transaccion.fecha_operacion)}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant={
                                                                    transaccion.tipo_movimiento_id === 1
                                                                        ? 'destructive'
                                                                        : transaccion.tipo_movimiento_id === 2
                                                                          ? 'default'
                                                                          : 'secondary'
                                                                }
                                                            >
                                                                {transaccion.tipo_movimiento_id === 1
                                                                    ? 'Gasto'
                                                                    : transaccion.tipo_movimiento_id === 2
                                                                      ? 'Ingreso'
                                                                      : 'Transferencia'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="max-w-[200px] truncate">{transaccion.descripcion}</TableCell>
                                                        <TableCell className="font-medium text-green-600">
                                                            +{formatearMoneda(transaccion.monto)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{transaccion.moneda}</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {transaccion.cuenta_origen_id && transaccion.cuenta_origen && (
                                                                <span className="text-sm">Cuenta: {transaccion.cuenta_origen.nombre_cuenta}</span>
                                                            )}
                                                            {transaccion.cliente_origen_id && transaccion.cliente_origen && (
                                                                <span className="text-sm">Cliente: {transaccion.cliente_origen.nombre_cliente}</span>
                                                            )}
                                                            {!transaccion.cuenta_origen_id && !transaccion.cliente_origen_id && (
                                                                <span className="text-muted-foreground text-sm">N/A</span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="py-8 text-center">
                                        <CreditCard className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                                        <p className="text-muted-foreground">No hay transacciones registradas para este proveedor</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
