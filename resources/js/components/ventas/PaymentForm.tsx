import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ViaLogo } from '@/components/monedas/via-logo';
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sileo } from '@/lib/sileo';
import axios from 'axios';
import { ArrowLeftRight, CreditCard, DollarSign, Wallet } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ViaPagoMoneda {
    slug: string;
    nombre: string;
    imagen_url: string | null;
}

export interface Moneda {
    id: number | string;
    codigo_moneda: string;
    nombre_moneda: string;
    simbolo_moneda: string;
    tasa_cambio: number;
    imagen_url?: string | null;
    /** Vías de transferencia que esta moneda admite (catálogo del CRUD de Monedas). */
    vias_transferencia?: ViaPagoMoneda[];
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
    /** 'efectivo' | 'tarjeta' — para el ícono de respaldo cuando no tiene logo de banco. */
    tipo?: string;
    /** Logo real del banco/tarjeta (null si la cuenta no tiene imagen asignada). */
    banco?: { slug: string; nombre: string; imagen_url: string } | null;
}

interface PaymentFormProps {
    monedas: Moneda[];
    clientesFisicos: ClienteFisico[];
    remainingInUsd: number;
    onAddPayment: (payment: Payment) => void;
}

// ─── Métodos de pago (mismas imágenes que el CRUD de Monedas, components/monedas/metodos-pago-selector.tsx) ───

const METODOS_PAGO: { id: 'efectivo' | 'transferencia'; name: string; imagen: string }[] = [
    { id: 'efectivo', name: 'Efectivo', imagen: '/projects/metodos_pago/efectivo.webp' },
    { id: 'transferencia', name: 'Transferencia', imagen: '/projects/metodos_pago/transferencia.webp' },
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

    const [cuentasFiltradas, setCuentasFiltradas] = useState<Cuenta[]>([]);
    const [cargandoCuentas, setCargandoCuentas] = useState(false);
    const [destinoSearch, setDestinoSearch] = useState('');
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
            imagenUrl: m.imagen_url ?? null,
            viasTransferencia: m.vias_transferencia ?? [],
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
            kind: 'cuenta' as const,
            value: `cuenta_${c.id}`,
            label: `🏦 ${c.nombre_cuenta}`,
            nombre: c.nombre_cuenta,
            tipo: c.tipo,
            banco: c.banco,
        }));
        const clientes = selectedCurrencyInfo?.code === 'USD'
            ? clientesFisicos.map((c) => ({
                kind: 'cliente' as const,
                value: `cliente_${c.id}`,
                label: `👤 ${c.nombre_cliente}`,
                nombre: c.nombre_cliente,
                tipo: undefined,
                banco: undefined,
            }))
            : [];
        return [...cuentas, ...clientes];
    }, [cuentasFiltradas, clientesFisicos, selectedCurrencyInfo]);

    const opcionesDestinoFiltradas = opcionesDestino.filter(
        (o) => !destinoSearch || o.nombre.toLowerCase().includes(destinoSearch.toLowerCase()),
    );

    // Recalcula conversión cuando cambia monto / moneda / tasa
    useEffect(() => {
        const amount = parseFloat(currentPayment.amount);
        const rate = parseFloat(currentPayment.exchangeRate);
        const currency = currencies.find((c) => c.id.toString() === currentPayment.moneda_id.toString());

        if (currentPayment.moneda_id && amount > 0 && rate > 0 && currency) {
            setConversionCalculada({
                montoOriginal: amount,
                montoUSD: amount / rate,
                tasaCambio: rate,
                monedaSimbolo: currency.symbol,
            });
        } else {
            setConversionCalculada(null);
        }
    }, [currentPayment.amount, currentPayment.moneda_id, currentPayment.exchangeRate, currencies]);

    // Recalcula monto cuando el usuario cambia la tasa manualmente
    useEffect(() => {
        const currency = currencies.find((c) => c.id.toString() === currentPayment.moneda_id.toString());
        const tasaOriginal = currency?.exchangeRate ?? 0;
        const tasaActual = parseFloat(currentPayment.exchangeRate) || 0;
        const tasaEditada = Math.abs(tasaActual - tasaOriginal) > 0.0001;

        if (
            currentPayment.moneda_id &&
            currentPayment.exchangeRate &&
            tasaEditada &&
            tasaActual > 0 &&
            remainingInUsd > 0 &&
            parseFloat(currentPayment.amount) > 0
        ) {
            const calculado = remainingInUsd * tasaActual;
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
            sileo.error({ title: 'No se pudieron cargar las cuentas' });
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
        const monto = remainingInUsd > 0 && currency
            ? (remainingInUsd * currency.exchangeRate).toFixed(2)
            : '';

        setCurrentPayment((prev) => ({
            ...prev,
            moneda_id: monedaId,
            exchangeRate: currency ? currency.exchangeRate.toString() : '',
            amount: monto,
            cuenta_id: '',
            cliente_id: '',
            // Las vías dependen de la moneda: una vía elegida para la moneda anterior puede no
            // existir en esta (efectivo no lleva vía, así que no hay nada que limpiar ahí).
            via: prev.method === 'transferencia' ? '' : prev.via,
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
            sileo.warning({ title: 'Complete todos los campos del pago.' });
            return;
        }

        const currency = currencies.find((c) => c.id.toString() === currentPayment.moneda_id.toString());
        if (!currency) { sileo.error({ title: 'Error en la selección de moneda' }); return; }

        const amount = parseFloat(currentPayment.amount);
        const exchangeRate = parseFloat(currentPayment.exchangeRate);
        const amountInUsd = amount / exchangeRate;

        if (!amountInUsd || isNaN(amountInUsd)) {
            sileo.error({ title: 'Tasa de cambio inválida.' });
            return;
        }

        const newPayment: Payment = {
            id: crypto.randomUUID(),
            method: currentPayment.method,
            moneda_id: currentPayment.moneda_id,
            amount,
            via: currentPayment.method === 'transferencia' ? currentPayment.via : undefined,
            exchangeRate,
            amountInUsd,
            cuenta_id: currentPayment.cuenta_id || null,
            cliente_id: currentPayment.cliente_id || null,
            referencia: currentPayment.method === 'transferencia' ? currentPayment.referencia : undefined,
            moneda_info: { codigo: currency.code, nombre: currency.name, simbolo: currency.symbol },
        };

        onAddPayment(newPayment);

        const destinoNombre = opcionesDestino.find((o) => o.value === destinoValue)?.nombre;

        setCurrentPayment({ method: '', moneda_id: '', via: '', amount: '', exchangeRate: '', cuenta_id: '', cliente_id: '', referencia: '' });
        setCuentasFiltradas([]);
        setDestinoSearch('');
        setConversionCalculada(null);
        sileo.success({
            title: 'Pago agregado',
            description: `${currency.symbol}${amount.toFixed(2)} ${currency.code}${destinoNombre ? ` · ${destinoNombre}` : ''}`,
        });
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
                        <SelectTrigger className="h-14"><SelectValue placeholder="Seleccione método" /></SelectTrigger>
                        <SelectContent>
                            {METODOS_PAGO.map((metodo) => (
                                <SelectItem key={metodo.id} value={metodo.id} className="py-2">
                                    <span className="flex items-center gap-2">
                                        <img src={metodo.imagen} alt="" aria-hidden="true" className="h-10 w-auto object-contain" />
                                        {metodo.name}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Moneda */}
                <div className="space-y-2">
                    <Label>Moneda</Label>
                    <Select value={currentPayment.moneda_id} onValueChange={handleMonedaChange} disabled={!currentPayment.method}>
                        <SelectTrigger className="h-14"><SelectValue placeholder="Seleccione moneda" /></SelectTrigger>
                        <SelectContent>
                            {currencies.map((c) => (
                                <SelectItem key={c.id} value={c.id.toString()} className="py-2">
                                    <span className="flex w-full min-w-0 items-center gap-2">
                                        {c.imagenUrl ? (
                                            <img src={c.imagenUrl} alt="" aria-hidden="true" className="h-10 w-auto shrink-0 rounded object-contain" />
                                        ) : (
                                            <span className="bg-muted flex h-10 w-14 shrink-0 items-center justify-center rounded text-xs font-semibold">
                                                {c.code}
                                            </span>
                                        )}
                                        <span className="flex min-w-0 flex-col items-start leading-tight">
                                            <span className="truncate font-medium">{c.name}</span>
                                            <span className="text-muted-foreground text-xs">{c.symbol}</span>
                                        </span>
                                        <Badge className="ml-auto shrink-0 gap-1 border-sky-500/30 bg-sky-500/15 font-mono text-sky-700 tabular-nums dark:text-sky-300">
                                            <ArrowLeftRight className="h-3 w-3" />
                                            {c.exchangeRate}
                                        </Badge>
                                    </span>
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
                        className="h-14"
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
                            className="h-14 w-full"
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
                                            <ComboboxItem key={opcion.value} value={opcion.value} className="py-2">
                                                {opcion.kind === 'cuenta' ? (
                                                    <span className="flex w-full min-w-0 items-center gap-2">
                                                        {opcion.banco ? (
                                                            <img
                                                                src={opcion.banco.imagen_url}
                                                                alt=""
                                                                aria-hidden="true"
                                                                className="h-8 w-auto shrink-0 object-contain"
                                                            />
                                                        ) : opcion.tipo === 'efectivo' ? (
                                                            <Wallet className="text-muted-foreground h-6 w-6 shrink-0" strokeWidth={1.5} />
                                                        ) : (
                                                            <CreditCard className="text-muted-foreground h-6 w-6 shrink-0" strokeWidth={1.5} />
                                                        )}
                                                        <span className="min-w-0 flex-1 truncate" title={opcion.nombre}>{opcion.nombre}</span>
                                                        {opcion.tipo && (
                                                            <Badge variant="outline" className="ml-auto shrink-0 text-[10px] capitalize">
                                                                {opcion.tipo}
                                                            </Badge>
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="min-w-0 truncate" title={opcion.nombre}>{opcion.label}</span>
                                                )}
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

                {/* Vía (solo transferencia) — las que esta moneda admite, configuradas en Gestión de Monedas */}
                {currentPayment.method === 'transferencia' && (
                    <div className="space-y-2">
                        <Label>Vía de pago</Label>
                        {selectedCurrencyInfo && selectedCurrencyInfo.viasTransferencia.length === 0 ? (
                            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                                {selectedCurrencyInfo.name} no tiene vías de transferencia configuradas.
                            </p>
                        ) : (
                            <Select
                                value={currentPayment.via}
                                onValueChange={(v) => setCurrentPayment((prev) => ({ ...prev, via: v }))}
                                disabled={!selectedCurrencyInfo}
                            >
                                <SelectTrigger className="h-14"><SelectValue placeholder="Seleccione vía" /></SelectTrigger>
                                <SelectContent>
                                    {(selectedCurrencyInfo?.viasTransferencia ?? []).map((via) => (
                                        <SelectItem key={via.slug} value={via.slug} className="py-2">
                                            <span className="flex items-center gap-2">
                                                <ViaLogo slug={via.slug} nombre={via.nombre} imagenUrl={via.imagen_url} className="h-10" />
                                                {via.nombre}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
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
                            className="h-14"
                        />
                    </div>
                )}
            </div>

            {/* Monto + botón Agregar */}
            <div className="space-y-2">
                <Label>Monto a Pagar</Label>
                <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                        <InputGroup className="h-14 border-2 focus-within:border-primary">
                            <InputGroupAddon className="text-muted-foreground text-xl font-bold">
                                {selectedCurrencyInfo?.symbol ?? '$'}
                            </InputGroupAddon>
                            <InputGroupInput
                                type="number"
                                min="0"
                                step="0.01"
                                value={currentPayment.amount}
                                onChange={(e) => setCurrentPayment((prev) => ({ ...prev, amount: e.target.value }))}
                                placeholder="0.00"
                                className="text-xl font-bold tabular-nums"
                            />
                        </InputGroup>
                        {conversionCalculada && (
                            <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
                                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                    <span className="tabular-nums">
                                        {conversionCalculada.montoOriginal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                                        {conversionCalculada.monedaSimbolo}
                                    </span>
                                    <ArrowLeftRight className="h-4 w-4 shrink-0 text-emerald-500" />
                                    <span className="text-base font-bold tabular-nums">
                                        {conversionCalculada.montoUSD.toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                                    </span>
                                </div>
                                <Badge className="shrink-0 gap-1 border-emerald-500/30 bg-emerald-500/15 font-mono text-emerald-700 tabular-nums dark:text-emerald-300">
                                    Tasa {conversionCalculada.tasaCambio}
                                </Badge>
                            </div>
                        )}
                    </div>
                    <Button onClick={handleAddPayment} disabled={!canAdd} className="h-14 px-6">
                        Agregar
                    </Button>
                </div>
            </div>
        </div>
    );
}
