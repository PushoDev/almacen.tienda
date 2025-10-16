import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Calendar, Coins, Edit3, Landmark, Wallet } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Cuentas',
        href: '/cuentas',
    },
    {
        title: 'Detalles de Cuenta',
        href: '#',
    },
];

interface MonedaInfo {
    id: number;
    nombre_moneda: string;
    codigo_moneda: string;
    simbolo_moneda: string;
}

interface CuentaShowProps {
    id: number;
    nombre_cuenta: string;
    tipo: string;
    saldo_cuenta: number;
    moneda_id: number;
    tipo_cuenta: string;
    estado: string;
    notas_cuenta: string;
    created_at: string;
    updated_at: string;
    moneda: MonedaInfo | null;
}

interface ShowCuentasPageProps {
    cuenta: CuentaShowProps;
}

export default function ShowCuentasPage({ cuenta }: ShowCuentasPageProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Detalles de Cuenta" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Gestión de Cuentas" description="Administre las cuentas disponibles para su negocio." />
                    <Landmark
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Contenido */}
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Columna principal - Detalles */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Información General</CardTitle>
                            <CardDescription>Detalles básicos de la cuenta y su configuración.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="text-muted-foreground text-sm font-medium">Nombre de la Cuenta</label>
                                    <p className="text-sm font-semibold">{cuenta.nombre_cuenta}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-muted-foreground text-sm font-medium">Tipo de Activo</label>
                                    <div>
                                        <Badge variant="outline" className="capitalize">
                                            {cuenta.tipo}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-muted-foreground text-sm font-medium">Moneda</label>
                                    <div className="flex items-center gap-2">
                                        <Coins size={16} className="text-amber-500" />
                                        <span className="text-sm font-semibold">
                                            {cuenta.moneda?.nombre_moneda} ({cuenta.moneda?.codigo_moneda})
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-muted-foreground text-sm font-medium">Tipo de Cuenta</label>
                                    <div>
                                        <Badge
                                            variant="outline"
                                            className={
                                                cuenta.tipo_cuenta === 'permanentes'
                                                    ? 'text-emerald-500'
                                                    : cuenta.tipo_cuenta === 'temporales'
                                                      ? 'text-amber-500'
                                                      : 'text-red-500'
                                            }
                                        >
                                            {cuenta.tipo_cuenta.charAt(0).toUpperCase() + cuenta.tipo_cuenta.slice(1)}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-muted-foreground text-sm font-medium">Estado</label>
                                    <div>
                                        <Badge
                                            variant={cuenta.estado === 'activa' ? 'default' : 'secondary'}
                                            className={
                                                cuenta.estado === 'activa'
                                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300'
                                                    : 'bg-gray-100 text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300'
                                            }
                                        >
                                            {cuenta.estado === 'activa' ? 'Activa' : 'Inactiva'}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-muted-foreground text-sm font-medium">Saldo Actual</label>
                                    <div className="flex items-center gap-2">
                                        <Wallet size={16} className="text-emerald-500" />
                                        <span
                                            className={`text-sm font-semibold ${
                                                cuenta.saldo_cuenta > 0
                                                    ? 'text-emerald-600'
                                                    : cuenta.saldo_cuenta < 0
                                                      ? 'text-red-600'
                                                      : 'text-gray-600'
                                            }`}
                                        >
                                            {cuenta.moneda?.simbolo_moneda || '$'} {Math.abs(cuenta.saldo_cuenta).toFixed(2)}
                                            {cuenta.saldo_cuenta < 0 && ' (Negativo)'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Notas Adicionales */}
                            <div className="space-y-2">
                                <label className="text-muted-foreground text-sm font-medium">Notas Adicionales</label>
                                <p className="text-sm">
                                    {cuenta.notas_cuenta || <span className="text-muted-foreground italic">No hay notas adicionales</span>}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Columna lateral - Metadatos y Acciones */}
                    <div className="space-y-6">
                        {/* Metadatos */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Metadatos</CardTitle>
                                <CardDescription>Información de fechas</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar size={16} className="text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">Creada</p>
                                        <p className="text-muted-foreground">
                                            {new Date(cuenta.created_at).toLocaleDateString('es-ES', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar size={16} className="text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">Actualizada</p>
                                        <p className="text-muted-foreground">
                                            {new Date(cuenta.updated_at).toLocaleDateString('es-ES', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Acciones */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Acciones</CardTitle>
                                <CardDescription>Gestionar esta cuenta</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Link href={route('cuentas.edit', { cuenta: cuenta.id })}>
                                    <Button variant="outline" className="w-full justify-start">
                                        <Edit3 size={16} className="mr-2" />
                                        Editar Cuenta
                                    </Button>
                                </Link>
                                <Link href={route('cuentas.index')}>
                                    <Button variant="outline" className="w-full justify-start">
                                        <ArrowLeft size={16} className="mr-2" />
                                        Volver a la lista
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
