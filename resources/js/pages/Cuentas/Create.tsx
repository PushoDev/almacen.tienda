import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { HandCoins } from 'lucide-react';
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
        title: 'Nueva Cuenta',
        href: '#',
    },
];

export default function CreateCuentasPage() {
    // Manejo del formulario con useForm
    const { data, setData, post, reset, errors, processing } = useForm({
        nombre_cuenta: '',
        saldo_cuenta: 0.0, // Valor por defecto
        deuda: 0, // Valor por defecto
        tipo_cuenta: 'permanentes', // Valor por defecto
        tipo_moneda: 'USD', // Valor por defecto
        notas_cuenta: '',
    });

    // Función para enviar el formulario
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('cuentas.store'), {
            onSuccess: () => {
                reset(); // Limpia el formulario después de enviar
                toast.success('Cuenta creada correctamente');
            },
            onError: () => {
                toast.error('Error al crear la cuenta. Por favor, verifica los datos.');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Cuenta" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Gestión de Cuentas" description="Cree una nueva cuenta para gestionar sus finanzas." />
                    <HandCoins
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Formulario de Creación */}
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
                                        onChange={(e) => setData('nombre_cuenta', e.target.value.toUpperCase())}
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
                                        step="0.00000001" // Para manejar decimales con precisión
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.saldo_cuenta || ''}
                                        onChange={(e) => setData('saldo_cuenta', parseFloat(e.target.value))}
                                        autoComplete="saldo_cuenta"
                                        placeholder="$ 0.00"
                                    />
                                    <InputError className="mt-2" message={errors.saldo_cuenta} />
                                </div>

                                {/* Campo Deuda */}
                            </div>

                            {/* Columna 2 */}
                            <div className="space-y-4">
                                {/* Campo Tipo de Moneda */}
                                <div>
                                    <Label htmlFor="tipo_moneda" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Tipo de Moneda:
                                    </Label>
                                    <Select
                                        value={data.tipo_moneda}
                                        onValueChange={(value) => setData('tipo_moneda', value as 'USD' | 'EUR' | 'MLC' | 'CUP')}
                                    >
                                        <SelectTrigger className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                                            <SelectValue placeholder="Seleccione una moneda" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USD">Dólar Estadounidense (USD)</SelectItem>
                                            <SelectItem value="EUR">Euro (EUR)</SelectItem>
                                            <SelectItem value="MLC">Moneda Libremente Convertible (MLC)</SelectItem>
                                            <SelectItem value="CUP">Peso Cubano (CUP)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError className="mt-2" message={errors.tipo_moneda} />
                                </div>

                                {/* Campo Tipo de Cuenta */}
                                <div>
                                    <Label htmlFor="tipo_cuenta" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Tipo de Cuenta:
                                    </Label>
                                    <Select
                                        value={data.tipo_cuenta}
                                        onValueChange={(value) => setData('tipo_cuenta', value as 'permanentes' | 'temporales')}
                                    >
                                        <SelectTrigger className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                                            <SelectValue placeholder="Seleccione un tipo de cuenta" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="permanentes">Permanente</SelectItem>
                                            <SelectItem value="temporales">Temporal</SelectItem>
                                        </SelectContent>
                                    </Select>
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
                                        onChange={(e) => setData('notas_cuenta', e.target.value.toUpperCase())}
                                        autoComplete="notas_cuenta"
                                        placeholder="Notas adicionales sobre la cuenta"
                                    />
                                    <InputError className="mt-2" message={errors.notas_cuenta} />
                                </div>
                            </div>
                        </div>

                        {/* Botón Enviar */}
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 md:w-auto"
                            >
                                {processing ? 'Creando...' : 'Crear Cuenta'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
