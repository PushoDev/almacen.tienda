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
import { Button } from '@/components/ui/button';
import { sileo } from '@/lib/sileo';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import { ArrowUpCircle, Building2, FileText, Loader2, Receipt, UserRound, Wallet } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const TIPOS_DESTINO: OpcionTipo<TipoEntidad>[] = [
    { valor: 'cuenta', titulo: 'Cuenta', descripcion: 'El dinero entra a una de tus cuentas', icono: Wallet },
    { valor: 'cliente', titulo: 'Cliente', descripcion: 'Afecta la deuda o el pago del cliente', icono: UserRound },
    { valor: 'proveedor', titulo: 'Proveedor', descripcion: 'Suma al saldo del proveedor', icono: Building2 },
];

const NOMBRE_TIPO: Record<TipoEntidad, string> = { cuenta: 'cuenta', cliente: 'cliente', proveedor: 'proveedor' };

export default function IngresoForm({ soloCuentas }: { soloCuentas: boolean }) {
    // El vendedor no tiene acceso a clientes ni a proveedores en Ingresos: solo ingresa a cuentas
    const tiposDestino = soloCuentas ? TIPOS_DESTINO.filter((tipo) => tipo.valor === 'cuenta') : TIPOS_DESTINO;

    const [cuentasDestino, setCuentasDestino] = useState<CuentaEntidad[]>([]);
    const [clientes, setClientes] = useState<ClienteEntidad[]>([]);
    const [proveedores, setProveedores] = useState<ProveedorEntidad[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios
            .get(route('transacciones.ingreso.data'))
            .then((res) => {
                setCuentasDestino(res.data.cuentasDestino);
                setClientes(res.data.clientes);
                setProveedores(res.data.proveedores);
            })
            .catch(() => sileo.error({ title: 'Error al cargar datos del formulario', description: 'Inténtalo nuevamente' }))
            .finally(() => setLoading(false));
    }, []);

    const { data, setData, post, processing, errors } = useForm({
        destino_tipo: 'cuenta' as TipoEntidad,
        destino_id: '',
        monto: '',
        moneda: '',
        comentario: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('transacciones.ingresar'), {
            onError: (err) => {
                sileo.error({ title: 'Error al registrar el ingreso', description: err.message || 'Inténtalo nuevamente' });
            },
        });
    };

    if (loading) {
        return (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando cuentas...
            </div>
        );
    }

    const entidades =
        data.destino_tipo === 'cuenta'
            ? cuentasDestino.map(entidadDeCuenta)
            : data.destino_tipo === 'cliente'
              ? clientes.map(entidadDeCliente)
              : proveedores.map(entidadDeProveedor);
    const seleccionada = entidades.find((e) => e.id === data.destino_id) ?? null;

    const monto = parseFloat(data.monto) || 0;
    const saldoDespues = seleccionada && seleccionada.saldo !== null ? seleccionada.saldo + monto : null;
    const nombreTipo = NOMBRE_TIPO[data.destino_tipo];

    return (
        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-8 lg:col-span-3">
                <section className="space-y-4" aria-labelledby="ingreso-destino">
                    <SeccionTitulo id="ingreso-destino" icono={Wallet} acento="emerald">
                        ¿A dónde entra el ingreso?
                    </SeccionTitulo>

                    {/* Con una sola opción (el vendedor solo ingresa a cuentas) no hay nada que elegir */}
                    {tiposDestino.length > 1 && (
                        <OpcionesTipo
                            opciones={tiposDestino}
                            valor={data.destino_tipo}
                            onChange={(tipo) => data.destino_tipo !== tipo && setData({ ...data, destino_tipo: tipo, destino_id: '', moneda: '' })}
                            acento="emerald"
                            etiqueta="Tipo de destino del ingreso"
                        />
                    )}

                    <div className="space-y-2">
                        <CampoTitulo htmlFor="destino_id">{`${nombreTipo.charAt(0).toUpperCase()}${nombreTipo.slice(1)} de destino`}</CampoTitulo>
                        <SelectorEntidad
                            key={data.destino_tipo}
                            id="destino_id"
                            entidades={entidades}
                            valor={data.destino_id}
                            onChange={(entidad) => setData({ ...data, destino_id: entidad?.id ?? '', moneda: entidad?.monedaCodigo ?? '' })}
                            placeholder={`Buscar ${nombreTipo}...`}
                        />
                        {errors.destino_id && <p className="text-sm text-red-500">{errors.destino_id}</p>}
                        {errors.moneda && <p className="text-sm text-red-500">{errors.moneda}</p>}
                    </div>

                    {seleccionada && <TarjetaEntidad entidad={seleccionada} acento="emerald" />}
                </section>

                <section className="space-y-4" aria-labelledby="ingreso-detalle">
                    <SeccionTitulo id="ingreso-detalle" icono={FileText} acento="emerald">
                        Detalle del ingreso
                    </SeccionTitulo>

                    <CampoMonto
                        valor={data.monto}
                        onChange={(monto) => setData({ ...data, monto })}
                        moneda={data.moneda}
                        deshabilitado={!seleccionada}
                        error={errors.monto}
                        ayuda="Elige primero a dónde entra el ingreso."
                    />

                    <CampoConcepto
                        valor={data.comentario}
                        onChange={(comentario) => setData({ ...data, comentario })}
                        error={errors.comentario}
                        placeholder="¿De dónde viene? Ej: cobro de una venta"
                    />
                </section>
            </div>

            <aside className="lg:col-span-2">
                <ResumenCard acento="emerald" titulo="Resumen" icono={Receipt}>
                    <ResumenDato titulo="Destino">
                        <p className="truncate text-base font-semibold">{seleccionada ? seleccionada.nombre : 'Sin elegir'}</p>
                    </ResumenDato>

                    <ResumenDato titulo="Ingresa">
                        <p className={cn('text-3xl font-black tabular-nums', claseCifra('emerald'))}>
                            {monto > 0 && seleccionada ? `+ ${seleccionada.simbolo} ${formatear(monto)}` : '—'}
                        </p>
                    </ResumenDato>

                    <ResumenDato titulo={`${etiquetaSaldoDe(data.destino_tipo)} después del ingreso`} separado>
                        <p className="text-foreground text-3xl font-black tabular-nums">
                            {saldoDespues !== null && seleccionada ? `${seleccionada.simbolo} ${formatear(saldoDespues)}` : '—'}
                        </p>
                    </ResumenDato>

                    {errors.message && (
                        <p role="alert" className="rounded-md border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
                            {errors.message}
                        </p>
                    )}

                    <Button
                        type="submit"
                        disabled={processing || !data.destino_id || !data.monto || monto <= 0}
                        className={cn('h-12 w-full gap-2 text-base font-bold text-white shadow-md', claseBoton('emerald'))}
                    >
                        <ArrowUpCircle className="h-5 w-5" />
                        {processing ? 'Procesando...' : 'Registrar ingreso'}
                    </Button>
                </ResumenCard>
            </aside>
        </form>
    );
}
