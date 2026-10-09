import { CreadoPor, MarcaInformativa } from '@/components/cierres/piezas';
import { type Banco, Insignia, type TipoEntidad } from '@/components/transacciones/entidad';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from '@inertiajs/react';
import { ArrowDown, ArrowRightLeft, ArrowUp, HandCoins, Search, Shuffle, TrendingUp, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';

export interface ItemMovimiento {
    id?: string;
    desc: string;
    monto: number;
    moneda?: string;
    moneda_imagen_url?: string | null;
    hora: string;
    origen?: string;
    destino?: string;
    /** Logo de la cuenta de la operación; null si no tiene uno asignado (y en cierres viejos). */
    banco?: Banco | null;
    usuario_nombre?: string;
    es_propio?: boolean;
    /** false = movimiento de un cliente: se lista pero no cambia la caja (solo informativo). */
    afecta_caja?: boolean;
    /** Quién atendió ("Atendido por"); null si la operación no tiene turno. */
    turno_nombre?: string | null;
}

export interface TransferenciaItem {
    id: string;
    desc: string;
    monto_origen: number;
    moneda_origen: string;
    origen_tipo: string;
    origen_nombre: string;
    monto_destino: number;
    moneda_destino: string;
    destino_tipo: string;
    destino_nombre: string;
    banco_origen?: Banco | null;
    banco_destino?: Banco | null;
    tasa_cambio: number;
    hora: string;
    afecta_saldo_usuario?: boolean;
    es_entrada?: boolean;
    usuario_nombre?: string;
    es_propio?: boolean;
    turno_nombre?: string | null;
}

export interface TransferenciaCompleta extends TransferenciaItem {
    tipo: 'saliente' | 'entrante';
}

/** Envío de dinero que sigue en tránsito (sin confirmar). Informativo: no entra en el saldo esperado. */
export interface EnvioAbierto {
    id: number;
    fecha: string;
    origen_nombre: string;
    banco_origen: Banco | null;
    destino_nombre: string;
    banco_destino: Banco | null;
    monto: number;
    moneda: string;
    moneda_imagen_url: string | null;
    monto_destino: number;
    moneda_destino: string;
    tasa_cambio: number | null;
    usuario_nombre: string;
    es_propio: boolean;
    comentario: string | null;
    por_recibir: boolean;
    /** Días que lleva en tránsito; a partir de 2 se marca atrasado (el efectivo puede tardar días). */
    dias_en_transito?: number;
    atrasado?: boolean;
}

/** Una pata (entrada, salida o mensajero) de una Operación Múltiple. */
export interface PataOperacionMultiple {
    tipo: string;
    nombre: string;
    monto: number;
    moneda: string;
    banco: Banco | null;
}

/** Operación Múltiple (remesa) del turno. Solo la ven admin y moderador; es informativa: no entra en el saldo esperado. */
export interface OperacionMultiple {
    id: number;
    hora: string;
    usuario_nombre: string;
    es_propio: boolean;
    estado: string;
    anulada: boolean;
    notas: string | null;
    entrada: PataOperacionMultiple;
    salida: PataOperacionMultiple;
    mensajero: PataOperacionMultiple | null;
}

export interface OperacionesMultiplesCierre {
    visible: boolean;
    items: OperacionMultiple[];
    resumen: { total: number; entradas: Array<{ moneda: string; monto: number }>; salidas: Array<{ moneda: string; monto: number }> };
}

/** Separa "Cuenta: X" / "Cliente: Y" / "Proveedor: Z" (como lo arma el servidor) en tipo y nombre. */
export const partirEntidad = (texto: string): { tipo: TipoEntidad; nombre: string } => {
    const [prefijo, ...resto] = texto.split(': ');
    if (resto.length === 0) {
        return { tipo: 'cuenta', nombre: texto };
    }
    return { tipo: prefijo === 'Cliente' ? 'cliente' : prefijo === 'Proveedor' ? 'proveedor' : 'cuenta', nombre: resto.join(': ') };
};

/** `origen_tipo`/`destino_tipo` del servidor también puede traer 'desconocido'; se trata como cuenta. */
export const tipoEntidadDe = (tipo: string): TipoEntidad => (tipo === 'cliente' || tipo === 'proveedor' ? tipo : 'cuenta');

/** Logo de la cuenta (o ícono de cliente/proveedor) junto a su nombre. */
export function EntidadFila({ tipo, nombre, banco }: { tipo: TipoEntidad; nombre: string; banco: Banco | null }) {
    return (
        <div className="flex items-center gap-2" title={nombre}>
            <Insignia entidad={{ id: '0', tipo, nombre, monedaCodigo: '', simbolo: '', saldo: null, banco }} tamano="sm" />
            <span className="max-w-[140px] truncate">{nombre}</span>
        </div>
    );
}

/** Tabla de las Operaciones Múltiples del turno: entrada, salida y mensajero con el logo de cada cuenta. */
function TablaOperacionesMultiples({ operaciones, mensajeVacio, etiquetaPropio }: { operaciones: OperacionMultiple[]; mensajeVacio: string; etiquetaPropio: string }) {
    const pata = (p: PataOperacionMultiple, clase: string, signo: string, anulada: boolean) => (
        <div className={anulada ? 'space-y-1 line-through opacity-60' : 'space-y-1'}>
            <EntidadFila tipo={tipoEntidadDe(p.tipo)} nombre={p.nombre} banco={p.banco} />
            <Badge className={`font-mono font-bold whitespace-nowrap backdrop-blur-sm ${clase}`}>
                {signo}${Number(p.monto).toFixed(2)} {p.moneda}
            </Badge>
        </div>
    );

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-16">Hora</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Salida</TableHead>
                        <TableHead>Mensajero</TableHead>
                        <TableHead className="w-28">Creado por</TableHead>
                        <TableHead className="w-28 text-center">Estado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {operaciones.length > 0 ? (
                        operaciones.map((op) => (
                            <TableRow key={op.id} className={!op.es_propio ? 'bg-orange-50/60 dark:bg-orange-950/20' : undefined}>
                                <TableCell className="font-mono text-xs">{op.hora}</TableCell>
                                <TableCell className="text-xs">
                                    {pata(op.entrada, 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', '+', op.anulada)}
                                </TableCell>
                                <TableCell className="text-xs">
                                    {pata(op.salida, 'border border-red-400/30 bg-red-500/10 text-red-700 dark:text-red-300', '-', op.anulada)}
                                </TableCell>
                                <TableCell className="text-xs">
                                    {op.mensajero ? (
                                        pata(op.mensajero, 'border border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300', '-', op.anulada)
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-xs">
                                    <CreadoPor esPropio={op.es_propio} usuario={op.usuario_nombre} etiquetaPropio={etiquetaPropio} />
                                </TableCell>
                                <TableCell className="text-center">
                                    <Link href={route('transacciones.remesa.show', op.id)}>
                                        {op.anulada ? (
                                            <Badge className="border border-red-400/30 bg-red-500/10 text-red-700 backdrop-blur-sm dark:text-red-300">Anulada</Badge>
                                        ) : (
                                            <Badge className="border border-cyan-400/30 bg-cyan-500/10 text-cyan-700 backdrop-blur-sm dark:text-cyan-300">Ver detalle</Badge>
                                        )}
                                    </Link>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-muted-foreground py-8 text-center italic">
                                {mensajeVacio}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

/**
 * Tabla de los envíos de dinero abiertos: los que enviaste (esperan confirmación) o los que te toca recibir.
 * `enlazar` false (un cierre ya guardado) deja el estado sin enlace: lo de hoy en Envíos de Dinero ya no es lo que
 * había al cerrar.
 */
function TablaEnviosAbiertos({
    envios,
    mensajeVacio,
    porRecibir,
    enlazar,
    etiquetaPropio,
}: {
    envios: EnvioAbierto[];
    mensajeVacio: string;
    porRecibir: boolean;
    enlazar: boolean;
    etiquetaPropio: string;
}) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-24">Fecha</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead className="w-32">Enviado por</TableHead>
                        <TableHead className="w-48 text-right">Monto</TableHead>
                        <TableHead className="w-32 text-center">Estado</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {envios.length > 0 ? (
                        envios.map((envio) => {
                            const estado = porRecibir ? (
                                <Badge className="border-0 bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/30">Confirma tú</Badge>
                            ) : (
                                <Badge className="border border-amber-400/30 bg-amber-500/10 text-amber-700 backdrop-blur-sm dark:text-amber-300">Sin confirmar</Badge>
                            );

                            return (
                                <TableRow key={envio.id} className={envio.atrasado ? 'bg-red-50/60 dark:bg-red-950/20' : undefined}>
                                    <TableCell className="font-mono text-xs">
                                        {envio.fecha}
                                        {envio.dias_en_transito !== undefined && envio.dias_en_transito > 0 && (
                                            <p className="text-muted-foreground text-[10px]">hace {envio.dias_en_transito} {envio.dias_en_transito === 1 ? 'día' : 'días'}</p>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        <EntidadFila tipo="cuenta" nombre={envio.origen_nombre} banco={envio.banco_origen} />
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        <EntidadFila tipo="cuenta" nombre={envio.destino_nombre} banco={envio.banco_destino} />
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        <CreadoPor esPropio={envio.es_propio} usuario={envio.usuario_nombre} etiquetaPropio={etiquetaPropio} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge className="gap-1.5 border border-amber-400/30 bg-amber-500/10 font-mono font-bold whitespace-nowrap text-amber-700 backdrop-blur-sm dark:text-amber-300">
                                            {envio.moneda_imagen_url && <img src={envio.moneda_imagen_url} alt="" aria-hidden="true" className="h-4 w-auto" />}
                                            ${Number(envio.monto).toFixed(2)} {envio.moneda}
                                        </Badge>
                                        {envio.moneda !== envio.moneda_destino && (
                                            <div className="text-muted-foreground mt-0.5 font-mono text-[10px] leading-tight whitespace-nowrap">
                                                ≈ ${Number(envio.monto_destino).toFixed(2)} {envio.moneda_destino}
                                                {envio.tasa_cambio ? <span className="ml-0.5">@ {Number(envio.tasa_cambio).toFixed(2)}</span> : null}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="space-y-1 text-center">
                                        {envio.atrasado && (
                                            <Badge className="border border-red-400/40 bg-red-500/15 text-red-700 backdrop-blur-sm dark:text-red-300">
                                                Atrasado · {envio.dias_en_transito} días
                                            </Badge>
                                        )}
                                        {enlazar ? (
                                            <Link className="block" href={route('transacciones.envios.index', { estado: porRecibir ? 'por_confirmar' : 'en_transito' })}>
                                                {estado}
                                            </Link>
                                        ) : (
                                            <div>{estado}</div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="text-muted-foreground py-8 text-center italic">
                                {mensajeVacio}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}

interface TarjetaTransaccionesTurnoProps {
    gastos: ItemMovimiento[];
    ingresos: ItemMovimiento[];
    transferencias: TransferenciaCompleta[];
    enviosEnviados: EnvioAbierto[];
    enviosPorRecibir: EnvioAbierto[];
    /** Solo admin y moderador (`visible`); con `undefined` o `visible: false` no hay pestaña. */
    operacionesMultiples?: OperacionesMultiplesCierre;
    descripcion: string;
    /** Cómo se rotula lo creado por el dueño del cierre ("Tú" en la pantalla de cierre; su nombre al verlo otra persona). */
    etiquetaPropio?: string;
    /** Un cierre ya guardado: los envíos no llevan enlace y, si no se guardaron, se avisa en vez de mostrar "no hay". */
    cierreGuardado?: boolean;
    /** Solo con `cierreGuardado`: false = el cierre es anterior a guardar los envíos en tránsito. */
    enviosGuardados?: boolean;
}

/**
 * Card "Transacciones del Turno" (violeta): gastos, ingresos y transferencias —propias y de otros usuarios sobre las
 * cuentas del dueño del cierre—, los envíos de dinero sin confirmar y las Operaciones Múltiples, con búsqueda y filtros
 * por origen y moneda. La comparten la pantalla de cierre y el detalle de un cierre guardado.
 */
export function TarjetaTransaccionesTurno({
    gastos,
    ingresos,
    transferencias,
    enviosEnviados,
    enviosPorRecibir,
    operacionesMultiples,
    descripcion,
    etiquetaPropio = 'Tú',
    cierreGuardado = false,
    enviosGuardados = true,
}: TarjetaTransaccionesTurnoProps) {
    const [busqueda, setBusqueda] = useState('');
    const [filtroOrigen, setFiltroOrigen] = useState<'todas' | 'propias' | 'externas'>('todas');
    const [filtroMoneda, setFiltroMoneda] = useState('todas');

    // Monedas presentes en los datos del turno (no hardcodeado, se arma según lo que exista)
    const monedas = useMemo(() => {
        const set = new Set<string>();
        gastos.forEach((i) => set.add(i.moneda || 'USD'));
        ingresos.forEach((i) => set.add(i.moneda || 'USD'));
        transferencias.forEach((i) => {
            set.add(i.moneda_origen || 'USD');
            set.add(i.moneda_destino || 'USD');
        });
        return ['todas', ...Array.from(set).sort()];
    }, [gastos, ingresos, transferencias]);

    const coincide = (esPropio: boolean | undefined, texto: string, monedasItem: string[]) => {
        const matchOrigen = filtroOrigen === 'todas' || (filtroOrigen === 'propias' ? esPropio === true : esPropio === false);
        const matchMoneda = filtroMoneda === 'todas' || monedasItem.includes(filtroMoneda);
        const matchTexto = !busqueda || texto.toLowerCase().includes(busqueda.toLowerCase());
        return matchOrigen && matchMoneda && matchTexto;
    };

    const gastosFiltrados = gastos.filter((i) => coincide(i.es_propio, `${i.desc} ${i.origen ?? ''}`, [i.moneda || 'USD']));
    const ingresosFiltrados = ingresos.filter((i) => coincide(i.es_propio, `${i.desc} ${i.destino ?? ''}`, [i.moneda || 'USD']));
    const transferenciasFiltradas = transferencias.filter((i) =>
        coincide(i.es_propio, `${i.desc} ${i.origen_nombre ?? ''} ${i.destino_nombre ?? ''}`, [i.moneda_origen || 'USD', i.moneda_destino || 'USD']),
    );

    const filtrarEnvios = (envios: EnvioAbierto[]) =>
        envios.filter((e) => coincide(e.es_propio, `${e.origen_nombre} ${e.destino_nombre} ${e.usuario_nombre} ${e.comentario ?? ''}`, [e.moneda, e.moneda_destino]));
    const enviosEnviadosFiltrados = filtrarEnvios(enviosEnviados);
    const enviosPorRecibirFiltrados = filtrarEnvios(enviosPorRecibir);

    const verOperacionesMultiples = operacionesMultiples?.visible === true;
    const operacionesFiltradas = (operacionesMultiples?.items ?? []).filter((op) =>
        coincide(
            op.es_propio,
            `${op.entrada.nombre} ${op.salida.nombre} ${op.mensajero?.nombre ?? ''} ${op.usuario_nombre} ${op.notas ?? ''}`,
            [op.entrada.moneda, op.salida.moneda, ...(op.mensajero ? [op.mensajero.moneda] : [])],
        ),
    );

    // Cuando se filtra por una moneda específica, mostrar la transferencia desde la perspectiva de esa moneda
    // (signo/monto principal) en vez del `tipo` canónico que trae el backend (pensado solo para la vista "Todas").
    const tipoEfectivoTransferencia = (item: TransferenciaCompleta): 'entrante' | 'saliente' => {
        if (filtroMoneda === 'todas' || item.moneda_origen === item.moneda_destino) {
            return item.tipo;
        }
        if (filtroMoneda === item.moneda_origen) return 'saliente';
        if (filtroMoneda === item.moneda_destino) return 'entrante';
        return item.tipo;
    };

    const hayFiltros = busqueda || filtroOrigen !== 'todas' || filtroMoneda !== 'todas';
    const sinResultados = 'No se encontraron resultados con los filtros aplicados';
    const sinEnviosGuardados = 'Este cierre se guardó antes de registrar los envíos en tránsito.';

    return (
        <Card className="gap-0 overflow-hidden border-l-4 border-violet-500/30 py-0 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="border-b bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                        <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-white">Transacciones del Turno</CardTitle>
                        <CardDescription className="text-violet-100">{descripcion}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
                <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                    <Input placeholder="Buscar en transacciones..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="pl-9" />
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-wrap items-center gap-1">
                        <span className="text-muted-foreground mr-1 text-xs font-medium">Origen:</span>
                        {(['todas', 'propias', 'externas'] as const).map((opt) => (
                            <Button key={opt} variant={filtroOrigen === opt ? 'default' : 'outline'} size="sm" onClick={() => setFiltroOrigen(opt)} className="h-7 text-xs">
                                {opt === 'todas' ? 'Todas' : opt === 'propias' ? 'Internas' : 'Externas'}
                            </Button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                        <span className="text-muted-foreground mr-1 text-xs font-medium">Moneda:</span>
                        {monedas.map((m) => (
                            <Button key={m} variant={filtroMoneda === m ? 'default' : 'outline'} size="sm" onClick={() => setFiltroMoneda(m)} className="h-7 text-xs">
                                {m === 'todas' ? 'Todas' : m}
                            </Button>
                        ))}
                    </div>
                </div>

                <Tabs defaultValue="gastos" className="w-full">
                    <TabsList className={`grid h-auto w-full grid-cols-2 ${verOperacionesMultiples ? 'xl:grid-cols-6' : 'xl:grid-cols-5'}`}>
                        <TabsTrigger value="gastos" className="gap-2 data-[state=active]:bg-red-500/15 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-400">
                            <ArrowUp className="h-4 w-4" />
                            Gastos
                            <Badge className="border border-red-400/30 bg-red-500/10 px-2 text-red-700 backdrop-blur-sm dark:text-red-300">{gastosFiltrados.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="ingresos"
                            className="gap-2 data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400"
                        >
                            <ArrowDown className="h-4 w-4" />
                            Ingresos
                            <Badge className="border border-emerald-400/30 bg-emerald-500/10 px-2 text-emerald-700 backdrop-blur-sm dark:text-emerald-300">
                                {ingresosFiltrados.length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="transferencias"
                            className="gap-2 data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                        >
                            <ArrowRightLeft className="h-4 w-4" />
                            Transferencias
                            <Badge className="border border-blue-400/30 bg-blue-500/10 px-2 text-blue-700 backdrop-blur-sm dark:text-blue-300">
                                {transferenciasFiltradas.length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="enviados"
                            className="gap-2 data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
                        >
                            <Truck className="h-4 w-4" />
                            Enviados sin confirmar
                            <Badge className="border border-amber-400/30 bg-amber-500/10 px-2 text-amber-700 backdrop-blur-sm dark:text-amber-300">
                                {enviosEnviadosFiltrados.length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger
                            value="por-recibir"
                            className="gap-2 data-[state=active]:bg-sky-500/15 data-[state=active]:text-sky-600 dark:data-[state=active]:text-sky-400"
                        >
                            <HandCoins className="h-4 w-4" />
                            Por recibir
                            <Badge className="border border-sky-400/30 bg-sky-500/10 px-2 text-sky-700 backdrop-blur-sm dark:text-sky-300">
                                {enviosPorRecibirFiltrados.length}
                            </Badge>
                        </TabsTrigger>
                        {verOperacionesMultiples && (
                            <TabsTrigger
                                value="operaciones-multiples"
                                className="gap-2 data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-600 dark:data-[state=active]:text-cyan-400"
                            >
                                <Shuffle className="h-4 w-4" />
                                Op. Múltiples
                                <Badge className="border border-cyan-400/30 bg-cyan-500/10 px-2 text-cyan-700 backdrop-blur-sm dark:text-cyan-300">
                                    {operacionesFiltradas.length}
                                </Badge>
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="gastos" className="mt-4">
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">Hora</TableHead>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead>Cuenta de Operación</TableHead>
                                        <TableHead className="w-28">Creado por</TableHead>
                                        <TableHead className="w-48 text-right">Monto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {gastosFiltrados.length > 0 ? (
                                        gastosFiltrados.map((item, idx) => (
                                            <TableRow key={idx} className={!item.es_propio ? 'bg-orange-50/60 dark:bg-orange-950/20' : undefined}>
                                                <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                                <TableCell className="text-sm">
                                                    {item.desc}
                                                    <MarcaInformativa afectaCaja={item.afecta_caja} />
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <EntidadFila {...partirEntidad(item.origen || '-')} banco={item.banco ?? null} />
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <CreadoPor esPropio={item.es_propio} usuario={item.usuario_nombre} turno={item.turno_nombre} etiquetaPropio={etiquetaPropio} />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge className="gap-1.5 border border-red-400/30 whitespace-nowrap bg-red-500/10 font-mono font-bold text-red-700 backdrop-blur-sm dark:text-red-300">
                                                        {item.moneda_imagen_url && <img src={item.moneda_imagen_url} alt="" aria-hidden="true" className="h-4 w-auto" />}
                                                        -${Number(item.monto).toFixed(2)} {item.moneda || 'USD'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-muted-foreground py-8 text-center italic">
                                                {hayFiltros ? sinResultados : 'No hay gastos registrados en este turno.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="ingresos" className="mt-4">
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">Hora</TableHead>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead>Cuenta de Operación</TableHead>
                                        <TableHead className="w-28">Creado por</TableHead>
                                        <TableHead className="w-48 text-right">Monto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ingresosFiltrados.length > 0 ? (
                                        ingresosFiltrados.map((item, idx) => (
                                            <TableRow key={idx} className={!item.es_propio ? 'bg-orange-50/60 dark:bg-orange-950/20' : undefined}>
                                                <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                                <TableCell className="text-sm">
                                                    {item.desc}
                                                    <MarcaInformativa afectaCaja={item.afecta_caja} />
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <EntidadFila {...partirEntidad(item.destino || '-')} banco={item.banco ?? null} />
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <CreadoPor esPropio={item.es_propio} usuario={item.usuario_nombre} turno={item.turno_nombre} etiquetaPropio={etiquetaPropio} />
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge className="gap-1.5 border border-emerald-400/30 whitespace-nowrap bg-emerald-500/10 font-mono font-bold text-emerald-700 backdrop-blur-sm dark:text-emerald-300">
                                                        {item.moneda_imagen_url && <img src={item.moneda_imagen_url} alt="" aria-hidden="true" className="h-4 w-auto" />}
                                                        +${Number(item.monto).toFixed(2)} {item.moneda || 'USD'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-muted-foreground py-8 text-center italic">
                                                {hayFiltros ? sinResultados : 'No hay ingresos registrados en este turno.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="transferencias" className="mt-4">
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">Hora</TableHead>
                                        <TableHead className="max-w-[160px]">Descripción</TableHead>
                                        <TableHead className="w-[170px]">Origen</TableHead>
                                        <TableHead className="w-[170px]">Destino</TableHead>
                                        <TableHead className="w-28">Creado por</TableHead>
                                        <TableHead className="w-40 text-right">Monto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transferenciasFiltradas.length > 0 ? (
                                        transferenciasFiltradas.map((item, idx) => {
                                            const tEfectivo = tipoEfectivoTransferencia(item);
                                            return (
                                                <TableRow key={idx} className={!item.es_propio ? 'bg-orange-50/60 dark:bg-orange-950/20' : undefined}>
                                                    <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                                    <TableCell className="max-w-[160px] truncate text-sm">{item.desc}</TableCell>
                                                    <TableCell className="text-xs">
                                                        <EntidadFila tipo={tipoEntidadDe(item.origen_tipo)} nombre={item.origen_nombre} banco={item.banco_origen ?? null} />
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <EntidadFila tipo={tipoEntidadDe(item.destino_tipo)} nombre={item.destino_nombre} banco={item.banco_destino ?? null} />
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <CreadoPor esPropio={item.es_propio} usuario={item.usuario_nombre} turno={item.turno_nombre} etiquetaPropio={etiquetaPropio} />
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs">
                                                        <div>
                                                            <Badge
                                                                className={
                                                                    tEfectivo === 'entrante'
                                                                        ? 'border border-emerald-400/30 bg-emerald-500/10 font-mono font-bold text-emerald-700 backdrop-blur-sm dark:text-emerald-300'
                                                                        : 'border border-blue-400/30 bg-blue-500/10 font-mono font-bold text-blue-700 backdrop-blur-sm dark:text-blue-300'
                                                                }
                                                            >
                                                                {tEfectivo === 'entrante' ? '+' : '-'}${Number(tEfectivo === 'entrante' ? item.monto_destino : item.monto_origen).toFixed(2)}{' '}
                                                                {tEfectivo === 'entrante' ? item.moneda_destino : item.moneda_origen}
                                                            </Badge>
                                                            {(item.moneda_origen ?? item.moneda_destino) && item.moneda_origen !== item.moneda_destino && (
                                                                <div className="text-muted-foreground mt-0.5 text-[10px] leading-tight whitespace-nowrap">
                                                                    ≈ ${Number(tEfectivo === 'entrante' ? item.monto_origen : item.monto_destino).toFixed(2)}{' '}
                                                                    {tEfectivo === 'entrante' ? item.moneda_origen : item.moneda_destino}
                                                                    <span className="ml-0.5">@ {Number(item.tasa_cambio).toFixed(2)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-muted-foreground py-8 text-center italic">
                                                {hayFiltros ? sinResultados : 'No hay transferencias registradas en este turno.'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="enviados" className="mt-4">
                        <TablaEnviosAbiertos
                            envios={enviosEnviadosFiltrados}
                            porRecibir={false}
                            enlazar={!cierreGuardado}
                            etiquetaPropio={etiquetaPropio}
                            mensajeVacio={
                                cierreGuardado && !enviosGuardados
                                    ? sinEnviosGuardados
                                    : enviosEnviados.length > 0
                                      ? sinResultados
                                      : cierreGuardado
                                        ? 'No había envíos esperando confirmación al cerrar.'
                                        : 'No hay envíos tuyos esperando confirmación.'
                            }
                        />
                    </TabsContent>

                    <TabsContent value="por-recibir" className="mt-4">
                        <TablaEnviosAbiertos
                            envios={enviosPorRecibirFiltrados}
                            porRecibir
                            enlazar={!cierreGuardado}
                            etiquetaPropio={etiquetaPropio}
                            mensajeVacio={
                                cierreGuardado && !enviosGuardados
                                    ? sinEnviosGuardados
                                    : enviosPorRecibir.length > 0
                                      ? sinResultados
                                      : cierreGuardado
                                        ? 'No había envíos por recibir al cerrar.'
                                        : 'No tienes envíos por recibir.'
                            }
                        />
                    </TabsContent>

                    {verOperacionesMultiples && (
                        <TabsContent value="operaciones-multiples" className="mt-4">
                            <TablaOperacionesMultiples
                                operaciones={operacionesFiltradas}
                                etiquetaPropio={etiquetaPropio}
                                mensajeVacio={
                                    (operacionesMultiples?.items.length ?? 0) > 0 ? sinResultados : 'No hay operaciones múltiples registradas en este turno.'
                                }
                            />
                        </TabsContent>
                    )}
                </Tabs>
            </CardContent>
        </Card>
    );
}
