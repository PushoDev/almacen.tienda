import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { AlertCircle, Banknote, DollarSign, Euro, Wallet } from 'lucide-react';
import { toast } from 'sonner';

// --- Funciones de formato (sin cambios) ---
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

// --- Interfaces (sin cambios) ---
interface Compra {
    id: number;
    productos: Array<{
        id: number;
        nombre_producto: string;
        precio_compra_producto: number;
        pivot: {
            cantidad: number;
            precio: number;
        };
    }>;
}

interface Cuenta {
    id: number;
    nombre_cuenta: string;
    saldo_cuenta: number;
    tipo_moneda: string;
}

interface Props {
    compra: Compra;
    cuentas: Cuenta[];
    tasaCambioActual: number;
}

export default function CambiarCostoManual({ compra, cuentas, tasaCambioActual }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        purchase_id: compra.id,
        account_id: '',
        amount_cup: '',
        exchange_rate: tasaCambioActual,
        details: '',
        productos: compra.productos.map((producto) => ({
            product_id: producto.id,
            product_name: producto.nombre_producto,
            old_cost_usd: producto.precio_compra_producto,
            cantidad: producto.pivot.cantidad,
            amount_usd: '0',
        })),
    });

    // --- Cálculos y Lógica de Estado (sin cambios) ---
    const amountCup = parseFloat(data.amount_cup as string) || 0;
    const totalUsdToDistribute = amountCup / (data.exchange_rate || 1);
    const distributedTotal = data.productos.reduce((acc, prod) => acc + (parseFloat(prod.amount_usd) || 0), 0);
    const remainingUsd = totalUsdToDistribute - distributedTotal;
    const remainingCup = remainingUsd * (data.exchange_rate || 1);

    const cuentasCup = cuentas.filter((cuenta) => cuenta.tipo_moneda === 'CUP');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validaciones del lado del cliente (sin cambios, son correctas)
        if (!data.account_id) {
            toast.error('Debe seleccionar una cuenta de origen');
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

        // Envío de datos al controlador
        post(route('distribuir.costos.manual'), {
            onSuccess: () => {
                // El controlador ya envía un mensaje 'success', por lo que no es necesario un toast aquí.
                // Inertia mostrará automáticamente el mensaje flash.
            },
            // ✅ MEJORA: Manejo de errores más específico.
            // El objeto 'errors' que viene de Laravel contiene los mensajes de validación por campo.
            onError: (errors) => {
                // Obtenemos el primer mensaje de error del objeto y lo mostramos.
                const firstError = Object.values(errors)[0];
                toast.error(firstError || 'Ocurrió un error. Por favor, revisa los datos.');
                console.error('Errores de validación:', errors); // Opcional: para depurar en consola.
            },
        });
    };

    // --- Manejadores de eventos y renderizado (sin cambios) ---
    const handleProductChange = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;
        const newProducts = [...data.productos];
        newProducts[index].amount_usd = value;
        setData('productos', newProducts);
    };

    const distributeRemaining = () => {
        if (remainingUsd > 0.01) {
            const newProducts = data.productos.map((producto) => ({
                ...producto,
                amount_usd: (parseFloat(producto.amount_usd) + remainingUsd / data.productos.length).toFixed(2),
            }));
            setData('productos', newProducts);
        }
    };

    const isButtonDisabled = processing || !data.account_id || amountCup <= 0 || distributedTotal === 0 || remainingUsd < -0.01;

    return (
        <AppLayout breadcrumbs={[]}>
            <Head title="Prorrateo Manual de Costos" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Transacciones / Prorrateo de Precio de Costo"
                        description="Distribuya un gasto adicional entre los productos de una compra."
                    />
                    <Banknote
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                <div className="bg-card rounded-lg p-6 shadow-md">
                    <h2 className="mb-4 text-xl font-bold">Detalles de Prorrateo para Compra #{compra.id}</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* --- Sección de Datos Principales (sin cambios) --- */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <Label htmlFor="accountId" className="flex items-center gap-1">
                                    <Wallet size={16} /> Cuenta de Origen (CUP)
                                </Label>
                                <Select onValueChange={(value) => setData('account_id', value)} value={data.account_id}>
                                    <SelectTrigger className="mt-1 w-full">
                                        <SelectValue placeholder="Selecciona una cuenta en CUP" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cuentasCup.map((cuenta) => (
                                            <SelectItem key={cuenta.id} value={String(cuenta.id)}>
                                                {cuenta.nombre_cuenta} - Saldo: {formatCupCurrency(cuenta.saldo_cuenta)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.account_id && <div className="mt-1 text-sm text-red-500">{errors.account_id}</div>}
                            </div>
                            <div>
                                <Label htmlFor="amountCup" className="flex items-center gap-1">
                                    <Euro size={16} /> Monto del Gasto (CUP)
                                </Label>
                                <Input
                                    id="amountCup"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={data.amount_cup}
                                    onChange={(e) => setData('amount_cup', e.target.value)}
                                    placeholder="Ej: 25000"
                                    className="mt-1"
                                />
                                {errors.amount_cup && <div className="mt-1 text-sm text-red-500">{errors.amount_cup}</div>}
                            </div>
                            <div>
                                <Label htmlFor="exchangeRate" className="flex items-center gap-1">
                                    <DollarSign size={16} /> Tasa de Cambio (CUP a USD)
                                </Label>
                                <Input
                                    id="exchangeRate"
                                    type="number"
                                    step="0.0001"
                                    min="0.0001"
                                    value={data.exchange_rate}
                                    onChange={(e) => setData('exchange_rate', parseFloat(e.target.value) || tasaCambioActual)}
                                    placeholder="Tasa de cambio"
                                    className="mt-1"
                                />
                                {errors.exchange_rate && <div className="mt-1 text-sm text-red-500">{errors.exchange_rate}</div>}
                            </div>
                        </div>

                        {/* --- Paneles de Resumen (sin cambios) --- */}
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

                        {/* --- Tabla de Productos (sin cambios) --- */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Productos de la Compra</h3>
                                <div className="text-sm text-gray-500">{compra.productos.length} producto(s) encontrado(s)</div>
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
                                                        step="0.01"
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

                        {/* --- Comentario y Botón (sin cambios) --- */}
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
