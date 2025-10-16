import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Banknote, Landmark } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Cuentas',
        href: '/cuentas',
    },
    {
        title: 'Editar Cuenta',
        href: '#',
    },
];

interface MonedaOption {
    id: number;
    nombre_completo: string;
    codigo_moneda: string;
    simbolo_moneda: string;
}

interface CuentaEditProps {
    id: number;
    nombre_cuenta: string;
    tipo: string;
    saldo_cuenta: number;
    moneda_id: number;
    tipo_cuenta: string;
    estado: string;
    notas_cuenta: string;
    moneda: {
        id: number;
        nombre_moneda: string;
        codigo_moneda: string;
        simbolo_moneda: string;
    } | null;
}

interface EditarCuentasPageProps {
    cuenta: CuentaEditProps;
    monedas: MonedaOption[];
}

export default function EditarCuentasPage({ cuenta, monedas }: EditarCuentasPageProps) {
    // Manejo del formulario con useForm - ACTUALIZADO con nuevos campos
    const { data, setData, put, errors, processing } = useForm({
        nombre_cuenta: cuenta.nombre_cuenta,
        tipo: cuenta.tipo as 'caja' | 'banco' | 'tarjeta' | 'efectivo' | 'otro',
        saldo_cuenta: cuenta.saldo_cuenta ?? 0,
        moneda_id: cuenta.moneda_id.toString(),
        tipo_cuenta: cuenta.tipo_cuenta as 'permanentes' | 'temporales' | 'deudas',
        estado: cuenta.estado as 'activa' | 'inactiva',
        notas_cuenta: cuenta.notas_cuenta || '',
    });

    // Función para enviar el formulario
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('cuentas.update', { cuenta: cuenta.id }), {
            onSuccess: () => {
                toast.success('Cuenta actualizada correctamente');
            },
            onError: () => {
                toast.error('Error al actualizar la cuenta. Por favor, verifica los datos.');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Cuenta" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                {/* Header */}
                <Card className="border-sidebar-border relative overflow-hidden">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-bold">Editar Cuenta</CardTitle>
                                <CardDescription>Actualice los detalles de la cuenta para su negocio</CardDescription>
                            </div>
                            <Landmark size={80} className="text-muted-foreground/20 pointer-events-none absolute top-4 right-4" />
                        </div>
                    </CardHeader>
                </Card>

                {/* Formulario de Edición */}
                <Card>
                    <CardContent className="p-6">
                        <form onSubmit={submit} className="space-y-6">
                            {/* Contenedor de dos columnas horizontales */}
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                {/* Columna 1 */}
                                <div className="space-y-4">
                                    {/* Campo Nombre de la Cuenta */}
                                    <div className="space-y-2">
                                        <Label htmlFor="nombre_cuenta">Nombre de la Cuenta *</Label>
                                        <Input
                                            id="nombre_cuenta"
                                            value={data.nombre_cuenta}
                                            onChange={(e) => setData('nombre_cuenta', e.target.value.toUpperCase())}
                                            placeholder="Ej: CAJA PRINCIPAL USD"
                                            className="w-full"
                                        />
                                        <InputError message={errors.nombre_cuenta} />
                                    </div>

                                    {/* Campo Tipo de Activo */}
                                    <div className="space-y-2">
                                        <Label htmlFor="tipo">Tipo de Activo *</Label>
                                        <Select
                                            value={data.tipo}
                                            onValueChange={(value: 'caja' | 'banco' | 'tarjeta' | 'efectivo' | 'otro') => setData('tipo', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione el tipo de activo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="caja">Caja</SelectItem>
                                                <SelectItem value="banco">Banco</SelectItem>
                                                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                                                <SelectItem value="efectivo">Efectivo</SelectItem>
                                                <SelectItem value="otro">Otro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.tipo} />
                                    </div>

                                    {/* Campo Saldo de la Cuenta */}
                                    <div className="space-y-2">
                                        <Label htmlFor="saldo_cuenta">Saldo Actual</Label>
                                        <Input
                                            id="saldo_cuenta"
                                            type="number"
                                            step="0.00000001"
                                            value={data.saldo_cuenta || ''}
                                            onChange={(e) => setData('saldo_cuenta', parseFloat(e.target.value) || 0)}
                                            placeholder="0.00"
                                            className="w-full"
                                            disabled
                                        />
                                        <InputError message={errors.saldo_cuenta} />
                                        <p className="text-muted-foreground text-xs">El saldo no se puede modificar directamente</p>
                                    </div>
                                </div>

                                {/* Columna 2 */}
                                <div className="space-y-4">
                                    {/* Campo Moneda */}
                                    <div className="space-y-2">
                                        <Label htmlFor="moneda_id">Moneda *</Label>
                                        <Select value={data.moneda_id} onValueChange={(value) => setData('moneda_id', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione una moneda" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {monedas.map((moneda) => (
                                                    <SelectItem key={moneda.id} value={moneda.id.toString()}>
                                                        {moneda.nombre_completo}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.moneda_id} />
                                    </div>

                                    {/* Campo Tipo de Cuenta */}
                                    <div className="space-y-2">
                                        <Label htmlFor="tipo_cuenta">Tipo de Cuenta *</Label>
                                        <Select
                                            value={data.tipo_cuenta}
                                            onValueChange={(value: 'permanentes' | 'temporales' | 'deudas') => setData('tipo_cuenta', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione un tipo de cuenta" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="permanentes">Permanente</SelectItem>
                                                <SelectItem value="temporales">Temporal</SelectItem>
                                                <SelectItem value="deudas">Deuda</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.tipo_cuenta} />
                                    </div>

                                    {/* Campo Estado */}
                                    <div className="space-y-2">
                                        <Label htmlFor="estado">Estado *</Label>
                                        <Select value={data.estado} onValueChange={(value: 'activa' | 'inactiva') => setData('estado', value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione el estado" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="activa">Activa</SelectItem>
                                                <SelectItem value="inactiva">Inactiva</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.estado} />
                                    </div>
                                </div>
                            </div>

                            {/* Campo Notas Adicionales - Ancho completo */}
                            <div className="space-y-2">
                                <Label htmlFor="notas_cuenta">Notas Adicionales</Label>
                                <Textarea
                                    id="notas_cuenta"
                                    value={data.notas_cuenta}
                                    onChange={(e) => setData('notas_cuenta', e.target.value)}
                                    placeholder="Notas adicionales sobre la cuenta..."
                                    className="min-h-[100px] w-full"
                                />
                                <InputError message={errors.notas_cuenta} />
                            </div>

                            {/* Información de la Cuenta */}
                            <Card className="bg-muted/50">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Información de la Cuenta</CardTitle>
                                    <CardDescription>Detalles actuales de la cuenta</CardDescription>
                                </CardHeader>
                                <CardContent className="text-muted-foreground text-sm">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="font-medium">ID:</span> {cuenta.id}
                                        </div>
                                        <div>
                                            <span className="font-medium">Moneda Actual:</span> {cuenta.moneda?.nombre_moneda} (
                                            {cuenta.moneda?.codigo_moneda})
                                        </div>
                                        <div>
                                            <span className="font-medium">Saldo Actual:</span> {cuenta.moneda?.simbolo_moneda || '$'}{' '}
                                            {cuenta.saldo_cuenta?.toFixed(2)}
                                        </div>
                                        <div>
                                            <span className="font-medium">Tipo Actual:</span> {cuenta.tipo}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Botones de Acción - Centrados */}
                            <div className="flex justify-center gap-4 pt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => window.history.back()}
                                    disabled={processing}
                                    className="min-w-[120px]"
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={processing} className="min-w-[120px]">
                                    {processing ? (
                                        <>
                                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            Actualizando...
                                        </>
                                    ) : (
                                        <>
                                            <Banknote className="mr-2 h-4 w-4" />
                                            Actualizar
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
