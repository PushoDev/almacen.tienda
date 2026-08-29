import { Badge } from '@/components/ui/badge';
import { Crown, ShieldCheck, UserCheck } from 'lucide-react';

const ROL_CONFIG = {
    admin: {
        label: 'Administrador',
        icon: Crown,
        badge: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/20 dark:text-rose-300',
    },
    moderador: {
        label: 'Moderador',
        icon: ShieldCheck,
        badge: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-300',
    },
    vendedor: {
        label: 'Vendedor',
        icon: UserCheck,
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300',
    },
} as const;

export function RolBadge({ role }: { role: 'admin' | 'moderador' | 'vendedor' }) {
    const config = ROL_CONFIG[role] ?? ROL_CONFIG.vendedor;
    const Icon = config.icon;

    return (
        <Badge variant="outline" className={`gap-1 ${config.badge}`}>
            <Icon className="h-3 w-3" />
            {config.label}
        </Badge>
    );
}
