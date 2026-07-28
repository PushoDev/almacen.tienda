import { Button } from '@/components/ui/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import { Building, DollarSign, User } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

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

interface SelectItem {
    id: string;
    label: string;
    monedaCodigo: string;
}

type EntidadTipo = 'cuenta' | 'cliente' | 'proveedor';

export default function TransferenciaForm() {
    const [cuentasOrigen, setCuentasOrigen] = useState<Cuenta[]>([]);
    const [cuentasDestino, setCuentasDestino] = useState<Cuenta[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [monedasActivas, setMonedasActivas] = useState<Moneda[]>([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

    useEffect(() => {
        axios.get(route('transacciones.transferencia.data'))
            .then((res) => {
                setCuentasOrigen(res.data.cuentasOrigen);
                setCuentasDestino(res.data.cuentasDestino);
                setClientes(res.data.clientes);
                setProveedores(res.data.proveedores);
                setMonedasActivas(res.data.monedasActivas);
            })
            .catch(() => showToast('Error al cargar datos del formulario.', 'error'))
            .finally(() => setLoading(false));
    }, []);

    const { data, setData, post, processing, errors, reset } = useForm({
        origen_tipo: 'cuenta' as EntidadTipo,
        origen_id: '',
        destino_tipo: 'cuenta' as EntidadTipo,
        destino_id: '',
        monto: '',
        moneda: '',
        moneda_destino: '',
        comentario: '',
        tasa_cambio_aplicada: '',
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

    const getItems = (tipo: EntidadTipo, list: Cuenta[]): SelectItem[] => {
        if (tipo === 'cuenta') {
            return list.map((c) => ({
                id: String(c.id),
                label: `${c.nombre_cuenta} (${c.moneda.codigo_moneda}) - Saldo: ${c.saldo_cuenta.toFixed(2)}`,
                monedaCodigo: c.moneda.codigo_moneda,
            }));
        }
        if (tipo === 'cliente') {
            return clientes.map((cl) => ({
                id: String(cl.id),
                label: `${cl.nombre_cliente} (Cliente) - Deuda/Pago: ${(Number(cl.deuda_pago_cliente) || 0).toFixed(2)} USD`,
                monedaCodigo: 'USD',
            }));
        }
        return proveedores.map((p) => ({
            id: String(p.id),
            label: `${p.nombre_proveedor} (Proveedor) - Saldo: ${(Number(p.saldo_proveedor) || 0).toFixed(2)} USD`,
            monedaCodigo: 'USD',
        }));
    };

    const origenItems = getItems(data.origen_tipo, cuentasOrigen);
    const selectedOrigen = origenItems.find((i) => i.id === data.origen_id) || null;
    const destinoItems = getItems(data.destino_tipo, cuentasDestino);
    const selectedDestino = destinoItems.find((i) => i.id === data.destino_id) || null;

    const conversion = useMemo(() => {
        if (!data.moneda || !data.moneda_destino || !data.monto) return null;

        const monedaOrigen = monedasActivas.find((m) => m.codigo_moneda === data.moneda);
        const monedaDestino = monedasActivas.find((m) => m.codigo_moneda === data.moneda_destino);
        if (!monedaOrigen || !monedaDestino) return null;

        const origenEsCuenta = data.origen_tipo === 'cuenta';
        const destinoEsCuenta = data.destino_tipo === 'cuenta';
        const montoOrigen = Number(data.monto) || 0;

        if (!origenEsCuenta && !destinoEsCuenta) return null;
        if (monedaOrigen.codigo_moneda === monedaDestino.codigo_moneda) return null;

        let tasaOrigen = origenEsCuenta ? Number(monedaOrigen.tasa_cambio) || 1 : 1;
        let tasaDestino = destinoEsCuenta ? Number(monedaDestino.tasa_cambio) || 1 : 1;

        const tasaCustom = data.tasa_cambio_aplicada ? Number(data.tasa_cambio_aplicada) : null;
        if (tasaCustom && tasaCustom > 0) {
            if (origenEsCuenta && data.moneda !== 'USD') {
                tasaOrigen = tasaCustom;
            } else {
                tasaDestino = tasaCustom;
            }
        }

        const montoEnUsd = tasaOrigen > 0 ? montoOrigen / tasaOrigen : 0;
        const montoFinal = montoEnUsd * tasaDestino;

        const origenEsNoUsd = origenEsCuenta && data.moneda !== 'USD';
        const monedaNoUsd = origenEsNoUsd ? data.moneda : data.moneda_destino;
        const tasaSistemaNoUsd = origenEsNoUsd
            ? (Number(monedaOrigen.tasa_cambio) || 1)
            : (Number(monedaDestino.tasa_cambio) || 1);

        return {
            montoOrigen,
            montoConvertido: montoFinal.toFixed(2),
            monedaOrigenCod: monedaOrigen.codigo_moneda,
            monedaDestinoCod: monedaDestino.codigo_moneda,
            tasaSistemaNoUsd,
            monedaNoUsd,
            tasaCustom,
        };
    }, [data.moneda, data.moneda_destino, data.monto, data.tasa_cambio_aplicada, data.origen_tipo, data.destino_tipo, monedasActivas]);

    const renderConversion = () => {
        if (!conversion) return null;
        const { montoOrigen, montoConvertido, monedaOrigenCod, monedaDestinoCod, tasaSistemaNoUsd, monedaNoUsd, tasaCustom } = conversion;

        const tasaMostrar = (tasaCustom && tasaCustom > 0) ? tasaCustom : tasaSistemaNoUsd;
        const sonDistintas = tasaCustom && tasaCustom > 0 && Math.abs(tasaCustom - tasaSistemaNoUsd) > 0.001;

        return (
            <div className="rounded-md bg-green-50 p-3 dark:bg-green-900">
                <h4 className="mb-2 text-sm font-semibold text-green-800 dark:text-green-200">Conversión de Moneda</h4>
                <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
                    <p>Origen: {montoOrigen.toFixed(2)} {monedaOrigenCod}</p>
                    <p>Destino: {montoConvertido} {monedaDestinoCod}</p>
                    <p>Tasa: 1 USD = {tasaMostrar.toFixed(2)} {monedaNoUsd}</p>
                    {sonDistintas && (
                        <p className="text-xs text-green-600 dark:text-green-400">Tasa del sistema: 1 USD = {tasaSistemaNoUsd.toFixed(2)} {monedaNoUsd}</p>
                    )}
                </div>
            </div>
        );
    };

    const origenEsCuenta = data.origen_tipo === 'cuenta';
    const origenEsNoUsd = origenEsCuenta && data.moneda && data.moneda !== 'USD';
    const monedaTasa = origenEsNoUsd ? data.moneda : data.moneda_destino;

    if (loading) {
        return <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">Cargando...</div>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md border p-3">
                <h4 className="mb-2 text-sm font-semibold">Origen</h4>
                <ToggleGroup
                    type="single"
                    value={data.origen_tipo || 'cuenta'}
                    onValueChange={(value: string) => {
                        if (value === 'cuenta' || value === 'cliente') {
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
                        items={origenItems}
                        itemToStringLabel={(item: SelectItem) => item.label}
                        itemToStringValue={(item: SelectItem) => item.label}
                        value={selectedOrigen}
                        onValueChange={(item: SelectItem | null) => {
                            if (item) {
                                setData({ ...data, origen_id: item.id, moneda: item.monedaCodigo, tasa_cambio_aplicada: '', moneda_destino: '' });
                            } else {
                                setData({ ...data, origen_id: '', moneda: '', tasa_cambio_aplicada: '' });
                            }
                        }}
                    >
                        <ComboboxInput id="origen_id" className="w-full" placeholder={`Buscar ${data.origen_tipo === 'cuenta' ? 'cuenta' : 'cliente'} de origen...`} showClear={!!data.origen_id} />
                        <ComboboxContent>
                            <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                            <ComboboxList>
                                {(item: SelectItem) => (
                                    <ComboboxItem key={item.id} value={item}>{item.label}</ComboboxItem>
                                )}
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
                        items={destinoItems}
                        itemToStringLabel={(item: SelectItem) => item.label}
                        itemToStringValue={(item: SelectItem) => item.label}
                        value={selectedDestino}
                        onValueChange={(item: SelectItem | null) => {
                            if (item) {
                                const mOrigen = monedasActivas.find((m) => m.codigo_moneda === data.moneda);
                                const mDestino = monedasActivas.find((m) => m.codigo_moneda === item.monedaCodigo);
                                let tasaInicial = '';
                                if (mOrigen && mDestino && mOrigen.codigo_moneda !== mDestino.codigo_moneda) {
                                    const tOrigen = data.origen_tipo === 'cuenta' ? Number(mOrigen.tasa_cambio) || 1 : 1;
                                    const tDestino = data.destino_tipo === 'cuenta' ? Number(mDestino.tasa_cambio) || 1 : 1;
                                    const origenEsNoUsd = data.origen_tipo === 'cuenta' && data.moneda !== 'USD';
                                    const tasaNoUsd = origenEsNoUsd ? tOrigen : tDestino;
                                    if (tasaNoUsd > 0) tasaInicial = tasaNoUsd.toFixed(2);
                                }
                                setData({ ...data, destino_id: item.id, moneda_destino: item.monedaCodigo, tasa_cambio_aplicada: tasaInicial });
                            } else {
                                setData({ ...data, destino_id: '', moneda_destino: '', tasa_cambio_aplicada: '' });
                            }
                        }}
                    >
                        <ComboboxInput id="destino_id" className="w-full" placeholder={`Buscar ${data.destino_tipo === 'cuenta' ? 'cuenta' : data.destino_tipo === 'cliente' ? 'cliente' : 'proveedor'} de destino...`} showClear={!!data.destino_id} />
                        <ComboboxContent>
                            <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                            <ComboboxList>
                                {(item: SelectItem) => (
                                    <ComboboxItem key={item.id} value={item}>{item.label}</ComboboxItem>
                                )}
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

            <div>
                <Label htmlFor="tasa_cambio">Tasa de Cambio (1 USD = ? {monedaTasa || '...'})</Label>
                <Input type="number" id="tasa_cambio" value={data.tasa_cambio_aplicada} onChange={(e) => setData({ ...data, tasa_cambio_aplicada: e.target.value })} step="0.01" min="0.01" placeholder="Tasa..." />
            </div>

            {renderConversion()}

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