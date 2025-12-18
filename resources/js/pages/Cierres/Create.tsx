import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem, PageProps } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { AlertCircle, Calculator, Save } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

interface Calculos {
    inicio_turno: string;
    saldo_inicial: number;
    ventas_efectivo: number;
    ventas_otros: number;
    gastos: number;
    devoluciones: number;
    saldo_esperado: number;
}

interface Props extends PageProps {
    calculos: Calculos;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Cierres de Caja',
        href: '/vendor/cierres',
    },
    {
        title: 'Nuevo Cierre',
        href: '/vendor/cierres/crear',
    },
];

export default function Create({ auth, calculos }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        saldo_inicial: calculos.saldo_inicial,
        ventas_efectivo: calculos.ventas_efectivo,
        ventas_otros: calculos.ventas_otros,
        total_gastos: calculos.gastos,
        total_devoluciones: calculos.devoluciones,
        saldo_contado: '',
        observaciones: '',
        fecha_apertura: calculos.inicio_turno,
    });

    const [diferencia, setDiferencia] = useState(0);

    useEffect(() => {
        const contado = parseFloat(data.saldo_contado as string) || 0;
        const esperado = calculos.saldo_esperado;
        setDiferencia(contado - esperado);
    }, [data.saldo_contado]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('ventas.cierres.store'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Realizar Cierre" />

            <div className="bg-background flex h-screen w-full flex-col">
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="mx-auto max-w-5xl">
                        <div className="mb-6">
                            <h1 className="text-3xl font-bold tracking-tight">Cierre de Caja</h1>
                            <p className="text-muted-foreground">Verifica los montos y registra el efectivo final del turno.</p>
                        </div>

                        <form onSubmit={submit}>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {/* Columna Izquierda - Resumen del Sistema */}
                                <Card className="bg-muted/50">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Calculator className="h-5 w-5" /> Resumen del Sistema
                                        </CardTitle>
                                        <CardDescription>Cálculos automáticos basados en movimientos registrados.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Inicio de Turno:</span>
                                                <span className="font-medium">{new Date(calculos.inicio_turno).toLocaleString()}</span>
                                            </div>
                                            <Separator />
                                            <div className="flex justify-between">
                                                <span>Saldo Inicial:</span>
                                                <span className="font-mono">${calculos.saldo_inicial.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-green-600">
                                                <span>(+) Ventas Efectivo:</span>
                                                <span className="font-mono font-medium">${calculos.ventas_efectivo.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-blue-600">
                                                <span>(+) Ventas Otros Medios:</span>
                                                <span className="font-mono font-medium">${calculos.ventas_otros.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-red-600">
                                                <span>(-) Gastos/Salidas:</span>
                                                <span className="font-mono font-medium">${calculos.gastos.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-red-600">
                                                <span>(-) Devoluciones:</span>
                                                <span className="font-mono font-medium">${calculos.devoluciones.toFixed(2)}</span>
                                            </div>
                                            <Separator className="my-2" />
                                            <div className="bg-background flex items-center justify-between rounded border p-3">
                                                <span className="text-lg font-bold">Saldo Esperado:</span>
                                                <span className="font-mono text-xl font-bold">${calculos.saldo_esperado.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Columna Derecha - Conteo Físico */}
                                <div className="space-y-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Conteo Físico</CardTitle>
                                            <CardDescription>Ingresa el efectivo real contado en caja.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="saldo_contado">Saldo Contado (Efectivo Real)</Label>
                                                <div className="relative">
                                                    <div className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                        $
                                                    </div>
                                                    <Input
                                                        id="saldo_contado"
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        className="pl-7 text-lg font-bold"
                                                        value={data.saldo_contado}
                                                        onChange={(e) => setData('saldo_contado', e.target.value)}
                                                        required
                                                    />
                                                </div>
                                                {errors.saldo_contado && (
                                                    <p className="text-destructive text-sm font-medium">{errors.saldo_contado}</p>
                                                )}
                                            </div>

                                            <div
                                                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 ${diferencia === 0 ? 'border-primary/50 bg-primary/5' : diferencia > 0 ? 'border-blue-500/50 bg-blue-50' : 'border-destructive/50 bg-destructive/10'}`}
                                            >
                                                <span className="text-muted-foreground mb-1 text-sm font-medium">Diferencia Estimada</span>
                                                <span
                                                    className={`text-3xl font-black ${diferencia === 0 ? 'text-primary' : diferencia > 0 ? 'text-blue-600' : 'text-destructive'}`}
                                                >
                                                    ${diferencia.toFixed(2)}
                                                </span>
                                                <span className="text-muted-foreground mt-1 text-xs">
                                                    {diferencia === 0 ? 'Cuadre perfecto' : diferencia > 0 ? 'Sobrante' : 'Faltante'}
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="observaciones">Observaciones</Label>
                                                <Textarea
                                                    id="observaciones"
                                                    placeholder="Detalles sobre diferencias, billetes dañados, etc."
                                                    className="min-h-[100px]"
                                                    value={data.observaciones}
                                                    onChange={(e) => setData('observaciones', e.target.value)}
                                                />
                                            </div>
                                        </CardContent>
                                        <CardFooter className="bg-muted/20 flex flex-col gap-4 border-t pt-6">
                                            <Button type="submit" className="w-full" size="lg" disabled={processing}>
                                                {processing ? (
                                                    'Procesando...'
                                                ) : (
                                                    <>
                                                        <Save className="mr-2 h-4 w-4" /> Confirmar y Cerrar Turno
                                                    </>
                                                )}
                                            </Button>
                                            <div className="text-muted-foreground flex items-center justify-center gap-2 text-xs">
                                                <AlertCircle className="h-3 w-3" />
                                                <span>Esta acción cerrará tu sesión de ventas actual.</span>
                                            </div>
                                        </CardFooter>
                                    </Card>
                                </div>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
