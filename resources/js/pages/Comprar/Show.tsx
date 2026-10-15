import CompraAnularDialog from '@/components/compras/compra-anular-dialog';
import CompraAprobarDialog from '@/components/compras/compra-aprobar-dialog';
import CompraDetallePagos from '@/components/compras/compra-detalle-pagos';
import CompraDetalleProductos from '@/components/compras/compra-detalle-productos';
import CompraEditarDialog from '@/components/compras/compra-editar-dialog';
import CompraEstadoBanner, { ESTADO_COMPRA_CONFIG } from '@/components/compras/compra-estado-banner';
import CompraResumenWidgets from '@/components/compras/compra-resumen-widgets';
import { CompraDetalle, formatearMoneda, ProductoCompra } from '@/components/compras/tipos-compra';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Package, ShoppingBasket, Users } from 'lucide-react';
import { useState } from 'react';

interface CompraShowProps {
    compra: CompraDetalle;
    productos: ProductoCompra[];
    success?: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Caja Principal', href: route('dashboard') },
    { title: 'Compras', href: route('comprar.index') },
    { title: 'Detalle de Compra', href: '#' },
];

export default function CompraShow({ compra, productos, success }: CompraShowProps) {
    const [aprobarAbierto, setAprobarAbierto] = useState(false);
    const [anularAbierto, setAnularAbierto] = useState(false);
    const [editarAbierto, setEditarAbierto] = useState(false);

    const nombreAsociado = compra.proveedor?.nombre || 'Sin registro';
    const estado = ESTADO_COMPRA_CONFIG[compra.estado];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Compra #${compra.id} - ${estado.label}`} />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header principal — banner de identidad del proyecto, igual que Comprar/Index.tsx */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Detalle de la Compra"
                        description="Revisa los productos y los pagos de esta compra; mientras esté pendiente puedes editarla, aprobarla o anularla."
                    />
                    <ShoppingBasket
                        size={70}
                        color="#f59e0b"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <CompraEstadoBanner
                    compra={compra}
                    onEditar={() => setEditarAbierto(true)}
                    onAprobar={() => setAprobarAbierto(true)}
                    onAnular={() => setAnularAbierto(true)}
                />

                <CompraResumenWidgets compra={compra} />

                <Separator />

                {/* Asociado al que se le compró */}
                <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold text-white">Asociado</CardTitle>
                                <CardDescription className="text-xs text-indigo-100">
                                    {compra.proveedor ? 'Asociado registrado' : 'Sin registro'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{nombreAsociado}</p>
                            <div className="text-right">
                                <p className="text-sm text-gray-500 uppercase">Total</p>
                                <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                                    {formatearMoneda(compra.total_compra)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <CompraDetalleProductos productos={productos} total={compra.total_compra} />

                <CompraDetallePagos compra={compra} />

                {success && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center text-green-800 dark:border-green-800/30 dark:bg-green-950/30 dark:text-green-300">
                        {success}
                    </div>
                )}

                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    {compra.estado === 'aprobada'
                        ? 'Los productos han sido registrados en el inventario y están disponibles en sus almacenes.'
                        : compra.estado === 'pendiente'
                          ? 'El dinero ya se movió, pero el stock solo se sumará al aprobar esta compra.'
                          : 'Esta compra fue anulada y no afecta el inventario.'}
                </p>

                <div className="flex justify-center gap-4">
                    <Link href={route('comprar.index')}>
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                            <Package className="mr-2 h-4 w-4" />
                            Nueva Compra
                        </Button>
                    </Link>
                    <Link href={route('dashboard')}>
                        <Button variant="outline">Caja Principal</Button>
                    </Link>
                </div>
            </div>

            <CompraAprobarDialog open={aprobarAbierto} onOpenChange={setAprobarAbierto} compraId={compra.id} />
            <CompraAnularDialog
                open={anularAbierto}
                onOpenChange={setAnularAbierto}
                compraId={compra.id}
                esDeuda={compra.tipo_compra === 'deuda_proveedor'}
            />
            <CompraEditarDialog open={editarAbierto} onOpenChange={setEditarAbierto} compra={compra} productos={productos} />
        </AppLayout>
    );
}
