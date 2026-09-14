import HeadingSmall from '@/components/heading-small';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
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
    cuentasDestino: Cuenta[];
    clientes: Cliente[];
    proveedores: Proveedor[];
    monedasActivas: Moneda[];
    userRole: 'admin' | 'moderador' | 'vendedor';
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

export default function Transacciones({ cuentasOrigen, cuentasDestino, clientes, proveedores, monedasActivas, userRole }: Props) {
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

                {/* El Tabs externo de una sola pestaña ("Movimientos Financieros") se quitó
                    2026-09-14: dejó de tener sentido cuando "Distribuir Costos" se eliminó
                    (2026-08-28) y quedó como única opción sin nada entre qué elegir. */}
                <Movimientos cuentasOrigen={cuentasOrigen} cuentasDestino={cuentasDestino} clientes={clientes} proveedores={proveedores} monedasActivas={monedasActivas} userRole={userRole} />
            </div>
        </AppLayout>
    );
}
