import { TipoCuentaLogo, type TipoCuenta } from '@/components/cuentas/tipo-cuenta-logo';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SpotlightCard from '@/components/ui/spotlightcard';
import { cn } from '@/lib/utils';
import { Check, CreditCard, Globe, HandCoins, Search, ShieldCheck, University, User, Wallet, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AccesoCuenta, CuentaAsignada, CuentaDisponible } from './tipos';

interface CuentasPanelProps {
    cuentas: CuentaDisponible[];
    tiposCuenta: TipoCuenta[];
    asignadas: CuentaAsignada[];
    onChange: (asignadas: CuentaAsignada[]) => void;
    /** Errores de validación de `cuentas`, `cuentas.N.id` y `cuentas.N.acceso`. */
    error?: string;
}

const NIVELES: { valor: AccesoCuenta; nombre: string; ayuda: string; icono: typeof ShieldCheck; activo: string }[] = [
    {
        valor: 'completo',
        nombre: 'Completo',
        ayuda: 'Ve el saldo y puede operarla (gastos, transferencias, ingresos) además de cobrar.',
        icono: ShieldCheck,
        activo: 'bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white',
    },
    {
        valor: 'cobro',
        nombre: 'Cobro',
        ayuda: 'Solo recibe pagos de ventas. No ve el saldo ni puede sacar dinero.',
        icono: HandCoins,
        activo: 'bg-amber-600 text-white hover:bg-amber-600 hover:text-white',
    },
];

const TODOS = 'todos';

/**
 * Pestaña "Cuentas" de Crear y Editar Empleado. Tarjetas compactas que se marcan con un clic; cada cuenta marcada
 * lleva su nivel de acceso (`completo` opera y ve el saldo, `cobro` solo recibe pagos de ventas) y el borde
 * animado de su color. Con filtros por moneda, tipo y titular, porque son muchas.
 */
export function CuentasPanel({ cuentas, tiposCuenta, asignadas, onChange, error }: CuentasPanelProps) {
    const [busqueda, setBusqueda] = useState('');
    const [moneda, setMoneda] = useState(TODOS);
    const [tipo, setTipo] = useState(TODOS);
    const [titular, setTitular] = useState(TODOS);
    const [soloAsignadas, setSoloAsignadas] = useState(false);

    const monedas = useMemo(() => Array.from(new Set(cuentas.map((c) => c.moneda).filter((m): m is string => !!m))).sort(), [cuentas]);
    const accesoDe = (id: number) => asignadas.find((a) => a.id === id)?.acceso;

    const filtradas = useMemo(() => {
        const texto = busqueda.toLowerCase();

        return cuentas.filter(
            (c) =>
                (c.nombre_cuenta.toLowerCase().includes(texto) || (c.moneda ?? '').toLowerCase().includes(texto)) &&
                (moneda === TODOS || c.moneda === moneda) &&
                (tipo === TODOS || c.tipo === tipo) &&
                (titular === TODOS || c.tipo_titular === titular) &&
                (!soloAsignadas || asignadas.some((a) => a.id === c.id)),
        );
    }, [cuentas, busqueda, moneda, tipo, titular, soloAsignadas, asignadas]);

    const hayFiltros = busqueda !== '' || moneda !== TODOS || tipo !== TODOS || titular !== TODOS || soloAsignadas;
    const todasMarcadas = filtradas.length > 0 && filtradas.every((c) => accesoDe(c.id));

    const limpiarFiltros = () => {
        setBusqueda('');
        setMoneda(TODOS);
        setTipo(TODOS);
        setTitular(TODOS);
        setSoloAsignadas(false);
    };

    const alternar = (id: number) => onChange(accesoDe(id) ? asignadas.filter((a) => a.id !== id) : [...asignadas, { id, acceso: 'completo' }]);

    const alternarTodas = () => {
        if (todasMarcadas) {
            onChange(asignadas.filter((a) => !filtradas.some((c) => c.id === a.id)));
        } else {
            onChange([...asignadas, ...filtradas.filter((c) => !accesoDe(c.id)).map((c): CuentaAsignada => ({ id: c.id, acceso: 'completo' }))]);
        }
    };

    const cambiarAcceso = (id: number, acceso: AccesoCuenta) => onChange(asignadas.map((a) => (a.id === id ? { ...a, acceso } : a)));

    return (
        <div className="space-y-4">
            <div className="grid gap-2 text-xs sm:grid-cols-2">
                {NIVELES.map(({ valor, nombre, ayuda, icono: Icono }) => (
                    <div key={valor} className="bg-muted/50 flex items-start gap-2 rounded-lg border p-3">
                        <Icono className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                        <p className="text-muted-foreground">
                            <span className="text-foreground font-medium">{nombre}:</span> {ayuda}
                        </p>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-56 flex-1">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
                    <Input
                        placeholder="Buscar cuenta por nombre o moneda..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="pr-8 pl-8"
                    />
                    {busqueda && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setBusqueda('')}
                            className="absolute top-1/2 right-1 h-6 w-6 -translate-y-1/2"
                        >
                            <X size={14} />
                        </Button>
                    )}
                </div>
                <Select value={moneda} onValueChange={setMoneda}>
                    <SelectTrigger className="w-32" aria-label="Filtrar por moneda">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={TODOS}>Monedas</SelectItem>
                        {monedas.map((m) => (
                            <SelectItem key={m} value={m}>
                                {m}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger className="w-32" aria-label="Filtrar por tipo">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={TODOS}>Tipos</SelectItem>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={titular} onValueChange={setTitular}>
                    <SelectTrigger className="w-36" aria-label="Filtrar por titular">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={TODOS}>Titulares</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="externa">Externa</SelectItem>
                    </SelectContent>
                </Select>
                <Button type="button" variant={soloAsignadas ? 'default' : 'outline'} size="sm" onClick={() => setSoloAsignadas((v) => !v)}>
                    Solo asignadas
                </Button>
                {hayFiltros && (
                    <Button type="button" variant="ghost" size="sm" onClick={limpiarFiltros}>
                        Limpiar
                    </Button>
                )}
            </div>

            <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                    {filtradas.length === cuentas.length ? 'Mostrando todas las cuentas' : `Mostrando ${filtradas.length} de ${cuentas.length}`}
                </span>
                {filtradas.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={alternarTodas}>
                        {todasMarcadas ? 'Desmarcar las mostradas' : 'Marcar las mostradas (completo)'}
                    </Button>
                )}
            </div>

            <div className="grid max-h-[34rem] grid-cols-1 gap-x-3 gap-y-8 overflow-y-auto px-1 pt-8 pb-1 md:grid-cols-2 xl:grid-cols-3">
                {filtradas.length > 0 ? (
                    filtradas.map((cuenta) => {
                        const acceso = accesoDe(cuenta.id);
                        const tipoCuenta = tiposCuenta.find((t) => t.slug === cuenta.tipo);

                        const contenido = (
                            <>
                                {/* Efecto bleed (igual que la mascota del dashboard): la imagen de la cuenta se ancla arriba a la
                                    derecha y sobresale por encima del borde de la tarjeta, por eso la tarjeta NO lleva overflow-hidden.
                                    Sin imagen queda un ícono del tipo, sin efecto. */}
                                {cuenta.banco ? (
                                    <img
                                        src={cuenta.banco.imagen_url}
                                        alt=""
                                        aria-hidden="true"
                                        className="pointer-events-none absolute -top-5 right-3 z-20 h-20 w-auto max-w-40 object-contain object-right drop-shadow-lg select-none"
                                    />
                                ) : cuenta.tipo === 'efectivo' ? (
                                    <Wallet className="text-muted-foreground/30 absolute top-3 right-3 h-8 w-8" />
                                ) : (
                                    <CreditCard className="text-muted-foreground/30 absolute top-3 right-3 h-8 w-8" />
                                )}

                                <div className="space-y-2 p-3">
                                    <div className="flex min-h-14 items-start gap-2 pr-40">
                                        <span
                                            className={cn(
                                                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-white',
                                                !acceso && 'border-muted-foreground/40',
                                                acceso === 'completo' && 'border-emerald-600 bg-emerald-600',
                                                acceso === 'cobro' && 'border-amber-600 bg-amber-600',
                                            )}
                                        >
                                            {acceso && <Check className="h-3 w-3" />}
                                        </span>
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <p className="truncate text-sm font-semibold">{cuenta.nombre_cuenta}</p>
                                            <div className="flex flex-wrap items-center gap-1">
                                                {cuenta.moneda && (
                                                    <Badge variant="outline" className="font-mono text-[10px]">
                                                        {cuenta.moneda}
                                                    </Badge>
                                                )}
                                                {cuenta.tipo_titular && (
                                                    <Badge variant="outline" className="gap-1 text-[10px]">
                                                        {cuenta.tipo_titular === 'externa' ? (
                                                            <Globe className="h-2.5 w-2.5" />
                                                        ) : (
                                                            <User className="h-2.5 w-2.5" />
                                                        )}
                                                        {cuenta.tipo_titular === 'externa' ? 'Externa' : 'Personal'}
                                                    </Badge>
                                                )}
                                                {cuenta.estado !== 'activa' && (
                                                    <Badge variant="outline" className="border-red-300 text-[10px] text-red-600">
                                                        Inactiva
                                                    </Badge>
                                                )}
                                                {tipoCuenta && <TipoCuentaLogo tipo={tipoCuenta} className="h-5" />}
                                            </div>
                                        </div>
                                    </div>

                                    {acceso && (
                                        <div
                                            className="grid grid-cols-2 gap-1 rounded-md border p-0.5"
                                            role="group"
                                            aria-label={`Acceso a ${cuenta.nombre_cuenta}`}
                                            onClick={(e) => e.stopPropagation()}
                                            onKeyDown={(e) => e.stopPropagation()}
                                        >
                                            {NIVELES.map(({ valor, nombre, icono: Icono, activo }) => (
                                                <Button
                                                    key={valor}
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    aria-pressed={acceso === valor}
                                                    onClick={() => cambiarAcceso(cuenta.id, valor)}
                                                    className={cn('h-7 gap-1 text-xs', acceso === valor && activo)}
                                                >
                                                    <Icono className="h-3 w-3" /> {nombre}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        );

                        const propiedades = {
                            role: 'checkbox' as const,
                            'aria-checked': !!acceso,
                            'aria-label': cuenta.nombre_cuenta,
                            tabIndex: 0,
                            onClick: () => alternar(cuenta.id),
                            onKeyDown: (e: React.KeyboardEvent) => {
                                if (e.target === e.currentTarget && (e.key === ' ' || e.key === 'Enter')) {
                                    e.preventDefault();
                                    alternar(cuenta.id);
                                }
                            },
                        };
                        const clases =
                            'bg-card relative cursor-pointer rounded-xl border transition-all hover:shadow-md focus-visible:ring-2 focus-visible:outline-none';

                        return acceso ? (
                            <SpotlightCard key={cuenta.id} estado={acceso} className={clases} {...propiedades}>
                                {contenido}
                            </SpotlightCard>
                        ) : (
                            <div key={cuenta.id} className={clases} {...propiedades}>
                                {contenido}
                            </div>
                        );
                    })
                ) : (
                    <div className="text-muted-foreground col-span-full py-12 text-center">
                        <University size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">{hayFiltros ? 'No hay cuentas que coincidan con los filtros' : 'No hay cuentas disponibles'}</p>
                    </div>
                )}
            </div>
            <InputError message={error} />
        </div>
    );
}
