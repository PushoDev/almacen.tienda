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
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollProgress } from '@/components/ui/scroll';
import { MonedaCard, type MonedaCardData } from '@/components/MonedaCard';
import { type MetodoResumen } from '@/components/monedas/metodos-pago-resumen';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Coins, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { sileo } from '@/lib/sileo';
import { Toaster } from '@/components/ui/sileo-toaster';

interface Moneda extends MonedaCardData {
    imagen: string | null;
    metodos_pago_resumen: MetodoResumen[];
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
    // Crear y eliminar monedas es solo del admin; el moderador las ve y las edita (ver routes/crud/monedas.php)
    const esAdmin = (props.auth as { user?: { role?: string } } | undefined)?.user?.role === 'admin';

    const [loadingStates, setLoadingStates] = useState<{ [key: number]: string }>({});
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [monedaSeleccionada, setMonedaSeleccionada] = useState<Moneda | null>(null);

    // Mostrar notificaciones si hay mensajes
    useEffect(() => {
        if (success) {
            sileo.success({ title: success });
        }
        if (error) {
            sileo.error({ title: error });
        }
    }, [success, error]);

    const handleAction = (monedaId: number, action: 'cambiar-estado' | 'establecer-principal') => {
        setLoadingStates((prev) => ({ ...prev, [monedaId]: action }));

        router.patch(
            route(`monedas.${action}`, { moneda: monedaId }),
            {},
            {
                onError: () => sileo.error({ title: 'Error al realizar la acción' }),
                onFinish: () => setLoadingStates((prev) => ({ ...prev, [monedaId]: '' })),
            },
        );
    };

    const handleDeleteClick = (moneda: MonedaCardData) => {
        setMonedaSeleccionada(moneda as Moneda);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = () => {
        if (!monedaSeleccionada) return;

        router.delete(route('monedas.destroy', { moneda: monedaSeleccionada.id }), {
            onSuccess: () => {
                setDeleteConfirmOpen(false);
                setMonedaSeleccionada(null);
            },
            onError: () => sileo.error({ title: 'Error al eliminar', description: 'No se pudo eliminar la moneda' }),
        });
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
                    (docs/patron-card-header-degradado.md), violeta para todo el módulo.
                    Grilla de cards (en vez de tabla) siguiendo el mismo patrón que
                    Cuentas/Index.tsx + CuentaCard.tsx: el catálogo de monedas ya tiene
                    varios campos (tasas, métodos de pago, estado, principal) y es corto,
                    así que no necesita paginación como Cuentas. */}
                <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Coins className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Lista de Monedas</CardTitle>
                                <CardDescription className="text-violet-100">
                                    {monedas.length} moneda{monedas.length !== 1 ? 's' : ''} en el sistema
                                </CardDescription>
                            </div>
                        </div>
                        {esAdmin && (
                            <Button asChild className="bg-white/20 text-white backdrop-blur-sm hover:bg-white/30">
                                <Link href="/monedas/create">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nueva Moneda
                                </Link>
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="pt-5">
                        {monedas.length === 0 ? (
                            <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center">
                                <Coins size={32} className="opacity-40" />
                                <p>No hay monedas registradas</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {monedas.map((moneda) => (
                                    <MonedaCard
                                        key={moneda.id}
                                        moneda={moneda}
                                        loadingAction={loadingStates[moneda.id] ?? ''}
                                        onCambiarEstado={() => handleAction(moneda.id, 'cambiar-estado')}
                                        onEstablecerPrincipal={() => handleAction(moneda.id, 'establecer-principal')}
                                        onDeleteClick={handleDeleteClick}
                                        formatNumber={formatNumber}
                                        puedeEliminar={esAdmin}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── Dialog: Confirmar eliminación ─────────────────────────── */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará la moneda "{monedaSeleccionada?.nombre_moneda}" ({monedaSeleccionada?.codigo_moneda}). Esta
                            acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setMonedaSeleccionada(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <ScrollProgress />
            <Toaster position="top-center" />
        </AppLayout>
    );
}
