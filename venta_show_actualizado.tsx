import { PageProps, Producto, Venta, Moneda, Cuenta, Via } from '@/types'
import { Head, Link } from '@inertiajs/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Badge } from '@/Components/ui/badge'
import { Separator } from '@/Components/ui/separator'
import { DollarSign, TrendingUp, TrendingDown, RotateCcw } from 'lucide-react'

interface VentaShowProps extends PageProps {
    venta: Venta & {
        detalles: Array<{
            id: number
            producto: Producto
            cantidad: number
            precio_venta: number
        }>
        pagos: Array<{
            id: number
            moneda: Moneda
            monto_original: number
            monto_equivalente_usd: number
            tasa_cambio_aplicada: number
            cuenta: Cuenta
            via: Via
        }>
    }
    resumen: {
        totalVenta: number
        totalPagado: number
        restantePorPagar: number
        gananciaOperacional: number
        gananciaPerdidaCambiaria: number
        gananciaRealTotal: number
        tasaCambioPrincipal: number
    }
}

export default function VentaShow({ venta, resumen }: VentaShowProps) {
    return (
        <div className="container mx-auto py-6 px-4">
            <Head title={`Venta #${venta.id}`} />
            
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Venta #{venta.id}</h1>
                    <p className="text-muted-foreground">
                        Fecha: {new Date(venta.created_at).toLocaleDateString()}
                    </p>
                </div>
                <Link 
                    href={route('ventas.index')} 
                    className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                >
                    <RotateCcw className="w-4 h-4" />
                    Volver al listado
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Resumen Financiero */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            Resumen Financiero
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between">
                            <span>Total de la Venta:</span>
                            <span className="font-semibold">${resumen.totalVenta.toFixed(2)} USD</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Total Pagado:</span>
                            <span className="font-semibold">${resumen.totalPagado.toFixed(2)} USD</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Restante por Pagar:</span>
                            <span className={`font-semibold ${resumen.restantePorPagar > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ${resumen.restantePorPagar.toFixed(2)} USD
                            </span>
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                    <span>Ganancia Operacional:</span>
                                </div>
                                <span className={`font-semibold ${resumen.gananciaOperacional >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ${resumen.gananciaOperacional.toFixed(2)} USD
                                </span>
                            </div>
                            
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    {resumen.gananciaPerdidaCambiaria >= 0 ? (
                                        <TrendingUp className="w-4 h-4 text-green-600" />
                                    ) : (
                                        <TrendingDown className="w-4 h-4 text-red-600" />
                                    )}
                                    <span>Ganancia/Pérdida Cambiaria:</span>
                                </div>
                                <span className={`font-semibold ${resumen.gananciaPerdidaCambiaria >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ${resumen.gananciaPerdidaCambiaria.toFixed(2)} USD
                                </span>
                            </div>
                            
                            <Separator />
                            
                            <div className="flex justify-between items-center pt-2">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-blue-600" />
                                    <span className="font-semibold">Ganancia Real Total:</span>
                                </div>
                                <span className={`font-semibold text-lg ${resumen.gananciaRealTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ${resumen.gananciaRealTotal.toFixed(2)} USD
                                </span>
                            </div>
                        </div>
                        
                        <Separator />
                        
                        <div className="pt-2">
                            <div className="flex justify-between">
                                <span>Moneda Principal:</span>
                                <span className="font-semibold">Dólar Estadounidense</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tasa Cambio Principal:</span>
                                <span className="font-semibold">{resumen.tasaCambioPrincipal.toFixed(6)}</span>
                            </div>
                        </div>
                        
                        <Badge className={`w-full justify-center ${venta.estado === 'COMPLETADA' ? 'bg-green-500' : 'bg-yellow-500'}`}>
                            {venta.estado}
                        </Badge>
                    </CardContent>
                </Card>

                {/* Detalles de la Venta */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalles de la Venta</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2">Producto</th>
                                            <th className="text-right py-2">Cantidad</th>
                                            <th className="text-right py-2">Precio Unitario</th>
                                            <th className="text-right py-2">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {venta.detalles.map((detalle) => (
                                            <tr key={detalle.id} className="border-b">
                                                <td className="py-2">
                                                    <div className="font-medium">{detalle.producto.nombre}</div>
                                                    <div className="text-sm text-muted-foreground">{detalle.producto.descripcion}</div>
                                                </td>
                                                <td className="text-right py-2">{detalle.cantidad}</td>
                                                <td className="text-right py-2">${detalle.precio_venta.toFixed(2)}</td>
                                                <td className="text-right py-2">
                                                    ${(detalle.cantidad * detalle.precio_venta).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3} className="text-right font-semibold py-2">Total:</td>
                                            <td className="text-right font-semibold py-2">${resumen.totalVenta.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detalles de Pago */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalles de Pago</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {venta.pagos.map((pago) => (
                                    <div key={pago.id} className="border rounded-lg p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <h4 className="font-semibold mb-2">Método:</h4>
                                                <p className="text-muted-foreground">{pago.via.nombre}</p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold mb-2">Moneda:</h4>
                                                <p className="text-muted-foreground">{pago.moneda.nombre}</p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold mb-2">Monto Original:</h4>
                                                <p className="text-muted-foreground">
                                                    {pago.monto_original.toFixed(2)} {pago.moneda.simbolo}
                                                </p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold mb-2">Equivalente USD:</h4>
                                                <p className="text-muted-foreground">
                                                    ${pago.monto_equivalente_usd.toFixed(2)} USD
                                                </p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold mb-2">Tasa Cambio:</h4>
                                                <p className="text-muted-foreground">{pago.tasa_cambio_aplicada.toFixed(6)}</p>
                                            </div>
                                            <div>
                                                <h4 className="font-semibold mb-2">Cuenta:</h4>
                                                <p className="text-muted-foreground">
                                                    {pago.cuenta.nombre} ({pago.moneda.nombre})
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}