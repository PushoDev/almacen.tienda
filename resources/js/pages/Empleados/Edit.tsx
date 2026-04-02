import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { AlmacenProps, User, type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { BookUser, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
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
        role: (empleado.role || 'vendedor') as 'admin' | 'moderador' | 'vendedor',
        almacenes: empleado.almacenes?.map((almacen) => almacen.id) || [],
        cuentas: empleado.cuentas?.map((cuenta) => cuenta.id) || [],
    });
    const [showPassword, setShowPassword] = useState(false);

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
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
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
                <form onSubmit={submit} className="space-y-6">
                    <Card className="border-sidebar-border/70">
                        <CardHeader>
                            <CardTitle>Información del Empleado</CardTitle>
                            <CardDescription>Actualice datos principales y permisos de acceso.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {/* Columna 1 */}
                            <div className="space-y-4">
                                {/* Campo Nombre del Empleado */}
                                <div className="space-y-1">
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
                                <div className="space-y-1">
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
                                <div className="space-y-1">
                                    <Label htmlFor="password">Contraseña</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            placeholder="Deje en blanco si no desea cambiar la contraseña"
                                            className="pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            <span className="sr-only">{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</span>
                                        </Button>
                                    </div>
                                    <InputError message={errors.password} />
                                </div>
                            </div>

                            {/* Columna 2 */}
                            <div className="space-y-4">
                                {/* Campo Rol del Empleado */}
                                <div className="space-y-1">
                                    <Label htmlFor="role">Rol del Empleado</Label>
                                    <Select
                                        value={data.role}
                                        onValueChange={(value) => setData('role', value as 'admin' | 'moderador' | 'vendedor')}
                                    >
                                        <SelectTrigger className="border border-input">
                                            <SelectValue placeholder="Seleccione un rol" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="admin">Administrador</SelectItem>
                                            <SelectItem value="moderador">Moderador</SelectItem>
                                            <SelectItem value="vendedor">Vendedor</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.role} />
                                </div>

                                {/* Campo Almacenes Asignados (Oculto para Admin/Moderador) */}
                                {data.role !== 'admin' && data.role !== 'moderador' && (
                                    <div className="space-y-2">
                                        <Label>Almacenes Asignados</Label>
                                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                            {almacenes.map((almacen) => (
                                                <label
                                                    key={almacen.id}
                                                    htmlFor={`almacen-${almacen.id}`}
                                                    className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
                                                >
                                                    <Checkbox
                                                        id={`almacen-${almacen.id}`}
                                                        className="border border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
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
                                                    <span className="truncate">{almacen.nombre_almacen}</span>
                                                </label>
                                            ))}
                                        </div>
                                        <InputError message={errors.almacenes} />
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sección de Cuentas (Oculto para Admin/Moderador) */}
                    {data.role !== 'admin' && data.role !== 'moderador' && (
                        <Card className="border-sidebar-border/70">
                            <CardHeader>
                                <CardTitle>Cuentas Monetarias Asignadas</CardTitle>
                                <CardDescription>Asigne las cuentas que el empleado podrá gestionar.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {cuentas.length > 0 ? (
                                        cuentas.map((cuenta) => (
                                            <label
                                                key={cuenta.id}
                                                htmlFor={`cuenta-${cuenta.id}`}
                                                className="flex items-center gap-3 rounded-lg border border-input bg-background p-3 hover:bg-accent"
                                            >
                                                <Checkbox
                                                    id={`cuenta-${cuenta.id}`}
                                                    className="border border-input data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
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
                                                <div className="min-w-0">
                                                    <div className="truncate font-medium">{cuenta.nombre_cuenta}</div>
                                                    <div className="text-xs text-muted-foreground">{cuenta.tipo_moneda}</div>
                                                </div>
                                            </label>
                                        ))
                                    ) : (
                                        <div className="col-span-full text-center text-muted-foreground">No hay cuentas disponibles</div>
                                    )}
                                </div>
                                <InputError message={errors.cuentas} />
                            </CardContent>
                            <CardFooter className="justify-end">
                                <Button type="submit" disabled={processing} className="w-full md:w-auto">
                                    {processing ? 'Actualizando...' : 'Actualizar Empleado'}
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                    {data.role === 'admin' || data.role === 'moderador' ? (
                        <div className="flex justify-end">
                            <Button type="submit" disabled={processing} className="w-full md:w-auto">
                                {processing ? 'Actualizando...' : 'Actualizar Empleado'}
                            </Button>
                        </div>
                    ) : null}
                </form>
            </div>
        </AppLayout>
    );
}
