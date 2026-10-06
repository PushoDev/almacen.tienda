import { MetodosPagoResumen, type MetodoResumen } from '@/components/monedas/metodos-pago-resumen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import SpotlightCard from '@/components/ui/spotlightcard';
import { Link } from '@inertiajs/react';
import { Coins, Edit3, Eye, HandCoins, Lock, MoreVertical, RefreshCw, Star, Tag, Trash2, TrendingUp, Wallet } from 'lucide-react';

export interface MonedaCardData {
    id: number;
    codigo_moneda: string;
    nombre_moneda: string;
    simbolo_moneda: string;
    imagen_url: string | null;
    tasa_cambio: number;
    tasa_comision: number | null;
    metodos_pago_resumen: MetodoResumen[];
    estado: boolean;
    principal: boolean;
}

export function MonedaCard({
    moneda,
    loadingAction,
    onCambiarEstado,
    onEstablecerPrincipal,
    onDeleteClick,
    formatNumber,
    puedeEliminar = true,
}: {
    moneda: MonedaCardData;
    /** Eliminar monedas es solo del admin: al moderador se le oculta la opción. */
    puedeEliminar?: boolean;
    /** Acción en curso para esta moneda ('cambiar-estado' | 'establecer-principal' | ''). */
    loadingAction: string;
    onCambiarEstado: () => void;
    onEstablecerPrincipal: () => void;
    onDeleteClick: (moneda: MonedaCardData) => void;
    formatNumber: (num: number, decimals?: number) => string;
}) {
    // Mismo criterio de color que el resto del proyecto usa para SpotlightCard: representa
    // ESTADO (disponible/agotado), no identidad de moneda — así escala a cualquier moneda
    // nueva que se agregue, sin necesidad de un color por código. 'especial' (ámbar) destaca
    // la principal (nunca puede estar inactiva, ver MonedaController::establecerPrincipal()).
    const spotlightEstado = moneda.principal ? 'especial' : moneda.estado ? 'disponible' : 'agotado';
    // Glow detrás de la insignia, mismo color que el borde spotlight — conecta ambos efectos.
    const glow = moneda.principal ? 'bg-amber-400' : moneda.estado ? 'bg-emerald-400' : 'bg-slate-400';

    return (
        <SpotlightCard
            estado={spotlightEstado}
            className="bg-card group overflow-hidden rounded-2xl border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
            {/* Header oscuro tipo "panel" (no el degradado violeta plano del resto del módulo:
                acá la insignia es la protagonista, bleed real sobre el borde — mismo recurso
                que Monedas/Show.tsx usa en su banner, ver docs/patron-mascota-bleed.md
                Variante A, adaptado de página a card). Header SIN overflow-hidden: el bleed
                necesita poder pintar sobre el cuerpo, el recorte redondeado lo da el
                SpotlightCard de afuera. */}
            <div className="relative flex h-28 flex-col justify-center overflow-visible bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 px-4">
                <span className="text-xl font-black tracking-wide text-white">{moneda.codigo_moneda}</span>
                <span className="truncate text-xs text-white/50">{moneda.nombre_moneda}</span>

                {/* Resplandor detrás de la insignia */}
                <div className={`pointer-events-none absolute top-0 right-0 h-40 w-40 rounded-full opacity-40 blur-2xl ${glow}`} />

                {/* Insignia a bleed: el asset real es apaisado (1774×887 la mayoría, 1536×1024
                    CUP) — fijar SOLO el ancho (w-48) y dejar la altura libre (h-auto) para que
                    se vea grande de verdad; un box cuadrado con object-contain la encogía a una
                    tira delgada, que es el bug que se veía en pantalla. */}
                {moneda.imagen_url ? (
                    <img
                        src={moneda.imagen_url}
                        alt={moneda.nombre_moneda}
                        className="pointer-events-none absolute -bottom-8 right-2 z-10 h-auto w-48 object-contain drop-shadow-2xl transition-transform group-hover:scale-105"
                    />
                ) : (
                    <Coins className="pointer-events-none absolute -bottom-6 right-4 z-10 h-20 w-20 text-white/20" />
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="secondary"
                            size="icon"
                            className="absolute top-2 right-2 z-20 h-7 w-7 cursor-pointer bg-black/40 text-white hover:bg-black/60"
                        >
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                            <Link href={`/monedas/${moneda.id}`} className="flex cursor-pointer items-center gap-2">
                                <Eye className="h-4 w-4" /> Ver detalles
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href={`/monedas/${moneda.id}/edit`} className="flex cursor-pointer items-center gap-2">
                                <Edit3 className="h-4 w-4" /> Editar
                            </Link>
                        </DropdownMenuItem>
                        {!moneda.principal && moneda.estado && (
                            <DropdownMenuItem
                                onClick={onEstablecerPrincipal}
                                disabled={loadingAction === 'establecer-principal'}
                                className="flex cursor-pointer items-center gap-2"
                            >
                                {loadingAction === 'establecer-principal' ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Star className="h-4 w-4" />
                                )}
                                Establecer como principal
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                            onClick={onCambiarEstado}
                            disabled={loadingAction === 'cambiar-estado' || moneda.principal}
                            className="flex cursor-pointer items-center gap-2"
                        >
                            {loadingAction === 'cambiar-estado' ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            {moneda.estado ? 'Desactivar' : 'Activar'}
                        </DropdownMenuItem>
                        {puedeEliminar && (
                            <DropdownMenuItem
                                onClick={() => onDeleteClick(moneda)}
                                disabled={moneda.principal}
                                className={
                                    moneda.principal
                                        ? 'text-muted-foreground flex cursor-pointer items-center gap-2'
                                        : 'flex cursor-pointer items-center gap-2 text-red-600'
                                }
                            >
                                {moneda.principal ? <Lock className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />} Eliminar
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Cuerpo — pt-12 deja el hueco donde sangra la insignia grande del header.
                Badges con más carácter (glass/gradiente/glow) en vez de las planas de
                antes — mismo componente <Badge> del proyecto, solo con más estilo en
                className; no se agregó una librería de badges nueva. */}
            <div className="space-y-3 p-4 pt-12">
                <div className="flex items-center justify-between gap-2">
                    {/* Glass: translúcida + blur, no un color sólido plano */}
                    <Badge className="gap-1 border border-violet-400/30 bg-violet-500/10 font-mono text-violet-700 shadow-sm backdrop-blur-sm dark:text-violet-300">
                        <Tag className="h-3 w-3" /> {moneda.simbolo_moneda}
                    </Badge>
                    {moneda.principal ? (
                        // Metálica dorada: gradiente + resplandor propio, como un badge VIP
                        <Badge className="gap-1 border border-amber-200 bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300 text-amber-950 shadow-md shadow-amber-500/40 transition-transform hover:scale-105">
                            <Star className="h-3 w-3 fill-amber-900" /> Principal
                        </Badge>
                    ) : (
                        <Badge
                            className={
                                moneda.estado
                                    ? 'gap-1 border border-emerald-400/40 bg-emerald-500/10 text-emerald-700 shadow-sm shadow-emerald-500/20 backdrop-blur-sm dark:text-emerald-300'
                                    : 'gap-1 border border-slate-400/30 bg-slate-500/10 text-slate-600 backdrop-blur-sm dark:text-slate-300'
                            }
                        >
                            {moneda.estado ? 'Activa' : 'Inactiva'}
                        </Badge>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 border-t pt-3">
                    <div className="space-y-1.5">
                        <p className="text-muted-foreground flex items-center gap-1 text-xs">
                            <TrendingUp className="h-3 w-3" /> Tasa de Cambio
                        </p>
                        {/* Gradiente con resplandor de color, no un gris plano */}
                        <Badge className="gap-1 border-0 bg-gradient-to-r from-sky-500 to-blue-600 text-sm font-bold text-white shadow-md shadow-sky-500/30 transition-transform hover:scale-105">
                            {formatNumber(moneda.tasa_cambio, 2)}
                        </Badge>
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-muted-foreground flex items-center gap-1 text-xs">
                            <HandCoins className="h-3 w-3" /> Tasa de Comisión
                        </p>
                        {moneda.tasa_comision !== null ? (
                            <Badge className="gap-1 border-0 bg-gradient-to-r from-amber-500 to-orange-600 text-sm font-bold text-white shadow-md shadow-amber-500/30 transition-transform hover:scale-105">
                                {formatNumber(moneda.tasa_comision, 2)}
                            </Badge>
                        ) : (
                            <Badge className="border border-slate-400/30 bg-slate-500/10 font-normal text-slate-600 backdrop-blur-sm dark:text-slate-300">
                                Usa tasa cambio
                            </Badge>
                        )}
                    </div>
                </div>

                <div className="space-y-1.5 border-t pt-3">
                    <p className="text-muted-foreground flex items-center gap-1 text-xs">
                        <Wallet className="h-3 w-3" /> Métodos de pago
                    </p>
                    <MetodosPagoResumen metodos={moneda.metodos_pago_resumen} compacto />
                </div>
            </div>
        </SpotlightCard>
    );
}
