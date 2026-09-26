import HeadingSmall from '@/components/heading-small';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollProgress } from '@/components/ui/scroll';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MetodosPagoResumen, type MetodoResumen } from '@/components/monedas/metodos-pago-resumen';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Coins, Edit, Eye, Plus, RefreshCw, Star, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react'; // Importamos useEffect
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
    metodos_pago_resumen: MetodoResumen[];
    estado: boolean;
    principal: boolean;
    created_at: string;
    updated_at: string;
}

// Extender la interfaz PageProps de Inertia
interface PageProps {
    monedas: Moneda[];
    status?: string;
    success?: string;
    error?: string;
    [key: string]: unknown; // Firma de índice para propiedades adicionales
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Gestión de Monedas',
        href: '#',
    },
];

export default function MonedasIndex() {
    const { props } = usePage<PageProps>();
    const { monedas, success, error } = props;

    const [loadingStates, setLoadingStates] = useState<{ [key: number]: string }>({});

    // Mostrar notificaciones si hay mensajes
    useEffect(() => {
        if (success) {
            sileo.success({ title: success });
        }
        if (error) {
            sileo.error({ title: error });
        }
    }, [success, error]);

    const handleAction = async (monedaId: number, action: string) => {
        setLoadingStates((prev) => ({ ...prev, [monedaId]: action }));

        try {
            switch (action) {
                case 'cambiar-estado':
                    await fetch(`/monedas/${monedaId}/cambiar-estado`, {
                        method: 'PATCH',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'Content-Type': 'application/json',
                        },
                    });
                    break;
                case 'establecer-principal':
                    await fetch(`/monedas/${monedaId}/establecer-principal`, {
                        method: 'PATCH',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'Content-Type': 'application/json',
                        },
                    });
                    break;
            }

            window.location.reload();
        } catch {
            sileo.error({ title: 'Error al realizar la acción' });
        } finally {
            setLoadingStates((prev) => ({ ...prev, [monedaId]: '' }));
        }
    };

    const handleDelete = async (monedaId: number) => {
        try {
            await fetch(`/monedas/${monedaId}`, {
                method: 'DELETE',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json',
                },
            });
            window.location.reload();
        } catch {
            sileo.error({ title: 'Error al eliminar', description: 'No se pudo eliminar la moneda' });
        }
    };

    const formatNumber = (num: number, decimals: number = 2) => {
        // Cambiado de 6 a 2 decimales por defecto
        return new Intl.NumberFormat('es-VE', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(num);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Monedas" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Monedas del Sistema" description="Gestión profesional de las Monedas a trabajar en el Negocio." />
                    <Coins
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Listado de Monedas — mismo patrón de degradado que Monedas/Edit.tsx
                    (docs/patron-card-header-degradado.md), violeta para todo el módulo. */}
                <Card className="overflow-hidden border-l-4 border-violet-500/30 pt-0 shadow-sm transition-shadow hover:shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Coins className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Lista de Monedas</CardTitle>
                                <CardDescription className="text-violet-100">Gestiona todas las monedas disponibles en el sistema</CardDescription>
                            </div>
                        </div>
                        <Button asChild className="bg-white/20 text-white backdrop-blur-sm hover:bg-white/30">
                            <Link href="/monedas/create">
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva Moneda
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent text-white">
                                    <TableHead className="text-white">Código</TableHead>
                                    <TableHead className="text-white">Nombre</TableHead>
                                    <TableHead className="text-white">Símbolo</TableHead>
                                    <TableHead className="text-white">Tasa Cambio</TableHead>
                                    <TableHead className="text-white">Métodos de pago</TableHead>
                                    <TableHead className="text-white">Estado</TableHead>
                                    <TableHead className="text-white">Principal</TableHead>
                                    <TableHead className="text-right text-white">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {monedas.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                                            No hay monedas registradas
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    monedas.map((moneda) => (
                                        <TableRow key={moneda.id}>
                                            <TableCell className="font-mono font-bold">
                                                <div className="flex items-center gap-2">
                                                    {moneda.imagen_url ? (
                                                        <img
                                                            src={moneda.imagen_url}
                                                            alt=""
                                                            aria-hidden="true"
                                                            className="h-6 w-9 rounded object-cover"
                                                        />
                                                    ) : (
                                                        <Coins className="text-muted-foreground h-5 w-5" />
                                                    )}
                                                    {moneda.codigo_moneda}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{moneda.nombre_moneda}</TableCell>
                                            <TableCell>{moneda.simbolo_moneda}</TableCell>
                                            {/* 2 decimales para tasa */}
                                            <TableCell>{formatNumber(moneda.tasa_cambio, 2)}</TableCell>
                                            <TableCell>
                                                <MetodosPagoResumen metodos={moneda.metodos_pago_resumen} compacto />
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={moneda.estado ? 'default' : 'secondary'}
                                                    className={moneda.estado ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                                                >
                                                    {moneda.estado ? 'Activa' : 'Inactiva'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {moneda.principal && (
                                                    <Badge variant="default" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                                                        <Star className="mr-1 h-3 w-3" />
                                                        Principal
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <TooltipProvider>
                                                        {/* Ver Detalles */}
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="outline" size="sm" asChild>
                                                                    <Link href={`/monedas/${moneda.id}`}>
                                                                        <Eye className="h-4 w-4" />
                                                                    </Link>
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Ver detalles</p>
                                                            </TooltipContent>
                                                        </Tooltip>

                                                        {/* Editar */}
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="outline" size="sm" asChild>
                                                                    <Link href={`/monedas/${moneda.id}/edit`}>
                                                                        <Edit className="h-4 w-4" />
                                                                    </Link>
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>Editar moneda</p>
                                                            </TooltipContent>
                                                        </Tooltip>

                                                        {/* Establecer como Principal */}
                                                        {!moneda.principal && moneda.estado && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => handleAction(moneda.id, 'establecer-principal')}
                                                                        disabled={loadingStates[moneda.id] === 'establecer-principal'}
                                                                    >
                                                                        {loadingStates[moneda.id] === 'establecer-principal' ? (
                                                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                                                        ) : (
                                                                            <Star className="h-4 w-4" />
                                                                        )}
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Establecer como principal</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}

                                                        {/* Cambiar Estado */}
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleAction(moneda.id, 'cambiar-estado')}
                                                                    disabled={loadingStates[moneda.id] === 'cambiar-estado' || moneda.principal}
                                                                >
                                                                    {loadingStates[moneda.id] === 'cambiar-estado' ? (
                                                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <RefreshCw className="h-4 w-4" />
                                                                    )}
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{moneda.estado ? 'Desactivar' : 'Activar'} moneda</p>
                                                            </TooltipContent>
                                                        </Tooltip>

                                                        {/* Eliminar */}
                                                        {!moneda.principal && (
                                                            <AlertDialog>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button variant="destructive" size="sm">
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Eliminar moneda</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Esta acción eliminará la moneda "{moneda.nombre_moneda}" (
                                                                            {moneda.codigo_moneda}). Esta acción no se puede deshacer.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            onClick={() => handleDelete(moneda.id)}
                                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                                        >
                                                                            Eliminar
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                    </TooltipProvider>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            <ScrollProgress />
            <Toaster position="top-center" />
        </AppLayout>
    );
}
