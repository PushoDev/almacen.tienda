import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sileo-toaster';
import SpotlightCard from '@/components/ui/spotlightcard';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, PackageCheck, Truck } from 'lucide-react';
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
    moneda: Moneda;
}

interface Cliente {
    id: number;
    nombre_cliente: string;
    deuda_pago_cliente: number;
}

// ✅ INTERFAZ COMPLETA PARA PROVEEDORES
interface Proveedor {
    id: number;
    nombre_proveedor: string;
    telefono_proveedor: string | null;
    saldo_proveedor: number;
    correo_proveedor: string | null;
    localidad_proveedor: string | null;
    notas_proveedor: string | null;
}

interface Props {
    cuentasOrigen: Cuenta[];
    clientes: Cliente[];
    proveedores: Proveedor[];
    monedasActivas: Moneda[];
    userRole: 'admin' | 'moderador' | 'vendedor';
    totalesTransito: { en_transito: number; por_confirmar: number; con_diferencia: number };
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
        href: '/listado-productos',
    },
    {
        title: 'Transacciones',
        href: '#',
    },
];

export default function Transacciones({ cuentasOrigen, clientes, proveedores, monedasActivas, userRole, totalesTransito }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Transacciones" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Transacciones"
                        description="Administre las transacciones financieras y movimientos entre cuentas, clientes y proveedores"
                    />
                    {/* Bleed Variante A (ver docs/patron-mascota-bleed.md) — mismo tratamiento que
                        Cuentas/Index.tsx, con la misma imagen de tarjetas. */}
                    <img
                        src="/projects/tarjetas.webp"
                        alt=""
                        aria-hidden="true"
                        className="pointer-events-none absolute right-4 bottom-0 h-28 w-auto select-none"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* Widgets de los envíos de dinero: cada uno lleva a la vista "Envíos de dinero" ya filtrada */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Link href={route('transacciones.envios.index', { estado: 'en_transito' })} className="block">
                        <SpotlightCard
                            estado="especial"
                            className="h-full rounded-lg border border-amber-400/30 bg-amber-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-amber-500/10"
                        >
                            <div className="mb-2 flex items-center gap-2">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                                    <Truck className="h-4 w-4" />
                                </span>
                                <p className="text-muted-foreground text-sm font-medium">Envíos en tránsito</p>
                            </div>
                            <Badge className="gap-1 border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xl font-black text-white shadow-md shadow-amber-500/30">
                                {totalesTransito.en_transito}
                            </Badge>
                        </SpotlightCard>
                    </Link>

                    <Link href={route('transacciones.envios.index', { estado: 'por_confirmar' })} className="block">
                        <SpotlightCard
                            estado="disponible"
                            className="h-full rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-emerald-500/10"
                        >
                            <div className="mb-2 flex items-center gap-2">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                    <PackageCheck className="h-4 w-4" />
                                </span>
                                <p className="text-muted-foreground text-sm font-medium">Por confirmar por ti</p>
                            </div>
                            <Badge className="gap-1 border-0 bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-emerald-500/30">
                                {totalesTransito.por_confirmar}
                            </Badge>
                        </SpotlightCard>
                    </Link>

                    <Link href={route('transacciones.envios.index', { estado: 'diferencia' })} className="block">
                        <SpotlightCard
                            estado="agotado"
                            className="h-full rounded-lg border border-red-400/30 bg-red-500/5 p-4 shadow-sm backdrop-blur-sm dark:bg-red-500/10"
                        >
                            <div className="mb-2 flex items-center gap-2">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-600 dark:text-red-400">
                                    <AlertTriangle className="h-4 w-4" />
                                </span>
                                <p className="text-muted-foreground text-sm font-medium">Diferencias por resolver</p>
                            </div>
                            <Badge className="gap-1 border-0 bg-gradient-to-r from-red-500 to-red-600 px-3 py-1 text-xl font-black text-white shadow-md shadow-red-500/30">
                                {totalesTransito.con_diferencia}
                            </Badge>
                        </SpotlightCard>
                    </Link>
                </div>

                {/* El Tabs externo de una sola pestaña ("Movimientos Financieros") se quitó
                    2026-09-14: dejó de tener sentido cuando "Distribuir Costos" se eliminó
                    (2026-08-28) y quedó como única opción sin nada entre qué elegir. */}
                <Movimientos
                    cuentasOrigen={cuentasOrigen}
                    clientes={clientes}
                    proveedores={proveedores}
                    monedasActivas={monedasActivas}
                    userRole={userRole}
                />
            </div>
            <Toaster position="top-center" />
        </AppLayout>
    );
}
