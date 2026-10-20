import type { SharedData } from '@/types';
import type { route as routeFn } from 'ziggy-js';

declare global {
    const route: typeof routeFn;
}

/** Props que `HandleInertiaRequests` comparte con todas las páginas: así `usePage().props.auth` queda tipado. */
declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: SharedData;
    }
}
