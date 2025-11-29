import { PageProps, Producto, Moneda, Cuenta, Via } from '@/types'
import { Head, router } from '@inertiajs/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Trash2, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'

interface VentaFormProps extends PageProps {
    venta?: {
        id?: number
        total: number
        tasa_cambio: number
        detalles: Array<{
            id?: number
            producto_id: number
            producto: Producto
            cantidad: number
            precio_venta: number
        }>
        pagos: Array<{
            id?: number
            moneda_id: number
            monto_original: number
            monto_equivalente_usd: number
            tasa_cambio_aplicada: number
            cuenta_id: number
            via_id: number
        }>
    }
    monedas: Moneda[]
    cuentas: Cuenta[]
    productos: Producto[]
}

export default function VentaForm({ venta, monedas, cuentas, productos }: VentaFormProps) {
    const isEdit = !!venta?.id
    const [detalles, setDetalles] = useState<any[]>(venta?.detalles || [{ producto_id: '', cantidad: 1, precio_venta: 0 }])
    const [pagos, setPagos] = useState<any[]>(venta?.pagos || [{ moneda_id: '', monto: 0, tasa_cambio: 1, cuenta_id: '', via_id: '' }])
    const [tasaCambioGeneral, setTasaCambioGeneral] = useState(venta?.tasa_cambio || 1)
    const [errors, setErrors] = useState<Record<string, string[]>>({})

    // Calcular totales
    const totalVenta = detalles.reduce((sum, detalle) => {
        const producto = productos.find(p => p.id === detalle.producto_id)
        if (producto && detalle.cantidad && detalle.precio_venta) {
            return sum + (detalle.cantidad * detalle.precio_venta)
        }
        return sum
    }, 0)

    const totalPagado = pagos.reduce((sum, pago) => {
        if (pago.monto && pago.tasa_cambio) {
            return sum + (pago.monto / pago.tasa_cambio)
        }
        return sum
    }, 0)

    const handleDetalleChange = (index: number, field: string, value: any) => {
        const newDetalles = [...detalles]
        newDetalles[index] = { ...newDetalles[index], [field]: value }
        setDetalles(newDetalles)
    }

    const addDetalle = () => {
        setDetalles([...detalles, { producto_id: '', cantidad: 1, precio_venta: 0 }])
    }

    const removeDetalle = (index: number) => {
        if (detalles.length > 1) {
            const newDetalles = [...detalles]
            newDetalles.splice(index, 1)
            setDetalles(newDetalles)
        }
    }

    const handlePagoChange = (index: number, field: string, value: any) => {
        const newPagos = [...pagos]
        newPagos[index] = { ...newPagos[index], [field]: value }
        setPagos(newPagos)
    }

    const addPago = () => {
        setPagos([...pagos, { moneda_id: '', monto: 0, tasa_cambio: 1, cuenta_id: '', via_id: '' }])
    }

    const removePago = (index: number) => {
        if (pagos.length > 1) {
            const newPagos = [...pagos]
            newPagos.splice(index, 1)
            setPagos(newPagos)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        
        const formData = {
            detalles: detalles.map(detalle => ({
                producto_id: Number(detalle.producto_id),
                cantidad: Number(detalle.cantidad),
                precio_venta: Number(detalle.precio_venta)
            })),
            pagos: pagos.map(pago => ({
                moneda_id: Number(pago.moneda_id),
                monto: Number(pago.monto),
                tasa_cambio: Number(pago.tasa_cambio),
                cuenta_id: Number(pago.cuenta_id),
                via_id: Number(pago.via_id)
            })),
            tasa_cambio: Number(tasaCambioGeneral)
        }

        if (isEdit && venta?.id) {
            router.put(route('ventas.update', venta.id), formData, {
                onError: (errors) => setErrors(errors),
                onSuccess: () => router.visit(route('ventas.show', venta.id))
            })
        } else {
            router.post(route('ventas.store'), formData, {
                onError: (errors) => setErrors(errors),
                onSuccess: (page) => {
                    const ventaId = page.props?.venta?.id || page?.venta?.id
                    if (ventaId) {
                        router.visit(route('ventas.show', ventaId))
                    }
                }
            })
        }
    }

    return (
        <div className="container mx-auto py-6 px-4">
            <Head title={isEdit ? `Editar Venta #${venta.id}` : 'Nueva Venta'} />
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">
                    {isEdit ? `Editar Venta #${venta.id}` : 'Nueva Venta'}
                </h1>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Resumen de la Venta */}
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>Resumen de la Venta</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between">
                                <span>Total de la Venta:</span>
                                <span className="font-semibold">${totalVenta.toFixed(2)} USD</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Total Pagado:</span>
                                <span className="font-semibold">${totalPagado.toFixed(2)} USD</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Restante por Pagar:</span>
                                <span className={`font-semibold ${totalVenta - totalPagado > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ${(totalVenta - totalPagado).toFixed(2)} USD
                                </span>
                            </div>
                            
                            <div className="pt-4">
                                <Label htmlFor="tasa_cambio_general">Tasa de Cambio General</Label>
                                <Input
                                    id="tasa_cambio_general"
                                    type="number"
                                    step="0.000001"
                                    value={tasaCambioGeneral}
                                    onChange={(e) => setTasaCambioGeneral(Number(e.target.value))}
                                    className="mt-1"
                                />
                                {errors.tasa_cambio && (
                                    <p className="text-red-600 text-sm mt-1">{errors.tasa_cambio[0]}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Detalles de la Venta */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Detalles de Productos</CardTitle>
                                <Button type="button" onClick={addDetalle} size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Agregar Producto
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {detalles.map((detalle, index) => (
                                        <div key={index} className="border rounded-lg p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                                <div>
                                                    <Label htmlFor={`producto_${index}`}>Producto</Label>
                                                    <Select
                                                        value={detalle.producto_id}
                                                        onValueChange={(value) => handleDetalleChange(index, 'producto_id', value)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccionar producto" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {productos.map(producto => (
                                                                <SelectItem key={producto.id} value={producto.id.toString()}>
                                                                    {producto.nombre}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors[`detalles.${index}.producto_id`] && (
                                                        <p className="text-red-600 text-sm mt-1">{errors[`detalles.${index}.producto_id`][0]}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor={`cantidad_${index}`}>Cantidad</Label>
                                                    <Input
                                                        id={`cantidad_${index}`}
                                                        type="number"
                                                        min="1"
                                                        value={detalle.cantidad}
                                                        onChange={(e) => handleDetalleChange(index, 'cantidad', e.target.value)}
                                                    />
                                                    {errors[`detalles.${index}.cantidad`] && (
                                                        <p className="text-red-600 text-sm mt-1">{errors[`detalles.${index}.cantidad`][0]}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor={`precio_venta_${index}`}>Precio Venta (USD)</Label>
                                                    <Input
                                                        id={`precio_venta_${index}`}
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={detalle.precio_venta}
                                                        onChange={(e) => handleDetalleChange(index, 'precio_venta', e.target.value)}
                                                    />
                                                    {errors[`detalles.${index}.precio_venta`] && (
                                                        <p className="text-red-600 text-sm mt-1">{errors[`detalles.${index}.precio_venta`][0]}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-end">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => removeDetalle(index)}
                                                        disabled={detalles.length <= 1}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Detalles de Pago */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Detalles de Pago</CardTitle>
                                <Button type="button" onClick={addPago} size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Agregar Pago
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {pagos.map((pago, index) => (
                                        <div key={index} className="border rounded-lg p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                                <div>
                                                    <Label htmlFor={`moneda_${index}`}>Moneda</Label>
                                                    <Select
                                                        value={pago.moneda_id}
                                                        onValueChange={(value) => handlePagoChange(index, 'moneda_id', value)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccionar moneda" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {monedas.map(moneda => (
                                                                <SelectItem key={moneda.id} value={moneda.id.toString()}>
                                                                    {moneda.nombre}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors[`pagos.${index}.moneda_id`] && (
                                                        <p className="text-red-600 text-sm mt-1">{errors[`pagos.${index}.moneda_id`][0]}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor={`monto_${index}`}>Monto</Label>
                                                    <Input
                                                        id={`monto_${index}`}
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={pago.monto || ''}
                                                        onChange={(e) => handlePagoChange(index, 'monto', e.target.value)}
                                                    />
                                                    {errors[`pagos.${index}.monto`] && (
                                                        <p className="text-red-600 text-sm mt-1">{errors[`pagos.${index}.monto`][0]}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor={`tasa_cambio_pago_${index}`}>Tasa Cambio</Label>
                                                    <Input
                                                        id={`tasa_cambio_pago_${index}`}
                                                        type="number"
                                                        step="0.000001"
                                                        min="0.000001"
                                                        value={pago.tasa_cambio || ''}
                                                        onChange={(e) => handlePagoChange(index, 'tasa_cambio', e.target.value)}
                                                    />
                                                    {errors[`pagos.${index}.tasa_cambio`] && (
                                                        <p className="text-red-600 text-sm mt-1">{errors[`pagos.${index}.tasa_cambio`][0]}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor={`cuenta_${index}`}>Cuenta</Label>
                                                    <Select
                                                        value={pago.cuenta_id}
                                                        onValueChange={(value) => handlePagoChange(index, 'cuenta_id', value)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccionar cuenta" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {cuentas.map(cuenta => (
                                                                <SelectItem key={cuenta.id} value={cuenta.id.toString()}>
                                                                    {cuenta.nombre}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors[`pagos.${index}.cuenta_id`] && (
                                                        <p className="text-red-600 text-sm mt-1">{errors[`pagos.${index}.cuenta_id`][0]}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-end">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => removePago(index)}
                                                        disabled={pagos.length <= 1}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-4">
                    <Button type="submit" className="px-6">
                        {isEdit ? 'Actualizar Venta' : 'Crear Venta'}
                    </Button>
                </div>
            </form>
        </div>
    )
}