import type { TipoCuenta } from '@/components/cuentas/tipo-cuenta-logo';
import { AccesoGlobalCard } from '@/components/empleados/acceso-global-card';
import { AsignacionesCard } from '@/components/empleados/asignaciones-card';
import type { CuentaAsignada, CuentaDisponible } from '@/components/empleados/tipos';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster } from '@/components/ui/sileo-toaster';
import AppLayout from '@/layouts/app-layout';
import { sileo } from '@/lib/sileo';
import { AlmacenProps, type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { BookUser, Eye, EyeOff, UserCog } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Empleados', href: '/empleados' },
    { title: 'Crear Empleado', href: '#' },
];

export default function CreateEmpleadoPage({
    almacenes,
    cuentas,
    tiposCuenta,
}: {
    almacenes: AlmacenProps[];
    cuentas: CuentaDisponible[];
    tiposCuenta: TipoCuenta[];
}) {
    const { data, setData, post, reset, errors, processing } = useForm({
        name: '',
        email: '',
        password: '',
        role: 'vendedor' as 'admin' | 'moderador' | 'vendedor',
        almacenes: [] as number[],
        cuentas: [] as CuentaAsignada[],
    });
    const [showPassword, setShowPassword] = useState(false);

    const cuentasError = Object.entries(errors).find(([clave]) => clave === 'cuentas' || clave.startsWith('cuentas.'))?.[1];

    const isVendedor = data.role !== 'admin' && data.role !== 'moderador';

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('empleados.store'), {
            onSuccess: () => {
                reset();
                sileo.success({ title: 'Empleado creado', description: 'El empleado se creó correctamente' });
            },
            onError: () => {
                sileo.error({ title: 'Error al crear', description: 'No se pudo crear el empleado' });
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Empleado" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Nuevo Empleado" description="Complete los datos para agregar un nuevo empleado" />
                    <BookUser
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <form onSubmit={submit} className="space-y-6">
                    <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                        <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                    <UserCog className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-white">Información del Empleado</CardTitle>
                                    <CardDescription className="text-blue-100">Datos principales y permisos de acceso.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-4">
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

                                <div className="space-y-1">
                                    <Label htmlFor="password">Contraseña</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            placeholder="Contraseña"
                                            className="pr-10 normal-case"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            <span className="sr-only">{showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}</span>
                                        </Button>
                                    </div>
                                    <InputError message={errors.password} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <Label htmlFor="role">Rol del Empleado</Label>
                                    <Select value={data.role} onValueChange={(value) => setData('role', value as 'admin' | 'moderador' | 'vendedor')}>
                                        <SelectTrigger>
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
                            </div>
                        </CardContent>
                    </Card>

                    {!isVendedor && <AccesoGlobalCard almacenes={almacenes} cuentas={cuentas} tiposCuenta={tiposCuenta} />}

                    {isVendedor && (
                        <>
                            <AsignacionesCard
                                almacenes={almacenes}
                                almacenesSeleccionados={data.almacenes}
                                onAlmacenesChange={(ids) => setData('almacenes', ids)}
                                almacenesError={errors.almacenes}
                                cuentas={cuentas}
                                tiposCuenta={tiposCuenta}
                                cuentasAsignadas={data.cuentas}
                                onCuentasChange={(asignadas) => setData('cuentas', asignadas)}
                                cuentasError={cuentasError}
                            />
                        </>
                    )}

                    <div className="flex justify-end">
                        <Button type="submit" disabled={processing} size="lg">
                            {processing ? 'Creando...' : 'Crear Empleado'}
                        </Button>
                    </div>
                </form>
            </div>
            <Toaster position="top-center" />
        </AppLayout>
    );
}
