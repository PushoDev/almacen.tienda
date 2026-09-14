import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollProgress } from '@/components/ui/scroll';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react'; // Agregamos usePage
import {
    ArrowLeft,
    Calendar,
    CheckCircle,
    ClipboardList,
    Coins,
    DollarSign,
    Edit,
    Hash,
    Info,
    Percent,
    Settings,
    Star,
    Tag,
    XCircle,
    Zap,
} from 'lucide-react';
import { useState } from 'react';
import { sileo } from '@/lib/sileo';
import { Toaster } from '@/components/ui/sileo-toaster';

interface Moneda {
    id: number;
    codigo_moneda: string;
    nombre_moneda: string;
    simbolo_moneda: string;
    imagen: string | null;
    imagen_url: string | null;
    tasa_cambio: number;
    commission: number;
    estado: boolean;
    principal: boolean;
    created_at: string;
    updated_at: string;
}

interface PageProps {
    moneda: Moneda;
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Monedas',
        href: '/monedas',
    },
    {
        title: 'Detalles de Moneda',
        href: '#',
    },
];

export default function MonedaShow() {
    const { props } = usePage<PageProps>(); // Ahora usePage está definido
    const { moneda } = props;
    const [loading, setLoading] = useState(false);

    const formatNumber = (num: number, decimals: number = 6) => {
        return new Intl.NumberFormat('es-VE', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(num);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleEstablecerPrincipal = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/monedas/${moneda.id}/establecer-principal`, {
                method: 'PATCH',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                sileo.success({ title: 'Moneda principal', description: 'Se estableció correctamente como moneda principal' });
                window.location.reload();
            } else {
                throw new Error('Error en la respuesta del servidor');
            }
        } catch (error) {
            sileo.error({ title: 'Error al establecer', description: 'No se pudo establecer la moneda como principal' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Moneda: ${moneda.codigo_moneda}`} />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header — sin overflow-hidden a propósito: la insignia real usa efecto
                    bleed (ver docs/patron-mascota-bleed.md Variante A), se sale del borde
                    superior en vez de quedar recortada adentro. Mismo patrón que Monedas/Edit.tsx. */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 rounded-2xl border border-dashed p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <HeadingSmall title={`Moneda: ${moneda.codigo_moneda}`} description="Vista detallada de la información de la moneda." />
                        </div>
                    </div>
                    {moneda.imagen_url ? (
                        <img
                            src={moneda.imagen_url}
                            alt=""
                            aria-hidden="true"
                            className="pointer-events-none absolute right-4 bottom-0 h-28 w-auto select-none"
                        />
                    ) : (
                        <Coins
                            size={70}
                            color="#d6d3d1"
                            className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                        />
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/monedas">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Volver
                            </Link>
                        </Button>
                    </div>
                    <Button asChild>
                        <Link href={`/monedas/${moneda.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar Moneda
                        </Link>
                    </Button>
                </div>

                {/* Contenido Principal */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Información Principal */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Tarjeta de Información Básica */}
                        <Card className="overflow-hidden border-l-4 border-violet-500/30 pt-0 shadow-sm transition-shadow hover:shadow-md">
                            <CardHeader className="border-b bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <DollarSign className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white">Información General</CardTitle>
                                        <CardDescription className="text-violet-100">
                                            Detalles básicos y configuración de la moneda
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                            <Hash className="h-4 w-4" />
                                            Código de Moneda
                                        </div>
                                        <p className="font-mono text-lg font-bold">{moneda.codigo_moneda}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                            <Tag className="h-4 w-4" />
                                            Nombre de la Moneda
                                        </div>
                                        <p className="text-lg font-medium">{moneda.nombre_moneda}</p>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                            <DollarSign className="h-4 w-4" />
                                            Símbolo
                                        </div>
                                        <p className="text-2xl font-bold">{moneda.simbolo_moneda}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                            <Percent className="h-4 w-4" />
                                            Comisión
                                        </div>
                                        <p className="text-lg font-medium">{formatNumber(moneda.commission, 4)}%</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tarjeta de Tasas y Estado */}
                        <Card className="overflow-hidden border-l-4 border-violet-500/30 pt-0 shadow-sm transition-shadow hover:shadow-md">
                            <CardHeader className="border-b bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <Settings className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white">Configuración y Estado</CardTitle>
                                        <CardDescription className="text-violet-100">
                                            Configuración financiera y estado operativo de la moneda
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                            <DollarSign className="h-4 w-4" />
                                            Tasa de Cambio
                                        </div>
                                        <p className="text-primary text-2xl font-bold">{formatNumber(moneda.tasa_cambio)}</p>
                                        <p className="text-muted-foreground text-sm">Tasa respecto a la moneda principal</p>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-muted-foreground flex items-center gap-2 text-sm">Estado</div>
                                        <div className="flex items-center gap-2">
                                            {moneda.estado ? (
                                                <CheckCircle className="h-5 w-5 text-green-500" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-red-500" />
                                            )}
                                            <Badge
                                                variant={moneda.estado ? 'default' : 'secondary'}
                                                className={moneda.estado ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                                            >
                                                {moneda.estado ? 'Activa' : 'Inactiva'}
                                            </Badge>
                                        </div>
                                        <p className="text-muted-foreground text-sm">
                                            {moneda.estado
                                                ? 'La moneda está activa y disponible para transacciones'
                                                : 'La moneda está inactiva y no disponible para nuevas transacciones'}
                                        </p>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                        <Star className="h-4 w-4" />
                                        Tipo de Moneda
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {moneda.principal ? (
                                            <>
                                                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                                                <Badge variant="default" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                                                    Moneda Principal
                                                </Badge>
                                            </>
                                        ) : (
                                            <Badge variant="secondary">Moneda Secundaria</Badge>
                                        )}
                                    </div>
                                    <p className="text-muted-foreground text-sm">
                                        {moneda.principal
                                            ? 'Esta es la moneda principal del sistema. Todas las tasas se calculan en relación a esta moneda.'
                                            : 'Esta es una moneda secundaria. Su tasa se calcula en relación a la moneda principal.'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Panel Lateral */}
                    <div className="space-y-6">
                        {/* Tarjeta de Información del Sistema */}
                        <Card className="overflow-hidden border-l-4 border-violet-500/30 pt-0 shadow-sm transition-shadow hover:shadow-md">
                            <CardHeader className="border-b bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <Info className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white">Información del Sistema</CardTitle>
                                        <CardDescription className="text-violet-100">Metadatos y auditoría de la moneda</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                        <Hash className="h-4 w-4" />
                                        ID de la Moneda
                                    </div>
                                    <p className="bg-muted rounded p-2 font-mono text-sm">#{moneda.id}</p>
                                </div>

                                <Separator />

                                <div className="space-y-2">
                                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                        <Calendar className="h-4 w-4" />
                                        Fecha de Creación
                                    </div>
                                    <p className="text-sm">{formatDate(moneda.created_at)}</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                                        <Calendar className="h-4 w-4" />
                                        Última Actualización
                                    </div>
                                    <p className="text-sm">{formatDate(moneda.updated_at)}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tarjeta de Resumen de Estado */}
                        <Card className="overflow-hidden border-l-4 border-violet-500/30 pt-0 shadow-sm transition-shadow hover:shadow-md">
                            <CardHeader className="border-b bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <ClipboardList className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-white">Resumen de Estado</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Estado Operativo</span>
                                    {moneda.estado ? (
                                        <Badge variant="default" className="bg-green-100 text-green-800">
                                            Activa
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary">Inactiva</Badge>
                                    )}
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Tipo de Moneda</span>
                                    {moneda.principal ? (
                                        <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                                            Principal
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">Secundaria</Badge>
                                    )}
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Comisión</span>
                                    <span className="text-sm font-medium">{formatNumber(moneda.commission, 4)}%</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Tasa de Cambio</span>
                                    <span className="text-sm font-medium">{formatNumber(moneda.tasa_cambio)}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tarjeta de Acciones Rápidas */}
                        <Card className="overflow-hidden border-l-4 border-violet-500/30 pt-0 shadow-sm transition-shadow hover:shadow-md">
                            <CardHeader className="border-b bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <Zap className="h-5 w-5" />
                                    </div>
                                    <CardTitle className="text-white">Acciones Rápidas</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button asChild className="w-full">
                                    <Link href={`/monedas/${moneda.id}/edit`}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Editar Moneda
                                    </Link>
                                </Button>

                                <Button variant="outline" asChild className="w-full">
                                    <Link href="/monedas">
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Volver al Listado
                                    </Link>
                                </Button>

                                {!moneda.principal && moneda.estado && (
                                    <Button variant="outline" className="w-full" onClick={handleEstablecerPrincipal} disabled={loading}>
                                        <Star className="mr-2 h-4 w-4" />
                                        {loading ? 'Estableciendo...' : 'Establecer como Principal'}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
            <ScrollProgress />
            <Toaster position="top-center" />
        </AppLayout>
    );
}
