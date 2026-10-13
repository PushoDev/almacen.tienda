import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users } from 'lucide-react';

/** Quién atendió en el periodo y qué movió cada turno. */
export interface TurnoResumen {
    turno_id: number | null;
    nombre: string | null;
    desde: string | null;
    ventas_count: number;
    ventas_total_usd: number;
    gastos_count: number;
    ingresos_count: number;
    transferencias_count: number;
}

/** Quién creó la operación ("Tú" o su nombre) y, debajo, la persona que atendía ("Atendido por") si hay turno. */
export function CreadoPor({
    esPropio,
    usuario,
    turno,
    etiquetaPropio = 'Tú',
}: {
    esPropio?: boolean;
    usuario?: string;
    turno?: string | null;
    /** Cómo se rotula lo del dueño del cierre: "Tú" en la pantalla de cierre, su nombre cuando lo mira otra persona. */
    etiquetaPropio?: string;
}) {
    return (
        <div className="space-y-0.5">
            {esPropio ? (
                <Badge className="border border-violet-400/30 bg-violet-500/10 text-violet-700 backdrop-blur-sm dark:text-violet-300">{etiquetaPropio}</Badge>
            ) : (
                <span>{usuario || 'Sistema'}</span>
            )}
            {turno && <p className="text-muted-foreground text-[10px] leading-tight">Atendió: {turno}</p>}
        </div>
    );
}

/** Marca de un movimiento de cliente: se lista pero no cambia la caja. */
export function MarcaInformativa({ afectaCaja }: { afectaCaja?: boolean }) {
    if (afectaCaja !== false) {
        return null;
    }

    return (
        <Badge className="mt-1 border border-slate-400/30 bg-slate-500/10 text-[10px] text-slate-600 backdrop-blur-sm dark:text-slate-300">
            Solo informativo: no cambia la caja
        </Badge>
    );
}

/**
 * Card "Turnos de este cierre" (cian): quién atendió en el periodo y qué movió cada persona. `turnos` es null en los
 * cierres guardados antes de registrar los turnos: se avisa en vez de mostrar una tabla vacía que parezca "no hubo".
 */
export function TarjetaTurnos({ turnos, nota }: { turnos: TurnoResumen[] | null | undefined; nota?: string }) {
    return (
        <Card className="gap-0 overflow-hidden border-l-4 border-cyan-500/30 py-0 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="border-b bg-gradient-to-r from-cyan-600 to-cyan-700 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-white">Turnos de este cierre</CardTitle>
                        <CardDescription className="text-cyan-100">
                            Quién atendió en el periodo y qué movió cada persona.
                            {nota ? ` ${nota}` : ''}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted hover:bg-muted">
                            <TableHead>Atendió</TableHead>
                            <TableHead className="w-36">Desde</TableHead>
                            <TableHead className="w-44 text-right">Ventas</TableHead>
                            <TableHead className="w-24 text-center">Gastos</TableHead>
                            <TableHead className="w-24 text-center">Ingresos</TableHead>
                            <TableHead className="w-32 text-center">Transferencias</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(turnos ?? []).length > 0 ? (
                            (turnos ?? []).map((turno, idx) => (
                                <TableRow key={turno.turno_id ?? `sin-turno-${idx}`}>
                                    <TableCell className="text-sm font-medium">
                                        {turno.nombre ?? <span className="text-muted-foreground italic">Sin turno registrado</span>}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">{turno.desde ?? '—'}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge className="border border-cyan-400/30 bg-cyan-500/10 font-mono whitespace-nowrap text-cyan-700 backdrop-blur-sm dark:text-cyan-300">
                                            {turno.ventas_count} · ${Number(turno.ventas_total_usd).toFixed(2)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-sm">{turno.gastos_count}</TableCell>
                                    <TableCell className="text-center font-mono text-sm">{turno.ingresos_count}</TableCell>
                                    <TableCell className="text-center font-mono text-sm">{turno.transferencias_count}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-muted-foreground py-8 text-center italic">
                                    {turnos === null || turnos === undefined
                                        ? 'Este cierre se guardó antes de registrar los turnos: no hay datos de quién atendió.'
                                        : 'Sin operaciones en este periodo.'}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
