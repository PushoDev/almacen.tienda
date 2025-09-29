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
// 💡 1. COMPONENTE DE ALERTA (Toast Simple)
// ------------------------------------
// Puedes reemplazar esto con tu librería de toast preferida (Sonner, Hot-Toast, etc.)
interface AlertState {
    show: boolean;
    message: string;
    type: 'success' | 'error';
}

const ToastAlert: React.FC<AlertState> = ({ show, message, type }) => {
    if (!show) return null;

    // Clases simples de Tailwind para posicionamiento y estilo
    const baseClasses = 'fixed bottom-5 right-5 p-4 rounded-md shadow-lg transition-all duration-300 z-50';
    const colorClasses = type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white';

    return <div className={`${baseClasses} ${colorClasses}`}>{message}</div>;
};
// ------------------------------------

// Función auxiliar para obtener la fecha de hoy en formato YYYY-MM-DD
const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
};

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
// 2. COMPONENTE PRINCIPAL (Movimientos)
// ------------------------------------
export default function Movimientos({ cuentas }: Props) {
    // 💡 Estado para gestionar el toast
    const [alert, setAlert] = useState<AlertState>({ show: false, message: '', type: 'success' });

    // 💡 Función para mostrar el toast
    const showToast = (message: string, type: 'success' | 'error') => {
        setAlert({ show: true, message, type });
        // Ocultar automáticamente después de 4 segundos
        setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 4000);
    };

    // ------------------------------------
    // 1. FORMULARIO DE GASTO (EGRESO)
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
        descripcion: '',
        moneda: '',
        fecha_operacion: getTodayDate(),
    });

    const handleGastoSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const cuentaOrigenId = gastoData.cuenta_origen_id;

        postGasto(route('movimientos.gasto.store'), {
            onSuccess: () => {
                showToast('¡Gasto registrado con éxito!', 'success');

                resetGasto();
                setGastoData((data) => {
                    const selectedCuenta = cuentas.find((c) => String(c.id) === cuentaOrigenId);
                    return {
                        ...data,
                        fecha_operacion: getTodayDate(),
                        cuenta_origen_id: cuentaOrigenId,
                        moneda: selectedCuenta?.tipo_moneda ?? '',
                        monto: '',
                        descripcion: '',
                    };
                });
            },
            onError: () => {
                showToast('Hubo un error al registrar el gasto. Revisa los campos.', 'error');
            },
        });
    };

    // ------------------------------------
    // 2. FORMULARIO DE INGRESO (GANANCIA)
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
        descripcion: '',
        moneda: '',
        tasa_cambio: '',
        fecha_operacion: getTodayDate(),
    });

    const handleIngresoSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cuentaDestinoId = ingresoData.cuenta_destino_id;

        postIngreso(route('movimientos.ingreso.store'), {
            onSuccess: () => {
                showToast('¡Ingreso registrado con éxito!', 'success');

                resetIngreso();
                setIngresoData((data) => {
                    const selectedCuenta = cuentas.find((c) => String(c.id) === cuentaDestinoId);
                    return {
                        ...data,
                        fecha_operacion: getTodayDate(),
                        cuenta_destino_id: cuentaDestinoId,
                        moneda: selectedCuenta?.tipo_moneda ?? '',
                        monto: '',
                        descripcion: '',
                    };
                });
            },
            onError: () => {
                showToast('Hubo un error al registrar el ingreso. Revisa los campos.', 'error');
            },
        });
    };

    // ------------------------------------
    // 3. FORMULARIO DE TRANSFERENCIA INTERNA
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
        descripcion: '',
        moneda: '',
        tasa_cambio: '',
        fecha_operacion: getTodayDate(),
    });

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cuentaOrigenId = transferData.cuenta_origen_id;

        postTransfer(route('movimientos.transferencia.store'), {
            onSuccess: () => {
                showToast('¡Transferencia realizada con éxito!', 'success');

                resetTransfer();
                setTransferData((data) => {
                    const selectedCuenta = cuentas.find((c) => String(c.id) === cuentaOrigenId);
                    return {
                        ...data,
                        fecha_operacion: getTodayDate(),
                        cuenta_origen_id: cuentaOrigenId,
                        moneda: selectedCuenta?.tipo_moneda ?? '',
                        monto: '',
                        descripcion: '',
                    };
                });
            },
            onError: () => {
                showToast('Hubo un error al realizar la transferencia. Revisa los campos.', 'error');
            },
        });
    };

    /**
     * Maneja el cambio de cuenta y actualiza la moneda.
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
                    <TabsList className="grid w-full grid-cols-4 md:grid-cols-3">
                        <TabsTrigger value="gasto">Gasto</TabsTrigger>
                        <TabsTrigger value="ingreso">Ingreso</TabsTrigger>
                        <TabsTrigger value="transferir">Transferir</TabsTrigger>
                    </TabsList>

                    {/* =======================================================
                        1. FORMULARIO DE GASTO (Egreso)
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

                            {/* Campo de fecha */}
                            <div>
                                <Label htmlFor="fecha_gasto">Fecha de Operación</Label>
                                <Input
                                    type="date"
                                    id="fecha_gasto"
                                    value={gastoData.fecha_operacion}
                                    onChange={(e) => setGastoData('fecha_operacion', e.target.value)}
                                />
                                {gastoErrors.fecha_operacion && <p className="mt-1 text-sm text-red-500">{gastoErrors.fecha_operacion}</p>}
                            </div>

                            {/* Moneda solo de lectura */}
                            <div>
                                <Label htmlFor="moneda_gasto">Moneda</Label>
                                <Input
                                    id="moneda_gasto"
                                    value={gastoData.moneda || 'Seleccione cuenta'}
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
                                />
                                {gastoErrors.monto && <p className="mt-1 text-sm text-red-500">{gastoErrors.monto}</p>}
                            </div>

                            <div>
                                <Label htmlFor="descripcion_gasto">Descripción / Concepto</Label>
                                <Textarea
                                    id="descripcion_gasto"
                                    value={gastoData.descripcion}
                                    onChange={(e) => setGastoData('descripcion', e.target.value)}
                                />
                                {gastoErrors.descripcion && <p className="mt-1 text-sm text-red-500">{gastoErrors.descripcion}</p>}
                            </div>
                            <Button type="submit" disabled={gastoProcessing || !gastoData.moneda || Number(gastoData.monto) <= 0}>
                                Registrar Gasto
                            </Button>
                        </form>
                    </TabsContent>

                    {/* =======================================================
                        2. FORMULARIO DE INGRESO (Ganancia)
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

                            {/* Campo de fecha */}
                            <div>
                                <Label htmlFor="fecha_ingreso">Fecha de Operación</Label>
                                <Input
                                    type="date"
                                    id="fecha_ingreso"
                                    value={ingresoData.fecha_operacion}
                                    onChange={(e) => setIngresoData('fecha_operacion', e.target.value)}
                                />
                                {ingresoErrors.fecha_operacion && <p className="mt-1 text-sm text-red-500">{ingresoErrors.fecha_operacion}</p>}
                            </div>

                            {/* Moneda solo de lectura */}
                            <div>
                                <Label htmlFor="moneda_ingreso">Moneda de la Cuenta</Label>
                                <Input
                                    id="moneda_ingreso"
                                    value={ingresoData.moneda || 'Seleccione cuenta'}
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
                                />
                                {ingresoErrors.monto && <p className="mt-1 text-sm text-red-500">{ingresoErrors.monto}</p>}
                            </div>

                            {/* Campo opcional de Tasa de Cambio */}
                            <div>
                                <Label htmlFor="tasa_cambio_ingreso">Tasa de Cambio (Opcional)</Label>
                                <Input
                                    type="number"
                                    id="tasa_cambio_ingreso"
                                    value={ingresoData.tasa_cambio}
                                    onChange={(e) => setIngresoData('tasa_cambio', e.target.value)}
                                    step="0.01"
                                    placeholder="Solo si la moneda de origen es diferente a la de la cuenta"
                                />
                                {ingresoErrors.tasa_cambio && <p className="mt-1 text-sm text-red-500">{ingresoErrors.tasa_cambio}</p>}
                            </div>

                            <div>
                                <Label htmlFor="descripcion_ingreso">Descripción / Concepto</Label>
                                <Textarea
                                    id="descripcion_ingreso"
                                    value={ingresoData.descripcion}
                                    onChange={(e) => setIngresoData('descripcion', e.target.value)}
                                />
                                {ingresoErrors.descripcion && <p className="mt-1 text-sm text-red-500">{ingresoErrors.descripcion}</p>}
                            </div>
                            <Button type="submit" disabled={ingresoProcessing || !ingresoData.moneda || Number(ingresoData.monto) <= 0}>
                                Registrar Ingreso
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

                            {/* Campo de fecha */}
                            <div>
                                <Label htmlFor="fecha_transferir">Fecha de Operación</Label>
                                <Input
                                    type="date"
                                    id="fecha_transferir"
                                    value={transferData.fecha_operacion}
                                    onChange={(e) => setTransferData('fecha_operacion', e.target.value)}
                                />
                                {transferErrors.fecha_operacion && <p className="mt-1 text-sm text-red-500">{transferErrors.fecha_operacion}</p>}
                            </div>

                            {/* Moneda solo de lectura */}
                            <div>
                                <Label htmlFor="moneda_transferir">Moneda de Transferencia (Origen)</Label>
                                <Input
                                    id="moneda_transferir"
                                    value={transferData.moneda || 'Seleccione cuenta de origen'}
                                    readOnly
                                    className="bg-gray-100 dark:bg-gray-800"
                                />
                                {transferErrors.moneda && <p className="mt-1 text-sm text-red-500">{transferErrors.moneda}</p>}
                            </div>

                            <div>
                                <Label htmlFor="monto_transferir">Monto</Label>
                                <Input
                                    type="number"
                                    id="monto_transferir"
                                    value={transferData.monto}
                                    onChange={(e) => setTransferData('monto', e.target.value)}
                                    step="0.01"
                                    min="0.01"
                                />
                                {transferErrors.monto && <p className="mt-1 text-sm text-red-500">{transferErrors.monto}</p>}
                            </div>

                            {/* Campo opcional de Tasa de Cambio */}
                            <div>
                                <Label htmlFor="tasa_cambio_transferir">Tasa de Cambio (Opcional)</Label>
                                <Input
                                    type="number"
                                    id="tasa_cambio_transferir"
                                    value={transferData.tasa_cambio}
                                    onChange={(e) => setTransferData('tasa_cambio', e.target.value)}
                                    step="0.01"
                                    placeholder="Solo si las monedas de origen/destino son diferentes"
                                />
                                {transferErrors.tasa_cambio && <p className="mt-1 text-sm text-red-500">{transferErrors.tasa_cambio}</p>}
                            </div>

                            <div>
                                <Label htmlFor="descripcion_transferir">Descripción</Label>
                                <Textarea
                                    id="descripcion_transferir"
                                    value={transferData.descripcion}
                                    onChange={(e) => setTransferData('descripcion', e.target.value)}
                                />
                                {transferErrors.descripcion && <p className="mt-1 text-sm text-red-500">{transferErrors.descripcion}</p>}
                            </div>
                            <Button type="submit" disabled={transferProcessing || !transferData.moneda || Number(transferData.monto) <= 0}>
                                Transferir
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </CardContent>

            {/* 💡 Agregamos el Toast al final del componente */}
            <ToastAlert show={alert.show} message={alert.message} type={alert.type} />
        </Card>
    );
}
