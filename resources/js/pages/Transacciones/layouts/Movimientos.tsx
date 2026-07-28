import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
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
    tipo_titular: string | null;
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
    cuentasOrigen: Cuenta[];
    cuentasDestino: Cuenta[];
    clientes: Cliente[];
    proveedores: Proveedor[];
    monedasActivas: Moneda[];
    userRole: string;
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
    monedaForRate?: string;
}

const TasaCambioInput: React.FC<TasaCambioProps> = ({ data, setData, errors, monedasActivas, monedaForRate }) => {
    const monedaEfectiva = monedaForRate || data.moneda;
    const monedaInfo = monedasActivas.find((m) => m.codigo_moneda === monedaEfectiva);

    if (!monedaInfo) return null;
    if (!monedaForRate && monedaEfectiva === 'USD') return null;

    const tasaPorDefecto =
        typeof monedaInfo.tasa_cambio === 'number' ? monedaInfo.tasa_cambio : Number(monedaInfo.tasa_cambio) || 0;

    return (
        <div>
            <Label htmlFor="tasa_cambio">Tasa de Cambio (1 USD = ? {monedaEfectiva})</Label>
            <Input
                type="number"
                id="tasa_cambio"
                value={data.tasa_cambio_aplicada}
                onChange={(e) => setData({ ...data, tasa_cambio_aplicada: e.target.value })}
                step="0.0001"
                min="0.0001"
                placeholder={`Tasa por defecto: ${tasaPorDefecto.toFixed(4)}`}
            />
            <p className="mt-1 text-xs text-gray-500">La tasa se envía al backend.</p>
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

    // Determinar tipos de entidad
    const origenEsCuenta = data.origen_tipo === 'cuenta';
    const destinoEsCuenta = data.destino_tipo === 'cuenta';

    // Si ambos son cliente/proveedor (USD), no hay conversión
    if (!origenEsCuenta && !destinoEsCuenta) {
        return (
            <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
                <p className="text-sm text-gray-800 dark:text-gray-200">💵 Ambas entidades operan en USD. No se requiere conversión.</p>
            </div>
        );
    }

    // Obtener información de monedas
    const monedaOrigen = monedasActivas.find((m) => m.codigo_moneda === data.moneda);
    const monedaDestino = monedasActivas.find((m) => m.codigo_moneda === data.moneda_destino);

    if (!monedaOrigen || !monedaDestino) {
        return null;
    }

    // Calcular tasa y monto convertido según la nueva lógica
    const montoOrigen = Number(data.monto) || 0;
    let tasaSistema = 1;
    let montoConvertido = 0;
    let tasaOrigenUsar = 1;
    let tasaDestinoUsar = 1;

    if (origenEsCuenta && destinoEsCuenta) {
        // CUENTA → CUENTA: Convertir origen → USD → destino
        tasaOrigenUsar = Number(monedaOrigen.tasa_cambio) || 1;
        tasaDestinoUsar = Number(monedaDestino.tasa_cambio) || 1;
        tasaSistema = tasaDestinoUsar;
        montoConvertido = (tasaOrigenUsar > 0 && tasaDestinoUsar > 0) ? (montoOrigen / tasaOrigenUsar) * tasaDestinoUsar : 0;
    } else if (origenEsCuenta && !destinoEsCuenta) {
        // CUENTA → CLIENTE/PROVEEDOR: Convertir de moneda cuenta a USD
        tasaOrigenUsar = Number(monedaOrigen.tasa_cambio) || 1;
        tasaSistema = tasaOrigenUsar;
        montoConvertido = tasaOrigenUsar > 0 ? montoOrigen / tasaOrigenUsar : 0;
    } else if (!origenEsCuenta && destinoEsCuenta) {
        // CLIENTE/PROVEEDOR → CUENTA: Convertir de USD a moneda cuenta
        tasaDestinoUsar = Number(monedaDestino.tasa_cambio) || 1;
        tasaSistema = tasaDestinoUsar;
        montoConvertido = montoOrigen * tasaDestinoUsar;
    } else {
        // Ambos son cliente/proveedor (USD), sin conversión
        montoConvertido = montoOrigen;
    }

    // Usar tasa personalizada si se proporcionó
    const tasaPersonalizada = data.tasa_cambio_aplicada ? Number(data.tasa_cambio_aplicada) : null;
    let tasaFinal = tasaSistema;
    let montoFinal = montoConvertido;

    if (tasaPersonalizada && tasaPersonalizada > 0) {
        tasaFinal = tasaPersonalizada;
        if (origenEsCuenta && destinoEsCuenta) {
            const tasaOrigen = Number(monedaOrigen.tasa_cambio) || 1;
            montoFinal = tasaOrigen > 0 ? (montoOrigen / tasaOrigen) * tasaPersonalizada : 0;
        } else if (origenEsCuenta && !destinoEsCuenta) {
            montoFinal = montoOrigen / tasaPersonalizada;
        } else if (!origenEsCuenta && destinoEsCuenta) {
            montoFinal = montoOrigen * tasaPersonalizada;
        } else {
            montoFinal = montoOrigen;
        }
    }

    // Actualizar monto convertido en el formulario
    useEffect(() => {
        if (montoOrigen > 0 && tasaFinal > 0) {
            setData((prev: MovimientoForm) => ({
                ...prev,
                monto_convertido: montoFinal.toFixed(2),
            }));
        }
    }, [montoOrigen, tasaFinal]);

    return (
        <div className="rounded-md bg-green-50 p-3 dark:bg-green-900">
            <h4 className="mb-2 text-sm font-semibold text-green-800 dark:text-green-200">🔄 Conversión de Moneda</h4>
            <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
                <p>
                    Origen: {montoOrigen.toFixed(2)} {data.moneda}
                </p>
                <p>
                    Destino: {montoFinal.toFixed(2)} {data.moneda_destino}
                </p>
                <p>
                    {(() => {
                        if (origenEsCuenta && destinoEsCuenta) {
                            return `Tasa: 1 ${data.moneda} = ${(1 / tasaFinal).toFixed(6)} ${data.moneda_destino}`;
                        } else if (origenEsCuenta && !destinoEsCuenta) {
                            return `Tasa: 1 ${data.moneda} = ${(1 / tasaFinal).toFixed(6)} USD`;
                        } else if (!origenEsCuenta && destinoEsCuenta) {
                            return `Tasa: 1 USD = ${tasaFinal.toFixed(6)} ${data.moneda_destino}`;
                        } else {
                            return 'Sin conversión (ambos USD)';
                        }
                    })()}
                </p>
            </div>
        </div>
    );
};

// ------------------------------------
// COMPONENTE PRINCIPAL (Movimientos) CORREGIDO
// ------------------------------------
export default function Movimientos({ cuentasOrigen, cuentasDestino, clientes, proveedores, monedasActivas, userRole }: Props) {
    const [alert, setAlert] = useState<AlertState>({ show: false, message: '', type: 'success' });
    const [gastoOrigenSearch, setGastoOrigenSearch] = useState('');
    const [ingresoDestinoSearch, setIngresoDestinoSearch] = useState('');
    const [transferOrigenSearch, setTransferOrigenSearch] = useState('');
    const [transferDestinoSearch, setTransferDestinoSearch] = useState('');

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

        postGasto(route('transacciones.gastar'), {
            onSuccess: () => {
                showToast('¡Gasto registrado con éxito!', 'success');
                resetGasto();
            },
            onError: (errors) => {
                const errorMessage = errors.message || 'Hubo un error al registrar el gasto. Revisa los campos.';
                showToast(errorMessage, 'error');
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
                const errorMessage = errors.message || 'Hubo un error al registrar el ingreso. Revisa los campos.';
                showToast(errorMessage, 'error');
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
                const errorMessage = errors.message || errors.destino_id || 'Hubo un error al realizar la transferencia. Revisa los campos.';
                showToast(errorMessage, 'error');
            },
        });
    };

    // Efecto para recalcular conversión en transferencias
    useEffect(() => {
        if (transferData.moneda && transferData.moneda_destino && transferData.monto) {
            const monedaOrigen = monedasActivas.find((m) => m.codigo_moneda === transferData.moneda);
            const monedaDestino = monedasActivas.find((m) => m.codigo_moneda === transferData.moneda_destino);

            if (monedaOrigen && monedaDestino) {
                const origenEsCuenta = transferData.origen_tipo === 'cuenta';
                const destinoEsCuenta = transferData.destino_tipo === 'cuenta';
                const montoOrigen = Number(transferData.monto) || 0;

                let tasaSistema = 1;
                let montoConvertido = 0;

                if (origenEsCuenta && destinoEsCuenta) {
                    // CUENTA → CUENTA: Convertir origen → USD → destino
                    const tasaOrigen = Number(monedaOrigen.tasa_cambio) || 1;
                    tasaSistema = Number(monedaDestino.tasa_cambio) || 1;
                    montoConvertido = (tasaOrigen > 0 && tasaSistema > 0) ? (montoOrigen / tasaOrigen) * tasaSistema : 0;
                } else if (origenEsCuenta && !destinoEsCuenta) {
                    // CUENTA → CLIENTE/PROVEEDOR: Convertir de moneda cuenta a USD
                    tasaSistema = Number(monedaOrigen.tasa_cambio) || 1;
                    montoConvertido = tasaSistema > 0 ? montoOrigen / tasaSistema : 0;
                } else if (!origenEsCuenta && destinoEsCuenta) {
                    // CLIENTE/PROVEEDOR → CUENTA: Convertir de USD a moneda cuenta
                    tasaSistema = Number(monedaDestino.tasa_cambio) || 1;
                    montoConvertido = montoOrigen * tasaSistema;
                } else {
                    // Ambos son cliente/proveedor (USD), sin conversión
                    montoConvertido = montoOrigen;
                }

                // Usar tasa personalizada si se proporcionó
                const tasaPersonalizada = transferData.tasa_cambio_aplicada ? Number(transferData.tasa_cambio_aplicada) : null;
                let tasaFinal = tasaSistema;
                let montoFinal = montoConvertido;

                if (tasaPersonalizada && tasaPersonalizada > 0) {
                    tasaFinal = tasaPersonalizada;
                    if (origenEsCuenta && destinoEsCuenta) {
                        const tasaOrigen = Number(monedaOrigen.tasa_cambio) || 1;
                        montoFinal = tasaOrigen > 0 ? (montoOrigen / tasaOrigen) * tasaPersonalizada : 0;
                    } else if (origenEsCuenta && !destinoEsCuenta) {
                        montoFinal = montoOrigen / tasaPersonalizada;
                    } else if (!origenEsCuenta && destinoEsCuenta) {
                        montoFinal = montoOrigen * tasaPersonalizada;
                    } else {
                        montoFinal = montoOrigen;
                    }
                }

                setTransferData((prev) => ({
                    ...prev,
                    monto_convertido: montoFinal.toFixed(2),
                }));
            }
        }
    }, [
        transferData.moneda,
        transferData.moneda_destino,
        transferData.monto,
        transferData.tasa_cambio_aplicada,
        transferData.origen_tipo,
        transferData.destino_tipo,
        monedasActivas,
    ]);

    // --- MANEJADORES Y AYUDANTES DE RENDERIZADO ACTUALIZADOS ---

    const handleEntidadChange = (value: string, tipoEntidad: EntidadTipo, campo: 'origen' | 'destino', formSetter: any) => {
        const id = Number(value);
        let selectedMoneda = '';
        let initialTasa = '';

        if (tipoEntidad === 'cuenta') {
            const listToSearch = (formSetter === setTransferData && campo === 'destino') ? cuentasDestino : cuentasOrigen;
            const selectedCuenta = listToSearch.find((c) => c.id === id);
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
            const cuenta = cuentasDestino.find((c) => c.id === id) ?? cuentasOrigen.find((c) => c.id === id);
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

    const getEntidadItems = (
        tipoEntidad: EntidadTipo,
        exclusionId: string = '',
        exclusionTipo: string = '',
        cuentasList: Cuenta[] = cuentasOrigen,
    ): Array<{ id: string; label: string }> => {
        if (tipoEntidad === 'cuenta') {
            const cuentasFiltradas = cuentasList
                .filter((c) => !(exclusionId === String(c.id) && exclusionTipo === 'cuenta'));

            // Vendedor solo ve cuentas personales en gasto
            if (userRole === 'vendedor') {
                return cuentasFiltradas
                    .filter((c) => c.tipo_titular === 'personal')
                    .map((c) => ({ id: String(c.id), label: getEntidadInfo(c.id, 'cuenta') }));
            }

            return cuentasFiltradas
                .map((c) => ({ id: String(c.id), label: getEntidadInfo(c.id, 'cuenta') }));
        }
        if (tipoEntidad === 'cliente') {
            return clientes
                .filter((cl) => !(exclusionId === String(cl.id) && exclusionTipo === 'cliente'))
                .map((cl) => ({ id: String(cl.id), label: getEntidadInfo(cl.id, 'cliente') }));
        }
        if (tipoEntidad === 'proveedor') {
            return proveedores
                .filter((p) => !(exclusionId === String(p.id) && exclusionTipo === 'proveedor'))
                .map((p) => ({ id: String(p.id), label: getEntidadInfo(p.id, 'proveedor') }));
        }
        return [];
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
                                            setGastoOrigenSearch('');
                                            setGastoData({
                                                ...gastoData,
                                                origen_tipo: value as EntidadTipo,
                                                origen_id: '',
                                                moneda: '',
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
                                {(() => {
                                    const items = getEntidadItems(gastoData.origen_tipo);
                                    const filtered = !gastoOrigenSearch
                                        ? items
                                        : items.filter((i) => i.label.toLowerCase().includes(gastoOrigenSearch.toLowerCase()));
                                    return (
                                        <Combobox
                                            value={gastoData.origen_id || null}
                                            onValueChange={(val) => {
                                                if (val) handleEntidadChange(val, gastoData.origen_tipo, 'origen', setGastoData);
                                                else setGastoData({ ...gastoData, origen_id: '', moneda: '' });
                                            }}
                                            onInputValueChange={setGastoOrigenSearch}
                                            itemToStringLabel={(id: string) => getEntidadItems(gastoData.origen_tipo).find((i) => i.id === id)?.label ?? ''}
                                        >
                                            <ComboboxInput
                                                id="origen_id_gasto"
                                                className="w-full"
                                                placeholder={`Buscar ${gastoData.origen_tipo === 'cuenta' ? 'cuenta' : 'cliente'}...`}
                                                showClear
                                            />
                                            <ComboboxContent>
                                                <ComboboxList>
                                                    {filtered.map((item) => (
                                                        <ComboboxItem key={item.id} value={item.id}>{item.label}</ComboboxItem>
                                                    ))}
                                                    {filtered.length === 0 && (
                                                        <div className="py-2 text-center text-sm text-muted-foreground">Sin resultados</div>
                                                    )}
                                                </ComboboxList>
                                            </ComboboxContent>
                                        </Combobox>
                                    );
                                })()}
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
                                            setIngresoDestinoSearch('');
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
                                {(() => {
                                    const items = getEntidadItems(ingresoData.destino_tipo);
                                    const filtered = !ingresoDestinoSearch
                                        ? items
                                        : items.filter((i) => i.label.toLowerCase().includes(ingresoDestinoSearch.toLowerCase()));
                                    const placeholderTipo =
                                        ingresoData.destino_tipo === 'cuenta' ? 'cuenta' : ingresoData.destino_tipo === 'cliente' ? 'cliente' : 'proveedor';
                                    return (
                                        <Combobox
                                            value={ingresoData.destino_id || null}
                                            onValueChange={(val) => {
                                                if (val) handleEntidadChange(val, ingresoData.destino_tipo, 'destino', setIngresoData);
                                                else setIngresoData({ ...ingresoData, destino_id: '', moneda: '', tasa_cambio_aplicada: '' });
                                            }}
                                            onInputValueChange={setIngresoDestinoSearch}
                                            itemToStringLabel={(id: string) => getEntidadItems(ingresoData.destino_tipo).find((i) => i.id === id)?.label ?? ''}
                                        >
                                            <ComboboxInput
                                                id="destino_id_ingreso"
                                                className="w-full"
                                                placeholder={`Buscar ${placeholderTipo}...`}
                                                showClear
                                            />
                                            <ComboboxContent>
                                                <ComboboxList>
                                                    {filtered.map((item) => (
                                                        <ComboboxItem key={item.id} value={item.id}>{item.label}</ComboboxItem>
                                                    ))}
                                                    {filtered.length === 0 && (
                                                        <div className="py-2 text-center text-sm text-muted-foreground">Sin resultados</div>
                                                    )}
                                                </ComboboxList>
                                            </ComboboxContent>
                                        </Combobox>
                                    );
                                })()}
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
                                            setTransferOrigenSearch('');
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
                                    {(() => {
                                        const excId = transferData.destino_tipo === transferData.origen_tipo ? transferData.destino_id : '';
                                        const items = getEntidadItems(transferData.origen_tipo, excId, transferData.destino_tipo);
                                        const filtered = !transferOrigenSearch
                                            ? items
                                            : items.filter((i) => i.label.toLowerCase().includes(transferOrigenSearch.toLowerCase()));
                                        return (
                                            <Combobox
                                                value={transferData.origen_id || null}
                                                onValueChange={(val) => {
                                                    if (val) handleEntidadChange(val, transferData.origen_tipo, 'origen', setTransferData);
                                                    else setTransferData({ ...transferData, origen_id: '', moneda: '', tasa_cambio_aplicada: '' });
                                                }}
                                                onInputValueChange={setTransferOrigenSearch}
                                                itemToStringLabel={(id: string) =>
                                                    getEntidadItems(transferData.origen_tipo, excId, transferData.destino_tipo).find((i) => i.id === id)?.label ?? ''
                                                }
                                            >
                                                <ComboboxInput
                                                    id="origen_id_transfer"
                                                    className="w-full"
                                                    placeholder={`Buscar ${transferData.origen_tipo === 'cuenta' ? 'cuenta' : 'cliente'} de origen...`}
                                                    showClear
                                                />
                                                <ComboboxContent>
                                                    <ComboboxList>
                                                        {filtered.map((item) => (
                                                            <ComboboxItem key={item.id} value={item.id}>{item.label}</ComboboxItem>
                                                        ))}
                                                        {filtered.length === 0 && (
                                                            <div className="py-2 text-center text-sm text-muted-foreground">Sin resultados</div>
                                                        )}
                                                    </ComboboxList>
                                                </ComboboxContent>
                                            </Combobox>
                                        );
                                    })()}
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
                                            setTransferDestinoSearch('');
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
                                    {(() => {
                                        const excId = transferData.origen_tipo === transferData.destino_tipo ? transferData.origen_id : '';
                                        const cuentasList = transferData.destino_tipo === 'cuenta' ? cuentasDestino : cuentasOrigen;
                                        const items = getEntidadItems(transferData.destino_tipo, excId, transferData.origen_tipo, cuentasList);
                                        const filtered = !transferDestinoSearch
                                            ? items
                                            : items.filter((i) => i.label.toLowerCase().includes(transferDestinoSearch.toLowerCase()));
                                        const placeholderTipo =
                                            transferData.destino_tipo === 'cuenta' ? 'cuenta' : transferData.destino_tipo === 'cliente' ? 'cliente' : 'proveedor';
                                        return (
                                            <Combobox
                                                value={transferData.destino_id || null}
                                                onValueChange={(val) => {
                                                    if (val) handleEntidadChange(val, transferData.destino_tipo, 'destino', setTransferData);
                                                    else setTransferData({ ...transferData, destino_id: '' });
                                                }}
                                                onInputValueChange={setTransferDestinoSearch}
                                                itemToStringLabel={(id: string) =>
                                                    getEntidadItems(transferData.destino_tipo, excId, transferData.origen_tipo, cuentasList).find((i) => i.id === id)?.label ?? ''
                                                }
                                            >
                                                <ComboboxInput
                                                    id="destino_id_transfer"
                                                    className="w-full"
                                                    placeholder={`Buscar ${placeholderTipo} de destino...`}
                                                    showClear
                                                />
                                                <ComboboxContent>
                                                    <ComboboxList>
                                                        {filtered.map((item) => (
                                                            <ComboboxItem key={item.id} value={item.id}>{item.label}</ComboboxItem>
                                                        ))}
                                                        {filtered.length === 0 && (
                                                            <div className="py-2 text-center text-sm text-muted-foreground">Sin resultados</div>
                                                        )}
                                                    </ComboboxList>
                                                </ComboboxContent>
                                            </Combobox>
                                        );
                                    })()}
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

                            {/* ✅ COMPONENTE DE CONVERSIÓN PARA TRANSFERENCIAS */}
                            <ConversionTransferencia
                                data={transferData}
                                setData={setTransferData}
                                errors={transferErrors}
                                monedasActivas={monedasActivas}
                            />

                            {/* ✅ CAMPO DE TASA DE CAMBIO EDITABLE PARA TRANSFERENCIAS */}
                            <TasaCambioInput data={transferData} setData={setTransferData} errors={transferErrors} monedasActivas={monedasActivas} monedaForRate={transferData.moneda_destino} />

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
