import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Boxes, CalendarClock, Container, Pencil, Receipt, XCircle } from 'lucide-react';
import { CargoCasillero, ContenedorCasillero, formatearFecha, formatearUsd } from './tipos-casillero';

interface ContenedorCardProps {
    contenedor: ContenedorCasillero;
    onEditar: (contenedor: ContenedorCasillero) => void;
    onAsignar: (contenedor: ContenedorCasillero) => void;
    onAnotarCargo: (contenedor: ContenedorCasillero) => void;
    onAnularCargo: (cargo: CargoCasillero) => void;
    onCancelar: (contenedor: ContenedorCasillero) => void;
}

/** Un contenedor abierto: lo que lleva, sus cargos y las acciones para armarlo. */
export default function ContenedorCard({ contenedor, onEditar, onAsignar, onAnotarCargo, onAnularCargo, onCancelar }: ContenedorCardProps) {
    return (
        <Card className="overflow-hidden border-l-4 border-violet-500/30 pt-0 shadow-sm">
            <CardHeader className="border-b bg-gradient-to-r from-violet-600 to-indigo-700 px-6 py-5 text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                            <Container className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="flex items-center gap-2 text-white">
                                {contenedor.nombre}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-white hover:bg-white/20 hover:text-white"
                                    onClick={() => onEditar(contenedor)}
                                    aria-label="Editar el contenedor"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                            </CardTitle>
                            <CardDescription className="flex flex-wrap items-center gap-x-3 text-violet-100">
                                <span className="flex items-center gap-1">
                                    <CalendarClock className="h-3.5 w-3.5" />
                                    {contenedor.fecha_salida ? `Sale el ${formatearFecha(contenedor.fecha_salida)}` : 'Sin fecha de salida'}
                                </span>
                                {contenedor.notas && <span>· {contenedor.notas}</span>}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            size="sm"
                            className="gap-1.5 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                            onClick={() => onAsignar(contenedor)}
                        >
                            <Boxes className="h-4 w-4" /> Unidades
                        </Button>
                        <Button
                            size="sm"
                            className="gap-1.5 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                            onClick={() => onAnotarCargo(contenedor)}
                        >
                            <Receipt className="h-4 w-4" /> Anotar cargo
                        </Button>
                        <Button
                            size="sm"
                            className="gap-1.5 bg-white/20 text-white backdrop-blur-sm hover:bg-red-500/60"
                            onClick={() => onCancelar(contenedor)}
                        >
                            <XCircle className="h-4 w-4" /> Cancelar
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="grid gap-6 pt-6 lg:grid-cols-2">
                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold">Lo que lleva</p>
                        <Badge className="border-indigo-400/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
                            {contenedor.unidades} unidades · {formatearUsd(contenedor.valor_mercancia_usd)}
                        </Badge>
                    </div>
                    {contenedor.lineas.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            Todavía no tiene unidades: usa «Unidades» para subirle lo que espera en el casillero.
                        </p>
                    ) : (
                        <ul className="space-y-1.5 text-sm">
                            {contenedor.lineas.map((linea) => (
                                <li key={linea.compra_producto_id} className="flex items-center justify-between gap-3">
                                    <span className="min-w-0 truncate">
                                        {linea.producto ?? 'Producto'} <span className="text-muted-foreground">· compra #{linea.compra_id}</span>
                                    </span>
                                    <span className="text-muted-foreground whitespace-nowrap">
                                        {linea.cantidad} × {formatearUsd(linea.precio)} ={' '}
                                        <strong className="text-foreground">{formatearUsd(linea.valor)}</strong>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold">Cargos del contenedor</p>
                        {contenedor.cargos_usd > 0 && (
                            <Badge className="border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                {formatearUsd(contenedor.cargos_usd)}
                            </Badge>
                        )}
                    </div>
                    {contenedor.cargos.length === 0 ? (
                        <p className="text-muted-foreground text-sm">Todavía no tiene cargos.</p>
                    ) : (
                        <ul className="space-y-1.5 text-sm">
                            {contenedor.cargos.map((cargo) => (
                                <li key={cargo.id} className="flex items-center justify-between gap-3">
                                    <span>
                                        {cargo.concepto} <span className="text-muted-foreground">· {formatearFecha(cargo.fecha)}</span>
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
            </CardContent>
        </Card>
    );
}
