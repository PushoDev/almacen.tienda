import type { TipoCuenta } from '@/components/cuentas/tipo-cuenta-logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlmacenProps } from '@/types';
import { Globe, Store, University } from 'lucide-react';
import { AlmacenesAccesoGlobal } from './almacenes-acceso-global';
import { CuentasAccesoGlobal } from './cuentas-acceso-global';
import type { CuentaDisponible } from './tipos';

interface AccesoGlobalCardProps {
    almacenes: AlmacenProps[];
    cuentas: CuentaDisponible[];
    tiposCuenta: TipoCuenta[];
}

const CLASE_TRIGGER = 'gap-2 text-white data-[state=active]:bg-white data-[state=active]:text-violet-700 data-[state=active]:shadow-none';

/**
 * Reemplaza `AsignacionesCard` para admin/moderador: mismas pestañas Almacenes/Cuentas, pero de
 * solo lectura — no hay nada que asignar porque el acceso es global (sin filas en
 * `user_almacens`/`user_cuentas`, ver `User::cuentasPropias()`). Antes esto era un aviso de texto
 * plano; ahora se ve la lista real, con el mismo lenguaje visual (borde animado, badges) para que
 * no parezca una pantalla "de menos".
 */
export function AccesoGlobalCard({ almacenes, cuentas, tiposCuenta }: AccesoGlobalCardProps) {
    return (
        <Card className="overflow-hidden border-0 pt-0 shadow-lg">
            <Tabs defaultValue="almacenes">
                <CardHeader className="border-b bg-gradient-to-r from-violet-600 to-violet-700 px-6 py-5 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Globe className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Acceso del Empleado</CardTitle>
                                <CardDescription className="text-violet-100">
                                    Acceso global: opera todos los almacenes y ve el saldo de todas las cuentas, sin asignación una por una.
                                </CardDescription>
                            </div>
                        </div>
                        <TabsList className="h-auto bg-white/20 backdrop-blur-sm">
                            <TabsTrigger value="almacenes" className={CLASE_TRIGGER}>
                                <Store className="h-4 w-4" />
                                Almacenes
                                <span className="rounded-full bg-black/20 px-2 text-xs">{almacenes.length}</span>
                            </TabsTrigger>
                            <TabsTrigger value="cuentas" className={CLASE_TRIGGER}>
                                <University className="h-4 w-4" />
                                Cuentas
                                <span className="rounded-full bg-black/20 px-2 text-xs">{cuentas.length}</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>
                </CardHeader>
                <CardContent className="pt-2">
                    <TabsContent value="almacenes" forceMount className="data-[state=inactive]:hidden">
                        <AlmacenesAccesoGlobal almacenes={almacenes} />
                    </TabsContent>
                    <TabsContent value="cuentas" forceMount className="data-[state=inactive]:hidden">
                        <CuentasAccesoGlobal cuentas={cuentas} tiposCuenta={tiposCuenta} />
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>
    );
}
