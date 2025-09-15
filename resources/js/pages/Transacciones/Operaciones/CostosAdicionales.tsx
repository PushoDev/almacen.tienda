import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';

// Define el tipo de los objetos que esperas recibir
interface Compra {
    id: number;
    fecha_compra: string;
    total_compra: number;
    productos: any[]; // Puedes definir un tipo más específico si lo necesitas
}

interface Cuenta {
    id: number;
    nombre_cuenta: string;
    tipo_moneda: 'USD' | 'EUR' | 'MLC' | 'CUP'; // Ejemplo de tipo restringido
}

// Define el tipo de las props que recibirá el componente CostosAdicionales
interface Props {
    compras: Compra[];
    cuentas: Cuenta[];
    tasaCambioActual: number;
}

export default function CostosAdicionales({ compras, cuentas, tasaCambioActual }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Usa useForm con tipos definidos para los datos del formulario
    const { data, setData, post, processing, errors, reset } = useForm({
        purchase_id: '',
        amount_cup: '',
        account_id: '',
        exchange_rate: String(tasaCambioActual), // Asegúrate de que el valor inicial sea un string
        details: '',
    });

    // Maneja la apertura del modal y la inicialización del formulario
    const handleOpenModal = (purchaseId: number) => {
        setData((prevData) => ({
            ...prevData,
            purchase_id: String(purchaseId),
            amount_cup: '',
            account_id: '',
            exchange_rate: String(tasaCambioActual),
            details: '',
        }));
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        reset(); // Reinicia el formulario
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Convierte el valor de amount_cup a número antes de enviar si es necesario,
        // aunque `useForm` lo enviará como string y Laravel lo manejará
        post(route('transacciones.distribuir-costos'), {
            onSuccess: () => {
                handleCloseModal();
            },
        });
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Distribuir Costos Adicionales</CardTitle>
                    <CardDescription>
                        Selecciona una compra de la lista para distribuir gastos adicionales (como transporte, aranceles, etc.)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID Compra</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Total ($)</TableHead>
                                <TableHead>Productos</TableHead>
                                <TableHead className="text-right">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {compras.length > 0 ? (
                                compras.map((compra) => (
                                    <TableRow key={compra.id}>
                                        <TableCell>{compra.id}</TableCell>
                                        <TableCell>{compra.fecha_compra}</TableCell>
                                        <TableCell>{compra.total_compra}</TableCell>
                                        <TableCell>{compra.productos.length}</TableCell>
                                        <TableCell className="text-right">
                                            <Dialog open={isModalOpen && data.purchase_id === String(compra.id)} onOpenChange={setIsModalOpen}>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" onClick={() => handleOpenModal(compra.id)}>
                                                        Distribuir
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Distribuir Costos para Compra #{data.purchase_id}</DialogTitle>
                                                        <DialogDescription>
                                                            Asigna los costos adicionales que serán prorrateados entre los productos de esta compra.
                                                        </DialogDescription>
                                                    </DialogHeader>

                                                    {/* Formulario de Distribución */}
                                                    <form onSubmit={handleSubmit} className="space-y-4">
                                                        <div>
                                                            <Label htmlFor="amount_cup">Monto a Distribuir (CUP)</Label>
                                                            <Input
                                                                id="amount_cup"
                                                                type="number"
                                                                step="0.01"
                                                                value={data.amount_cup}
                                                                onChange={(e) => setData('amount_cup', e.target.value)}
                                                            />
                                                            {errors.amount_cup && (
                                                                <div className="mt-1 text-xs text-red-500">{errors.amount_cup}</div>
                                                            )}
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
                                                                            {cuenta.nombre_cuenta} ({cuenta.tipo_moneda})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            {errors.account_id && (
                                                                <div className="mt-1 text-xs text-red-500">{errors.account_id}</div>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <Label htmlFor="exchange_rate">Tasa de Cambio (CUP a USD)</Label>
                                                            <Input
                                                                id="exchange_rate"
                                                                type="number"
                                                                step="0.01"
                                                                value={data.exchange_rate}
                                                                onChange={(e) => setData('exchange_rate', e.target.value)}
                                                            />
                                                            <p className="mt-1 text-sm text-gray-500">Tasa actual por defecto: {tasaCambioActual}</p>
                                                            {errors.exchange_rate && (
                                                                <div className="mt-1 text-xs text-red-500">{errors.exchange_rate}</div>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <Label htmlFor="details">Detalles (Opcional)</Label>
                                                            <Textarea
                                                                id="details"
                                                                value={data.details}
                                                                onChange={(e) => setData('details', e.target.value)}
                                                            />
                                                            {errors.details && <div className="mt-1 text-xs text-red-500">{errors.details}</div>}
                                                        </div>

                                                        <Button type="submit" disabled={processing} className="w-full">
                                                            {processing ? 'Distribuyendo...' : 'Distribuir Costos'}
                                                        </Button>
                                                    </form>
                                                </DialogContent>
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center">
                                        No se encontraron compras recientes.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
