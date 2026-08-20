import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Link } from '@inertiajs/react';
import { ArrowRight, Calendar, DollarSign, Package } from 'lucide-react';

// ✅ INTERFACES ACTUALIZADAS con el sistema de monedas
interface Moneda {
    id: number;
    codigo_moneda: string;
    nombre_moneda: string;
    simbolo_moneda: string;
    tasa_cambio: number;
    estado: boolean;
    principal: boolean;
}

interface Cuenta {
    id: number;
    nombre_cuenta: string;
    saldo_cuenta: number;
    deuda: number;
    tipo_cuenta: string;
    estado: string;
    moneda_id: number;
    moneda: Moneda;
}

// ✅ Interface para productos (evitar any)
interface Producto {
    id: number;
    nombre_producto: string;
    precio_compra_producto: number;
    // ... otras propiedades necesarias
}

interface Compra {
    id: number;
    fecha_compra: string;
    total_compra: number | string; // ✅ Puede ser número o string
    productos: Producto[];
}

interface Props {
    compras: Compra[];
    cuentas: Cuenta[];
    tasaCambioActual: number;
}

export default function CostosAdicionales({ compras, cuentas, tasaCambioActual }: Props) {
    // ✅ Filtrar cuentas CUP usando la nueva relación con monedas
    const cuentasCUP = cuentas.filter((cuenta) => cuenta.moneda.codigo_moneda === 'CUP' && cuenta.estado === 'activa');

    // ✅ Función para formatear fecha
    const formatFecha = (fecha: string) => {
        try {
            return new Date(fecha).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return fecha;
        }
    };

    // ✅ Función segura para formatear el total
    const formatTotalCompra = (total: number | string): string => {
        if (typeof total === 'number') {
            return total.toFixed(2);
        }

        // Si es string, intentar convertir a número
        const num = parseFloat(total);
        return isNaN(num) ? '0.00' : num.toFixed(2);
    };

    // ✅ Función MEJORADA para formatear números - MÁS ROBUSTA
    const formatNumber = (value: any): string => {
        // Si ya es string con formato, limpiarlo
        if (typeof value === 'string') {
            // Remover cualquier caracter no numérico excepto punto decimal
            const cleaned = value.replace(/[^\d.]/g, '');
            const num = parseFloat(cleaned);
            return isNaN(num) ? '0.00' : num.toFixed(2);
        }

        // Si es número, formatear directamente
        if (typeof value === 'number') {
            return value.toFixed(2);
        }

        // Para cualquier otro caso (null, undefined, object, etc.)
        return '0.00';
    };

    return (
        <div className="space-y-6">
            {/* ✅ HEADER INFORMATIVO */}
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:border-blue-800 dark:from-blue-950/20 dark:to-indigo-950/20">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
                            <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Distribución de Costos Adicionales</h3>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                Seleccione una compra para distribuir costos adicionales como transporte, aranceles, etc.
                                <br />
                                <span className="text-xs opacity-75">
                                    Tasa de cambio actual: <Badge variant="outline">{formatNumber(tasaCambioActual)} CUP/USD</Badge>
                                </span>
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ✅ TABLA DE COMPRAS */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Compras para Distribuir Costos
                    </CardTitle>
                    <CardDescription>
                        Seleccione una compra para distribuir manualmente los costos adicionales entre sus productos. Solo disponible para cuentas en
                        moneda CUP.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-20">ID</TableHead>
                                <TableHead className="w-32">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        Fecha
                                    </div>
                                </TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>
                                    <div className="flex items-center gap-1">
                                        <Package className="h-4 w-4" />
                                        Productos
                                    </div>
                                </TableHead>
                                <TableHead>Cuentas CUP Disponibles</TableHead>
                                <TableHead className="w-32 text-right">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {compras.length > 0 ? (
                                compras.map((compra) => (
                                    <TableRow key={compra.id} className="group hover:bg-muted/50">
                                        <TableCell className="font-medium">
                                            <Badge variant="secondary">#{compra.id}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm">{formatFecha(compra.fecha_compra)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <DollarSign className="h-4 w-4 text-green-600" />
                                                <span className="font-semibold">{formatTotalCompra(compra.total_compra)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs">
                                                {compra.productos.length} productos
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                {cuentasCUP.length > 0 ? (
                                                    cuentasCUP.slice(0, 2).map((cuenta) => (
                                                        <div key={cuenta.id} className="text-muted-foreground text-xs">
                                                            • {cuenta.nombre_cuenta}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-red-500">No hay cuentas CUP disponibles</span>
                                                )}
                                                {cuentasCUP.length > 2 && (
                                                    <div className="text-muted-foreground text-xs">+{cuentasCUP.length - 2} más...</div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={route('distribucion-costos.formulario', compra.id)}>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="cursor-pointer transition-colors group-hover:bg-blue-500 group-hover:text-white"
                                                >
                                                    <ArrowRight className="mr-1 h-4 w-4" />
                                                    Distribuir
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center">
                                        <div className="text-muted-foreground flex flex-col items-center gap-2">
                                            <Package className="h-12 w-12 opacity-50" />
                                            <p>No se encontraron compras recientes</p>
                                            <p className="text-sm">Las compras aparecerán aquí una vez que sean registradas</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ✅ INFORMACIÓN ADICIONAL */}
            <Card className="bg-muted/50">
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                        <div className="text-center">
                            <div className="font-semibold text-blue-600">{compras.length}</div>
                            <div className="text-muted-foreground">Compras totales</div>
                        </div>
                        <div className="text-center">
                            <div className="font-semibold text-green-600">{cuentasCUP.length}</div>
                            <div className="text-muted-foreground">Cuentas CUP disponibles</div>
                        </div>
                        <div className="text-center">
                            <div className="font-semibold text-orange-600">{formatNumber(tasaCambioActual)}</div>
                            <div className="text-muted-foreground">Tasa CUP/USD</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
