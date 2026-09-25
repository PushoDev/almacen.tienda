import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Undo2, XCircle } from 'lucide-react';
import { type EstadoImportacion } from './tipos';

const CONFIG: Record<EstadoImportacion, { etiqueta: string; clases: string; Icono: typeof CheckCircle2 }> = {
    completada: {
        etiqueta: 'Completada',
        clases: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
        Icono: CheckCircle2,
    },
    con_omitidas: {
        etiqueta: 'Con filas omitidas',
        clases: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
        Icono: AlertTriangle,
    },
    fallida: {
        etiqueta: 'Fallida',
        clases: 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300',
        Icono: XCircle,
    },
    revertida: {
        etiqueta: 'Deshecha',
        clases: 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300',
        Icono: Undo2,
    },
};

export function EstadoImportacionBadge({ estado }: { estado: EstadoImportacion }) {
    const { etiqueta, clases, Icono } = CONFIG[estado];

    return (
        <Badge variant="outline" className={`gap-1 ${clases}`}>
            <Icono className="h-3 w-3" />
            {etiqueta}
        </Badge>
    );
}
