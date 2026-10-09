import HeadingSmall from '@/components/heading-small';
import EnviosLista from '@/components/transacciones/envios-lista';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sileo-toaster';
import SpotlightCard from '@/components/ui/spotlightcard';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, ArrowLeftRight, FilterX, PackageCheck, Truck } from 'lucide-react';
import React from 'react';

type Filtro = 'en_transito' | 'por_confirmar' | 'diferencia';

interface Props {
    // La forma de cada envío la define y usa EnviosLista; aquí solo se le pasan tal cual.
    envios: React.ComponentProps<typeof EnviosLista>['envios'];
    totales: { en_transito: number; por_confirmar: number; con_diferencia: number };
    filtro: Filtro | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Transacciones', href: '/transacciones' },
    { title: 'Envíos de dinero', href: '#' },
];

export default function Envios({ envios, totales, filtro }: Props) {
    // Cada widget es un filtro: un clic filtra la lista y otro clic sobre el mismo lo quita
    const hrefDe = (valor: Filtro) =>
        filtro === valor ? route('transacciones.envios.index') : route('transacciones.envios.index', { estado: valor });

    const widgets: Array<{
        valor: Filtro;
        titulo: string;
        total: number;
        icono: React.ElementType;
        estado: 'especial' | 'disponible' | 'agotado';
        borde: string;
        circulo: string;
        badge: string;
        aro: string;
    }> = [
        {
            valor: 'en_transito',
            titulo: 'Envíos en tránsito',
            total: totales.en_transito,
            icono: Truck,
            estado: 'especial',
            borde: 'border-amber-400/30 bg-amber-500/5 dark:bg-amber-500/10',
            circulo: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
            badge: 'from-amber-500 to-orange-500 shadow-amber-500/30',
            aro: 'ring-amber-400/60',
        },
        {
            valor: 'por_confirmar',
            titulo: 'Por confirmar por ti',
            total: totales.por_confirmar,
            icono: PackageCheck,
            estado: 'disponible',
            borde: 'border-emerald-400/30 bg-emerald-500/5 dark:bg-emerald-500/10',
            circulo: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
            badge: 'from-emerald-500 to-emerald-600 shadow-emerald-500/30',
            aro: 'ring-emerald-400/60',
        },
        {
            valor: 'diferencia',
            titulo: 'Diferencias por resolver',
            total: totales.con_diferencia,
            icono: AlertTriangle,
            estado: 'agotado',
            borde: 'border-red-400/30 bg-red-500/5 dark:bg-red-500/10',
            circulo: 'bg-red-500/15 text-red-600 dark:text-red-400',
            badge: 'from-red-500 to-red-600 shadow-red-500/30',
            aro: 'ring-red-400/60',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Envíos de dinero" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Envíos de dinero"
                        description="Transferencias a cuentas de otras personas: el dinero sale al enviar y se acredita cuando el destino confirma cuánto llegó."
                    />
                    <Truck
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* Widgets: filtros de la lista */}
                <div className="grid gap-4 md:grid-cols-3">
                    {widgets.map(({ valor, titulo, total, icono: Icono, estado, borde, circulo, badge, aro }) => (
                        <Link key={valor} href={hrefDe(valor)} preserveScroll aria-pressed={filtro === valor} className="block">
                            <SpotlightCard
                                estado={estado}
                                className={cn('h-full rounded-lg border p-4 shadow-sm backdrop-blur-sm', borde, filtro === valor && `ring-2 ${aro}`)}
                            >
                                <div className="mb-2 flex items-center gap-2">
                                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', circulo)}>
                                        <Icono className="h-4 w-4" />
                                    </span>
                                    <p className="text-muted-foreground text-sm font-medium">{titulo}</p>
                                </div>
                                <Badge className={cn('gap-1 border-0 bg-gradient-to-r px-3 py-1 text-xl font-black text-white shadow-md', badge)}>
                                    {total}
                                </Badge>
                                <p className="text-muted-foreground mt-2 text-xs">
                                    {filtro === valor ? 'Filtrando · clic para quitar' : 'Clic para filtrar'}
                                </p>
                            </SpotlightCard>
                        </Link>
                    ))}
                </div>

                <Card className="overflow-hidden border-l-4 border-amber-500/30 pt-0 shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5 text-white">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <Truck className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-white">
                                        {filtro ? 'Envíos filtrados' : 'Lo que sigue abierto y lo último cerrado'}
                                    </CardTitle>
                                    <CardDescription className="text-amber-100">Confirma lo que te llega, o sigue lo que enviaste.</CardDescription>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {filtro && (
                                    <Button asChild variant="secondary" size="sm" className="gap-1.5">
                                        <Link href={route('transacciones.envios.index')}>
                                            <FilterX className="h-4 w-4" /> Quitar filtro
                                        </Link>
                                    </Button>
                                )}
                                <Button asChild variant="secondary" size="sm" className="gap-1.5">
                                    <Link href={route('transacciones')}>
                                        <ArrowLeftRight className="h-4 w-4" /> Nueva transferencia
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <EnviosLista envios={envios} hayFiltro={filtro !== null} />
                    </CardContent>
                </Card>
            </div>
            <Toaster position="top-center" />
        </AppLayout>
    );
}
