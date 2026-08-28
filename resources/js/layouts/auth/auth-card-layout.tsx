import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';

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
        <div className="relative flex min-h-svh items-center justify-center p-6 md:p-10">
            {/* Imagen de fondo en toda la página */}
            <div className="image-background animate__animated animate__fadeIn absolute inset-0" />
            <div className="absolute inset-0 bg-black/20" />

            <div className="relative z-10 flex w-full max-w-md flex-col gap-6">
                <div className="flex flex-col gap-6">
                    <Card className="relative rounded-xl">
                        {/* Mascota bleed (Variante A, ver docs/patron-mascota-bleed.md) — parada
                            sobre el borde superior del Card, centrada, con el torso metido sobre
                            el título (pedido explícito del cliente). Reemplaza al AppLogoIcon chico
                            que iba adentro del header. Sigue siendo el link a home.
                            El CardHeader necesita su propio `relative` para pintar por encima de
                            esta imagen absolute — mismo bug/fix documentado en Variante B. */}
                        <Link
                            href={route('home')}
                            className="absolute -top-16 left-1/2 z-0 h-32 w-32 -translate-x-1/2 select-none"
                        >
                            <img src="/projects/mascota/mascota.webp" alt="Inicio" className="h-full w-full" />
                        </Link>
                        <CardHeader className="relative px-10 pt-8 pb-0 text-center">
                            <CardTitle className="text-xl">{title}</CardTitle>
                            <CardDescription>{description}</CardDescription>
                        </CardHeader>
                        <CardContent className="px-10 py-8">{children}</CardContent>
                    </Card>
                </div>

                <p className="text-center text-xs text-white/70">
                    Derechos reservados — Created By:{' '}
                    <a
                        href="https://pushodev.vercel.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline hover:text-white"
                    >
                        PushoDev.Tech
                    </a>
                </p>
            </div>
        </div>
    );
}
