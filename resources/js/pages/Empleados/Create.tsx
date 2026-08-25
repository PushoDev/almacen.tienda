import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { AlmacenProps, type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { BookUser, Eye, EyeOff, Search, Store, University, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { sileo } from '@/lib/sileo';
import { Toaster } from '@/components/ui/sileo-toaster';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Empleados', href: '/empleados' },
    { title: 'Crear Empleado', href: '#' },
];

interface CuentaProps {
    id: number;
    nombre_cuenta: string;
    tipo_moneda: string;
}

export default function CreateEmpleadoPage({ almacenes, cuentas }: { almacenes: AlmacenProps[]; cuentas: CuentaProps[] }) {
    const { data, setData, post, reset, errors, processing } = useForm({
        name: '',
        email: '',
        password: '',
        role: 'vendedor' as 'admin' | 'moderador' | 'vendedor',
        almacenes: [] as number[],
        cuentas: [] as number[],
    });
    const [showPassword, setShowPassword] = useState(false);
    const [searchAlmacen, setSearchAlmacen] = useState('');
    const [searchCuenta, setSearchCuenta] = useState('');

    const isVendedor = data.role !== 'admin' && data.role !== 'moderador';

    const filteredAlmacenes = useMemo(
        () =>
            almacenes.filter((a) => a.nombre_almacen.toLowerCase().includes(searchAlmacen.toLowerCase())),
        [almacenes, searchAlmacen],
    );

    const filteredCuentas = useMemo(
        () =>
            cuentas.filter(
                (c) =>
                    c.nombre_cuenta.toLowerCase().includes(searchCuenta.toLowerCase()) ||
                    c.tipo_moneda.toLowerCase().includes(searchCuenta.toLowerCase()),
            ),
        [cuentas, searchCuenta],
    );

    const allAlmacenesFilteredSelected = useMemo(
        () => filteredAlmacenes.length > 0 && filteredAlmacenes.every((a) => data.almacenes.includes(a.id)),
        [filteredAlmacenes, data.almacenes],
    );

    const allCuentasFilteredSelected = useMemo(
        () => filteredCuentas.length > 0 && filteredCuentas.every((c) => data.cuentas.includes(c.id)),
        [filteredCuentas, data.cuentas],
    );

    const toggleSelectAllAlmacenes = () => {
        if (allAlmacenesFilteredSelected) {
            setData('almacenes', data.almacenes.filter((id) => !filteredAlmacenes.some((a) => a.id === id)));
        } else {
            const current = new Set(data.almacenes);
            filteredAlmacenes.forEach((a) => current.add(a.id));
            setData('almacenes', Array.from(current));
        }
    };

    const toggleSelectAllCuentas = () => {
        if (allCuentasFilteredSelected) {
            setData('cuentas', data.cuentas.filter((id) => !filteredCuentas.some((c) => c.id === id)));
        } else {
            const current = new Set(data.cuentas);
            filteredCuentas.forEach((c) => current.add(c.id));
            setData('cuentas', Array.from(current));
        }
    };

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
                    <Card>
                        <CardHeader>
                            <CardTitle>Información del Empleado</CardTitle>
                            <CardDescription>Datos principales y permisos de acceso.</CardDescription>
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

                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <Label htmlFor="role">Rol del Empleado</Label>
                                    <Select
                                        value={data.role}
                                        onValueChange={(value) => setData('role', value as 'admin' | 'moderador' | 'vendedor')}
                                    >
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

                                {!isVendedor && (
                                    <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                                        Los administradores y moderadores tienen acceso global. No requieren asignación de almacenes ni cuentas.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {isVendedor && (
                        <>
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Almacenes Asignados</CardTitle>
                                            <CardDescription>
                                                Seleccione los almacenes que el empleado podrá gestionar.
                                            </CardDescription>
                                        </div>
                                        <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                                            {data.almacenes.length}/{almacenes.length}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar almacén por nombre..."
                                            value={searchAlmacen}
                                            onChange={(e) => setSearchAlmacen(e.target.value)}
                                            className="pl-8 pr-8"
                                        />
                                        {searchAlmacen && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setSearchAlmacen('')}
                                                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                                            >
                                                <X size={14} />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            {filteredAlmacenes.length === almacenes.length
                                                ? 'Mostrando todos los almacenes'
                                                : `Mostrando ${filteredAlmacenes.length} de ${almacenes.length}`}
                                        </span>
                                        {filteredAlmacenes.length > 0 && (
                                            <Button type="button" variant="outline" size="sm" onClick={toggleSelectAllAlmacenes}>
                                                {allAlmacenesFilteredSelected ? 'Desmarcar todos' : 'Marcar todos'}
                                            </Button>
                                        )}
                                    </div>

                                    <Separator />

                                    <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
                                        {filteredAlmacenes.length > 0 ? (
                                            filteredAlmacenes.map((almacen) => (
                                                <label
                                                    key={almacen.id}
                                                    htmlFor={`almacen-${almacen.id}`}
                                                    className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
                                                >
                                                    <Checkbox
                                                        id={`almacen-${almacen.id}`}
                                                        checked={data.almacenes.includes(almacen.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setData('almacenes', [...data.almacenes, almacen.id]);
                                                            } else {
                                                                setData('almacenes', data.almacenes.filter((id) => id !== almacen.id));
                                                            }
                                                        }}
                                                    />
                                                    <Store size={16} className="shrink-0 text-muted-foreground" />
                                                    <span className="truncate">{almacen.nombre_almacen}</span>
                                                </label>
                                            ))
                                        ) : (
                                            <p className="py-8 text-center text-sm text-muted-foreground">
                                                {searchAlmacen
                                                    ? 'No hay almacenes que coincidan con la búsqueda'
                                                    : 'No hay almacenes disponibles'}
                                            </p>
                                        )}
                                    </div>
                                    <InputError message={errors.almacenes} />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>Cuentas Monetarias Asignadas</CardTitle>
                                            <CardDescription>
                                                Seleccione las cuentas que el empleado podrá gestionar.
                                            </CardDescription>
                                        </div>
                                        <span className="shrink-0 rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                                            {data.cuentas.length}/{cuentas.length}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar cuenta por nombre o moneda..."
                                            value={searchCuenta}
                                            onChange={(e) => setSearchCuenta(e.target.value)}
                                            className="pl-8 pr-8"
                                        />
                                        {searchCuenta && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setSearchCuenta('')}
                                                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                                            >
                                                <X size={14} />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            {filteredCuentas.length === cuentas.length
                                                ? 'Mostrando todas las cuentas'
                                                : `Mostrando ${filteredCuentas.length} de ${cuentas.length}`}
                                        </span>
                                        {filteredCuentas.length > 0 && (
                                            <Button type="button" variant="outline" size="sm" onClick={toggleSelectAllCuentas}>
                                                {allCuentasFilteredSelected ? 'Desmarcar todas' : 'Marcar todas'}
                                            </Button>
                                        )}
                                    </div>

                                    <Separator />

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                                        {filteredCuentas.length > 0 ? (
                                            filteredCuentas.map((cuenta) => (
                                                <label
                                                    key={cuenta.id}
                                                    htmlFor={`cuenta-${cuenta.id}`}
                                                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
                                                >
                                                    <Checkbox
                                                        id={`cuenta-${cuenta.id}`}
                                                        checked={data.cuentas.includes(cuenta.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setData('cuentas', [...data.cuentas, cuenta.id]);
                                                            } else {
                                                                setData('cuentas', data.cuentas.filter((id) => id !== cuenta.id));
                                                            }
                                                        }}
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <University size={14} className="shrink-0 text-muted-foreground" />
                                                            <span className="truncate text-sm font-medium">{cuenta.nombre_cuenta}</span>
                                                        </div>
                                                        <div className="ml-6 text-xs text-muted-foreground">{cuenta.tipo_moneda}</div>
                                                    </div>
                                                </label>
                                            ))
                                        ) : (
                                            <div className="col-span-full py-12 text-center text-muted-foreground">
                                                <University size={32} className="mx-auto mb-2 opacity-30" />
                                                <p className="text-sm">
                                                    {searchCuenta
                                                        ? 'No hay cuentas que coincidan con la búsqueda'
                                                        : 'No hay cuentas disponibles'}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <InputError message={errors.cuentas} />
                                </CardContent>
                            </Card>
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
