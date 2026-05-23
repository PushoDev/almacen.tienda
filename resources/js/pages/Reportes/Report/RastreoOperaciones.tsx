import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, User } from '@/types';
import { Head, router } from '@inertiajs/react';
import { FileText, History, Search } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Reportes',
        href: route('reportes.index'),
    },
    {
        title: 'Rastreo de Operaciones',
        href: route('reportes.rastreo_operaciones'),
    },
];

interface Operacion {
    id: number;
    fecha: string;
    tipo: 'Venta' | 'Compra' | 'Finanzas' | 'Cierre';
    monto: number;
    usuario: string;
    user_id: number | null;
    referencia: string;
    descripcion: string;
}

interface PaginatedOperaciones {
    data: Operacion[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
}

interface RastreoOperacionesPageProps {
    operaciones: PaginatedOperaciones;
    usuarios: User[];
    filtros: {
        start_date?: string;
        end_date?: string;
        user_id?: string;
        tipo_operacion?: string;
    };
}

export default function RastreoOperacionesPage({ operaciones, usuarios, filtros }: RastreoOperacionesPageProps) {
    const [startDate, setStartDate] = useState(filtros.start_date || '');
    const [endDate, setEndDate] = useState(filtros.end_date || '');
    const [userId, setUserId] = useState(filtros.user_id || 'all');
    const [tipoOperacion, setTipoOperacion] = useState(filtros.tipo_operacion || 'all');

    const buildParams = (page: number = 1) => ({
        start_date: startDate,
        end_date: endDate,
        user_id: userId === 'all' ? '' : userId,
        tipo_operacion: tipoOperacion === 'all' ? '' : tipoOperacion,
        page,
    });

    const handleFilter = () => {
        router.get(route('reportes.rastreo_operaciones'), buildParams(1), {
            preserveState: true,
            replace: true,
        });
    };

    const handlePageChange = (page: number) => {
        router.get(route('reportes.rastreo_operaciones'), buildParams(page), {
            preserveState: true,
            replace: true,
        });
    };

    const getPageNumbers = (current: number, last: number): (number | '...')[] => {
        if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

        const pages: (number | '...')[] = [1];

        if (current > 3) pages.push('...');

        for (let i = Math.max(2, current - 1); i <= Math.min(last - 1, current + 1); i++) {
            pages.push(i);
        }

        if (current < last - 2) pages.push('...');
        pages.push(last);

        return pages;
    };

    const exportToPDF = async () => {
        try {
            const { jsPDF } = await import('jspdf');
            await import('jspdf-autotable');
            const doc = new jsPDF();

            doc.setFontSize(18);
            doc.text('REPORTE GENERAL DE OPERACIONES', 105, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.text(`Generado el: ${new Date().toLocaleString()}`, 20, 30);
            if (startDate || endDate) {
                doc.text(`Periodo: ${startDate || 'Inicio'} al ${endDate || 'Fin'}`, 20, 35);
            }

            const tableData = operaciones.data.map((op) => [
                new Date(op.fecha).toLocaleString(),
                op.tipo,
                op.referencia,
                op.usuario,
                `$${parseFloat(op.monto.toString()).toFixed(2)}`,
                op.descripcion || '-',
            ]);

            (doc as any).autoTable({
                startY: 45,
                head: [['Fecha', 'Tipo', 'Referencia', 'Usuario', 'Monto', 'Detalles']],
                body: tableData,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [71, 85, 105] },
            });

            doc.save(`rastreo_operaciones_${new Date().getTime()}.pdf`);
            toast.success('PDF generado correctamente');
        } catch (error) {
            console.error('Error generando PDF:', error);
            toast.error('Error al generar el PDF');
        }
    };

    const getTipoColor = (tipo: string) => {
        switch (tipo) {
            case 'Venta': return 'text-emerald-500 font-bold';
            case 'Compra': return 'text-rose-500 font-bold';
            case 'Finanzas': return 'text-amber-500 font-bold';
            case 'Cierre': return 'text-slate-500 font-bold';
            default: return '';
        }
    };

    const { data: ops, current_page, last_page, total, from, to } = operaciones;
    const pageNumbers = getPageNumbers(current_page, last_page);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Rastreo de Operaciones" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Auditoría General de Operaciones"
                        description="Vista unificada de todas las transacciones, ventas, compras y cierres realizados en el sistema."
                    />
                    <History
                        size={70}
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse text-slate-500 opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* Filtros */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Filtros de Búsqueda</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-5">
                            <div className="space-y-2">
                                <Label htmlFor="start_date">Desde</Label>
                                <Input
                                    id="start_date"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_date">Hasta</Label>
                                <Input
                                    id="end_date"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Usuario</Label>
                                <Select value={userId} onValueChange={setUserId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los usuarios</SelectItem>
                                        {usuarios.map((u) => (
                                            <SelectItem key={u.id} value={u.id.toString()}>{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo de Operación</Label>
                                <Select value={tipoOperacion} onValueChange={setTipoOperacion}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos los tipos</SelectItem>
                                        <SelectItem value="Venta">Ventas</SelectItem>
                                        <SelectItem value="Compra">Compras</SelectItem>
                                        <SelectItem value="Finanzas">Movimientos Financieros</SelectItem>
                                        <SelectItem value="Cierre">Cierres de Caja</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={handleFilter} className="w-full">
                                    <Search className="mr-2 h-4 w-4" /> Filtrar
                                </Button>
                                <Button variant="outline" onClick={exportToPDF}>
                                    <FileText className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabla */}
                <Card className="flex-1">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-sidebar-border">
                                <thead className="bg-sidebar-accent/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Fecha / Hora</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Referencia</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Usuario</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Monto</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Detalles</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-sidebar-border">
                                    {ops.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                                                No se encontraron operaciones con los filtros seleccionados.
                                            </td>
                                        </tr>
                                    ) : (
                                        ops.map((op, idx) => (
                                            <tr key={`${op.tipo}-${op.id}-${idx}`} className="hover:bg-sidebar-accent/30 transition-colors">
                                                <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                    {new Date(op.fecha).toLocaleString()}
                                                </td>
                                                <td className={`px-6 py-4 text-sm whitespace-nowrap ${getTipoColor(op.tipo)}`}>
                                                    {op.tipo}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                                                    {op.referencia}
                                                </td>
                                                <td className="px-6 py-4 text-sm whitespace-nowrap">
                                                    {op.usuario}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-mono whitespace-nowrap">
                                                    ${parseFloat(op.monto.toString()).toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-muted-foreground">
                                                    {op.descripcion || '-'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        {last_page > 1 && (
                            <div className="flex items-center justify-between border-t border-sidebar-border px-6 py-4">
                                <p className="text-sm text-muted-foreground">
                                    Mostrando {from}–{to} de {total} operaciones
                                </p>
                                <Pagination className="mx-0 w-auto">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (current_page > 1) handlePageChange(current_page - 1);
                                                }}
                                                className={current_page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                            />
                                        </PaginationItem>
                                        {pageNumbers.map((page, idx) =>
                                            page === '...' ? (
                                                <PaginationItem key={`ellipsis-${idx}`}>
                                                    <PaginationEllipsis />
                                                </PaginationItem>
                                            ) : (
                                                <PaginationItem key={page}>
                                                    <PaginationLink
                                                        href="#"
                                                        isActive={page === current_page}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handlePageChange(page as number);
                                                        }}
                                                        className="cursor-pointer"
                                                    >
                                                        {page}
                                                    </PaginationLink>
                                                </PaginationItem>
                                            )
                                        )}
                                        <PaginationItem>
                                            <PaginationNext
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (current_page < last_page) handlePageChange(current_page + 1);
                                                }}
                                                className={current_page === last_page ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
