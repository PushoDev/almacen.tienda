import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { AlmacenProps, type BreadcrumbItem } from '@/types';
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
        title: 'Crear Empleado',
        href: '#',
    },
];

export default function CreateEmpleadoPage({ almacenes }: { almacenes: AlmacenProps[] }) {
    // Manejo del formulario con useForm
    const { data, setData, post, reset, errors, processing } = useForm({
        name: '',
        email: '',
        password: '',
        role: 'vendedor', // Por defecto, el rol es "vendedor"
        almacenes: [] as number[], // IDs de los almacenes seleccionados
    });

    // Función para enviar el formulario
    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        post(route('empleados.store'), {
            onSuccess: () => {
                reset(); // Limpia el formulario después de enviar
                toast.success('Empleado creado correctamente');
            },
            onError: () => {
                toast.error('Error al crear el empleado');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Empleado" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Nuevo Empleado" description="Complete los datos para agregar un nuevo empleado" />
                    {/* Ícono semitransparente */}
                    <BookUser
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Formulario de Creación */}
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
                                    placeholder="Contraseña"
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

                    {/* Botón Enviar */}
                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={processing}
                            className="w-full rounded-md bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700 md:w-auto"
                        >
                            {processing ? 'Creando...' : 'Crear Empleado'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
