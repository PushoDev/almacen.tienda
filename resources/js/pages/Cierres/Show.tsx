import HeadingSmall from '@/components/heading-small';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import * as Collapsible from '@radix-ui/react-collapsible';
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DollarSign,
  Eye,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';

interface TransferenciaItem {
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
  tasa_cambio: number;
  hora: string;
  afecta_saldo_usuario?: boolean;
  es_entrada?: boolean;
}

interface ItemVenta {
  id: string;
  venta_id?: string;
  monto: number;
  monto_equivalente?: number;
  tipo_pago: string;
  confirmada?: boolean;
  referencia?: string;
  cliente: string;
  hora: string;
  detalles?: any;
  moneda_codigo?: string;
  via_pago?: string | null;
  cuenta_nombre?: string | null;
  cliente_nombre?: string | null;
  destino_nombre?: string | null;
}

interface DetalleMoneda {
  moneda: string;
  tasa_cambio: number;
  ventas_efectivo: number;
  ventas_transferencia: number;
  ingresos_extra: number;
  gastos: number;
  transferencias_salientes: number;
  transferencias_entrantes: number;
  saldo_calculado: number;
  items_ventas: ItemVenta[];
  items_gastos: Array<{ id?: string; desc: string; monto: number; hora: string }>;
  items_ingresos: Array<{ id?: string; desc: string; monto: number; hora: string }>;
  items_transferencias: Array<{ id: string; desc: string; monto: number; hora: string }>;
  items_transferencias_salientes: TransferenciaItem[];
  items_transferencias_entrantes: TransferenciaItem[];
  productos_resumen?: Record<string, any>;
  operaciones_detalle?: any[];
}

interface Cierre {
  id: number;
  user_id?: number;
  revisor_id?: number;
  fecha_apertura: string;
  fecha_cierre: string;
  saldo_inicial?: number;
  ventas_efectivo?: number;
  ventas_otros?: number;
  total_gastos?: number;
  total_devoluciones?: number;
  saldo_esperado?: number;
  saldo_contado?: number;
  diferencia?: number;
  observaciones?: string | null;
  estado?: string;
  usuario?: { name: string };
  revisor?: { name: string } | null;
  confirmacion_transferencias?: string[];
  detalles?: DetalleMoneda[] | null;
}

interface Props extends PageProps {
  cierre: Cierre;
}

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Cierres de Caja', href: '/vendor/cierres' },
  { title: 'Detalle de Cierre', href: '#' },
];

export default function Show({ cierre }: Props) {
  const [showTransaccionesDialog, setShowTransaccionesDialog] = useState(false);
  const moneda_referencia = 'USD';

  // Mapear cierre a estructura similar a calculos usada en Create.tsx
  const calculos = useMemo(() => {
    return {
      saldo_inicial: cierre.saldo_inicial || 0,
      ventas_efectivo: cierre.ventas_efectivo || 0,
      ventas_otros: cierre.ventas_otros || 0,
      total_gastos: cierre.total_gastos || 0,
      total_devoluciones: cierre.total_devoluciones || 0,
      saldo_esperado_global: cierre.saldo_esperado || 0,
      detalles: cierre.detalles || [],
      transferencias_resumen: undefined,
    } as any;
  }, [cierre]);

  // Todas las ventas de todas las monedas juntas
  const todosItemsVentas = (calculos.detalles ?? []).flatMap((d: any) => d.items_ventas ?? []);
  const ventaIdsUnicos = new Set(todosItemsVentas.map((v: ItemVenta) => v.venta_id || v.id));
  const totalVentasUnicas = ventaIdsUnicos.size;

  const lineasProductosRaw = (calculos.detalles ?? []).flatMap((d: any) => Object.values(d.productos_resumen ?? {}));
  const lineasProductos = lineasProductosRaw.map((p: any) => ({
    cantidad: Number(p.cantidad) || 0,
    descripcion: (p.nombre || '') + (p.detalles ? ` ${p.detalles}` : ''),
    precio_unitario: Number(p.precio) || 0,
    total: Number(p.total) || 0,
    precio_equivalente: Number(p.precio) || 0,
    total_equivalente: Number(p.total) || 0,
  }));
  const totalVentasProductos = lineasProductos.reduce((s, r) => s + (r.total_equivalente ?? r.total ?? 0), 0);

  const pagosPorMonedaYMetodo = todosItemsVentas.reduce(
    (acc: Record<string, Record<string, { total: number; cantidad: number; totalEquivalente: number }>>, p: any) => {
      const moneda = p.moneda_codigo ?? p.moneda ?? 'USD';
      const via = (p.via_pago || '').toString().trim().toUpperCase();
      const destino = (p.destino_nombre || '').toString().trim();
      let etiqueta: string;
      if (p.tipo_pago === 'efectivo') etiqueta = moneda;
      else etiqueta = via ? (destino ? `${via} ${destino}` : via) : destino ? `Transferencia ${destino}` : `Transferencia ${moneda}`;
      if (!acc[moneda]) acc[moneda] = {};
      if (!acc[moneda][etiqueta]) acc[moneda][etiqueta] = { total: 0, cantidad: 0, totalEquivalente: 0 };
      const monto = Number(p.monto) || 0;
      const equivalente = Number(p.monto_equivalente) || monto;
      acc[moneda][etiqueta].total += monto;
      acc[moneda][etiqueta].totalEquivalente += equivalente;
      acc[moneda][etiqueta].cantidad += 1;
      return acc;
    },
    {},
  );

  const monedasConPagos = Object.keys(pagosPorMonedaYMetodo).sort();

  const totalGastos = (calculos.detalles ?? []).reduce((sum: number, d: any) => sum + (d.gastos || 0), 0);
  const totalIngresos = (calculos.detalles ?? []).reduce((sum: number, d: any) => sum + (d.ingresos_extra || 0), 0);
  const totalTransferencias = (calculos.detalles ?? []).reduce((sum: number, d: any) => sum + (d.transferencias_salientes || 0), 0);

  const todosGastos = (calculos.detalles ?? []).flatMap((d: any) => d.items_gastos ?? []);
  const todosIngresos = (calculos.detalles ?? []).flatMap((d: any) => d.items_ingresos ?? []);
  const todasTransferencias = (calculos.detalles ?? []).flatMap((d: any) => [...(d.items_transferencias_salientes ?? []), ...(d.items_transferencias_entrantes ?? [])]);

  // transferencias resumen por moneda
  const transferenciasResumen = (calculos.detalles ?? []).reduce((acc: Record<string, any>, d: any) => {
    const moneda = d.moneda || 'USD';
    if (!acc[moneda]) acc[moneda] = { tasa: d.tasa_cambio || 1, salientes: 0, entrantes: 0, neto: 0, items_salientes: [], items_entrantes: [] };
    acc[moneda].salientes += Number(d.transferencias_salientes || 0);
    acc[moneda].entrantes += Number(d.transferencias_entrantes || 0);
    acc[moneda].neto = acc[moneda].entrantes - acc[moneda].salientes;
    acc[moneda].items_salientes = (acc[moneda].items_salientes || []).concat(d.items_transferencias_salientes || []);
    acc[moneda].items_entrantes = (acc[moneda].items_entrantes || []).concat(d.items_transferencias_entrantes || []);
    return acc;
  }, {} as Record<string, any>);

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Cierre #${cierre.id}`} />

      <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-6 p-4 md:p-6">
        {/* Header */}
        <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-6">
          <HeadingSmall title={`Reporte de Cierre #${cierre.id}`} description={`Auditoría detallada de movimientos realizados por ${cierre.usuario?.name || 'usuario'}.`} />
          <Wallet size={70} color="#d6d3d1" className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 transform opacity-40" />
        </div>

        {/* Widgets estadísticos (como Create.tsx) */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="border-emerald-200 bg-emerald-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <ShoppingCart className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Ventas Realizadas</p>
                  <p className="text-2xl font-bold">{totalVentasUnicas}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total Efectivo</p>
                  <p className="text-2xl font-bold">${Number(calculos.ventas_efectivo || 0).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Transferencias</p>
                  <p className="text-2xl font-bold">${Number(calculos.ventas_otros || 0).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <Banknote className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Monedas Usadas</p>
                  <p className="text-2xl font-bold">{monedasConPagos.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumen global */}
        <Card className="border-slate-200 bg-gradient-to-r from-slate-500/5 to-slate-100/50">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                  <Calculator className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground text-sm">Saldo Esperado en Caja</p>
                  </div>
                  <p className="text-3xl font-bold text-slate-700">${Number(calculos.saldo_esperado_global || 0).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span className="text-muted-foreground">Total Productos:</span>
                  <span className="font-semibold">{lineasProductos.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="text-muted-foreground">Métodos Pago:</span>
                  <span className="font-semibold">{monedasConPagos.length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">
            {/* Tabla Ventas (productos) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Ventas</CardTitle>
                <CardDescription>Productos vendidos en el turno. Importes en {moneda_referencia}.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Cantidad</TableHead>
                      <TableHead>Producto (detalles)</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineasProductos.length > 0 ? (
                      lineasProductos.map((linea, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{linea.cantidad}</TableCell>
                          <TableCell>{linea.descripcion}</TableCell>
                          <TableCell className="text-right">{(linea.total_equivalente !== undefined ? Number(linea.precio_equivalente) : Number(linea.precio_unitario)).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono">{(linea.total_equivalente !== undefined ? Number(linea.total_equivalente) : Number(linea.total)).toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground text-center italic">No hay ventas en este turno</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-bold">Total</TableCell>
                      <TableCell className="text-right font-mono font-bold">{Number(totalVentasProductos).toFixed(2)} {moneda_referencia}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>

            {/* Por dónde entraron */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" /> Por dónde entraron</CardTitle>
                <CardDescription>Cantidad de ventas y total por método, separado por moneda.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {monedasConPagos.length > 0 ? (
                  monedasConPagos.map((moneda) => {
                    const metodos = pagosPorMonedaYMetodo[moneda];
                    const totalMoneda = Object.values(metodos).reduce((s, x) => s + (Number(x.total) || 0), 0);
                    const cantidadMoneda = Object.values(metodos).reduce((s, x) => s + (x.cantidad || 0), 0);
                    const totalEquivalenteMoneda = Object.values(metodos).reduce((s, x) => s + (x.totalEquivalente || 0), 0);
                    const detalleMoneda = (calculos.detalles || []).find((d: any) => d.moneda === moneda);

                    return (
                      <div key={moneda} className="space-y-2">
                        <h4 className="text-muted-foreground text-sm font-semibold">{moneda}</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Método / Destino</TableHead>
                              <TableHead className="w-20 text-center">Ventas</TableHead>
                              <TableHead className="w-32 text-right">Total</TableHead>
                              <TableHead className="w-32 text-right">Equiv. USD</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(metodos).map(([etiqueta, data]) => {
                              const total = Number(data.total) || 0;
                              const totalEquivalente = Number(data.totalEquivalente) || 0;
                              const operacionesPorMetodo = (detalleMoneda?.operaciones_detalle || []).filter((op: any) => {
                                const via = (op.via_pago || '').toString().trim().toUpperCase();
                                const destino = (op.destino_nombre || '').toString().trim();
                                let etiquetaMetodo: string;
                                if (op.tipo_pago === 'efectivo') etiquetaMetodo = moneda;
                                else etiquetaMetodo = via ? (destino ? `${via} ${destino}` : via) : destino ? `Transferencia ${destino}` : `Transferencia ${moneda}`;
                                return etiquetaMetodo === etiqueta;
                              });

                              return (
                                <Collapsible.Root key={`${moneda}-${etiqueta}`}>
                                  <Collapsible.Trigger asChild>
                                    <TableRow className="hover:bg-muted/50 cursor-pointer">
                                      <TableCell className="flex items-center gap-2 font-medium">
                                        <ChevronDown className="collapsible-trigger-icon h-4 w-4 transition-transform" />
                                        <ChevronRight className="collapsible-trigger-icon[!hidden] h-4 w-4 transition-transform" />
                                        {etiqueta}
                                      </TableCell>
                                      <TableCell className="text-center font-mono">{data.cantidad}</TableCell>
                                      <TableCell className="text-right font-mono">{total.toFixed(2)}</TableCell>
                                      <TableCell className="text-right font-mono font-medium text-green-600">${totalEquivalente.toFixed(2)}</TableCell>
                                    </TableRow>
                                  </Collapsible.Trigger>
                                  <Collapsible.Content>
                                    <TableRow>
                                      <TableCell colSpan={4} className="bg-muted/30 p-0">
                                        <div className="border-muted-foreground/20 ml-4 space-y-2 border-l-2 p-2">
                                          {operacionesPorMetodo.length > 0 ? (
                                            operacionesPorMetodo.map((operacion: any, idx: number) => (
                                              <div key={idx} className="bg-card space-y-1 rounded-md border p-2 text-sm shadow-sm">
                                                <div className="flex items-center justify-between font-medium">
                                                  <span>Venta #{operacion.venta_id} - {operacion.cliente}</span>
                                                  <span className="font-mono">${Number(operacion.monto).toFixed(2)} - {operacion.hora}</span>
                                                </div>
                                                {(operacion.productos?.length ?? 0) > 0 && (
                                                  <div className="text-muted-foreground ml-4 space-y-1">
                                                    {operacion.productos?.map((prod: any, pidx: number) => (
                                                      <div key={pidx} className="flex justify-between text-xs">
                                                        <span>{prod.cantidad}x {prod.descripcion}</span>
                                                        <span className="font-mono">${Number(prod.total).toFixed(2)}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            ))
                                          ) : (
                                            <p className="text-muted-foreground px-2 text-xs italic">Sin detalle de operaciones</p>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  </Collapsible.Content>
                                </Collapsible.Root>
                              );
                            })}
                          </TableBody>
                          <TableFooter>
                            <TableRow>
                              <TableCell className="font-bold">Total {moneda}</TableCell>
                              <TableCell className="text-center font-mono font-bold">{cantidadMoneda}</TableCell>
                              <TableCell className="text-right font-mono font-bold">{Number(totalMoneda).toFixed(2)} {moneda}</TableCell>
                              <TableCell className="text-right font-mono font-bold text-green-600">${totalEquivalenteMoneda.toFixed(2)}</TableCell>
                            </TableRow>
                          </TableFooter>
                        </Table>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground text-center italic">No hay pagos registrados</p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-2">
              <Card
                className="cursor-pointer border-green-200 bg-green-500/5 transition-colors hover:bg-green-500/10"
                onClick={() => setShowTransaccionesDialog(true)}
              >
                <CardContent className="p-3 text-center">
                  <ArrowDown className="mx-auto mb-1 h-5 w-5 text-green-600" />
                  <p className="text-muted-foreground text-[10px] uppercase">Ingresos</p>
                  <p className="text-lg font-bold text-green-700">${Number(totalIngresos).toFixed(2)}</p>
                  <p className="text-muted-foreground text-[9px]">{todosIngresos.length} oper.</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer border-red-200 bg-red-500/5 transition-colors hover:bg-red-500/10"
                onClick={() => setShowTransaccionesDialog(true)}
              >
                <CardContent className="p-3 text-center">
                  <ArrowUp className="mx-auto mb-1 h-5 w-5 text-red-600" />
                  <p className="text-muted-foreground text-[10px] uppercase">Gastos</p>
                  <p className="text-lg font-bold text-red-700">${Number(totalGastos).toFixed(2)}</p>
                  <p className="text-muted-foreground text-[9px]">{todosGastos.length} oper.</p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer border-blue-200 bg-blue-500/5 transition-colors hover:bg-blue-500/10"
                onClick={() => setShowTransaccionesDialog(true)}
              >
                <CardContent className="p-3 text-center">
                  <TrendingUp className="mx-auto mb-1 h-5 w-5 text-blue-600" />
                  <p className="text-muted-foreground text-[10px] uppercase">Transfer.</p>
                  <p className="text-lg font-bold text-blue-700">${Number(totalTransferencias).toFixed(2)}</p>
                  <p className="text-muted-foreground text-[9px]">{todasTransferencias.length} oper.</p>
                </CardContent>
              </Card>
            </div>

            {/* Dialog de Detalle de Transacciones */}
            <Dialog open={showTransaccionesDialog} onOpenChange={setShowTransaccionesDialog}>
              <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-4xl">
                <DialogHeader className="border-b px-6 pt-6 pb-4">
                  <DialogTitle>Detalle de Transacciones del Turno</DialogTitle>
                  <DialogDescription>
                    Desglose completo de ingresos, gastos y transferencias realizadas durante tu turno.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                  <Tabs defaultValue="gastos" className="w-full">
                    <TabsList className="mb-4 grid w-full grid-cols-3">
                      <TabsTrigger value="ingresos">Ingresos ({todosIngresos.length})</TabsTrigger>
                      <TabsTrigger value="gastos">Gastos ({todosGastos.length})</TabsTrigger>
                      <TabsTrigger value="transferencias">Transferencias ({todasTransferencias.length})</TabsTrigger>
                    </TabsList>

                    {/* Tab Ingresos */}
                    <TabsContent value="ingresos" className="mt-0">
                      {todosIngresos.length > 0 ? (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-16">Hora</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Origen</TableHead>
                                <TableHead>Destino</TableHead>
                                <TableHead className="w-28 text-right">Monto</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {todosIngresos.map((item: any, idx: number) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                  <TableCell className="text-sm">{item.desc}</TableCell>
                                  <TableCell className="text-muted-foreground text-xs">{item.origen}</TableCell>
                                  <TableCell className="text-muted-foreground text-xs">{item.destino}</TableCell>
                                  <TableCell className="text-right font-mono font-medium text-green-600">
                                    +${Number(item.monto).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            <TableFooter>
                              <TableRow>
                                <TableCell colSpan={4} className="font-bold">
                                  Total Ingresos
                                </TableCell>
                                <TableCell className="text-right font-bold text-green-600">
                                  ${Number(totalIngresos).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            </TableFooter>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-muted-foreground py-12 text-center italic">
                          No hay ingresos registrados en este turno.
                        </p>
                      )}
                    </TabsContent>

                    {/* Tab Gastos */}
                    <TabsContent value="gastos" className="mt-0">
                      {todosGastos.length > 0 ? (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-16">Hora</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Origen</TableHead>
                                <TableHead>Destino</TableHead>
                                <TableHead className="w-28 text-right">Monto</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {todosGastos.map((item: any, idx: number) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                  <TableCell className="text-sm">{item.desc}</TableCell>
                                  <TableCell className="text-muted-foreground text-xs">{item.origen || ''}</TableCell>
                                  <TableCell className="text-muted-foreground text-xs">{item.destino || ''}</TableCell>
                                  <TableCell className="text-right font-mono font-medium text-red-600">
                                    -${Number(item.monto).toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            <TableFooter>
                              <TableRow>
                                <TableCell colSpan={4} className="font-bold">
                                  Total Gastos
                                </TableCell>
                                <TableCell className="text-right font-bold text-red-600">
                                  ${Number(totalGastos).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            </TableFooter>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-muted-foreground py-12 text-center italic">
                          No hay gastos registrados en este turno.
                        </p>
                      )}
                    </TabsContent>

                    {/* Tab Transferencias */}
                    <TabsContent value="transferencias" className="mt-0">
                      {todasTransferencias.length > 0 ? (
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-16">Hora</TableHead>
                                <TableHead>Descripción</TableHead>
                                <TableHead>Origen</TableHead>
                                <TableHead>Destino</TableHead>
                                <TableHead className="w-32 text-right">Monto</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {todasTransferencias.map((item: TransferenciaItem, idx: number) => (
                                <TableRow key={idx}>
                                  <TableCell className="font-mono text-xs">{item.hora}</TableCell>
                                  <TableCell className="max-w-xs truncate text-sm">{item.desc}</TableCell>
                                  <TableCell className="text-muted-foreground text-xs">
                                    <div className="max-w-[120px] truncate" title={item.origen_nombre}>
                                      {item.origen_nombre}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-xs">
                                    <div className="max-w-[120px] truncate" title={item.destino_nombre}>
                                      {item.destino_nombre}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-xs">
                                    <span className="text-blue-600">
                                      ${Number(item.monto_origen).toFixed(2)} {item.moneda_origen}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            <TableFooter>
                              <TableRow>
                                <TableCell colSpan={4} className="font-bold">
                                  Total Transferencias
                                </TableCell>
                                <TableCell className="text-right font-bold text-blue-600">
                                  ${Number(totalTransferencias).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            </TableFooter>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-muted-foreground py-12 text-center italic">
                          No hay transferencias registradas en este turno.
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Auditoría */}
          <div className="space-y-6 lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="rounded-lg bg-slate-500/10 p-2"><Wallet className="h-4 w-4 text-slate-600" /></div><span>Auditoría Final</span></div>
                  <div className="px-3 text-[9px] font-bold uppercase">{cierre.estado}</div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="rounded-lg border p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold">Saldo Inicial</span><span className="font-mono">{Number(calculos.saldo_inicial || 0).toFixed(2)}</span></div></div>
                  <div className="rounded-lg border p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold">Saldo Esperado</span><span className="font-mono">{Number(calculos.saldo_esperado_global || 0).toFixed(2)}</span></div></div>
                  <div className="rounded-lg border p-3"><div className="flex items-center justify-between"><span className="text-xs font-bold">Saldo Contado</span><span className="font-mono">{Number(cierre.saldo_contado || 0).toFixed(2)}</span></div></div>
                </div>

                <div className={`rounded-lg border p-4 mt-3 ${Number(cierre.diferencia || 0) === 0 ? 'border-emerald-300' : 'border-rose-300'}`}>
                  <div className="flex items-center justify-between"><div className="text-[10px] font-black uppercase">Diferencia Final</div><div className="font-mono text-xl">{Number(cierre.diferencia || 0) >= 0 ? '+' : ''}{Number(cierre.diferencia || 0).toFixed(2)}</div></div>
                </div>

                <div className="mt-4"><h4 className="text-[10px] font-black uppercase">Observaciones</h4><p className="italic text-xs">{cierre.observaciones || 'Sin notas adicionales.'}</p></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
