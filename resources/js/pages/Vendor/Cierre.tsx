import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { BarChart, Eye, Search, User, Users, XCircle } from 'lucide-react';
import React, { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Ventas', href: '/punto-venta' },
    { title: 'Cierres de Caja', href: '#' },
];

// Mock data structures - replace with actual props later
interface Cierre {
    id: number;
    vendedor: {
        id: number;
        nombre: string;
    };
    fecha_cierre: string;
    total_ventas: number;
    total_ganancia: number;
    cantidad_transacciones: number;
}

interface Vendedor {
    id: number;
    nombre: string;
}

interface Filters {
    tipo: 'diario' | 'semanal' | 'mensual';
    fecha: string;
    vendedor_id?: string;
}

interface PageProps {
    cierres: Cierre[];
    vendedores: Vendedor[];
    filters: Filters;
    auth: {
        user: {
            role: 'admin' | 'vendedor';
        };
    };
}

export default function CierresDeCaja({ cierres, vendedores, filters, auth }: PageProps) {
    const [localFilters, setLocalFilters] = useState<Filters>(
        filters || {
            tipo: 'diario',
            fecha: new Date().toISOString().split('T')[0], // Default to today
        },
    );

    const handleFilterChange = (key: keyof Filters, value: string) => {
        setLocalFilters((prev) => ({ ...prev, [key]: value }));
    };

    const applyFilters = () => {
        router.get(route('ventas.cierres'), localFilters as unknown as Record<string, string>, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = () => {
        const defaultFilters: Filters = {
            tipo: 'diario',
            fecha: new Date().toISOString().split('T')[0],
        };
        setLocalFilters(defaultFilters);
        router.get(route('ventas.cierres'), defaultFilters as unknown as Record<string, string>, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const formatMonto = (monto: number) =>
        `$${monto.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const getInputTypeForFilter = () => {
        switch (localFilters.tipo) {
            case 'diario':
                return 'date';
            case 'semanal':
                return 'week';
            case 'mensual':
                return 'month';
            default:
                return 'date';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cierres de Caja" />
            <div className="flex h-full flex-1 flex-col gap-6 p-4 sm:p-6">
                <Card className="relative overflow-hidden">
                    <CardHeader>
                        <CardTitle>Reportes de Cierre de Caja</CardTitle>
                        <CardDescription>
                            Filtra y visualiza los cierres de caja por día, semana o mes.
                        </CardDescription>
                    </CardHeader>
                    <BarChart
                        size={80}
                        className="pointer-events-none absolute -bottom-4 -right-4 text-gray-200/40 dark:text-gray-500/10"
                    />
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Filtros</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-1">
                            <Label htmlFor="tipo-reporte">Tipo de Reporte</Label>
                            <Select value={localFilters.tipo} onValueChange={(v) => handleFilterChange('tipo', v)}>
                                <SelectTrigger id="tipo-reporte">
                                    <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="diario">Diario</SelectItem>
                                    <SelectItem value="semanal">Semanal</SelectItem>
                                    <SelectItem value="mensual">Mensual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="fecha">Fecha</Label>
                            <Input
                                id="fecha"
                                type={getInputTypeForFilter()}
                                value={localFilters.fecha}
                                onChange={(e) => handleFilterChange('fecha', e.target.value)}
                            />
                        </div>

                        {auth.user.role === 'admin' && (
                            <div className="space-y-1">
                                <Label htmlFor="vendedor">Vendedor</Label>
                                <Select
                                    value={localFilters.vendedor_id || ''}
                                    onValueChange={(v) => handleFilterChange('vendedor_id', v)}
                                >
                                    <SelectTrigger id="vendedor">
                                        <SelectValue placeholder="Todos los vendedores" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Todos</SelectItem>
                                        {vendedores.map((vendedor) => (
                                            <SelectItem key={vendedor.id} value={vendedor.id.toString()}>
                                                {vendedor.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="flex items-end gap-2">
                            <Button onClick={applyFilters} className="w-full sm:w-auto">
                                <Search className="mr-2 h-4 w-4" />
                                Buscar
                            </Button>
                            <Button variant="ghost" onClick={clearFilters} className="w-full sm:w-auto">
                                <XCircle className="mr-2 h-4 w-4" />
                                Limpiar
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Resultados</CardTitle>
                        <CardDescription>
                            Listado de cierres según los filtros aplicados.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <Users className="mr-2 inline-block h-4 w-4" /> Vendedor
                                    </TableHead>
                                    <TableHead>Fecha Cierre</TableHead>
                                    <TableHead className="text-right">Transacciones</TableHead>
                                    <TableHead className="text-right">Total Ventas</TableHead>
                                    <TableHead className="text-right">Total Ganancia</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cierres && cierres.length > 0 ? (
                                    cierres.map((cierre) => (
                                        <TableRow key={cierre.id}>
                                            <TableCell className="font-medium">{cierre.vendedor.nombre}</TableCell>
                                            <TableCell>{new Date(cierre.fecha_cierre).toLocaleDateString('es-ES')}</TableCell>
                                            <TableCell className="text-right">{cierre.cantidad_transacciones}</TableCell>
                                            <TableCell className="text-right font-semibold text-blue-600">
                                                {formatMonto(cierre.total_ventas)}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-green-600">
                                                {formatMonto(cierre.total_ganancia)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link
                                                    href={route('ventas.cierres.show', {
                                                        vendedor_id: cierre.vendedor.id,
                                                        fecha: localFilters.fecha,
                                                        tipo: localFilters.tipo,
                                                    })}
                                                >
                                                    <Button variant="outline" size="sm">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No se encontraron cierres para los filtros seleccionados.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}