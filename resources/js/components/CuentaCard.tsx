import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Link } from '@inertiajs/react';
import { Banknote, CreditCard, Edit3, Eye, Globe, Lock, MoreVertical, Trash2, User, Wallet } from 'lucide-react';

export interface CuentaCardData {
    id: number;
    nombre_cuenta: string;
    tipo: string;
    saldo_cuenta: number | null;
    tipo_titular?: string | null;
    estado: string;
    banco: { slug: string; nombre: string; imagen_url: string } | null;
    moneda: {
        codigo_moneda: string;
        simbolo_moneda: string;
        nombre_moneda: string;
    } | null;
}

/**
 * Número enmascarado puramente decorativo (no existe un número de tarjeta real en el
 * sistema) — determinístico a partir del id, así que la misma cuenta siempre muestra el
 * mismo número en vez de cambiar en cada render (decisión confirmada 2026-08-25).
 */
function numeroDecorativo(id: number): string {
    const seed = (id * 7919) % 10000;
    return `•••• •••• •••• ${String(seed).padStart(4, '0')}`;
}

export function CuentaCard({
    cuenta,
    isAdmin,
    onEditClick,
    onDeleteClick,
}: {
    cuenta: CuentaCardData;
    isAdmin: boolean;
    onEditClick: (e: React.MouseEvent) => void;
    onDeleteClick: (cuenta: CuentaCardData) => void;
}) {
    const activa = cuenta.estado === 'activa';
    const puedeEliminar = isAdmin && Number(cuenta.saldo_cuenta ?? 0) === 0;

    return (
        <div className="bg-card overflow-hidden rounded-2xl border shadow-sm transition-all hover:shadow-md">
            {/* Header — la tarjeta real del banco elegido, o un fondo genérico */}
            <div className="relative flex h-24 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-600 to-slate-800">
                {cuenta.banco ? (
                    <img src={cuenta.banco.imagen_url} alt={cuenta.banco.nombre} className="h-full w-full object-cover" />
                ) : cuenta.tipo === 'efectivo' ? (
                    <Wallet className="h-10 w-10 text-white/30" />
                ) : (
                    <CreditCard className="h-10 w-10 text-white/30" />
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 cursor-pointer bg-black/40 text-white hover:bg-black/60"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href={route('cuentas.show', { cuenta: cuenta.id })} className="flex cursor-pointer items-center gap-2">
                                <Eye className="h-4 w-4" /> Ver detalles
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link
                                href={route('cuentas.edit', { cuenta: cuenta.id })}
                                onClick={onEditClick}
                                className="flex cursor-pointer items-center gap-2"
                            >
                                <Edit3 className="h-4 w-4" /> Editar
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onDeleteClick(cuenta)}
                            className={puedeEliminar ? 'flex cursor-pointer items-center gap-2 text-red-600' : 'flex cursor-pointer items-center gap-2 text-muted-foreground'}
                        >
                            {puedeEliminar ? <Trash2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />} Eliminar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Cuerpo */}
            <div className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold">{cuenta.nombre_cuenta}</span>
                    <Badge
                        variant="outline"
                        className={
                            activa
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300'
                                : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-400'
                        }
                    >
                        {activa ? 'Activa' : 'Inactiva'}
                    </Badge>
                </div>

                <p className="text-muted-foreground font-mono text-xs tracking-wider">{numeroDecorativo(cuenta.id)}</p>

                <div>
                    <p
                        className={
                            cuenta.saldo_cuenta != null
                                ? cuenta.saldo_cuenta > 0
                                    ? 'text-xl font-bold text-emerald-600'
                                    : cuenta.saldo_cuenta < 0
                                      ? 'text-xl font-bold text-red-600'
                                      : 'text-xl font-bold'
                                : 'text-xl font-bold'
                        }
                    >
                        {cuenta.moneda?.simbolo_moneda || '$'} {Math.abs(cuenta.saldo_cuenta ?? 0).toFixed(2)}
                    </p>
                    <p className="text-muted-foreground text-xs">Saldo disponible</p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 border-t pt-3">
                    {cuenta.tipo_titular ? (
                        <Badge
                            variant="outline"
                            className={
                                cuenta.tipo_titular === 'externa'
                                    ? 'inline-flex items-center gap-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/20 dark:text-blue-300'
                                    : 'inline-flex items-center gap-1 border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-300'
                            }
                        >
                            {cuenta.tipo_titular === 'externa' ? <Globe className="h-3 w-3" /> : <User className="h-3 w-3" />}
                            {cuenta.tipo_titular === 'externa' ? 'Externa' : 'Personal'}
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                            Sin asignar
                        </Badge>
                    )}

                    <Badge variant="outline" className="inline-flex items-center gap-1">
                        {cuenta.tipo === 'tarjeta' ? <CreditCard className="h-3 w-3" /> : <Banknote className="h-3 w-3" />}
                        {cuenta.banco?.nombre ?? (cuenta.tipo === 'tarjeta' ? 'Sin banco' : 'Efectivo')}
                    </Badge>

                    {cuenta.moneda && (
                        <Badge variant="outline" className="font-mono">
                            {cuenta.moneda.codigo_moneda}
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
}
