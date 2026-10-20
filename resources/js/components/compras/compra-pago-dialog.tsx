import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Combobox,
    ComboboxChip,
    ComboboxChips,
    ComboboxChipsInput,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxItem,
    ComboboxList,
} from '@/components/ui/combobox';
import { Field, FieldDescription, FieldGroup, FieldLegend, FieldSet } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { ClienteProps, CuentaNegocioProps } from '@/types';
import { CheckCircle, CreditCard, DollarSign, Loader2, PlusCircle, ShoppingCart, Users, Wallet, X } from 'lucide-react';
import { useState } from 'react';

export type TipoCompra = '' | 'deuda_proveedor' | 'pago_cash';

export interface PagoCuenta {
    cuenta_id: number;
    monto: number;
}

export interface PagoCliente {
    cliente_id: number;
    monto: number;
}

interface CompraPagoDialogProps {
    /** '' = todavía no eligió cómo registrar la compra (paso 1). */
    tipoCompra: TipoCompra;
    onTipoCompraChange: (tipo: TipoCompra) => void;
    pagos: PagoCuenta[];
    onPagosChange: (pagos: PagoCuenta[]) => void;
    pagosClientes: PagoCliente[];
    onPagosClientesChange: (pagos: PagoCliente[]) => void;
    permitirDeudaParcial: boolean;
    onPermitirDeudaParcialChange: (permitir: boolean) => void;
    totalCompra: number;
    /** El botón que abre el diálogo no se activa hasta que haya al menos un producto en la compra. */
    hayProductos: boolean;
    /** Alguna línea apunta a un almacén que ya no existe (se avisa en el botón). */
    hayAlmacenInvalido: boolean;
    cuentas: CuentaNegocioProps[];
    clientes: ClienteProps[];
    clientesFiltrados: ClienteProps[];
    buscandoClientes: boolean;
    onBuscarClientes: (termino: string) => void;
    /** El cliente al que se le compra no puede ser además uno de los que financian. */
    clienteDeCompraId: number | null;
    onCrearCliente: () => void;
    procesando: boolean;
    onConfirmar: () => void;
}

const formatearUsd = (monto: number) => `$${monto.toFixed(2)}`;

/**
 * Diálogo "Realizar Compra": elegir cómo se registra (deuda o pago ahora), confirmar la deuda o
 * repartir el pago entre cuentas y clientes. El botón que lo abre queda deshabilitado mientras la
 * compra no tenga productos.
 */
export default function CompraPagoDialog({
    tipoCompra,
    onTipoCompraChange,
    pagos,
    onPagosChange,
    pagosClientes,
    onPagosClientesChange,
    permitirDeudaParcial,
    onPermitirDeudaParcialChange,
    totalCompra,
    hayProductos,
    hayAlmacenInvalido,
    cuentas,
    clientes,
    clientesFiltrados,
    buscandoClientes,
    onBuscarClientes,
    clienteDeCompraId,
    onCrearCliente,
    procesando,
    onConfirmar,
}: CompraPagoDialogProps) {
    // Fix del Combobox (@base-ui/react) roto dentro de un AlertDialog (Radix): el popup se porta a <body>
    // por defecto, queda fuera del focus-trap del diálogo y el click con mouse no selecciona nada (ver
    // docs/pendiente-combobox-reemplazo.md). Se pasa el contenido del propio diálogo como contenedor.
    const [contenedor, setContenedor] = useState<HTMLElement | undefined>(undefined);
    const resolverContenedor = (node: HTMLElement | null) => {
        const encontrado = node?.closest('[data-slot="alert-dialog-content"]');
        if (encontrado instanceof HTMLElement) {
            setContenedor(encontrado);
        }
    };

    const paso = tipoCompra === 'deuda_proveedor' ? 'deuda' : tipoCompra === 'pago_cash' ? 'pago' : 'seleccion';

    // Totales del paso "Procesar Pago": se calculan una vez y se reutilizan en el header (barra de
    // progreso y chips) y en el footer (botón Confirmar Pago).
    const totalCuentas = pagos.reduce((acumulado, pago) => acumulado + pago.monto, 0);
    const totalClientes = pagosClientes.reduce((acumulado, pago) => acumulado + (pago.monto || 0), 0);
    const totalCubierto = totalCuentas + totalClientes;
    const restante = Math.max(0, totalCompra - totalCubierto);
    const progresoPct = totalCompra > 0 ? Math.min(100, (totalCubierto / totalCompra) * 100) : 0;
    const pagoCompleto = Number(totalCubierto.toFixed(2)) === Number(totalCompra.toFixed(2));
    // Pagar de más nunca se permite, con o sin deuda parcial habilitada — mismo criterio que el backend.
    const sePaso = totalCubierto - totalCompra > 0.01;
    const puedeConfirmar = !sePaso && (pagoCompleto || (permitirDeudaParcial && totalCubierto > 0));

    return (
        <div className="flex flex-col items-center gap-2">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                        disabled={!hayProductos}
                        className="bg-sidebar-accent cursor-pointer text-white hover:bg-emerald-500 disabled:cursor-not-allowed"
                    >
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        Realizar Compra
                        {hayAlmacenInvalido && (
                            <Badge variant="destructive" className="ml-2">
                                Almacén inválido
                            </Badge>
                        )}
                    </Button>
                </AlertDialogTrigger>

                <AlertDialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-5xl">
                    {/* PASO 1: ¿CÓMO SE REGISTRA LA COMPRA? */}
                    {paso === 'seleccion' && (
                        <>
                            <AlertDialogHeader className="border-b bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-6 text-white">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <ShoppingCart className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <AlertDialogTitle className="text-2xl font-bold">Finalizar Compra</AlertDialogTitle>
                                        <AlertDialogDescription className="text-emerald-100">
                                            Total a pagar: <span className="text-3xl font-bold">{formatearUsd(totalCompra)}</span>
                                        </AlertDialogDescription>
                                    </div>
                                </div>
                            </AlertDialogHeader>

                            <div className="px-8 py-12">
                                <h3 className="mb-8 text-center text-xl font-semibold">¿Cómo deseas registrar esta compra?</h3>
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <button
                                        onClick={() => onTipoCompraChange('deuda_proveedor')}
                                        className="flex cursor-pointer flex-col gap-4 rounded-xl border-2 border-gray-200 p-6 text-left transition-all hover:border-orange-500 hover:bg-orange-50 dark:border-gray-700 dark:hover:bg-orange-950/20"
                                    >
                                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
                                            <CreditCard className="h-6 w-6 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">Generar Deuda</p>
                                            <p className="text-muted-foreground text-sm">Registrar compra a crédito al asociado</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => onTipoCompraChange('pago_cash')}
                                        className="flex cursor-pointer flex-col gap-4 rounded-xl border-2 border-gray-200 p-6 text-left transition-all hover:border-emerald-500 hover:bg-emerald-50 dark:border-gray-700 dark:hover:bg-emerald-950/20"
                                    >
                                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
                                            <DollarSign className="h-6 w-6 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">Pagar Ahora</p>
                                            <p className="text-muted-foreground text-sm">Realizar pago inmediato con fondos disponibles</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            <AlertDialogFooter className="bg-muted/50 border-t px-8 py-5">
                                <AlertDialogCancel className="bg-sidebar-accent hover:bg-destructive cursor-pointer text-white">
                                    Cancelar
                                </AlertDialogCancel>
                            </AlertDialogFooter>
                        </>
                    )}

                    {/* PASO 2: CONFIRMAR DEUDA */}
                    {paso === 'deuda' && (
                        <>
                            <AlertDialogHeader className="border-b bg-gradient-to-r from-orange-600 to-orange-700 px-8 py-6 text-white">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <CreditCard className="h-8 w-8" />
                                    </div>
                                    <div>
                                        <AlertDialogTitle className="text-2xl font-bold">Registrar Deuda</AlertDialogTitle>
                                        <AlertDialogDescription className="text-orange-100">
                                            Confirma la creación de deuda con el asociado
                                        </AlertDialogDescription>
                                    </div>
                                </div>
                            </AlertDialogHeader>

                            <div className="px-8 py-8">
                                <div className="rounded-xl border border-orange-200 bg-orange-50 p-6 dark:border-orange-800 dark:bg-orange-950/30">
                                    <h4 className="mb-4 font-semibold">Resumen de la operación</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Monto total:</span>
                                            <span className="text-xl font-bold">{formatearUsd(totalCompra)}</span>
                                        </div>
                                        <Separator />
                                        <p className="text-muted-foreground text-sm">
                                            Esta compra se registrará como deuda con el asociado y será pagadera en el futuro.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <AlertDialogFooter className="bg-muted/50 border-t px-8 py-5">
                                <Button variant="outline" onClick={() => onTipoCompraChange('')} className="h-12 cursor-pointer px-6">
                                    Atrás
                                </Button>
                                <Button
                                    onClick={onConfirmar}
                                    disabled={procesando}
                                    className="h-12 cursor-pointer bg-orange-600 px-8 hover:bg-orange-700"
                                >
                                    {procesando ? (
                                        <>
                                            Procesando <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                                        </>
                                    ) : (
                                        <>
                                            Confirmar Deuda <CheckCircle className="ml-2 h-5 w-5" />
                                        </>
                                    )}
                                </Button>
                            </AlertDialogFooter>
                        </>
                    )}

                    {/* PASO 3: PAGAR AHORA */}
                    {paso === 'pago' && (
                        <>
                            <AlertDialogHeader className="border-b bg-gradient-to-r from-emerald-600 to-emerald-700 px-8 py-6 text-white">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                        <DollarSign className="h-8 w-8" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <AlertDialogTitle className="text-2xl font-bold">Procesar Pago</AlertDialogTitle>
                                        <AlertDialogDescription className="text-emerald-100">
                                            Total a cubrir: <span className="text-3xl font-bold text-white">{formatearUsd(totalCompra)}</span>
                                        </AlertDialogDescription>
                                    </div>
                                    <label className="flex shrink-0 cursor-pointer items-center gap-2 self-start rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white">
                                        <Checkbox
                                            checked={permitirDeudaParcial}
                                            onCheckedChange={(marcado) => onPermitirDeudaParcialChange(marcado === true)}
                                            className="border-white/40 bg-white/10 data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-emerald-700"
                                        />
                                        Permitir completar con deuda si no alcanza
                                    </label>
                                </div>

                                <div className="mt-5 space-y-2">
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                                        <div
                                            className={cn(
                                                'h-full rounded-full transition-all',
                                                pagoCompleto ? 'bg-green-400' : progresoPct >= 34 ? 'bg-yellow-300' : 'bg-red-400',
                                            )}
                                            style={{ width: `${progresoPct}%` }}
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-sm">
                                        <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                                            <Wallet className="h-3.5 w-3.5" />
                                            Cuentas: <span className="font-semibold text-white">{formatearUsd(totalCuentas)}</span>
                                        </span>
                                        <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                                            <Users className="h-3.5 w-3.5" />
                                            Clientes: <span className="font-semibold text-white">{formatearUsd(totalClientes)}</span>
                                        </span>
                                        <span
                                            className={cn(
                                                'ml-auto flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold',
                                                pagoCompleto
                                                    ? 'bg-white text-emerald-700'
                                                    : permitirDeudaParcial
                                                      ? 'bg-amber-400 text-amber-950'
                                                      : 'bg-white/15',
                                            )}
                                        >
                                            {pagoCompleto ? (
                                                <>
                                                    <CheckCircle className="h-3.5 w-3.5" /> Cubierto: {formatearUsd(totalCubierto)}
                                                </>
                                            ) : permitirDeudaParcial ? (
                                                <>Quedará como deuda: {formatearUsd(restante)}</>
                                            ) : (
                                                <>Restante: {formatearUsd(restante)}</>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </AlertDialogHeader>

                            <ScrollArea className="flex-1 overflow-y-auto">
                                <div className="px-8 py-6">
                                    <div className="grid gap-8 lg:grid-cols-2">
                                        {/* CLIENTES */}
                                        <FieldSet>
                                            <FieldLegend className="flex items-center gap-3 text-lg font-semibold">
                                                <Users className="h-5 w-5 text-blue-600" />
                                                Financiamiento con Clientes
                                            </FieldLegend>
                                            <FieldDescription>Usa créditos de clientes o genera préstamos</FieldDescription>

                                            <FieldGroup className="space-y-4 pt-4">
                                                <Field>
                                                    <div ref={resolverContenedor}>
                                                        <Combobox
                                                            multiple
                                                            items={clientes}
                                                            filteredItems={clientesFiltrados.filter((c) => c.id !== clienteDeCompraId)}
                                                            itemToStringLabel={(c: ClienteProps) => c.nombre_cliente}
                                                            value={pagosClientes
                                                                .map((p) => clientes.find((c) => c.id === p.cliente_id))
                                                                .filter((c): c is ClienteProps => !!c)}
                                                            onValueChange={(seleccionados) => {
                                                                onPagosClientesChange(
                                                                    seleccionados.map(
                                                                        (c) =>
                                                                            pagosClientes.find((p) => p.cliente_id === c.id) ?? {
                                                                                cliente_id: c.id,
                                                                                monto: 0,
                                                                            },
                                                                    ),
                                                                );
                                                            }}
                                                            onInputValueChange={onBuscarClientes}
                                                        >
                                                            <ComboboxChips>
                                                                {pagosClientes.map((pago) => {
                                                                    const cliente = clientes.find((c) => c.id === pago.cliente_id);

                                                                    return cliente ? (
                                                                        <ComboboxChip key={pago.cliente_id}>{cliente.nombre_cliente}</ComboboxChip>
                                                                    ) : null;
                                                                })}
                                                                <ComboboxChipsInput placeholder="Buscar cliente..." />
                                                            </ComboboxChips>
                                                            <ComboboxContent container={contenedor}>
                                                                <ComboboxEmpty>{buscandoClientes ? 'Buscando...' : 'Sin resultados'}</ComboboxEmpty>
                                                                <ComboboxList>
                                                                    {(cliente: ClienteProps) => (
                                                                        <ComboboxItem key={cliente.id} value={cliente}>
                                                                            <div className="flex w-full items-center justify-between gap-2">
                                                                                <span>{cliente.nombre_cliente}</span>
                                                                                <Badge
                                                                                    variant={
                                                                                        (cliente.deuda_pago_cliente ?? 0) > 0
                                                                                            ? 'default'
                                                                                            : 'secondary'
                                                                                    }
                                                                                    className="text-xs"
                                                                                >
                                                                                    ${cliente.deuda_pago_cliente ?? 0}
                                                                                </Badge>
                                                                            </div>
                                                                        </ComboboxItem>
                                                                    )}
                                                                </ComboboxList>
                                                                <Separator className="my-2" />
                                                                <div
                                                                    className="hover:bg-accent flex cursor-pointer items-center gap-2 p-2 text-sm text-blue-600"
                                                                    onClick={onCrearCliente}
                                                                >
                                                                    <PlusCircle className="h-4 w-4" />
                                                                    Crear nuevo cliente
                                                                </div>
                                                            </ComboboxContent>
                                                        </Combobox>
                                                    </div>
                                                </Field>

                                                {pagosClientes.length > 0 && (
                                                    <div className="divide-y rounded-lg border">
                                                        {pagosClientes.map((pago) => {
                                                            const cliente = clientes.find((c) => c.id === pago.cliente_id);

                                                            return (
                                                                <div key={pago.cliente_id} className="flex items-center gap-3 p-3">
                                                                    <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                                                                        {cliente?.nombre_cliente[0]}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="truncate text-sm font-medium">{cliente?.nombre_cliente}</p>
                                                                        <p className="text-muted-foreground text-xs">
                                                                            Crédito: ${cliente?.deuda_pago_cliente || 0}
                                                                        </p>
                                                                    </div>
                                                                    <InputGroup className="w-32 shrink-0">
                                                                        <InputGroupAddon>$</InputGroupAddon>
                                                                        <InputGroupInput
                                                                            inputMode="decimal"
                                                                            placeholder="0.00"
                                                                            value={pago.monto || ''}
                                                                            onChange={(e) => {
                                                                                const monto = parseFloat(e.target.value) || 0;
                                                                                onPagosClientesChange(
                                                                                    pagosClientes.map((p) =>
                                                                                        p.cliente_id === pago.cliente_id ? { ...p, monto } : p,
                                                                                    ),
                                                                                );
                                                                            }}
                                                                        />
                                                                    </InputGroup>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="shrink-0 cursor-pointer"
                                                                        onClick={() =>
                                                                            onPagosClientesChange(
                                                                                pagosClientes.filter((p) => p.cliente_id !== pago.cliente_id),
                                                                            )
                                                                        }
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </FieldGroup>
                                        </FieldSet>

                                        {/* CUENTAS */}
                                        <FieldSet>
                                            <FieldLegend className="flex items-center gap-3 text-lg font-semibold">
                                                <Wallet className="h-5 w-5 text-emerald-600" />
                                                Pago desde Cuentas
                                            </FieldLegend>
                                            <FieldDescription>Selecciona las cuentas a débitar</FieldDescription>

                                            <FieldGroup className="space-y-4 pt-4">
                                                <Field>
                                                    <Combobox
                                                        multiple
                                                        items={cuentas}
                                                        itemToStringLabel={(c: CuentaNegocioProps) => c.nombre_cuenta}
                                                        value={pagos
                                                            .map((p) => cuentas.find((c) => c.id === p.cuenta_id))
                                                            .filter((c): c is CuentaNegocioProps => !!c)}
                                                        onValueChange={(seleccionadas) => {
                                                            onPagosChange(
                                                                seleccionadas.map(
                                                                    (c) => pagos.find((p) => p.cuenta_id === c.id) ?? { cuenta_id: c.id, monto: 0 },
                                                                ),
                                                            );
                                                        }}
                                                    >
                                                        <ComboboxChips>
                                                            {pagos.map((pago) => {
                                                                const cuenta = cuentas.find((c) => c.id === pago.cuenta_id);

                                                                return cuenta ? (
                                                                    <ComboboxChip key={pago.cuenta_id}>{cuenta.nombre_cuenta}</ComboboxChip>
                                                                ) : null;
                                                            })}
                                                            <ComboboxChipsInput placeholder="Buscar cuentas..." />
                                                        </ComboboxChips>
                                                        <ComboboxContent container={contenedor}>
                                                            <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                                                            <ComboboxList>
                                                                {(cuenta: CuentaNegocioProps) => (
                                                                    <ComboboxItem key={cuenta.id} value={cuenta}>
                                                                        <div className="flex w-full items-center justify-between gap-2">
                                                                            <span>{cuenta.nombre_cuenta}</span>
                                                                            <span className="text-muted-foreground text-xs">
                                                                                Saldo: ${cuenta.saldo_cuenta}
                                                                            </span>
                                                                        </div>
                                                                    </ComboboxItem>
                                                                )}
                                                            </ComboboxList>
                                                        </ComboboxContent>
                                                    </Combobox>
                                                </Field>

                                                {pagos.length > 0 && (
                                                    <div className="divide-y rounded-lg border">
                                                        {pagos.map((pago) => {
                                                            const cuenta = cuentas.find((c) => c.id === pago.cuenta_id);

                                                            return (
                                                                <div key={pago.cuenta_id} className="flex items-center gap-3 p-3">
                                                                    <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                                                                        {cuenta?.nombre_cuenta[0]}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="truncate text-sm font-medium">{cuenta?.nombre_cuenta}</p>
                                                                        <p className="text-muted-foreground text-xs">
                                                                            Saldo: ${cuenta?.saldo_cuenta}
                                                                        </p>
                                                                    </div>
                                                                    <InputGroup className="w-32 shrink-0">
                                                                        <InputGroupAddon>$</InputGroupAddon>
                                                                        <InputGroupInput
                                                                            inputMode="decimal"
                                                                            placeholder="0.00"
                                                                            value={pago.monto || ''}
                                                                            onChange={(e) => {
                                                                                const monto = parseFloat(e.target.value) || 0;
                                                                                onPagosChange(
                                                                                    pagos.map((p) =>
                                                                                        p.cuenta_id === pago.cuenta_id ? { ...p, monto } : p,
                                                                                    ),
                                                                                );
                                                                            }}
                                                                        />
                                                                    </InputGroup>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="shrink-0 cursor-pointer"
                                                                        onClick={() =>
                                                                            onPagosChange(pagos.filter((p) => p.cuenta_id !== pago.cuenta_id))
                                                                        }
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </FieldGroup>
                                        </FieldSet>
                                    </div>
                                </div>
                            </ScrollArea>

                            <AlertDialogFooter className="bg-muted/50 border-t px-8 py-5">
                                <Button variant="outline" onClick={() => onTipoCompraChange('')} className="h-12 cursor-pointer px-6">
                                    Atrás
                                </Button>
                                <Button
                                    onClick={onConfirmar}
                                    disabled={procesando || !puedeConfirmar}
                                    className="h-12 cursor-pointer bg-emerald-600 px-8 hover:bg-emerald-700"
                                >
                                    {procesando ? (
                                        <>
                                            Procesando <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                                        </>
                                    ) : (
                                        <>
                                            Confirmar Pago <CheckCircle className="ml-2 h-5 w-5" />
                                        </>
                                    )}
                                </Button>
                            </AlertDialogFooter>
                        </>
                    )}
                </AlertDialogContent>
            </AlertDialog>

            {!hayProductos && <p className="text-muted-foreground text-xs">Agregue al menos un producto a la lista para poder realizar la compra.</p>}
        </div>
    );
}
