import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useForm } from '@inertiajs/react';
import { Building, DollarSign, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';

// ------------------------------------
// TIPOS DE DATOS Y UTILIDADES ACTUALIZADOS
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

// ✅ INTERFACES ACTUALIZADAS con el sistema de monedas
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
    deuda: number;
    tipo_cuenta: string;
    estado: string;
    moneda_id: number;
    moneda: Moneda;
}

interface Cliente {
    id: number;
    nombre_cliente: string;
    deuda_pago_cliente: number | string | null;
}

// ✅ INTERFAZ PARA PROVEEDORES
interface Proveedor {
    id: number;
    nombre_proveedor: string;
    telefono_proveedor: string | null;
    saldo_proveedor: number;
    correo_proveedor: string | null;
    localidad_proveedor: string | null;
    notas_proveedor: string | null;
}

interface Props {
    cuentas: Cuenta[];
    clientes: Cliente[];
    proveedores: Proveedor[];
    monedasActivas: Moneda[];
}

type EntidadTipo = 'cuenta' | 'cliente' | 'proveedor';

// ✅ INTERFAZ SIMPLIFICADA sin FormDataType
interface MovimientoForm {
    origen_tipo: EntidadTipo;
    origen_id: string;
    destino_tipo: EntidadTipo;
    destino_id: string;
    monto: string;
    moneda: string;
    moneda_destino: string;
    comentario: string;
    tasa_cambio_aplicada: string;
    monto_convertido: string;
}

// ✅ TIPO SIMPLIFICADO para setData
type FormSetter = (data: Partial<MovimientoForm> | ((data: MovimientoForm) => MovimientoForm)) => void;

// ------------------------------------
// COMPONENTE AUXILIAR PARA LA TASA DE CAMBIO CORREGIDO
// ------------------------------------
interface TasaCambioProps {
    data: MovimientoForm;
    setData: any;
    errors: Record<string, string>;
    monedasActivas: Moneda[];
}

const TasaCambioInput: React.FC<TasaCambioProps> = ({ data, setData, errors, monedasActivas }) => {
    // Solo mostramos el campo si la moneda necesita conversión (no es USD)
    const monedaSeleccionada = monedasActivas.find((m) => m.codigo_moneda === data.moneda);

    if (!monedaSeleccionada || data.moneda === 'USD') {
        return null;
    }

    // ✅ CORRECCIÓN: Asegurar que tasa_cambio sea un número
    const tasaPorDefecto =
        typeof monedaSeleccionada.tasa_cambio === 'number' ? monedaSeleccionada.tasa_cambio : Number(monedaSeleccionada.tasa_cambio) || 0;

    return (
        <div>
            <Label htmlFor="tasa_cambio">Tasa de Cambio Aplicada (USD a {data.moneda})</Label>
            <Input
                type="number"
                id="tasa_cambio"
                value={data.tasa_cambio_aplicada}
                onChange={(e) => setData({ ...data, tasa_cambio_aplicada: e.target.value })}
                step="0.0001"
                min="0.0001"
                placeholder={`Tasa por defecto: ${tasaPorDefecto.toFixed(4)}`}
            />
            <p className="mt-1 text-xs text-gray-500">Solo aplica para operaciones en {data.moneda}. La tasa se envía al backend.</p>
            {errors.tasa_cambio_aplicada && <p className="mt-1 text-sm text-red-500">{errors.tasa_cambio_aplicada}</p>}
        </div>
    );
};

// ------------------------------------
// COMPONENTE DE CONVERSIÓN PARA TRANSFERENCIAS
// ------------------------------------
interface ConversionTransferenciaProps {
    data: MovimientoForm;
    setData: any;
    errors: Record<string, string>;
    monedasActivas: Moneda[];
}

const ConversionTransferencia: React.FC<ConversionTransferenciaProps> = ({ data, setData, errors, monedasActivas }) => {
    // Si no hay moneda de origen o destino, no mostrar nada
    if (!data.moneda || !data.moneda_destino) {
        return null;
    }

    // Si son la misma moneda, no hay conversión
    if (data.moneda === data.moneda_destino) {
        return (
            <div className="rounded-md bg-blue-50 p-3 dark:bg-blue-900">
                <p className="text-sm text-blue-800 dark:text-blue-200">💰 Mismo tipo de moneda: {data.moneda}. No se requiere conversión.</p>
            </div>
        );
    }

    // Obtener información de monedas
    const monedaOrigen = monedasActivas.find((m) => m.codigo_moneda === data.moneda);
    const monedaDestino = monedasActivas.find((m) => m.codigo_moneda === data.moneda_destino);

    if (!monedaOrigen || !monedaDestino) {
        return null;
    }

    // Calcular tasa de conversión - Asegurar que siempre sea un número
    let tasaConversion = 1;
    if (data.moneda === 'USD') {
        tasaConversion = Number(monedaDestino.tasa_cambio) || 1;
    } else if (data.moneda_destino === 'USD') {
        tasaConversion = Number(monedaOrigen.tasa_cambio) || 1;
    } else {
        // Conversión entre monedas no USD (relativo a USD)
        const tasaOrigen = Number(monedaOrigen.tasa_cambio) || 1;
        const tasaDestino = Number(monedaDestino.tasa_cambio) || 1;
        tasaConversion = tasaOrigen / tasaDestino;
    }

    // Usar tasa personalizada si se proporcionó
    const tasaFinal = data.tasa_cambio_aplicada ? Number(data.tasa_cambio_aplicada) : tasaConversion;

    // Calcular monto convertido
    const montoOrigen = Number(data.monto) || 0;
    const montoConvertido = tasaFinal > 0 ? montoOrigen / tasaFinal : 0;

    // Actualizar monto convertido en el formulario
    useEffect(() => {
        if (montoOrigen > 0 && tasaFinal > 0) {
            setData((prev: MovimientoForm) => ({
                ...prev,
                monto_convertido: montoConvertido.toFixed(2),
            }));
        }
    }, [montoOrigen, tasaFinal]);

    return (
        <div className="space-y-3">
            <div className="rounded-md bg-green-50 p-3 dark:bg-green-900">
                <h4 className="mb-2 text-sm font-semibold text-green-800 dark:text-green-200">🔄 Conversión de Moneda</h4>
                <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
                    <p>
                        Origen: {montoOrigen.toFixed(2)} {data.moneda}
                    </p>
                    <p>
                        Destino: {montoConvertido.toFixed(2)} {data.moneda_destino}
                    </p>
                    <p>
                        Tasa: 1 {data.moneda} = {tasaFinal > 0 ? (1 / tasaFinal).toFixed(6) : '0'} {data.moneda_destino}
                    </p>
                </div>
            </div>

            <div>
                <Label htmlFor="tasa_cambio_transferencia">Tasa de Cambio (Editable)</Label>
                <Input
                    type="number"
                    id="tasa_cambio_transferencia"
                    value={data.tasa_cambio_aplicada || ''}
                    onChange={(e) => setData({ ...data, tasa_cambio_aplicada: e.target.value })}
                    step="0.0001"
                    min="0.0001"
                    placeholder={`Tasa del sistema: ${tasaConversion.toFixed(4)}`}
                />
                <p className="mt-1 text-xs text-gray-500">
                    Puede editar la tasa para esta transferencia. Vacío usa tasa del sistema ({tasaConversion.toFixed(4)}).
                </p>
                {errors.tasa_cambio_aplicada && <p className="mt-1 text-sm text-red-500">{errors.tasa_cambio_aplicada}</p>}
            </div>
        </div>
    );
};

// ------------------------------------
// COMPONENTE PRINCIPAL (Movimientos) CORREGIDO
// ------------------------------------
export default function Movimientos({ cuentas, clientes, proveedores, monedasActivas }: Props) {
    const [alert, setAlert] = useState<AlertState>({ show: false, message: '', type: 'success' });

    const showToast = (message: string, type: 'success' | 'error') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 4000);
    };

    // --- FORMULARIOS SIMPLIFICADOS ---
    const {
        data: gastoData,
        setData: setGastoData,
        post: postGasto,
        processing: gastoProcessing,
        errors: gastoErrors,
        reset: resetGasto,
    } = useForm<MovimientoForm>({
        origen_tipo: 'cuenta',
        origen_id: '',
        monto: '',
        moneda: '',
        moneda_destino: '',
        comentario: '',
        destino_tipo: 'cuenta',
        destino_id: '',
        tasa_cambio_aplicada: '',
        monto_convertido: '',
    });

    const handleGastoSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // ✅ CORRECCIÓN: Enviar datos correctamente
        postGasto(route('transacciones.gastar'), {
            onSuccess: () => {
                showToast('¡Gasto registrado con éxito!', 'success');
                resetGasto();
            },
            onError: (errors) => {
                console.error('Errores de Gasto:', errors);
                showToast('Hubo un error al registrar el gasto. Revisa los campos.', 'error');
            },
        });
    };

    const {
        data: ingresoData,
        setData: setIngresoData,
        post: postIngreso,
        processing: ingresoProcessing,
        errors: ingresoErrors,
        reset: resetIngreso,
    } = useForm<MovimientoForm>({
        destino_tipo: 'cuenta',
        destino_id: '',
        monto: '',
        moneda: '',
        moneda_destino: '',
        comentario: '',
        origen_tipo: 'cuenta',
        origen_id: '',
        tasa_cambio_aplicada: '',
        monto_convertido: '',
    });

    const handleIngresoSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        postIngreso(route('transacciones.ingresar'), {
            onSuccess: () => {
                showToast('¡Ingreso registrado con éxito!', 'success');
                resetIngreso();
            },
            onError: (errors) => {
                console.error('Errores de Ingreso:', errors);
                showToast('Hubo un error al registrar el ingreso. Revisa los campos.', 'error');
            },
        });
    };

    const {
        data: transferData,
        setData: setTransferData,
        post: postTransfer,
        processing: transferProcessing,
        errors: transferErrors,
        reset: resetTransfer,
    } = useForm<MovimientoForm>({
        origen_tipo: 'cuenta',
        origen_id: '',
        destino_tipo: 'cuenta',
        destino_id: '',
        monto: '',
        moneda: '',
        moneda_destino: '',
        comentario: '',
        tasa_cambio_aplicada: '',
        monto_convertido: '',
    });

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (transferData.origen_tipo === transferData.destino_tipo && transferData.origen_id === transferData.destino_id) {
            showToast('El origen y el destino de la transferencia no pueden ser la misma entidad.', 'error');
            return;
        }

        postTransfer(route('transacciones.transferir'), {
            onSuccess: () => {
                showToast('¡Transferencia realizada con éxito!', 'success');
                resetTransfer();
            },
            onError: (errors) => {
                console.error('Errores de Transferencia:', errors);
                const errorMessage = errors.destino_id || 'Hubo un error al realizar la transferencia. Revisa los campos.';
                showToast(errorMessage, 'error');
            },
        });
    };

    // Efecto para recalcular conversión en transferencias
    useEffect(() => {
        if (transferData.moneda && transferData.moneda_destino && transferData.monto) {
            const monedaOrigen = monedasActivas.find((m) => m.codigo_moneda === transferData.moneda);
            const monedaDestino = monedasActivas.find((m) => m.codigo_moneda === transferData.moneda_destino);

            if (monedaOrigen && monedaDestino && transferData.moneda !== transferData.moneda_destino) {
                let tasaConversion = 1;
                if (transferData.moneda === 'USD') {
                    tasaConversion = Number(monedaDestino.tasa_cambio) || 1;
                } else if (transferData.moneda_destino === 'USD') {
                    tasaConversion = Number(monedaOrigen.tasa_cambio) || 1;
                } else {
                    const tasaOrigen = Number(monedaOrigen.tasa_cambio) || 1;
                    const tasaDestino = Number(monedaDestino.tasa_cambio) || 1;
                    tasaConversion = tasaOrigen / tasaDestino;
                }

                const tasaFinal = transferData.tasa_cambio_aplicada ? Number(transferData.tasa_cambio_aplicada) : tasaConversion;
                const montoOrigen = Number(transferData.monto) || 0;
                const montoConvertido = tasaFinal > 0 ? montoOrigen / tasaFinal : 0;

                setTransferData((prev) => ({
                    ...prev,
                    monto_convertido: montoConvertido.toFixed(2),
                }));
            }
        }
    }, [transferData.moneda, transferData.moneda_destino, transferData.monto, transferData.tasa_cambio_aplicada, monedasActivas]);

    // --- MANEJADORES Y AYUDANTES DE RENDERIZADO ACTUALIZADOS ---

    const handleEntidadChange = (value: string, tipoEntidad: EntidadTipo, campo: 'origen' | 'destino', formSetter: any) => {
        const id = Number(value);
        let selectedMoneda = '';
        let initialTasa = '';

        if (tipoEntidad === 'cuenta') {
            const selectedCuenta = cuentas.find((c) => c.id === id);
            selectedMoneda = selectedCuenta?.moneda.codigo_moneda || '';

            // ✅ ACTUALIZADO: Obtener tasa de la moneda seleccionada
            if (selectedMoneda && selectedMoneda !== 'USD') {
                const monedaInfo = monedasActivas.find((m) => m.codigo_moneda === selectedMoneda);
                if (monedaInfo) {
                    // ✅ CORRECCIÓN: Asegurar que la tasa sea un número
                    const tasa = typeof monedaInfo.tasa_cambio === 'number' ? monedaInfo.tasa_cambio : Number(monedaInfo.tasa_cambio) || 0;
                    initialTasa = String(tasa);
                }
            }
        } else if (tipoEntidad === 'cliente' || tipoEntidad === 'proveedor') {
            // Asumiendo que la deuda/pago del cliente y saldo de proveedores es siempre en USD
            selectedMoneda = 'USD';
            initialTasa = '';
        }

        if (formSetter === setTransferData) {
            setTransferData((data: MovimientoForm) => {
                const newData = { ...data };

                if (campo === 'origen') {
                    newData.origen_tipo = tipoEntidad;
                    newData.origen_id = value;
                    newData.moneda = selectedMoneda;
                    newData.tasa_cambio_aplicada = initialTasa;
                    // Resetear moneda destino y monto convertido cuando cambia el origen
                    newData.moneda_destino = '';
                    newData.monto_convertido = '';
                }

                if (campo === 'destino') {
                    newData.destino_tipo = tipoEntidad;
                    newData.destino_id = value;
                    newData.moneda_destino = selectedMoneda;
                }
                return newData;
            });
        } else if (formSetter === setGastoData) {
            setGastoData((data: MovimientoForm) => {
                const newData = { ...data };
                if (campo === 'origen') {
                    newData.origen_tipo = tipoEntidad;
                    newData.origen_id = value;
                    newData.moneda = selectedMoneda;
                    newData.tasa_cambio_aplicada = initialTasa;
                }
                return newData;
            });
        } else if (formSetter === setIngresoData) {
            setIngresoData((data: MovimientoForm) => {
                const newData = { ...data };
                if (campo === 'destino') {
                    newData.destino_tipo = tipoEntidad;
                    newData.destino_id = value;
                    newData.moneda = selectedMoneda;
                    newData.moneda_destino = selectedMoneda;
                    newData.tasa_cambio_aplicada = initialTasa;
                }
                return newData;
            });
        }
    };

    /**
     * Devuelve una cadena de información sobre la entidad para mostrar en el selector.
     */
    const getEntidadInfo = (id: number, tipo: EntidadTipo): string => {
        if (tipo === 'cuenta') {
            const cuenta = cuentas.find((c) => c.id === id);
            return cuenta
                ? `${cuenta.nombre_cuenta} (${cuenta.moneda.codigo_moneda}) - Saldo: ${cuenta.saldo_cuenta.toFixed(2)}`
                : 'Cuenta no encontrada';
        }
        if (tipo === 'cliente') {
            const cliente = clientes.find((c) => c.id === id);
            if (!cliente) return 'Cliente no encontrado';

            const deudaMonto = Number(cliente.deuda_pago_cliente) || 0;
            return `${cliente.nombre_cliente} (Cliente) - Deuda/Pago: ${deudaMonto.toFixed(2)} USD`;
        }
        if (tipo === 'proveedor') {
            const proveedor = proveedores.find((p) => p.id === id);
            if (!proveedor) return 'Proveedor no encontrado';

            // ✅ CORRECCIÓN: Asegurar que saldo_proveedor sea un número
            const saldo = typeof proveedor.saldo_proveedor === 'number' ? proveedor.saldo_proveedor : Number(proveedor.saldo_proveedor) || 0;

            return `${proveedor.nombre_proveedor} (Proveedor) - Saldo: ${saldo.toFixed(2)} USD`;
        }
        return '';
    };

    /**
     * Renderiza las opciones de selector, excluyendo la entidad seleccionada en el lado opuesto (solo para Transferencia).
     */
    const renderSelectOptions = (tipoEntidad: EntidadTipo, exclusionId: string = '', exclusionTipo: string = '') => {
        if (tipoEntidad === 'cuenta') {
            return cuentas
                .filter((c) => !(exclusionId === String(c.id) && exclusionTipo === 'cuenta'))
                .map((cuenta) => (
                    <SelectItem key={`c-${cuenta.id}`} value={String(cuenta.id)}>
                        {getEntidadInfo(cuenta.id, 'cuenta')}
                    </SelectItem>
                ));
        }
        if (tipoEntidad === 'cliente') {
            return clientes
                .filter((cl) => !(exclusionId === String(cl.id) && exclusionTipo === 'cliente'))
                .map((cliente) => (
                    <SelectItem key={`cl-${cliente.id}`} value={String(cliente.id)}>
                        {getEntidadInfo(cliente.id, 'cliente')}
                    </SelectItem>
                ));
        }
        if (tipoEntidad === 'proveedor') {
            return proveedores
                .filter((p) => !(exclusionId === String(p.id) && exclusionTipo === 'proveedor'))
                .map((proveedor) => (
                    <SelectItem key={`p-${proveedor.id}`} value={String(proveedor.id)}>
                        {getEntidadInfo(proveedor.id, 'proveedor')}
                    </SelectItem>
                ));
        }
        return null;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Movimientos Financieros</CardTitle>
                <CardDescription>
                    Registre entradas (Ingreso), salidas (Gasto) o movimientos entre sus entidades (Transferencia).
                    <br />
                    <span className="text-muted-foreground text-xs">
                        ✅ Sistema actualizado con monedas dinámicas: {monedasActivas.map((m) => m.codigo_moneda).join(', ')}
                    </span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="gasto">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="gasto">Gasto</TabsTrigger>
                        <TabsTrigger value="ingreso">Ingreso</TabsTrigger>
                        <TabsTrigger value="transferir">Transferir</TabsTrigger>
                    </TabsList>

                    {/* FORMULARIO DE GASTO */}
                    <TabsContent value="gasto" className="mt-4">
                        <form onSubmit={handleGastoSubmit} className="space-y-4">
                            {/* Selector de Tipo de Origen */}
                            <div>
                                <Label className="mb-2 block">Origen del Gasto</Label>
                                <ToggleGroup
                                    type="single"
                                    value={gastoData.origen_tipo || 'cuenta'}
                                    onValueChange={(value: string) => {
                                        if (value === 'cuenta' || value === 'cliente') {
                                            setGastoData({
                                                ...gastoData,
                                                origen_tipo: value as EntidadTipo,
                                                origen_id: '',
                                                moneda: '',
                                                tasa_cambio_aplicada: '',
                                            });
                                        }
                                    }}
                                    className="justify-start"
                                >
                                    <ToggleGroupItem value="cuenta" aria-label="Cuenta">
                                        <DollarSign className="mr-2 h-4 w-4" /> Cuenta
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="cliente" aria-label="Cliente">
                                        <User className="mr-2 h-4 w-4" /> Cliente (Afecta Deuda)
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </div>

                            {/* Selector de Entidad de Origen */}
                            <div>
                                <Label htmlFor="origen_id_gasto">
                                    Entidad de Origen ({gastoData.origen_tipo === 'cuenta' ? 'Cuenta' : 'Cliente'})
                                </Label>
                                <Select
                                    onValueChange={(value) => handleEntidadChange(value, gastoData.origen_tipo, 'origen', setGastoData)}
                                    value={gastoData.origen_id}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={`Seleccione ${gastoData.origen_tipo === 'cuenta' ? 'la cuenta' : 'el cliente'} de donde sale el dinero`}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>{renderSelectOptions(gastoData.origen_tipo)}</SelectContent>
                                </Select>
                                {gastoErrors.origen_id && <p className="mt-1 text-sm text-red-500">{gastoErrors.origen_id}</p>}
                            </div>

                            {/* Resto de campos de Gasto */}
                            <div>
                                <Label htmlFor="moneda_gasto">Moneda</Label>
                                <Input
                                    id="moneda_gasto"
                                    value={gastoData.moneda || 'Seleccione entidad primero'}
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
                                    onChange={(e) => setGastoData({ ...gastoData, monto: e.target.value })}
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                />
                                {gastoErrors.monto && <p className="mt-1 text-sm text-red-500">{gastoErrors.monto}</p>}
                            </div>

                            {/* ✅ Tasa de Cambio Condicional CORREGIDA */}
                            <TasaCambioInput data={gastoData} setData={setGastoData} errors={gastoErrors} monedasActivas={monedasActivas} />

                            <div>
                                <Label htmlFor="comentario_gasto">Comentario / Concepto</Label>
                                <Textarea
                                    id="comentario_gasto"
                                    value={gastoData.comentario}
                                    onChange={(e) => setGastoData({ ...gastoData, comentario: e.target.value })}
                                    placeholder="Descripción del gasto..."
                                />
                                {gastoErrors.comentario && <p className="mt-1 text-sm text-red-500">{gastoErrors.comentario}</p>}
                            </div>

                            <Button
                                type="submit"
                                disabled={gastoProcessing || !gastoData.origen_id || !gastoData.monto || Number(gastoData.monto) <= 0}
                                className="w-full"
                            >
                                {gastoProcessing ? 'Procesando...' : 'Registrar Gasto'}
                            </Button>
                        </form>
                    </TabsContent>

                    {/* FORMULARIO DE INGRESO */}
                    <TabsContent value="ingreso" className="mt-4">
                        <form onSubmit={handleIngresoSubmit} className="space-y-4">
                            {/* Selector de Tipo de Destino */}
                            <div>
                                <Label className="mb-2 block">Destino del Ingreso</Label>
                                <ToggleGroup
                                    type="single"
                                    value={ingresoData.destino_tipo || 'cuenta'}
                                    onValueChange={(value: string) => {
                                        if (value === 'cuenta' || value === 'cliente' || value === 'proveedor') {
                                            setIngresoData({
                                                ...ingresoData,
                                                destino_tipo: value as EntidadTipo,
                                                destino_id: '',
                                                moneda: '',
                                                tasa_cambio_aplicada: '',
                                            });
                                        }
                                    }}
                                    className="justify-start"
                                >
                                    <ToggleGroupItem value="cuenta" aria-label="Cuenta">
                                        <DollarSign className="mr-2 h-4 w-4" /> Cuenta
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="cliente" aria-label="Cliente">
                                        <User className="mr-2 h-4 w-4" /> Cliente (Afecta Deuda)
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="proveedor" aria-label="Proveedor">
                                        <Building className="mr-2 h-4 w-4" /> Proveedor
                                    </ToggleGroupItem>
                                </ToggleGroup>
                            </div>

                            {/* Selector de Entidad de Destino */}
                            <div>
                                <Label htmlFor="destino_id_ingreso">
                                    Entidad de Destino (
                                    {ingresoData.destino_tipo === 'cuenta'
                                        ? 'Cuenta'
                                        : ingresoData.destino_tipo === 'cliente'
                                          ? 'Cliente'
                                          : 'Proveedor'}
                                    )
                                </Label>
                                <Select
                                    onValueChange={(value) => handleEntidadChange(value, ingresoData.destino_tipo, 'destino', setIngresoData)}
                                    value={ingresoData.destino_id}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={`Seleccione ${
                                                ingresoData.destino_tipo === 'cuenta'
                                                    ? 'la cuenta'
                                                    : ingresoData.destino_tipo === 'cliente'
                                                      ? 'el cliente'
                                                      : 'el proveedor'
                                            } donde entra el dinero`}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>{renderSelectOptions(ingresoData.destino_tipo)}</SelectContent>
                                </Select>
                                {ingresoErrors.destino_id && <p className="mt-1 text-sm text-red-500">{ingresoErrors.destino_id}</p>}
                            </div>

                            {/* Resto de campos de Ingreso */}
                            <div>
                                <Label htmlFor="moneda_ingreso">Moneda</Label>
                                <Input
                                    id="moneda_ingreso"
                                    value={ingresoData.moneda || 'Seleccione entidad primero'}
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
                                    onChange={(e) => setIngresoData({ ...ingresoData, monto: e.target.value })}
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                />
                                {ingresoErrors.monto && <p className="mt-1 text-sm text-red-500">{ingresoErrors.monto}</p>}
                            </div>

                            {/* ✅ Tasa de Cambio Condicional CORREGIDA */}
                            <TasaCambioInput data={ingresoData} setData={setIngresoData} errors={ingresoErrors} monedasActivas={monedasActivas} />

                            <div>
                                <Label htmlFor="comentario_ingreso">Comentario / Concepto</Label>
                                <Textarea
                                    id="comentario_ingreso"
                                    value={ingresoData.comentario}
                                    onChange={(e) => setIngresoData({ ...ingresoData, comentario: e.target.value })}
                                    placeholder="Descripción del ingreso..."
                                />
                                {ingresoErrors.comentario && <p className="mt-1 text-sm text-red-500">{ingresoErrors.comentario}</p>}
                            </div>

                            <Button
                                type="submit"
                                disabled={ingresoProcessing || !ingresoData.destino_id || !ingresoData.monto || Number(ingresoData.monto) <= 0}
                                className="w-full"
                            >
                                {ingresoProcessing ? 'Procesando...' : 'Registrar Ingreso'}
                            </Button>
                        </form>
                    </TabsContent>

                    {/* FORMULARIO DE TRANSFERENCIA */}
                    <TabsContent value="transferir" className="mt-4">
                        <form onSubmit={handleTransferSubmit} className="space-y-4">
                            {/* === Origen === */}
                            <div className="rounded-md border p-3">
                                <h4 className="mb-2 text-sm font-semibold">Origen</h4>
                                {/* Tipo de Origen */}
                                <ToggleGroup
                                    type="single"
                                    value={transferData.origen_tipo || 'cuenta'}
                                    onValueChange={(value: string) => {
                                        if (value === 'cuenta' || value === 'cliente') {
                                            setTransferData({
                                                ...transferData,
                                                origen_tipo: value as EntidadTipo,
                                                origen_id: '',
                                                destino_id: '',
                                                moneda: '',
                                                tasa_cambio_aplicada: '',
                                            });
                                        }
                                    }}
                                    className="mb-2 justify-start"
                                >
                                    <ToggleGroupItem value="cuenta" aria-label="Cuenta">
                                        <DollarSign className="mr-2 h-4 w-4" /> Cuenta
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="cliente" aria-label="Cliente">
                                        <User className="mr-2 h-4 w-4" /> Cliente
                                    </ToggleGroupItem>
                                </ToggleGroup>

                                {/* Entidad de Origen */}
                                <div>
                                    <Label htmlFor="origen_id_transfer">
                                        Entidad de Origen ({transferData.origen_tipo === 'cuenta' ? 'Cuenta' : 'Cliente'})
                                    </Label>
                                    <Select
                                        onValueChange={(value) => handleEntidadChange(value, transferData.origen_tipo, 'origen', setTransferData)}
                                        value={transferData.origen_id}
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                placeholder={`Seleccione ${transferData.origen_tipo === 'cuenta' ? 'cuenta' : 'cliente'} de origen`}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {renderSelectOptions(
                                                transferData.origen_tipo,
                                                transferData.destino_tipo === transferData.origen_tipo ? transferData.destino_id : '',
                                                transferData.destino_tipo,
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {transferErrors.origen_id && <p className="mt-1 text-sm text-red-500">{transferErrors.origen_id}</p>}
                                </div>
                            </div>

                            {/* === Destino === */}
                            <div className="rounded-md border p-3">
                                <h4 className="mb-2 text-sm font-semibold">Destino</h4>
                                {/* Tipo de Destino */}
                                <ToggleGroup
                                    type="single"
                                    value={transferData.destino_tipo || 'cuenta'}
                                    onValueChange={(value: string) => {
                                        if (value === 'cuenta' || value === 'cliente' || value === 'proveedor') {
                                            setTransferData({
                                                ...transferData,
                                                destino_tipo: value as EntidadTipo,
                                                destino_id: '',
                                            });
                                        }
                                    }}
                                    className="mb-2 justify-start"
                                >
                                    <ToggleGroupItem value="cuenta" aria-label="Cuenta">
                                        <DollarSign className="mr-2 h-4 w-4" /> Cuenta
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="cliente" aria-label="Cliente">
                                        <User className="mr-2 h-4 w-4" /> Cliente
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="proveedor" aria-label="Proveedor">
                                        <Building className="mr-2 h-4 w-4" /> Proveedor
                                    </ToggleGroupItem>
                                </ToggleGroup>

                                {/* Entidad de Destino */}
                                <div>
                                    <Label htmlFor="destino_id_transfer">
                                        Entidad de Destino (
                                        {transferData.destino_tipo === 'cuenta'
                                            ? 'Cuenta'
                                            : transferData.destino_tipo === 'cliente'
                                              ? 'Cliente'
                                              : 'Proveedor'}
                                        )
                                    </Label>
                                    <Select
                                        onValueChange={(value) => handleEntidadChange(value, transferData.destino_tipo, 'destino', setTransferData)}
                                        value={transferData.destino_id}
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                placeholder={`Seleccione ${
                                                    transferData.destino_tipo === 'cuenta'
                                                        ? 'cuenta'
                                                        : transferData.destino_tipo === 'cliente'
                                                          ? 'cliente'
                                                          : 'proveedor'
                                                } de destino`}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {renderSelectOptions(
                                                transferData.destino_tipo,
                                                transferData.origen_tipo === transferData.destino_tipo ? transferData.origen_id : '',
                                                transferData.origen_tipo,
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {transferErrors.destino_id && <p className="mt-1 text-sm text-red-500">{transferErrors.destino_id}</p>}
                                </div>
                            </div>

                            {/* Resto de campos de Transferencia */}
                            <div>
                                <Label htmlFor="moneda_transferir">Moneda Origen</Label>
                                <Input
                                    id="moneda_transferir"
                                    value={transferData.moneda || 'Seleccione entidad de origen primero'}
                                    readOnly
                                    className="bg-gray-100 dark:bg-gray-800"
                                />
                                {transferErrors.moneda && <p className="mt-1 text-sm text-red-500">{transferErrors.moneda}</p>}
                            </div>

                            <div>
                                <Label htmlFor="moneda_destino_transferir">Moneda Destino</Label>
                                <Input
                                    id="moneda_destino_transferir"
                                    value={transferData.moneda_destino || 'Seleccione entidad de destino primero'}
                                    readOnly
                                    className="bg-gray-100 dark:bg-gray-800"
                                />
                            </div>

                            <div>
                                <Label htmlFor="monto_transferir">Monto a Transferir</Label>
                                <Input
                                    type="number"
                                    id="monto_transferir"
                                    value={transferData.monto}
                                    onChange={(e) => setTransferData({ ...transferData, monto: e.target.value })}
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                />
                                {transferErrors.monto && <p className="mt-1 text-sm text-red-500">{transferErrors.monto}</p>}
                            </div>

                            {transferData.monto_convertido && (
                                <div>
                                    <Label htmlFor="monto_convertido">Monto Convertido (Destino)</Label>
                                    <Input
                                        id="monto_convertido"
                                        value={transferData.monto_convertido}
                                        readOnly
                                        className="bg-green-100 font-semibold dark:bg-green-800"
                                    />
                                </div>
                            )}

                            {/* ✅ COMPONENTE DE CONVERSIÓN PARA TRANSFERENCIAS */}
                            <ConversionTransferencia
                                data={transferData}
                                setData={setTransferData}
                                errors={transferErrors}
                                monedasActivas={monedasActivas}
                            />

                            <div>
                                <Label htmlFor="comentario_transferir">Comentario</Label>
                                <Textarea
                                    id="comentario_transferir"
                                    value={transferData.comentario}
                                    onChange={(e) => setTransferData({ ...transferData, comentario: e.target.value })}
                                    placeholder="Descripción de la transferencia..."
                                />
                                {transferErrors.comentario && <p className="mt-1 text-sm text-red-500">{transferErrors.comentario}</p>}
                            </div>

                            <Button
                                type="submit"
                                disabled={
                                    transferProcessing ||
                                    !transferData.origen_id ||
                                    !transferData.destino_id ||
                                    !transferData.monto ||
                                    Number(transferData.monto) <= 0 ||
                                    (transferData.origen_tipo === transferData.destino_tipo && transferData.origen_id === transferData.destino_id)
                                }
                                className="w-full"
                            >
                                {transferProcessing ? 'Procesando...' : 'Realizar Transferencia'}
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </CardContent>

            <ToastAlert show={alert.show} message={alert.message} type={alert.type} />
        </Card>
    );
}
