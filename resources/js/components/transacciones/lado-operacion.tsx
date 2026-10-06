import {
    type Acento,
    type Banco,
    claseBadge,
    claseCifra,
    claseTarjeta,
    type Entidad,
    formatear,
    Insignia,
    SeccionTitulo,
    type TipoEntidad,
} from '@/components/transacciones/entidad';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Info, Lock } from 'lucide-react';

/** Lo que el servidor sabe de una punta de la operación (origen, destino, entrada, salida, mensajero). */
export interface DetallesSaldo {
    tipo: TipoEntidad;
    nombre: string | null;
    moneda: string | null;
    simbolo: string;
    banco: Banco | null;
    /** false cuando el usuario no puede ver los saldos de esta entidad (cuenta ajena, cliente, proveedor para un vendedor). */
    saldos_visibles: boolean;
    tiene_datos_historicos: boolean;
    saldo_anterior: number | null;
    saldo_posterior: number | null;
    /** Con signo: negativo si el dinero salió de esta punta, positivo si entró. */
    monto_operacion: number;
    saldo_actual: number | null;
}

const ETIQUETA_TIPO_ENTIDAD: Record<TipoEntidad, string> = { cuenta: 'Cuenta', cliente: 'Cliente', proveedor: 'Proveedor' };

const entidadDe = (detalles: DetallesSaldo): Entidad => ({
    id: '0',
    tipo: detalles.tipo,
    nombre: detalles.nombre ?? 'No especificado',
    monedaCodigo: detalles.moneda ?? '',
    simbolo: detalles.simbolo,
    saldo: null,
    banco: detalles.banco,
});

/** Una de las puntas de la operación: quién es, cuánto se movió y cómo cambió su saldo. */
export default function LadoOperacion({
    id,
    titulo,
    icono,
    acento,
    detalles,
}: {
    id: string;
    titulo: string;
    icono: React.ElementType;
    acento: Acento;
    detalles: DetallesSaldo;
}) {
    const sale = detalles.monto_operacion < 0;
    const saldoActualDifiere =
        detalles.saldo_actual !== null && Math.abs(detalles.saldo_actual - (detalles.saldo_posterior ?? 0)) > 0.01 && detalles.tiene_datos_historicos;

    return (
        <section className="space-y-4" aria-labelledby={id}>
            <SeccionTitulo id={id} icono={icono} acento={acento}>
                {titulo}
            </SeccionTitulo>

            <div className={cn('space-y-4 rounded-xl border p-4 backdrop-blur-sm', claseTarjeta(acento))}>
                <div className="flex items-center gap-4">
                    <Insignia entidad={entidadDe(detalles)} tamano="lg" />
                    <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="truncate text-lg font-semibold">{detalles.nombre ?? 'No especificado'}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn('border-0 px-3 py-0.5 font-bold text-white shadow-md', claseBadge(acento))}>{detalles.moneda}</Badge>
                            <span className="text-muted-foreground text-xs">{ETIQUETA_TIPO_ENTIDAD[detalles.tipo]}</span>
                        </div>
                    </div>
                    <p className={cn('text-right text-2xl font-black tabular-nums', claseCifra(acento))}>
                        {sale ? '−' : '+'} {detalles.simbolo} {formatear(Math.abs(detalles.monto_operacion))}
                    </p>
                </div>

                {!detalles.saldos_visibles ? (
                    <p className="text-muted-foreground flex items-center gap-2 border-t pt-3 text-sm">
                        <Lock className="h-4 w-4 shrink-0" /> Los saldos de {detalles.tipo === 'cuenta' ? 'esta cuenta' : 'esta entidad'} no están
                        visibles para tu rol.
                    </p>
                ) : !detalles.tiene_datos_historicos ? (
                    <Alert className="border-amber-300/60 bg-amber-500/5">
                        <Info className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800 dark:text-amber-300">
                            <strong>Operación antigua:</strong> se hizo antes de guardar los saldos de cada momento.
                            {detalles.saldo_actual !== null && (
                                <>
                                    {' '}
                                    Saldo actual: {detalles.simbolo} {formatear(detalles.saldo_actual)}.
                                </>
                            )}
                        </AlertDescription>
                    </Alert>
                ) : (
                    <dl className="grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                        <div>
                            <dt className="text-muted-foreground text-xs font-medium">Saldo antes</dt>
                            <dd className="text-lg font-bold tabular-nums">
                                {detalles.simbolo} {formatear(detalles.saldo_anterior ?? 0)}
                            </dd>
                        </div>
                        <div className="text-right">
                            <dt className="text-muted-foreground text-xs font-medium">Saldo después</dt>
                            <dd className="text-lg font-bold tabular-nums">
                                {detalles.simbolo} {formatear(detalles.saldo_posterior ?? 0)}
                            </dd>
                        </div>
                        {saldoActualDifiere && detalles.saldo_actual !== null && (
                            <p className="text-muted-foreground col-span-2 text-xs">
                                Saldo actual: {detalles.simbolo} {formatear(detalles.saldo_actual)} (después de esta operación hubo otras).
                            </p>
                        )}
                    </dl>
                )}
            </div>
        </section>
    );
}
