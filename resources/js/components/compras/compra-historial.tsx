import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { AlertTriangle, CheckCircle, Clock, CreditCard, DollarSign, Info, ShoppingBasket, XCircle } from 'lucide-react';

export interface CompraReciente {
    id: number;
    fecha_compra: string;
    total_compra: number;
    tipo_compra: 'pago_cash' | 'deuda_proveedor';
    estado: 'pendiente' | 'aprobada' | 'anulada';
    /** Cliente al que se le compró. */
    proveedor: string | null;
    es_parcial: boolean;
}

const ESTADO_COMPRA_CONFIG = {
    pendiente: { label: 'Pendiente', className: 'bg-amber-500 text-white hover:opacity-90', icon: Clock },
    aprobada: { label: 'Aprobada', className: 'bg-emerald-600 text-white hover:opacity-90', icon: CheckCircle },
    anulada: { label: 'Anulada', className: 'bg-red-500 text-white hover:opacity-90', icon: XCircle },
} as const;

/** Últimas compras registradas, con su tipo (contado, parcial, crédito) y estado. */
export default function CompraHistorial({ compras }: { compras: CompraReciente[] }) {
    if (compras.length === 0) return null;

    return (
        <Card className="mt-4 overflow-hidden border-0 pt-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                        <ShoppingBasket className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-semibold text-white">Historial de Compras Recientes</CardTitle>
                        <CardDescription className="text-xs text-amber-100">Últimas {compras.length} compras registradas</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-100 dark:bg-gray-800">
                            <TableHead>#</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Asociado</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-center">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {compras.map((compra) => {
                            const estado = ESTADO_COMPRA_CONFIG[compra.estado];
                            const EstadoIcon = estado.icon;

                            return (
                                <TableRow key={compra.id}>
                                    <TableCell className="font-mono text-xs text-gray-500">#{String(compra.id).padStart(6, '0')}</TableCell>
                                    <TableCell className="text-sm">
                                        {new Date(compra.fecha_compra).toLocaleDateString('es-MX', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                        })}
                                    </TableCell>
                                    <TableCell className="font-medium">{compra.proveedor ?? 'Sin registro'}</TableCell>
                                    <TableCell>
                                        <Badge
                                            className={cn(
                                                'text-white hover:opacity-90',
                                                compra.tipo_compra === 'deuda_proveedor'
                                                    ? 'bg-red-500'
                                                    : compra.es_parcial
                                                      ? 'bg-amber-500'
                                                      : 'bg-emerald-500',
                                            )}
                                        >
                                            {compra.tipo_compra === 'deuda_proveedor' ? (
                                                <CreditCard className="h-3 w-3" />
                                            ) : compra.es_parcial ? (
                                                <AlertTriangle className="h-3 w-3" />
                                            ) : (
                                                <DollarSign className="h-3 w-3" />
                                            )}
                                            {compra.tipo_compra === 'deuda_proveedor' ? 'Crédito' : compra.es_parcial ? 'Parcial' : 'Contado'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={estado.className}>
                                            <EstadoIcon className="h-3 w-3" />
                                            {estado.label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-emerald-600">
                                        ${compra.total_compra.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Link href={route('comprar.show', compra.id)}>
                                            <Button size="sm" variant="outline" className="gap-1">
                                                <Info className="h-3 w-3" />
                                                Ver detalle
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
