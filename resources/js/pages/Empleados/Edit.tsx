import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { AlmacenProps, User, type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { BookUser } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Empleados',
        href: '/empleados',
    },
    {
        title: 'Editar Empleado',
        href: '#',
    },
];

interface CuentaProps {
    id: number;
    nombre_cuenta: string;
    tipo_moneda: string;
}

export default function EditEmpleadoPage({ empleado, almacenes, cuentas }: { empleado: User; almacenes: AlmacenProps[]; cuentas: CuentaProps[] }) {
    // Manejo del formulario con useForm
    const { data, setData, put, errors, processing } = useForm({
        name: empleado.name,
        email: empleado.email,
        password: '',
        role: empleado.role || 'vendedor',
        almacenes: empleado.almacenes?.map((almacen) => almacen.id) || [],
        cuentas: empleado.cuentas?.map((cuenta) => cuenta.id) || [],
    });

    // Función para enviar el formulario
    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        put(route('empleados.update', { id: empleado.id }), {
            onSuccess: () => {
                toast.success('Empleado actualizado correctamente');
            },
            onError: () => {
                toast.error('Error al actualizar el empleado');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Empleado" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Editar Empleado" description="Modifique los datos del empleado seleccionado" />
                    {/* Ícono semitransparente */}
                    <BookUser
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Formulario de Edición */}
                <form onSubmit={submit} className="space-y-6 p-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* Columna 1 */}
                        <div className="space-y-4">
                            {/* Campo Nombre del Empleado */}
                            <div>
                                <Label htmlFor="name">Nombre del Empleado</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="Nombre del Empleado"
                                />
                                <InputError message={errors.name} />
                            </div>

                            {/* Campo Email del Empleado */}
                            <div>
                                <Label htmlFor="email">Email del Empleado</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="Email del Empleado"
                                />
                                <InputError message={errors.email} />
                            </div>

                            {/* Campo Contraseña del Empleado */}
                            <div>
                                <Label htmlFor="password">Contraseña</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="Deje en blanco si no desea cambiar la contraseña"
                                />
                                <InputError message={errors.password} />
                            </div>
                        </div>

                        {/* Columna 2 */}
                        <div className="space-y-4">
                            {/* Campo Rol del Empleado */}
                            <div>
                                <Label htmlFor="role">Rol del Empleado</Label>
                                <Select value={data.role} onValueChange={(value) => setData('role', value as 'admin' | 'vendedor')}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione un rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="admin">Administrador</SelectItem>
                                        <SelectItem value="vendedor">Vendedor</SelectItem>
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.role} />
                            </div>

                            {/* Campo Almacenes Asignados */}
                            <div>
                                <Label>Almacenes Asignados</Label>
                                <div className="mt-2 space-y-2">
                                    {almacenes.map((almacen) => (
                                        <div key={almacen.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`almacen-${almacen.id}`}
                                                checked={data.almacenes.includes(almacen.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setData('almacenes', [...data.almacenes, almacen.id]);
                                                    } else {
                                                        setData(
                                                            'almacenes',
                                                            data.almacenes.filter((id) => id !== almacen.id),
                                                        );
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={`almacen-${almacen.id}`}>{almacen.nombre_almacen}</Label>
                                        </div>
                                    ))}
                                </div>
                                <InputError message={errors.almacenes} />
                            </div>
                        </div>
                    </div>

                    {/* Sección de Cuentas */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="mb-4 text-lg font-semibold">Cuentas Monetarias Asignadas</h3>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {cuentas.length > 0 ? (
                                cuentas.map((cuenta) => (
                                    <div key={cuenta.id} className="flex items-center space-x-2 rounded-lg border border-gray-200 p-3">
                                        <Checkbox
                                            id={`cuenta-${cuenta.id}`}
                                            checked={data.cuentas.includes(cuenta.id)}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    setData('cuentas', [...data.cuentas, cuenta.id]);
                                                } else {
                                                    setData(
                                                        'cuentas',
                                                        data.cuentas.filter((id) => id !== cuenta.id),
                                                    );
                                                }
                                            }}
                                        />
                                        <Label htmlFor={`cuenta-${cuenta.id}`} className="flex-1 cursor-pointer">
                                            <div>
                                                <div className="font-medium">{cuenta.nombre_cuenta}</div>
                                                <div className="text-sm text-gray-500">{cuenta.tipo_moneda}</div>
                                            </div>
                                        </Label>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center text-gray-500">No hay cuentas disponibles</div>
                            )}
                        </div>
                        <InputError message={errors.cuentas} />
                    </div>

                    {/* Botón Enviar */}
                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={processing}
                            className="w-full rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 md:w-auto"
                        >
                            {processing ? 'Actualizando...' : 'Actualizar Empleado'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
