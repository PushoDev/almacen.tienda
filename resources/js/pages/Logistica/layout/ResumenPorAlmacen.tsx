import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@inertiajs/react';
import { AlertTriangle, ChevronDown, GitMerge, Layers, PackageX, Tags, Truck, Warehouse } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Label as ChartLabel, ChartProps, Pie, PieChart, XAxis, YAxis } from 'recharts';

export interface AlmacenOpcion {
    id: number;
    nombre_almacen: string;
}

interface ResumenAlmacen {
    almacen: { id: number; nombre: string };
    kpis: {
        productos: number;
        unidades: number;
        valor_costo: number;
        valor_venta: number;
        costo_con_precio: number;
        margen: number;
        margen_porcentaje: number | null;
    };
    precios: { con_precio: number; sin_precio: number; unidades_sin_precio: number; costo_sin_precio: number };
    estado: {
        stock_bajo: { productos: number; unidades: number };
        sin_stock: number;
        en_transito: { unidades: number; movimientos_abiertos: number };
    };
    fusionables: { productos_con_varios_costos: number; grupos_de_fichas_repetidas: number };
    categorias: { categoria: string; costo: number; unidades: number }[];
    ventas_por_dia: { fecha: string; venta: number; costo: number; ganancia: number }[];
    ventas_resumen: { venta: number; ganancia: number; dias: number };
}

type RangoVentas = '7' | '14' | 'todo';

// 'de-DE' usa el mismo separador que es-ES (punto de miles, coma decimal) pero agrupa también los números de 4 cifras (1.144).
const usd = (valor: number) => `$ ${valor.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (valor: number) => valor.toLocaleString('de-DE');
const cuenta = (valor: number, singular: string, plural: string) => `${num(valor)} ${valor === 1 ? singular : plural}`;
const fechaCorta = (fecha: string) => new Date(`${fecha}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const fechaLarga = (fecha: string) =>
    new Date(`${fecha}T00:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const coloresKpi = {
    emerald: {
        caja: 'border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-900/20',
        titulo: 'text-emerald-600 dark:text-emerald-400',
        valor: 'text-emerald-900 dark:text-emerald-200',
        detalle: 'text-emerald-500 dark:text-emerald-400',
    },
    indigo: {
        caja: 'border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-900/20',
        titulo: 'text-indigo-600 dark:text-indigo-400',
        valor: 'text-indigo-900 dark:text-indigo-200',
        detalle: 'text-indigo-500 dark:text-indigo-400',
    },
    violet: {
        caja: 'border-violet-500/20 bg-violet-50/50 dark:bg-violet-900/20',
        titulo: 'text-violet-600 dark:text-violet-400',
        valor: 'text-violet-900 dark:text-violet-200',
        detalle: 'text-violet-500 dark:text-violet-400',
    },
    cyan: {
        caja: 'border-cyan-500/20 bg-cyan-50/50 dark:bg-cyan-900/20',
        titulo: 'text-cyan-600 dark:text-cyan-400',
        valor: 'text-cyan-900 dark:text-cyan-200',
        detalle: 'text-cyan-500 dark:text-cyan-400',
    },
} as const;

function KpiCard({ titulo, valor, detalle, color }: { titulo: string; valor: string; detalle: string; color: keyof typeof coloresKpi }) {
    const estilos = coloresKpi[color];

    return (
        <div className={`rounded-lg border p-4 ${estilos.caja}`}>
            <p className={`text-sm font-medium ${estilos.titulo}`}>{titulo}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${estilos.valor}`}>{valor}</p>
            <p className={`text-xs ${estilos.detalle}`}>{detalle}</p>
        </div>
    );
}

const configVentas = {
    costo: { label: 'Costo de lo vendido', color: '#6366f1' },
    ganancia: { label: 'Ganancia', color: '#10b981' },
} satisfies ChartConfig;

function VentasPorDia({ datos }: { datos: ResumenAlmacen['ventas_por_dia'] }) {
    const [rango, setRango] = useState<RangoVentas>('todo');
    const visibles = useMemo(() => (rango === 'todo' ? datos : datos.slice(-Number(rango))), [datos, rango]);
    const venta = visibles.reduce((suma, dia) => suma + dia.venta, 0);
    const ganancia = visibles.reduce((suma, dia) => suma + dia.ganancia, 0);

    return (
        <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 border-b pb-5">
                <div className="grid flex-1 gap-1">
                    <CardTitle>Ventas por día</CardTitle>
                    <CardDescription>
                        {datos.length === 0
                            ? 'Este almacén no tiene ventas completadas todavía'
                            : `Vendido: ${usd(venta)} · ganancia: ${usd(ganancia)} — cada día se divide en costo y ganancia`}
                    </CardDescription>
                </div>
                {datos.length > 0 && (
                    <Select value={rango} onValueChange={(valor) => setRango(valor as RangoVentas)}>
                        <SelectTrigger className="w-[150px] rounded-lg" aria-label="Rango de días">
                            <SelectValue placeholder="Todo el período" />
                        </SelectTrigger>
                        <SelectContent align="end" className="rounded-xl">
                            <SelectItem value="todo" className="rounded-lg">
                                Todo el período
                            </SelectItem>
                            <SelectItem value="14" className="rounded-lg">
                                Últimos 14 días
                            </SelectItem>
                            <SelectItem value="7" className="rounded-lg">
                                Últimos 7 días
                            </SelectItem>
                        </SelectContent>
                    </Select>
                )}
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                {datos.length === 0 ? (
                    <div className="text-muted-foreground flex h-[260px] items-center justify-center rounded-lg border border-dashed text-sm">
                        Sin ventas para graficar
                    </div>
                ) : (
                    <ChartContainer config={configVentas} className="aspect-auto h-[260px] w-full">
                        <AreaChart data={visibles}>
                            <defs>
                                <linearGradient id="fillCosto" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-costo)" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="var(--color-costo)" stopOpacity={0.1} />
                                </linearGradient>
                                <linearGradient id="fillGanancia" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-ganancia)" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="var(--color-ganancia)" stopOpacity={0.1} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="fecha" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={fechaCorta} />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="dot" labelFormatter={(valor) => fechaLarga(String(valor))} />}
                            />
                            <Area dataKey="costo" type="monotone" fill="url(#fillCosto)" stroke="var(--color-costo)" stackId="ventas" />
                            <Area dataKey="ganancia" type="monotone" fill="url(#fillGanancia)" stroke="var(--color-ganancia)" stackId="ventas" />
                            <ChartLegend content={<ChartLegendContent />} />
                        </AreaChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}

const configPrecios = {
    cantidad: { label: 'Productos' },
    con_precio: { label: 'Con precio', color: '#10b981' },
    sin_precio: { label: 'Sin precio', color: '#f59e0b' },
} satisfies ChartConfig;

function CoberturaDePrecios({ precios }: { precios: ResumenAlmacen['precios'] }) {
    const total = precios.con_precio + precios.sin_precio;
    const porcentaje = total > 0 ? Math.round((precios.con_precio / total) * 100) : 0;
    const datos = [
        { tipo: 'con_precio', cantidad: precios.con_precio, fill: 'var(--color-con_precio)' },
        { tipo: 'sin_precio', cantidad: precios.sin_precio, fill: 'var(--color-sin_precio)' },
    ];

    return (
        <Card className="lg:col-span-1">
            <CardHeader className="border-b pb-5">
                <CardTitle>Cobertura de precios</CardTitle>
                <CardDescription>Productos con precio de venta</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                {total === 0 ? (
                    <div className="text-muted-foreground flex h-[220px] items-center justify-center rounded-lg border border-dashed text-sm">
                        Sin productos con stock
                    </div>
                ) : (
                    <ChartContainer config={configPrecios} className="mx-auto aspect-square h-[220px] w-full">
                        <PieChart>
                            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                            <Pie data={datos} dataKey="cantidad" nameKey="tipo" innerRadius={60} strokeWidth={5}>
                                <ChartLabel
                                    content={({ viewBox }: { viewBox?: ChartProps['viewBox'] }) => {
                                        if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                            return (
                                                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                                                        {porcentaje}%
                                                    </tspan>
                                                    <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-muted-foreground text-xs">
                                                        con precio
                                                    </tspan>
                                                </text>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </Pie>
                        </PieChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}

const configCategorias = {
    costo: { label: 'Costo', color: '#8b5cf6' },
} satisfies ChartConfig;

function CostoPorCategoria({ categorias }: { categorias: ResumenAlmacen['categorias'] }) {
    return (
        <Card className="lg:col-span-2">
            <CardHeader className="border-b pb-5">
                <CardTitle>Costo por categoría</CardTitle>
                <CardDescription>Dónde está el dinero invertido en este almacén</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                {categorias.length === 0 ? (
                    <div className="text-muted-foreground flex h-[180px] items-center justify-center rounded-lg border border-dashed text-sm">
                        Sin productos con stock
                    </div>
                ) : (
                    <ChartContainer
                        config={configCategorias}
                        className="aspect-auto w-full"
                        style={{ height: Math.max(180, categorias.length * 36) }}
                    >
                        <BarChart data={categorias} layout="vertical" margin={{ left: 0, right: 16 }}>
                            <CartesianGrid horizontal={false} />
                            <YAxis
                                dataKey="categoria"
                                type="category"
                                tickLine={false}
                                axisLine={false}
                                width={130}
                                tickFormatter={(valor: string) => (valor.length > 18 ? `${valor.slice(0, 17)}…` : valor)}
                                tick={{ className: 'fill-foreground text-xs' }}
                            />
                            <XAxis type="number" hide />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                            <Bar dataKey="costo" fill="var(--color-costo)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}

function FilaEstado({
    icono,
    titulo,
    detalle,
    badge,
    enlace,
}: {
    icono: ReactNode;
    titulo: string;
    detalle: string;
    badge: string;
    enlace?: { href: string; texto: string };
}) {
    return (
        <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full">{icono}</div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{titulo}</p>
                <p className="text-muted-foreground text-xs">{detalle}</p>
            </div>
            <Badge variant="outline" className="shrink-0 tabular-nums">
                {badge}
            </Badge>
            {enlace && (
                <Link href={enlace.href} className="text-primary shrink-0 text-xs font-medium underline-offset-4 hover:underline">
                    {enlace.texto}
                </Link>
            )}
        </div>
    );
}

function EstadoDelAlmacen({ resumen }: { resumen: ResumenAlmacen }) {
    const { precios, estado, fusionables } = resumen;

    return (
        <Card className="lg:col-span-2">
            <CardHeader className="border-b pb-5">
                <CardTitle>Estado del almacén</CardTitle>
                <CardDescription>Lo que conviene revisar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
                <FilaEstado
                    icono={<Tags className="h-4 w-4" />}
                    titulo="Sin precio de venta"
                    detalle={`${num(precios.unidades_sin_precio)} unidades · costo ${usd(precios.costo_sin_precio)} sin precio`}
                    badge={cuenta(precios.sin_precio, 'producto', 'productos')}
                    enlace={precios.sin_precio > 0 ? { href: route('disponibles.index'), texto: 'Poner precios' } : undefined}
                />
                <FilaEstado
                    icono={<AlertTriangle className="h-4 w-4" />}
                    titulo="Stock bajo"
                    detalle={`${num(estado.stock_bajo.unidades)} unidades en total · menos de 5 por producto`}
                    badge={cuenta(estado.stock_bajo.productos, 'producto', 'productos')}
                />
                <FilaEstado
                    icono={<PackageX className="h-4 w-4" />}
                    titulo="Sin stock"
                    detalle="Asignados al almacén, sin unidades"
                    badge={cuenta(estado.sin_stock, 'producto', 'productos')}
                />
                <FilaEstado
                    icono={<Truck className="h-4 w-4" />}
                    titulo="En tránsito"
                    detalle={`${num(estado.en_transito.unidades)} unidades reservadas en traslados`}
                    badge={cuenta(estado.en_transito.movimientos_abiertos, 'movimiento abierto', 'movimientos abiertos')}
                    enlace={estado.en_transito.movimientos_abiertos > 0 ? { href: route('movimientos.index'), texto: 'Ver movimientos' } : undefined}
                />
                <FilaEstado
                    icono={<GitMerge className="h-4 w-4" />}
                    titulo="Lotes a distinto costo"
                    detalle="Productos con 2+ lotes a costos distintos, que se pueden fusionar"
                    badge={cuenta(fusionables.productos_con_varios_costos, 'producto', 'productos')}
                    enlace={fusionables.productos_con_varios_costos > 0 ? { href: route('disponibles.index'), texto: 'Fusionar lotes' } : undefined}
                />
                <FilaEstado
                    icono={<Layers className="h-4 w-4" />}
                    titulo="Fichas repetidas"
                    detalle="Mismo producto registrado más de una vez con stock aquí"
                    badge={cuenta(fusionables.grupos_de_fichas_repetidas, 'grupo', 'grupos')}
                    enlace={fusionables.grupos_de_fichas_repetidas > 0 ? { href: route('productos.index'), texto: 'Limpiar duplicados' } : undefined}
                />
            </CardContent>
        </Card>
    );
}

function ResumenCargando() {
    return (
        <div className="space-y-4" aria-busy="true" aria-label="Cargando resumen del almacén">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[0, 1, 2, 3].map((indice) => (
                    <Skeleton key={indice} className="h-28 rounded-lg" />
                ))}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <Skeleton className="h-80 rounded-lg lg:col-span-3" />
                <Skeleton className="h-80 rounded-lg lg:col-span-1" />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                <Skeleton className="h-72 rounded-lg lg:col-span-2" />
                <Skeleton className="h-72 rounded-lg lg:col-span-2" />
            </div>
        </div>
    );
}

export function ResumenPorAlmacen({ almacenes }: { almacenes: AlmacenOpcion[] }) {
    const [abierto, setAbierto] = useState(true);
    const [almacenId, setAlmacenId] = useState<number | null>(null);
    const [resumen, setResumen] = useState<ResumenAlmacen | null>(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const seleccionado = almacenes.find((almacen) => almacen.id === almacenId) ?? null;

    useEffect(() => {
        if (almacenId === null) {
            return;
        }

        const controlador = new AbortController();
        setCargando(true);
        setError(null);

        fetch(route('logistica.almacen.resumen', { almacen: almacenId }), {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            signal: controlador.signal,
        })
            .then(async (respuesta) => {
                if (!respuesta.ok) {
                    throw new Error(`HTTP ${respuesta.status}`);
                }

                setResumen((await respuesta.json()) as ResumenAlmacen);
            })
            .catch((fallo: Error) => {
                if (fallo.name !== 'AbortError') {
                    setResumen(null);
                    setError('No se pudo cargar el resumen de este almacén. Inténtalo de nuevo.');
                }
            })
            .finally(() => {
                if (!controlador.signal.aborted) {
                    setCargando(false);
                }
            });

        return () => controlador.abort();
    }, [almacenId]);

    return (
        <Collapsible open={abierto} onOpenChange={setAbierto} className="col-span-full">
            <Card className="overflow-hidden border-l-4 border-violet-500/30 pt-0 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="border-b bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                            <Warehouse className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-white">Resumen por Almacén</CardTitle>
                            <CardDescription className="text-violet-100">Valor, precios, estado del stock y ventas de un almacén</CardDescription>
                        </div>
                        <CollapsibleTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/20 hover:text-white"
                                aria-label={abierto ? 'Ocultar resumen por almacén' : 'Mostrar resumen por almacén'}
                            >
                                <ChevronDown className={`h-5 w-5 transition-transform ${abierto ? 'rotate-180' : ''}`} />
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                </CardHeader>

                <CollapsibleContent>
                    <CardContent className="space-y-4">
                        <div className="max-w-sm">
                            <Label htmlFor="almacen-resumen" className="text-muted-foreground mb-1.5 block text-xs">
                                Almacén
                            </Label>
                            <Combobox
                                items={almacenes}
                                itemToStringLabel={(almacen: AlmacenOpcion) => almacen.nombre_almacen}
                                itemToStringValue={(almacen: AlmacenOpcion) => almacen.nombre_almacen}
                                value={seleccionado}
                                onValueChange={(almacen: AlmacenOpcion | null) => setAlmacenId(almacen ? almacen.id : null)}
                            >
                                <ComboboxInput
                                    id="almacen-resumen"
                                    className="w-full"
                                    placeholder="Elige un almacén..."
                                    onFocus={(evento) => evento.currentTarget.select()}
                                />
                                <ComboboxContent>
                                    <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                                    <ComboboxList>
                                        {(almacen: AlmacenOpcion) => (
                                            <ComboboxItem key={almacen.id} value={almacen}>
                                                {almacen.nombre_almacen}
                                            </ComboboxItem>
                                        )}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                        </div>

                        {almacenId === null && (
                            <div className="text-muted-foreground flex h-40 items-center justify-center rounded-lg border border-dashed text-sm">
                                Elige un almacén para ver su resumen
                            </div>
                        )}

                        {almacenId !== null && cargando && <ResumenCargando />}

                        {almacenId !== null && !cargando && error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                                {error}
                            </div>
                        )}

                        {almacenId !== null && !cargando && !error && resumen && resumen.almacen.id === almacenId && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                    <KpiCard
                                        titulo="Valor a costo"
                                        valor={usd(resumen.kpis.valor_costo)}
                                        detalle={`${num(resumen.kpis.productos)} productos · ${num(resumen.kpis.unidades)} unidades`}
                                        color="emerald"
                                    />
                                    <KpiCard
                                        titulo="Valor a venta"
                                        valor={usd(resumen.kpis.valor_venta)}
                                        detalle={`Solo los ${num(resumen.precios.con_precio)} productos con precio`}
                                        color="indigo"
                                    />
                                    <KpiCard
                                        titulo="Margen potencial"
                                        valor={usd(resumen.kpis.margen)}
                                        detalle={
                                            resumen.kpis.margen_porcentaje === null
                                                ? 'Sin productos con precio todavía'
                                                : `${resumen.kpis.margen_porcentaje.toLocaleString('de-DE')}% sobre lo que ya tiene precio`
                                        }
                                        color="violet"
                                    />
                                    <KpiCard
                                        titulo="Con precio de venta"
                                        valor={`${num(resumen.precios.con_precio)} de ${num(resumen.kpis.productos)}`}
                                        detalle={`${num(resumen.precios.sin_precio)} sin precio`}
                                        color="cyan"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                                    <VentasPorDia key={`ventas-${resumen.almacen.id}`} datos={resumen.ventas_por_dia} />
                                    <CoberturaDePrecios key={`precios-${resumen.almacen.id}`} precios={resumen.precios} />
                                </div>

                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                                    <CostoPorCategoria categorias={resumen.categorias} />
                                    <EstadoDelAlmacen resumen={resumen} />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}
