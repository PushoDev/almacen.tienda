import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Filter, Plus } from 'lucide-react';
import { useState } from 'react';

interface Cierre {
    id: number;
    fecha_cierre: string;
    saldo_inicial: string;
    saldo_contado: string;
    diferencia: string;
    estado: string;
    usuario: { name: string };
    revisor?: { name: string };
}

interface Props extends PageProps {
    cierres: {
        data: Cierre[];
        links: any[];
    };
    filters: {
        fecha?: string;
        estado?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Opciones Generales',
        href: '/dashboard',
    },
    {
        title: 'Cierres de Caja',
        href: '/vendor/cierres',
    },
];

export default function Index({ auth, cierres, filters }: Props) {
    const { flash } = usePage<PageProps & { flash: { success?: string; error?: string } }>().props;

    const [fecha, setFecha] = useState(filters.fecha || '');
    const [estado, setEstado] = useState(filters.estado || 'todos');

    const handleFilter = () => {
        window.location.href = route('ventas.cierres', { fecha, estado });
    };

    const getStatusBadge = (estado: string) => {
        switch (estado) {
            case 'aprobado':
                return (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        Aprobado
                    </Badge>
                );
            case 'rechazado':
                return <Badge variant="destructive">Rechazado</Badge>;
            case 'pendiente':
                return (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                        Pendiente
                    </Badge>
                );
            case 'abierto':
                return (
                    <Badge variant="outline" className="border-blue-600 text-blue-600">
                        Abierto
                    </Badge>
                );
            default:
                return <Badge variant="outline">{estado}</Badge>;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cierres de Caja" />

            <div className="bg-background flex h-screen w-full flex-col">
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Cierres de Caja</h1>
                            <p className="text-muted-foreground">Historial y gestión de cierres diarios.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button asChild>
                                <Link href={route('ventas.cierres.create')}>
                                    <Plus className="mr-2 h-4 w-4" /> Nuevo Cierre
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Mensajes Flash */}
                    {flash.success && <div className="mb-6 rounded-md border border-green-200 bg-green-50 p-4 text-green-700">{flash.success}</div>}

                    <Card>
                        <CardHeader>
                            <CardTitle>Filtros</CardTitle>
                            <CardDescription>Busca cierres específicos por fecha o estado.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-4 md:flex-row">
                                <div className="w-full md:w-1/3">
                                    <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full" />
                                </div>
                                <div className="w-full md:w-1/3">
                                    <Select value={estado} onValueChange={setEstado}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="todos">Todos los estados</SelectItem>
                                            <SelectItem value="abierto">Abierto</SelectItem>
                                            <SelectItem value="pendiente">Pendiente</SelectItem>
                                            <SelectItem value="aprobado">Aprobado</SelectItem>
                                            <SelectItem value="rechazado">Rechazado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-full md:w-auto">
                                    <Button onClick={handleFilter} variant="secondary">
                                        <Filter className="mr-2 h-4 w-4" /> Filtrar
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="bg-background mt-6 rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Vendedor</TableHead>
                                    <TableHead>Saldo Inicial</TableHead>
                                    <TableHead>Contado</TableHead>
                                    <TableHead>Diferencia</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cierres.data.length > 0 ? (
                                    cierres.data.map((cierre) => (
                                        <TableRow key={cierre.id}>
                                            <TableCell className="font-medium">{new Date(cierre.fecha_cierre).toLocaleString()}</TableCell>
                                            <TableCell>{cierre.usuario.name}</TableCell>
                                            <TableCell>${Number(cierre.saldo_inicial).toFixed(2)}</TableCell>
                                            <TableCell className="font-bold">${Number(cierre.saldo_contado).toFixed(2)}</TableCell>
                                            <TableCell
                                                className={
                                                    Number(cierre.diferencia) !== 0
                                                        ? Number(cierre.diferencia) > 0
                                                            ? 'font-bold text-green-600'
                                                            : 'font-bold text-red-600'
                                                        : 'text-gray-500'
                                                }
                                            >
                                                ${Number(cierre.diferencia).toFixed(2)}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(cierre.estado)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={route('ventas.cierres.show', cierre.id)}>Ver detalle</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            No se encontraron cierres.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
