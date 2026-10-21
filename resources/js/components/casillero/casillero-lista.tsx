import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ChevronDown, PlaneLanding, XCircle } from 'lucide-react';
import { Fragment, useState } from 'react';
import { CargoCasillero, CompraCasillero, formatearFecha, formatearUsd } from './tipos-casillero';

interface CasilleroListaProps {
    compras: CompraCasillero[];
    seleccionadas: number[];
    onAlternar: (compraId: number) => void;
    onAlternarTodas: () => void;
    onAnotarLlegada: (compra: CompraCasillero) => void;
    onAnularCargo: (cargo: CargoCasillero) => void;
}

/** Compras que esperan en Panamá: se marcan para anotarles un cargo y se abren para ver sus líneas y cargos. */
export default function CasilleroLista({ compras, seleccionadas, onAlternar, onAlternarTodas, onAnotarLlegada, onAnularCargo }: CasilleroListaProps) {
    const [abiertas, setAbiertas] = useState<number[]>([]);

    const alternarFila = (id: number) =>
        setAbiertas((anteriores) => (anteriores.includes(id) ? anteriores.filter((x) => x !== id) : [...anteriores, id]));

    const todasMarcadas = compras.length > 0 && seleccionadas.length === compras.length;

    return (
        <div className="overflow-x-auto rounded-lg border">
            <Table>
                <TableHeader className="bg-muted">
                    <TableRow>
                        <TableHead className="w-10">
                            <Checkbox checked={todasMarcadas} onCheckedChange={onAlternarTodas} aria-label="Marcar todas las compras" />
                        </TableHead>
                        <TableHead>Compra</TableHead>
                        <TableHead>Asociado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Llegó a Panamá</TableHead>
                        <TableHead className="text-right">Unidades</TableHead>
                        <TableHead className="text-right">Mercancía</TableHead>
                        <TableHead className="text-right">Cargos</TableHead>
                        <TableHead className="w-10" />
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {compras.map((compra) => {
                        const abierta = abiertas.includes(compra.id);
                        const unidades = compra.productos.reduce((total, p) => total + p.cantidad, 0);
                        const enContenedor = unidades - compra.unidades_en_casillero;

                        return (
                            <Fragment key={compra.id}>
                                <TableRow data-state={seleccionadas.includes(compra.id) ? 'selected' : undefined}>
                                    <TableCell>
                                        <Checkbox
                                            checked={seleccionadas.includes(compra.id)}
                                            onCheckedChange={() => onAlternar(compra.id)}
                                            aria-label={`Marcar la compra ${compra.id}`}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">#{compra.id}</TableCell>
                                    <TableCell>{compra.proveedor ?? 'Sin registro'}</TableCell>
                                    <TableCell>{formatearFecha(compra.fecha_compra)}</TableCell>
                                    <TableCell>
                                        {compra.llegada_panama_at ? (
                                            <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2" onClick={() => onAnotarLlegada(compra)}>
                                                <Badge className="border-sky-400/30 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                                                    <PlaneLanding /> {formatearFecha(compra.llegada_panama_at)}
                                                </Badge>
                                            </Button>
                                        ) : (
                                            <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={() => onAnotarLlegada(compra)}>
                                                <PlaneLanding className="h-3.5 w-3.5" /> Anotar llegada
                                            </Button>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {enContenedor > 0 ? (
                                            <span title={`${enContenedor} ya subieron a un contenedor`}>
                                                {compra.unidades_en_casillero} <span className="text-muted-foreground">de {unidades}</span>
                                            </span>
                                        ) : (
                                            unidades
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">{formatearUsd(compra.valor_en_casillero)}</TableCell>
                                    <TableCell className="text-right">
                                        {compra.cargos_usd > 0 ? (
                                            <Badge className="border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                                {formatearUsd(compra.cargos_usd)}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => alternarFila(compra.id)}
                                            aria-label={abierta ? 'Ocultar el detalle' : 'Ver el detalle'}
                                            aria-expanded={abierta}
                                        >
                                            <ChevronDown className={cn('h-4 w-4 transition-transform', abierta && 'rotate-180')} />
                                        </Button>
                                    </TableCell>
                                </TableRow>

                                {abierta && (
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableCell />
                                        <TableCell colSpan={8}>
                                            <div className="grid gap-6 py-2 lg:grid-cols-2">
                                                <div>
                                                    <p className="mb-2 text-sm font-semibold">Productos</p>
                                                    <ul className="space-y-1 text-sm">
                                                        {compra.productos.map((producto, indice) => (
                                                            <li key={indice} className="flex items-center justify-between gap-3">
                                                                <span>
                                                                    {producto.nombre_producto}
                                                                    {producto.marca_producto ? ` · ${producto.marca_producto}` : ''}
                                                                    {producto.modelo_producto ? ` ${producto.modelo_producto}` : ''}
                                                                </span>
                                                                <span className="text-muted-foreground whitespace-nowrap">
                                                                    {producto.en_casillero < producto.cantidad
                                                                        ? `${producto.en_casillero} de ${producto.cantidad}`
                                                                        : producto.cantidad}{' '}
                                                                    × {formatearUsd(producto.precio)} ={' '}
                                                                    <strong className="text-foreground">
                                                                        {formatearUsd(producto.en_casillero * producto.precio)}
                                                                    </strong>
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <p className="mb-2 text-sm font-semibold">Cargos</p>
                                                    {compra.cargos.length === 0 ? (
                                                        <p className="text-muted-foreground text-sm">Todavía no tiene cargos.</p>
                                                    ) : (
                                                        <ul className="space-y-1 text-sm">
                                                            {compra.cargos.map((cargo) => (
                                                                <li key={cargo.id} className="flex items-center justify-between gap-3">
                                                                    <span>
                                                                        {cargo.concepto}{' '}
                                                                        <span className="text-muted-foreground">· {formatearFecha(cargo.fecha)}</span>
                                                                    </span>
                                                                    <span className="flex items-center gap-2 whitespace-nowrap">
                                                                        <strong>{formatearUsd(cargo.monto_usd)}</strong>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7 text-red-600 hover:text-red-700"
                                                                            onClick={() => onAnularCargo(cargo)}
                                                                            aria-label={`Anular el cargo ${cargo.concepto}`}
                                                                        >
                                                                            <XCircle className="h-4 w-4" />
                                                                        </Button>
                                                                    </span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
