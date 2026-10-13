import { EntidadFila } from '@/components/cierres/transacciones-turno';
import { type Banco } from '@/components/transacciones/entidad';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import SpotlightCard from '@/components/ui/spotlightcard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowDown, ArrowUp, CheckCircle2, HandCoins, Scale, Search, Truck, Users, Wallet } from 'lucide-react';
import React, { useMemo, useState } from 'react';

export interface ComparativaItem {
    id: number;
    nombre: string;
    tipo: string;
    /** Logo de la cuenta; null si no tiene uno asignado (y en cierres guardados antes de este dato). */
    banco?: Banco | null;
    /** Cuenta que no estaba en el cierre anterior: no hay saldo anterior real con qué compararla. */
    es_nueva?: boolean;
    /** Dinero enviado desde esta cuenta que sigue en tránsito (ya salió de su saldo). */
    en_transito_salida?: number;
    /** Dinero en camino hacia esta cuenta que todavía no se acredita. */
    en_transito_entrada?: number;
    moneda: string;
    saldo_anterior: number;
    saldo_actual: number;
    diferencia: number;
    estado: 'subio' | 'bajo' | 'igual';
}

/** Cuenta que el vendedor tiene solo para cobrar: no se le muestra su saldo, solo lo cobrado en el turno. */
export interface CuentaDeCobro {
    id: number;
    nombre: string;
    tipo: string | null;
    banco: Banco | null;
    moneda: string | null;
    operado_turno: number;
}

export interface ComparativaClienteItem {
    id: number;
    nombre: string;
    deuda_anterior: number;
    deuda_actual: number;
    diferencia: number;
    estado: 'mejoro' | 'empeoro' | 'igual';
}

/** Cuánto cambió respecto al cierre anterior: `bueno` pinta de verde (mejoró) o rojo (empeoró); null = sin cambio. */
function BadgeDiferencia({ diferencia, moneda, bueno }: { diferencia: number; moneda: string; bueno: boolean | null }) {
    // Menos de un centavo no es un cambio: evita un "-$0.00" si llega un residuo de redondeo.
    if (bueno === null || Math.abs(diferencia) < 0.005) {
        return <Badge className="text-muted-foreground border border-white/10 bg-white/5 font-mono">—</Badge>;
    }
    const Flecha = diferencia > 0 ? ArrowUp : ArrowDown;
    const clase = bueno
        ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
        : 'border border-red-400/30 bg-red-500/10 text-red-700 dark:text-red-300';
    // Sin backdrop-blur: se repite en cada fila (más de cien) y las capas de desenfoque saturan la GPU.
    return (
        <Badge className={`gap-1 font-mono font-bold whitespace-nowrap ${clase}`}>
            <Flecha className="h-3 w-3" />
            {diferencia > 0 ? '+' : '-'}${Math.abs(diferencia).toFixed(2)} {moneda}
        </Badge>
    );
}

const COLORES_WIDGET_CAMBIO = {
    emerald: { caja: 'border-emerald-400/30 bg-emerald-500/5 dark:bg-emerald-500/10', icono: 'from-emerald-500 to-green-600 shadow-emerald-500/30', cifra: 'text-emerald-600 dark:text-emerald-400' },
    red: { caja: 'border-red-400/30 bg-red-500/5 dark:bg-red-500/10', icono: 'from-red-500 to-rose-600 shadow-red-500/30', cifra: 'text-red-600 dark:text-red-400' },
    indigo: { caja: 'border-indigo-400/30 bg-indigo-500/5 dark:bg-indigo-500/10', icono: 'from-indigo-500 to-violet-600 shadow-indigo-500/30', cifra: 'text-indigo-600 dark:text-indigo-400' },
} as const;

/** Widget de conteo de la Comparativa (subieron / bajaron / sin cambio), con el borde animado como los demás. */
function WidgetCambio({
    estado,
    color,
    icono: Icono,
    titulo,
    valor,
}: {
    estado: 'disponible' | 'agotado' | 'indigo';
    color: keyof typeof COLORES_WIDGET_CAMBIO;
    icono: React.ElementType;
    titulo: string;
    valor: number;
}) {
    const c = COLORES_WIDGET_CAMBIO[color];
    return (
        <SpotlightCard estado={estado} className={`rounded-xl border p-3 shadow-sm backdrop-blur-sm ${c.caja}`}>
            <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md ${c.icono}`}>
                    <Icono className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{titulo}</p>
                    <p className={`text-2xl font-black ${c.cifra}`}>{valor}</p>
                </div>
            </div>
        </SpotlightCard>
    );
}

interface TarjetaComparativaProps {
    cuentas: ComparativaItem[];
    cuentasCobro: CuentaDeCobro[];
    clientes: ComparativaClienteItem[];
    tieneCierreAnterior: boolean;
    /** Los clientes solo los ve admin o moderador. */
    verClientes: boolean;
    /** Un cierre ya guardado: "Saldo al cerrar" en vez de "Saldo actual" y textos en pasado. */
    cierreGuardado?: boolean;
}

/**
 * Card "Comparativa con Cierre Anterior" (índigo): cuánto cambió cada cuenta (saldo anterior, actual, en tránsito y
 * diferencia) y cada deuda de cliente. La comparten la pantalla de cierre y el detalle de un cierre guardado.
 */
export function TarjetaComparativa({ cuentas, cuentasCobro, clientes, tieneCierreAnterior, verClientes, cierreGuardado = false }: TarjetaComparativaProps) {
    const [busquedaCuentas, setBusquedaCuentas] = useState('');
    const [filtroTipoCuentas, setFiltroTipoCuentas] = useState('todos');
    const [busquedaClientes, setBusquedaClientes] = useState('');
    const [soloConCambios, setSoloConCambios] = useState(false);

    const etiquetaSaldo = cierreGuardado ? 'Saldo al cerrar' : 'Saldo actual';
    const etiquetaDeuda = cierreGuardado ? 'Deuda al cerrar' : 'Deuda actual';

    const tiposUnicos = useMemo(() => {
        const tipos = new Set(cuentas.map((c) => c.tipo));
        return ['todos', ...Array.from(tipos).sort()];
    }, [cuentas]);

    // Las que más cambiaron primero (el cambio se mide en la moneda de cada cuenta); a igual cambio, por nombre.
    const cuentasFiltradas = useMemo(() => {
        return cuentas
            .filter((c) => {
                const matchTexto = !busquedaCuentas || c.nombre.toLowerCase().includes(busquedaCuentas.toLowerCase());
                const matchTipo = filtroTipoCuentas === 'todos' || c.tipo === filtroTipoCuentas;
                const matchCambio = !soloConCambios || c.estado !== 'igual' || c.es_nueva === true;
                return matchTexto && matchTipo && matchCambio;
            })
            .sort(
                (a, b) =>
                    Number(b.es_nueva ?? false) - Number(a.es_nueva ?? false) ||
                    Math.abs(b.diferencia) - Math.abs(a.diferencia) ||
                    a.nombre.localeCompare(b.nombre),
            );
    }, [cuentas, busquedaCuentas, filtroTipoCuentas, soloConCambios]);

    const clientesFiltrados = useMemo(() => {
        return clientes
            .filter((c) => {
                const matchTexto = !busquedaClientes || c.nombre.toLowerCase().includes(busquedaClientes.toLowerCase());
                const matchCambio = !soloConCambios || c.estado !== 'igual';
                return matchTexto && matchCambio;
            })
            .sort((a, b) => Math.abs(b.diferencia) - Math.abs(a.diferencia) || a.nombre.localeCompare(b.nombre));
    }, [clientes, busquedaClientes, soloConCambios]);

    // Resumen: cuántas subieron/bajaron y cuánto se movió por moneda (o el saldo si es el primer cierre).
    const resumenCuentas = useMemo(() => {
        const porMoneda: Record<string, { saldo: number; diferencia: number }> = {};
        cuentas.forEach((c) => {
            porMoneda[c.moneda] = porMoneda[c.moneda] ?? { saldo: 0, diferencia: 0 };
            porMoneda[c.moneda].saldo += Number(c.saldo_actual) || 0;
            // Una cuenta nueva no tiene saldo anterior: su saldo entero no es un "movimiento" y distorsionaría el neto.
            if (!c.es_nueva) {
                porMoneda[c.moneda].diferencia += Number(c.diferencia) || 0;
            }
        });
        return {
            subieron: cuentas.filter((c) => !c.es_nueva && c.estado === 'subio').length,
            bajaron: cuentas.filter((c) => !c.es_nueva && c.estado === 'bajo').length,
            iguales: cuentas.filter((c) => !c.es_nueva && c.estado === 'igual').length,
            porMoneda: Object.entries(porMoneda).sort(([a], [b]) => a.localeCompare(b)),
        };
    }, [cuentas]);

    const resumenClientes = useMemo(
        () => ({
            mejoraron: clientes.filter((c) => c.estado === 'mejoro').length,
            empeoraron: clientes.filter((c) => c.estado === 'empeoro').length,
            iguales: clientes.filter((c) => c.estado === 'igual').length,
            deudaTotal: clientes.reduce((s, c) => s + (Number(c.deuda_actual) || 0), 0),
            diferenciaTotal: clientes.reduce((s, c) => s + (Number(c.diferencia) || 0), 0),
        }),
        [clientes],
    );

    return (
        <Card className="gap-0 overflow-hidden border-l-4 border-indigo-500/30 py-0 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="border-b bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                        <Scale className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-white">Comparativa con Cierre Anterior</CardTitle>
                        <CardDescription className="text-indigo-100">Comparación de saldos y deudas respecto al cierre anterior</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
                {/* Pestañas Cuentas / Clientes */}
                <Tabs defaultValue="cuentas" className="w-full">
                    <TabsList className={`grid h-auto w-full ${verClientes ? 'grid-cols-2' : ''}`}>
                        <TabsTrigger
                            value="cuentas"
                            className="gap-2 data-[state=active]:bg-indigo-500/15 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400"
                        >
                            <Wallet className="h-4 w-4" />
                            Cuentas
                            <Badge className="border border-indigo-400/30 bg-indigo-500/10 px-2 text-indigo-700 backdrop-blur-sm dark:text-indigo-300">{cuentas.length}</Badge>
                        </TabsTrigger>
                        {verClientes && (
                            <TabsTrigger
                                value="clientes"
                                className="gap-2 data-[state=active]:bg-indigo-500/15 data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400"
                            >
                                <Users className="h-4 w-4" />
                                Clientes
                                <Badge className="border border-indigo-400/30 bg-indigo-500/10 px-2 text-indigo-700 backdrop-blur-sm dark:text-indigo-300">{clientes.length}</Badge>
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* Tab Cuentas */}
                    <TabsContent value="cuentas" className="mt-4 space-y-4">
                        {tieneCierreAnterior ? (
                            <>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <WidgetCambio estado="disponible" color="emerald" icono={ArrowUp} titulo="Subieron" valor={resumenCuentas.subieron} />
                                    <WidgetCambio estado="agotado" color="red" icono={ArrowDown} titulo="Bajaron" valor={resumenCuentas.bajaron} />
                                    <WidgetCambio estado="indigo" color="indigo" icono={CheckCircle2} titulo="Sin cambio" valor={resumenCuentas.iguales} />
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-muted-foreground text-xs font-medium">Movimiento neto:</span>
                                    {resumenCuentas.porMoneda.map(([moneda, { diferencia }]) => (
                                        <BadgeDiferencia key={moneda} diferencia={diferencia} moneda={moneda} bueno={diferencia > 0 ? true : diferencia < 0 ? false : null} />
                                    ))}
                                </div>
                            </>
                        ) : (
                            cuentas.length > 0 && (
                                <div className="space-y-2 rounded-lg border border-indigo-400/30 bg-indigo-500/5 p-4 backdrop-blur-sm dark:bg-indigo-500/10">
                                    <p className="text-sm font-semibold">Primer cierre</p>
                                    <p className="text-muted-foreground text-xs">
                                        {cierreGuardado
                                            ? 'Fue el primer cierre: no había un cierre anterior con qué comparar. Estos eran los saldos al cerrar.'
                                            : 'Todavía no hay un cierre anterior con qué comparar. Estos son los saldos actuales; desde el próximo cierre verás aquí lo que cambió.'}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-muted-foreground text-xs font-medium">{etiquetaSaldo}:</span>
                                        {resumenCuentas.porMoneda.map(([moneda, { saldo }]) => (
                                            <Badge key={moneda} className="border-0 bg-gradient-to-r from-indigo-500 to-violet-600 font-mono font-bold text-white shadow-md shadow-indigo-500/30">
                                                ${saldo.toFixed(2)} {moneda}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )
                        )}

                        <div className="relative">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                            <Input placeholder="Buscar cuenta..." value={busquedaCuentas} onChange={(e) => setBusquedaCuentas(e.target.value)} className="pl-9" />
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                            <span className="text-muted-foreground mr-1 text-xs font-medium">Tipo:</span>
                            {tiposUnicos.map((tipo) => (
                                <Button
                                    key={tipo}
                                    variant={filtroTipoCuentas === tipo ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setFiltroTipoCuentas(tipo)}
                                    className="h-7 text-xs capitalize"
                                >
                                    {tipo === 'todos' ? 'Todos' : tipo}
                                </Button>
                            ))}
                            {tieneCierreAnterior && (
                                <Button variant={soloConCambios ? 'default' : 'outline'} size="sm" onClick={() => setSoloConCambios((v) => !v)} className="ml-2 h-7 text-xs">
                                    Solo con cambios
                                </Button>
                            )}
                        </div>

                        {/* El contenedor interno de <Table> tiene overflow-x-auto y rompe el sticky: se anula aquí para que el encabezado se fije dentro de este scroll. */}
                        <div className="max-h-[520px] overflow-y-auto rounded-md border [&_[data-slot=table-container]]:overflow-visible">
                            <Table>
                                <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead>Cuenta</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Moneda</TableHead>
                                        <TableHead className="text-right">Saldo anterior</TableHead>
                                        <TableHead className="text-right">{etiquetaSaldo}</TableHead>
                                        <TableHead className="w-44 text-right">En tránsito</TableHead>
                                        {tieneCierreAnterior && <TableHead className="w-44 text-right">Diferencia</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cuentasFiltradas.length > 0 ? (
                                        cuentasFiltradas.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="text-sm font-medium">
                                                    <EntidadFila tipo="cuenta" nombre={item.nombre} banco={item.banco ?? null} />
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={
                                                            item.tipo === 'efectivo'
                                                                ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                                                : 'border border-sky-400/30 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                                                        }
                                                    >
                                                        {item.tipo === 'efectivo' ? 'Efectivo' : item.tipo === 'tarjeta' ? 'Tarjeta' : item.tipo || '-'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="border border-indigo-400/30 bg-indigo-500/10 font-mono text-indigo-700 dark:text-indigo-300">{item.moneda}</Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-right font-mono">
                                                    {item.es_nueva ? '—' : `$${Number(item.saldo_anterior).toFixed(2)}`}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-medium">${Number(item.saldo_actual).toFixed(2)}</TableCell>
                                                <TableCell className="text-right">
                                                    {Number(item.en_transito_salida) > 0 || Number(item.en_transito_entrada) > 0 ? (
                                                        <div className="flex flex-col items-end gap-1">
                                                            {Number(item.en_transito_salida) > 0 && (
                                                                <Badge
                                                                    className="gap-1 border border-amber-400/30 bg-amber-500/10 font-mono whitespace-nowrap text-amber-700 dark:text-amber-300"
                                                                    title="Ya salió de esta cuenta y todavía no se confirma que llegó"
                                                                >
                                                                    <Truck className="h-3 w-3" />-${Number(item.en_transito_salida).toFixed(2)} {item.moneda}
                                                                </Badge>
                                                            )}
                                                            {Number(item.en_transito_entrada) > 0 && (
                                                                <Badge
                                                                    className="gap-1 border border-sky-400/30 bg-sky-500/10 font-mono whitespace-nowrap text-sky-700 dark:text-sky-300"
                                                                    title="Viene en camino a esta cuenta y todavía no se acredita"
                                                                >
                                                                    <HandCoins className="h-3 w-3" />+${Number(item.en_transito_entrada).toFixed(2)} {item.moneda}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                {tieneCierreAnterior && (
                                                    <TableCell className="text-right">
                                                        {item.es_nueva ? (
                                                            <Badge className="border border-indigo-400/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">Nueva</Badge>
                                                        ) : (
                                                            <BadgeDiferencia
                                                                diferencia={Number(item.diferencia)}
                                                                moneda={item.moneda}
                                                                bueno={item.estado === 'subio' ? true : item.estado === 'bajo' ? false : null}
                                                            />
                                                        )}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={tieneCierreAnterior ? 7 : 6} className="text-muted-foreground py-8 text-center italic">
                                                {busquedaCuentas || filtroTipoCuentas !== 'todos' || soloConCambios
                                                    ? 'No se encontraron cuentas con los filtros aplicados'
                                                    : 'No hay cuentas para mostrar'}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {cuentasCobro.length > 0 && (
                            <div className="space-y-3 rounded-lg border border-amber-400/30 bg-amber-500/5 p-4 dark:bg-amber-500/10">
                                <div>
                                    <p className="text-sm font-semibold">Cuentas de cobro</p>
                                    <p className="text-muted-foreground text-xs">
                                        Solo sirven para recibir pagos: no se muestra su saldo general ni se comparan con el cierre anterior, únicamente lo que
                                        {cierreGuardado ? ' se cobró' : ' cobraste'} en este turno.
                                    </p>
                                </div>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Cuenta</TableHead>
                                                <TableHead>Moneda</TableHead>
                                                <TableHead className="text-right">Cobrado en el turno</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {cuentasCobro.map((cuenta) => (
                                                <TableRow key={cuenta.id}>
                                                    <TableCell className="text-sm font-medium">
                                                        <EntidadFila tipo="cuenta" nombre={cuenta.nombre} banco={cuenta.banco} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className="border border-indigo-400/30 bg-indigo-500/10 font-mono text-indigo-700 dark:text-indigo-300">{cuenta.moneda}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge className="border-0 bg-gradient-to-r from-amber-500 to-orange-600 font-mono font-bold text-white shadow-md shadow-amber-500/30">
                                                            ${Number(cuenta.operado_turno).toFixed(2)} {cuenta.moneda}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {verClientes && (
                        <TabsContent value="clientes" className="mt-4 space-y-4">
                            {tieneCierreAnterior ? (
                                <>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <WidgetCambio estado="disponible" color="emerald" icono={ArrowDown} titulo="Deuda bajó" valor={resumenClientes.mejoraron} />
                                        <WidgetCambio estado="agotado" color="red" icono={ArrowUp} titulo="Deuda subió" valor={resumenClientes.empeoraron} />
                                        <WidgetCambio estado="indigo" color="indigo" icono={CheckCircle2} titulo="Sin cambio" valor={resumenClientes.iguales} />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-muted-foreground text-xs font-medium">Cambio neto de la deuda:</span>
                                        <BadgeDiferencia
                                            diferencia={resumenClientes.diferenciaTotal}
                                            moneda="USD"
                                            bueno={resumenClientes.diferenciaTotal < 0 ? true : resumenClientes.diferenciaTotal > 0 ? false : null}
                                        />
                                    </div>
                                </>
                            ) : (
                                clientes.length > 0 && (
                                    <div className="space-y-2 rounded-lg border border-indigo-400/30 bg-indigo-500/5 p-4 backdrop-blur-sm dark:bg-indigo-500/10">
                                        <p className="text-sm font-semibold">Primer cierre</p>
                                        <p className="text-muted-foreground text-xs">
                                            {cierreGuardado
                                                ? 'Fue el primer cierre: no había un cierre anterior con qué comparar. Estas eran las deudas al cerrar.'
                                                : 'Todavía no hay un cierre anterior con qué comparar. Estas son las deudas actuales.'}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-muted-foreground text-xs font-medium">Deuda total:</span>
                                            <Badge className="border-0 bg-gradient-to-r from-indigo-500 to-violet-600 font-mono font-bold text-white shadow-md shadow-indigo-500/30">
                                                ${resumenClientes.deudaTotal.toFixed(2)} USD
                                            </Badge>
                                        </div>
                                    </div>
                                )
                            )}

                            <div className="relative">
                                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                <Input placeholder="Buscar cliente..." value={busquedaClientes} onChange={(e) => setBusquedaClientes(e.target.value)} className="pl-9" />
                            </div>
                            {tieneCierreAnterior && (
                                <div className="flex flex-wrap items-center gap-1">
                                    <Button variant={soloConCambios ? 'default' : 'outline'} size="sm" onClick={() => setSoloConCambios((v) => !v)} className="h-7 text-xs">
                                        Solo con cambios
                                    </Button>
                                </div>
                            )}

                            <div className="max-h-[520px] overflow-y-auto rounded-md border [&_[data-slot=table-container]]:overflow-visible">
                                <Table>
                                    <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
                                        <TableRow>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead className="text-right">Deuda anterior</TableHead>
                                            <TableHead className="text-right">{etiquetaDeuda}</TableHead>
                                            {tieneCierreAnterior && <TableHead className="w-44 text-right">Diferencia</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {clientesFiltrados.length > 0 ? (
                                            clientesFiltrados.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell className="text-sm font-medium">
                                                        <EntidadFila tipo="cliente" nombre={item.nombre} banco={null} />
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-right font-mono">${Number(item.deuda_anterior).toFixed(2)}</TableCell>
                                                    <TableCell className="text-right font-mono font-medium">${Number(item.deuda_actual).toFixed(2)}</TableCell>
                                                    {tieneCierreAnterior && (
                                                        <TableCell className="text-right">
                                                            <BadgeDiferencia
                                                                diferencia={Number(item.diferencia)}
                                                                moneda="USD"
                                                                bueno={item.estado === 'mejoro' ? true : item.estado === 'empeoro' ? false : null}
                                                            />
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={tieneCierreAnterior ? 4 : 3} className="text-muted-foreground py-8 text-center italic">
                                                    {busquedaClientes || soloConCambios ? 'No se encontraron clientes con los filtros aplicados' : 'No hay clientes con deuda registrada.'}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            </CardContent>
        </Card>
    );
}
