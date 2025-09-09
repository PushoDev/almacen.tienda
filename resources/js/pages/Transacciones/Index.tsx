import HeadingSmall from '@/components/heading-small';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Banknote, Repeat, TrendingDown, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Cuentas Monetarias',
        href: '/cuentas',
    },
    {
        title: 'Productos',
        href: '/productos',
    },
    {
        title: 'Transacciones',
        href: '#',
    },
];

// Datos de ejemplo para las tarjetas de resumen
const summaryData = {
    ganancias: {
        title: 'Ganancias Totales',
        amount: '$15,250.00',
        change: '+12.5%',
        description: 'Respecto al mes anterior',
    },
    gastos: {
        title: 'Gastos Totales',
        amount: '$8,750.00',
        change: '+5.2%',
        description: 'Respecto al mes anterior',
    },
    movimientos: {
        title: 'Movimientos Totales',
        amount: '1,250',
        change: '+8.3%',
        description: 'Respecto al mes anterior',
    },
};

// Datos de ejemplo para la tabla de transacciones
const transactionsData = [
    { id: 1, description: 'Venta de producto A', amount: '$1,200.00', date: '2023-04-15', type: 'ganancia' },
    { id: 2, description: 'Compra de suministros', amount: '$350.00', date: '2023-04-14', type: 'gasto' },
    { id: 3, description: 'Transferencia recibida', amount: '$2,000.00', date: '2023-04-13', type: 'ganancia' },
    { id: 4, description: 'Pago de nómina', amount: '$4,500.00', date: '2023-04-12', type: 'gasto' },
    { id: 5, description: 'Venta de producto B', amount: '$800.00', date: '2023-04-11', type: 'ganancia' },
];

export default function Dashboard() {
    const [isLoading, setIsLoading] = useState(true);

    // Simular carga de datos
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Transacciones" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Transacciones" description="Administre las transacciones de su negocio" />
                    <Banknote
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* Opciones de Transacciones */}
                <Tabs defaultValue="ganancias">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="ganancias" className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Ganancias
                        </TabsTrigger>
                        <TabsTrigger value="gastos" className="flex items-center gap-2">
                            <TrendingDown className="h-4 w-4" />
                            Gastos
                        </TabsTrigger>
                        <TabsTrigger value="movimientos" className="flex items-center gap-2">
                            <Repeat className="h-4 w-4" />
                            Movimientos
                        </TabsTrigger>
                    </TabsList>

                    {/* Contenido para Ganancias */}
                    <TabsContent value="ganancias">
                        <div className="space-y-4">
                            {/* Tarjeta de Resumen */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="bg-card rounded-lg border p-4">
                                    <h3 className="text-muted-foreground text-sm font-medium">{summaryData.ganancias.title}</h3>
                                    <p className="text-2xl font-bold">{summaryData.ganancias.amount}</p>
                                    <p className="text-sm text-green-600">{summaryData.ganancias.change}</p>
                                    <p className="text-muted-foreground text-xs">{summaryData.ganancias.description}</p>
                                </div>
                                {/* Otras tarjetas de resumen pueden ir aquí */}
                            </div>

                            {/* Tabla de Transacciones */}
                            <div className="bg-card rounded-lg border p-4">
                                <h3 className="mb-4 font-semibold">Transacciones Recientes</h3>
                                {isLoading ? (
                                    <div className="space-y-2">
                                        {Array.from({ length: 5 }).map((_, index) => (
                                            <div key={index} className="flex items-center justify-between border-b p-2">
                                                <div className="bg-muted h-4 w-1/3 animate-pulse rounded"></div>
                                                <div className="bg-muted h-4 w-1/4 animate-pulse rounded"></div>
                                                <div className="bg-muted h-4 w-1/4 animate-pulse rounded"></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left">Descripción</th>
                                                <th className="text-left">Monto</th>
                                                <th className="text-left">Fecha</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactionsData
                                                .filter((transaction) => transaction.type === 'ganancia')
                                                .map((transaction) => (
                                                    <tr key={transaction.id} className="border-b">
                                                        <td className="py-2">{transaction.description}</td>
                                                        <td className="py-2 text-green-600">{transaction.amount}</td>
                                                        <td className="py-2">{transaction.date}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Contenido para Gastos */}
                    <TabsContent value="gastos">
                        <div className="space-y-4">
                            {/* Tarjeta de Resumen */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="bg-card rounded-lg border p-4">
                                    <h3 className="text-muted-foreground text-sm font-medium">{summaryData.gastos.title}</h3>
                                    <p className="text-2xl font-bold">{summaryData.gastos.amount}</p>
                                    <p className="text-sm text-red-600">{summaryData.gastos.change}</p>
                                    <p className="text-muted-foreground text-xs">{summaryData.gastos.description}</p>
                                </div>
                                {/* Otras tarjetas de resumen pueden ir aquí */}
                            </div>

                            {/* Tabla de Transacciones */}
                            <div className="bg-card rounded-lg border p-4">
                                <h3 className="mb-4 font-semibold">Transacciones Recientes</h3>
                                {isLoading ? (
                                    <div className="space-y-2">
                                        {Array.from({ length: 5 }).map((_, index) => (
                                            <div key={index} className="flex items-center justify-between border-b p-2">
                                                <div className="bg-muted h-4 w-1/3 animate-pulse rounded"></div>
                                                <div className="bg-muted h-4 w-1/4 animate-pulse rounded"></div>
                                                <div className="bg-muted h-4 w-1/4 animate-pulse rounded"></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left">Descripción</th>
                                                <th className="text-left">Monto</th>
                                                <th className="text-left">Fecha</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactionsData
                                                .filter((transaction) => transaction.type === 'gasto')
                                                .map((transaction) => (
                                                    <tr key={transaction.id} className="border-b">
                                                        <td className="py-2">{transaction.description}</td>
                                                        <td className="py-2 text-red-600">{transaction.amount}</td>
                                                        <td className="py-2">{transaction.date}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Contenido para Movimientos */}
                    <TabsContent value="movimientos">
                        <div className="space-y-4">
                            {/* Tarjeta de Resumen */}
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="bg-card rounded-lg border p-4">
                                    <h3 className="text-muted-foreground text-sm font-medium">{summaryData.movimientos.title}</h3>
                                    <p className="text-2xl font-bold">{summaryData.movimientos.amount}</p>
                                    <p className="text-sm text-blue-600">{summaryData.movimientos.change}</p>
                                    <p className="text-muted-foreground text-xs">{summaryData.movimientos.description}</p>
                                </div>
                                {/* Otras tarjetas de resumen pueden ir aquí */}
                            </div>

                            {/* Tabla de Transacciones */}
                            <div className="bg-card rounded-lg border p-4">
                                <h3 className="mb-4 font-semibold">Transacciones Recientes</h3>
                                {isLoading ? (
                                    <div className="space-y-2">
                                        {Array.from({ length: 5 }).map((_, index) => (
                                            <div key={index} className="flex items-center justify-between border-b p-2">
                                                <div className="bg-muted h-4 w-1/3 animate-pulse rounded"></div>
                                                <div className="bg-muted h-4 w-1/4 animate-pulse rounded"></div>
                                                <div className="bg-muted h-4 w-1/4 animate-pulse rounded"></div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left">Descripción</th>
                                                <th className="text-left">Monto</th>
                                                <th className="text-left">Fecha</th>
                                                <th className="text-left">Tipo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transactionsData.map((transaction) => (
                                                <tr key={transaction.id} className="border-b">
                                                    <td className="py-2">{transaction.description}</td>
                                                    <td className={`py-2 ${transaction.type === 'ganancia' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {transaction.amount}
                                                    </td>
                                                    <td className="py-2">{transaction.date}</td>
                                                    <td className="py-2">
                                                        <span
                                                            className={`inline-block rounded-full px-2 py-1 text-xs ${transaction.type === 'ganancia' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                                        >
                                                            {transaction.type}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
