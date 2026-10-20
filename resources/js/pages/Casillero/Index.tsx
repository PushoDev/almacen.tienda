import CasilleroAnularCargoDialog from '@/components/casillero/casillero-anular-cargo-dialog';
import CasilleroCargoDialog from '@/components/casillero/casillero-cargo-dialog';
import CasilleroLista from '@/components/casillero/casillero-lista';
import CasilleroLlegadaDialog from '@/components/casillero/casillero-llegada-dialog';
import CasilleroWidgets from '@/components/casillero/casillero-widgets';
import { CargoCasillero, CompraCasillero, CuentaUsdCasillero, ResumenCasillero } from '@/components/casillero/tipos-casillero';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sileo-toaster';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Container, PackagePlus, Receipt, ShoppingBasket } from 'lucide-react';
import { useState } from 'react';

interface CasilleroIndexProps {
    compras: CompraCasillero[];
    cuentas: CuentaUsdCasillero[];
    resumen: ResumenCasillero;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Caja Principal', href: route('dashboard') },
    { title: 'Casillero de Compras', href: route('casillero.index') },
];

export default function CasilleroIndex({ compras, cuentas, resumen }: CasilleroIndexProps) {
    const [seleccionadas, setSeleccionadas] = useState<number[]>([]);
    const [cargoAbierto, setCargoAbierto] = useState(false);
    const [llegadaDe, setLlegadaDe] = useState<CompraCasillero | null>(null);
    const [cargoAAnular, setCargoAAnular] = useState<CargoCasillero | null>(null);

    // La selección solo conserva compras que siguen en la lista (al anotar un cargo o salir una compra del casillero).
    const marcadas = compras.filter((c) => seleccionadas.includes(c.id));

    const alternar = (id: number) =>
        setSeleccionadas((anteriores) => (anteriores.includes(id) ? anteriores.filter((x) => x !== id) : [...anteriores, id]));
    const alternarTodas = () => setSeleccionadas(marcadas.length === compras.length ? [] : compras.map((c) => c.id));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Casillero de Compras" />

            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Casillero de Compras"
                        description="Lo que ya compraste y espera en Panamá: está pagado, todavía no es inventario y aquí le anotas la estadía y otros cargos."
                    />
                    <ShoppingBasket
                        size={70}
                        color="#f59e0b"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator className="col-span-4" />

                <CasilleroWidgets resumen={resumen} />

                <Card className="overflow-hidden border-l-4 border-sky-500/30 pt-0 shadow-sm">
                    <CardHeader className="border-b bg-gradient-to-r from-cyan-600 to-sky-700 px-6 py-5 text-white">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <ShoppingBasket className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-white">Compras esperando en Panamá</CardTitle>
                                    <CardDescription className="text-sky-100">
                                        Marca una o varias compras para anotarles un cargo; abre una fila para ver sus productos.
                                    </CardDescription>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    size="sm"
                                    disabled={marcadas.length === 0}
                                    onClick={() => setCargoAbierto(true)}
                                    className="gap-1.5 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30 disabled:opacity-60"
                                >
                                    <Receipt className="h-4 w-4" />
                                    Anotar cargo{marcadas.length > 0 ? ` (${marcadas.length})` : ''}
                                </Button>
                                <Button asChild size="sm" className="gap-1.5 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30">
                                    <Link href={route('casillero.contenedores.index')}>
                                        <Container className="h-4 w-4" /> Contenedores
                                    </Link>
                                </Button>
                                <Button asChild size="sm" className="gap-1.5 bg-white/20 text-white backdrop-blur-sm hover:bg-white/30">
                                    <Link href={route('comprar.index')}>
                                        <PackagePlus className="h-4 w-4" /> Registrar compra
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {compras.length === 0 ? (
                            <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center">
                                <ShoppingBasket className="h-10 w-10 opacity-30" />
                                <p className="text-sm">No hay compras esperando en el casillero.</p>
                                <p className="text-xs">Al registrar una compra eligiendo «Enviar al casillero» aparece aquí.</p>
                            </div>
                        ) : (
                            <CasilleroLista
                                compras={compras}
                                seleccionadas={marcadas.map((c) => c.id)}
                                onAlternar={alternar}
                                onAlternarTodas={alternarTodas}
                                onAnotarLlegada={setLlegadaDe}
                                onAnularCargo={setCargoAAnular}
                            />
                        )}
                    </CardContent>
                </Card>
            </div>

            <CasilleroCargoDialog
                open={cargoAbierto}
                onOpenChange={setCargoAbierto}
                cuentas={cuentas}
                onGuardado={() => setSeleccionadas([])}
                url={route('casillero.cargos.store')}
                compraIds={marcadas.map((c) => c.id)}
                destino={`${marcadas.length === 1 ? 'la compra' : 'las compras'} ${marcadas.map((c) => `#${c.id}`).join(', ')}`}
            />
            <CasilleroLlegadaDialog open={llegadaDe !== null} onOpenChange={(abierto) => !abierto && setLlegadaDe(null)} compra={llegadaDe} />
            <CasilleroAnularCargoDialog
                open={cargoAAnular !== null}
                onOpenChange={(abierto) => !abierto && setCargoAAnular(null)}
                cargo={cargoAAnular}
            />

            <Toaster position="top-center" />
        </AppLayout>
    );
}
