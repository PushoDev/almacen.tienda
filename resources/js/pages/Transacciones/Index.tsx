// resources/js/Pages/Transacciones/Index.tsx
import HeadingSmall from '@/components/heading-small';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Banknote, Repeat, TrendingDown, TrendingUp } from 'lucide-react';
import Ganancias from './Operaciones/Ganancias';
import Gastos from './Operaciones/Gastos';
import Movimientos from './Operaciones/Movimientos';
import CostosAdicionales from '@/pages/Transacciones/Operaciones/CostosAdicionales';

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

export default function Transacciones() {
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
                    <TabsList className="grid w-full grid-cols-4">
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
                        <TabsTrigger value="costos" className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            Costos Adicionales
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="ganancias">
                        <Ganancias />
                    </TabsContent>

                    <TabsContent value="gastos">
                        <Gastos />
                    </TabsContent>

                    <TabsContent value="movimientos">
                        <Movimientos />
                    </TabsContent>

                    <TabsContent value="costos">
                        <CostosAdicionales />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
