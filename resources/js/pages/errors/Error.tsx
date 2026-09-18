import { Button } from '@/components/ui/button';
import { Head, Link } from '@inertiajs/react';

interface ErrorPageProps {
    status: number;
    authenticated: boolean;
}

const TITLES: Record<number, string> = {
    403: 'No tienes permiso para ver esto',
    404: 'Página no encontrada',
    500: 'Algo salió mal',
    503: 'En mantenimiento',
};

const DESCRIPTIONS: Record<number, string> = {
    403: 'Tu cuenta no tiene acceso a esta sección.',
    404: 'La página que buscas no existe o fue movida.',
    500: 'Ocurrió un error inesperado en el servidor. Ya quedó registrado.',
    503: 'Estamos haciendo ajustes en el sistema. Vuelve en unos minutos.',
};

export default function ErrorPage({ status, authenticated }: ErrorPageProps) {
    const title = TITLES[status] ?? 'Ocurrió un error';
    const description = DESCRIPTIONS[status] ?? 'Algo no salió como esperábamos.';

    return (
        <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 text-center md:p-10">
            <Head title={`${status} — ${title}`} />

            <img
                src="/projects/mascota/mascota.webp"
                alt=""
                aria-hidden="true"
                className="pointer-events-none h-40 w-40 object-contain select-none md:h-48 md:w-48"
            />

            <div className="space-y-2">
                <p className="text-muted-foreground text-sm font-medium">Error {status}</p>
                <h1 className="text-2xl font-semibold text-balance">{title}</h1>
                <p className="text-muted-foreground max-w-sm text-sm text-balance">{description}</p>
            </div>

            <Button asChild>
                <Link href={authenticated ? route('dashboard') : route('home')}>{authenticated ? 'Volver al inicio' : 'Iniciar sesión'}</Link>
            </Button>
        </div>
    );
}
