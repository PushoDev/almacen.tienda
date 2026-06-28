import { AppContent } from '@/components/app-content';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import TasasFlotante from '@/components/TasasFlotante';
import { type BreadcrumbItem } from '@/types';
import type { PropsWithChildren } from 'react';
import { Toaster } from 'sonner';

export default function AppHeaderLayout({ children, breadcrumbs }: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <AppShell>
            <AppHeader breadcrumbs={breadcrumbs} />
            <AppContent>{children}</AppContent>
            <Toaster position="top-center" />
            <TasasFlotante />
        </AppShell>
    );
}
