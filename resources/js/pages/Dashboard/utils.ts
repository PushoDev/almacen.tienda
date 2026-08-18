// Colores fijos para las monedas más comunes; cualquier otra (dinámica, agregada por el
// admin en Gestión de Monedas) cae en la paleta de respaldo, ciclando por posición —
// mismo criterio que `colorPago()` en RastreoOperaciones.tsx.
export const COLORES_MONEDA: Record<string, { bg: string; text: string; border: string }> = {
    USD: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700' },
    CUP: { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700' },
    EUR: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700' },
    MLC: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700' },
    // No es una moneda real — fila sintética de valor de inventario en Comparación Mensual.
    // Color neutro a propósito, para distinguirla de las monedas reales de un vistazo.
    INVENTARIO: { bg: 'bg-slate-100 dark:bg-slate-800/60', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-600' },
};

export const PALETA_MONEDA_RESPALDO = [
    { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-300 dark:border-violet-700' },
    { bg: 'bg-pink-100 dark:bg-pink-900/40', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-300 dark:border-pink-700' },
    { bg: 'bg-cyan-100 dark:bg-cyan-900/40', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-300 dark:border-cyan-700' },
    { bg: 'bg-lime-100 dark:bg-lime-900/40', text: 'text-lime-700 dark:text-lime-300', border: 'border-lime-300 dark:border-lime-700' },
];

export const colorMoneda = (codigo: string, index: number) => COLORES_MONEDA[codigo] ?? PALETA_MONEDA_RESPALDO[index % PALETA_MONEDA_RESPALDO.length];
