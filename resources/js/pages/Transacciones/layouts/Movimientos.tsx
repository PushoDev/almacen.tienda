import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowDownCircle, ArrowLeftRight, ArrowUpCircle, Repeat, Send } from 'lucide-react';
import React from 'react';
import GastoForm from '../forms/GastoForm';
import IngresoForm from '../forms/IngresoForm';
import RemesaForm from '../forms/RemesaForm';
import TransferenciaForm from '../forms/TransferenciaForm';

interface Moneda {
    id: number;
    codigo_moneda: string;
    nombre_moneda: string;
    simbolo_moneda: string;
    tasa_cambio: number;
    estado: boolean;
    principal: boolean;
}

interface Cuenta {
    id: number;
    nombre_cuenta: string;
    saldo_cuenta: number;
    deuda: number;
    tipo_cuenta: string;
    tipo_titular: string | null;
    estado: string;
    moneda_id: number;
    moneda: Moneda;
}

interface Cliente {
    id: number;
    nombre_cliente: string;
    deuda_pago_cliente: number | string | null;
}

interface Proveedor {
    id: number;
    nombre_proveedor: string;
    telefono_proveedor: string | null;
    saldo_proveedor: number;
    correo_proveedor: string | null;
    localidad_proveedor: string | null;
    notas_proveedor: string | null;
}

interface Props {
    cuentasOrigen: Cuenta[];
    cuentasDestino: Cuenta[];
    clientes: Cliente[];
    proveedores: Proveedor[];
    monedasActivas: Moneda[];
    userRole: string;
}

export default function Movimientos({ cuentasOrigen, clientes, userRole }: Props) {
    const puedeVerRemesa = userRole !== 'vendedor';

    return (
        <Card className="overflow-hidden border-l-4 border-blue-500/30 pt-0 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="border-b bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                        <Repeat className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-white">Movimientos Financieros</CardTitle>
                        <CardDescription className="text-blue-100">
                            Registre entradas (Ingreso), salidas (Gasto), movimientos entre sus entidades (Transferencia){puedeVerRemesa && ' o remesas (Remesa)'}.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="gasto">
                    <TabsList className={`grid w-full ${puedeVerRemesa ? 'grid-cols-4' : 'grid-cols-3'}`}>
                        <TabsTrigger value="gasto" className="flex items-center gap-2">
                            <ArrowDownCircle className="h-4 w-4" />
                            Gasto
                        </TabsTrigger>
                        <TabsTrigger value="ingreso" className="flex items-center gap-2">
                            <ArrowUpCircle className="h-4 w-4" />
                            Ingreso
                        </TabsTrigger>
                        <TabsTrigger value="transferir" className="flex items-center gap-2">
                            <ArrowLeftRight className="h-4 w-4" />
                            Transferir
                        </TabsTrigger>
                        {puedeVerRemesa && (
                            <TabsTrigger value="remesa" className="flex items-center gap-2">
                                <Send className="h-4 w-4" />
                                Remesa
                            </TabsTrigger>
                        )}
                    </TabsList>
                    <TabsContent value="gasto" className="mt-4">
                        <GastoForm cuentasOrigen={cuentasOrigen} clientes={clientes} />
                    </TabsContent>
                    <TabsContent value="ingreso" className="mt-4">
                        <IngresoForm />
                    </TabsContent>
                    <TabsContent value="transferir" className="mt-4">
                        <TransferenciaForm />
                    </TabsContent>
                    {puedeVerRemesa && (
                        <TabsContent value="remesa" className="mt-4">
                            <RemesaForm />
                        </TabsContent>
                    )}
                </Tabs>
            </CardContent>
        </Card>
    );
}
