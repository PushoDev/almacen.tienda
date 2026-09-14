import { Button } from '@/components/ui/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
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
    saldo_proveedor: number | string | null;
}

interface SelectItem {
    id: string;
    label: string;
    monedaCodigo: string;
}

type EntidadTipo = 'cuenta' | 'cliente' | 'proveedor';

export default function RemesaForm() {
    const [cuentas, setCuentas] = useState<Cuenta[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

    useEffect(() => {
        axios.get(route('transacciones.remesa.data'))
            .then((res) => {
                setCuentas(res.data.cuentas);
                setClientes(res.data.clientes);
                setProveedores(res.data.proveedores);
            })
            .catch(() => showToast('Error al cargar datos del formulario.', 'error'))
            .finally(() => setLoading(false));
    }, []);

    const { data, setData, post, processing, errors, reset } = useForm({
        entrada_tipo: 'cuenta' as EntidadTipo,
        entrada_id: '',
        entrada_monto: '',
        salida_tipo: 'cuenta' as EntidadTipo,
        salida_id: '',
        salida_monto: '',
        mensajero_cuenta_id: '',
        mensajero_monto: '',
        notas: '',
    });

    const showToast = (message: string, type: 'success' | 'error') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 4000);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('transacciones.remesa.store'), {
            onSuccess: () => {
                showToast('¡Remesa registrada con éxito!', 'success');
                reset();
            },
            onError: (err) => {
                showToast(err.message || 'Hubo un error al registrar la remesa.', 'error');
            },
        });
    };

    const getItems = (tipo: EntidadTipo): SelectItem[] => {
        if (tipo === 'cuenta') {
            return cuentas.map((c) => ({
                id: String(c.id),
                label: `${c.nombre_cuenta} (${c.moneda.codigo_moneda}) - Saldo: ${Number(c.saldo_cuenta).toFixed(2)}`,
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

    const cuentaItems = getItems('cuenta');
    const entradaItems = getItems(data.entrada_tipo);
    const selectedEntrada = entradaItems.find((i) => i.id === data.entrada_id) || null;
    const salidaItems = getItems(data.salida_tipo);
    const selectedSalida = salidaItems.find((i) => i.id === data.salida_id) || null;
    const selectedMensajero = cuentaItems.find((i) => i.id === data.mensajero_cuenta_id) || null;

    if (loading) {
        return <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">Cargando...</div>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md border p-3">
                <h4 className="mb-2 text-sm font-semibold">Entrada</h4>
                <ToggleGroup
                    type="single"
                    value={data.entrada_tipo}
                    onValueChange={(value: string) => {
                        if (value === 'cuenta' || value === 'cliente' || value === 'proveedor') {
                            setData({ ...data, entrada_tipo: value as EntidadTipo, entrada_id: '' });
                        }
                    }}
                    className="mb-2 justify-start"
                >
                    <ToggleGroupItem value="cuenta" aria-label="Cuenta"><DollarSign className="mr-2 h-4 w-4" /> Cuenta</ToggleGroupItem>
                    <ToggleGroupItem value="cliente" aria-label="Cliente"><User className="mr-2 h-4 w-4" /> Cliente</ToggleGroupItem>
                    <ToggleGroupItem value="proveedor" aria-label="Proveedor"><Building className="mr-2 h-4 w-4" /> Proveedor</ToggleGroupItem>
                </ToggleGroup>
                <div>
                    <Label htmlFor="entrada_id">Entidad de Entrada</Label>
                    <Combobox
                        items={entradaItems}
                        itemToStringLabel={(item: SelectItem) => item.label}
                        itemToStringValue={(item: SelectItem) => item.label}
                        value={selectedEntrada}
                        onValueChange={(item: SelectItem | null) => setData({ ...data, entrada_id: item ? item.id : '' })}
                    >
                        <ComboboxInput id="entrada_id" className="w-full" placeholder="Buscar entidad de entrada..." showClear={!!data.entrada_id} />
                        <ComboboxContent>
                            <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                            <ComboboxList>
                                {(item: SelectItem) => <ComboboxItem key={item.id} value={item}>{item.label}</ComboboxItem>}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                    {errors.entrada_id && <p className="mt-1 text-sm text-red-500">{errors.entrada_id}</p>}
                </div>
                <div className="mt-2">
                    <Label htmlFor="entrada_monto">Monto que Entra</Label>
                    <Input type="number" id="entrada_monto" value={data.entrada_monto} onChange={(e) => setData({ ...data, entrada_monto: e.target.value })} step="0.01" min="0.01" placeholder="0.00" />
                    {errors.entrada_monto && <p className="mt-1 text-sm text-red-500">{errors.entrada_monto}</p>}
                </div>
            </div>

            <div className="rounded-md border p-3">
                <h4 className="mb-2 text-sm font-semibold">Salida</h4>
                <ToggleGroup
                    type="single"
                    value={data.salida_tipo}
                    onValueChange={(value: string) => {
                        if (value === 'cuenta' || value === 'cliente' || value === 'proveedor') {
                            setData({ ...data, salida_tipo: value as EntidadTipo, salida_id: '' });
                        }
                    }}
                    className="mb-2 justify-start"
                >
                    <ToggleGroupItem value="cuenta" aria-label="Cuenta"><DollarSign className="mr-2 h-4 w-4" /> Cuenta</ToggleGroupItem>
                    <ToggleGroupItem value="cliente" aria-label="Cliente"><User className="mr-2 h-4 w-4" /> Cliente</ToggleGroupItem>
                    <ToggleGroupItem value="proveedor" aria-label="Proveedor"><Building className="mr-2 h-4 w-4" /> Proveedor</ToggleGroupItem>
                </ToggleGroup>
                <div>
                    <Label htmlFor="salida_id">Entidad de Salida</Label>
                    <Combobox
                        items={salidaItems}
                        itemToStringLabel={(item: SelectItem) => item.label}
                        itemToStringValue={(item: SelectItem) => item.label}
                        value={selectedSalida}
                        onValueChange={(item: SelectItem | null) => setData({ ...data, salida_id: item ? item.id : '' })}
                    >
                        <ComboboxInput id="salida_id" className="w-full" placeholder="Buscar entidad de salida..." showClear={!!data.salida_id} />
                        <ComboboxContent>
                            <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                            <ComboboxList>
                                {(item: SelectItem) => <ComboboxItem key={item.id} value={item}>{item.label}</ComboboxItem>}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                    {errors.salida_id && <p className="mt-1 text-sm text-red-500">{errors.salida_id}</p>}
                </div>
                <div className="mt-2">
                    <Label htmlFor="salida_monto">Monto que Sale</Label>
                    <Input type="number" id="salida_monto" value={data.salida_monto} onChange={(e) => setData({ ...data, salida_monto: e.target.value })} step="0.01" min="0.01" placeholder="0.00" />
                    {errors.salida_monto && <p className="mt-1 text-sm text-red-500">{errors.salida_monto}</p>}
                </div>
            </div>

            <div className="rounded-md border p-3">
                <h4 className="mb-2 text-sm font-semibold">Mensajero <span className="font-normal text-muted-foreground">(opcional)</span></h4>
                <div>
                    <Label htmlFor="mensajero_cuenta_id">Cuenta del Mensajero</Label>
                    <Combobox
                        items={cuentaItems}
                        itemToStringLabel={(item: SelectItem) => item.label}
                        itemToStringValue={(item: SelectItem) => item.label}
                        value={selectedMensajero}
                        onValueChange={(item: SelectItem | null) => setData({ ...data, mensajero_cuenta_id: item ? item.id : '' })}
                    >
                        <ComboboxInput id="mensajero_cuenta_id" className="w-full" placeholder="Buscar cuenta del mensajero..." showClear={!!data.mensajero_cuenta_id} />
                        <ComboboxContent>
                            <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                            <ComboboxList>
                                {(item: SelectItem) => <ComboboxItem key={item.id} value={item}>{item.label}</ComboboxItem>}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                    {errors.mensajero_cuenta_id && <p className="mt-1 text-sm text-red-500">{errors.mensajero_cuenta_id}</p>}
                </div>
                <div className="mt-2">
                    <Label htmlFor="mensajero_monto">Monto para Mensajero</Label>
                    <Input type="number" id="mensajero_monto" value={data.mensajero_monto} onChange={(e) => setData({ ...data, mensajero_monto: e.target.value })} step="0.01" min="0.01" placeholder="0.00" />
                    {errors.mensajero_monto && <p className="mt-1 text-sm text-red-500">{errors.mensajero_monto}</p>}
                </div>
            </div>

            <div>
                <Label htmlFor="notas">Notas</Label>
                <Textarea id="notas" value={data.notas} onChange={(e) => setData({ ...data, notas: e.target.value })} placeholder="Notas sobre la operación..." />
                {errors.notas && <p className="mt-1 text-sm text-red-500">{errors.notas}</p>}
            </div>

            <Button
                type="submit"
                disabled={processing || !data.entrada_id || !data.entrada_monto || !data.salida_id || !data.salida_monto}
                className="w-full"
            >
                {processing ? 'Procesando...' : 'Registrar Remesa'}
            </Button>

            {alert.show && (
                <div className={`fixed bottom-5 right-5 rounded-md p-4 text-white shadow-lg transition-all duration-300 z-50 ${alert.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {alert.message}
                </div>
            )}
        </form>
    );
}
