import { Button } from '@/components/ui/button';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useForm } from '@inertiajs/react';
import { sileo } from '@/lib/sileo';
import { DollarSign, User } from 'lucide-react';
import React from 'react';

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

interface SelectItem {
    id: string;
    label: string;
    monedaCodigo: string;
}

interface Props {
    cuentasOrigen: Cuenta[];
    clientes: Cliente[];
}

type EntidadTipo = 'cuenta' | 'cliente';

export default function GastoForm({ cuentasOrigen, clientes }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        origen_tipo: 'cuenta' as EntidadTipo,
        origen_id: '',
        monto: '',
        moneda: '',
        comentario: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('transacciones.gastar'), {
            onError: (err) => {
                sileo.error({ title: 'Error al registrar el gasto', description: err.message || 'Inténtalo nuevamente' });
            },
        });
    };

    const getItems = (tipo: EntidadTipo): SelectItem[] => {
        if (tipo === 'cuenta') {
            return cuentasOrigen.map((c) => ({
                id: String(c.id),
                label: `${c.nombre_cuenta} (${c.moneda.codigo_moneda}) - Saldo: ${c.saldo_cuenta.toFixed(2)}`,
                monedaCodigo: c.moneda.codigo_moneda,
            }));
        }
        return clientes.map((cl) => ({
            id: String(cl.id),
            label: `${cl.nombre_cliente} (Cliente) - Deuda/Pago: ${(Number(cl.deuda_pago_cliente) || 0).toFixed(2)} USD`,
            monedaCodigo: 'USD',
        }));
    };

    const items = getItems(data.origen_tipo);
    const selectedItem = items.find((i) => i.id === data.origen_id) || null;

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label className="mb-2 block">Origen del Gasto</Label>
                <ToggleGroup
                    type="single"
                    value={data.origen_tipo}
                    onValueChange={(value: string) => {
                        if (value === 'cuenta' || value === 'cliente') {
                            setData({ ...data, origen_tipo: value as EntidadTipo, origen_id: '', moneda: '' });
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

            <div>
                <Label htmlFor="origen_id">Entidad de Origen ({data.origen_tipo === 'cuenta' ? 'Cuenta' : 'Cliente'})</Label>
                <Combobox
                    items={items}
                    itemToStringLabel={(item: SelectItem) => item.label}
                    itemToStringValue={(item: SelectItem) => item.label}
                    value={selectedItem}
                    onValueChange={(item: SelectItem | null) => {
                        if (item) {
                            setData({ ...data, origen_id: item.id, moneda: item.monedaCodigo });
                        } else {
                            setData({ ...data, origen_id: '', moneda: '' });
                        }
                    }}
                >
                    <ComboboxInput id="origen_id" className="w-full" placeholder={`Buscar ${data.origen_tipo === 'cuenta' ? 'cuenta' : 'cliente'}...`} showClear={!!data.origen_id} />
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
                {errors.origen_id && <p className="mt-1 text-sm text-red-500">{errors.origen_id}</p>}
            </div>

            <div>
                <Label htmlFor="moneda">Moneda</Label>
                <Input id="moneda" value={data.moneda || 'Seleccione entidad primero'} readOnly className="bg-gray-100 dark:bg-gray-800" />
                {errors.moneda && <p className="mt-1 text-sm text-red-500">{errors.moneda}</p>}
            </div>

            <div>
                <Label htmlFor="monto">Monto del Gasto</Label>
                <Input type="number" id="monto" value={data.monto} onChange={(e) => setData({ ...data, monto: e.target.value })} step="0.01" min="0.01" placeholder="0.00" />
                {errors.monto && <p className="mt-1 text-sm text-red-500">{errors.monto}</p>}
            </div>

            <div>
                <Label htmlFor="comentario">Comentario / Concepto</Label>
                <Textarea id="comentario" value={data.comentario} onChange={(e) => setData({ ...data, comentario: e.target.value })} placeholder="Descripción del gasto..." />
                {errors.comentario && <p className="mt-1 text-sm text-red-500">{errors.comentario}</p>}
            </div>

            <Button type="submit" disabled={processing || !data.origen_id || !data.monto || Number(data.monto) <= 0} className="w-full">
                {processing ? 'Procesando...' : 'Registrar Gasto'}
            </Button>
        </form>
    );
}
