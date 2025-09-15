// resources/js/Pages/Transacciones/Operaciones/Movimientos.tsx
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function CostosAdicionales() {
    return (
        <div className="space-y-4">
            {/* Tarjeta de Resumen */}
            <div>
                <Card>
                    <CardHeader>
                        <CardTitle>Opciones de Costos Adicionales</CardTitle>
                        <CardDescription>Opciones de Costos de las Comprsa de los Productos</CardDescription>
                        <CardAction>Card Action</CardAction>
                    </CardHeader>
                    <CardContent>
                        <p>Contenido</p>
                    </CardContent>
                    <CardFooter>
                        <p>Footer</p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
