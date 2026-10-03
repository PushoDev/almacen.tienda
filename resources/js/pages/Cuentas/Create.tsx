import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { OPCIONES_AMBITO, OPCIONES_TITULAR, OpcionesEnTarjeta } from '@/components/cuentas/opciones-en-tarjeta';
import { TipoCuentaLogo, type TipoCuenta } from '@/components/cuentas/tipo-cuenta-logo';
import { SelectorBancoTarjeta, type CatalogoTarjetas } from '@/components/SelectorBancoTarjeta';
import { SelectorImagenEfectivo } from '@/components/SelectorImagenEfectivo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollProgress } from '@/components/ui/scroll';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, CreditCard, Info, Landmark, Save, Wallet } from 'lucide-react';
import { useMemo } from 'react';
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
        title: 'Nueva Cuenta',
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

interface BancoOption {
    slug: string;
    nombre: string;
}

interface CreateCuentasPageProps {
    monedas: MonedaOption[];
    catalogoTarjetas: CatalogoTarjetas;
    tiposCuenta: TipoCuenta[];
    bancos: BancoOption[];
}

export default function CreateCuentasPage({ monedas, catalogoTarjetas, bancos, tiposCuenta }: CreateCuentasPageProps) {
    const { data, setData, post, reset, errors, processing } = useForm({
        nombre_cuenta: '',
        tipo: 'tarjeta' as 'tarjeta' | 'efectivo',
        saldo_cuenta: 0.0,
        moneda_id: '',
        // Único valor válido desde que 'temporales' se unificó en 'permanentes' (migración
        // 2026-07-28) — ya no hay nada que elegir, se manda fijo.
        tipo_cuenta: 'permanentes',
        tipo_titular: '',
        estado: 'activa' as 'activa' | 'inactiva',
        notas_cuenta: '',
        imagen: null as string | null,
        tipo_banco: '',
        ambito: '',
    });

    // Banco o insignia de moneda elegidos en vivo — se usa para el efecto bleed del header.
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

    // Función para enviar el formulario
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('cuentas.store'), {
            onSuccess: () => {
                reset(); // Limpia el formulario después de enviar
                sileo.success({ title: 'Cuenta creada', description: 'La cuenta se creó correctamente' });
            },
            onError: () => {
                sileo.error({ title: 'Error al crear', description: 'Verifica los datos e inténtalo de nuevo' });
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Cuenta" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                {/* Header — sin overflow-hidden a propósito: la tarjeta elegida usa efecto
                    bleed (ver docs/patron-mascota-bleed.md Variante A), se sale del borde
                    superior en vez de quedar recortada adentro. */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Gestión de Cuentas" description="Administre las cuentas disponibles para su negocio." />
                    {data.tipo === 'efectivo' && !bancoSeleccionado ? (
                        <Landmark
                            size={70}
                            color="#d6d3d1"
                            className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                        />
                    ) : bancoSeleccionado ? (
                        <img
                            src={bancoSeleccionado.imagen_url}
                            alt=""
                            aria-hidden="true"
                            className="pointer-events-none absolute right-4 bottom-0 h-28 w-auto select-none"
                        />
                    ) : (
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
                    {/* Formulario de Creación */}
                    <Card className="overflow-hidden border-l-4 border-indigo-500/30 pt-0 shadow-sm transition-shadow hover:shadow-md lg:col-span-2">
                        <CardHeader className="border-b bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <Wallet className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-white">Nueva Cuenta</CardTitle>
                                    <CardDescription className="text-indigo-100">Completa los datos para crear la cuenta</CardDescription>
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

                                {/* Saldo Inicial y Estado */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="saldo_cuenta">Saldo Inicial</Label>
                                        <Input
                                            id="saldo_cuenta"
                                            type="number"
                                            step="0.00000001"
                                            value={data.saldo_cuenta || ''}
                                            onChange={(e) => setData('saldo_cuenta', parseFloat(e.target.value) || 0)}
                                            placeholder="0.00"
                                            className="w-full"
                                        />
                                        <InputError message={errors.saldo_cuenta} />
                                        <p className="text-muted-foreground text-sm">Puede ser cero.</p>
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
                                        {processing ? 'Creando...' : 'Crear Cuenta'}
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
                                <CardTitle className="text-white">Información Importante</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <h4 className="font-medium">Nombre de la Cuenta</h4>
                                <p className="text-muted-foreground text-sm">Debe ser único en el sistema. Se guarda en mayúsculas.</p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium">Banco o Insignia</h4>
                                <p className="text-muted-foreground text-sm">
                                    Las tarjetas llevan el diseño de su banco; las cuentas de efectivo, la insignia de su moneda. Se puede asignar
                                    después.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium">Ámbito</h4>
                                <p className="text-muted-foreground text-sm">
                                    Nacional o internacional, para tarjetas y efectivo. Si queda vacío, la cuenta aparece como sin clasificar.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium">Estado</h4>
                                <p className="text-muted-foreground text-sm">Las cuentas inactivas no estarán disponibles para transacciones.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <ScrollProgress />
            <Toaster position="top-center" />
        </AppLayout>
    );
}
