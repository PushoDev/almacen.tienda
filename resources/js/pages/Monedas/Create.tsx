import HeadingSmall from '@/components/heading-small';
import { type CatalogoMetodosPago, MetodosPagoSelector } from '@/components/monedas/metodos-pago-selector';
import { SelectorImagenEfectivo } from '@/components/SelectorImagenEfectivo';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollProgress } from '@/components/ui/scroll';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Coins, DollarSign, Info, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { sileo } from '@/lib/sileo';
import { Toaster } from '@/components/ui/sileo-toaster';

interface CatalogoImagen {
    slug: string;
    nombre: string;
    imagen_url: string;
}

interface PageProps {
    moneda_principal?: {
        codigo_moneda: string;
        nombre_moneda: string;
    };
    catalogoImagenes: CatalogoImagen[];
    catalogoMetodosPago: CatalogoMetodosPago;
    errors?: Record<string, string>;
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Monedas',
        href: '/monedas',
    },
    {
        title: 'Crear Moneda',
        href: '#',
    },
];

export default function MonedaCreate() {
    const { props } = usePage<PageProps>();
    const { moneda_principal, catalogoImagenes, catalogoMetodosPago, errors } = props;

    // Vías que se sugieren al crear una moneda: CUP con las cubanas (EnZona, Transfermóvil) y las demás con
    // las internacionales. Se pueden cambiar a mano; en cuanto se toca la lista, el código deja de cambiarla.
    const viasPorDefecto = (codigo: string) =>
        catalogoMetodosPago.vias.filter((via) => via.ambito === (codigo === 'CUP' ? 'cuba' : 'internacional')).map((via) => via.slug);
    const [viasTocadas, setViasTocadas] = useState(false);

    const { data, setData, post, processing, reset } = useForm({
        codigo_moneda: '',
        nombre_moneda: '',
        simbolo_moneda: '',
        imagen: null as string | null,
        tasa_cambio: '' as number | '',
        estado: true,
        principal: false,
        metodos_pago: catalogoMetodosPago.metodos.map((metodo) => metodo.slug),
        vias_pago: viasPorDefecto(''),
    });

    // Insignia elegida en vivo (reacciona a cada cambio en el selector, antes de guardar) —
    // mismo patrón que Monedas/Edit.tsx (docs/patron-mascota-bleed.md Variante A).
    const insigniaSeleccionada = useMemo(() => catalogoImagenes.find((item) => item.slug === data.imagen) ?? null, [catalogoImagenes, data.imagen]);

    // Mostrar notificación si hay errores
    useEffect(() => {
        if (errors) {
            sileo.error({ title: 'Corrige los errores', description: 'Revisa los campos marcados en el formulario' });
        }
    }, [errors]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/monedas', {
            preserveScroll: true,
            onSuccess: () => {
                sileo.success({ title: 'Moneda creada', description: 'La moneda se creó correctamente' });
                setViasTocadas(false);
                reset();
            },
            onError: () => {
                sileo.error({ title: 'Error al crear', description: 'No se pudo crear la moneda' });
            },
        });
    };

    const handleEstadoChange = (checked: boolean) => {
        setData('estado', checked);
        // Si se desactiva la moneda y era principal, quitar principal
        if (!checked && data.principal) {
            setData('principal', false);
        }
    };

    const handlePrincipalChange = (checked: boolean) => {
        setData('principal', checked);
        if (checked) {
            sileo.info({
                title: 'Nueva moneda principal',
                description: `Reemplazará a ${moneda_principal?.nombre_moneda || 'la moneda principal actual'}`,
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Moneda" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header — sin overflow-hidden a propósito: la insignia elegida usa efecto
                    bleed (ver docs/patron-mascota-bleed.md Variante A), se sale del borde
                    superior en vez de quedar recortada adentro. Mismo patrón que Monedas/Edit.tsx. */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 rounded-2xl border border-dashed p-4">
                    <div className="flex items-center gap-4">
                        <HeadingSmall title="Crear Nueva Moneda" description="Agrega una nueva moneda al sistema con todos sus detalles." />
                    </div>
                    {insigniaSeleccionada ? (
                        <img
                            src={insigniaSeleccionada.imagen_url}
                            alt=""
                            aria-hidden="true"
                            className="pointer-events-none absolute right-4 bottom-0 h-28 w-auto select-none"
                        />
                    ) : (
                        <Coins
                            size={70}
                            color="#d6d3d1"
                            className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                        />
                    )}
                </div>

                {/* Formulario */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Formulario Principal */}
                    <Card className="overflow-hidden border-l-4 border-violet-500/30 pt-0 shadow-sm transition-shadow hover:shadow-md lg:col-span-2">
                        <CardHeader className="border-b bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-white">Información de la Moneda</CardTitle>
                                    <CardDescription className="text-violet-100">
                                        Completa todos los campos requeridos para registrar la nueva moneda
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Código y Nombre */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="codigo_moneda">
                                            Código de Moneda <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="codigo_moneda"
                                            type="text"
                                            maxLength={3}
                                            placeholder="Ej: USD, EUR, CUP"
                                            value={data.codigo_moneda}
                                            onChange={(e) => {
                                                const codigo = e.target.value.toUpperCase();
                                                setData((previo) => ({
                                                    ...previo,
                                                    codigo_moneda: codigo,
                                                    vias_pago: viasTocadas ? previo.vias_pago : viasPorDefecto(codigo),
                                                }));
                                            }}
                                            className={errors?.codigo_moneda ? 'border-red-500' : ''}
                                        />
                                        {errors?.codigo_moneda && <p className="text-sm text-red-500">{errors.codigo_moneda}</p>}
                                        <p className="text-muted-foreground text-sm">Código de 3 letras (ISO 4217)</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="nombre_moneda">
                                            Nombre de la Moneda <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="nombre_moneda"
                                            type="text"
                                            placeholder="Ej: Dólar Americano, Euro, Bolívar"
                                            value={data.nombre_moneda}
                                            onChange={(e) => setData('nombre_moneda', e.target.value)}
                                            className={errors?.nombre_moneda ? 'border-red-500' : ''}
                                        />
                                        {errors?.nombre_moneda && <p className="text-sm text-red-500">{errors.nombre_moneda}</p>}
                                    </div>
                                </div>

                                {/* Símbolo */}
                                <div className="space-y-2">
                                    <Label htmlFor="simbolo_moneda">
                                        Símbolo <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="simbolo_moneda"
                                        type="text"
                                        placeholder="Ej: $, €, Zelle."
                                        value={data.simbolo_moneda}
                                        onChange={(e) => setData('simbolo_moneda', e.target.value.toUpperCase())}
                                        className={errors?.simbolo_moneda ? 'border-red-500' : ''}
                                    />
                                    {errors?.simbolo_moneda && <p className="text-sm text-red-500">{errors.simbolo_moneda}</p>}
                                </div>

                                {/* Insignia visual — catálogo en código (CatalogoTarjetasService::monedaImagenes()),
                                    independiente de cuentas.imagen. Opcional. */}
                                <div className="space-y-2">
                                    <Label>Insignia de la Moneda</Label>
                                    <SelectorImagenEfectivo
                                        catalogo={catalogoImagenes}
                                        value={data.imagen}
                                        onChange={(slug) => setData('imagen', slug)}
                                    />
                                    {errors?.imagen && <p className="text-sm text-red-500">{errors.imagen}</p>}
                                </div>

                                {/* Tasa de Cambio */}
                                <div className="space-y-2">
                                    <Label htmlFor="tasa_cambio">
                                        Tasa de Cambio <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="tasa_cambio"
                                        type="number"
                                        step="0.000001"
                                        min="0.000001"
                                        placeholder="1.0"
                                        value={data.tasa_cambio}
                                        onChange={(e) => setData('tasa_cambio', parseFloat(e.target.value) || '')}
                                        className={errors?.tasa_cambio ? 'border-red-500' : ''}
                                    />
                                    {errors?.tasa_cambio && <p className="text-sm text-red-500">{errors.tasa_cambio}</p>}
                                    <p className="text-muted-foreground text-sm">Tasa respecto a la moneda principal</p>
                                </div>

                                {/* Métodos de pago que admite la moneda y, en transferencia, sus vías */}
                                <MetodosPagoSelector
                                    catalogo={catalogoMetodosPago}
                                    metodos={data.metodos_pago}
                                    vias={data.vias_pago}
                                    onChange={(metodos, vias) => {
                                        setViasTocadas(true);
                                        setData((previo) => ({ ...previo, metodos_pago: metodos, vias_pago: vias }));
                                    }}
                                    errorMetodos={errors?.metodos_pago}
                                    errorVias={errors?.vias_pago}
                                />

                                {/* Estado y Principal */}
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="estado" className="text-base">
                                                Estado
                                            </Label>
                                            <p className="text-muted-foreground text-sm">{data.estado ? 'Moneda activa' : 'Moneda inactiva'}</p>
                                        </div>
                                        <Switch id="estado" checked={data.estado} onCheckedChange={handleEstadoChange} />
                                    </div>

                                    <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="principal" className="text-base">
                                                Moneda Principal
                                            </Label>
                                            <p className="text-muted-foreground text-sm">
                                                {data.principal ? 'Será la moneda principal' : 'Moneda secundaria'}
                                            </p>
                                        </div>
                                        <Switch
                                            id="principal"
                                            checked={data.principal}
                                            onCheckedChange={handlePrincipalChange}
                                            disabled={!data.estado}
                                        />
                                    </div>
                                </div>

                                {/* Mensaje de advertencia para moneda principal */}
                                {data.principal && (
                                    <Alert className="border-yellow-200 bg-yellow-50">
                                        <AlertDescription className="text-yellow-800">
                                            <strong>Importante:</strong> Al marcar esta moneda como principal, la moneda principal actual (
                                            {moneda_principal?.nombre_moneda || 'N/A'}) será reemplazada automáticamente.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {/* Botones de acción */}
                                <div className="flex gap-3 pt-4">
                                    <Button type="button" variant="outline" asChild>
                                        <Link href="/monedas">Cancelar</Link>
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        <Save className="mr-2 h-4 w-4" />
                                        {processing ? 'Creando...' : 'Crear Moneda'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Panel de Información */}
                    <Card className="overflow-hidden border-l-4 border-violet-500/30 pt-0 shadow-sm transition-shadow hover:shadow-md">
                        <CardHeader className="border-b bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <Info className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-white">Información Importante</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <h4 className="font-medium">Código de Moneda</h4>
                                <p className="text-muted-foreground text-sm">Utiliza códigos estándar de 3 letras (ISO 4217). Ej: USD, EUR, GBP.</p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium">Tasa de Cambio</h4>
                                <p className="text-muted-foreground text-sm">
                                    La tasa se calcula respecto a la moneda principal actual. Si esta será la moneda principal, la tasa debe ser 1.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium">Moneda Principal</h4>
                                <p className="text-muted-foreground text-sm">
                                    Solo una moneda puede ser principal. Al marcar esta opción, la moneda principal actual será reemplazada.
                                </p>
                            </div>

                            {moneda_principal && (
                                <div className="bg-muted rounded-lg p-3">
                                    <h4 className="text-sm font-medium">Moneda Principal Actual</h4>
                                    <p className="text-sm">
                                        {moneda_principal.nombre_moneda} ({moneda_principal.codigo_moneda})
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            <ScrollProgress />
            <Toaster position="top-center" />
        </AppLayout>
    );
}
