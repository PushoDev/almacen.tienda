// resources/js/Pages/Transacciones/Operaciones/Ganancias.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Datos de ejemplo
const summaryData = {
    ganancias: {
        title: 'Ganancias Totales',
        amount: '$15,250.00',
        change: '+12.5%',
        description: 'Respecto al mes anterior',
    },
};

const transactionsData = [
    { id: 1, description: 'Venta de producto A', amount: '$1,200.00', date: '2023-04-15', type: 'ganancia' },
    { id: 2, description: 'Venta de producto B', amount: '$800.00', date: '2023-04-11', type: 'ganancia' },
];

export default function Ganancias() {
    return (
        <div className="space-y-4">
            {/* Tarjeta de Resumen */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>{summaryData.ganancias.title}</CardTitle>
                        <CardDescription>{summaryData.ganancias.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{summaryData.ganancias.amount}</p>
                        <p className="text-sm text-green-600">{summaryData.ganancias.change}</p>
                    </CardContent>
                </Card>
                {/* Otras tarjetas de resumen pueden ir aquí */}
            </div>

            {/* Tabla de Transacciones */}
            <Card>
                <CardHeader>
                    <CardTitle>Transacciones Recientes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Monto</TableHead>
                                <TableHead>Fecha</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactionsData.map((transaction) => (
                                <TableRow key={transaction.id}>
                                    <TableCell>{transaction.description}</TableCell>
                                    <TableCell className="text-green-600">{transaction.amount}</TableCell>
                                    <TableCell>{transaction.date}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
