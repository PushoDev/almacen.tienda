import {
    CampoConcepto,
    CampoMonto,
    CampoTitulo,
    claseBoton,
    claseCifra,
    type ClienteEntidad,
    type CuentaEntidad,
    entidadDeCliente,
    entidadDeCuenta,
    etiquetaSaldoDe,
    formatear,
    OpcionesTipo,
    type OpcionTipo,
    ResumenCard,
    ResumenDato,
    SeccionTitulo,
    SelectorEntidad,
    TarjetaEntidad,
} from '@/components/transacciones/entidad';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { sileo } from '@/lib/sileo';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import { AlertTriangle, ArrowDownCircle, FileText, Receipt, UserRound, Wallet } from 'lucide-react';
import React from 'react';

interface Props {
    cuentasOrigen: CuentaEntidad[];
    clientes: ClienteEntidad[];
    /** El vendedor no tiene acceso a los clientes en Gastos: solo gasta desde sus cuentas. */
    puedeUsarClientes: boolean;
}

type TipoOrigen = 'cuenta' | 'cliente';

const TIPOS_ORIGEN: OpcionTipo<TipoOrigen>[] = [
    { valor: 'cuenta', titulo: 'Cuenta', descripcion: 'El dinero sale de una de tus cuentas', icono: Wallet },
    { valor: 'cliente', titulo: 'Cliente', descripcion: 'Afecta la deuda o el pago del cliente', icono: UserRound },
];

export default function GastoForm({ cuentasOrigen, clientes, puedeUsarClientes }: Props) {
    const tiposOrigen = puedeUsarClientes ? TIPOS_ORIGEN : TIPOS_ORIGEN.filter((tipo) => tipo.valor === 'cuenta');

    const { data, setData, post, processing, errors } = useForm({
        origen_tipo: 'cuenta' as TipoOrigen,
        origen_id: '',
        monto: '',
        moneda: '',
        comentario: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('transacciones.gastar'), {
            onError: (err) => {
                sileo.error({ title: 'Error al registrar el gasto', description: err.message || 'Inténtalo nuevamente' });
            },
        });
    };

    const entidades = data.origen_tipo === 'cuenta' ? cuentasOrigen.map(entidadDeCuenta) : clientes.map(entidadDeCliente);
    const seleccionada = entidades.find((e) => e.id === data.origen_id) ?? null;

    const monto = parseFloat(data.monto) || 0;
    const saldoDespues = seleccionada && seleccionada.saldo !== null ? seleccionada.saldo - monto : null;
    // El servidor no bloquea un gasto que deje la cuenta en negativo (las cuentas admiten saldo negativo),
    // así que esto es un aviso, no un impedimento.
    const quedaraNegativo = data.origen_tipo === 'cuenta' && saldoDespues !== null && monto > 0 && saldoDespues < 0;
    const etiquetaSaldo = etiquetaSaldoDe(data.origen_tipo);

    return (
        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-8 lg:col-span-3">
                <section className="space-y-4" aria-labelledby="gasto-origen">
                    <SeccionTitulo id="gasto-origen" icono={Wallet} acento="rose">
                        ¿De dónde sale el gasto?
                    </SeccionTitulo>

                    {/* Con una sola opción (el vendedor solo gasta desde cuentas) no hay nada que elegir */}
                    {tiposOrigen.length > 1 && (
                        <OpcionesTipo
                            opciones={tiposOrigen}
                            valor={data.origen_tipo}
                            onChange={(tipo) => data.origen_tipo !== tipo && setData({ ...data, origen_tipo: tipo, origen_id: '', moneda: '' })}
                            acento="rose"
                            etiqueta="Tipo de origen del gasto"
                        />
                    )}

                    <div className="space-y-2">
                        <CampoTitulo htmlFor="origen_id">{data.origen_tipo === 'cuenta' ? 'Cuenta de origen' : 'Cliente de origen'}</CampoTitulo>
                        <SelectorEntidad
                            key={data.origen_tipo}
                            id="origen_id"
                            entidades={entidades}
                            valor={data.origen_id}
                            onChange={(entidad) => setData({ ...data, origen_id: entidad?.id ?? '', moneda: entidad?.monedaCodigo ?? '' })}
                            placeholder={`Buscar ${data.origen_tipo === 'cuenta' ? 'cuenta' : 'cliente'}...`}
                        />
                        {errors.origen_id && <p className="text-sm text-red-500">{errors.origen_id}</p>}
                        {errors.moneda && <p className="text-sm text-red-500">{errors.moneda}</p>}
                    </div>

                    {seleccionada && <TarjetaEntidad entidad={seleccionada} acento="rose" />}
                </section>

                <section className="space-y-4" aria-labelledby="gasto-detalle">
                    <SeccionTitulo id="gasto-detalle" icono={FileText} acento="rose">
                        Detalle del gasto
                    </SeccionTitulo>

                    <CampoMonto
                        valor={data.monto}
                        onChange={(monto) => setData({ ...data, monto })}
                        moneda={data.moneda}
                        deshabilitado={!seleccionada}
                        error={errors.monto}
                        ayuda="Elige primero de dónde sale el gasto."
                    />

                    <CampoConcepto
                        valor={data.comentario}
                        onChange={(comentario) => setData({ ...data, comentario })}
                        error={errors.comentario}
                        placeholder="¿En qué se gastó? Ej: compra de combustible"
                    />
                </section>
            </div>

            <aside className="lg:col-span-2">
                <ResumenCard acento="rose" titulo="Resumen" icono={Receipt}>
                    <ResumenDato titulo="Origen">
                        <p className="truncate text-base font-semibold">{seleccionada ? seleccionada.nombre : 'Sin elegir'}</p>
                    </ResumenDato>

                    <ResumenDato titulo="Se gasta">
                        <p className={cn('text-3xl font-black tabular-nums', claseCifra('rose'))}>
                            {monto > 0 && seleccionada ? `− ${seleccionada.simbolo} ${formatear(monto)}` : '—'}
                        </p>
                    </ResumenDato>

                    <ResumenDato titulo={`${etiquetaSaldo} después del gasto`} separado>
                        <p className={cn('text-3xl font-black tabular-nums', quedaraNegativo ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                            {saldoDespues !== null && seleccionada ? `${seleccionada.simbolo} ${formatear(saldoDespues)}` : '—'}
                        </p>
                        {quedaraNegativo && (
                            <Badge className="mt-1 gap-1 border-0 bg-gradient-to-r from-amber-500 to-red-600 px-3 py-1 text-white shadow-md shadow-red-500/30">
                                <AlertTriangle className="h-3.5 w-3.5" /> La cuenta quedará en negativo
                            </Badge>
                        )}
                    </ResumenDato>

                    {errors.message && (
                        <p role="alert" className="rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                            {errors.message}
                        </p>
                    )}

                    <Button
                        type="submit"
                        disabled={processing || !data.origen_id || !data.monto || monto <= 0}
                        className={cn('h-12 w-full gap-2 text-base font-bold text-white shadow-md', claseBoton('rose'))}
                    >
                        <ArrowDownCircle className="h-5 w-5" />
                        {processing ? 'Procesando...' : 'Registrar gasto'}
                    </Button>
                </ResumenCard>
            </aside>
        </form>
    );
}
