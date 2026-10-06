import {
    CampoConcepto,
    CampoMonto,
    CampoTitulo,
    claseBoton,
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
import { sileo } from '@/lib/sileo';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, Building2, Handshake, Loader2, Receipt, Shuffle, UserRound, Wallet } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const TIPOS: OpcionTipo<TipoEntidad>[] = [
    { valor: 'cuenta', titulo: 'Cuenta', descripcion: 'Una de las cuentas del sistema', icono: Wallet },
    { valor: 'cliente', titulo: 'Cliente', descripcion: 'Afecta la deuda o el pago del cliente', icono: UserRound },
    { valor: 'proveedor', titulo: 'Proveedor', descripcion: 'Afecta el saldo del proveedor', icono: Building2 },
];

const NOMBRE_TIPO: Record<TipoEntidad, string> = { cuenta: 'cuenta', cliente: 'cliente', proveedor: 'proveedor' };

const mayuscula = (texto: string) => `${texto.charAt(0).toUpperCase()}${texto.slice(1)}`;

/** La tasa implícita puede ser menor que 1 (por ejemplo, de CUP a USD): ahí hacen falta más decimales. */
const formatearTasa = (tasa: number) =>
    tasa >= 1 ? formatear(tasa) : tasa.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 6 });

export default function RemesaForm() {
    const [cuentas, setCuentas] = useState<CuentaEntidad[]>([]);
    const [clientes, setClientes] = useState<ClienteEntidad[]>([]);
    const [proveedores, setProveedores] = useState<ProveedorEntidad[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios
            .get(route('transacciones.remesa.data'))
            .then((res) => {
                setCuentas(res.data.cuentas);
                setClientes(res.data.clientes);
                setProveedores(res.data.proveedores);
            })
            .catch(() => sileo.error({ title: 'Error al cargar datos del formulario', description: 'Inténtalo nuevamente' }))
            .finally(() => setLoading(false));
    }, []);

    const { data, setData, post, processing, errors } = useForm({
        entrada_tipo: 'cuenta' as TipoEntidad,
        entrada_id: '',
        entrada_monto: '',
        salida_tipo: 'cuenta' as TipoEntidad,
        salida_id: '',
        salida_monto: '',
        mensajero_cuenta_id: '',
        mensajero_monto: '',
        notas: '',
    });

    if (loading) {
        return (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando cuentas...
            </div>
        );
    }

    const entidadesDe = (tipo: TipoEntidad): Entidad[] =>
        tipo === 'cuenta' ? cuentas.map(entidadDeCuenta) : tipo === 'cliente' ? clientes.map(entidadDeCliente) : proveedores.map(entidadDeProveedor);

    const entidadesEntrada = entidadesDe(data.entrada_tipo);
    const entrada = entidadesEntrada.find((e) => e.id === data.entrada_id) ?? null;
    // La entrada y la salida no pueden ser la misma entidad: la elegida arriba no se ofrece abajo
    const entidadesSalida = entidadesDe(data.salida_tipo).filter((e) => !(entrada && entrada.tipo === e.tipo && entrada.id === e.id));
    const salida = entidadesSalida.find((e) => e.id === data.salida_id) ?? null;
    const entidadesMensajero = cuentas.map(entidadDeCuenta);
    const mensajero = entidadesMensajero.find((e) => e.id === data.mensajero_cuenta_id) ?? null;

    const montoEntrada = parseFloat(data.entrada_monto) || 0;
    const montoSalida = parseFloat(data.salida_monto) || 0;
    const montoMensajero = parseFloat(data.mensajero_monto) || 0;

    const saldoEntradaDespues = entrada && entrada.saldo !== null ? entrada.saldo + montoEntrada : null;
    const saldoSalidaDespues = salida && salida.saldo !== null ? salida.saldo - montoSalida : null;
    const saldoMensajeroDespues = mensajero && mensajero.saldo !== null ? mensajero.saldo - montoMensajero : null;

    // El servidor no bloquea saldos negativos en cuentas: es un aviso, no un impedimento
    const quedaraNegativa =
        (salida?.tipo === 'cuenta' && saldoSalidaDespues !== null && montoSalida > 0 && saldoSalidaDespues < 0) ||
        (mensajero !== null && saldoMensajeroDespues !== null && montoMensajero > 0 && saldoMensajeroDespues < 0);

    // Referencia informativa: cuánto sale por cada unidad que entra cuando las monedas difieren. No cambia lo que se guarda.
    const tasaImplicita =
        entrada && salida && entrada.monedaCodigo !== salida.monedaCodigo && montoEntrada > 0 && montoSalida > 0 ? montoSalida / montoEntrada : null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('transacciones.remesa.store'), {
            onError: (err) => {
                sileo.error({ title: 'Error al registrar la Operación Múltiple', description: err.message || 'Inténtalo nuevamente' });
            },
        });
    };

    const completa = entrada && montoEntrada > 0 && salida && montoSalida > 0 && (!mensajero || montoMensajero > 0);

    return (
        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-8 lg:col-span-3">
                {/* ── Entrada ────────────────────────────────────────────── */}
                <section className="space-y-4" aria-labelledby="remesa-entrada">
                    <SeccionTitulo id="remesa-entrada" icono={ArrowDownToLine} acento="emerald">
                        Entrada: el dinero que entra
                    </SeccionTitulo>

                    <OpcionesTipo
                        opciones={TIPOS}
                        valor={data.entrada_tipo}
                        onChange={(tipo) => data.entrada_tipo !== tipo && setData({ ...data, entrada_tipo: tipo, entrada_id: '' })}
                        acento="emerald"
                        etiqueta="Tipo de entidad de la entrada"
                    />

                    <div className="space-y-2">
                        <CampoTitulo htmlFor="entrada_id">{`${mayuscula(NOMBRE_TIPO[data.entrada_tipo])} de entrada`}</CampoTitulo>
                        <SelectorEntidad
                            key={data.entrada_tipo}
                            id="entrada_id"
                            entidades={entidadesEntrada}
                            valor={data.entrada_id}
                            onChange={(entidad) => setData({ ...data, entrada_id: entidad?.id ?? '' })}
                            placeholder={`Buscar ${NOMBRE_TIPO[data.entrada_tipo]} de entrada...`}
                        />
                        {errors.entrada_id && <p className="text-sm text-red-500">{errors.entrada_id}</p>}
                    </div>

                    {entrada && <TarjetaEntidad entidad={entrada} acento="emerald" />}

                    <CampoMonto
                        id="entrada_monto"
                        titulo="Monto que entra"
                        valor={data.entrada_monto}
                        onChange={(valor) => setData({ ...data, entrada_monto: valor })}
                        moneda={entrada?.monedaCodigo ?? ''}
                        deshabilitado={!entrada}
                        error={errors.entrada_monto}
                        ayuda="Elige primero la entidad de entrada."
                    />
                </section>

                {/* ── Salida ─────────────────────────────────────────────── */}
                <section className="space-y-4" aria-labelledby="remesa-salida">
                    <SeccionTitulo id="remesa-salida" icono={ArrowUpFromLine} acento="rose">
                        Salida: el dinero que sale
                    </SeccionTitulo>

                    <OpcionesTipo
                        opciones={TIPOS}
                        valor={data.salida_tipo}
                        onChange={(tipo) => data.salida_tipo !== tipo && setData({ ...data, salida_tipo: tipo, salida_id: '' })}
                        acento="rose"
                        etiqueta="Tipo de entidad de la salida"
                    />

                    <div className="space-y-2">
                        <CampoTitulo htmlFor="salida_id">{`${mayuscula(NOMBRE_TIPO[data.salida_tipo])} de salida`}</CampoTitulo>
                        <SelectorEntidad
                            key={data.salida_tipo}
                            id="salida_id"
                            entidades={entidadesSalida}
                            valor={data.salida_id}
                            onChange={(entidad) => setData({ ...data, salida_id: entidad?.id ?? '' })}
                            placeholder={`Buscar ${NOMBRE_TIPO[data.salida_tipo]} de salida...`}
                        />
                        {errors.salida_id && <p className="text-sm text-red-500">{errors.salida_id}</p>}
                    </div>

                    {salida && <TarjetaEntidad entidad={salida} acento="rose" />}

                    <CampoMonto
                        id="salida_monto"
                        titulo="Monto que sale"
                        valor={data.salida_monto}
                        onChange={(valor) => setData({ ...data, salida_monto: valor })}
                        moneda={salida?.monedaCodigo ?? ''}
                        deshabilitado={!salida}
                        error={errors.salida_monto}
                        ayuda="Elige primero la entidad de salida."
                    />
                </section>

                {/* ── Mensajero ──────────────────────────────────────────── */}
                <section className="space-y-4" aria-labelledby="remesa-mensajero">
                    <SeccionTitulo id="remesa-mensajero" icono={Handshake} acento="blue">
                        Mensajero <span className="text-muted-foreground text-base font-normal">(opcional)</span>
                    </SeccionTitulo>

                    <div className="space-y-2">
                        <CampoTitulo htmlFor="mensajero_cuenta_id">Cuenta del mensajero</CampoTitulo>
                        <SelectorEntidad
                            id="mensajero_cuenta_id"
                            entidades={entidadesMensajero}
                            valor={data.mensajero_cuenta_id}
                            onChange={(entidad) =>
                                setData({ ...data, mensajero_cuenta_id: entidad?.id ?? '', mensajero_monto: entidad ? data.mensajero_monto : '' })
                            }
                            placeholder="Buscar la cuenta del mensajero..."
                        />
                        {errors.mensajero_cuenta_id && <p className="text-sm text-red-500">{errors.mensajero_cuenta_id}</p>}
                    </div>

                    {mensajero && <TarjetaEntidad entidad={mensajero} acento="blue" />}

                    <CampoMonto
                        id="mensajero_monto"
                        titulo="Monto para el mensajero"
                        valor={data.mensajero_monto}
                        onChange={(valor) => setData({ ...data, mensajero_monto: valor })}
                        moneda={mensajero?.monedaCodigo ?? ''}
                        deshabilitado={!mensajero}
                        error={errors.mensajero_monto}
                        ayuda="Elige primero la cuenta del mensajero, si hay comisión que pagar."
                    />
                </section>

                <CampoConcepto
                    id="notas"
                    titulo="Notas"
                    max={500}
                    valor={data.notas}
                    onChange={(notas) => setData({ ...data, notas })}
                    error={errors.notas}
                    placeholder="Notas sobre la operación (opcional)"
                />
            </div>

            <aside className="lg:col-span-2">
                <ResumenCard acento="violet" titulo="Resumen de la operación" icono={Receipt}>
                    <ResumenDato titulo="Entrada">
                        <p className="truncate text-sm font-semibold">{entrada ? entrada.nombre : 'Sin elegir'}</p>
                        <p className="text-3xl font-black text-emerald-600 tabular-nums dark:text-emerald-400">
                            {entrada && montoEntrada > 0 ? `+ ${entrada.simbolo} ${formatear(montoEntrada)}` : '—'}
                        </p>
                    </ResumenDato>

                    <ResumenDato titulo="Salida">
                        <p className="truncate text-sm font-semibold">{salida ? salida.nombre : 'Sin elegir'}</p>
                        <p className="text-3xl font-black text-rose-600 tabular-nums dark:text-rose-400">
                            {salida && montoSalida > 0 ? `− ${salida.simbolo} ${formatear(montoSalida)}` : '—'}
                        </p>
                    </ResumenDato>

                    {mensajero && (
                        <ResumenDato titulo="Mensajero">
                            <p className="truncate text-sm font-semibold">{mensajero.nombre}</p>
                            <p className="text-2xl font-black text-blue-600 tabular-nums dark:text-blue-400">
                                {montoMensajero > 0 ? `− ${mensajero.simbolo} ${formatear(montoMensajero)}` : '—'}
                            </p>
                        </ResumenDato>
                    )}

                    {tasaImplicita !== null && entrada && salida && (
                        <ResumenDato titulo="Tasa implícita" separado>
                            <p className="text-lg font-bold tabular-nums">
                                1 {entrada.monedaCodigo} = {formatearTasa(tasaImplicita)} {salida.monedaCodigo}
                            </p>
                            <p className="text-muted-foreground text-xs">Solo de referencia, sale de los dos montos: no cambia lo que se guarda.</p>
                        </ResumenDato>
                    )}

                    {(saldoEntradaDespues !== null || saldoSalidaDespues !== null || saldoMensajeroDespues !== null) && (
                        <ResumenDato titulo="Saldos después" separado>
                            <div className="space-y-2 text-sm">
                                {entrada && saldoEntradaDespues !== null && (
                                    <p className="flex items-baseline justify-between gap-3">
                                        <span className="text-muted-foreground min-w-0 truncate">
                                            {entrada.nombre} ({etiquetaSaldoDe(entrada.tipo).toLowerCase()})
                                        </span>
                                        <span className="shrink-0 text-lg font-bold tabular-nums">
                                            {entrada.simbolo} {formatear(saldoEntradaDespues)}
                                        </span>
                                    </p>
                                )}
                                {salida && saldoSalidaDespues !== null && (
                                    <p className="flex items-baseline justify-between gap-3">
                                        <span className="text-muted-foreground min-w-0 truncate">
                                            {salida.nombre} ({etiquetaSaldoDe(salida.tipo).toLowerCase()})
                                        </span>
                                        <span
                                            className={cn(
                                                'shrink-0 text-lg font-bold tabular-nums',
                                                salida.tipo === 'cuenta' && saldoSalidaDespues < 0 && 'text-red-600 dark:text-red-400',
                                            )}
                                        >
                                            {salida.simbolo} {formatear(saldoSalidaDespues)}
                                        </span>
                                    </p>
                                )}
                                {mensajero && saldoMensajeroDespues !== null && (
                                    <p className="flex items-baseline justify-between gap-3">
                                        <span className="text-muted-foreground min-w-0 truncate">{mensajero.nombre} (saldo)</span>
                                        <span
                                            className={cn(
                                                'shrink-0 text-lg font-bold tabular-nums',
                                                saldoMensajeroDespues < 0 && 'text-red-600 dark:text-red-400',
                                            )}
                                        >
                                            {mensajero.simbolo} {formatear(saldoMensajeroDespues)}
                                        </span>
                                    </p>
                                )}
                            </div>
                            {quedaraNegativa && (
                                <Badge className="mt-2 gap-1 border-0 bg-gradient-to-r from-amber-500 to-red-600 px-3 py-1 text-white shadow-md shadow-red-500/30">
                                    <AlertTriangle className="h-3.5 w-3.5" /> Alguna cuenta quedará en negativo
                                </Badge>
                            )}
                        </ResumenDato>
                    )}

                    {errors.message && (
                        <p role="alert" className="rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                            {errors.message}
                        </p>
                    )}

                    <Button
                        type="submit"
                        disabled={processing || !completa}
                        className={cn('h-12 w-full gap-2 text-base font-bold text-white shadow-md', claseBoton('violet'))}
                    >
                        <Shuffle className="h-5 w-5" />
                        {processing ? 'Procesando...' : 'Registrar Operación Múltiple'}
                    </Button>
                </ResumenCard>
            </aside>
        </form>
    );
}
