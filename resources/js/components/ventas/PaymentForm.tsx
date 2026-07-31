import { Button } from '@/components/ui/button';
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { DollarSign } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Moneda {
    id: number | string;
    codigo_moneda: string;
    nombre_moneda: string;
    simbolo_moneda: string;
    tasa_cambio: number;
}

export interface ClienteFisico {
    id: number | string;
    nombre_cliente: string;
}

export interface Payment {
    id: string;
    method: 'transferencia' | 'efectivo';
    moneda_id: string;
    amount: number;
    via?: string;
    exchangeRate: number;
    amountInUsd: number;
    cuenta_id?: string | null;
    cliente_id?: string | null;
    referencia?: string;
    moneda_info?: {
        codigo: string;
        nombre: string;
        simbolo: string;
    };
}

interface Cuenta {
    id: number | string;
    nombre_cuenta: string;
    tipo_moneda: string;
    moneda?: { id: number | string; codigo: string; simbolo: string };
    saldo_actual?: number;
}

interface PaymentFormProps {
    monedas: Moneda[];
    clientesFisicos: ClienteFisico[];
    remainingInUsd: number;
    onAddPayment: (payment: Payment) => void;
}

// ─── Vías de pago disponibles ─────────────────────────────────────────────────

const PAYMENT_VIAS = [
    { id: 'zelle',          name: 'Zelle' },
    { id: 'cashapp',        name: 'CashApp' },
    { id: 'visa',           name: 'Visa' },
    { id: 'mastercard',     name: 'MasterCard' },
    { id: 'stripe',         name: 'Stripe' },
    { id: 'paypal',         name: 'Paypal' },
    { id: 'qvapay',         name: 'QvaPay' },
    { id: 'enzona',         name: 'EnZona' },
    { id: 'transfermovil',  name: 'Transfermóvil' },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function PaymentForm({ monedas, clientesFisicos, remainingInUsd, onAddPayment }: PaymentFormProps) {
    const formRef = useRef<HTMLDivElement>(null);
    // El AlertDialog (Radix) atrapa el foco en su propio subárbol del DOM. El popup
    // del Combobox (base-ui) se porta a <body> por defecto, quedando como hermano
    // —no descendiente— del contenido del diálogo, lo que rompe el click con mouse
    // dentro del popup. Portarlo dentro del propio AlertDialogContent lo soluciona.
    const [dialogContainer, setDialogContainer] = useState<HTMLElement | undefined>(undefined);
    useEffect(() => {
        const container = formRef.current?.closest('[data-slot="alert-dialog-content"]');
        if (container instanceof HTMLElement) {
            setDialogContainer(container);
        }
    }, []);

    const [currentPayment, setCurrentPayment] = useState({
        method: '' as 'transferencia' | 'efectivo' | '',
        moneda_id: '',
        via: '',
        amount: '',
        exchangeRate: '',
        cuenta_id: '',
        cliente_id: '',
        referencia: '',
    });

    const [cuentasFiltradas, setCuentasFiltradas]   = useState<Cuenta[]>([]);
    const [cargandoCuentas, setCargandoCuentas]     = useState(false);
    const [destinoSearch, setDestinoSearch]         = useState('');
    const [conversionCalculada, setConversionCalculada] = useState<{
        montoOriginal: number;
        montoUSD: number;
        tasaCambio: number;
        monedaSimbolo: string;
    } | null>(null);

    const currencies = useMemo(() =>
        monedas.map((m) => ({
            id: m.id,
            code: m.codigo_moneda,
            name: m.nombre_moneda,
            symbol: m.simbolo_moneda,
            exchangeRate: m.tasa_cambio,
        })),
    [monedas]);

    const selectedCurrencyInfo = currentPayment.moneda_id
        ? currencies.find((c) => c.id.toString() === currentPayment.moneda_id.toString())
        : null;

    // Una sola lista combinada (cuentas + clientes físicos), igual que el patrón de
    // Movimientos/Index.tsx: un array filtrado, un .map() y un único estado vacío —
    // nunca mezclar <div> de encabezado como hermanos de ComboboxItem en la misma lista.
    const opcionesDestino = useMemo(() => {
        const cuentas = cuentasFiltradas.map((c) => ({
            value: `cuenta_${c.id}`,
            label: `🏦 ${c.nombre_cuenta}`,
            nombre: c.nombre_cuenta,
        }));
        const clientes = selectedCurrencyInfo?.code === 'USD'
            ? clientesFisicos.map((c) => ({
                  value: `cliente_${c.id}`,
                  label: `👤 ${c.nombre_cliente}`,
                  nombre: c.nombre_cliente,
              }))
            : [];
        return [...cuentas, ...clientes];
    }, [cuentasFiltradas, clientesFisicos, selectedCurrencyInfo]);

    const opcionesDestinoFiltradas = opcionesDestino.filter(
        (o) => !destinoSearch || o.nombre.toLowerCase().includes(destinoSearch.toLowerCase()),
    );

    // Recalcula conversión cuando cambia monto / moneda / tasa
    useEffect(() => {
        const amount      = parseFloat(currentPayment.amount);
        const rate        = parseFloat(currentPayment.exchangeRate);
        const currency    = currencies.find((c) => c.id.toString() === currentPayment.moneda_id.toString());

        if (currentPayment.moneda_id && amount > 0 && rate > 0 && currency) {
            setConversionCalculada({
                montoOriginal: amount,
                montoUSD:      amount / rate,
                tasaCambio:    rate,
                monedaSimbolo: currency.symbol,
            });
        } else {
            setConversionCalculada(null);
        }
    }, [currentPayment.amount, currentPayment.moneda_id, currentPayment.exchangeRate, currencies]);

    // Recalcula monto cuando el usuario cambia la tasa manualmente
    useEffect(() => {
        const currency    = currencies.find((c) => c.id.toString() === currentPayment.moneda_id.toString());
        const tasaOriginal = currency?.exchangeRate ?? 0;
        const tasaActual   = parseFloat(currentPayment.exchangeRate) || 0;
        const tasaEditada  = Math.abs(tasaActual - tasaOriginal) > 0.0001;

        if (
            currentPayment.moneda_id &&
            currentPayment.exchangeRate &&
            tasaEditada &&
            tasaActual > 0 &&
            remainingInUsd > 0 &&
            parseFloat(currentPayment.amount) > 0
        ) {
            const calculado   = remainingInUsd * tasaActual;
            const montoActual = parseFloat(currentPayment.amount) || 0;
            if (Math.abs(montoActual - calculado) > 0.01) {
                setCurrentPayment((prev) => ({ ...prev, amount: calculado.toFixed(2) }));
            }
        }
    }, [currentPayment.exchangeRate, remainingInUsd, currentPayment.moneda_id, currencies]);

    const cargarCuentasFiltradas = async (monedaId: string, metodoPago: string) => {
        if (!monedaId) { setCuentasFiltradas([]); return; }
        setCargandoCuentas(true);
        try {
            const { data } = await axios.get(route('ventas.getCuentasFiltradas'), {
                params: { moneda_id: monedaId, metodo_pago: metodoPago || undefined },
            });
            setCuentasFiltradas(data);
        } catch {
            toast.error('Error al cargar cuentas');
            setCuentasFiltradas([]);
        } finally {
            setCargandoCuentas(false);
        }
    };

    const handleMetodoChange = (value: 'transferencia' | 'efectivo') => {
        setCurrentPayment((prev) => ({
            ...prev,
            method: value,
            via: value === 'efectivo' ? 'efectivo' : '',
            referencia: value === 'efectivo' ? '' : prev.referencia,
            cuenta_id: '',
        }));
        setDestinoSearch('');
        if (currentPayment.moneda_id) {
            cargarCuentasFiltradas(currentPayment.moneda_id, value);
        }
    };

    const handleMonedaChange = (monedaId: string) => {
        const currency = currencies.find((c) => c.id.toString() === monedaId.toString());
        const monto    = remainingInUsd > 0 && currency
            ? (remainingInUsd * currency.exchangeRate).toFixed(2)
            : '';

        setCurrentPayment((prev) => ({
            ...prev,
            moneda_id:    monedaId,
            exchangeRate: currency ? currency.exchangeRate.toString() : '',
            amount:       monto,
            cuenta_id:    '',
            cliente_id:   '',
        }));
        setDestinoSearch('');
        cargarCuentasFiltradas(monedaId, currentPayment.method);
    };

    const handleDestinoChange = (value: string | null) => {
        if (!value) {
            setCurrentPayment((prev) => ({ ...prev, cuenta_id: '', cliente_id: '' }));
            return;
        }
        if (value.startsWith('cuenta_')) {
            setCurrentPayment((prev) => ({ ...prev, cuenta_id: value.replace('cuenta_', ''), cliente_id: '' }));
        } else if (value.startsWith('cliente_')) {
            setCurrentPayment((prev) => ({ ...prev, cliente_id: value.replace('cliente_', ''), cuenta_id: '' }));
        }
    };

    const handleAddPayment = () => {
        if (
            !currentPayment.method ||
            !currentPayment.moneda_id ||
            (currentPayment.method === 'transferencia' && !currentPayment.via) ||
            !currentPayment.amount ||
            parseFloat(currentPayment.amount) <= 0 ||
            (!currentPayment.cuenta_id && !currentPayment.cliente_id) ||
            !currentPayment.exchangeRate ||
            parseFloat(currentPayment.exchangeRate) <= 0
        ) {
            toast.warning('Complete todos los campos del pago.');
            return;
        }

        const currency = currencies.find((c) => c.id.toString() === currentPayment.moneda_id.toString());
        if (!currency) { toast.error('Error en la selección de moneda'); return; }

        const amount      = parseFloat(currentPayment.amount);
        const exchangeRate = parseFloat(currentPayment.exchangeRate);
        const amountInUsd  = amount / exchangeRate;

        if (!amountInUsd || isNaN(amountInUsd)) {
            toast.error('Tasa de cambio inválida.');
            return;
        }

        const newPayment: Payment = {
            id:           crypto.randomUUID(),
            method:       currentPayment.method,
            moneda_id:    currentPayment.moneda_id,
            amount,
            via:          currentPayment.method === 'transferencia' ? currentPayment.via : undefined,
            exchangeRate,
            amountInUsd,
            cuenta_id:    currentPayment.cuenta_id || null,
            cliente_id:   currentPayment.cliente_id || null,
            referencia:   currentPayment.method === 'transferencia' ? currentPayment.referencia : undefined,
            moneda_info:  { codigo: currency.code, nombre: currency.name, simbolo: currency.symbol },
        };

        onAddPayment(newPayment);

        setCurrentPayment({ method: '', moneda_id: '', via: '', amount: '', exchangeRate: '', cuenta_id: '', cliente_id: '', referencia: '' });
        setCuentasFiltradas([]);
        setDestinoSearch('');
        setConversionCalculada(null);
        toast.success('Pago agregado');
    };

    const destinoValue = currentPayment.cuenta_id
        ? `cuenta_${currentPayment.cuenta_id}`
        : currentPayment.cliente_id
            ? `cliente_${currentPayment.cliente_id}`
            : '';

    const canAdd =
        !!currentPayment.method &&
        !!currentPayment.moneda_id &&
        (currentPayment.method !== 'transferencia' || !!currentPayment.via) &&
        !!currentPayment.amount &&
        parseFloat(currentPayment.amount) > 0 &&
        (!!currentPayment.cuenta_id || !!currentPayment.cliente_id);

    return (
        <div ref={formRef} className="space-y-4">
            <h4 className="flex items-center gap-2 font-medium">
                <DollarSign className="text-primary h-4 w-4" />
                Agregar Pago
            </h4>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Método */}
                <div className="space-y-2">
                    <Label>Método de pago</Label>
                    <Select value={currentPayment.method} onValueChange={handleMetodoChange}>
                        <SelectTrigger><SelectValue placeholder="Seleccione método" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="transferencia">Transferencia</SelectItem>
                            <SelectItem value="efectivo">Efectivo</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Moneda */}
                <div className="space-y-2">
                    <Label>Moneda</Label>
                    <Select value={currentPayment.moneda_id} onValueChange={handleMonedaChange} disabled={!currentPayment.method}>
                        <SelectTrigger><SelectValue placeholder="Seleccione moneda" /></SelectTrigger>
                        <SelectContent>
                            {currencies.map((c) => (
                                <SelectItem key={c.id} value={c.id.toString()}>
                                    {c.name} ({c.symbol}) — Tasa: {c.exchangeRate}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Tasa de cambio */}
                <div className="space-y-2">
                    <Label>Tasa de Cambio</Label>
                    <Input
                        type="number"
                        value={currentPayment.exchangeRate}
                        onChange={(e) => setCurrentPayment((prev) => ({ ...prev, exchangeRate: e.target.value }))}
                        placeholder="Tasa de cambio"
                        disabled={!currentPayment.moneda_id}
                        min="0.0001"
                        step="0.0001"
                    />
                </div>

                {/* Destino */}
                <div className="space-y-2">
                    <Label htmlFor="destino_pago">Destino del Pago</Label>
                    <Combobox
                        value={destinoValue || null}
                        onValueChange={handleDestinoChange}
                        onInputValueChange={setDestinoSearch}
                        itemToStringLabel={(id: string) => opcionesDestino.find((o) => o.value === id)?.label ?? ''}
                    >
                        <ComboboxInput
                            id="destino_pago"
                            className="w-full"
                            placeholder="Buscar cuenta o cliente..."
                            showClear
                            disabled={!currentPayment.moneda_id}
                        />
                        <ComboboxContent container={dialogContainer}>
                            <ComboboxList>
                                {cargandoCuentas ? (
                                    <div className="py-2 text-center text-sm text-muted-foreground">Cargando cuentas...</div>
                                ) : (
                                    <>
                                        {opcionesDestinoFiltradas.map((opcion) => (
                                            <ComboboxItem key={opcion.value} value={opcion.value}>
                                                <span className="min-w-0 truncate" title={opcion.nombre}>{opcion.label}</span>
                                            </ComboboxItem>
                                        ))}
                                        {opcionesDestinoFiltradas.length === 0 && (
                                            <div className="py-2 text-center text-sm text-muted-foreground">Sin resultados</div>
                                        )}
                                    </>
                                )}
                            </ComboboxList>
                        </ComboboxContent>
                    </Combobox>
                </div>

                {/* Vía (solo transferencia) */}
                {currentPayment.method === 'transferencia' && (
                    <div className="space-y-2">
                        <Label>Vía de pago</Label>
                        <Select value={currentPayment.via} onValueChange={(v) => setCurrentPayment((prev) => ({ ...prev, via: v }))}>
                            <SelectTrigger><SelectValue placeholder="Seleccione vía" /></SelectTrigger>
                            <SelectContent>
                                {PAYMENT_VIAS.map((via) => (
                                    <SelectItem key={via.id} value={via.id}>{via.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Referencia (solo transferencia) */}
                {currentPayment.method === 'transferencia' && (
                    <div className="space-y-2">
                        <Label>Referencia <span className="text-muted-foreground text-xs">(opcional)</span></Label>
                        <Input
                            value={currentPayment.referencia}
                            onChange={(e) => setCurrentPayment((prev) => ({ ...prev, referencia: e.target.value }))}
                            placeholder="Número de referencia"
                        />
                    </div>
                )}
            </div>

            {/* Monto + botón Agregar */}
            <div className="space-y-2">
                <Label>Monto a Pagar</Label>
                <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={currentPayment.amount}
                            onChange={(e) => setCurrentPayment((prev) => ({ ...prev, amount: e.target.value }))}
                            placeholder="0.00"
                            className="h-12 text-lg font-medium"
                        />
                        {conversionCalculada && (
                            <div className="rounded-lg bg-green-50 p-2 text-center">
                                <p className="text-sm font-medium text-green-700">
                                    {conversionCalculada.montoOriginal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                                    {conversionCalculada.monedaSimbolo}{' '}={' '}
                                    <span className="font-bold">
                                        {conversionCalculada.montoUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                                    </span>
                                </p>
                                <p className="mt-1 text-xs text-green-600">Tasa: {conversionCalculada.tasaCambio}</p>
                            </div>
                        )}
                    </div>
                    <Button onClick={handleAddPayment} disabled={!canAdd} className="h-12 px-6">
                        Agregar
                    </Button>
                </div>
            </div>
        </div>
    );
}
