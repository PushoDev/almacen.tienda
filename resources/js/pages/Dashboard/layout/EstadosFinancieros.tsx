import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DollarSign, Search, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { EstadoFinanciero, Usuario } from '../types';

const CUENTAS_POR_PAGINA = 10;

export default function EstadosFinancieros({ userRole }: { userRole: 'admin' | 'moderador' | 'vendedor' }) {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string>('');
    const [estadosFinancieros, setEstadosFinancieros] = useState<EstadoFinanciero[]>([]);
    const [isLoadingFinancial, setIsLoadingFinancial] = useState(false);
    const [busquedaEstado, setBusquedaEstado] = useState('');
    const [paginaEstado, setPaginaEstado] = useState(1);

    // Cargar usuarios al montar el componente (solo admin/moderador, mismo gate que el backend)
    useEffect(() => {
        if (userRole === 'vendedor') return;

        const fetchUsuarios = async () => {
            try {
                const response = await fetch(route('dashboard.usuarios'));
                const data = await response.json();
                setUsuarios(data);
            } catch (error) {
                console.error('Error fetching usuarios:', error);
            }
        };

        fetchUsuarios();
    }, [userRole]);

    // Cargar estados financieros cuando cambia el usuario seleccionado
    useEffect(() => {
        const fetchFinancialStates = async () => {
            setIsLoadingFinancial(true);
            try {
                const url =
                    usuarioSeleccionado && usuarioSeleccionado !== 'all'
                        ? route('dashboard.financial.states', { user_id: usuarioSeleccionado })
                        : route('dashboard.financial.states');
                const response = await fetch(url);
                const data = await response.json();
                setEstadosFinancieros(data);
            } catch (error) {
                console.error('Error fetching financial states:', error);
            } finally {
                setIsLoadingFinancial(false);
            }
        };

        fetchFinancialStates();
    }, [usuarioSeleccionado]);

    // Filtrar y paginar estados financieros
    const estadosFiltrados = estadosFinancieros.filter((estado) => {
        if (!busquedaEstado.trim()) return true;
        const termino = busquedaEstado.toLowerCase();
        return (
            estado.nombre_cuenta?.toLowerCase().includes(termino) ||
            estado.tipo?.toLowerCase().includes(termino) ||
            estado.moneda?.nombre_moneda?.toLowerCase().includes(termino) ||
            estado.moneda?.codigo_moneda?.toLowerCase().includes(termino) ||
            estado.moneda?.simbolo_moneda?.toLowerCase().includes(termino)
        );
    });

    const totalPaginasEstado = Math.ceil(estadosFiltrados.length / CUENTAS_POR_PAGINA);
    const estadosPaginados = estadosFiltrados.slice((paginaEstado - 1) * CUENTAS_POR_PAGINA, paginaEstado * CUENTAS_POR_PAGINA);

    return (
        <div>
            <Card className="overflow-hidden border-rose-500/30 border-l-4 pt-0 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="flex items-center gap-2 space-y-0 border-b bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-5 text-white sm:flex-row">
                    <div className="grid flex-1 gap-1 text-center sm:text-left">
                        <div className="flex items-center justify-center gap-3 sm:justify-start">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Estados Financieros</CardTitle>
                                <CardDescription className="text-rose-100">Resumen de cuentas y saldos asignados</CardDescription>
                            </div>
                        </div>
                    </div>
                    {/* Búsqueda */}
                    <div className="relative w-[250px]">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/70" />
                        <Input
                            type="text"
                            placeholder="Buscar cuenta, tipo, moneda..."
                            className="border-white/30 bg-white/20 pl-9 text-white placeholder:text-white/70 backdrop-blur-sm"
                            value={busquedaEstado}
                            onChange={(e) => {
                                setBusquedaEstado(e.target.value);
                                setPaginaEstado(1);
                            }}
                        />
                    </div>
                    {/* Selector de usuario */}
                    {userRole !== 'vendedor' && (
                        <Select value={usuarioSeleccionado} onValueChange={setUsuarioSeleccionado}>
                            <SelectTrigger className="w-[220px] rounded-lg" aria-label="Filtrar por usuario">
                                <SelectValue placeholder="Todos los usuarios" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">Todos los usuarios</SelectItem>
                                {usuarios.map((usuario) => (
                                    <SelectItem key={usuario.id} value={usuario.id.toString()}>
                                        {usuario.name} ({usuario.role})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </CardHeader>
                <CardContent className="pt-6">
                    {isLoadingFinancial ? (
                        <div className="flex h-[300px] items-center justify-center text-center">Cargando datos financieros...</div>
                    ) : estadosFiltrados.length > 0 ? (
                        <div className="space-y-4">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-b-sidebar-border dark:border-b-sidebar-border hover:bg-transparent">
                                            <TableHead className="text-gray-700 dark:text-gray-300">Cuenta</TableHead>
                                            <TableHead className="text-gray-700 dark:text-gray-300">Tipo</TableHead>
                                            <TableHead className="text-gray-700 dark:text-gray-300">Moneda</TableHead>
                                            <TableHead className="text-right text-gray-700 dark:text-gray-300">Saldo</TableHead>
                                            <TableHead className="text-gray-700 dark:text-gray-300">Tipo Cuenta</TableHead>
                                            <TableHead className="text-gray-700 dark:text-gray-300">Vendedores</TableHead>
                                            <TableHead className="text-gray-700 dark:text-gray-300">Estado</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {estadosPaginados.map((estado) => {
                                            const getColorClass = () => {
                                                const nombre = estado.nombre_cuenta.toLowerCase();
                                                if (nombre.includes('efectivo') || nombre.includes('cash')) return 'bg-amber-100 dark:bg-amber-900/50';
                                                if (nombre.includes('tarjeta') || nombre.includes('card')) return 'bg-blue-100 dark:bg-blue-900/50';
                                                return 'bg-gray-100 dark:bg-gray-700';
                                            };
                                            return (
                                                <TableRow
                                                    key={estado.cuenta_id}
                                                    className={`border-b-sidebar-border/50 dark:border-b-sidebar-border/50 hover:bg-sidebar/10 dark:hover:bg-sidebar/20 transition-colors ${getColorClass()}`}
                                                >
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold">{estado.nombre_cuenta}</span>
                                                            <Badge variant="secondary" className="text-xs">
                                                                #{estado.cuenta_id}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-sm capitalize">{estado.tipo}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-bold">{estado.moneda.simbolo_moneda}</span>
                                                            <span className="text-muted-foreground text-sm">{estado.moneda.codigo_moneda}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {estado.saldo_cuenta.toLocaleString('es-ES', {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                estado.tipo_cuenta === 'permanentes'
                                                                    ? 'border-blue-300 text-blue-800 dark:text-blue-300'
                                                                    : estado.tipo_cuenta === 'temporales'
                                                                      ? 'border-green-300 text-green-800 dark:text-green-300'
                                                                      : 'border-red-300 text-red-800 dark:text-red-300'
                                                            }
                                                        >
                                                            {estado.tipo_cuenta}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {estado.usuarios.length > 0 ? (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <button className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-blue-100 p-1.5 transition-colors hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-800">
                                                                            <Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                                                            <span className="ml-1 text-xs font-semibold text-blue-600 dark:text-blue-300">
                                                                                {estado.usuarios.length}
                                                                            </span>
                                                                        </button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="left" className="max-w-sm bg-gray-800 text-white">
                                                                        <div className="space-y-1">
                                                                            <p className="font-semibold">Vendedores asignados:</p>
                                                                            {estado.usuarios.map((usuario) => (
                                                                                <div key={usuario.id} className="text-xs">
                                                                                    <p className="font-medium">{usuario.name}</p>
                                                                                    <p className="opacity-80">({usuario.role})</p>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        ) : (
                                                            <span className="text-xs text-gray-400 italic">Ninguno</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={estado.estado_cuenta ? 'default' : 'secondary'}
                                                            className={
                                                                estado.estado_cuenta
                                                                    ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300'
                                                                    : 'border-gray-500/30 bg-gray-500/10 text-gray-600 dark:text-gray-400'
                                                            }
                                                        >
                                                            {estado.estado_cuenta ? 'Activa' : 'Inactiva'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            {totalPaginasEstado > 1 && (
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        {(paginaEstado - 1) * CUENTAS_POR_PAGINA + 1} -{' '}
                                        {Math.min(paginaEstado * CUENTAS_POR_PAGINA, estadosFiltrados.length)} de {estadosFiltrados.length} cuentas
                                    </div>
                                    <div className="flex space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={paginaEstado === 1}
                                            onClick={() => setPaginaEstado((p) => Math.max(1, p - 1))}
                                        >
                                            «
                                        </Button>
                                        {Array.from({ length: totalPaginasEstado }, (_, i) => i + 1).map((p) => (
                                            <Button
                                                key={p}
                                                variant={p === paginaEstado ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setPaginaEstado(p)}
                                            >
                                                {p}
                                            </Button>
                                        ))}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={paginaEstado === totalPaginasEstado}
                                            onClick={() => setPaginaEstado((p) => Math.min(totalPaginasEstado, p + 1))}
                                        >
                                            »
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex h-[300px] items-center justify-center text-center">No hay cuentas disponibles para mostrar.</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
