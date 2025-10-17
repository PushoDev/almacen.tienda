import HeadingSmall from '@/components/heading-small';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Banknote, Repeat } from 'lucide-react';
import CostosAdicionales from './layouts/CostosAdicionales';
import Movimientos from './layouts/Movimientos';

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
    moneda: Moneda; // ✅ RELACIÓN CON MONEDA
}

interface Cliente {
    id: number;
    nombre_cliente: string;
    deuda_pago_cliente: number;
}

interface Compra {
    id: number;
    fecha_compra: string;
    total_compra: number;
    productos: any[];
}

interface Props {
    compras: Compra[];
    cuentas: Cuenta[];
    clientes: Cliente[];
    tasaCambioActual: number;
    monedasActivas: Moneda[]; // ✅ NUEVA PROP
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

export default function Transacciones({ compras, cuentas, clientes, tasaCambioActual, monedasActivas }: Props) {
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
                <Tabs defaultValue="movimientos">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="movimientos" className="flex items-center gap-2">
                            <Repeat className="h-4 w-4" />
                            Movimientos
                        </TabsTrigger>
                        <TabsTrigger value="costos" className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            Distribuir Costos por Transportación
                        </TabsTrigger>
                    </TabsList>

                    {/* ✅ Pestaña Movimientos - Actualizada con monedasActivas */}
                    <TabsContent value="movimientos">
                        <Movimientos cuentas={cuentas} clientes={clientes} monedasActivas={monedasActivas} />
                    </TabsContent>

                    {/* ✅ Pestaña Distribuir Costos - Ahora incluirá tanto distribución manual como transportación */}
                    <TabsContent value="costos">
                        <CostosAdicionales compras={compras} cuentas={cuentas} tasaCambioActual={tasaCambioActual} monedasActivas={monedasActivas} />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
