// src/pages/Transacciones/CambiarCostoManual.tsx

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Banknote, DollarSign, Euro, Wallet } from 'lucide-react';
// ✅ Asumiendo que esta función existe en alguna parte de tu proyecto
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(value);
};

// Definimos las interfaces con tipos específicos para el formulario de Inertia
interface Compra {
    id: number;
    productos: Array<{
        id: number;
        nombre_producto: string;
        pivot: {
            cantidad: number;
            costo_compra_usd: number;
        };
    }>;
}

interface Cuenta {
    id: number;
    nombre_cuenta: string;
    saldo_cuenta: number;
}

interface Props {
    compra: Compra;
    cuentas: Cuenta[];
    tasaCambioActual: number;
}

// ⚠️ Cambiamos el nombre del componente para que coincida con el nombre de archivo
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
            old_cost_usd: producto.pivot.costo_compra_usd,
            cantidad: producto.pivot.cantidad,
            amount_usd: '0', // Usamos string para evitar problemas de tipo con el input
        })),
    });

    const amountCup = parseFloat(data.amount_cup as string) || 0;
    const totalUsdToDistribute = amountCup / data.exchange_rate;
    const distributedTotal = data.productos.reduce((acc, prod) => acc + (parseFloat(prod.amount_usd) || 0), 0);
    const remainingUsd = totalUsdToDistribute - distributedTotal;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (remainingUsd < -0.01) {
            toast.error('El monto distribuido excede el monto total disponible.');
            return;
        }

        if (distributedTotal === 0) {
            toast.error('Debes distribuir el gasto en al menos un producto.');
            return;
        }

        post(route('distribuir.costos.manual'));
    };

    const handleProductChange = (index: number, value: string) => {
        const newProducts = [...data.productos];
        newProducts[index].amount_usd = value;
        setData('productos', newProducts);
    };

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
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <Label htmlFor="accountId" className="flex items-center gap-1">
                                    <Wallet size={16} /> Cuenta de Origen
                                </Label>
                                <Select onValueChange={(value) => setData('account_id', value)} value={data.account_id}>
                                    <SelectTrigger className="mt-1 w-full">
                                        <SelectValue placeholder="Selecciona una cuenta" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cuentas.map((cuenta) => (
                                            <SelectItem key={cuenta.id} value={String(cuenta.id)}>
                                                {cuenta.nombre_cuenta} ({formatCurrency(cuenta.saldo_cuenta)} CUP)
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
                                    step="0.01"
                                    value={data.exchange_rate}
                                    onChange={(e) => setData('exchange_rate', parseFloat(e.target.value))}
                                    placeholder="Tasa de cambio"
                                    className="mt-1"
                                />
                                {errors.exchange_rate && <div className="mt-1 text-sm text-red-500">{errors.exchange_rate}</div>}
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between rounded-md bg-gray-100 p-4">
                            <span className="text-lg font-semibold">Monto total a distribuir:</span>
                            <span className="text-xl font-bold text-green-600">{formatCurrency(totalUsdToDistribute)} USD</span>
                        </div>
                        <div className="flex items-center justify-between rounded-md bg-gray-100 p-4">
                            <span className="text-lg font-semibold">Monto restante por distribuir:</span>
                            <span className={`text-xl font-bold ${remainingUsd >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {formatCurrency(remainingUsd)} USD
                            </span>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Productos de la Compra</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Producto</TableHead>
                                        <TableHead>Cantidad</TableHead>
                                        <TableHead>Costo Anterior (USD)</TableHead>
                                        <TableHead>Monto a Distribuir (USD)</TableHead>
                                        <TableHead>Nuevo Costo (USD)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.productos.map((producto, index) => {
                                        const nuevoCosto = producto.old_cost_usd + (parseFloat(producto.amount_usd) || 0) / producto.cantidad;
                                        return (
                                            <TableRow key={producto.product_id}>
                                                <TableCell>{producto.product_name}</TableCell>
                                                <TableCell>{producto.cantidad}</TableCell>
                                                <TableCell>{formatCurrency(producto.old_cost_usd)}</TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={producto.amount_usd}
                                                        onChange={(e) => handleProductChange(index, e.target.value)}
                                                        placeholder="0.00"
                                                    />
                                                </TableCell>
                                                <TableCell className="font-bold">{formatCurrency(nuevoCosto)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <div>
                            <Label htmlFor="details">Comentario (opcional)</Label>
                            <Input
                                id="details"
                                value={data.details}
                                onChange={(e) => setData('details', e.target.value)}
                                placeholder="Ej: Transporte marítimo desde Panamá"
                                className="mt-1"
                            />
                        </div>

                        <Button type="submit" disabled={processing || remainingUsd < -0.01 || distributedTotal === 0}>
                            {processing ? 'Procesando...' : 'Confirmar Prorrateo'}
                        </Button>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
