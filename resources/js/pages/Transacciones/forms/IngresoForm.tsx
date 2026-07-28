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

export default function IngresoForm() {
    const [cuentasDestino, setCuentasDestino] = useState<Cuenta[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

    useEffect(() => {
        axios.get(route('transacciones.ingreso.data'))
            .then((res) => {
                setCuentasDestino(res.data.cuentasDestino);
                setClientes(res.data.clientes);
                setProveedores(res.data.proveedores);
            })
            .catch(() => showToast('Error al cargar datos del formulario.', 'error'))
            .finally(() => setLoading(false));
    }, []);

    const { data, setData, post, processing, errors, reset } = useForm({
        destino_tipo: 'cuenta' as EntidadTipo,
        destino_id: '',
        monto: '',
        moneda: '',
        comentario: '',
    });

    const showToast = (message: string, type: 'success' | 'error') => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 4000);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('transacciones.ingresar'), {
            onSuccess: () => {
                showToast('¡Ingreso registrado con éxito!', 'success');
                reset();
            },
            onError: (err) => {
                showToast(err.message || 'Hubo un error al registrar el ingreso.', 'error');
            },
        });
    };

    const getItems = (tipo: EntidadTipo): SelectItem[] => {
        if (tipo === 'cuenta') {
            return cuentasDestino.map((c) => ({
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

    const items = getItems(data.destino_tipo);
    const selectedItem = items.find((i) => i.id === data.destino_id) || null;

    const placeholderTipo = data.destino_tipo === 'cuenta' ? 'cuenta' : data.destino_tipo === 'cliente' ? 'cliente' : 'proveedor';

    if (loading) {
        return <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">Cargando...</div>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label className="mb-2 block">Destino del Ingreso</Label>
                <ToggleGroup
                    type="single"
                    value={data.destino_tipo}
                    onValueChange={(value: string) => {
                        if (value === 'cuenta' || value === 'cliente' || value === 'proveedor') {
                            setData({ ...data, destino_tipo: value as EntidadTipo, destino_id: '', moneda: '' });
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

            <div>
                <Label htmlFor="destino_id">Entidad de Destino ({data.destino_tipo === 'cuenta' ? 'Cuenta' : data.destino_tipo === 'cliente' ? 'Cliente' : 'Proveedor'})</Label>
                <Combobox
                    items={items}
                    itemToStringLabel={(item: SelectItem) => item.label}
                    itemToStringValue={(item: SelectItem) => item.label}
                    value={selectedItem}
                    onValueChange={(item: SelectItem | null) => {
                        if (item) {
                            setData({ ...data, destino_id: item.id, moneda: item.monedaCodigo });
                        } else {
                            setData({ ...data, destino_id: '', moneda: '' });
                        }
                    }}
                >
                    <ComboboxInput id="destino_id" className="w-full" placeholder={`Buscar ${placeholderTipo}...`} showClear={!!data.destino_id} />
                    <ComboboxContent>
                        <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                        <ComboboxList>
                            {(item: SelectItem) => (
                                <ComboboxItem key={item.id} value={item}>
                                    <span>{item.label}</span>
                                </ComboboxItem>
                            )}
                        </ComboboxList>
                    </ComboboxContent>
                </Combobox>
                {errors.destino_id && <p className="mt-1 text-sm text-red-500">{errors.destino_id}</p>}
            </div>

            <div>
                <Label htmlFor="moneda">Moneda</Label>
                <Input id="moneda" value={data.moneda || 'Seleccione entidad primero'} readOnly className="bg-gray-100 dark:bg-gray-800" />
                {errors.moneda && <p className="mt-1 text-sm text-red-500">{errors.moneda}</p>}
            </div>

            <div>
                <Label htmlFor="monto">Monto del Ingreso</Label>
                <Input type="number" id="monto" value={data.monto} onChange={(e) => setData({ ...data, monto: e.target.value })} step="0.01" min="0.01" placeholder="0.00" />
                {errors.monto && <p className="mt-1 text-sm text-red-500">{errors.monto}</p>}
            </div>

            <div>
                <Label htmlFor="comentario">Comentario / Concepto</Label>
                <Textarea id="comentario" value={data.comentario} onChange={(e) => setData({ ...data, comentario: e.target.value })} placeholder="Descripción del ingreso..." />
                {errors.comentario && <p className="mt-1 text-sm text-red-500">{errors.comentario}</p>}
            </div>

            <Button type="submit" disabled={processing || !data.destino_id || !data.monto || Number(data.monto) <= 0} className="w-full">
                {processing ? 'Procesando...' : 'Registrar Ingreso'}
            </Button>

            {alert.show && (
                <div className={`fixed bottom-5 right-5 rounded-md p-4 text-white shadow-lg transition-all duration-300 z-50 ${alert.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {alert.message}
                </div>
            )}
        </form>
    );
}
