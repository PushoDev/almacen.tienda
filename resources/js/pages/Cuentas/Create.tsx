import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { SelectorBancoTarjeta, type CatalogoTarjetas } from '@/components/SelectorBancoTarjeta';
import { SelectorImagenEfectivo } from '@/components/SelectorImagenEfectivo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { CreditCard, HandCoins, Landmark } from 'lucide-react';
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
}

interface BancoOption {
    slug: string;
    nombre: string;
}

interface CreateCuentasPageProps {
    monedas: MonedaOption[];
    catalogoTarjetas: CatalogoTarjetas;
    bancos: BancoOption[];
}

export default function CreateCuentasPage({ monedas, catalogoTarjetas, bancos }: CreateCuentasPageProps) {
    const { data, setData, post, reset, errors, processing } = useForm({
        nombre_cuenta: '',
        tipo: 'tarjeta' as 'tarjeta' | 'efectivo',
        saldo_cuenta: 0.0,
        moneda_id: '',
        tipo_cuenta: 'permanentes' as 'permanentes' | 'temporales',
        tipo_titular: '',
        estado: 'activa' as 'activa' | 'inactiva',
        notas_cuenta: '',
        imagen: null as string | null,
        tipo_banco: '',
    });

    // Banco o insignia de moneda elegidos en vivo — se usa para el efecto bleed del header.
    const bancoSeleccionado = useMemo(() => {
        const todos = [...catalogoTarjetas.interna, ...catalogoTarjetas.externa, ...catalogoTarjetas.efectivo];
        return todos.find((b) => b.slug === data.imagen) ?? null;
    }, [catalogoTarjetas, data.imagen]);

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

                {/* Formulario de Creación */}
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
                                            onValueChange={(value: 'tarjeta' | 'efectivo') => {
                                                setData('tipo', value);
                                                // El catálogo de imagen es distinto por tipo (banco vs. moneda) — una
                                                // imagen elegida para el tipo anterior no aplica al nuevo.
                                                setData('imagen', null);
                                                // tipo_banco tampoco aplica a efectivo (hace función de caja, no es un banco).
                                                setData('tipo_banco', '');
                                            }}
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

                                    {/* Campo Banco / Diseño de tarjeta — solo aplica cuando tipo=tarjeta */}
                                    {data.tipo === 'tarjeta' && (
                                        <div className="space-y-2">
                                            <Label>Banco / Diseño de tarjeta</Label>
                                            <SelectorBancoTarjeta
                                                catalogo={catalogoTarjetas}
                                                value={data.imagen}
                                                onChange={(slug) => setData('imagen', slug)}
                                            />
                                            <InputError message={errors.imagen} />
                                        </div>
                                    )}

                                    {/* Campo Tipo de Banco — clasificación para uso futuro (restringir vendedores
                                        por banco en Ventas), independiente del diseño elegido arriba. No aplica a
                                        efectivo (hace función de caja, no es un banco). Las opciones vienen del
                                        mismo catálogo de bancos/tarjetas, así que crecen solas al agregar uno nuevo. */}
                                    {data.tipo === 'tarjeta' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="tipo_banco">Tipo de Banco</Label>
                                            <Select value={data.tipo_banco} onValueChange={(value) => setData('tipo_banco', value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccione el banco" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {bancos.map((banco) => (
                                                        <SelectItem key={banco.slug} value={banco.slug}>
                                                            {banco.nombre}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.tipo_banco} />
                                        </div>
                                    )}

                                    {/* Campo Insignia de Moneda — solo aplica cuando tipo=efectivo */}
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

                                    {/* Campo Saldo de la Cuenta */}
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

                            {/* Información Adicional */}
                            <Card className="bg-muted/50">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Información Importante</CardTitle>
                                    <CardDescription>Revise que todos los datos sean correctos antes de crear la cuenta.</CardDescription>
                                </CardHeader>
                                <CardContent className="text-muted-foreground text-sm">
                                    <ul className="list-disc space-y-1 pl-4">
                                        <li>El nombre de la cuenta debe ser único en el sistema</li>
                                        <li>El saldo inicial puede ser cero</li>
                                        <li>Las cuentas inactivas no estarán disponibles para transacciones</li>
                                        <li>El tipo de cuenta determina el comportamiento financiero</li>
                                    </ul>
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
                                            Creando...
                                        </>
                                    ) : (
                                        <>
                                            <HandCoins className="mr-2 h-4 w-4" />
                                            Crear Cuenta
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
            <Toaster position="top-center" />
        </AppLayout>
    );
}
