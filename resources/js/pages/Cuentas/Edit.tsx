import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Banknote, Eye, EyeOff, Landmark, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sileo } from '@/lib/sileo';
import { Toaster } from '@/components/ui/sileo-toaster';

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
    tipo_titular?: string | null;
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
    const { props } = usePage() as any;
    const isAdmin = props?.auth?.user?.role === 'admin';

    const { data, setData, put, errors, processing } = useForm({
        nombre_cuenta: cuenta.nombre_cuenta,
        tipo: cuenta.tipo as 'tarjeta' | 'efectivo',
        saldo_cuenta: cuenta.saldo_cuenta ?? 0,
        moneda_id: cuenta.moneda_id.toString(),
        tipo_cuenta: cuenta.tipo_cuenta as 'permanentes' | 'temporales',
        tipo_titular: cuenta.tipo_titular || '',
        estado: cuenta.estado as 'activa' | 'inactiva',
        notas_cuenta: cuenta.notas_cuenta || '',
        security_password: '',
        motivo_ajuste_saldo: '',
    });

    const [showSecurityPassword, setShowSecurityPassword] = useState(false);
    const [isSaldoDialogOpen, setIsSaldoDialogOpen] = useState(false);
    const saldoCambio = useMemo(() => Number(data.saldo_cuenta) !== Number(cuenta.saldo_cuenta ?? 0), [data.saldo_cuenta, cuenta.saldo_cuenta]);

    const enviarActualizacion = () => {
        put(route('cuentas.update', { cuenta: cuenta.id }), {
            onSuccess: () => {
                setIsSaldoDialogOpen(false);
                sileo.success({ title: 'Cuenta actualizada', description: 'Los cambios se guardaron correctamente' });
            },
            onError: () => {
                sileo.error({ title: 'Error al actualizar', description: 'Verifica los datos e inténtalo de nuevo' });
            },
        });
    };

    // Función para enviar el formulario
    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (isAdmin && saldoCambio) {
            setIsSaldoDialogOpen(true);
            return;
        }

        enviarActualizacion();
    };

    const confirmarAjusteSaldo = () => {
        if (!data.security_password) {
            sileo.warning({ title: 'Falta la contraseña', description: 'Debes ingresar tu contraseña para cambiar el saldo' });
            return;
        }

        if (!data.motivo_ajuste_saldo.trim()) {
            sileo.warning({ title: 'Falta el motivo', description: 'Debes indicar el motivo del ajuste de saldo' });
            return;
        }

        enviarActualizacion();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Cuenta" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Editar Cuenta" description="Actualice los detalles de la cuenta para su negocio" />
                    <Landmark size={70} color="#d6d3d1" className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40" />
                </div>

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
                                            onValueChange={(value: 'tarjeta' | 'efectivo') => setData('tipo', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione el tipo de activo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                                                <SelectItem value="efectivo">Efectivo</SelectItem>
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
                                            disabled={!isAdmin}
                                        />
                                        <InputError message={errors.saldo_cuenta} />
                                        <p className="text-muted-foreground text-xs">
                                            {isAdmin
                                                ? saldoCambio
                                                    ? 'Se le pedirá confirmar con su contraseña y un motivo al guardar.'
                                                    : 'Solo admin puede editar el saldo.'
                                                : 'El saldo no se puede modificar directamente.'}
                                        </p>
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
                                            onValueChange={(value: 'permanentes' | 'temporales') => setData('tipo_cuenta', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione un tipo de cuenta" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="permanentes">Permanente</SelectItem>
                                                <SelectItem value="temporales">Temporal</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.tipo_cuenta} />
                                    </div>

                                    {/* Campo Tipo Titular */}
                                    <div className="space-y-2">
                                        <Label htmlFor="tipo_titular">Tipo Titular</Label>
                                        <Select
                                            value={data.tipo_titular}
                                            onValueChange={(value) => setData('tipo_titular', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione tipo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="externa">Externa</SelectItem>
                                                <SelectItem value="personal">Personal</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.tipo_titular} />
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

                {/* Confirmación con contraseña antes de aplicar el ajuste de saldo (mismo patrón que Productos/Vendor/Index.tsx) */}
                <Dialog
                    open={isSaldoDialogOpen}
                    onOpenChange={(open) => {
                        setIsSaldoDialogOpen(open);
                        if (!open) {
                            setData('security_password', '');
                            setData('motivo_ajuste_saldo', '');
                            setShowSecurityPassword(false);
                        }
                    }}
                >
                    <DialogContent className="sm:max-w-[440px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <ShieldAlert className="text-amber-500" size={20} />
                                Confirmar ajuste de saldo
                            </DialogTitle>
                            <DialogDescription>
                                Vas a cambiar el saldo de <strong>{cuenta.nombre_cuenta}</strong> de{' '}
                                <strong>
                                    {cuenta.moneda?.simbolo_moneda || '$'} {cuenta.saldo_cuenta?.toFixed(2)}
                                </strong>{' '}
                                a{' '}
                                <strong>
                                    {cuenta.moneda?.simbolo_moneda || '$'} {Number(data.saldo_cuenta).toFixed(2)}
                                </strong>
                                . Esta acción queda registrada en el historial de auditoría. Ingresa tu contraseña y el motivo para confirmar.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                            <div className="grid gap-2">
                                <Label htmlFor="security_password">Su Contraseña *</Label>
                                <div className="relative">
                                    <Input
                                        id="security_password"
                                        type={showSecurityPassword ? 'text' : 'password'}
                                        value={data.security_password}
                                        onChange={(e) => setData('security_password', e.target.value)}
                                        placeholder="Ingrese su contraseña"
                                        className="pr-10"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowSecurityPassword((prev) => !prev)}
                                        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
                                        tabIndex={-1}
                                    >
                                        {showSecurityPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                <InputError message={errors.security_password} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="motivo_ajuste_saldo">Motivo del Ajuste *</Label>
                                <Textarea
                                    id="motivo_ajuste_saldo"
                                    value={data.motivo_ajuste_saldo}
                                    onChange={(e) => setData('motivo_ajuste_saldo', e.target.value)}
                                    placeholder="Explique por qué se está corrigiendo este saldo..."
                                    className="min-h-[80px]"
                                />
                                <InputError message={errors.motivo_ajuste_saldo} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsSaldoDialogOpen(false)}
                                disabled={processing}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                disabled={!data.security_password || !data.motivo_ajuste_saldo.trim() || processing}
                                onClick={confirmarAjusteSaldo}
                                className="bg-amber-600 text-white hover:bg-amber-700"
                            >
                                {processing ? 'Confirmando...' : 'Confirmar cambio'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <Toaster position="top-center" />
        </AppLayout>
    );
}
