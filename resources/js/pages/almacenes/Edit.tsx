import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { AlmacenProps, type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { Building, IdCard, Mail, MapPin, Phone, User, Warehouse } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Almacenes',
        href: '/almacenes',
    },
    {
        title: 'Editar Almacén',
        href: '#',
    },
];

export default function EditarAlmacenesPage({ almacen }: { almacen: AlmacenProps }) {
    // Manejo del formulario con useForm - incluyendo todos los campos
    const { data, setData, put, errors, processing } = useForm({
        // Datos del almacén
        nombre_almacen: almacen.nombre_almacen,
        telefono_almacen: almacen.telefono_almacen,
        correo_almacen: almacen.correo_almacen || '',
        provincia_almacen: almacen.provincia_almacen || '',
        ciudad_almacen: almacen.ciudad_almacen || '',
        notas_almacen: almacen.notas_almacen || '',
        tipo_almacen: almacen.tipo_almacen || 'punto_venta',

        // Nuevos campos del responsable
        nombre_responsable: almacen.nombre_responsable || '',
        apellido_responsable: almacen.apellido_responsable || '',
        carnet_responsable: almacen.carnet_responsable || '',
        telefono_responsable: almacen.telefono_responsable || '',
    });

    // Función para enviar el formulario
    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('almacenes.update', { almacen: almacen.id }), {
            onSuccess: () => {
                toast.success('Almacén actualizado correctamente');
            },
            onError: () => {
                toast.error('Error al actualizar el almacén');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Almacén" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title={`Editar: ${almacen.nombre_almacen}`}
                        description="Actualice la información del local y del responsable según sea necesario"
                    />
                    <Warehouse
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                {/* Formulario de Edición */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <form onSubmit={submit} className="space-y-6 p-6">
                        {/* Sección: Información del Local */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Building className="h-5 w-5" />
                                    Información del Local
                                </CardTitle>
                                <CardDescription>Datos básicos del almacén, punto de venta o vehículo</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {/* Columna 1 */}
                                    <div className="space-y-4">
                                        {/* Campo Nombre del Almacén */}
                                        <div className="space-y-2">
                                            <Label htmlFor="nombre_almacen">Nombre del Almacén *</Label>
                                            <Input
                                                id="nombre_almacen"
                                                value={data.nombre_almacen}
                                                onChange={(e) => setData('nombre_almacen', e.target.value.toUpperCase())}
                                                autoComplete="nombre_almacen"
                                                placeholder="Ej: ALMACÉN CENTRAL"
                                                required
                                            />
                                            <InputError message={errors.nombre_almacen} />
                                        </div>

                                        {/* Campo Tipo de Almacén */}
                                        <div className="space-y-2">
                                            <Label htmlFor="tipo_almacen">Tipo de Almacén *</Label>
                                            <Select value={data.tipo_almacen} onValueChange={(value) => setData('tipo_almacen', value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccione un tipo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="almacen">Almacén</SelectItem>
                                                    <SelectItem value="punto_venta">Punto de Venta</SelectItem>
                                                    <SelectItem value="transportacion">Transportación</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.tipo_almacen} />
                                        </div>

                                        {/* Campo Teléfono del Almacén */}
                                        <div className="space-y-2">
                                            <Label htmlFor="telefono_almacen">Teléfono del Local *</Label>
                                            <div className="flex items-center gap-2">
                                                <Phone className="text-muted-foreground h-4 w-4" />
                                                <Input
                                                    id="telefono_almacen"
                                                    value={data.telefono_almacen}
                                                    onChange={(e) => setData('telefono_almacen', e.target.value)}
                                                    autoComplete="telefono_almacen"
                                                    placeholder="Ej: 777-123456"
                                                    required
                                                />
                                            </div>
                                            <InputError message={errors.telefono_almacen} />
                                        </div>
                                    </div>

                                    {/* Columna 2 */}
                                    <div className="space-y-4">
                                        {/* Campo Correo del Almacén */}
                                        <div className="space-y-2">
                                            <Label htmlFor="correo_almacen">Correo Electrónico</Label>
                                            <div className="flex items-center gap-2">
                                                <Mail className="text-muted-foreground h-4 w-4" />
                                                <Input
                                                    id="correo_almacen"
                                                    type="email"
                                                    value={data.correo_almacen}
                                                    onChange={(e) => setData('correo_almacen', e.target.value)}
                                                    autoComplete="correo_almacen"
                                                    placeholder="ejemplo@empresa.com"
                                                />
                                            </div>
                                            <InputError message={errors.correo_almacen} />
                                        </div>

                                        {/* Campo Provincia del Almacén */}
                                        <div className="space-y-2">
                                            <Label htmlFor="provincia_almacen">Provincia</Label>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="text-muted-foreground h-4 w-4" />
                                                <Input
                                                    id="provincia_almacen"
                                                    value={data.provincia_almacen}
                                                    onChange={(e) => setData('provincia_almacen', e.target.value.toUpperCase())}
                                                    autoComplete="provincia_almacen"
                                                    placeholder="Ej: SANTA CRUZ"
                                                />
                                            </div>
                                            <InputError message={errors.provincia_almacen} />
                                        </div>

                                        {/* Campo Ciudad del Almacén */}
                                        <div className="space-y-2">
                                            <Label htmlFor="ciudad_almacen">Ciudad</Label>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="text-muted-foreground h-4 w-4" />
                                                <Input
                                                    id="ciudad_almacen"
                                                    value={data.ciudad_almacen}
                                                    onChange={(e) => setData('ciudad_almacen', e.target.value.toUpperCase())}
                                                    autoComplete="ciudad_almacen"
                                                    placeholder="Ej: SANTA CRUZ DE LA SIERRA"
                                                />
                                            </div>
                                            <InputError message={errors.ciudad_almacen} />
                                        </div>
                                    </div>
                                </div>

                                {/* Campo Notas - Ocupa todo el ancho */}
                                <div className="mt-4 space-y-2">
                                    <Label htmlFor="notas_almacen">Notas Adicionales</Label>
                                    <Textarea
                                        id="notas_almacen"
                                        value={data.notas_almacen}
                                        onChange={(e) => setData('notas_almacen', e.target.value)}
                                        autoComplete="notas_almacen"
                                        placeholder="Información adicional sobre el local..."
                                        className="min-h-[80px]"
                                    />
                                    <InputError message={errors.notas_almacen} />
                                </div>
                            </CardContent>
                        </Card>

                        <Separator />

                        {/* Sección: Información del Responsable */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Información del Responsable
                                </CardTitle>
                                <CardDescription>Datos de la persona a cargo del local</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                    {/* Columna 1 */}
                                    <div className="space-y-4">
                                        {/* Campo Nombre del Responsable */}
                                        <div className="space-y-2">
                                            <Label htmlFor="nombre_responsable">Nombre del Responsable</Label>
                                            <div className="flex items-center gap-2">
                                                <User className="text-muted-foreground h-4 w-4" />
                                                <Input
                                                    id="nombre_responsable"
                                                    value={data.nombre_responsable}
                                                    onChange={(e) => setData('nombre_responsable', e.target.value.toUpperCase())}
                                                    autoComplete="nombre_responsable"
                                                    placeholder="Ej: MARÍA"
                                                />
                                            </div>
                                            <InputError message={errors.nombre_responsable} />
                                        </div>

                                        {/* Campo Carnet del Responsable */}
                                        <div className="space-y-2">
                                            <Label htmlFor="carnet_responsable">Número de Carnet</Label>
                                            <div className="flex items-center gap-2">
                                                <IdCard className="text-muted-foreground h-4 w-4" />
                                                <Input
                                                    id="carnet_responsable"
                                                    value={data.carnet_responsable}
                                                    onChange={(e) => setData('carnet_responsable', e.target.value.toUpperCase())}
                                                    autoComplete="carnet_responsable"
                                                    placeholder="Ej: 1234567 LP"
                                                />
                                            </div>
                                            <InputError message={errors.carnet_responsable} />
                                        </div>
                                    </div>

                                    {/* Columna 2 */}
                                    <div className="space-y-4">
                                        {/* Campo Apellido del Responsable */}
                                        <div className="space-y-2">
                                            <Label htmlFor="apellido_responsable">Apellido del Responsable</Label>
                                            <div className="flex items-center gap-2">
                                                <User className="text-muted-foreground h-4 w-4" />
                                                <Input
                                                    id="apellido_responsable"
                                                    value={data.apellido_responsable}
                                                    onChange={(e) => setData('apellido_responsable', e.target.value.toUpperCase())}
                                                    autoComplete="apellido_responsable"
                                                    placeholder="Ej: PÉREZ"
                                                />
                                            </div>
                                            <InputError message={errors.apellido_responsable} />
                                        </div>

                                        {/* Campo Teléfono del Responsable */}
                                        <div className="space-y-2">
                                            <Label htmlFor="telefono_responsable">Teléfono del Responsable</Label>
                                            <div className="flex items-center gap-2">
                                                <Phone className="text-muted-foreground h-4 w-4" />
                                                <Input
                                                    id="telefono_responsable"
                                                    value={data.telefono_responsable}
                                                    onChange={(e) => setData('telefono_responsable', e.target.value)}
                                                    autoComplete="telefono_responsable"
                                                    placeholder="Ej: 777-765432"
                                                />
                                            </div>
                                            <InputError message={errors.telefono_responsable} />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Botones de Acción */}
                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="outline" onClick={() => window.history.back()} className="min-w-[120px]">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing} className="min-w-[120px] bg-indigo-600 hover:bg-indigo-700">
                                {processing ? 'Actualizando...' : 'Actualizar Almacén'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
