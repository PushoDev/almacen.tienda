import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface Cierre {
    id: number;
    fecha_cierre: string;
    fecha_apertura: string | null;
    saldo_inicial: string;
    ventas_efectivo: string;
    ventas_otros: string;
    total_gastos: string;
    total_devoluciones: string;
    saldo_esperado: string;
    saldo_contado: string;
    diferencia: string;
    estado: string;
    observaciones: string | null;
    usuario: { name: string };
    revisor?: { name: string };
}

interface Props extends PageProps {
    cierre: Cierre;
}

export default function Show({ auth, cierre }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Cierres de Caja',
            href: '/vendor/cierres',
        },
        {
            title: `Cierre #${cierre.id}`,
            href: `/vendor/cierres/${cierre.id}`,
        },
    ];

    const getStatusInfo = (estado: string) => {
        switch (estado) {
            case 'aprobado':
                return { badge: <Badge className="bg-green-600">Aprobado</Badge>, icon: <CheckCircle2 className="h-5 w-5 text-green-600" /> };
            case 'rechazado':
                return { badge: <Badge variant="destructive">Rechazado</Badge>, icon: <XCircle className="h-5 w-5 text-red-600" /> };
            case 'pendiente':
                return {
                    badge: (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Pendiente
                        </Badge>
                    ),
                    icon: <Clock className="h-5 w-5 text-yellow-600" />,
                };
            default:
                return { badge: <Badge variant="outline">{estado}</Badge>, icon: <AlertTriangle className="h-5 w-5 text-blue-600" /> };
        }
    };

    const statusInfo = getStatusInfo(cierre.estado);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Cierre #${cierre.id}`} />

            <div className="bg-background flex h-screen w-full flex-col">
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="mx-auto max-w-5xl space-y-6">
                        {/* Header Section */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h1 className="text-3xl font-bold tracking-tight">Detalle de Cierre #{cierre.id}</h1>
                                <div className="text-muted-foreground flex items-center gap-2">
                                    <span>
                                        Vendedor: <span className="text-foreground font-semibold">{cierre.usuario.name}</span>
                                    </span>
                                    <span>•</span>
                                    <span>{new Date(cierre.fecha_cierre).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {statusInfo.badge}
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={route('ventas.cierres')}>
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Volver
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                            {/* Main Info */}
                            <div className="space-y-6 md:col-span-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Resumen Financiero</CardTitle>
                                        <CardDescription>Detalle de movimientos y saldos del reporte.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Saldo Inicial</span>
                                            <span className="font-medium">${Number(cierre.saldo_inicial).toFixed(2)}</span>
                                        </div>
                                        <Separator />
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Ventas Efectivo</span>
                                            <span className="font-medium text-green-600">+${Number(cierre.ventas_efectivo).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Ventas Otros Medios</span>
                                            <span className="font-medium text-blue-600">+${Number(cierre.ventas_otros).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Total Gastos</span>
                                            <span className="font-medium text-red-600">-${Number(cierre.total_gastos).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Total Devoluciones</span>
                                            <span className="font-medium text-red-600">-${Number(cierre.total_devoluciones).toFixed(2)}</span>
                                        </div>
                                        <Separator className="my-2" />
                                        <div className="bg-muted/40 flex items-baseline justify-between rounded-lg p-4">
                                            <span className="text-lg font-bold">Saldo Esperado</span>
                                            <span className="text-xl font-bold">${Number(cierre.saldo_esperado).toFixed(2)}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {cierre.observaciones && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">Observaciones</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-muted-foreground border-l-4 py-1 pl-4 text-sm italic">"{cierre.observaciones}"</p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            {/* Sidebar Info */}
                            <div className="space-y-6">
                                <Card
                                    className={
                                        Number(cierre.diferencia) === 0 ? 'border-green-200 bg-green-50/20' : 'border-destructive/20 bg-destructive/5'
                                    }
                                >
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg">{statusInfo.icon} Resultado</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <span className="text-muted-foreground text-xs font-semibold uppercase">Saldo Contado</span>
                                            <div className="mt-1 text-3xl font-bold tracking-tight">${Number(cierre.saldo_contado).toFixed(2)}</div>
                                        </div>
                                        <Separator />
                                        <div>
                                            <span className="text-muted-foreground text-xs font-semibold uppercase">Diferencia</span>
                                            <div
                                                className={`mt-1 text-xl font-bold ${Number(cierre.diferencia) !== 0 ? (Number(cierre.diferencia) > 0 ? 'text-blue-600' : 'text-red-600') : 'text-green-600'}`}
                                            >
                                                {Number(cierre.diferencia) > 0 ? '+' : ''}
                                                {Number(cierre.diferencia).toFixed(2)}
                                            </div>
                                            <span className="text-muted-foreground text-xs">
                                                {Number(cierre.diferencia) === 0
                                                    ? 'Balance Exacto'
                                                    : Number(cierre.diferencia) > 0
                                                      ? 'Sobrante'
                                                      : 'Faltante'}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Detalles del Turno</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="grid grid-cols-2 gap-1">
                                            <span className="text-muted-foreground text-xs">Apertura</span>
                                            <span className="text-right text-xs font-medium">
                                                {cierre.fecha_apertura ? new Date(cierre.fecha_apertura).toLocaleString() : '-'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1">
                                            <span className="text-muted-foreground text-xs">Cierre</span>
                                            <span className="text-right text-xs font-medium">{new Date(cierre.fecha_cierre).toLocaleString()}</span>
                                        </div>
                                        <Separator />
                                        {cierre.revisor && (
                                            <div className="pt-2">
                                                <span className="text-muted-foreground block text-xs">Aprobado por</span>
                                                <span className="font-medium">{cierre.revisor.name}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
