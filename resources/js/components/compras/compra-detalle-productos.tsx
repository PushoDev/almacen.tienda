import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HardDrive, Layers, Package, Palette, Store, Tag } from 'lucide-react';
import { formatearMoneda, ProductoCompra } from './tipos-compra';

interface CompraDetalleProductosProps {
    productos: ProductoCompra[];
    total: number;
}

/** Tabla "Productos Adquiridos" del detalle de una compra, con su total general. */
export default function CompraDetalleProductos({ productos, total }: CompraDetalleProductosProps) {
    return (
        <Card className="overflow-hidden border-0 pt-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                        <Package className="h-5 w-5" />
                    </div>
                    <div className="flex flex-1 items-center justify-between">
                        <CardTitle className="text-base font-semibold text-white">Productos Adquiridos</CardTitle>
                        <Badge variant="outline" className="border-white/30 bg-white/20 text-white backdrop-blur-sm">
                            {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-100 dark:bg-gray-800">
                            <TableHead>Producto / Código</TableHead>
                            <TableHead>Especificaciones</TableHead>
                            <TableHead>Almacén</TableHead>
                            <TableHead className="text-center">Cant.</TableHead>
                            <TableHead className="text-right">P. Unit.</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {productos.map((p, i) => (
                            <TableRow key={i}>
                                <TableCell className="font-semibold">
                                    <div className="flex items-center gap-2">
                                        <span>{p.nombre_producto}</span>
                                        {p.es_producto_nuevo && (
                                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">Nuevo</Badge>
                                        )}
                                    </div>
                                    <div className="text-muted-foreground font-mono text-xs">{p.codigo_producto}</div>
                                    {p.categoria && (
                                        <Badge variant="outline" className="mt-1 text-xs font-normal">
                                            {p.categoria}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-sm">
                                    {p.marca_producto || p.modelo_producto || p.capacidad_producto || p.color_producto ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {p.marca_producto && (
                                                <Badge variant="secondary" className="font-normal">
                                                    <Tag />
                                                    <span className="text-muted-foreground">Marca:</span> {p.marca_producto}
                                                </Badge>
                                            )}
                                            {p.modelo_producto && (
                                                <Badge variant="secondary" className="font-normal">
                                                    <Layers />
                                                    <span className="text-muted-foreground">Modelo:</span> {p.modelo_producto}
                                                </Badge>
                                            )}
                                            {p.capacidad_producto && (
                                                <Badge variant="secondary" className="font-normal">
                                                    <HardDrive />
                                                    <span className="text-muted-foreground">Capacidad:</span> {p.capacidad_producto}
                                                </Badge>
                                            )}
                                            {p.color_producto && (
                                                <Badge variant="secondary" className="font-normal">
                                                    <Palette />
                                                    <span className="text-muted-foreground">Color:</span> {p.color_producto}
                                                </Badge>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">Sin especificaciones</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">
                                        <Store className="mr-1 h-3 w-3" />
                                        {p.almacen.nombre_almacen}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center font-bold">{p.pivot.cantidad}</TableCell>
                                <TableCell className="text-right">{formatearMoneda(p.pivot.precio)}</TableCell>
                                <TableCell className="text-right font-bold text-emerald-600">
                                    {formatearMoneda(p.pivot.cantidad * p.pivot.precio)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <Separator />

                <div className="flex items-center justify-end bg-gray-50 p-6 dark:bg-gray-900/50">
                    <div className="text-right">
                        <p className="text-sm text-gray-500">Total general</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatearMoneda(total)}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
