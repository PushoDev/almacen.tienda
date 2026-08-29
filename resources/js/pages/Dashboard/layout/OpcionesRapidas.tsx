import { RolBadge } from '@/components/rol-badge';
import { Card, CardContent } from '@/components/ui/card';
import { CursorFollow, CursorProvider } from '@/components/ui/cursor';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import { Link } from '@inertiajs/react';
import { DiamondPercent, IdCard, LucideBaggageClaim, LucideBoomBox, Notebook, ShoppingBagIcon } from 'lucide-react';

export default function OpcionesRapidas({ userRole }: { userRole: 'admin' | 'moderador' | 'vendedor' }) {
    return (
        <>
            {/* Encabezado + Rol */}
            <Card className="border-l-4 border-emerald-500/30 py-0 shadow-sm">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                    <h2 className="text-lg font-semibold">Opciones Disponibles</h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Rol:</span>
                        <RolBadge role={userRole} />
                    </div>
                </CardContent>
            </Card>

            {/* Opciones */}
            <div
                className={`animate__animated animate__flipInX grid auto-rows-min gap-4 ${userRole === 'admin' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}
            >
                {/* Widget de Compra - Solo Admin (moderador y vendedor no tienen acceso a Compras) */}
                {userRole === 'admin' && (
                    <div>
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-red-800 to-red-400">
                            <CursorProvider>
                                <CursorFollow>
                                    <div className="rounded-lg bg-red-500 px-2 py-1 text-sm text-white shadow-lg">Comprar Nuevos Productos</div>
                                </CursorFollow>
                            </CursorProvider>
                            {/* Ícono de fondo transparente */}
                            <div id="compra-producto" className="absolute inset-0 flex items-center justify-center opacity-10">
                                <ShoppingBagIcon className="h-48 w-48 text-white" />
                            </div>
                            {/* Contenido principal */}
                            <div className="relative z-10 h-full p-6">
                                {/* Ícono en la esquina superior izquierda */}
                                <div className="absolute top-4 left-4">
                                    <LucideBaggageClaim className="h-8 w-8 text-white" />
                                </div>
                                {/* Textos alineados a la derecha */}
                                <div className="flex h-full flex-col items-end justify-center space-y-2">
                                    <h3 className="font-sans text-4xl font-bold text-white">Comprar</h3>
                                </div>
                                {/* Link */}
                                <Link href={route('comprar.index')}>
                                    <button className="absolute right-4 bottom-4 ms-2 rounded-md bg-red-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-red-800">
                                        Acceder a Compra
                                    </button>
                                </Link>
                            </div>

                            {/* Patrón de fondo adicional */}
                            <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                        </div>
                    </div>
                )}

                {/* Widget de Venta - Todos */}
                <div>
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-blue-800 to-blue-400">
                        <CursorProvider>
                            <CursorFollow>
                                <div className="rounded-lg bg-blue-500 px-2 py-1 text-sm text-white shadow-lg">Punto de Venta</div>
                            </CursorFollow>
                        </CursorProvider>
                        {/* Ícono de fondo transparente */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-10">
                            <LucideBaggageClaim className="h-48 w-48 text-white" />
                        </div>

                        {/* Contenido principal */}
                        <div className="relative z-10 h-full p-6">
                            {/* Ícono en la esquina superior izquierda */}
                            <div className="absolute top-4 left-4">
                                <ShoppingBagIcon className="h-8 w-8 text-white" />
                            </div>

                            {/* Textos alineados a la derecha */}
                            <div className="flex h-full flex-col items-end justify-center space-y-2">
                                <h3 className="text-4xl font-bold text-white">Vender</h3>
                            </div>

                            {/* Botón pequeño con Dialog */}
                            <Link href={route('punto-venta.index')}>
                                <button className="absolute right-4 bottom-4 rounded-md bg-blue-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-blue-800">
                                    Vender
                                </button>
                            </Link>
                        </div>

                        {/* Patrón de fondo adicional */}
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                </div>

                {/* Widget de Transacciones - Todos */}
                <div>
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-green-800 to-green-400">
                        <CursorProvider>
                            <CursorFollow>
                                <div className="rounded-lg bg-emerald-500 px-2 py-1 text-sm text-white shadow-lg">Movimientos Internos de Dinero</div>
                            </CursorFollow>
                        </CursorProvider>
                        {/* Ícono de fondo transparente */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-10">
                            <DiamondPercent className="h-48 w-48 text-white" />
                        </div>

                        {/* Contenido principal */}
                        <div className="relative z-10 h-full p-6">
                            {/* Ícono en la esquina superior izquierda */}
                            <div className="absolute top-4 left-4">
                                <IdCard className="h-8 w-8 text-white" />
                            </div>

                            {/* Textos alineados a la derecha */}
                            <div className="flex h-full flex-col items-end justify-center space-y-2">
                                <h3 className="text-4xl font-bold text-white">Transacciones</h3>
                            </div>

                            {/* Botón pequeño */}
                            <Link href={route('transacciones')}>
                                <button className="absolute right-4 bottom-4 rounded-md bg-green-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-green-800">
                                    Movimiento Monetario
                                </button>
                            </Link>
                        </div>

                        {/* Patrón de fondo adicional */}
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                </div>

                {/* Widget de Cierres - Todos */}
                <div>
                    <div className="border-sidebar-border/70 dark:border-sidebar-border relative aspect-video overflow-hidden rounded-xl border bg-gradient-to-br from-amber-800 to-amber-400">
                        <CursorProvider>
                            <CursorFollow>
                                <div className="rounded-lg bg-amber-500 px-2 py-1 text-sm text-white shadow-lg">Cierre del Día</div>
                            </CursorFollow>
                        </CursorProvider>
                        {/* Ícono de fondo transparente */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-10">
                            <LucideBoomBox className="h-48 w-48 text-white" />
                        </div>

                        {/* Contenido principal */}
                        <div className="relative z-10 h-full p-6">
                            {/* Ícono en la esquina superior izquierda */}
                            <div className="absolute top-4 left-4">
                                <Notebook className="h-8 w-8 text-white" />
                            </div>

                            {/* Textos alineados a la derecha */}
                            <div className="flex h-full flex-col items-end justify-center space-y-2">
                                <h3 className="text-4xl font-bold text-white">Cuadrar Caja</h3>
                            </div>

                            {/* Botón pequeño */}
                            <Link href={route('ventas.cierres')}>
                                <button className="absolute right-4 bottom-4 rounded-md bg-amber-800 px-4 py-1 text-sm font-semibold text-white shadow-md transition duration-300 hover:animate-pulse hover:cursor-pointer hover:bg-white hover:text-amber-800">
                                    Planificar Cierres
                                </button>
                            </Link>
                        </div>

                        {/* Patrón de fondo adicional */}
                        <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    </div>
                </div>
            </div>
        </>
    );
}
