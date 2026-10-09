import {
    CampoConcepto,
    CampoMonto,
    CampoTitulo,
    claseBoton,
    claseCifra,
    type ClienteEntidad,
    type CuentaEntidad,
    type Entidad,
    entidadDeCliente,
    entidadDeCuenta,
    entidadDeProveedor,
    etiquetaSaldoDe,
    formatear,
    OpcionesTipo,
    type OpcionTipo,
    type ProveedorEntidad,
    ResumenCard,
    ResumenDato,
    SeccionTitulo,
    SelectorEntidad,
    TarjetaEntidad,
    type TipoEntidad,
} from '@/components/transacciones/entidad';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sileo } from '@/lib/sileo';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowDownToLine,
    ArrowLeftRight,
    ArrowRight,
    ArrowUpFromLine,
    Building2,
    Clock,
    FileText,
    Loader2,
    Receipt,
    UserRound,
    Wallet,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface MonedaActiva {
    codigo_moneda: string;
    tasa_cambio: number | string;
}

type TipoOrigen = 'cuenta' | 'cliente';

const TIPOS_ORIGEN: OpcionTipo<TipoOrigen>[] = [
    { valor: 'cuenta', titulo: 'Cuenta', descripcion: 'Sale de una de tus cuentas', icono: Wallet },
    { valor: 'cliente', titulo: 'Cliente', descripcion: 'Afecta la deuda o el pago del cliente', icono: UserRound },
];

const TIPOS_DESTINO: OpcionTipo<TipoEntidad>[] = [
    { valor: 'cuenta', titulo: 'Cuenta', descripcion: 'Entra a una cuenta', icono: Wallet },
    { valor: 'cliente', titulo: 'Cliente', descripcion: 'Afecta la deuda o el pago del cliente', icono: UserRound },
    { valor: 'proveedor', titulo: 'Proveedor', descripcion: 'Suma al saldo del proveedor', icono: Building2 },
];

const NOMBRE_TIPO: Record<TipoEntidad, string> = { cuenta: 'cuenta', cliente: 'cliente', proveedor: 'proveedor' };

interface Conversion {
    huboConversion: boolean;
    montoDestino: number;
    /** La moneda que no es USD en la operación: la tasa se expresa como 1 USD = X de esta moneda. */
    monedaTasa: string;
    tasaOficial: number;
    tasaAplicada: number;
    esManual: boolean;
}

/**
 * Misma cuenta que hace TransferenciaController::calcularMontoConvertido(): el servidor es quien manda,
 * esto es solo la vista previa. Una cuenta no-USD usa su tasa como "1 USD = X"; cliente y proveedor valen USD.
 */
function calcularConversion(origen: Entidad, destino: Entidad, monto: number, tasaManual: number | null, monedas: MonedaActiva[]): Conversion {
    const tasaDe = (codigo: string) => Number(monedas.find((m) => m.codigo_moneda === codigo)?.tasa_cambio) || 1;
    const origenEsCuenta = origen.tipo === 'cuenta';
    const destinoEsCuenta = destino.tipo === 'cuenta';
    const origenEsNoUsd = origenEsCuenta && origen.monedaCodigo !== 'USD';
    const monedaTasa = origenEsNoUsd ? origen.monedaCodigo : destino.monedaCodigo;
    const tasaOficial = tasaDe(monedaTasa);

    const sinConversion = origen.monedaCodigo === destino.monedaCodigo || (!origenEsCuenta && !destinoEsCuenta);
    if (sinConversion) {
        return { huboConversion: false, montoDestino: monto, monedaTasa, tasaOficial, tasaAplicada: tasaOficial, esManual: false };
    }

    const convertir = (manual: number | null) => {
        let tasaOrigen = origenEsCuenta ? tasaDe(origen.monedaCodigo) : 1;
        let tasaDestino = destinoEsCuenta ? tasaDe(destino.monedaCodigo) : 1;
        if (manual && manual > 0) {
            if (origenEsNoUsd) {
                tasaOrigen = manual;
            } else {
                tasaDestino = manual;
            }
        }

        return Math.round((monto / tasaOrigen) * tasaDestino * 100) / 100;
    };

    const esManual = !!tasaManual && tasaManual > 0;

    return {
        huboConversion: true,
        montoDestino: convertir(tasaManual),
        monedaTasa,
        tasaOficial,
        tasaAplicada: esManual ? (tasaManual as number) : tasaOficial,
        esManual,
    };
}

export default function TransferenciaForm({ soloCuentas }: { soloCuentas: boolean }) {
    // El vendedor transfiere solo entre cuentas: sin clientes ni proveedores, ni de origen ni de destino
    const tiposOrigen = soloCuentas ? TIPOS_ORIGEN.filter((tipo) => tipo.valor === 'cuenta') : TIPOS_ORIGEN;
    const tiposDestino = soloCuentas ? TIPOS_DESTINO.filter((tipo) => tipo.valor === 'cuenta') : TIPOS_DESTINO;

    const [cuentasOrigen, setCuentasOrigen] = useState<CuentaEntidad[]>([]);
    const [cuentasDestino, setCuentasDestino] = useState<CuentaEntidad[]>([]);
    const [clientes, setClientes] = useState<ClienteEntidad[]>([]);
    const [proveedores, setProveedores] = useState<ProveedorEntidad[]>([]);
    const [monedasActivas, setMonedasActivas] = useState<MonedaActiva[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios
            .get(route('transacciones.transferencia.data'))
            .then((res) => {
                setCuentasOrigen(res.data.cuentasOrigen);
                setCuentasDestino(res.data.cuentasDestino);
                setClientes(res.data.clientes);
                setProveedores(res.data.proveedores);
                setMonedasActivas(res.data.monedasActivas);
            })
            .catch(() => sileo.error({ title: 'Error al cargar datos del formulario', description: 'Inténtalo nuevamente' }))
            .finally(() => setLoading(false));
    }, []);

    const { data, setData, post, processing, errors } = useForm({
        origen_tipo: 'cuenta' as TipoOrigen,
        origen_id: '',
        destino_tipo: 'cuenta' as TipoEntidad,
        destino_id: '',
        monto: '',
        moneda: '',
        comentario: '',
        // Vacía = el servidor aplica la tasa oficial vigente en el momento de registrar. Solo se envía si
        // alguien la escribe a mano (por ejemplo, tras confirmarla por teléfono).
        tasa_cambio_aplicada: '',
    });

    if (loading) {
        return (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando cuentas...
            </div>
        );
    }

    const entidadesOrigen = data.origen_tipo === 'cuenta' ? cuentasOrigen.map(entidadDeCuenta) : clientes.map(entidadDeCliente);
    const origen = entidadesOrigen.find((e) => e.id === data.origen_id) ?? null;

    const entidadesDestino = (
        data.destino_tipo === 'cuenta'
            ? cuentasDestino.map(entidadDeCuenta)
            : data.destino_tipo === 'cliente'
              ? clientes.map(entidadDeCliente)
              : proveedores.map(entidadDeProveedor)
    ).filter((e) => !(origen && origen.tipo === e.tipo && origen.id === e.id));
    const destino = entidadesDestino.find((e) => e.id === data.destino_id) ?? null;

    const monto = parseFloat(data.monto) || 0;
    const tasaManual = parseFloat(data.tasa_cambio_aplicada) || null;
    const conversion = origen && destino ? calcularConversion(origen, destino, monto, tasaManual, monedasActivas) : null;
    const montoDestino = conversion?.montoDestino ?? monto;

    const saldoOrigenDespues = origen && origen.saldo !== null ? origen.saldo - monto : null;
    // Para todos los roles, lo que viaja es el efectivo: de una cuenta de efectivo a otra de efectivo el dinero sale
    // del origen y espera a que el destino (o admin/moderador) confirme cuánto llegó. Con una tarjeta de por medio
    // es inmediato. Mismo criterio que el servidor.
    const quedaPendiente =
        origen?.tipo === 'cuenta' && destino?.tipo === 'cuenta' && origen.tipoCuenta === 'efectivo' && destino.tipoCuenta === 'efectivo';
    const saldoDestinoDespues = !quedaPendiente && destino && destino.saldo !== null ? destino.saldo + montoDestino : null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('transacciones.transferir'), {
            onError: (err) => {
                sileo.error({ title: 'Error al realizar la transferencia', description: err.message || err.destino_id || 'Inténtalo nuevamente' });
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-8 lg:col-span-3">
                {/* ── Origen ─────────────────────────────────────────────── */}
                <section className="space-y-4" aria-labelledby="transferencia-origen">
                    <SeccionTitulo id="transferencia-origen" icono={ArrowUpFromLine} acento="blue">
                        ¿De dónde sale el dinero?
                    </SeccionTitulo>

                    {/* Con una sola opción (el vendedor solo transfiere entre cuentas) no hay nada que elegir */}
                    {tiposOrigen.length > 1 && (
                        <OpcionesTipo
                            opciones={tiposOrigen}
                            valor={data.origen_tipo}
                            onChange={(tipo) =>
                                data.origen_tipo !== tipo &&
                                setData({ ...data, origen_tipo: tipo, origen_id: '', moneda: '', tasa_cambio_aplicada: '' })
                            }
                            acento="blue"
                            etiqueta="Tipo de origen de la transferencia"
                        />
                    )}

                    <div className="space-y-2">
                        <CampoTitulo htmlFor="origen_id">{data.origen_tipo === 'cuenta' ? 'Cuenta de origen' : 'Cliente de origen'}</CampoTitulo>
                        <SelectorEntidad
                            key={data.origen_tipo}
                            id="origen_id"
                            entidades={entidadesOrigen}
                            valor={data.origen_id}
                            onChange={(entidad) =>
                                setData({ ...data, origen_id: entidad?.id ?? '', moneda: entidad?.monedaCodigo ?? '', tasa_cambio_aplicada: '' })
                            }
                            placeholder={`Buscar ${data.origen_tipo === 'cuenta' ? 'cuenta' : 'cliente'} de origen...`}
                        />
                        {errors.origen_id && <p className="text-sm text-red-500">{errors.origen_id}</p>}
                        {errors.moneda && <p className="text-sm text-red-500">{errors.moneda}</p>}
                    </div>

                    {origen && <TarjetaEntidad entidad={origen} acento="blue" />}
                </section>

                {/* ── Destino ────────────────────────────────────────────── */}
                <section className="space-y-4" aria-labelledby="transferencia-destino">
                    <SeccionTitulo id="transferencia-destino" icono={ArrowDownToLine} acento="blue">
                        ¿A dónde llega?
                    </SeccionTitulo>

                    {tiposDestino.length > 1 && (
                        <OpcionesTipo
                            opciones={tiposDestino}
                            valor={data.destino_tipo}
                            onChange={(tipo) =>
                                data.destino_tipo !== tipo && setData({ ...data, destino_tipo: tipo, destino_id: '', tasa_cambio_aplicada: '' })
                            }
                            acento="blue"
                            etiqueta="Tipo de destino de la transferencia"
                        />
                    )}

                    <div className="space-y-2">
                        <CampoTitulo htmlFor="destino_id">{`${NOMBRE_TIPO[data.destino_tipo].charAt(0).toUpperCase()}${NOMBRE_TIPO[data.destino_tipo].slice(1)} de destino`}</CampoTitulo>
                        <SelectorEntidad
                            key={data.destino_tipo}
                            id="destino_id"
                            entidades={entidadesDestino}
                            valor={data.destino_id}
                            onChange={(entidad) => setData({ ...data, destino_id: entidad?.id ?? '', tasa_cambio_aplicada: '' })}
                            placeholder={`Buscar ${NOMBRE_TIPO[data.destino_tipo]} de destino...`}
                        />
                        {errors.destino_id && <p className="text-sm text-red-500">{errors.destino_id}</p>}
                    </div>

                    {destino && <TarjetaEntidad entidad={destino} acento="blue" />}
                </section>

                {/* ── Monto ──────────────────────────────────────────────── */}
                <section className="space-y-4" aria-labelledby="transferencia-detalle">
                    <SeccionTitulo id="transferencia-detalle" icono={FileText} acento="blue">
                        Monto y conversión
                    </SeccionTitulo>

                    <CampoMonto
                        valor={data.monto}
                        onChange={(valor) => setData({ ...data, monto: valor })}
                        moneda={data.moneda}
                        deshabilitado={!origen}
                        error={errors.monto}
                        ayuda="Elige primero de dónde sale el dinero."
                    />

                    {conversion?.huboConversion && (
                        <div className="space-y-2">
                            <CampoTitulo htmlFor="tasa_cambio">{`Tasa de cambio (1 USD = ? ${conversion.monedaTasa})`}</CampoTitulo>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    id="tasa_cambio"
                                    value={data.tasa_cambio_aplicada}
                                    onChange={(e) => setData({ ...data, tasa_cambio_aplicada: e.target.value })}
                                    step="0.01"
                                    min="0.01"
                                    placeholder={`Oficial: ${formatear(conversion.tasaOficial)}`}
                                    className="h-12 text-lg font-bold tabular-nums"
                                />
                                {data.tasa_cambio_aplicada && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-12 shrink-0"
                                        onClick={() => setData({ ...data, tasa_cambio_aplicada: '' })}
                                    >
                                        Usar la oficial
                                    </Button>
                                )}
                            </div>
                            <p className="text-muted-foreground text-xs">
                                Déjala vacía para usar la tasa oficial del momento. Escríbela solo si la confirmaste por otra vía.
                            </p>
                        </div>
                    )}

                    <CampoConcepto
                        valor={data.comentario}
                        onChange={(comentario) => setData({ ...data, comentario })}
                        error={errors.comentario}
                        placeholder="Motivo de la transferencia (opcional)"
                    />
                </section>
            </div>

            <aside className="lg:col-span-2">
                <ResumenCard acento="blue" titulo="Resumen" icono={Receipt}>
                    <ResumenDato titulo="Recorrido">
                        <p className="flex items-center gap-2 text-base font-semibold">
                            <span className="min-w-0 truncate">{origen ? origen.nombre : 'Origen'}</span>
                            <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0" />
                            <span className="min-w-0 truncate">{destino ? destino.nombre : 'Destino'}</span>
                        </p>
                    </ResumenDato>

                    <ResumenDato titulo="Sale">
                        <p className={cn('text-3xl font-black tabular-nums', claseCifra('blue'))}>
                            {monto > 0 && origen ? `− ${origen.simbolo} ${formatear(monto)}` : '—'}
                        </p>
                    </ResumenDato>

                    <ResumenDato titulo={quedaPendiente ? 'Llegará al confirmarse' : 'Llega'}>
                        <p className="text-3xl font-black text-emerald-600 tabular-nums dark:text-emerald-400">
                            {monto > 0 && destino ? `+ ${destino.simbolo} ${formatear(montoDestino)}` : '—'}
                        </p>
                        {conversion?.huboConversion && monto > 0 && (
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                                <span className="text-muted-foreground">
                                    1 USD = {formatear(conversion.tasaAplicada)} {conversion.monedaTasa}
                                </span>
                                {conversion.esManual && Math.abs(conversion.tasaAplicada - conversion.tasaOficial) > 0.001 && (
                                    <Badge className="border-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/30">
                                        Tasa manual · oficial {formatear(conversion.tasaOficial)}
                                    </Badge>
                                )}
                            </div>
                        )}
                    </ResumenDato>

                    {quedaPendiente && destino && (
                        <div role="status" className="space-y-1 rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 text-sm">
                            <p className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
                                <Clock className="h-4 w-4" /> Quedará pendiente de confirmación
                            </p>
                            <p className="text-muted-foreground text-xs">
                                Es efectivo de una cuenta de efectivo a otra
                                {destino.responsables && destino.responsables.length > 0 ? ` (${destino.responsables.join(', ')})` : ''}. El dinero
                                sale de la cuenta de origen ahora y se acredita cuando el destino confirme cuánto llegó. Puedes seguirlo en
                                Envíos de Dinero.
                            </p>
                        </div>
                    )}

                    {(saldoOrigenDespues !== null || saldoDestinoDespues !== null) && (
                        <ResumenDato titulo="Saldos después" separado>
                            <div className="space-y-2 text-sm">
                                {origen && saldoOrigenDespues !== null && (
                                    <p className="flex items-baseline justify-between gap-3">
                                        <span className="text-muted-foreground min-w-0 truncate">{origen.nombre}</span>
                                        <span
                                            className={cn(
                                                'shrink-0 text-lg font-bold tabular-nums',
                                                saldoOrigenDespues < 0 && 'text-red-600 dark:text-red-400',
                                            )}
                                        >
                                            {origen.simbolo} {formatear(saldoOrigenDespues)}
                                        </span>
                                    </p>
                                )}
                                {destino && saldoDestinoDespues !== null && (
                                    <p className="flex items-baseline justify-between gap-3">
                                        <span className="text-muted-foreground min-w-0 truncate">
                                            {destino.nombre} ({etiquetaSaldoDe(destino.tipo).toLowerCase()})
                                        </span>
                                        <span className="shrink-0 text-lg font-bold tabular-nums">
                                            {destino.simbolo} {formatear(saldoDestinoDespues)}
                                        </span>
                                    </p>
                                )}
                            </div>
                        </ResumenDato>
                    )}

                    {errors.message && (
                        <p role="alert" className="rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                            {errors.message}
                        </p>
                    )}

                    <Button
                        type="submit"
                        disabled={processing || !data.origen_id || !data.destino_id || monto <= 0}
                        className={cn('h-12 w-full gap-2 text-base font-bold text-white shadow-md', claseBoton('blue'))}
                    >
                        <ArrowLeftRight className="h-5 w-5" />
                        {processing ? 'Procesando...' : quedaPendiente ? 'Enviar y esperar confirmación' : 'Realizar transferencia'}
                    </Button>
                </ResumenCard>
            </aside>
        </form>
    );
}
