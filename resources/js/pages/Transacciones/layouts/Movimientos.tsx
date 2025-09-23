import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import React from 'react';

// Definir las interfaces para las props
interface Cuenta {
    id: number;
    nombre_cuenta: string;
    tipo_moneda: string;
    saldo_cuenta: number;
    deuda: number;
}

interface Props {
    cuentas: Cuenta[];
}

export default function Movimientos({ cuentas }: Props) {
    // Formulario para Transferencia
    const {
        data: transferData,
        setData: setTransferData,
        post: postTransfer,
        processing: transferProcessing,
        errors: transferErrors,
        reset: resetTransfer,
    } = useForm({
        cuenta_origen_id: '',
        cuenta_destino_id: '',
        monto: '',
        comentario: '',
    });

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postTransfer(route('transacciones.transferir'), {
            onSuccess: () => resetTransfer(),
        });
    };

    // Formulario para Retiro
    const {
        data: withdrawalData,
        setData: setWithdrawalData,
        post: postWithdrawal,
        processing: withdrawalProcessing,
        errors: withdrawalErrors,
        reset: resetWithdrawal,
    } = useForm({
        cuenta_id: '',
        monto: '',
        comentario: '',
    });

    const handleWithdrawalSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postWithdrawal(route('transacciones.retirar'), {
            onSuccess: () => resetWithdrawal(),
        });
    };

    // Formulario para Pago de Deuda
    const {
        data: debtData,
        setData: setDebtData,
        post: postDebt,
        processing: debtProcessing,
        errors: debtErrors,
        reset: resetDebt,
    } = useForm({
        cuenta_id: '',
        monto: '',
        comentario: '',
    });

    const handleDebtSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postDebt(route('transacciones.pagar-deuda'), {
            onSuccess: () => resetDebt(),
        });
    };

    // Filtrar cuentas para mostrar en el formulario de pago de deuda
    const cuentasConDeuda = cuentas.filter((c) => c.deuda > 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Movimientos entre Cuentas</CardTitle>
                <CardDescription>Realice operaciones como transferencias, retiros y pagos de deudas.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="transferir">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="transferir">Transferir</TabsTrigger>
                        <TabsTrigger value="retirar">Retirar</TabsTrigger>
                        <TabsTrigger value="pagar-deuda">Pagar Deuda</TabsTrigger>
                    </TabsList>

                    {/* Formulario de Transferencia */}
                    <TabsContent value="transferir" className="mt-4">
                        <form onSubmit={handleTransferSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="cuenta_origen">Cuenta de Origen</Label>
                                <Select onValueChange={(value) => setTransferData('cuenta_origen_id', value)} value={transferData.cuenta_origen_id}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione una cuenta" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cuentas.map((cuenta) => (
                                            <SelectItem key={cuenta.id} value={String(cuenta.id)}>
                                                {cuenta.nombre_cuenta} ({cuenta.tipo_moneda}) - Saldo: {cuenta.saldo_cuenta.toFixed(2)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {transferErrors.cuenta_origen_id && <p className="mt-1 text-sm text-red-500">{transferErrors.cuenta_origen_id}</p>}
                            </div>

                            <div>
                                <Label htmlFor="cuenta_destino">Cuenta de Destino</Label>
                                <Select onValueChange={(value) => setTransferData('cuenta_destino_id', value)} value={transferData.cuenta_destino_id}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione una cuenta" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cuentas.map((cuenta) => (
                                            <SelectItem key={cuenta.id} value={String(cuenta.id)}>
                                                {cuenta.nombre_cuenta} ({cuenta.tipo_moneda}) - Saldo: {cuenta.saldo_cuenta.toFixed(2)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {transferErrors.cuenta_destino_id && <p className="mt-1 text-sm text-red-500">{transferErrors.cuenta_destino_id}</p>}
                            </div>

                            <div>
                                <Label htmlFor="monto_transferir">Monto</Label>
                                <Input
                                    type="number"
                                    id="monto_transferir"
                                    value={transferData.monto}
                                    onChange={(e) => setTransferData('monto', e.target.value)}
                                    step="0.01"
                                />
                                {transferErrors.monto && <p className="mt-1 text-sm text-red-500">{transferErrors.monto}</p>}
                            </div>

                            <div>
                                <Label htmlFor="comentario_transferir">Comentario</Label>
                                <Textarea
                                    id="comentario_transferir"
                                    value={transferData.comentario}
                                    onChange={(e) => setTransferData('comentario', e.target.value)}
                                />
                                {transferErrors.comentario && <p className="mt-1 text-sm text-red-500">{transferErrors.comentario}</p>}
                            </div>
                            <Button type="submit" disabled={transferProcessing}>
                                Transferir
                            </Button>
                        </form>
                    </TabsContent>

                    {/* Formulario de Retiro */}
                    <TabsContent value="retirar" className="mt-4">
                        <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="cuenta_retiro">Cuenta</Label>
                                <Select onValueChange={(value) => setWithdrawalData('cuenta_id', value)} value={withdrawalData.cuenta_id}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione una cuenta" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cuentas.map((cuenta) => (
                                            <SelectItem key={cuenta.id} value={String(cuenta.id)}>
                                                {cuenta.nombre_cuenta} ({cuenta.tipo_moneda}) - Saldo: {cuenta.saldo_cuenta.toFixed(2)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {withdrawalErrors.cuenta_id && <p className="mt-1 text-sm text-red-500">{withdrawalErrors.cuenta_id}</p>}
                            </div>

                            <div>
                                <Label htmlFor="monto_retiro">Monto</Label>
                                <Input
                                    type="number"
                                    id="monto_retiro"
                                    value={withdrawalData.monto}
                                    onChange={(e) => setWithdrawalData('monto', e.target.value)}
                                    step="0.01"
                                />
                                {withdrawalErrors.monto && <p className="mt-1 text-sm text-red-500">{withdrawalErrors.monto}</p>}
                            </div>

                            <div>
                                <Label htmlFor="comentario_retiro">Comentario</Label>
                                <Textarea
                                    id="comentario_retiro"
                                    value={withdrawalData.comentario}
                                    onChange={(e) => setWithdrawalData('comentario', e.target.value)}
                                />
                                {withdrawalErrors.comentario && <p className="mt-1 text-sm text-red-500">{withdrawalErrors.comentario}</p>}
                            </div>
                            <Button type="submit" disabled={withdrawalProcessing}>
                                Retirar
                            </Button>
                        </form>
                    </TabsContent>

                    {/* Formulario de Pago de Deuda */}
                    <TabsContent value="pagar-deuda" className="mt-4">
                        <form onSubmit={handleDebtSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="cuenta_deuda">Cuenta con Deuda</Label>
                                <Select onValueChange={(value) => setDebtData('cuenta_id', value)} value={debtData.cuenta_id}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione una cuenta" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cuentasConDeuda.map((cuenta) => (
                                            <SelectItem key={cuenta.id} value={String(cuenta.id)}>
                                                {cuenta.nombre_cuenta} ({cuenta.tipo_moneda}) - Deuda: {cuenta.deuda.toFixed(2)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {debtErrors.cuenta_id && <p className="mt-1 text-sm text-red-500">{debtErrors.cuenta_id}</p>}
                            </div>

                            <div>
                                <Label htmlFor="monto_deuda">Monto a pagar</Label>
                                <Input
                                    type="number"
                                    id="monto_deuda"
                                    value={debtData.monto}
                                    onChange={(e) => setDebtData('monto', e.target.value)}
                                    step="0.01"
                                />
                                {debtErrors.monto && <p className="mt-1 text-sm text-red-500">{debtErrors.monto}</p>}
                            </div>

                            <div>
                                <Label htmlFor="comentario_deuda">Comentario</Label>
                                <Textarea
                                    id="comentario_deuda"
                                    value={debtData.comentario}
                                    onChange={(e) => setDebtData('comentario', e.target.value)}
                                />
                                {debtErrors.comentario && <p className="mt-1 text-sm text-red-500">{debtErrors.comentario}</p>}
                            </div>
                            <Button type="submit" disabled={debtProcessing}>
                                Pagar Deuda
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
