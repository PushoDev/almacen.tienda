import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
// 💡 CORRECCIÓN 1: Importamos FormDataType de Inertia, que ayuda con el error TS2344.
import { FormDataType, InertiaFormProps, useForm } from '@inertiajs/react';
import { DollarSign, User } from 'lucide-react';
import React, { useState } from 'react';

// ------------------------------------
// TIPOS DE DATOS Y UTILIDADES
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

interface Cuenta {
    id: number;
    nombre_cuenta: string;
    tipo_moneda: string;
    saldo_cuenta: number;
    deuda: number;
}

interface Cliente {
    id: number;
    nombre_cliente: string;
    deuda_pago_cliente: number | string | null;
}

interface Props {
    cuentas: Cuenta[];
    clientes: Cliente[];
    tasaCambioActual: number | null; // Acepta null por si no está definida en la base de datos.
}

type EntidadTipo = 'cuenta' | 'cliente';

interface BaseForm {
    monto: string;
    moneda: string;
    comentario: string;
    tasa_cambio_aplicada: string;
}

// 💡 CORRECCIÓN 2: Aseguramos que MovimientoForm extienda FormDataType para resolver el error TS2344
interface MovimientoForm extends BaseForm, FormDataType {
    origen_tipo: EntidadTipo;
    origen_id: string;
    destino_tipo: EntidadTipo;
    destino_id: string;
}

// 💡 CORRECCIÓN 3: Definimos FormSetter con un tipo más seguro.
type FormSetter<T extends FormDataType> = InertiaFormProps<T>['setData'];

// ------------------------------------
// COMPONENTE AUXILIAR PARA LA TASA DE CAMBIO
// ------------------------------------
interface TasaCambioProps {
    data: BaseForm;
    // Usamos el tipo genérico con la restricción FormDataType para FormSetter.
    setData: FormSetter<MovimientoForm>;
    errors: Record<string, string>;
    defaultRate: number | null;
}

const TasaCambioInput: React.FC<TasaCambioProps> = ({ data, setData, errors, defaultRate }) => {
    // Solo mostramos el campo si la moneda es CUP
    if (data.moneda !== 'CUP') {
        return null;
    }

    // 💡 CORRECCIÓN 4: Manejo seguro del valor por defecto para evitar 'Cannot read properties of undefined (reading 'toFixed')'
    const safeDefaultRate = defaultRate && defaultRate > 0 ? defaultRate : 0;

    return (
        <div>
            <Label htmlFor="tasa_cambio">Tasa de Cambio Aplicada (USD a CUP)</Label>
            <Input
                type="number"
                id="tasa_cambio"
                value={data.tasa_cambio_aplicada}
                onChange={(e) => setData('tasa_cambio_aplicada', e.target.value)}
                step="0.0001"
                min="0.0001"
                placeholder={`Tasa actual: ${safeDefaultRate.toFixed(4)}`} // Usamos el valor seguro aquí
            />
            <p className="mt-1 text-xs text-gray-500">Solo aplica para operaciones en CUP. La tasa se envía al backend.</p>
            {errors.tasa_cambio_aplicada && <p className="mt-1 text-sm text-red-500">{errors.tasa_cambio_aplicada}</p>}
        </div>
    );
};

// ------------------------------------
// COMPONENTE PRINCIPAL (Movimientos)
// ------------------------------------
export default function Movimientos({ cuentas, clientes, tasaCambioActual }: Props) {
    const [alert, setAlert] = useState<AlertState>({ show: false, message: '', type: 'success' });

    // Aseguramos que la tasa sea al menos 0 para prevenir errores de .toFixed si viene null
    const safeTasaCambioActual = tasaCambioActual ?? 0;

    const showToast = (message: string, type: 'success' | 'error') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 4000);
    };

    // --- FORMULARIOS ---
    // Usamos MovimientoForm en la definición del tipo
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
        comentario: '',
        destino_tipo: 'cuenta',
        destino_id: '',
        tasa_cambio_aplicada: '',
    });

    const handleGastoSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // 💡 CORRECCIÓN 5: Simplificamos el post.
        // Ahora pasamos la data directamente como el primer argumento.
        postGasto(route('transacciones.gastar'), {
            onSuccess: () => {
                showToast('¡Gasto registrado con éxito!', 'success');
                // Al reiniciar, la tasa también se limpia
                resetGasto();
            },
            onError: (errors) => {
                console.error('Errores de Gasto:', errors);
                showToast('Hubo un error al registrar el gasto. Revisa los campos.', 'error');
            },
            // Aseguramos que solo se envíen los campos necesarios para la ruta
            data: {
                origen_tipo: gastoData.origen_tipo,
                origen_id: gastoData.origen_id,
                monto: gastoData.monto,
                moneda: gastoData.moneda,
                comentario: gastoData.comentario,
                tasa_cambio_aplicada: gastoData.tasa_cambio_aplicada,
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
        comentario: '',
        origen_tipo: 'cuenta',
        origen_id: '',
        tasa_cambio_aplicada: '',
    });

    const handleIngresoSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // 💡 CORRECCIÓN 5: Simplificamos el post.
        postIngreso(route('transacciones.ingresar'), {
            onSuccess: () => {
                showToast('¡Ingreso registrado con éxito!', 'success');
                resetIngreso();
            },
            onError: (errors) => {
                console.error('Errores de Ingreso:', errors);
                showToast('Hubo un error al registrar el ingreso. Revisa los campos.', 'error');
            },
            // Aseguramos que solo se envíen los campos necesarios para la ruta
            data: {
                destino_tipo: ingresoData.destino_tipo,
                destino_id: ingresoData.destino_id,
                monto: ingresoData.monto,
                moneda: ingresoData.moneda,
                comentario: ingresoData.comentario,
                tasa_cambio_aplicada: ingresoData.tasa_cambio_aplicada,
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
        comentario: '',
        tasa_cambio_aplicada: '',
    });

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (transferData.origen_tipo === transferData.destino_tipo && transferData.origen_id === transferData.destino_id) {
            showToast('El origen y el destino de la transferencia no pueden ser la misma entidad.', 'error');
            return;
        }

        // 💡 CORRECCIÓN 5: Simplificamos el post.
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

    // --- MANEJADORES Y AYUDANTES DE RENDERIZADO ---

    // 💡 CORRECCIÓN 6: Usamos el tipo genérico para FormSetter en el argumento.
    const handleEntidadChange = (value: string, tipoEntidad: EntidadTipo, campo: 'origen' | 'destino', formSetter: FormSetter<MovimientoForm>) => {
        const id = Number(value);
        let selectedMoneda = '';
        let initialTasa = '';

        if (tipoEntidad === 'cuenta') {
            const selectedCuenta = cuentas.find((c) => c.id === id);
            selectedMoneda = selectedCuenta?.tipo_moneda || '';

            // Si la moneda es CUP, sugiere la tasa actual del sistema
            if (selectedMoneda === 'CUP' && safeTasaCambioActual > 0) {
                initialTasa = String(safeTasaCambioActual);
            }
        } else if (tipoEntidad === 'cliente') {
            // Asumiendo que la deuda/pago del cliente es siempre en USD
            selectedMoneda = 'USD';
            initialTasa = ''; // Los clientes no tienen tasa de cambio aplicada, ya están en USD.
        }

        formSetter((data) => {
            const newData: MovimientoForm = { ...data };

            if (campo === 'origen') {
                newData.origen_tipo = tipoEntidad;
                newData.origen_id = value;
                // La moneda y tasa de la operación se define por el origen
                newData.moneda = selectedMoneda;
                newData.tasa_cambio_aplicada = initialTasa;
            }

            if (campo === 'destino') {
                newData.destino_tipo = tipoEntidad;
                newData.destino_id = value;
                // Para Ingreso, la moneda y tasa es determinada por el destino
                if (formSetter === (setIngresoData as FormSetter<MovimientoForm>)) {
                    newData.moneda = selectedMoneda;
                    newData.tasa_cambio_aplicada = initialTasa;
                }
            }
            return newData;
        });
    };

    /**
     * Devuelve una cadena de información sobre la entidad para mostrar en el selector.
     */
    const getEntidadInfo = (id: number, tipo: EntidadTipo): string => {
        if (tipo === 'cuenta') {
            const cuenta = cuentas.find((c) => c.id === id);
            return cuenta ? `${cuenta.nombre_cuenta} (${cuenta.tipo_moneda}) - Saldo: ${cuenta.saldo_cuenta.toFixed(2)}` : 'Cuenta no encontrada';
        }
        if (tipo === 'cliente') {
            const cliente = clientes.find((c) => c.id === id);
            if (!cliente) return 'Cliente no encontrado';

            const deudaMonto = Number(cliente.deuda_pago_cliente) || 0;

            // Muestra USD ya que la moneda del cliente siempre se asume como USD
            return `${cliente.nombre_cliente} (Cliente) - Deuda/Pago: ${deudaMonto.toFixed(2)} USD`;
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
        return null;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Movimientos Financieros</CardTitle>
                <CardDescription>Registre entradas (Ingreso), salidas (Gasto) o movimientos entre sus entidades (Transferencia).</CardDescription>
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
                            {/* Selector de Tipo de Origen */}
                            <div>
                                <Label className="mb-2 block">Origen del Gasto</Label>
                                <ToggleGroup
                                    type="single"
                                    value={gastoData.origen_tipo || 'cuenta'}
                                    onValueChange={(value: string) => {
                                        if (value === 'cuenta' || value === 'cliente') {
                                            setGastoData('origen_tipo', value as EntidadTipo);
                                            setGastoData('origen_id', '');
                                            setGastoData('moneda', '');
                                            setGastoData('tasa_cambio_aplicada', '');
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
                                    onValueChange={(value) =>
                                        handleEntidadChange(value, gastoData.origen_tipo, 'origen', setGastoData as FormSetter<MovimientoForm>)
                                    }
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
                                    onChange={(e) => setGastoData('monto', e.target.value)}
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                />
                                {gastoErrors.monto && <p className="mt-1 text-sm text-red-500">{gastoErrors.monto}</p>}
                            </div>

                            {/* Tasa de Cambio Condicional */}
                            <TasaCambioInput
                                data={gastoData}
                                setData={setGastoData as FormSetter<MovimientoForm>}
                                errors={gastoErrors}
                                defaultRate={safeTasaCambioActual}
                            />

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
                                disabled={gastoProcessing || !gastoData.origen_id || !gastoData.monto || Number(gastoData.monto) <= 0}
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
                            {/* Selector de Tipo de Destino */}
                            <div>
                                <Label className="mb-2 block">Destino del Ingreso</Label>
                                <ToggleGroup
                                    type="single"
                                    value={ingresoData.destino_tipo || 'cuenta'}
                                    onValueChange={(value: string) => {
                                        if (value === 'cuenta' || value === 'cliente') {
                                            setIngresoData('destino_tipo', value as EntidadTipo);
                                            setIngresoData('destino_id', '');
                                            setIngresoData('moneda', '');
                                            setIngresoData('tasa_cambio_aplicada', '');
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

                            {/* Selector de Entidad de Destino */}
                            <div>
                                <Label htmlFor="destino_id_ingreso">
                                    Entidad de Destino ({ingresoData.destino_tipo === 'cuenta' ? 'Cuenta' : 'Cliente'})
                                </Label>
                                <Select
                                    onValueChange={(value) =>
                                        handleEntidadChange(value, ingresoData.destino_tipo, 'destino', setIngresoData as FormSetter<MovimientoForm>)
                                    }
                                    value={ingresoData.destino_id}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={`Seleccione ${ingresoData.destino_tipo === 'cuenta' ? 'la cuenta' : 'el cliente'} donde entra el dinero`}
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
                                    onChange={(e) => setIngresoData('monto', e.target.value)}
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                />
                                {ingresoErrors.monto && <p className="mt-1 text-sm text-red-500">{ingresoErrors.monto}</p>}
                            </div>

                            {/* Tasa de Cambio Condicional */}
                            <TasaCambioInput
                                data={ingresoData}
                                setData={setIngresoData as FormSetter<MovimientoForm>}
                                errors={ingresoErrors}
                                defaultRate={safeTasaCambioActual}
                            />

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
                                disabled={ingresoProcessing || !ingresoData.destino_id || !ingresoData.monto || Number(ingresoData.monto) <= 0}
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
                            {/* === Origen === */}
                            <div className="rounded-md border p-3">
                                <h4 className="mb-2 text-sm font-semibold">Origen</h4>
                                {/* Tipo de Origen */}
                                <ToggleGroup
                                    type="single"
                                    value={transferData.origen_tipo || 'cuenta'}
                                    onValueChange={(value: string) => {
                                        if (value === 'cuenta' || value === 'cliente') {
                                            setTransferData('origen_tipo', value as EntidadTipo);
                                            setTransferData('origen_id', '');
                                            // Limpiamos el destino para forzar una re-selección que evite duplicados
                                            setTransferData('destino_id', '');
                                            setTransferData('moneda', '');
                                            setTransferData('tasa_cambio_aplicada', '');
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
                                        onValueChange={(value) =>
                                            handleEntidadChange(
                                                value,
                                                transferData.origen_tipo,
                                                'origen',
                                                setTransferData as FormSetter<MovimientoForm>,
                                            )
                                        }
                                        value={transferData.origen_id}
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                placeholder={`Seleccione ${transferData.origen_tipo === 'cuenta' ? 'cuenta' : 'cliente'} de origen`}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {/* Excluimos solo si el tipo de origen y el tipo de destino son iguales */}
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
                                        if (value === 'cuenta' || value === 'cliente') {
                                            setTransferData('destino_tipo', value as EntidadTipo);
                                            setTransferData('destino_id', '');
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

                                {/* Entidad de Destino */}
                                <div>
                                    <Label htmlFor="destino_id_transfer">
                                        Entidad de Destino ({transferData.destino_tipo === 'cuenta' ? 'Cuenta' : 'Cliente'})
                                    </Label>
                                    <Select
                                        onValueChange={(value) =>
                                            handleEntidadChange(
                                                value,
                                                transferData.destino_tipo,
                                                'destino',
                                                setTransferData as FormSetter<MovimientoForm>,
                                            )
                                        }
                                        value={transferData.destino_id}
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                placeholder={`Seleccione ${transferData.destino_tipo === 'cuenta' ? 'cuenta' : 'cliente'} de destino`}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {/* Excluimos solo si el tipo de destino y el tipo de origen son iguales */}
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
                                <Label htmlFor="moneda_transferir">Moneda (Determinada por Origen)</Label>
                                <Input
                                    id="moneda_transferir"
                                    value={transferData.moneda || 'Seleccione entidad de origen primero'}
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

                            {/* Tasa de Cambio Condicional */}
                            <TasaCambioInput
                                data={transferData}
                                setData={setTransferData as FormSetter<MovimientoForm>}
                                errors={transferErrors}
                                defaultRate={safeTasaCambioActual}
                            />

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
