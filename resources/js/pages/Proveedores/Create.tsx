import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { ListCheck } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Proveedores',
        href: '/proveedores',
    },
    {
        title: 'Nuevo Proveedor',
        href: '#',
    },
];

export default function CreateProveedoresPage() {
    // Manejo del formulario con useForm
    const { data, setData, post, reset, errors, processing } = useForm({
        nombre_proveedor: '',
        telefono_proveedor: '',
        correo_proveedor: '',
        localidad_proveedor: '',
        notas_proveedor: '',
        saldo_proveedor: 0, // Nuevo campo
    });

    // Función para enviar el formulario
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('proveedores.store'), {
            onSuccess: () => {
                reset(); // Limpia el formulario después de enviar
                toast.success('Proveedor creado correctamente');
            },
            onError: () => {
                toast.error('Error al crear el proveedor');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Proveedor" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    {/* Contenido principal */}
                    <HeadingSmall title="Crear Nuevo Proveedor" description="Complete la información del proveedor incluyendo el saldo inicial" />
                    {/* Ícono semitransparente */}
                    <ListCheck
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
                                {/* Campo Nombre del Proveedor */}
                                <div>
                                    <Label htmlFor="nombre_proveedor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Nombre del Proveedor:
                                    </Label>
                                    <Input
                                        id="nombre_proveedor"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.nombre_proveedor}
                                        onChange={(e) => setData('nombre_proveedor', e.target.value.toUpperCase())}
                                        autoComplete="nombre_proveedor"
                                        placeholder="Nombre del Proveedor"
                                        required
                                    />
                                    <InputError className="mt-2" message={errors.nombre_proveedor} />
                                </div>

                                {/* Campo Teléfono del Proveedor */}
                                <div>
                                    <Label htmlFor="telefono_proveedor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Teléfono del Proveedor:
                                    </Label>
                                    <Input
                                        id="telefono_proveedor"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.telefono_proveedor}
                                        onChange={(e) => setData('telefono_proveedor', e.target.value)}
                                        autoComplete="telefono_proveedor"
                                        placeholder="Teléfono del Proveedor"
                                        required
                                    />
                                    <InputError className="mt-2" message={errors.telefono_proveedor} />
                                </div>

                                {/* Campo Correo Electrónico */}
                                <div>
                                    <Label htmlFor="correo_proveedor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Correo Electrónico:
                                    </Label>
                                    <Input
                                        id="correo_proveedor"
                                        type="email"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.correo_proveedor}
                                        onChange={(e) => setData('correo_proveedor', e.target.value)}
                                        autoComplete="correo_proveedor"
                                        placeholder="Correo Electrónico"
                                    />
                                    <InputError className="mt-2" message={errors.correo_proveedor} />
                                </div>
                            </div>

                            {/* Columna 2 */}
                            <div className="space-y-4">
                                {/* Campo Localidad */}
                                <div>
                                    <Label htmlFor="localidad_proveedor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Localidad:
                                    </Label>
                                    <Input
                                        id="localidad_proveedor"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.localidad_proveedor}
                                        onChange={(e) => setData('localidad_proveedor', e.target.value.toUpperCase())}
                                        autoComplete="localidad_proveedor"
                                        placeholder="Localidad"
                                        required
                                    />
                                    <InputError className="mt-2" message={errors.localidad_proveedor} />
                                </div>

                                {/* Campo Saldo Inicial */}
                                <div>
                                    <Label htmlFor="saldo_proveedor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Saldo Inicial:
                                    </Label>
                                    <Input
                                        id="saldo_proveedor"
                                        type="number"
                                        step="0.01"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.saldo_proveedor || ''}
                                        onChange={(e) => setData('saldo_proveedor', parseFloat(e.target.value) || 0)}
                                        autoComplete="saldo_proveedor"
                                        placeholder="0.00"
                                    />
                                    <div className="mt-1 text-xs text-gray-500">
                                        <span
                                            className={
                                                data.saldo_proveedor < 0
                                                    ? 'text-red-600'
                                                    : data.saldo_proveedor > 0
                                                      ? 'text-green-600'
                                                      : 'text-gray-500'
                                            }
                                        >
                                            {data.saldo_proveedor < 0 ? 'Deuda' : data.saldo_proveedor > 0 ? 'Fondo' : 'Saldo balanceado'}
                                        </span>
                                        {data.saldo_proveedor !== 0 && (
                                            <span className="ml-2">
                                                {data.saldo_proveedor < 0
                                                    ? `(El proveedor nos debe ${Math.abs(data.saldo_proveedor).toFixed(2)})`
                                                    : `(Nosotros le debemos ${data.saldo_proveedor.toFixed(2)})`}
                                            </span>
                                        )}
                                    </div>
                                    <InputError className="mt-2" message={errors.saldo_proveedor} />
                                </div>

                                {/* Campo Notas Adicionales */}
                                <div>
                                    <Label htmlFor="notas_proveedor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Notas Adicionales:
                                    </Label>
                                    <Textarea
                                        id="notas_proveedor"
                                        className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.notas_proveedor}
                                        onChange={(e) => setData('notas_proveedor', e.target.value.toUpperCase())}
                                        autoComplete="notas_proveedor"
                                        placeholder="Notas adicionales sobre el proveedor"
                                        rows={3}
                                    />
                                    <InputError className="mt-2" message={errors.notas_proveedor} />
                                </div>
                            </div>
                        </div>

                        {/* Información del saldo */}
                        <div className="rounded-md bg-blue-50 p-4 dark:bg-blue-900/20">
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                                <strong>Nota sobre el saldo:</strong>
                                <ul className="mt-1 list-disc space-y-1 pl-5">
                                    <li>
                                        <span className="text-red-600">Saldo negativo</span>: El proveedor nos debe dinero (deuda)
                                    </li>
                                    <li>
                                        <span className="text-green-600">Saldo positivo</span>: Nosotros le debemos al proveedor (fondo)
                                    </li>
                                    <li>
                                        <span className="text-gray-600">Saldo cero</span>: Sin deudas ni fondos
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Botón Enviar */}
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 md:w-auto"
                            >
                                {processing ? 'Creando...' : 'Crear Proveedor'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
