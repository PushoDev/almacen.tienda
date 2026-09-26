import type { TipoCuenta } from '@/components/cuentas/tipo-cuenta-logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlmacenProps } from '@/types';
import { KeyRound, Store, University } from 'lucide-react';
import { AlmacenesPanel } from './almacenes-panel';
import { CuentasPanel } from './cuentas-panel';
import type { CuentaAsignada, CuentaDisponible } from './tipos';

interface AsignacionesCardProps {
    almacenes: AlmacenProps[];
    almacenesSeleccionados: number[];
    onAlmacenesChange: (ids: number[]) => void;
    almacenesError?: string;
    cuentas: CuentaDisponible[];
    tiposCuenta: TipoCuenta[];
    cuentasAsignadas: CuentaAsignada[];
    onCuentasChange: (asignadas: CuentaAsignada[]) => void;
    cuentasError?: string;
}

const CLASE_TRIGGER = 'gap-2 text-white data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-none';

/**
 * Card única de Crear y Editar Empleado con el acceso del empleado: pestañas "Almacenes" y "Cuentas" (así la
 * página no crece con 22 almacenes y 100+ cuentas). Cada pestaña muestra su contador y un punto rojo si tiene
 * errores de validación; el contenido queda montado al cambiar de pestaña para no perder búsquedas ni filtros.
 */
export function AsignacionesCard({
    almacenes,
    almacenesSeleccionados,
    onAlmacenesChange,
    almacenesError,
    cuentas,
    tiposCuenta,
    cuentasAsignadas,
    onCuentasChange,
    cuentasError,
}: AsignacionesCardProps) {
    const totalCompletas = cuentasAsignadas.filter((a) => a.acceso === 'completo').length;
    const totalCobro = cuentasAsignadas.length - totalCompletas;

    return (
        <Card className="overflow-hidden border-0 pt-0 shadow-lg">
            <Tabs defaultValue="almacenes">
                <CardHeader className="border-b bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <KeyRound className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Accesos del Empleado</CardTitle>
                                <CardDescription className="text-indigo-100">
                                    Almacenes que gestiona y qué puede hacer con cada cuenta.
                                </CardDescription>
                            </div>
                        </div>
                        <TabsList className="h-auto bg-white/20 backdrop-blur-sm">
                            <TabsTrigger value="almacenes" className={CLASE_TRIGGER}>
                                <Store className="h-4 w-4" />
                                Almacenes
                                <span className="rounded-full bg-black/20 px-2 text-xs">
                                    {almacenesSeleccionados.length}/{almacenes.length}
                                </span>
                                {almacenesError && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Con errores" />}
                            </TabsTrigger>
                            <TabsTrigger value="cuentas" className={CLASE_TRIGGER}>
                                <University className="h-4 w-4" />
                                Cuentas
                                <span className="rounded-full bg-black/20 px-2 text-xs">
                                    {totalCompletas} completo · {totalCobro} cobro
                                </span>
                                {cuentasError && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="Con errores" />}
                            </TabsTrigger>
                        </TabsList>
                    </div>
                </CardHeader>
                <CardContent className="pt-2">
                    <TabsContent value="almacenes" forceMount className="data-[state=inactive]:hidden">
                        <AlmacenesPanel
                            almacenes={almacenes}
                            seleccionados={almacenesSeleccionados}
                            onChange={onAlmacenesChange}
                            error={almacenesError}
                        />
                    </TabsContent>
                    <TabsContent value="cuentas" forceMount className="data-[state=inactive]:hidden">
                        <CuentasPanel
                            cuentas={cuentas}
                            tiposCuenta={tiposCuenta}
                            asignadas={cuentasAsignadas}
                            onChange={onCuentasChange}
                            error={cuentasError}
                        />
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>
    );
}
