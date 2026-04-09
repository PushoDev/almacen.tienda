import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { Bolt } from 'lucide-react';
import { type PropsWithChildren } from 'react';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Perfil',
        href: '/settings/profile',
        icon: null,
        roles: ['admin', 'moderador', 'vendedor'],
    },
    {
        title: 'Contraseña',
        href: '/settings/password',
        icon: null,
        roles: ['admin', 'moderador', 'vendedor'],
    },
    {
        title: 'Apariencia',
        href: '/settings/appearance',
        icon: null,
        roles: ['admin', 'moderador', 'vendedor'],
    },
    {
        title: 'Copia de Seguridad',
        href: '#',
        icon: null,
        roles: ['admin'],
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    // When server-side rendering, we only render the layout on the client...
    if (typeof window === 'undefined') {
        return null;
    }

    const currentPath = window.location.pathname;

    return (
        <div className="px-4 py-6">
            <Heading title="Configuración" description="Administre la configuración de su perfil y cuenta" />
            <Bolt
                size={100}
                color="#d6d3d1"
                className="pointer-events-none absolute bottom-2 translate-x-2 translate-y-[-10] transform animate-pulse opacity-40"
            />

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-y-0 lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav className="flex flex-col space-y-1 space-x-0">
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${item.href}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted': currentPath === item.href,
                                })}
                            >
                                <Link href={item.href} prefetch>
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 md:hidden" />

                <div className="flex-1 md:max-w-2xl">
                    <section className="max-w-xl space-y-12">{children}</section>
                </div>
            </div>
        </div>
    );
}
