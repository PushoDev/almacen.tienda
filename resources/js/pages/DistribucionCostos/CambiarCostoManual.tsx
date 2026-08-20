import HeadingSmall from '@/components/heading-small';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
} from '@/components/ui/combobox';
import { Field, FieldDescription, FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { ArrowRightLeft, CheckCircle2, DollarSign, Package, Wallet, X } from 'lucide-react';
import { toast } from 'sonner';

// --- Funciones de formato ---
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(value);
};

const formatCupCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'CUP',
        minimumFractionDigits: 2,
    }).format(value);
};

// --- INTERFACES ---
interface Moneda {
    id: number;
    codigo_moneda: string;
    nombre_moneda: string;
    simbolo_moneda: string;
    tasa_cambio: number;
    estado: boolean;
    principal: boolean;
}

interface Cuenta {
    id: number;
    nombre_cuenta: string;
    saldo_cuenta: number;
    tipo_cuenta: string;
    estado: string;
    moneda_id: number;
    moneda: Moneda;
}

interface ProductoCompra {
    id: number;
    nombre_producto: string;
    precio_compra_producto: number;
    pivot: {
        cantidad: number;
        precio: number;
    };
}

interface Props {
    compraIds: number[];
    productos: ProductoCompra[];
    cuentas: Cuenta[];
    tasaCambioActual: number;
}

export default function CambiarCostoManual({ compraIds, productos, cuentas, tasaCambioActual }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        purchase_ids: compraIds,
        // Una o varias cuentas financiando la distribución — CUP o USD mezcladas, cada una con
        // su propio monto en su propia moneda.
        cuentas: [] as Array<{ account_id: number; monto: string }>,
        exchange_rate: tasaCambioActual.toString(), // Mantener como string para permitir borrado
        details: '',
    });

    const titulo = `Compra${compraIds.length > 1 ? 's' : ''} #${compraIds.join(', #')}`;

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Resumen General',
            href: '/dashboard',
        },
        {
            title: 'Distribución de Costos',
            href: '/distribucion-costos',
        },
        {
            title: `Cambiar Costo ${titulo}`,
            href: '#',
        },
    ];

    // Cuentas CUP o USD, mezcladas — ya no se limita a una sola moneda para toda la operación.
    const cuentasElegibles = cuentas.filter(
        (cuenta) => (cuenta.moneda.codigo_moneda === 'CUP' || cuenta.moneda.codigo_moneda === 'USD') && cuenta.estado === 'activa',
    );

    const cuentasSeleccionadas = data.cuentas
        .map((c) => cuentasElegibles.find((cuenta) => cuenta.id === c.account_id))
        .filter((c): c is Cuenta => !!c);

    // --- Cálculos ---
    const exchangeRate = parseFloat(data.exchange_rate) || tasaCambioActual;

    // Equivalente en USD de lo que aporta una cuenta: CUP se convierte con la tasa de la
    // operación, USD entra directo — es la moneda común en la que vive el costo de los productos.
    const montoUsdDeCuenta = (cuenta: Cuenta, monto: string): number => {
        const valor = parseFloat(monto) || 0;
        return cuenta.moneda.codigo_moneda === 'CUP' ? valor / exchangeRate : valor;
    };

    const totalUsdToDistribute = data.cuentas.reduce((acc, c) => {
        const cuenta = cuentasElegibles.find((cu) => cu.id === c.account_id);
        return cuenta ? acc + montoUsdDeCuenta(cuenta, c.monto) : acc;
    }, 0);

    // Peso de cada producto dentro de la compra: (costo unitario × cantidad) / total de la compra.
    // El reparto es 100% automático — el mismo cálculo que hace el backend al confirmar, aquí solo
    // en modo vista previa. El % de aumento sale igual para todos los productos (barato o caro),
    // porque el monto asignado ya es proporcional al valor que cada uno representaba en la compra.
    const totalCompra = productos.reduce((acc, p) => acc + Number(p.precio_compra_producto) * p.pivot.cantidad, 0);

    const distribucion = productos.map((producto) => {
        const costoActual = Number(producto.precio_compra_producto);
        const cantidad = producto.pivot.cantidad;
        const totalLinea = costoActual * cantidad;
        const peso = totalCompra > 0 ? totalLinea / totalCompra : 0;
        const monto = peso * totalUsdToDistribute;
        const adicionalUnidad = cantidad > 0 ? monto / cantidad : 0;
        const nuevoCosto = costoActual + adicionalUnidad;
        const porcentajeAumento = costoActual > 0 ? (adicionalUnidad / costoActual) * 100 : 0;

        return { producto, costoActual, cantidad, totalLinea, peso, monto, adicionalUnidad, nuevoCosto, porcentajeAumento };
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (data.cuentas.length === 0) {
            toast.error('Debe seleccionar al menos una cuenta de origen');
            return;
        }
        if (totalUsdToDistribute <= 0) {
            toast.error('El monto a distribuir debe ser mayor a 0');
            return;
        }

        post(route('distribucion-costos.distribuir'), {
            onSuccess: () => {},
            onError: (errors) => {
                const firstError = Object.values(errors)[0];
                toast.error(firstError || 'Ocurrió un error. Por favor, revisa los datos.');
            },
        });
    };

    // ✅ PERMITIR ESCRITURA LIBRE EN TASA DE CAMBIO - SIN FORMATEO AUTOMÁTICO
    const handleExchangeRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setData('exchange_rate', value);
    };

    // ✅ FORMATO SOLO PARA DISPLAY, NO PARA INPUT
    const formatDisplayNumber = (value: number | string): string => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return isNaN(num) ? '0.00' : num.toFixed(2);
    };

    const isButtonDisabled = processing || data.cuentas.length === 0 || totalUsdToDistribute <= 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Distribución de Costos" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Distribución de Costos"
                        description={`Distribuya un gasto adicional entre los productos de ${compraIds.length > 1 ? 'las compras' : 'la compra'} #${compraIds.join(', #')}.`}
                    />
                    <DollarSign
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <ArrowRightLeft className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-white">Detalles de Prorrateo para {titulo}</CardTitle>
                                    <CardDescription className="text-indigo-100">
                                        Complete los datos para distribuir el costo entre los productos seleccionados.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* --- Cuentas de origen (una o varias) --- */}
                            <FieldSet>
                                <FieldLegend className="flex items-center gap-2 text-base font-semibold">
                                    <Wallet className="h-5 w-5 text-emerald-600" />
                                    Cuentas de Origen
                                </FieldLegend>
                                <FieldDescription>
                                    Selecciona una o varias cuentas (CUP o USD, se pueden mezclar) para financiar esta distribución.
                                </FieldDescription>

                                <FieldGroup className="space-y-4 pt-4">
                                    <Field>
                                        <Combobox
                                            multiple
                                            items={cuentasElegibles}
                                            itemToStringLabel={(c: Cuenta) => c.nombre_cuenta}
                                            value={cuentasSeleccionadas}
                                            onValueChange={(seleccionadas: Cuenta[]) => {
                                                setData(
                                                    'cuentas',
                                                    seleccionadas.map(
                                                        (c) =>
                                                            data.cuentas.find((item) => item.account_id === c.id) ?? {
                                                                account_id: c.id,
                                                                monto: '',
                                                            },
                                                    ),
                                                );
                                            }}
                                        >
                                            <ComboboxChips>
                                                {cuentasSeleccionadas.map((cuenta) => (
                                                    <ComboboxChip key={cuenta.id}>
                                                        {cuenta.nombre_cuenta} ({cuenta.moneda.codigo_moneda})
                                                    </ComboboxChip>
                                                ))}
                                                <ComboboxChipsInput placeholder="Buscar cuentas..." />
                                            </ComboboxChips>
                                            <ComboboxContent>
                                                <ComboboxEmpty>No se encontraron cuentas.</ComboboxEmpty>
                                                <ComboboxList>
                                                    {(cuenta: Cuenta) => (
                                                        <ComboboxItem key={cuenta.id} value={cuenta}>
                                                            <div className="flex w-full items-center justify-between gap-2">
                                                                <span>
                                                                    {cuenta.nombre_cuenta}{' '}
                                                                    <span className="text-muted-foreground text-xs">
                                                                        ({cuenta.moneda.codigo_moneda})
                                                                    </span>
                                                                </span>
                                                                <span className="text-muted-foreground text-xs">
                                                                    Saldo:{' '}
                                                                    {cuenta.moneda.codigo_moneda === 'CUP'
                                                                        ? formatCupCurrency(cuenta.saldo_cuenta)
                                                                        : formatCurrency(cuenta.saldo_cuenta)}
                                                                </span>
                                                            </div>
                                                        </ComboboxItem>
                                                    )}
                                                </ComboboxList>
                                            </ComboboxContent>
                                        </Combobox>
                                        {errors.cuentas && <div className="mt-1 text-sm text-red-500">{errors.cuentas}</div>}
                                    </Field>

                                    {cuentasSeleccionadas.length > 0 && (
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            {cuentasSeleccionadas.map((cuenta) => {
                                                const item = data.cuentas.find((c) => c.account_id === cuenta.id);
                                                const esCup = cuenta.moneda.codigo_moneda === 'CUP';

                                                return (
                                                    <div
                                                        key={cuenta.id}
                                                        className={`bg-card flex items-center gap-3 rounded-lg border border-l-4 p-3 shadow-sm ${
                                                            esCup
                                                                ? 'border-l-amber-400 dark:border-l-amber-600'
                                                                : 'border-l-blue-400 dark:border-l-blue-600'
                                                        }`}
                                                    >
                                                        <div
                                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                                                esCup
                                                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                            }`}
                                                        >
                                                            {cuenta.nombre_cuenta[0]}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="truncate text-sm font-medium">{cuenta.nombre_cuenta}</p>
                                                                <Badge
                                                                    className={
                                                                        esCup
                                                                            ? 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                                                            : 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                                                    }
                                                                >
                                                                    {cuenta.moneda.codigo_moneda}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-muted-foreground text-xs">
                                                                Saldo:{' '}
                                                                {esCup ? formatCupCurrency(cuenta.saldo_cuenta) : formatCurrency(cuenta.saldo_cuenta)}
                                                            </p>
                                                        </div>
                                                        <InputGroup className="w-32 shrink-0">
                                                            <InputGroupAddon>{cuenta.moneda.simbolo_moneda || '$'}</InputGroupAddon>
                                                            <InputGroupInput
                                                                inputMode="decimal"
                                                                placeholder="0.00"
                                                                value={item?.monto || ''}
                                                                onChange={(e) => {
                                                                    setData(
                                                                        'cuentas',
                                                                        data.cuentas.map((c) =>
                                                                            c.account_id === cuenta.id ? { ...c, monto: e.target.value } : c,
                                                                        ),
                                                                    );
                                                                }}
                                                            />
                                                        </InputGroup>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="shrink-0 cursor-pointer"
                                                            onClick={() =>
                                                                setData(
                                                                    'cuentas',
                                                                    data.cuentas.filter((c) => c.account_id !== cuenta.id),
                                                                )
                                                            }
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </FieldGroup>
                            </FieldSet>

                            {/* --- Tasa de cambio — solo aplica si hay alguna cuenta CUP seleccionada --- */}
                            {cuentasSeleccionadas.some((c) => c.moneda.codigo_moneda === 'CUP') && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                                    <div className="mb-3 flex items-center gap-2">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                                            <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">Tasa de Cambio (CUP → USD)</h4>
                                            <p className="text-xs text-amber-700 dark:text-amber-300">
                                                Solo convierte las cuentas en CUP — las cuentas USD entran directo, sin conversión.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-end gap-4">
                                        <div className="w-40">
                                            <Label htmlFor="exchangeRate" className="text-muted-foreground text-xs">
                                                Tasa actual del sistema: {formatDisplayNumber(tasaCambioActual)} CUP/USD
                                            </Label>
                                            <InputGroup className="mt-1 bg-white dark:bg-transparent">
                                                <InputGroupInput
                                                    id="exchangeRate"
                                                    type="number"
                                                    step="any" // ✅ PERMITIR CUALQUIER VALOR
                                                    min="0.01"
                                                    value={data.exchange_rate}
                                                    onChange={handleExchangeRateChange}
                                                    placeholder="Tasa de cambio"
                                                />
                                                <InputGroupAddon>CUP</InputGroupAddon>
                                            </InputGroup>
                                            {errors.exchange_rate && <div className="mt-1 text-sm text-red-500">{errors.exchange_rate}</div>}
                                        </div>
                                        <div className="pb-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                                            1 USD = {formatDisplayNumber(exchangeRate)} CUP
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- Resumen — mini-widgets con acento lateral, mismo patrón que el listado --- */}
                            <div>
                                <h4 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">Resumen de Distribución</h4>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div className="bg-card rounded-lg border-l-4 border-indigo-400 p-4 shadow-sm dark:border-indigo-600">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
                                                <DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <h3 className="text-sm font-semibold">Total a Distribuir</h3>
                                        </div>
                                        <p className="mt-1 text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                                            {formatCurrency(totalUsdToDistribute)}
                                        </p>
                                    </div>

                                    <div className="bg-card rounded-lg border-l-4 border-violet-400 p-4 shadow-sm dark:border-violet-600">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
                                                <Package className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                            </div>
                                            <h3 className="text-sm font-semibold">Total de la Compra</h3>
                                        </div>
                                        <p className="mt-1 text-2xl font-bold text-violet-700 dark:text-violet-300">{formatCurrency(totalCompra)}</p>
                                    </div>

                                    <div className="bg-card rounded-lg border-l-4 border-emerald-400 p-4 shadow-sm dark:border-emerald-600">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <h3 className="text-sm font-semibold">Productos Afectados</h3>
                                        </div>
                                        <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{productos.length}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* --- Tabla de Productos: reparto 100% automático, proporcional al peso de cada uno --- */}
                    <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                        <CardHeader className="bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <Package className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-white">Productos de la Compra</CardTitle>
                                        <CardDescription className="text-violet-100">
                                            El monto se reparte automáticamente según el peso de cada producto en el total de la compra.
                                        </CardDescription>
                                    </div>
                                </div>
                                <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
                                    {productos.length} producto(s)
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="overflow-x-auto p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                        <TableHead>Producto</TableHead>
                                        <TableHead className="text-right">Costo Unitario</TableHead>
                                        <TableHead className="text-right">Unidades</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right">% del Total</TableHead>
                                        <TableHead className="text-right">Monto Asignado</TableHead>
                                        <TableHead className="text-right">Nuevo Costo</TableHead>
                                        <TableHead className="text-right">% Aumento</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {distribucion.map(
                                        ({ producto, costoActual, cantidad, totalLinea, peso, monto, nuevoCosto, porcentajeAumento }) => (
                                            <TableRow key={producto.id}>
                                                <TableCell className="font-medium">{producto.nombre_producto}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(costoActual)}</TableCell>
                                                <TableCell className="text-right">{cantidad}</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(totalLinea)}</TableCell>
                                                <TableCell className="text-right">
                                                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                                                        {(peso * 100).toFixed(2)}%
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrency(monto)}</TableCell>
                                                <TableCell className="text-right font-bold text-green-600">{formatCurrency(nuevoCosto)}</TableCell>
                                                <TableCell className="text-right">
                                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                                        +{porcentajeAumento.toFixed(4)}%
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ),
                                    )}
                                </TableBody>
                                <TableFooter>
                                    <TableRow className="bg-muted/50">
                                        <TableCell className="font-bold">Total</TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(totalCompra)}</TableCell>
                                        <TableCell className="text-right font-bold">100%</TableCell>
                                        <TableCell className="text-right font-bold">{formatCurrency(totalUsdToDistribute)}</TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </CardContent>

                        {/* --- Comentario y Botón --- */}
                        <CardContent className="space-y-4 pt-0">
                            <div>
                                <Label htmlFor="details">Comentario (opcional)</Label>
                                <Input
                                    id="details"
                                    value={data.details}
                                    onChange={(e) => setData('details', e.target.value)}
                                    placeholder="Ej: Transporte marítimo desde Panamá"
                                    className="mt-1"
                                />
                                {errors.details && <div className="mt-1 text-sm text-red-500">{errors.details}</div>}
                            </div>
                            <div className="flex gap-4">
                                <Button
                                    type="submit"
                                    disabled={isButtonDisabled}
                                    className={`flex-1 ${!isButtonDisabled ? 'cursor-pointer transition-colors hover:bg-blue-600' : 'cursor-not-allowed opacity-50'}`}
                                >
                                    {processing ? 'Procesando...' : 'Confirmar Distribución de Costos'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </form>
            </div>
        </AppLayout>
    );
}
