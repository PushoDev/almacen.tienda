import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

// Define el tipo de los objetos que esperas recibir
interface Producto {
    id: number;
    nombre_producto: string;
    precio_compra_producto: number;
    pivot: {
        cantidad: number;
    };
}

interface Compra {
    id: number;
    fecha_compra: string;
    total_compra: number;
    productos: Producto[];
}

interface Cuenta {
    id: number;
    nombre_cuenta: string;
    tipo_moneda: 'USD' | 'EUR' | 'MLC' | 'CUP';
    saldo: number;
}

// 1. Define la interfaz principal para las props de la vista
interface Props {
    compra: Compra;
    cuentas: Cuenta[];
    tasaCambioActual: number;
}

// 2. El componente recibe las props de Inertia directamente
export default function DistribuirCostosView({ compra, cuentas, tasaCambioActual }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        // 3. Inicializa el formulario con los datos de la compra
        purchase_id: String(compra.id),
        account_id: '',
        amount_cup: '',
        exchange_rate: String(tasaCambioActual),
        details: '',
        productos: compra.productos.map((producto) => ({
            product_id: producto.id,
            amount_usd: '0',
        })),
    });

    // Cálculos dinámicos para el saldo
    const totalUsdDistribuible = (parseFloat(data.amount_cup) || 0) / (parseFloat(data.exchange_rate) || tasaCambioActual);
    const totalDistribuidoPorUsuario = data.productos.reduce((sum, item) => sum + (parseFloat(item.amount_usd) || 0), 0);
    const saldoPendiente = totalUsdDistribuible - totalDistribuidoPorUsuario;

    const handleProductAmountChange = (productId: number, amount: string) => {
        setData(
            'productos',
            data.productos.map((item) => (item.product_id === productId ? { ...item, amount_usd: amount } : item)),
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const filteredProducts = data.productos.filter((item) => parseFloat(item.amount_usd) > 0);

        post(route('transacciones.distribuir-costos-manual'), {
            // 4. Se envían los datos del formulario al controlador
            purchase_id: data.purchase_id,
            account_id: data.account_id,
            amount_cup: data.amount_cup,
            exchange_rate: data.exchange_rate,
            details: data.details,
            productos: filteredProducts,
            onSuccess: () => {
                // 5. Redirige al usuario de regreso a la vista de transacciones después del éxito
                router.visit(route('transacciones'));
            },
        });
    };

    return (
        <AppLayout breadcrumbs={[]}>
            <Head title={`Distribuir Costos Compra #${compra.id}`} />

            <div className="flex items-center space-x-2">
                {/* 6. Botón de regreso */}
                <Button onClick={() => router.visit(route('transacciones'))} variant="ghost" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-xl font-bold">Distribución de Costos</h1>
            </div>

            <Separator className="my-4" />

            <Card className="mx-auto max-w-4xl">
                <CardHeader>
                    <CardTitle>Compra #{compra.id}</CardTitle>
                    <CardDescription>
                        Fecha: {compra.fecha_compra} | Total: ${compra.total_compra.toFixed(2)}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <Label htmlFor="amount_cup">Monto a Distribuir (CUP)</Label>
                                <Input
                                    id="amount_cup"
                                    type="number"
                                    step="0.01"
                                    value={data.amount_cup}
                                    onChange={(e) => setData('amount_cup', e.target.value)}
                                />
                                {errors.amount_cup && <div className="mt-1 text-xs text-red-500">{errors.amount_cup}</div>}
                            </div>
                            <div>
                                <Label htmlFor="account_id">Cuenta de Origen</Label>
                                <Select onValueChange={(value) => setData('account_id', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una cuenta" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cuentas.map((cuenta) => (
                                            <SelectItem key={cuenta.id} value={String(cuenta.id)}>
                                                {cuenta.nombre_cuenta} ({cuenta.tipo_moneda}) - ${cuenta.saldo.toFixed(2)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.account_id && <div className="mt-1 text-xs text-red-500">{errors.account_id}</div>}
                            </div>
                            <div>
                                <Label htmlFor="exchange_rate">Tasa de Cambio (CUP a USD)</Label>
                                <Input
                                    id="exchange_rate"
                                    type="number"
                                    step="0.0001"
                                    value={data.exchange_rate}
                                    onChange={(e) => setData('exchange_rate', e.target.value)}
                                />
                                <p className="mt-1 text-sm text-gray-500">Tasa actual por defecto: {tasaCambioActual}</p>
                                {errors.exchange_rate && <div className="mt-1 text-xs text-red-500">{errors.exchange_rate}</div>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-lg font-bold">
                                <span>
                                    Disponible para distribuir: <span className="text-green-600">${totalUsdDistribuible.toFixed(2)}</span>
                                </span>
                                <span>
                                    Saldo pendiente:{' '}
                                    <span className={saldoPendiente < 0 ? 'text-red-500' : 'text-orange-500'}>${saldoPendiente.toFixed(2)}</span>
                                </span>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Producto</TableHead>
                                        <TableHead>Costo Original ($)</TableHead>
                                        <TableHead>Cantidad</TableHead>
                                        <TableHead>Monto a Distribuir ($)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {compra.productos.map((producto) => (
                                        <TableRow key={producto.id}>
                                            <TableCell>{producto.nombre_producto}</TableCell>
                                            <TableCell>${producto.precio_compra_producto.toFixed(2)}</TableCell>
                                            <TableCell>{producto.pivot.cantidad}</TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={data.productos.find((p) => p.product_id === producto.id)?.amount_usd}
                                                    onChange={(e) => handleProductAmountChange(producto.id, e.target.value)}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {errors.productos && <div className="mt-1 text-xs text-red-500">{errors.productos}</div>}
                                </TableBody>
                            </Table>
                        </div>

                        <div>
                            <Label htmlFor="details">Detalles (Opcional)</Label>
                            <Textarea id="details" value={data.details} onChange={(e) => setData('details', e.target.value)} />
                            {errors.details && <div className="mt-1 text-xs text-red-500">{errors.details}</div>}
                        </div>

                        <Button type="submit" disabled={processing || saldoPendiente < 0} className="w-full">
                            {processing ? 'Distribuyendo...' : 'Distribuir Costos'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </AppLayout>
    );
}
