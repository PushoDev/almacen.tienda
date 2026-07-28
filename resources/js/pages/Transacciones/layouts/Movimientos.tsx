import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React from 'react';
import GastoForm from '../forms/GastoForm';
import IngresoForm from '../forms/IngresoForm';
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

export default function Movimientos({ cuentasOrigen, cuentasDestino, clientes, proveedores, monedasActivas }: Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Movimientos Financieros</CardTitle>
                <CardDescription>
                    Registre entradas (Ingreso), salidas (Gasto) o movimientos entre sus entidades (Transferencia).
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="gasto">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="gasto">Gasto</TabsTrigger>
                        <TabsTrigger value="ingreso">Ingreso</TabsTrigger>
                        <TabsTrigger value="transferir">Transferir</TabsTrigger>
                    </TabsList>
                    <TabsContent value="gasto" className="mt-4">
                        <GastoForm cuentasOrigen={cuentasOrigen} clientes={clientes} />
                    </TabsContent>
                    <TabsContent value="ingreso" className="mt-4">
                        <IngresoForm />
                    </TabsContent>
                    <TabsContent value="transferir" className="mt-4">
                        <TransferenciaForm
                            cuentasOrigen={cuentasOrigen}
                            cuentasDestino={cuentasDestino}
                            clientes={clientes}
                            proveedores={proveedores}
                            monedasActivas={monedasActivas}
                        />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
