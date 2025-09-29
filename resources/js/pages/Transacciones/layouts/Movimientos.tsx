import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { InertiaFormProps, useForm } from '@inertiajs/react';
import React, { useState } from 'react';

// ------------------------------------
// 💡 COMPONENTE DE ALERTA (Toast Simple)
// ------------------------------------
interface AlertState {
    show: boolean;
    message: string;
    type: 'success' | 'error';
}

const ToastAlert: React.FC<AlertState> = ({ show, message, type }) => {
    if (!show) return null;

    const baseClasses = 'fixed bottom-5 right-5 p-4 rounded-md shadow-lg transition-all duration-300 z-50';
    const colorClasses = type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white';

    return <div className={`${baseClasses} ${colorClasses}`}>{message}</div>;
};
// ------------------------------------

// ------------------------------------
// TIPOS DE DATOS
// ------------------------------------
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

type FormSetter<T> = InertiaFormProps<T>['setData'];

// ------------------------------------
// COMPONENTE PRINCIPAL (Movimientos)
// ------------------------------------
export default function Movimientos({ cuentas }: Props) {
    // 💡 Estado para gestionar el toast
    const [alert, setAlert] = useState<AlertState>({ show: false, message: '', type: 'success' });

    // 💡 Función para mostrar el toast
    const showToast = (message: string, type: 'success' | 'error') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 4000);
    };

    // ------------------------------------
    // 1. FORMULARIO DE GASTO
    // ------------------------------------
    const {
        data: gastoData,
        setData: setGastoData,
        post: postGasto,
        processing: gastoProcessing,
        errors: gastoErrors,
        reset: resetGasto,
    } = useForm({
        cuenta_origen_id: '',
        monto: '',
        moneda: '',
        comentario: '',
    });

    const handleGastoSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        postGasto(route('transacciones.gastar'), {
            onSuccess: () => {
                showToast('¡Gasto registrado con éxito!', 'success');
                resetGasto();
            },
            onError: () => {
                showToast('Hubo un error al registrar el gasto. Revisa los campos.', 'error');
            },
        });
    };

    // ------------------------------------
    // 2. FORMULARIO DE INGRESO
    // ------------------------------------
    const {
        data: ingresoData,
        setData: setIngresoData,
        post: postIngreso,
        processing: ingresoProcessing,
        errors: ingresoErrors,
        reset: resetIngreso,
    } = useForm({
        cuenta_destino_id: '',
        monto: '',
        moneda: '',
        comentario: '',
    });

    const handleIngresoSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        postIngreso(route('transacciones.ingresar'), {
            onSuccess: () => {
                showToast('¡Ingreso registrado con éxito!', 'success');
                resetIngreso();
            },
            onError: () => {
                showToast('Hubo un error al registrar el ingreso. Revisa los campos.', 'error');
            },
        });
    };

    // ------------------------------------
    // 3. FORMULARIO DE TRANSFERENCIA
    // ------------------------------------
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
        moneda: '',
        comentario: '',
    });

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        postTransfer(route('transacciones.transferir'), {
            onSuccess: () => {
                showToast('¡Transferencia realizada con éxito!', 'success');
                resetTransfer();
            },
            onError: () => {
                showToast('Hubo un error al realizar la transferencia. Revisa los campos.', 'error');
            },
        });
    };

    /**
     * Maneja el cambio de cuenta y actualiza la moneda automáticamente
     */
    const handleCuentaChange = (value: string, type: 'origen' | 'destino' | 'gasto', formSetter: FormSetter<any>) => {
        const selectedCuenta = cuentas.find((c) => String(c.id) === value);

        if (selectedCuenta) {
            formSetter((data) => {
                const newData = { ...data };

                if (type === 'gasto' || type === 'origen') {
                    newData.cuenta_origen_id = value;
                    newData.moneda = selectedCuenta.tipo_moneda;
                }

                if (type === 'destino') {
                    newData.cuenta_destino_id = value;
                    newData.moneda = selectedCuenta.tipo_moneda;
                }

                return newData;
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Movimientos Financieros</CardTitle>
                <CardDescription>Registre entradas (Ingreso), salidas (Gasto) o movimientos entre sus cuentas (Transferencia).</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="gasto">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="gasto">Gasto</TabsTrigger>
                        <TabsTrigger value="ingreso">Ingreso</TabsTrigger>
                        <TabsTrigger value="transferir">Transferir</TabsTrigger>
                    </TabsList>

                    {/* =======================================================
                        1. FORMULARIO DE GASTO
                    ======================================================= */}
                    <TabsContent value="gasto" className="mt-4">
                        <form onSubmit={handleGastoSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="cuenta_gasto">Cuenta de Origen</Label>
                                <Select
                                    onValueChange={(value) => handleCuentaChange(value, 'gasto', setGastoData)}
                                    value={gastoData.cuenta_origen_id}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione la cuenta de donde sale el dinero" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cuentas.map((cuenta) => (
                                            <SelectItem key={cuenta.id} value={String(cuenta.id)}>
                                                {cuenta.nombre_cuenta} ({cuenta.tipo_moneda}) - Saldo: {cuenta.saldo_cuenta.toFixed(2)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {gastoErrors.cuenta_origen_id && <p className="mt-1 text-sm text-red-500">{gastoErrors.cuenta_origen_id}</p>}
                            </div>

                            {/* Moneda automática (solo lectura) */}
                            <div>
                                <Label htmlFor="moneda_gasto">Moneda</Label>
                                <Input
                                    id="moneda_gasto"
                                    value={gastoData.moneda || 'Seleccione cuenta primero'}
                                    readOnly
                                    className="bg-gray-100 dark:bg-gray-800"
                                />
                                {gastoErrors.moneda && <p className="mt-1 text-sm text-red-500">{gastoErrors.moneda}</p>}
                            </div>

                            <div>
                                <Label htmlFor="monto_gasto">Monto del Gasto</Label>
                                <Input
                                    type="number"
                                    id="monto_gasto"
                                    value={gastoData.monto}
                                    onChange={(e) => setGastoData('monto', e.target.value)}
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                />
                                {gastoErrors.monto && <p className="mt-1 text-sm text-red-500">{gastoErrors.monto}</p>}
                            </div>

                            <div>
                                <Label htmlFor="comentario_gasto">Comentario / Concepto</Label>
                                <Textarea
                                    id="comentario_gasto"
                                    value={gastoData.comentario}
                                    onChange={(e) => setGastoData('comentario', e.target.value)}
                                    placeholder="Descripción del gasto..."
                                />
                                {gastoErrors.comentario && <p className="mt-1 text-sm text-red-500">{gastoErrors.comentario}</p>}
                            </div>

                            <Button
                                type="submit"
                                disabled={gastoProcessing || !gastoData.cuenta_origen_id || !gastoData.monto || Number(gastoData.monto) <= 0}
                                className="w-full"
                            >
                                {gastoProcessing ? 'Procesando...' : 'Registrar Gasto'}
                            </Button>
                        </form>
                    </TabsContent>

                    {/* =======================================================
                        2. FORMULARIO DE INGRESO
                    ======================================================= */}
                    <TabsContent value="ingreso" className="mt-4">
                        <form onSubmit={handleIngresoSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="cuenta_ingreso">Cuenta de Destino</Label>
                                <Select
                                    onValueChange={(value) => handleCuentaChange(value, 'destino', setIngresoData)}
                                    value={ingresoData.cuenta_destino_id}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione la cuenta donde entra el dinero" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cuentas.map((cuenta) => (
                                            <SelectItem key={cuenta.id} value={String(cuenta.id)}>
                                                {cuenta.nombre_cuenta} ({cuenta.tipo_moneda}) - Saldo: {cuenta.saldo_cuenta.toFixed(2)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {ingresoErrors.cuenta_destino_id && <p className="mt-1 text-sm text-red-500">{ingresoErrors.cuenta_destino_id}</p>}
                            </div>

                            {/* Moneda automática (solo lectura) */}
                            <div>
                                <Label htmlFor="moneda_ingreso">Moneda</Label>
                                <Input
                                    id="moneda_ingreso"
                                    value={ingresoData.moneda || 'Seleccione cuenta primero'}
                                    readOnly
                                    className="bg-gray-100 dark:bg-gray-800"
                                />
                                {ingresoErrors.moneda && <p className="mt-1 text-sm text-red-500">{ingresoErrors.moneda}</p>}
                            </div>

                            <div>
                                <Label htmlFor="monto_ingreso">Monto del Ingreso</Label>
                                <Input
                                    type="number"
                                    id="monto_ingreso"
                                    value={ingresoData.monto}
                                    onChange={(e) => setIngresoData('monto', e.target.value)}
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                />
                                {ingresoErrors.monto && <p className="mt-1 text-sm text-red-500">{ingresoErrors.monto}</p>}
                            </div>

                            <div>
                                <Label htmlFor="comentario_ingreso">Comentario / Concepto</Label>
                                <Textarea
                                    id="comentario_ingreso"
                                    value={ingresoData.comentario}
                                    onChange={(e) => setIngresoData('comentario', e.target.value)}
                                    placeholder="Descripción del ingreso..."
                                />
                                {ingresoErrors.comentario && <p className="mt-1 text-sm text-red-500">{ingresoErrors.comentario}</p>}
                            </div>

                            <Button
                                type="submit"
                                disabled={ingresoProcessing || !ingresoData.cuenta_destino_id || !ingresoData.monto || Number(ingresoData.monto) <= 0}
                                className="w-full"
                            >
                                {ingresoProcessing ? 'Procesando...' : 'Registrar Ingreso'}
                            </Button>
                        </form>
                    </TabsContent>

                    {/* =======================================================
                        3. FORMULARIO DE TRANSFERENCIA
                    ======================================================= */}
                    <TabsContent value="transferir" className="mt-4">
                        <form onSubmit={handleTransferSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="cuenta_origen">Cuenta de Origen</Label>
                                <Select
                                    onValueChange={(value) => handleCuentaChange(value, 'origen', setTransferData)}
                                    value={transferData.cuenta_origen_id}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione cuenta de origen" />
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
                                        <SelectValue placeholder="Seleccione cuenta de destino" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cuentas
                                            .filter((cuenta) => String(cuenta.id) !== transferData.cuenta_origen_id)
                                            .map((cuenta) => (
                                                <SelectItem key={cuenta.id} value={String(cuenta.id)}>
                                                    {cuenta.nombre_cuenta} ({cuenta.tipo_moneda}) - Saldo: {cuenta.saldo_cuenta.toFixed(2)}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                {transferErrors.cuenta_destino_id && <p className="mt-1 text-sm text-red-500">{transferErrors.cuenta_destino_id}</p>}
                            </div>

                            {/* Moneda automática (solo lectura) */}
                            <div>
                                <Label htmlFor="moneda_transferir">Moneda</Label>
                                <Input
                                    id="moneda_transferir"
                                    value={transferData.moneda || 'Seleccione cuenta de origen primero'}
                                    readOnly
                                    className="bg-gray-100 dark:bg-gray-800"
                                />
                                {transferErrors.moneda && <p className="mt-1 text-sm text-red-500">{transferErrors.moneda}</p>}
                            </div>

                            <div>
                                <Label htmlFor="monto_transferir">Monto a Transferir</Label>
                                <Input
                                    type="number"
                                    id="monto_transferir"
                                    value={transferData.monto}
                                    onChange={(e) => setTransferData('monto', e.target.value)}
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                />
                                {transferErrors.monto && <p className="mt-1 text-sm text-red-500">{transferErrors.monto}</p>}
                            </div>

                            <div>
                                <Label htmlFor="comentario_transferir">Comentario</Label>
                                <Textarea
                                    id="comentario_transferir"
                                    value={transferData.comentario}
                                    onChange={(e) => setTransferData('comentario', e.target.value)}
                                    placeholder="Descripción de la transferencia..."
                                />
                                {transferErrors.comentario && <p className="mt-1 text-sm text-red-500">{transferErrors.comentario}</p>}
                            </div>

                            <Button
                                type="submit"
                                disabled={
                                    transferProcessing ||
                                    !transferData.cuenta_origen_id ||
                                    !transferData.cuenta_destino_id ||
                                    !transferData.monto ||
                                    Number(transferData.monto) <= 0 ||
                                    transferData.cuenta_origen_id === transferData.cuenta_destino_id
                                }
                                className="w-full"
                            >
                                {transferProcessing ? 'Procesando...' : 'Realizar Transferencia'}
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </CardContent>

            {/* 💡 Toast Alert */}
            <ToastAlert show={alert.show} message={alert.message} type={alert.type} />
        </Card>
    );
}
