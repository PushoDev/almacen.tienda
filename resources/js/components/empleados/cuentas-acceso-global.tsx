import { TipoCuentaLogo, type TipoCuenta } from '@/components/cuentas/tipo-cuenta-logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SpotlightCard from '@/components/ui/spotlightcard';
import { CreditCard, Globe, Search, University, User, Wallet, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { CuentaDisponible } from './tipos';

interface CuentasAccesoGlobalProps {
    cuentas: CuentaDisponible[];
    tiposCuenta: TipoCuenta[];
}

const TODOS = 'todos';

/**
 * Pestaña "Cuentas" del acceso global (admin/moderador) en Crear/Editar Empleado: no eligen nada
 * (por eso no hay checkbox ni nivel de acceso, a diferencia de `CuentasPanel`), solo ven que ya
 * pueden usar las N cuentas del sistema — mismo lenguaje visual (imagen con bleed, badges, borde
 * animado) para que quede claro que es la misma "familia" de tarjeta, no una menos capaz.
 */
export function CuentasAccesoGlobal({ cuentas, tiposCuenta }: CuentasAccesoGlobalProps) {
    const [busqueda, setBusqueda] = useState('');
    const [moneda, setMoneda] = useState(TODOS);
    const [tipo, setTipo] = useState(TODOS);

    const monedas = useMemo(() => Array.from(new Set(cuentas.map((c) => c.moneda).filter((m): m is string => !!m))).sort(), [cuentas]);

    const filtradas = useMemo(() => {
        const texto = busqueda.toLowerCase();

        return cuentas.filter(
            (c) =>
                (c.nombre_cuenta.toLowerCase().includes(texto) || (c.moneda ?? '').toLowerCase().includes(texto)) &&
                (moneda === TODOS || c.moneda === moneda) &&
                (tipo === TODOS || c.tipo === tipo),
        );
    }, [cuentas, busqueda, moneda, tipo]);

    const hayFiltros = busqueda !== '' || moneda !== TODOS || tipo !== TODOS;
    const limpiarFiltros = () => {
        setBusqueda('');
        setMoneda(TODOS);
        setTipo(TODOS);
    };

    return (
        <div className="space-y-4">
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
                {hayFiltros && (
                    <Button type="button" variant="ghost" size="sm" onClick={limpiarFiltros}>
                        Limpiar
                    </Button>
                )}
            </div>

            <span className="text-muted-foreground text-xs">
                {filtradas.length === cuentas.length ? 'Mostrando todas las cuentas' : `Mostrando ${filtradas.length} de ${cuentas.length}`}
            </span>

            <div className="grid max-h-[32rem] grid-cols-1 gap-x-3 gap-y-8 overflow-y-auto px-1 pt-8 pb-1 md:grid-cols-2 xl:grid-cols-3">
                {filtradas.length > 0 ? (
                    filtradas.map((cuenta) => {
                        const tipoCuenta = tiposCuenta.find((t) => t.slug === cuenta.tipo);

                        return (
                            <SpotlightCard key={cuenta.id} estado="global" className="bg-card relative rounded-xl border">
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
                                    <div className="min-h-14 space-y-1 pr-40">
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
                            </SpotlightCard>
                        );
                    })
                ) : (
                    <div className="text-muted-foreground col-span-full py-12 text-center">
                        <University size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No hay cuentas que coincidan con los filtros</p>
                    </div>
                )}
            </div>
        </div>
    );
}
