// resources/js/Pages/Transacciones/Operaciones/Movimientos.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Datos de ejemplo
const summaryData = {
    movimientos: {
        title: 'Movimientos Totales',
        amount: '1,250',
        change: '+8.3%',
        description: 'Respecto al mes anterior',
    },
};

const transactionsData = [
    { id: 1, description: 'Venta de producto A', amount: '$1,200.00', date: '2023-04-15', type: 'ganancia' },
    { id: 2, description: 'Compra de suministros', amount: '$350.00', date: '2023-04-14', type: 'gasto' },
    { id: 3, description: 'Transferencia recibida', amount: '$2,000.00', date: '2023-04-13', type: 'ganancia' },
    { id: 4, description: 'Pago de nómina', amount: '$4,500.00', date: '2023-04-12', type: 'gasto' },
    { id: 5, description: 'Venta de producto B', amount: '$800.00', date: '2023-04-11', type: 'ganancia' },
];

export default function Movimientos() {
    return (
        <div className="space-y-4">
            {/* Tarjeta de Resumen */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>{summaryData.movimientos.title}</CardTitle>
                        <CardDescription>{summaryData.movimientos.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold">{summaryData.movimientos.amount}</p>
                        <p className="text-sm text-blue-600">{summaryData.movimientos.change}</p>
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
                                <TableHead>Tipo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactionsData.map((transaction) => (
                                <TableRow key={transaction.id}>
                                    <TableCell>{transaction.description}</TableCell>
                                    <TableCell className={transaction.type === 'ganancia' ? 'text-green-600' : 'text-red-600'}>
                                        {transaction.amount}
                                    </TableCell>
                                    <TableCell>{transaction.date}</TableCell>
                                    <TableCell>
                                        <span
                                            className={`inline-block rounded-full px-2 py-1 text-xs ${transaction.type === 'ganancia' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                        >
                                            {transaction.type}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
