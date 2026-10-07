import { formatear } from '@/components/transacciones/entidad';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { sileo } from '@/lib/sileo';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import axios from 'axios';
import {
    Ban,
    CheckCircle2,
    ChevronDown,
    CreditCard,
    History,
    Loader2,
    PackageCheck,
    Printer,
    ShieldCheck,
    Truck,
    Undo2,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';

interface CuentaEnvio {
    id: number;
    nombre: string;
    moneda: string | null;
    banco: { slug: string; nombre: string; imagen_url: string } | null;
    responsables?: string[];
}

interface Seguimiento {
    estado: string;
    observaciones: string | null;
    usuario: string | null;
    fecha: string | null;
}

interface Envio {
    id: number;
    estado: string;
    monto: number;
    moneda: string;
    monto_destino: number;
    moneda_destino: string;
    tasa_cambio_aplicada: number | null;
    comentario: string | null;
    monto_recibido: number | null;
    monto_acreditado: number | null;
    diferencia: number;
    diferencia_por_resolver: boolean;
    diferencia_nota: string | null;
    fecha_envio: string | null;
    fecha_confirmacion: string | null;
    enviado_por: string | null;
    confirmado_por: string | null;
    cuenta_origen: CuentaEnvio;
    cuenta_destino: CuentaEnvio;
    permisos: { confirmar: boolean; rechazar: boolean; anular: boolean; resolver_diferencia: boolean };
    seguimientos: Seguimiento[];
}

type Accion = 'confirmar' | 'rechazar' | 'anular' | 'resolver';

const ESTADOS: Record<string, { etiqueta: string; clase: string }> = {
    en_transito: { etiqueta: 'En tránsito', clase: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' },
    recibido: { etiqueta: 'Recibido completo', clase: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' },
    recibido_parcial: { etiqueta: 'Recibido con diferencia', clase: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20' },
    rechazado: { etiqueta: 'Rechazado', clase: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20' },
    anulado: { etiqueta: 'Anulado', clase: 'bg-muted text-muted-foreground border-border' },
    diferencia_resuelta: { etiqueta: 'Diferencia resuelta', clase: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
};

const formatearFecha = (fecha: string | null) =>
    fecha ? new Date(fecha).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function Cuenta({ cuenta, etiqueta }: { cuenta: CuentaEnvio; etiqueta: string }) {
    return (
        <div className="flex min-w-0 items-center gap-3">
            <span className="flex w-14 shrink-0 items-center justify-center">
                {cuenta.banco ? (
                    <img src={cuenta.banco.imagen_url} alt="" aria-hidden="true" className="h-8 w-auto max-w-full object-contain" />
                ) : (
                    <CreditCard className="text-muted-foreground h-8 w-8" strokeWidth={1.5} />
                )}
            </span>
            <div className="min-w-0">
                <h4 className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">{etiqueta}</h4>
                <p className="truncate font-semibold">{cuenta.nombre}</p>
                {cuenta.responsables && cuenta.responsables.length > 0 && (
                    <p className="text-muted-foreground truncate text-xs">{cuenta.responsables.join(', ')}</p>
                )}
            </div>
        </div>
    );
}

const TEXTOS_ACCION: Record<Accion, { titulo: string; descripcion: string; boton: string; campo: string; obligatorio: boolean }> = {
    confirmar: {
        titulo: 'Confirmar recepción',
        descripcion: 'Indica cuánto dinero llegó realmente. Si llegó menos de lo enviado, la diferencia queda por resolver para admin y moderador.',
        boton: 'Confirmar recepción',
        campo: 'Observaciones (opcional)',
        obligatorio: false,
    },
    rechazar: {
        titulo: 'Rechazar envío',
        descripcion: 'El dinero vuelve íntegro a la cuenta de origen. Explica por qué lo rechazas.',
        boton: 'Rechazar envío',
        campo: 'Motivo',
        obligatorio: true,
    },
    anular: {
        titulo: 'Anular envío',
        descripcion: 'El dinero vuelve a la cuenta de origen mientras no lo hayan confirmado. Explica por qué lo anulas.',
        boton: 'Anular envío',
        campo: 'Motivo',
        obligatorio: true,
    },
    resolver: {
        titulo: 'Resolver diferencia',
        descripcion: 'Deja constancia de qué se hizo con el dinero que no llegó (por ejemplo, quién lo asume).',
        boton: 'Marcar como resuelta',
        campo: 'Nota',
        obligatorio: true,
    },
};

/**
 * Lista de envíos de dinero con las acciones que permite el servidor a cada usuario (confirmar, rechazar, anular,
 * resolver una diferencia). Los envíos llegan como propiedades de la página: al terminar una acción se recarga.
 */
export default function EnviosLista({ envios, hayFiltro }: { envios: Envio[]; hayFiltro: boolean }) {
    const [accion, setAccion] = useState<{ tipo: Accion; envio: Envio } | null>(null);
    const [monto, setMonto] = useState('');
    const [texto, setTexto] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');

    const abrir = (tipo: Accion, envio: Envio) => {
        setAccion({ tipo, envio });
        setMonto(String(envio.monto));
        setTexto('');
        setError('');
    };

    const cerrar = () => {
        if (!enviando) {
            setAccion(null);
        }
    };

    const ejecutar = () => {
        if (!accion) {
            return;
        }

        const { tipo, envio } = accion;
        const rutas: Record<Accion, string> = {
            confirmar: 'transacciones.envios.confirmar',
            rechazar: 'transacciones.envios.rechazar',
            anular: 'transacciones.envios.anular',
            resolver: 'transacciones.envios.resolver-diferencia',
        };
        const cuerpo =
            tipo === 'confirmar' ? { monto_recibido: monto, observaciones: texto } : tipo === 'resolver' ? { nota: texto } : { observaciones: texto };

        setEnviando(true);
        setError('');
        axios
            .post(route(rutas[tipo], envio.id), cuerpo)
            .then((res) => {
                sileo.success({ title: res.data.message });
                setAccion(null);
                // La lista y los widgets de arriba se calculan en el servidor: se vuelven a pedir
                router.reload();
            })
            .catch((err) => {
                const respuesta = err.response?.data;
                const primerError = respuesta?.errors ? (Object.values(respuesta.errors)[0] as string[])[0] : null;
                setError(respuesta?.message && !respuesta?.errors ? respuesta.message : (primerError ?? 'No se pudo completar la acción.'));
            })
            .finally(() => setEnviando(false));
    };

    if (envios.length === 0) {
        return (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-14 text-center">
                <Truck className="h-10 w-10 opacity-40" />
                <h2 className="text-foreground text-lg font-semibold">
                    {hayFiltro ? 'Ningún envío coincide con el filtro' : 'No hay envíos todavía'}
                </h2>
                <p className="max-w-md text-sm">
                    {hayFiltro
                        ? 'Quita el filtro para ver todos los envíos.'
                        : 'Cuando transfieras dinero a una cuenta de otra persona, el envío aparecerá aquí hasta que lo confirmen. Los que lleguen a tus cuentas también.'}
                </p>
            </div>
        );
    }

    const textos = accion ? TEXTOS_ACCION[accion.tipo] : null;

    return (
        <div className="space-y-4">
            {envios.map((envio) => {
                const estado = ESTADOS[envio.estado] ?? ESTADOS.anulado;
                const abierto = envio.estado === 'en_transito' || envio.diferencia_por_resolver;

                return (
                    <article
                        key={envio.id}
                        className={cn('space-y-4 rounded-xl border p-4', abierto ? 'border-orange-400/30 bg-orange-500/5' : 'bg-card')}
                    >
                        <header className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="flex items-center gap-2 text-lg font-bold">
                                <Truck className="text-muted-foreground h-5 w-5" /> Envío #{envio.id}
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                                {envio.diferencia_por_resolver && (
                                    <Badge className="border-0 bg-gradient-to-r from-amber-500 to-red-600 text-white shadow-md shadow-red-500/30">
                                        Diferencia por resolver
                                    </Badge>
                                )}
                                <span
                                    className={cn('inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold', estado.clase)}
                                >
                                    {estado.etiqueta}
                                </span>
                            </div>
                        </header>

                        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                            <Cuenta cuenta={envio.cuenta_origen} etiqueta="Sale de" />
                            <div className="text-center">
                                <p className="text-2xl font-black tabular-nums">
                                    {formatear(envio.monto)} {envio.moneda}
                                </p>
                                {envio.moneda !== envio.moneda_destino && (
                                    <p className="text-muted-foreground text-xs">
                                        → {formatear(envio.monto_destino)} {envio.moneda_destino}
                                        {envio.tasa_cambio_aplicada ? ` (tasa ${formatear(envio.tasa_cambio_aplicada)})` : ''}
                                    </p>
                                )}
                            </div>
                            <Cuenta cuenta={envio.cuenta_destino} etiqueta="Llega a" />
                        </div>

                        <dl className="text-muted-foreground grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                            <div>
                                <dt className="inline font-semibold">Enviado por:</dt> <dd className="inline">{envio.enviado_por ?? '—'}</dd> ·{' '}
                                {formatearFecha(envio.fecha_envio)}
                            </div>
                            {envio.fecha_confirmacion && (
                                <div>
                                    <dt className="inline font-semibold">
                                        {envio.estado === 'recibido' || envio.estado === 'recibido_parcial' ? 'Confirmado por:' : 'Cerrado por:'}
                                    </dt>{' '}
                                    <dd className="inline">{envio.confirmado_por ?? '—'}</dd> · {formatearFecha(envio.fecha_confirmacion)}
                                </div>
                            )}
                            {envio.monto_recibido !== null && (
                                <div>
                                    <dt className="inline font-semibold">Llegó:</dt>{' '}
                                    <dd className="inline">
                                        {formatear(envio.monto_recibido)} de {formatear(envio.monto)} {envio.moneda}
                                    </dd>
                                </div>
                            )}
                            {envio.comentario && (
                                <div className="sm:col-span-2">
                                    <dt className="inline font-semibold">Comentario:</dt> <dd className="inline">{envio.comentario}</dd>
                                </div>
                            )}
                            {envio.diferencia_nota && (
                                <div className="sm:col-span-2">
                                    <dt className="inline font-semibold">Diferencia resuelta:</dt> <dd className="inline">{envio.diferencia_nota}</dd>
                                </div>
                            )}
                        </dl>

                        <div className="flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => window.open(route('transacciones.envios.imprimir', envio.id), '_blank')}
                            >
                                <Printer className="h-4 w-4" /> Imprimir
                            </Button>
                            {envio.permisos.confirmar && (
                                <Button
                                    size="sm"
                                    className="gap-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white"
                                    onClick={() => abrir('confirmar', envio)}
                                >
                                    <PackageCheck className="h-4 w-4" /> Confirmar recepción
                                </Button>
                            )}
                            {envio.permisos.rechazar && (
                                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => abrir('rechazar', envio)}>
                                    <XCircle className="h-4 w-4" /> Rechazar
                                </Button>
                            )}
                            {envio.permisos.anular && (
                                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => abrir('anular', envio)}>
                                    <Ban className="h-4 w-4" /> Anular
                                </Button>
                            )}
                            {envio.permisos.resolver_diferencia && (
                                <Button size="sm" className="gap-1.5" onClick={() => abrir('resolver', envio)}>
                                    <ShieldCheck className="h-4 w-4" /> Resolver diferencia
                                </Button>
                            )}
                        </div>

                        <Collapsible>
                            <CollapsibleTrigger className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
                                <History className="h-3.5 w-3.5" /> Historial ({envio.seguimientos.length}) <ChevronDown className="h-3.5 w-3.5" />
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <ol className="mt-3 space-y-2 border-l pl-4">
                                    {envio.seguimientos.map((seguimiento, indice) => (
                                        <li key={indice} className="text-xs">
                                            <span className="font-semibold">{(ESTADOS[seguimiento.estado] ?? ESTADOS.anulado).etiqueta}</span>
                                            <span className="text-muted-foreground">
                                                {' '}
                                                · {seguimiento.usuario ?? '—'} · {formatearFecha(seguimiento.fecha)}
                                            </span>
                                            {seguimiento.observaciones && <p className="text-muted-foreground">{seguimiento.observaciones}</p>}
                                        </li>
                                    ))}
                                </ol>
                            </CollapsibleContent>
                        </Collapsible>
                    </article>
                );
            })}

            <Dialog open={accion !== null} onOpenChange={(abierto) => !abierto && cerrar()}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {accion?.tipo === 'confirmar' ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : accion?.tipo === 'resolver' ? (
                                <ShieldCheck className="h-5 w-5" />
                            ) : (
                                <Undo2 className="h-5 w-5 text-red-500" />
                            )}
                            {textos?.titulo} {accion && `#${accion.envio.id}`}
                        </DialogTitle>
                        <DialogDescription>{textos?.descripcion}</DialogDescription>
                    </DialogHeader>

                    {accion?.tipo === 'confirmar' && (
                        <div className="space-y-2">
                            <Label htmlFor="monto_recibido" className="font-semibold">
                                Cantidad recibida ({accion.envio.moneda})
                            </Label>
                            <Input
                                id="monto_recibido"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={accion.envio.monto}
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                                className="h-14 text-2xl font-black tabular-nums"
                            />
                            <p className="text-muted-foreground text-xs">
                                Se enviaron {formatear(accion.envio.monto)} {accion.envio.moneda}.
                                {parseFloat(monto) > 0 && parseFloat(monto) < accion.envio.monto && (
                                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                                        {' '}
                                        Faltan {formatear(accion.envio.monto - parseFloat(monto))}: quedará como diferencia por resolver.
                                    </span>
                                )}
                            </p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="texto_accion" className="font-semibold">
                            {textos?.campo}
                        </Label>
                        <Textarea id="texto_accion" value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 255))} className="min-h-20" />
                    </div>

                    {error && (
                        <p role="alert" className="rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                            {error}
                        </p>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={cerrar} disabled={enviando}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={ejecutar}
                            disabled={
                                enviando || (textos?.obligatorio && texto.trim() === '') || (accion?.tipo === 'confirmar' && !(parseFloat(monto) > 0))
                            }
                            className="gap-1.5"
                        >
                            {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
                            {textos?.boton}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
