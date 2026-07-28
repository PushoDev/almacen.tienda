import { Button } from '@/components/ui/button';
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useForm } from '@inertiajs/react';
import { Building, DollarSign, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';

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
}

type EntidadTipo = 'cuenta' | 'cliente' | 'proveedor';

interface FormData {
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

export default function TransferenciaForm({ cuentasOrigen, cuentasDestino, clientes, proveedores, monedasActivas }: Props) {
    const [alert, setAlert] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
    const [origenSearch, setOrigenSearch] = useState('');
    const [destinoSearch, setDestinoSearch] = useState('');

    const { data, setData, post, processing, errors, reset } = useForm<FormData>({
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

    const showToast = (message: string, type: 'success' | 'error') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 4000);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (data.origen_tipo === data.destino_tipo && data.origen_id === data.destino_id) {
            showToast('El origen y el destino no pueden ser la misma entidad.', 'error');
            return;
        }
        post(route('transacciones.transferir'), {
            onSuccess: () => {
                showToast('¡Transferencia realizada con éxito!', 'success');
                reset();
            },
            onError: (err) => {
                showToast(err.message || err.destino_id || 'Hubo un error al realizar la transferencia.', 'error');
            },
        });
    };

    const handleEntidadChange = (value: string, tipo: EntidadTipo, campo: 'origen' | 'destino') => {
        const id = Number(value);
        let selectedMoneda = '';
        let initialTasa = '';

        const list = campo === 'destino' ? cuentasDestino : cuentasOrigen;

        if (tipo === 'cuenta') {
            const cuenta = list.find((c) => c.id === id);
            selectedMoneda = cuenta?.moneda.codigo_moneda || '';
            if (selectedMoneda && selectedMoneda !== 'USD') {
                const monedaInfo = monedasActivas.find((m) => m.codigo_moneda === selectedMoneda);
                if (monedaInfo) {
                    const tasa = typeof monedaInfo.tasa_cambio === 'number' ? monedaInfo.tasa_cambio : Number(monedaInfo.tasa_cambio) || 0;
                    initialTasa = String(tasa);
                }
            }
        } else {
            selectedMoneda = 'USD';
        }

        setData((prev) => {
            const newData = { ...prev };
            if (campo === 'origen') {
                newData.origen_tipo = tipo;
                newData.origen_id = value;
                newData.moneda = selectedMoneda;
                newData.tasa_cambio_aplicada = initialTasa;
                newData.moneda_destino = '';
                newData.monto_convertido = '';
            } else {
                newData.destino_tipo = tipo;
                newData.destino_id = value;
                newData.moneda_destino = selectedMoneda;
            }
            return newData;
        });
    };

    // Recalcular conversión
    useEffect(() => {
        if (data.moneda && data.moneda_destino && data.monto) {
            const monedaOrigen = monedasActivas.find((m) => m.codigo_moneda === data.moneda);
            const monedaDestino = monedasActivas.find((m) => m.codigo_moneda === data.moneda_destino);
            if (monedaOrigen && monedaDestino) {
                const origenEsCuenta = data.origen_tipo === 'cuenta';
                const destinoEsCuenta = data.destino_tipo === 'cuenta';
                const montoOrigen = Number(data.monto) || 0;
                let tasaSistema = 1;
                let montoConvertido = 0;

                if (origenEsCuenta && destinoEsCuenta) {
                    const tasaOrigen = Number(monedaOrigen.tasa_cambio) || 1;
                    tasaSistema = Number(monedaDestino.tasa_cambio) || 1;
                    montoConvertido = (tasaOrigen > 0 && tasaSistema > 0) ? (montoOrigen / tasaOrigen) * tasaSistema : 0;
                } else if (origenEsCuenta && !destinoEsCuenta) {
                    tasaSistema = Number(monedaOrigen.tasa_cambio) || 1;
                    montoConvertido = tasaSistema > 0 ? montoOrigen / tasaSistema : 0;
                } else if (!origenEsCuenta && destinoEsCuenta) {
                    tasaSistema = Number(monedaDestino.tasa_cambio) || 1;
                    montoConvertido = montoOrigen * tasaSistema;
                } else {
                    montoConvertido = montoOrigen;
                }

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

                setData((prev) => ({ ...prev, monto_convertido: montoFinal.toFixed(2) }));
            }
        }
    }, [data.moneda, data.moneda_destino, data.monto, data.tasa_cambio_aplicada, data.origen_tipo, data.destino_tipo, monedasActivas]);

    const getItems = (tipo: EntidadTipo, list: Cuenta[]) => {
        if (tipo === 'cuenta') {
            return list.map((c) => ({
                id: String(c.id),
                label: `${c.nombre_cuenta} (${c.moneda.codigo_moneda}) - Saldo: ${c.saldo_cuenta.toFixed(2)}`,
            }));
        }
        if (tipo === 'cliente') {
            return clientes.map((cl) => ({
                id: String(cl.id),
                label: `${cl.nombre_cliente} (Cliente) - Deuda/Pago: ${(Number(cl.deuda_pago_cliente) || 0).toFixed(2)} USD`,
            }));
        }
        return proveedores.map((p) => ({
            id: String(p.id),
            label: `${p.nombre_proveedor} (Proveedor) - Saldo: ${(Number(p.saldo_proveedor) || 0).toFixed(2)} USD`,
        }));
    };

    const origenItems = getItems(data.origen_tipo, cuentasOrigen);
    const origenFiltered = !origenSearch ? origenItems : origenItems.filter((i) => i.label.toLowerCase().includes(origenSearch.toLowerCase()));
    const destinoItems = getItems(data.destino_tipo, cuentasDestino);
    const destinoFiltered = !destinoSearch ? destinoItems : destinoItems.filter((i) => i.label.toLowerCase().includes(destinoSearch.toLowerCase()));

    const renderConversion = () => {
        if (!data.moneda || !data.moneda_destino) return null;
        const origenEsCuenta = data.origen_tipo === 'cuenta';
        const destinoEsCuenta = data.destino_tipo === 'cuenta';
        if (!origenEsCuenta && !destinoEsCuenta) {
            return (
                <div className="rounded-md bg-gray-50 p-3 dark:bg-gray-900">
                    <p className="text-sm text-gray-800 dark:text-gray-200">Ambas entidades operan en USD. No se requiere conversión.</p>
                </div>
            );
        }
        const monedaDestino = monedasActivas.find((m) => m.codigo_moneda === data.moneda_destino);
        const tasaPersonalizada = data.tasa_cambio_aplicada ? Number(data.tasa_cambio_aplicada) : null;
        let tasaTexto = '';
        if (origenEsCuenta && destinoEsCuenta) {
            tasaTexto = `Tasa: 1 ${data.moneda} = ${tasaPersonalizada && tasaPersonalizada > 0 ? (1 / tasaPersonalizada).toFixed(6) : '...'} ${data.moneda_destino}`;
        } else if (origenEsCuenta && !destinoEsCuenta) {
            tasaTexto = `Tasa: 1 ${data.moneda} = ${tasaPersonalizada && tasaPersonalizada > 0 ? (1 / tasaPersonalizada).toFixed(6) : '...'} USD`;
        } else if (!origenEsCuenta && destinoEsCuenta) {
            tasaTexto = `Tasa: 1 USD = ${tasaPersonalizada && tasaPersonalizada > 0 ? tasaPersonalizada.toFixed(6) : (monedaDestino?.tasa_cambio || 0).toFixed(6)} ${data.moneda_destino}`;
        }
        return (
            <div className="rounded-md bg-green-50 p-3 dark:bg-green-900">
                <h4 className="mb-2 text-sm font-semibold text-green-800 dark:text-green-200">Conversión de Moneda</h4>
                <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
                    <p>Origen: {Number(data.monto || 0).toFixed(2)} {data.moneda}</p>
                    <p>Destino: {data.monto_convertido || '0.00'} {data.moneda_destino}</p>
                    <p>{tasaTexto}</p>
                </div>
            </div>
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md border p-3">
                <h4 className="mb-2 text-sm font-semibold">Origen</h4>
                <ToggleGroup
                    type="single"
                    value={data.origen_tipo || 'cuenta'}
                    onValueChange={(value: string) => {
                        if (value === 'cuenta' || value === 'cliente') {
                            setOrigenSearch('');
                            setData({ ...data, origen_tipo: value as EntidadTipo, origen_id: '', moneda: '', tasa_cambio_aplicada: '' });
                        }
                    }}
                    className="mb-2 justify-start"
                >
                    <ToggleGroupItem value="cuenta" aria-label="Cuenta"><DollarSign className="mr-2 h-4 w-4" /> Cuenta</ToggleGroupItem>
                    <ToggleGroupItem value="cliente" aria-label="Cliente"><User className="mr-2 h-4 w-4" /> Cliente</ToggleGroupItem>
                </ToggleGroup>
                <div>
                    <Label htmlFor="origen_id">Entidad de Origen ({data.origen_tipo === 'cuenta' ? 'Cuenta' : 'Cliente'})</Label>
                    <Combobox
                        value={data.origen_id || null}
                        onValueChange={(val) => {
                            if (val) handleEntidadChange(val, data.origen_tipo, 'origen');
                            else setData({ ...data, origen_id: '', moneda: '', tasa_cambio_aplicada: '' });
                        }}
                        onInputValueChange={setOrigenSearch}
                    >
                        <ComboboxInput id="origen_id" className="w-full" placeholder={`Buscar ${data.origen_tipo === 'cuenta' ? 'cuenta' : 'cliente'} de origen...`} showClear />
                        <ComboboxContent>
                            <ComboboxList>
                                {origenFiltered.map((item) => (
                                    <ComboboxItem key={item.id} value={item.id}>{item.label}</ComboboxItem>
                                ))}
                                {origenFiltered.length === 0 && <div className="py-2 text-center text-sm text-muted-foreground">Sin resultados</div>}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                    {errors.origen_id && <p className="mt-1 text-sm text-red-500">{errors.origen_id}</p>}
                </div>
            </div>

            <div className="rounded-md border p-3">
                <h4 className="mb-2 text-sm font-semibold">Destino</h4>
                <ToggleGroup
                    type="single"
                    value={data.destino_tipo || 'cuenta'}
                    onValueChange={(value: string) => {
                        if (value === 'cuenta' || value === 'cliente' || value === 'proveedor') {
                            setDestinoSearch('');
                            setData({ ...data, destino_tipo: value as EntidadTipo, destino_id: '' });
                        }
                    }}
                    className="mb-2 justify-start"
                >
                    <ToggleGroupItem value="cuenta" aria-label="Cuenta"><DollarSign className="mr-2 h-4 w-4" /> Cuenta</ToggleGroupItem>
                    <ToggleGroupItem value="cliente" aria-label="Cliente"><User className="mr-2 h-4 w-4" /> Cliente</ToggleGroupItem>
                    <ToggleGroupItem value="proveedor" aria-label="Proveedor"><Building className="mr-2 h-4 w-4" /> Proveedor</ToggleGroupItem>
                </ToggleGroup>
                <div>
                    <Label htmlFor="destino_id">Entidad de Destino ({data.destino_tipo === 'cuenta' ? 'Cuenta' : data.destino_tipo === 'cliente' ? 'Cliente' : 'Proveedor'})</Label>
                    <Combobox
                        value={data.destino_id || null}
                        onValueChange={(val) => {
                            if (val) handleEntidadChange(val, data.destino_tipo, 'destino');
                            else setData({ ...data, destino_id: '' });
                        }}
                        onInputValueChange={setDestinoSearch}
                    >
                        <ComboboxInput id="destino_id" className="w-full" placeholder={`Buscar ${data.destino_tipo === 'cuenta' ? 'cuenta' : data.destino_tipo === 'cliente' ? 'cliente' : 'proveedor'} de destino...`} showClear />
                        <ComboboxContent>
                            <ComboboxList>
                                {destinoFiltered.map((item) => (
                                    <ComboboxItem key={item.id} value={item.id}>{item.label}</ComboboxItem>
                                ))}
                                {destinoFiltered.length === 0 && <div className="py-2 text-center text-sm text-muted-foreground">Sin resultados</div>}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                    {errors.destino_id && <p className="mt-1 text-sm text-red-500">{errors.destino_id}</p>}
                </div>
            </div>

            <div>
                <Label htmlFor="moneda_transferir">Moneda Origen</Label>
                <Input id="moneda_transferir" value={data.moneda || 'Seleccione entidad de origen primero'} readOnly className="bg-gray-100 dark:bg-gray-800" />
                {errors.moneda && <p className="mt-1 text-sm text-red-500">{errors.moneda}</p>}
            </div>

            <div>
                <Label htmlFor="moneda_destino_transferir">Moneda Destino</Label>
                <Input id="moneda_destino_transferir" value={data.moneda_destino || 'Seleccione entidad de destino primero'} readOnly className="bg-gray-100 dark:bg-gray-800" />
            </div>

            <div>
                <Label htmlFor="monto_transferir">Monto a Transferir</Label>
                <Input type="number" id="monto_transferir" value={data.monto} onChange={(e) => setData({ ...data, monto: e.target.value })} step="0.01" min="0.01" placeholder="0.00" />
                {errors.monto && <p className="mt-1 text-sm text-red-500">{errors.monto}</p>}
            </div>

            {renderConversion()}

            <div>
                <Label htmlFor="tasa_cambio">Tasa de Cambio ({data.moneda_destino ? `1 USD = ? ${data.moneda_destino}` : '...'})</Label>
                <Input type="number" id="tasa_cambio" value={data.tasa_cambio_aplicada} onChange={(e) => setData({ ...data, tasa_cambio_aplicada: e.target.value })} step="0.0001" min="0.0001" placeholder="Tasa..." />
            </div>

            <div>
                <Label htmlFor="comentario_transferir">Comentario</Label>
                <Textarea id="comentario_transferir" value={data.comentario} onChange={(e) => setData({ ...data, comentario: e.target.value })} placeholder="Descripción de la transferencia..." />
                {errors.comentario && <p className="mt-1 text-sm text-red-500">{errors.comentario}</p>}
            </div>

            <Button
                type="submit"
                disabled={processing || !data.origen_id || !data.destino_id || !data.monto || Number(data.monto) <= 0 || (data.origen_tipo === data.destino_tipo && data.origen_id === data.destino_id)}
                className="w-full"
            >
                {processing ? 'Procesando...' : 'Realizar Transferencia'}
            </Button>

            {alert.show && (
                <div className={`fixed bottom-5 right-5 rounded-md p-4 text-white shadow-lg transition-all duration-300 z-50 ${alert.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {alert.message}
                </div>
            )}
        </form>
    );
}
