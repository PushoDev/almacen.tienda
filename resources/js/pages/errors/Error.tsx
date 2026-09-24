import { Button } from '@/components/ui/button';
import SpotlightCard from '@/components/ui/spotlightcard';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Home, LogIn, RefreshCw, SearchX, ServerCrash, ShieldAlert, TriangleAlert, Wrench, type LucideIcon } from 'lucide-react';

interface ErrorPageProps {
    status: number;
    authenticated: boolean;
}

interface ErrorConfig {
    title: string;
    description: string;
    icon: LucideIcon;
    /** Color del borde animado de la tarjeta (rojo o ámbar). */
    estado: 'agotado' | 'especial';
    /** Acción secundaria además de volver al inicio. */
    accion: 'atras' | 'reintentar';
}

const CONFIGS: Record<number, ErrorConfig> = {
    403: {
        title: 'No tienes permiso para ver esto',
        description: 'Tu cuenta no tiene acceso a esta sección. Si crees que es un error, avisa a un administrador.',
        icon: ShieldAlert,
        estado: 'agotado',
        accion: 'atras',
    },
    404: {
        title: 'Página no encontrada',
        description: 'La página que buscas no existe o fue movida de lugar.',
        icon: SearchX,
        estado: 'especial',
        accion: 'atras',
    },
    500: {
        title: 'Algo salió mal',
        description: 'Ocurrió un error inesperado en el servidor. Ya quedó registrado; intenta de nuevo en un momento.',
        icon: ServerCrash,
        estado: 'agotado',
        accion: 'reintentar',
    },
    503: {
        title: 'Estamos en mantenimiento',
        description: 'Estamos haciendo ajustes en el sistema. Vuelve en unos minutos.',
        icon: Wrench,
        estado: 'especial',
        accion: 'reintentar',
    },
};

const CONFIG_POR_DEFECTO: ErrorConfig = {
    title: 'Ocurrió un error',
    description: 'Algo no salió como esperábamos.',
    icon: TriangleAlert,
    estado: 'agotado',
    accion: 'reintentar',
};

export default function ErrorPage({ status, authenticated }: ErrorPageProps) {
    const config = CONFIGS[status] ?? CONFIG_POR_DEFECTO;
    const Icono = config.icon;
    const colorIcono = config.estado === 'agotado' ? 'bg-red-500/15 text-red-500' : 'bg-amber-500/15 text-amber-500';

    return (
        <div className="bg-background relative flex min-h-svh flex-col items-center justify-center overflow-hidden p-6 pt-28 text-center">
            <Head title={`${status} — ${config.title}`} />

            {/* Número del error gigante y muy tenue, de fondo */}
            <span
                aria-hidden="true"
                className="text-foreground pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-[clamp(10rem,34vw,26rem)] leading-none font-black opacity-[0.04] select-none"
            >
                {status}
            </span>

            <SpotlightCard estado={config.estado} className="bg-card relative w-full max-w-md rounded-2xl px-8 pt-24 pb-8 shadow-xl">
                {/* La mascota se asoma por encima de la tarjeta */}
                <img
                    src="/projects/mascota/mascota.webp"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-24 left-1/2 z-20 h-48 w-48 -translate-x-1/2 object-contain drop-shadow-xl select-none"
                />

                <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${colorIcono}`}>
                    <Icono className="h-6 w-6" />
                </div>

                <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">Error {status}</p>
                <h1 className="mt-1 text-2xl font-bold text-balance">{config.title}</h1>
                <p className="text-muted-foreground mx-auto mt-2 max-w-xs text-sm text-balance">{config.description}</p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    {authenticated ? (
                        <>
                            <Button asChild>
                                <Link href={route('dashboard')}>
                                    <Home className="h-4 w-4" />
                                    Volver al inicio
                                </Link>
                            </Button>
                            {config.accion === 'atras' ? (
                                <Button variant="outline" onClick={() => window.history.back()}>
                                    <ArrowLeft className="h-4 w-4" />
                                    Volver atrás
                                </Button>
                            ) : (
                                <Button variant="outline" onClick={() => window.location.reload()}>
                                    <RefreshCw className="h-4 w-4" />
                                    Reintentar
                                </Button>
                            )}
                        </>
                    ) : (
                        <Button asChild>
                            <Link href={route('login')}>
                                <LogIn className="h-4 w-4" />
                                Iniciar sesión
                            </Link>
                        </Button>
                    )}
                </div>
            </SpotlightCard>
        </div>
    );
}
