import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PackageMinus, Users } from 'lucide-react';

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

/** Ventas que otra persona hizo desde un almacén del vendedor: su stock bajó sin que él las hiciera. */
export interface VentasEnMiAlmacen {
    visible: boolean;
    items: Array<{
        venta_id: number;
        fecha: string;
        usuario_nombre: string;
        almacen: string | null;
        estado: string;
        revertida: boolean;
        unidades: number;
        productos: Array<{
            nombre: string | null;
            codigo: string | null;
            imagen_url: string | null;
            categoria: string | null;
            marca: string | null;
            modelo: string | null;
            capacidad: string | null;
            color: string | null;
            cantidad: number;
            stock_actual: number;
        }>;
    }>;
    resumen: { ventas: number; unidades: number };
}

/** Un dato del producto o un guion si no tiene (vacío o "N/A"). */
function valorONada(valor: string | null | undefined): string {
    return valor && valor.trim().toUpperCase() !== 'N/A' ? valor : '—';
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
                <Badge className="border border-violet-400/30 bg-violet-500/10 text-violet-700 backdrop-blur-sm dark:text-violet-300">
                    {etiquetaPropio}
                </Badge>
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
 * Card "Ventas en tu almacén" (ámbar): lo que otros vendieron de los almacenes del vendedor en el periodo. Es solo
 * informativo: el dinero no entró a sus cuentas, así que no cambia su caja ni sus comisiones. Las anuladas o devueltas
 * se listan tachadas y no suman. No se dibuja si el cierre no es de un vendedor (`visible` falso).
 */
export function TarjetaVentasEnMiAlmacen({ datos }: { datos: VentasEnMiAlmacen | null | undefined }) {
    if (!datos?.visible) {
        return null;
    }

    // Una fila por producto vendido, con los datos de su venta (quién, cuándo y si se revirtió).
    const lineas = datos.items.flatMap((venta) => venta.productos.map((producto) => ({ venta, producto })));

    return (
        <Card className="gap-0 overflow-hidden border-l-4 border-amber-500/30 py-0 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="border-b bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5 text-white">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                            <PackageMinus className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-white">Ventas en tu almacén</CardTitle>
                            <CardDescription className="text-amber-50">
                                Productos que otros vendieron de tu almacén en el turno. Solo informativo: altera tu inventario, no tu caja ni tus
                                comisiones.
                            </CardDescription>
                        </div>
                    </div>
                    <Badge className="border border-white/30 bg-white/15 font-mono whitespace-nowrap text-white">
                        {datos.resumen.ventas} {datos.resumen.ventas === 1 ? 'venta' : 'ventas'} · {datos.resumen.unidades}{' '}
                        {datos.resumen.unidades === 1 ? 'unidad' : 'unidades'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">Producto</th>
                                <th className="px-4 py-3 text-left font-semibold">Categoría</th>
                                <th className="px-4 py-3 text-left font-semibold">Marca</th>
                                <th className="px-4 py-3 text-left font-semibold">Modelo</th>
                                <th className="px-4 py-3 text-left font-semibold">Capacidad</th>
                                <th className="px-4 py-3 text-center font-semibold">Cantidad</th>
                                <th className="px-4 py-3 text-left font-semibold">Venta</th>
                                <th className="px-4 py-3 text-left font-semibold">Vendió</th>
                                <th className="px-4 py-3 text-right font-semibold">Hoy hay en el almacén</th>
                            </tr>
                        </thead>
                        <tbody className="divide-border divide-y">
                            {lineas.length > 0 ? (
                                lineas.map(({ venta, producto }, indice) => (
                                    <tr
                                        key={`${venta.venta_id}-${indice}`}
                                        className={`hover:bg-muted/50 transition-colors ${venta.revertida ? 'opacity-60' : ''}`}
                                    >
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-3">
                                                {producto.imagen_url ? (
                                                    <img
                                                        src={producto.imagen_url}
                                                        alt={producto.nombre ?? 'Producto'}
                                                        className="h-10 w-10 rounded-md object-cover"
                                                    />
                                                ) : (
                                                    <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-md">
                                                        <PackageMinus className="text-muted-foreground h-4 w-4" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className={`font-semibold ${venta.revertida ? 'line-through' : ''}`}>
                                                        {producto.nombre ?? 'Producto'}
                                                    </div>
                                                    <div className="text-muted-foreground text-xs">{producto.codigo}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="text-muted-foreground px-4 py-2">{valorONada(producto.categoria)}</td>
                                        <td className="text-muted-foreground px-4 py-2">{valorONada(producto.marca)}</td>
                                        <td className="text-muted-foreground px-4 py-2">{valorONada(producto.modelo)}</td>
                                        <td className="text-muted-foreground px-4 py-2">{valorONada(producto.capacidad)}</td>
                                        <td className="px-4 py-2 text-center">
                                            <Badge className="border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 font-bold text-amber-700 backdrop-blur-sm dark:text-amber-300">
                                                {producto.cantidad}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="font-mono font-semibold">#{venta.venta_id}</div>
                                            <div className="text-muted-foreground font-mono text-xs">{venta.fecha}</div>
                                            {venta.revertida && (
                                                <Badge className="mt-1 border border-emerald-400/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300">
                                                    {venta.estado === 'devuelta' ? 'Devuelta: el stock volvió' : 'Anulada: el stock volvió'}
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">{venta.usuario_nombre}</td>
                                        <td className="px-4 py-2 text-right">
                                            {venta.revertida ? (
                                                <span className="text-muted-foreground">—</span>
                                            ) : (
                                                <Badge className="border border-emerald-400/30 bg-emerald-500/10 font-mono text-emerald-700 backdrop-blur-sm dark:text-emerald-300">
                                                    {producto.stock_actual}
                                                </Badge>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} className="text-muted-foreground px-4 py-8 text-center italic">
                                        Nadie más vendió de tu almacén en este periodo
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-muted/50">
                            <tr>
                                <td colSpan={5} className="px-4 py-3 text-right font-bold">
                                    Total
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <Badge className="border-0 bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-0.5 font-black text-white shadow-md shadow-amber-500/30">
                                        {datos.resumen.unidades}
                                    </Badge>
                                </td>
                                <td colSpan={3} className="px-4 py-3"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </CardContent>
        </Card>
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
