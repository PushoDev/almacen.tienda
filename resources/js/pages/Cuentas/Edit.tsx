import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { CuentaProps, type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Banknote } from 'lucide-react';
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

export default function EditarCuentasPage({ cuenta }: { cuenta: CuentaProps }) {
    // Manejo del formulario con useForm
    const { data, setData, put, errors, processing } = useForm({
        nombre_cuenta: cuenta.nombre_cuenta,
        saldo_cuenta: cuenta.saldo_cuenta ?? 123.4567,
        deuda: cuenta.deuda,
        tipo_cuenta: cuenta.tipo_cuenta,
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
                toast.error('Error al actualizar la cuenta');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Cuenta" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento"
                    />
                    {/* Ícono semitransparente */}
                    <Banknote
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Formulario de Edición */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <form onSubmit={submit} className="space-y-6 p-6">
                        {/* Contenedor de dos columnas */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* Columna 1 */}
                            <div className="space-y-4">
                                {/* Campo Nombre de la Cuenta */}
                                <div>
                                    <Label htmlFor="nombre_cuenta" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Nombre de la Cuenta:
                                    </Label>
                                    <Input
                                        id="nombre_cuenta"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.nombre_cuenta}
                                        onChange={(e) => setData('nombre_cuenta', e.target.value)}
                                        autoComplete="nombre_cuenta"
                                        placeholder="Nombre de la Cuenta"
                                    />
                                    <InputError className="mt-2" message={errors.nombre_cuenta} />
                                </div>

                                {/* Campo Saldo de la Cuenta */}
                                <div>
                                    <Label htmlFor="saldo_cuenta" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Saldo de la Cuenta:
                                    </Label>
                                    <Input
                                        id="saldo_cuenta"
                                        type="number"
                                        step="0.00000001"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.saldo_cuenta}
                                        onChange={(e) => setData('saldo_cuenta', parseFloat(e.target.value))}
                                        autoComplete="saldo_cuenta"
                                        placeholder="Saldo de la Cuenta"
                                    />
                                    <InputError className="mt-2" message={errors.saldo_cuenta} />
                                </div>

                                {/* Campo Deuda */}
                                <div>
                                    <Label htmlFor="deuda" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Deuda:
                                    </Label>
                                    <Input
                                        id="deuda"
                                        type="number"
                                        step="0.00000001"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.deuda}
                                        onChange={(e) => setData('deuda', parseFloat(e.target.value))}
                                        autoComplete="deuda"
                                        placeholder="Deuda"
                                    />
                                    <InputError className="mt-2" message={errors.deuda} />
                                </div>
                            </div>

                            {/* Columna 2 */}
                            <div className="space-y-4">
                                {/* Campo Tipo de Cuenta */}
                                <div>
                                    <Label htmlFor="tipo_cuenta" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Tipo de Cuenta:
                                    </Label>
                                    <select
                                        id="tipo_cuenta"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.tipo_cuenta}
                                        onChange={(e) => setData('tipo_cuenta', e.target.value as 'permanentes' | 'temporales')}
                                    >
                                        <option value="permanentes">Permanente</option>
                                        <option value="temporales">Temporal</option>
                                    </select>
                                    <InputError className="mt-2" message={errors.tipo_cuenta} />
                                </div>

                                {/* Campo Notas Adicionales */}
                                <div>
                                    <Label htmlFor="notas_cuenta" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Notas Adicionales:
                                    </Label>
                                    <Textarea
                                        id="notas_cuenta"
                                        className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.notas_cuenta}
                                        onChange={(e) => setData('notas_cuenta', e.target.value)}
                                        autoComplete="notas_cuenta"
                                        placeholder="Notas adicionales sobre la cuenta"
                                    />
                                    <InputError className="mt-2" message={errors.notas_cuenta} />
                                </div>
                            </div>
                        </div>

                        {/* Botón Actualizar */}
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white transition duration-300 ease-in-out hover:bg-indigo-700 md:w-auto"
                            >
                                {processing ? 'Actualizando...' : 'Actualizar Cuenta'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
