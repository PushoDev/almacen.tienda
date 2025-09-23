import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from '@inertiajs/react';

// Define el tipo de los objetos que esperas recibir
interface Compra {
    id: number;
    fecha_compra: string;
    total_compra: number;
    productos: any[];
}

interface Cuenta {
    id: number;
    nombre_cuenta: string;
    tipo_moneda: 'USD' | 'EUR' | 'MLC' | 'CUP';
}

// Define el tipo de las props que recibirá el componente CostosAdicionales
interface Props {
    compras: Compra[];
    cuentas: Cuenta[];
    tasaCambioActual: number;
}

export default function CostosAdicionales({ compras, cuentas, tasaCambioActual }: Props) {
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Distribuir Costos Adicionales</CardTitle>
                    <CardDescription>
                        Selecciona una compra de la lista para distribuir gastos adicionales (como transporte, aranceles, etc.)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID Compra</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Total ($)</TableHead>
                                <TableHead>Productos</TableHead>
                                <TableHead className="text-right">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {compras.length > 0 ? (
                                compras.map((compra) => (
                                    <TableRow key={compra.id}>
                                        <TableCell>{compra.id}</TableCell>
                                        <TableCell>{compra.fecha_compra}</TableCell>
                                        <TableCell>${compra.total_compra}</TableCell>
                                        <TableCell>{compra.productos.length}</TableCell>
                                        <TableCell className="text-right">
                                            {/* Nuevo enlace que redirige a la vista de distribución */}
                                            <Link href={route('transacciones.distribuir-costos.show', compra.id)}>
                                                <Button variant="outline" className="cursor-pointer">
                                                    Distribuir
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">
                                        No se encontraron compras recientes.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
