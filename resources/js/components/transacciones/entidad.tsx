import { Badge } from '@/components/ui/badge';
import { Combobox, ComboboxContent, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SpotlightCard from '@/components/ui/spotlightcard';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Building2, CreditCard, Lock, UserRound } from 'lucide-react';
import React, { useState } from 'react';

/**
 * Piezas visuales compartidas por los formularios de Transacciones (Gasto, Ingreso, Transferencia):
 * el selector de cuenta/cliente/proveedor con logo y badge de saldo, el campo de monto, el concepto y
 * el panel de resumen. Cada formulario solo elige su acento de color.
 */

export type TipoEntidad = 'cuenta' | 'cliente' | 'proveedor';
export type Acento = 'rose' | 'emerald' | 'blue' | 'violet';

export interface Banco {
    slug: string;
    nombre: string;
    imagen_url: string;
}

/** Lo que el selector y el resumen necesitan saber de una cuenta, un cliente o un proveedor, sin distinguir cuál es. */
export interface Entidad {
    id: string;
    tipo: TipoEntidad;
    nombre: string;
    monedaCodigo: string;
    simbolo: string;
    /** null cuando el usuario no puede ver el saldo (cuentas de cobro de un vendedor). */
    saldo: number | null;
    banco: Banco | null;
    /** Quién tiene la cuenta asignada: dice a quién se envía el dinero. */
    responsables?: string[];
    /** true si la cuenta es del usuario: una transferencia a una cuenta propia es inmediata. */
    propia?: boolean;
}

export interface CuentaEntidad {
    id: number;
    nombre_cuenta: string;
    /** null si el usuario no puede ver el saldo de esta cuenta. */
    saldo_cuenta: number | null;
    moneda: { codigo_moneda: string; simbolo_moneda: string };
    /** Logo real del banco/tarjeta (o insignia de efectivo); null si la cuenta no tiene uno asignado. */
    banco?: Banco | null;
    responsables?: string[];
    propia?: boolean;
}

export interface ClienteEntidad {
    id: number;
    nombre_cliente: string;
    deuda_pago_cliente: number | string | null;
}

export interface ProveedorEntidad {
    id: number;
    nombre_proveedor: string;
    saldo_proveedor: number | string | null;
}

export const entidadDeCuenta = (c: CuentaEntidad): Entidad => ({
    id: String(c.id),
    tipo: 'cuenta',
    nombre: c.nombre_cuenta,
    monedaCodigo: c.moneda.codigo_moneda,
    simbolo: c.moneda.simbolo_moneda,
    saldo: c.saldo_cuenta === null ? null : Number(c.saldo_cuenta) || 0,
    banco: c.banco ?? null,
    responsables: c.responsables,
    propia: c.propia,
});

export const entidadDeCliente = (c: ClienteEntidad): Entidad => ({
    id: String(c.id),
    tipo: 'cliente',
    nombre: c.nombre_cliente,
    monedaCodigo: 'USD',
    simbolo: '$',
    saldo: Number(c.deuda_pago_cliente) || 0,
    banco: null,
});

export const entidadDeProveedor = (p: ProveedorEntidad): Entidad => ({
    id: String(p.id),
    tipo: 'proveedor',
    nombre: p.nombre_proveedor,
    monedaCodigo: 'USD',
    simbolo: '$',
    saldo: Number(p.saldo_proveedor) || 0,
    banco: null,
});

export const formatear = (valor: number) => valor.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Cómo se llama el número de cada entidad: el saldo de una cuenta o proveedor, la deuda/pago de un cliente. */
export const etiquetaSaldoDe = (tipo: TipoEntidad) => (tipo === 'cliente' ? 'Deuda / pago' : 'Saldo');

// Clases completas por acento (Tailwind no detecta clases armadas por partes, ej. `bg-${color}-500`).
const ACENTOS: Record<
    Acento,
    {
        seccionIcono: string;
        opcionActiva: string;
        opcionIconoActivo: string;
        tarjeta: string;
        badge: string;
        cifra: string;
        resumen: string;
        spotlight: 'agotado' | 'disponible' | 'tarjeta' | 'global';
        boton: string;
    }
> = {
    rose: {
        seccionIcono: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
        opcionActiva: 'border-rose-500 bg-rose-500/10 shadow-md ring-4 shadow-rose-500/10 ring-rose-400/20',
        opcionIconoActivo: 'bg-rose-500 text-white',
        tarjeta: 'border-rose-400/30 bg-rose-500/5 dark:bg-rose-500/10',
        badge: 'bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/30',
        cifra: 'text-rose-600 dark:text-rose-400',
        resumen: 'border-rose-400/30 bg-rose-500/5 dark:bg-rose-500/10',
        spotlight: 'agotado',
        boton: 'bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/30 hover:from-rose-600 hover:to-red-700',
    },
    emerald: {
        seccionIcono: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        opcionActiva: 'border-emerald-500 bg-emerald-500/10 shadow-md ring-4 shadow-emerald-500/10 ring-emerald-400/20',
        opcionIconoActivo: 'bg-emerald-500 text-white',
        tarjeta: 'border-emerald-400/30 bg-emerald-500/5 dark:bg-emerald-500/10',
        badge: 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/30',
        cifra: 'text-emerald-600 dark:text-emerald-400',
        resumen: 'border-emerald-400/30 bg-emerald-500/5 dark:bg-emerald-500/10',
        spotlight: 'disponible',
        boton: 'bg-gradient-to-r from-emerald-500 to-green-600 shadow-emerald-500/30 hover:from-emerald-600 hover:to-green-700',
    },
    blue: {
        seccionIcono: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
        opcionActiva: 'border-blue-500 bg-blue-500/10 shadow-md ring-4 shadow-blue-500/10 ring-blue-400/20',
        opcionIconoActivo: 'bg-blue-500 text-white',
        tarjeta: 'border-blue-400/30 bg-blue-500/5 dark:bg-blue-500/10',
        badge: 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-blue-500/30',
        cifra: 'text-blue-600 dark:text-blue-400',
        resumen: 'border-blue-400/30 bg-blue-500/5 dark:bg-blue-500/10',
        spotlight: 'tarjeta',
        boton: 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-blue-500/30 hover:from-blue-600 hover:to-indigo-700',
    },
    violet: {
        seccionIcono: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
        opcionActiva: 'border-violet-500 bg-violet-500/10 shadow-md ring-4 shadow-violet-500/10 ring-violet-400/20',
        opcionIconoActivo: 'bg-violet-500 text-white',
        tarjeta: 'border-violet-400/30 bg-violet-500/5 dark:bg-violet-500/10',
        badge: 'bg-gradient-to-r from-violet-500 to-purple-600 shadow-violet-500/30',
        cifra: 'text-violet-600 dark:text-violet-400',
        resumen: 'border-violet-400/30 bg-violet-500/5 dark:bg-violet-500/10',
        spotlight: 'global',
        boton: 'bg-gradient-to-r from-violet-500 to-purple-600 shadow-violet-500/30 hover:from-violet-600 hover:to-purple-700',
    },
};

export const claseBoton = (acento: Acento) => ACENTOS[acento].boton;
export const claseCifra = (acento: Acento) => ACENTOS[acento].cifra;
export const claseTarjeta = (acento: Acento) => ACENTOS[acento].tarjeta;
export const claseBadge = (acento: Acento) => ACENTOS[acento].badge;

/** Logo del banco si lo hay; si no, un ícono (los clientes, los proveedores y las cuentas sin banco asignado no tienen imagen). */
export function Insignia({ entidad, tamano }: { entidad: Entidad; tamano: 'sm' | 'lg' }) {
    // El logo de una tarjeta es apaisado: se fija solo el alto y el ancho sigue su proporción. La caja de
    // ancho fijo mantiene alineados los nombres aunque los logos midan distinto.
    const caja = tamano === 'sm' ? 'w-14' : 'w-24';
    const alto = tamano === 'sm' ? 'h-8' : 'h-14';
    const Icono = entidad.tipo === 'cliente' ? UserRound : entidad.tipo === 'proveedor' ? Building2 : CreditCard;

    return (
        <span className={cn('flex shrink-0 items-center justify-center', caja)}>
            {entidad.banco ? (
                <img src={entidad.banco.imagen_url} alt="" aria-hidden="true" className={cn('w-auto max-w-full object-contain', alto)} />
            ) : (
                <Icono className={cn('text-muted-foreground', alto, tamano === 'sm' ? 'w-8' : 'w-14')} strokeWidth={1.5} />
            )}
        </span>
    );
}

/** Título de sección (H2) con ícono en círculo de color. */
export function SeccionTitulo({
    id,
    icono: Icono,
    acento,
    children,
}: {
    id: string;
    icono: React.ElementType;
    acento: Acento;
    children: React.ReactNode;
}) {
    return (
        <h2 id={id} className="flex items-center gap-3 text-xl font-bold">
            <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', ACENTOS[acento].seccionIcono)}>
                <Icono className="h-5 w-5" />
            </span>
            {children}
        </h2>
    );
}

/** Nombre de campo (H3) que además etiqueta el control. */
export function CampoTitulo({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
    return (
        <h3 className="text-sm font-semibold tracking-wide uppercase">
            <Label htmlFor={htmlFor} className="text-sm font-semibold tracking-wide uppercase">
                {children}
            </Label>
        </h3>
    );
}

export interface OpcionTipo<T extends string> {
    valor: T;
    titulo: string;
    descripcion: string;
    icono: React.ElementType;
}

/** Tarjetas seleccionables para elegir el tipo de entidad (cuenta, cliente, proveedor). */
export function OpcionesTipo<T extends string>({
    opciones,
    valor,
    onChange,
    acento,
    etiqueta,
}: {
    opciones: OpcionTipo<T>[];
    valor: T;
    onChange: (valor: T) => void;
    acento: Acento;
    etiqueta: string;
}) {
    return (
        <div role="radiogroup" aria-label={etiqueta} className={cn('grid gap-3', opciones.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
            {opciones.map(({ valor: opcion, titulo, descripcion, icono: Icono }) => {
                const activo = valor === opcion;

                return (
                    <button
                        key={opcion}
                        type="button"
                        role="radio"
                        aria-checked={activo}
                        onClick={() => onChange(opcion)}
                        className={cn(
                            'flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 text-left transition-all',
                            activo ? ACENTOS[acento].opcionActiva : 'border-input bg-background hover:bg-muted hover:shadow-sm',
                        )}
                    >
                        <span
                            className={cn(
                                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                                activo ? ACENTOS[acento].opcionIconoActivo : 'bg-muted text-muted-foreground',
                            )}
                        >
                            <Icono className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-base font-semibold">{titulo}</span>
                            <span className="text-muted-foreground block text-xs">{descripcion}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

/** Combobox de búsqueda: cada fila lleva el logo (o ícono), el nombre con su moneda y el saldo en un badge. */
export function SelectorEntidad({
    id,
    entidades,
    valor,
    onChange,
    placeholder,
}: {
    id: string;
    entidades: Entidad[];
    valor: string;
    onChange: (entidad: Entidad | null) => void;
    placeholder: string;
}) {
    const [busqueda, setBusqueda] = useState('');
    // Se busca por el nombre de la cuenta y también por su responsable (a quién se le envía)
    const termino = busqueda.toLowerCase();
    const visibles = entidades.filter(
        (e) =>
            !busqueda ||
            e.nombre.toLowerCase().includes(termino) ||
            (e.responsables ?? []).some((responsable) => responsable.toLowerCase().includes(termino)),
    );

    return (
        <Combobox
            value={valor || null}
            onValueChange={(seleccionado: string | null) => onChange(entidades.find((e) => e.id === seleccionado) ?? null)}
            onInputValueChange={setBusqueda}
            itemToStringLabel={(identificador: string) => entidades.find((e) => e.id === identificador)?.nombre ?? ''}
        >
            <ComboboxInput id={id} className="h-12 w-full" placeholder={placeholder} showClear={!!valor} />
            <ComboboxContent>
                {visibles.length === 0 && <div className="text-muted-foreground py-3 text-center text-sm">Sin resultados</div>}
                <ComboboxList>
                    {visibles.map((entidad) => (
                        <ComboboxItem key={entidad.id} value={entidad.id} className="py-2">
                            <span className="flex w-full min-w-0 items-center gap-3">
                                <Insignia entidad={entidad} tamano="sm" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate">
                                        {entidad.nombre} ({entidad.monedaCodigo})
                                    </span>
                                    {entidad.responsables && entidad.responsables.length > 0 && (
                                        <span className="text-muted-foreground block truncate text-xs">{entidad.responsables.join(', ')}</span>
                                    )}
                                </span>
                                {entidad.propia && (
                                    <Badge
                                        variant="outline"
                                        className="shrink-0 border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                                    >
                                        Tuya
                                    </Badge>
                                )}
                                {entidad.saldo !== null && (
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            'shrink-0 font-semibold',
                                            entidad.saldo > 0
                                                ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                : 'border-red-300 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-900/40 dark:text-red-300',
                                        )}
                                    >
                                        {formatear(entidad.saldo)}
                                    </Badge>
                                )}
                            </span>
                        </ComboboxItem>
                    ))}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}

/** Tarjeta de la entidad elegida: logo grande, nombre, badge de moneda y saldo actual. */
export function TarjetaEntidad({ entidad, acento }: { entidad: Entidad; acento: Acento }) {
    return (
        <div className={cn('flex items-center gap-4 rounded-xl border p-4 backdrop-blur-sm', ACENTOS[acento].tarjeta)}>
            <Insignia entidad={entidad} tamano="lg" />
            <div className="min-w-0 flex-1 space-y-1">
                <h3 className="truncate text-lg font-semibold">{entidad.nombre}</h3>
                <Badge className={cn('border-0 px-3 py-0.5 font-bold text-white shadow-md', ACENTOS[acento].badge)}>{entidad.monedaCodigo}</Badge>
                {entidad.responsables && entidad.responsables.length > 0 && (
                    <p className="text-muted-foreground truncate text-xs">Responsable: {entidad.responsables.join(', ')}</p>
                )}
            </div>
            {entidad.saldo !== null ? (
                <div className="text-right">
                    <p className="text-muted-foreground text-xs font-medium">{etiquetaSaldoDe(entidad.tipo)} actual</p>
                    <p className="text-2xl font-bold tabular-nums">
                        {entidad.simbolo} {formatear(entidad.saldo)}
                    </p>
                </div>
            ) : (
                <div className="text-muted-foreground flex items-center gap-1.5 text-right text-xs">
                    <Lock className="h-3.5 w-3.5" /> Saldo no visible
                </div>
            )}
        </div>
    );
}

/** Campo de monto grande, con el código de la moneda como prefijo. Queda deshabilitado hasta elegir la entidad. */
export function CampoMonto({
    valor,
    onChange,
    moneda,
    deshabilitado,
    error,
    ayuda,
    id = 'monto',
    titulo = 'Monto',
}: {
    valor: string;
    onChange: (valor: string) => void;
    moneda: string;
    deshabilitado: boolean;
    error?: string;
    ayuda: string;
    /** Distinto en cada campo cuando un formulario tiene varios montos (Operación Múltiple). */
    id?: string;
    titulo?: string;
}) {
    return (
        <div className="space-y-2">
            <CampoTitulo htmlFor={id}>{titulo}</CampoTitulo>
            <div className="relative">
                <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lg font-bold">
                    {moneda || '—'}
                </span>
                <Input
                    type="number"
                    id={id}
                    inputMode="decimal"
                    value={valor}
                    onChange={(e) => onChange(e.target.value)}
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    disabled={deshabilitado}
                    className="h-16 pl-16 text-3xl font-black tabular-nums"
                />
            </div>
            {deshabilitado && <p className="text-muted-foreground text-xs">{ayuda}</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
}

export const MAX_CONCEPTO = 255;

/** Concepto de la operación, con contador de caracteres. */
export function CampoConcepto({
    valor,
    onChange,
    error,
    placeholder,
    id = 'comentario',
    titulo = 'Concepto',
    max = MAX_CONCEPTO,
}: {
    valor: string;
    onChange: (valor: string) => void;
    error?: string;
    placeholder: string;
    id?: string;
    titulo?: string;
    /** Largo máximo: 255 en la mayoría de las operaciones, 500 en las notas de una Operación Múltiple. */
    max?: number;
}) {
    return (
        <div className="space-y-2">
            <CampoTitulo htmlFor={id}>{titulo}</CampoTitulo>
            <Textarea id={id} value={valor} onChange={(e) => onChange(e.target.value.slice(0, max))} placeholder={placeholder} className="min-h-24" />
            <div className="flex justify-between text-xs">
                <span className="text-red-500">{error}</span>
                <span className="text-muted-foreground tabular-nums">
                    {valor.length}/{max}
                </span>
            </div>
        </div>
    );
}

/** Panel lateral de resumen con el borde animado del acento. */
export function ResumenCard({
    acento,
    titulo,
    icono: Icono,
    children,
}: {
    acento: Acento;
    titulo: string;
    icono: React.ElementType;
    children: React.ReactNode;
}) {
    return (
        <SpotlightCard
            estado={ACENTOS[acento].spotlight}
            className={cn('space-y-5 rounded-xl border p-5 shadow-sm backdrop-blur-sm lg:sticky lg:top-4', ACENTOS[acento].resumen)}
        >
            <h2 className="flex items-center gap-3 text-xl font-bold">
                <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', ACENTOS[acento].seccionIcono)}>
                    <Icono className="h-5 w-5" />
                </span>
                {titulo}
            </h2>
            {children}
        </SpotlightCard>
    );
}

/** Un dato del resumen: título (H3) pequeño y el valor debajo. */
export function ResumenDato({ titulo, separado, children }: { titulo: string; separado?: boolean; children: React.ReactNode }) {
    return (
        <div className={cn('space-y-1', separado && 'border-t pt-4')}>
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{titulo}</h3>
            {children}
        </div>
    );
}
