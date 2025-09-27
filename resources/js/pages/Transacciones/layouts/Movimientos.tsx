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
    });

    const handleGastoSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // 🛠️ RUTA CORREGIDA
        postGasto(route('movimientos.gasto.store'), {
            onSuccess: () => resetGasto(),
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
    });

    const handleIngresoSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // 🛠️ RUTA CORREGIDA
        postIngreso(route('movimientos.ingreso.store'), {
            onSuccess: () => resetIngreso(),
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
    });

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // 🛠️ RUTA CORREGIDA
        postTransfer(route('movimientos.transferencia.store'), {
            onSuccess: () => resetTransfer(),
        });
    };

    // ------------------------------------
    // 4. FORMULARIO DE PAGO DE DEUDA
    // ------------------------------------
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
        descripcion: '',
    });

    const handleDebtSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // RUTA ASUMIDA (Si el formulario existe, debe apuntar a una ruta POST)
        postDebt(route('transacciones.pagar-deuda'), {
            onSuccess: () => resetDebt(),
        });
    };

    const cuentasConDeuda = cuentas.filter((c) => c.deuda > 0);

    const handleCuentaChange = (value: string, type: 'origen' | 'destino' | 'gasto', formSetter: any) => {
        const selectedCuenta = cuentas.find((c) => String(c.id) === value);
        if (selectedCuenta) {
            if (type === 'gasto' || type === 'origen') {
                formSetter('cuenta_origen_id', value);
            } else if (type === 'destino') {
                formSetter('cuenta_destino_id', value);
            }

            // La moneda se actualiza en el formulario de Gasto/Ingreso/Transferencia.
            // Para Gasto/Ingreso, la moneda será la de la cuenta seleccionada.
            // Para Transferencia, la moneda se toma de la cuenta de origen.
            formSetter('moneda', selectedCuenta.tipo_moneda);
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
                    <TabsList className="grid w-full grid-cols-4 md:grid-cols-4">
                        <TabsTrigger value="gasto">Gasto</TabsTrigger>
                        <TabsTrigger value="ingreso">Ingreso</TabsTrigger>
                        <TabsTrigger value="transferir">Transferir</TabsTrigger>
                        <TabsTrigger value="pagar-deuda">Pagar Deuda</TabsTrigger>
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
                            <Button type="submit" disabled={gastoProcessing || !gastoData.moneda}>
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

                            {/* Moneda solo de lectura */}
                            <div>
                                <Label htmlFor="moneda_ingreso">Moneda</Label>
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
                            <Button type="submit" disabled={ingresoProcessing || !ingresoData.moneda}>
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
                            <Button type="submit" disabled={transferProcessing || !transferData.moneda}>
                                Transferir
                            </Button>
                        </form>
                    </TabsContent>

                    {/* =======================================================
                        4. FORMULARIO DE PAGO DE DEUDA
                    ======================================================= */}
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
                                    min="0.01"
                                />
                                {debtErrors.monto && <p className="mt-1 text-sm text-red-500">{debtErrors.monto}</p>}
                            </div>

                            <div>
                                <Label htmlFor="descripcion_deuda">Descripción</Label>
                                <Textarea
                                    id="descripcion_deuda"
                                    value={debtData.descripcion}
                                    onChange={(e) => setDebtData('descripcion', e.target.value)}
                                />
                                {debtErrors.descripcion && <p className="mt-1 text-sm text-red-500">{debtErrors.descripcion}</p>}
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
