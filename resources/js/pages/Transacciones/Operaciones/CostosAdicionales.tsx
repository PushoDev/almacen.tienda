// resources/js/Pages/Transacciones/Operaciones/Movimientos.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CostosAdicionales() {
    return (
        <div className="space-y-4">
            {/* Tarjeta de Resumen */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>Costos Adicionales</CardTitle>
                        <CardDescription>Descripcion Costos Adicionales</CardDescription>
                    </CardHeader>
                    <CardContent>
                        Costos Adicionales
                    </CardContent>
                </Card>
                {/* Otras tarjetas de resumen pueden ir aquí */}
            </div>

            {/* Tabla de Transacciones */}
            <Card>
                <CardHeader>
                    <CardTitle>Costos Adicionales</CardTitle>
                </CardHeader>
                <CardContent>
                {/*   Espacio para Costos Adicionales*/}
                </CardContent>
            </Card>
        </div>
    );
}
