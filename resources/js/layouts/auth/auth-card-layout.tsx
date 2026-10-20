import { LogoLoop } from '@/components/animated/logo-loop';
import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LOGOS_FOOTER } from '@/lib/logos-footer';
import { Link } from '@inertiajs/react';
import { BookOpen } from 'lucide-react';
import { type PropsWithChildren } from 'react';

/** Destino del vínculo "Documentación" de la barra; mientras sea null el botón aparece desactivado. */
const DOCUMENTACION_URL: string | null = null;

export default function AuthCardLayout({
    children,
    title,
    description,
}: PropsWithChildren<{
    name?: string;
    title?: string;
    description?: string;
}>) {
    return (
        <div className="relative flex min-h-svh items-center justify-center p-6 pt-24 pb-44 md:p-10 md:pt-24 md:pb-44">
            {/* Imagen de fondo en toda la página */}
            <div className="image-background animate__animated animate__fadeIn absolute inset-0" />
            <div className="absolute inset-0 bg-black/20" />

            {/* Barra superior: logo a la izquierda, selector de tema a la derecha */}
            <header className="bg-background/80 border-sidebar-accent/40 fixed inset-x-0 top-0 z-20 border-b backdrop-blur-md">
                <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-8">
                    <Link href={route('home')} className="flex items-center gap-2 font-semibold">
                        <img src="/logo.svg" alt="Glorietashop" className="h-10 w-auto select-none" />
                        <span className="hidden sm:inline">Glorietashop</span>
                    </Link>
                    <div className="flex items-center gap-1">
                        {DOCUMENTACION_URL ? (
                            <Button asChild variant="ghost" size="sm">
                                <a href={DOCUMENTACION_URL}>
                                    <BookOpen />
                                    Documentación
                                </a>
                            </Button>
                        ) : (
                            <Button variant="ghost" size="sm" disabled title="Próximamente">
                                <BookOpen />
                                Documentación
                            </Button>
                        )}
                        <AppearanceToggleDropdown />
                    </div>
                </div>
            </header>

            <div className="relative z-10 flex w-full max-w-md flex-col gap-6">
                <div className="flex flex-col gap-6">
                    <Card data-estado="indigo" className="spotlight-card relative rounded-xl">
                        {/* Mascota bleed (Variante A, ver docs/patron-mascota-bleed.md) — parada
                            sobre el borde superior del Card, centrada, con el torso metido sobre
                            el título (pedido explícito del cliente). Reemplaza al AppLogoIcon chico
                            que iba adentro del header. Sigue siendo el link a home.
                            El CardHeader necesita su propio `relative` para pintar por encima de
                            esta imagen absolute — mismo bug/fix documentado en Variante B. */}
                        <Link href={route('home')} className="absolute -top-16 left-1/2 z-0 h-32 w-32 -translate-x-1/2 select-none">
                            <img src="/projects/mascota/mascota.webp" alt="Inicio" className="h-full w-full" />
                        </Link>
                        <CardHeader className="relative px-10 pt-8 pb-0 text-center">
                            <CardTitle className="text-xl">{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </CardHeader>
                        <CardContent className="px-10 py-8">{children}</CardContent>
                    </Card>
                </div>
            </div>

            {/* Pie de página: derechos a la izquierda, crédito del desarrollador a la derecha */}
            <footer className="bg-background/80 border-sidebar-accent/40 text-muted-foreground fixed inset-x-0 bottom-0 z-20 border-t text-xs backdrop-blur-md">
                <LogoLoop logos={LOGOS_FOOTER} logoHeight={36} gap={36} speed={50} ariaLabel="Bancos y vías de pago" className="py-3" />
                <div className="border-sidebar-accent/40 mx-auto flex min-h-12 w-full max-w-7xl flex-col items-center justify-between gap-1 border-t px-4 py-2 sm:flex-row md:px-8">
                    <p>© {new Date().getFullYear()} Glorietashop. Derechos reservados.</p>
                    <p>
                        Creado por{' '}
                        <a
                            href="https://pushodev.vercel.app"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground font-medium underline-offset-4 hover:underline"
                        >
                            PushoDev.Tech
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    );
}
