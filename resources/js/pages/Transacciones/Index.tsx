import HeadingSmall from '@/components/heading-small';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Banknote, Repeat } from 'lucide-react';
import CostosAdicionales from './layouts/CostosAdicionales';
import Movimientos from './layouts/Movimientos';

// 1. Define las interfaces para los datos que recibes desde el backend
interface Compra {
    id: number;
    fecha_compra: string;
    total_compra: number;
    productos: any[];
}

interface Cuenta {
    id: number;
    nombre_cuenta: string;
    tipo_moneda: string;
    // Agregamos las propiedades 'saldo_cuenta' y 'deuda' para usarlas en los formularios.
    saldo_cuenta: number;
    deuda: number;
}

// 2. Define la interfaz principal de las props
interface Props {
    compras: Compra[];
    cuentas: Cuenta[];
    tasaCambioActual: number;
}

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

// 3. Usa la interfaz de props en la función del componente
export default function Transacciones({ compras, cuentas, tasaCambioActual }: Props) {
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
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="movimientos" className="flex items-center gap-2">
                            <Repeat className="h-4 w-4" />
                            Movimientos
                        </TabsTrigger>
                        <TabsTrigger value="costos" className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            Costos Adicionales
                        </TabsTrigger>
                    </TabsList>
                    {/* Paso 1: Pasar la prop 'cuentas' al componente Movimientos */}
                    <TabsContent value="movimientos">
                        <Movimientos cuentas={cuentas} />
                    </TabsContent>

                    <TabsContent value="costos">
                        <CostosAdicionales compras={compras} cuentas={cuentas} tasaCambioActual={tasaCambioActual} />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
