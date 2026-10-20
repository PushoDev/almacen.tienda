import CasilleroAnularCargoDialog from '@/components/casillero/casillero-anular-cargo-dialog';
import CasilleroCargoDialog from '@/components/casillero/casillero-cargo-dialog';
import ContenedorCancelarDialog from '@/components/casillero/contenedor-cancelar-dialog';
import ContenedorCard from '@/components/casillero/contenedor-card';
import ContenedorFormDialog from '@/components/casillero/contenedor-form-dialog';
import ContenedorUnidadesDialog from '@/components/casillero/contenedor-unidades-dialog';
import ContenedoresWidgets from '@/components/casillero/contenedores-widgets';
import {
    CargoCasillero,
    ContenedorCasillero,
    CuentaUsdCasillero,
    LineaDisponible,
    ResumenContenedores,
} from '@/components/casillero/tipos-casillero';
import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sileo-toaster';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Container, Plus, ShoppingBasket } from 'lucide-react';
import { useState } from 'react';

interface ContenedoresProps {
    contenedores: ContenedorCasillero[];
    disponibles: LineaDisponible[];
    cuentas: CuentaUsdCasillero[];
    resumen: ResumenContenedores;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Caja Principal', href: route('dashboard') },
    { title: 'Casillero de Compras', href: route('casillero.index') },
    { title: 'Contenedores', href: route('casillero.contenedores.index') },
];

export default function Contenedores({ contenedores, disponibles, cuentas, resumen }: ContenedoresProps) {
    // `formulario`: undefined = cerrado, null = crear, un contenedor = editarlo. Cada diálogo guarda solo el id del contenedor en curso
    // para tomar siempre su versión actual de la lista que llega del servidor.
    const [formulario, setFormulario] = useState<ContenedorCasillero | null | undefined>(undefined);
    const [unidadesId, setUnidadesId] = useState<number | null>(null);
    const [cargoId, setCargoId] = useState<number | null>(null);
    const [cancelarId, setCancelarId] = useState<number | null>(null);
    const [cargoAAnular, setCargoAAnular] = useState<CargoCasillero | null>(null);

    const porId = (id: number | null) => contenedores.find((c) => c.id === id) ?? null;
    const paraCargo = porId(cargoId);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Contenedores" />

            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Contenedores"
                        description="Lo que sale de Panamá hacia el Mariel: eliges cuántas unidades de cada compra suben y le anotas el transporte marítimo y otros cargos."
                    />
                    <Container
                        size={70}
                        color="#f59e0b"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator className="col-span-4" />

                <ContenedoresWidgets resumen={resumen} />

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-muted-foreground text-sm">
                        {disponibles.length > 0
                            ? `${disponibles.reduce((total, l) => total + l.en_casillero, 0)} unidades siguen esperando en el casillero.`
                            : 'No queda nada esperando en el casillero.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm" className="gap-1.5">
                            <Link href={route('casillero.index')}>
                                <ShoppingBasket className="h-4 w-4" /> Casillero
                            </Link>
                        </Button>
                        <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700" onClick={() => setFormulario(null)}>
                            <Plus className="h-4 w-4" /> Nuevo contenedor
                        </Button>
                    </div>
                </div>

                {contenedores.length === 0 ? (
                    <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-14 text-center">
                        <Container className="h-10 w-10 opacity-30" />
                        <p className="text-sm">No hay contenedores abiertos.</p>
                        <p className="text-xs">Crea uno y súbele lo que espera en el casillero.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {contenedores.map((contenedor) => (
                            <ContenedorCard
                                key={contenedor.id}
                                contenedor={contenedor}
                                onEditar={setFormulario}
                                onAsignar={(c) => setUnidadesId(c.id)}
                                onAnotarCargo={(c) => setCargoId(c.id)}
                                onAnularCargo={setCargoAAnular}
                                onCancelar={(c) => setCancelarId(c.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <ContenedorFormDialog
                open={formulario !== undefined}
                onOpenChange={(abierto) => !abierto && setFormulario(undefined)}
                contenedor={formulario ?? null}
            />
            <ContenedorUnidadesDialog
                open={unidadesId !== null}
                onOpenChange={(abierto) => !abierto && setUnidadesId(null)}
                contenedor={porId(unidadesId)}
                disponibles={disponibles}
            />
            <CasilleroCargoDialog
                open={paraCargo !== null}
                onOpenChange={(abierto) => !abierto && setCargoId(null)}
                cuentas={cuentas}
                onGuardado={() => undefined}
                url={paraCargo ? route('casillero.contenedores.cargos.store', paraCargo.id) : ''}
                destino={`el contenedor «${paraCargo?.nombre ?? ''}»`}
                conceptos={['Transporte marítimo', 'Otro cargo']}
            />
            <ContenedorCancelarDialog
                open={cancelarId !== null}
                onOpenChange={(abierto) => !abierto && setCancelarId(null)}
                contenedor={porId(cancelarId)}
            />
            <CasilleroAnularCargoDialog
                open={cargoAAnular !== null}
                onOpenChange={(abierto) => !abierto && setCargoAAnular(null)}
                cargo={cargoAAnular}
            />

            <Toaster position="top-center" />
        </AppLayout>
    );
}
