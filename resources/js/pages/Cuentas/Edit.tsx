import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { OPCIONES_AMBITO, OPCIONES_TITULAR, OpcionesEnTarjeta } from '@/components/cuentas/opciones-en-tarjeta';
import { TipoCuentaLogo, type TipoCuenta } from '@/components/cuentas/tipo-cuenta-logo';
import { SelectorBancoTarjeta, type CatalogoTarjetas } from '@/components/SelectorBancoTarjeta';
import { SelectorImagenEfectivo } from '@/components/SelectorImagenEfectivo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollProgress } from '@/components/ui/scroll';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, CreditCard, Eye, EyeOff, Info, Landmark, Save, ShieldAlert, Wallet } from 'lucide-react';
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
    imagen_url: string | null;
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
    imagen: string | null;
    tipo_banco: string | null;
    ambito: string | null;
    moneda: {
        id: number;
        nombre_moneda: string;
        codigo_moneda: string;
        simbolo_moneda: string;
    } | null;
}

interface BancoOption {
    slug: string;
    nombre: string;
}

interface EditarCuentasPageProps {
    cuenta: CuentaEditProps;
    monedas: MonedaOption[];
    catalogoTarjetas: CatalogoTarjetas;
    tiposCuenta: TipoCuenta[];
    bancos: BancoOption[];
}

export default function EditarCuentasPage({ cuenta, monedas, catalogoTarjetas, bancos, tiposCuenta }: EditarCuentasPageProps) {
    const { props } = usePage() as any;
    const isAdmin = props?.auth?.user?.role === 'admin';

    const { data, setData, put, errors, processing } = useForm({
        nombre_cuenta: cuenta.nombre_cuenta,
        tipo: cuenta.tipo as 'tarjeta' | 'efectivo',
        saldo_cuenta: cuenta.saldo_cuenta ?? 0,
        moneda_id: cuenta.moneda_id.toString(),
        // Único valor válido desde que 'temporales' se unificó en 'permanentes' (migración
        // 2026-07-28) — ya no hay nada que elegir, se manda fijo.
        tipo_cuenta: 'permanentes',
        tipo_titular: cuenta.tipo_titular || '',
        estado: cuenta.estado as 'activa' | 'inactiva',
        notas_cuenta: cuenta.notas_cuenta || '',
        imagen: cuenta.imagen,
        tipo_banco: cuenta.tipo_banco || '',
        ambito: cuenta.ambito || '',
        security_password: '',
        motivo_ajuste_saldo: '',
    });

    // Banco o insignia de moneda elegidos en vivo (reacciona a cada cambio en el selector,
    // antes de guardar) — se usa para mostrar la tarjeta real en el header en vez del ícono
    // genérico.
    const bancoSeleccionado = useMemo(() => {
        const todos = [...catalogoTarjetas.interna, ...catalogoTarjetas.externa, ...catalogoTarjetas.efectivo];
        return todos.find((b) => b.slug === data.imagen) ?? null;
    }, [catalogoTarjetas, data.imagen]);

    // Logo de cada banco del select "Tipo de Banco", tomado del mismo catálogo de tarjetas.
    const logoDeBanco = useMemo(() => {
        const mapa = new Map<string, string>();
        [...catalogoTarjetas.interna, ...catalogoTarjetas.externa].forEach((b) => mapa.set(b.slug, b.imagen_url));
        return mapa;
    }, [catalogoTarjetas]);

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

    const ambitoActual = OPCIONES_AMBITO.find((opcion) => opcion.valor === cuenta.ambito);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Cuenta" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Editar Cuenta" description="Actualice los detalles de la cuenta para su negocio" />
                    {data.tipo === 'efectivo' && !bancoSeleccionado ? (
                        // Efectivo sin insignia elegida todavía — ícono genérico de siempre.
                        <Landmark
                            size={70}
                            color="#d6d3d1"
                            className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                        />
                    ) : bancoSeleccionado ? (
                        // Tarjeta con banco elegido — efecto bleed (docs/patron-mascota-bleed.md
                        // Variante A), reacciona en vivo al selector, sin overflow-hidden en el
                        // contenedor para que pueda sobresalir por el borde superior.
                        <img
                            src={bancoSeleccionado.imagen_url}
                            alt=""
                            aria-hidden="true"
                            className="pointer-events-none absolute right-4 bottom-0 h-28 w-auto select-none"
                        />
                    ) : (
                        // Tarjeta sin banco todavía — recordatorio sutil para que lo elija abajo.
                        <div className="pointer-events-none absolute right-4 bottom-2 flex flex-col items-center gap-1 opacity-60">
                            <CreditCard size={44} color="#d6d3d1" className="animate-pulse" />
                            <span className="text-[10px] font-medium whitespace-nowrap text-[#d6d3d1] animate-pulse">Elige un banco ↓</span>
                        </div>
                    )}
                </div>

                {/* Navegación — debajo del banner de página, nunca dentro (docs/header-structure.md). */}
                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link href={route('cuentas.index')}>
                                <Button variant="outline" className="flex items-center gap-2">
                                    <ArrowLeft size={16} />
                                    Volver
                                </Button>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Volver al listado de cuentas</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Formulario de Edición */}
                    <Card className="overflow-hidden border-l-4 border-indigo-500/30 pt-0 shadow-sm transition-shadow hover:shadow-md lg:col-span-2">
                        <CardHeader className="border-b bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <Wallet className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-white">Datos de la Cuenta</CardTitle>
                                    <CardDescription className="text-indigo-100">
                                        Actualiza los campos necesarios y guarda los cambios
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-6">
                                {/* Nombre y Moneda */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="nombre_cuenta">
                                            Nombre de la Cuenta <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="nombre_cuenta"
                                            value={data.nombre_cuenta}
                                            onChange={(e) => setData('nombre_cuenta', e.target.value.toUpperCase())}
                                            placeholder="Ej: CAJA PRINCIPAL USD"
                                            className="w-full"
                                        />
                                        <InputError message={errors.nombre_cuenta} />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="moneda_id">
                                            Moneda <span className="text-red-500">*</span>
                                        </Label>
                                        <Select value={data.moneda_id} onValueChange={(value) => setData('moneda_id', value)}>
                                            <SelectTrigger id="moneda_id">
                                                <SelectValue placeholder="Seleccione una moneda" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {monedas.map((moneda) => (
                                                    <SelectItem key={moneda.id} value={moneda.id.toString()}>
                                                        <span className="flex items-center gap-2">
                                                            {moneda.imagen_url && (
                                                                <img
                                                                    src={moneda.imagen_url}
                                                                    alt=""
                                                                    aria-hidden="true"
                                                                    className="h-5 w-auto object-contain"
                                                                />
                                                            )}
                                                            {moneda.nombre_completo}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.moneda_id} />
                                    </div>
                                </div>

                                {/* Tipo de Activo — Tipo de Cuenta ya no se elige: todas las cuentas son
                                    'permanentes' desde que 'temporales' se unificó (migración 2026-07-28). */}
                                <div className="space-y-2">
                                    <Label htmlFor="tipo">
                                        Tipo de Activo <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={data.tipo}
                                        onValueChange={(value: 'tarjeta' | 'efectivo') => {
                                            setData('tipo', value);
                                            // El catálogo de imagen es distinto por tipo (banco vs. moneda) — una
                                            // imagen elegida para el tipo anterior no aplica al nuevo.
                                            setData('imagen', null);
                                            // tipo_banco tampoco aplica a efectivo (hace función de caja, no es un banco).
                                            setData('tipo_banco', '');
                                        }}
                                    >
                                        <SelectTrigger id="tipo">
                                            <SelectValue placeholder="Seleccione el tipo de activo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tiposCuenta.map((tipo) => (
                                                <SelectItem key={tipo.slug} value={tipo.slug}>
                                                    <span className="flex items-center gap-2">
                                                        <TipoCuentaLogo tipo={tipo} className="h-6" />
                                                        {tipo.nombre}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.tipo} />
                                </div>

                                {/* Banco / Diseño y Tipo de Banco — solo aplican cuando tipo=tarjeta */}
                                {data.tipo === 'tarjeta' && (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Banco / Diseño de tarjeta</Label>
                                            <SelectorBancoTarjeta
                                                catalogo={catalogoTarjetas}
                                                value={data.imagen}
                                                onChange={(slug) => setData('imagen', slug)}
                                            />
                                            <InputError message={errors.imagen} />
                                        </div>

                                        {/* Tipo de Banco — clasificación independiente del diseño elegido al lado. No
                                            aplica a efectivo (hace función de caja, no es un banco). Las opciones vienen
                                            del mismo catálogo de bancos/tarjetas, así que crecen solas. */}
                                        <div className="space-y-2">
                                            <Label htmlFor="tipo_banco">Tipo de Banco</Label>
                                            <Select value={data.tipo_banco} onValueChange={(value) => setData('tipo_banco', value)}>
                                                <SelectTrigger id="tipo_banco">
                                                    <SelectValue placeholder="Seleccione el banco" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {bancos.map((banco) => (
                                                        <SelectItem key={banco.slug} value={banco.slug}>
                                                            <span className="flex items-center gap-2">
                                                                {logoDeBanco.get(banco.slug) && (
                                                                    <img
                                                                        src={logoDeBanco.get(banco.slug)}
                                                                        alt=""
                                                                        aria-hidden="true"
                                                                        className="h-5 w-8 rounded-sm object-cover"
                                                                    />
                                                                )}
                                                                {banco.nombre}
                                                            </span>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.tipo_banco} />
                                        </div>
                                    </div>
                                )}

                                {/* Insignia de Moneda — solo aplica cuando tipo=efectivo */}
                                {data.tipo === 'efectivo' && (
                                    <div className="space-y-2">
                                        <Label>Insignia de Moneda</Label>
                                        <SelectorImagenEfectivo
                                            catalogo={catalogoTarjetas.efectivo}
                                            value={data.imagen}
                                            onChange={(slug) => setData('imagen', slug)}
                                        />
                                        <InputError message={errors.imagen} />
                                    </div>
                                )}

                                {/* Ámbito — nacional o internacional, para tarjeta y efectivo. Opcional. */}
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label>Ámbito</Label>
                                        <p className="text-muted-foreground text-sm">
                                            Dónde está el dinero de esta cuenta. Si no eliges ninguno, queda sin clasificar.
                                        </p>
                                    </div>
                                    <OpcionesEnTarjeta
                                        opciones={OPCIONES_AMBITO}
                                        valor={data.ambito}
                                        onChange={(valor) => setData('ambito', valor)}
                                    />
                                    <InputError message={errors.ambito} />
                                </div>

                                {/* Tipo Titular */}
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <Label>Tipo Titular</Label>
                                        <p className="text-muted-foreground text-sm">A nombre de quién está la cuenta.</p>
                                    </div>
                                    <OpcionesEnTarjeta
                                        opciones={OPCIONES_TITULAR}
                                        valor={data.tipo_titular}
                                        onChange={(valor) => setData('tipo_titular', valor)}
                                    />
                                    <InputError message={errors.tipo_titular} />
                                </div>

                                {/* Saldo y Estado */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                                        <p className="text-muted-foreground text-sm">
                                            {isAdmin
                                                ? saldoCambio
                                                    ? 'Se le pedirá confirmar con su contraseña y un motivo al guardar.'
                                                    : 'Solo admin puede editar el saldo.'
                                                : 'El saldo no se puede modificar directamente.'}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <Label htmlFor="estado" className="text-base">
                                                Estado
                                            </Label>
                                            <p className="text-muted-foreground text-sm">
                                                {data.estado === 'activa' ? 'Cuenta activa' : 'Cuenta inactiva'}
                                            </p>
                                        </div>
                                        <Switch
                                            id="estado"
                                            checked={data.estado === 'activa'}
                                            onCheckedChange={(activa) => setData('estado', activa ? 'activa' : 'inactiva')}
                                        />
                                    </div>
                                </div>
                                <InputError message={errors.estado} />

                                {/* Notas Adicionales */}
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

                                {/* Botones de acción */}
                                <div className="flex gap-3 pt-4">
                                    <Button type="button" variant="outline" asChild>
                                        <Link href={route('cuentas.index')}>Cancelar</Link>
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        <Save className="mr-2 h-4 w-4" />
                                        {processing ? 'Actualizando...' : 'Actualizar Cuenta'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Panel de Información */}
                    <Card className="overflow-hidden border-l-4 border-indigo-500/30 pt-0 shadow-sm transition-shadow hover:shadow-md">
                        <CardHeader className="border-b bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <Info className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-white">Información de la Cuenta</CardTitle>
                                    <CardDescription className="text-indigo-100">Datos guardados actualmente</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <h4 className="font-medium">ID de la Cuenta</h4>
                                <p className="font-mono text-sm">#{cuenta.id}</p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium">Saldo Actual</h4>
                                <p className={cn('text-2xl font-bold', (cuenta.saldo_cuenta ?? 0) < 0 ? 'text-red-600' : 'text-emerald-600')}>
                                    {cuenta.moneda?.simbolo_moneda || '$'} {cuenta.saldo_cuenta?.toFixed(2)}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium">Moneda</h4>
                                <p className="text-sm">
                                    {cuenta.moneda?.nombre_moneda} ({cuenta.moneda?.codigo_moneda})
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium">Tipo de Activo</h4>
                                <p className="text-sm capitalize">{cuenta.tipo}</p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium">Ámbito</h4>
                                {ambitoActual ? (
                                    <span
                                        className={cn(
                                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                                            ambitoActual.valor === 'nacional'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                : 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300',
                                        )}
                                    >
                                        <ambitoActual.icono className="h-3 w-3" />
                                        {ambitoActual.nombre}
                                    </span>
                                ) : (
                                    <p className="text-muted-foreground text-sm italic">Sin clasificar</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium">Estado Actual</h4>
                                <span
                                    className={cn(
                                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                                        cuenta.estado === 'activa'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
                                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
                                    )}
                                >
                                    {cuenta.estado === 'activa' ? 'Activa' : 'Inactiva'}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

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
                                        className="pr-10 normal-case"
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
            <ScrollProgress />
            <Toaster position="top-center" />
        </AppLayout>
    );
}
