// resources/js/Pages/Transacciones/Operaciones/Gastos.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Datos de ejemplo
const summaryData = {
    gastos: {
        title: 'Gastos Totales',
        amount: '$8,750.00',
        change: '+5.2%',
        description: 'Respecto al mes anterior',
    },
};

const transactionsData = [
    { id: 1, description: 'Compra de suministros', amount: '$350.00', date: '2023-04-14', type: 'gasto' },
    { id: 2, description: 'Pago de nómina', amount: '$4,500.00', date: '2023-04-12', type: 'gasto' },
];

export default function Gastos() {
    return (
        <div className="space-y-4">
            {/* Tarjeta de Resumen */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>{summaryData.gastos.title}</CardTitle>
                        <CardDescription>{summaryData.gastos.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{summaryData.gastos.amount}</p>
                        <p className="text-sm text-red-600">{summaryData.gastos.change}</p>
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
                                    <TableCell className="text-red-600">{transaction.amount}</TableCell>
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