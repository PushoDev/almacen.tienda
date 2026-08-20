import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Combobox, ComboboxChip, ComboboxChips, ComboboxChipsInput, ComboboxContent, ComboboxEmpty, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Field, FieldDescription, FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { AlertCircle, DollarSign, Wallet, X } from 'lucide-react';
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
        // Una o varias cuentas financiando la distribución, cada una con su propio monto en CUP.
        cuentas: [] as Array<{ account_id: number; amount_cup: string }>,
        exchange_rate: tasaCambioActual.toString(), // Mantener como string para permitir borrado
        details: '',
        productos: productos.map((producto) => ({
            product_id: producto.id,
            product_name: producto.nombre_producto,
            old_cost_usd: producto.precio_compra_producto,
            cantidad: producto.pivot.cantidad,
            amount_usd: '0', // Permitir escritura libre
        })),
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

    // ✅ FILTRAR CUENTAS CUP
    const cuentasCup = cuentas.filter((cuenta) => cuenta.moneda.codigo_moneda === 'CUP' && cuenta.estado === 'activa');

    const cuentasSeleccionadas = data.cuentas
        .map((c) => cuentasCup.find((cuenta) => cuenta.id === c.account_id))
        .filter((c): c is Cuenta => !!c);

    // --- Cálculos ---
    const exchangeRate = parseFloat(data.exchange_rate) || tasaCambioActual;
    const amountCup = data.cuentas.reduce((acc, c) => acc + (parseFloat(c.amount_cup) || 0), 0);
    const totalUsdToDistribute = amountCup / exchangeRate;
    const distributedTotal = data.productos.reduce((acc, prod) => acc + (parseFloat(prod.amount_usd) || 0), 0);
    const remainingUsd = totalUsdToDistribute - distributedTotal;
    const remainingCup = remainingUsd * exchangeRate;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validaciones
        if (data.cuentas.length === 0) {
            toast.error('Debe seleccionar al menos una cuenta de origen');
            return;
        }
        if (amountCup <= 0) {
            toast.error('El monto en CUP debe ser mayor a 0');
            return;
        }
        if (distributedTotal === 0) {
            toast.error('Debes distribuir el gasto en al menos un producto.');
            return;
        }
        if (remainingUsd < -0.01) {
            toast.error('El monto distribuido excede el monto total disponible.');
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

    // ✅ PERMITIR ESCRITURA LIBRE - SIN FORMATEO AUTOMÁTICO
    const handleProductChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;
        const newProducts = [...data.productos];
        newProducts[index].amount_usd = value;
        setData('productos', newProducts);
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

    const distributeRemaining = () => {
        if (remainingUsd > 0.01) {
            const newProducts = data.productos.map((producto) => ({
                ...producto,
                amount_usd: (parseFloat(producto.amount_usd) + remainingUsd / data.productos.length).toString(),
            }));
            setData('productos', newProducts);
        }
    };

    const isButtonDisabled = processing || data.cuentas.length === 0 || amountCup <= 0 || distributedTotal === 0 || remainingUsd < -0.01;

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

                <div className="bg-card rounded-lg p-6 shadow-md">
                    <h2 className="mb-4 text-xl font-bold">Detalles de Prorrateo para {titulo}</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* --- Cuentas de origen (una o varias) --- */}
                        <FieldSet>
                            <FieldLegend className="flex items-center gap-2 text-base font-semibold">
                                <Wallet className="h-5 w-5 text-emerald-600" />
                                Cuentas de Origen (CUP)
                            </FieldLegend>
                            <FieldDescription>Selecciona una o varias cuentas para financiar esta distribución.</FieldDescription>

                            <FieldGroup className="space-y-4 pt-4">
                                <Field>
                                    <Combobox
                                        multiple
                                        items={cuentasCup}
                                        itemToStringLabel={(c: Cuenta) => c.nombre_cuenta}
                                        value={cuentasSeleccionadas}
                                        onValueChange={(seleccionadas: Cuenta[]) => {
                                            setData(
                                                'cuentas',
                                                seleccionadas.map(
                                                    (c) => data.cuentas.find((item) => item.account_id === c.id) ?? { account_id: c.id, amount_cup: '' },
                                                ),
                                            );
                                        }}
                                    >
                                        <ComboboxChips>
                                            {cuentasSeleccionadas.map((cuenta) => (
                                                <ComboboxChip key={cuenta.id}>{cuenta.nombre_cuenta}</ComboboxChip>
                                            ))}
                                            <ComboboxChipsInput placeholder="Buscar cuentas en CUP..." />
                                        </ComboboxChips>
                                        <ComboboxContent>
                                            <ComboboxEmpty>No se encontraron cuentas.</ComboboxEmpty>
                                            <ComboboxList>
                                                {(cuenta: Cuenta) => (
                                                    <ComboboxItem key={cuenta.id} value={cuenta}>
                                                        <div className="flex w-full items-center justify-between gap-2">
                                                            <span>{cuenta.nombre_cuenta}</span>
                                                            <span className="text-muted-foreground text-xs">
                                                                Saldo: {formatCupCurrency(cuenta.saldo_cuenta)}
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
                                    <div className="divide-y rounded-lg border">
                                        {cuentasSeleccionadas.map((cuenta) => {
                                            const item = data.cuentas.find((c) => c.account_id === cuenta.id);
                                            return (
                                                <div key={cuenta.id} className="flex items-center gap-3 p-3">
                                                    <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                                                        {cuenta.nombre_cuenta[0]}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium">{cuenta.nombre_cuenta}</p>
                                                        <p className="text-muted-foreground text-xs">Saldo: {formatCupCurrency(cuenta.saldo_cuenta)}</p>
                                                    </div>
                                                    <InputGroup className="w-36 shrink-0">
                                                        <InputGroupAddon>$</InputGroupAddon>
                                                        <InputGroupInput
                                                            inputMode="decimal"
                                                            placeholder="0.00"
                                                            value={item?.amount_cup || ''}
                                                            onChange={(e) => {
                                                                setData(
                                                                    'cuentas',
                                                                    data.cuentas.map((c) =>
                                                                        c.account_id === cuenta.id ? { ...c, amount_cup: e.target.value } : c,
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
                                                        onClick={() => setData('cuentas', data.cuentas.filter((c) => c.account_id !== cuenta.id))}
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

                        {/* --- Tasa de cambio --- */}
                        <div className="max-w-xs">
                            <Label htmlFor="exchangeRate" className="flex items-center gap-1">
                                <DollarSign size={16} /> Tasa de Cambio (CUP a USD)
                            </Label>
                            <Input
                                id="exchangeRate"
                                type="number"
                                step="any" // ✅ PERMITIR CUALQUIER VALOR
                                min="0.01"
                                value={data.exchange_rate}
                                onChange={handleExchangeRateChange}
                                placeholder="Tasa de cambio"
                                className="mt-1"
                            />
                            {errors.exchange_rate && <div className="mt-1 text-sm text-red-500">{errors.exchange_rate}</div>}
                            <p className="text-muted-foreground mt-1 text-xs">Tasa actual: {formatDisplayNumber(tasaCambioActual)} CUP/USD</p>
                        </div>

                        {/* --- Paneles de Resumen --- */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="rounded-lg border p-4">
                                <h4 className="mb-2 font-semibold">Resumen de Distribución</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Total CUP a distribuir:</span>
                                        <span className="font-semibold">{formatCupCurrency(amountCup)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Equivalente en USD:</span>
                                        <span className="font-semibold">{formatCurrency(totalUsdToDistribute)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Distribuido a productos:</span>
                                        <span className="font-semibold text-green-600">{formatCurrency(distributedTotal)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Restante por distribuir:</span>
                                        <span className={`font-semibold ${remainingUsd >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                            {formatCurrency(remainingUsd)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {remainingUsd > 0.01 && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                                    <div className="mb-2 flex items-center gap-2">
                                        <AlertCircle size={18} className="text-amber-600" />
                                        <h4 className="font-semibold text-amber-800 dark:text-amber-200">Atención: Sobrante Detectado</h4>
                                    </div>
                                    <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">
                                        El monto restante de <strong>{formatCurrency(remainingUsd)} USD</strong> ({formatCupCurrency(remainingCup)}{' '}
                                        CUP) se registrará automáticamente como un gasto directo.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={distributeRemaining}
                                        className="cursor-pointer border-amber-300 text-amber-700 hover:bg-amber-100"
                                    >
                                        Distribuir sobrante entre todos los productos
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* --- Tabla de Productos --- */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Productos de la Compra</h3>
                                <div className="text-sm text-gray-500">{productos.length} producto(s) encontrado(s)</div>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Producto</TableHead>
                                        <TableHead>Cantidad</TableHead>
                                        <TableHead>Costo Actual (USD)</TableHead>
                                        <TableHead>Monto a Distribuir (USD)</TableHead>
                                        <TableHead>Nuevo Costo (USD)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.productos.map((producto, index) => {
                                        const distributedAmount = parseFloat(producto.amount_usd) || 0;
                                        const oldCost = parseFloat(String(producto.old_cost_usd));
                                        const nuevoCosto = oldCost + distributedAmount;

                                        return (
                                            <TableRow key={producto.product_id}>
                                                <TableCell className="font-medium">{producto.product_name}</TableCell>
                                                <TableCell>{producto.cantidad}</TableCell>
                                                <TableCell>{formatCurrency(oldCost)}</TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        step="any" // ✅ PERMITIR CUALQUIER VALOR
                                                        min="0"
                                                        onChange={(e) => handleProductChange(index, e)}
                                                        value={producto.amount_usd}
                                                        placeholder="0.00"
                                                        className="w-32"
                                                    />
                                                </TableCell>
                                                <TableCell className="font-bold text-green-600">{formatCurrency(nuevoCosto)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* --- Comentario y Botón --- */}
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
                                {processing ? 'Procesando...' : `Confirmar Prorrateo${remainingUsd > 0.01 ? ' con Sobrante' : ''}`}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
