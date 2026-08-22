import HeadingSmall from '@/components/heading-small';
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
import { Coins, Save } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface PageProps {
    moneda_principal?: {
        codigo_moneda: string;
        nombre_moneda: string;
    };
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
    const { moneda_principal, errors } = props;

    const { data, setData, post, processing, reset } = useForm({
        codigo_moneda: '',
        nombre_moneda: '',
        simbolo_moneda: '',
        tasa_cambio: '' as number | '',
        commission: '' as number | '',
        estado: true,
        principal: false,
    });

    // Mostrar notificación si hay errores
    useEffect(() => {
        if (errors) {
            toast.error('Por favor corrige los errores en el formulario');
        }
    }, [errors]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/monedas', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Moneda creada exitosamente');
                reset();
            },
            onError: () => {
                toast.error('Error al crear la moneda');
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
            toast.info(
                `Esta moneda será establecida como principal, reemplazando a ${moneda_principal?.nombre_moneda || 'la moneda principal actual'}`,
            );
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Moneda" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <div className="flex items-center gap-4">
                        <HeadingSmall title="Crear Nueva Moneda" description="Agrega una nueva moneda al sistema con todos sus detalles." />
                    </div>
                    <Coins
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Formulario */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Formulario Principal */}
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Información de la Moneda</CardTitle>
                            <CardDescription>Completa todos los campos requeridos para registrar la nueva moneda</CardDescription>
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
                                            onChange={(e) => setData('codigo_moneda', e.target.value.toUpperCase())}
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

                                {/* Tasa de Cambio y Comisión */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

                                    <div className="space-y-2">
                                        <Label htmlFor="commission">
                                            Comisión (%) <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="commission"
                                            type="number"
                                            step="0.0001"
                                            min="0"
                                            placeholder="0.0000"
                                            value={data.commission}
                                            onChange={(e) => setData('commission', parseFloat(e.target.value) || '')}
                                            className={errors?.commission ? 'border-red-500' : ''}
                                        />
                                        {errors?.commission && <p className="text-sm text-red-500">{errors.commission}</p>}
                                        <p className="text-muted-foreground text-sm">Comisión porcentual aplicada</p>
                                    </div>
                                </div>

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
                    <Card>
                        <CardHeader>
                            <CardTitle>Información Importante</CardTitle>
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
        </AppLayout>
    );
}
