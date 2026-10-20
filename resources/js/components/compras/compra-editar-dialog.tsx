import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import { Loader2, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CompraDetalle, formatearMoneda, ProductoCompra } from './tipos-compra';

// Opciones de los selects: se cargan bajo demanda (al abrir), con las mismas rutas que usa Comprar/Index.
interface AlmacenOpcion {
    id: number;
    nombre_almacen: string;
}
interface CategoriaOpcion {
    id: number;
    nombre_categoria: string;
}
interface CuentaOpcion {
    id: number;
    nombre_cuenta: string;
    saldo_cuenta: number;
}
interface ClienteOpcion {
    id: number;
    nombre_cliente: string;
    deuda_pago_cliente: number | null;
}

interface LineaEditable {
    almacen_id: number | '';
    producto: string;
    marca: string;
    modelo: string;
    capacidad: string;
    color: string;
    categoria: string;
    codigo_barras: string;
    cantidad: number;
    precio: number;
}

interface PagoCuentaEditable {
    cuenta_id: number | '';
    monto: number;
}
interface PagoClienteEditable {
    cliente_id: number | '';
    monto: number;
}

interface CompraEditarDialogProps {
    open: boolean;
    onOpenChange: (abierto: boolean) => void;
    compra: CompraDetalle;
    productos: ProductoCompra[];
}

/**
 * Edición de una compra pendiente. Se trata como una compra nueva: reemplaza por completo las líneas y los
 * pagos (el proveedor y el tipo de compra no se editan) y exige una nota que queda auditada.
 */
export default function CompraEditarDialog({ open, onOpenChange, compra, productos }: CompraEditarDialogProps) {
    const esDeuda = compra.tipo_compra === 'deuda_proveedor';

    const [opcionesCargadas, setOpcionesCargadas] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [almacenes, setAlmacenes] = useState<AlmacenOpcion[]>([]);
    const [categorias, setCategorias] = useState<CategoriaOpcion[]>([]);
    const [cuentas, setCuentas] = useState<CuentaOpcion[]>([]);
    const [clientes, setClientes] = useState<ClienteOpcion[]>([]);

    const form = useForm({
        productos: [] as LineaEditable[],
        pagos: [] as PagoCuentaEditable[],
        pagos_clientes: [] as PagoClienteEditable[],
        permitir_deuda_parcial: false,
        nota: '',
    });

    // Al abrir: precarga el formulario con la compra actual y trae las opciones de los selects (una sola vez).
    useEffect(() => {
        if (!open) return;

        form.clearErrors();
        form.setData({
            productos: productos.map((p) => ({
                almacen_id: p.almacen.id ?? '',
                producto: p.nombre_producto,
                marca: p.marca_producto ?? '',
                modelo: p.modelo_producto ?? '',
                capacidad: p.capacidad_producto ?? '',
                color: p.color_producto ?? '',
                categoria: p.categoria ?? '',
                codigo_barras: p.codigo_producto ?? '',
                cantidad: p.pivot.cantidad,
                precio: p.pivot.precio,
            })),
            pagos: esDeuda
                ? []
                : compra.pagos.filter((pago) => pago.tipo_pago === 'cuenta').map((pago) => ({ cuenta_id: pago.cuenta?.id ?? '', monto: pago.monto })),
            pagos_clientes: esDeuda
                ? []
                : compra.pagos
                      .filter((pago) => pago.tipo_pago === 'cliente')
                      .map((pago) => ({ cliente_id: pago.cliente?.id ?? '', monto: pago.monto })),
            permitir_deuda_parcial: compra.es_parcial,
            nota: '',
        });

        if (opcionesCargadas) return;

        const cargar = async () => {
            setCargando(true);
            try {
                const [almacenesRes, categoriasRes, cuentasRes, clientesRes] = await Promise.all([
                    axios.get(route('compras.almacenes')),
                    axios.get(route('compras.categorias')),
                    axios.get(route('compras.cuentas.pago')),
                    axios.get(route('compras.clientes.fisicos')),
                ]);
                setAlmacenes(almacenesRes.data);
                setCategorias(categoriasRes.data);
                setCuentas(cuentasRes.data);
                setClientes(clientesRes.data);
                setOpcionesCargadas(true);
            } finally {
                setCargando(false);
            }
        };

        cargar();
        // Solo debe reiniciarse al abrir el diálogo.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const actualizarLinea = (index: number, cambios: Partial<LineaEditable>) => {
        form.setData(
            'productos',
            form.data.productos.map((linea, i) => (i === index ? { ...linea, ...cambios } : linea)),
        );
    };

    const agregarLinea = () => {
        form.setData('productos', [
            ...form.data.productos,
            {
                almacen_id: '',
                producto: '',
                marca: '',
                modelo: '',
                capacidad: '',
                color: '',
                categoria: '',
                codigo_barras: '',
                cantidad: 1,
                precio: 0,
            },
        ]);
    };

    const quitarLinea = (index: number) =>
        form.setData(
            'productos',
            form.data.productos.filter((_, i) => i !== index),
        );

    const agregarPagoCuenta = () => form.setData('pagos', [...form.data.pagos, { cuenta_id: '', monto: 0 }]);
    const quitarPagoCuenta = (index: number) =>
        form.setData(
            'pagos',
            form.data.pagos.filter((_, i) => i !== index),
        );

    const agregarPagoCliente = () => form.setData('pagos_clientes', [...form.data.pagos_clientes, { cliente_id: '', monto: 0 }]);
    const quitarPagoCliente = (index: number) =>
        form.setData(
            'pagos_clientes',
            form.data.pagos_clientes.filter((_, i) => i !== index),
        );

    const totalEditado = form.data.productos.reduce((acc, l) => acc + Number(l.cantidad || 0) * Number(l.precio || 0), 0);
    const totalCubierto =
        form.data.pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0) +
        form.data.pagos_clientes.reduce((acc, p) => acc + Number(p.monto || 0), 0);

    const confirmar = () => {
        form.post(route('comprar.actualizar', compra.id), {
            onSuccess: () => onOpenChange(false),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Editar Compra #{compra.id}</DialogTitle>
                    <DialogDescription>
                        Se reemplazan por completo las líneas y los pagos — como si fuera una compra nueva. El stock sigue sin tocarse hasta aprobar.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 space-y-6 overflow-y-auto px-1">
                    {cargando ? (
                        <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
                            <Loader2 className="h-4 w-4 animate-spin" /> Cargando almacenes/cuentas...
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Productos</Label>
                                    <Button type="button" size="sm" variant="outline" onClick={agregarLinea}>
                                        <PlusCircle className="mr-1.5 h-4 w-4" />
                                        Agregar línea
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {form.data.productos.map((linea, index) => (
                                        <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-12">
                                            <Input
                                                className="sm:col-span-3"
                                                placeholder="Producto"
                                                value={linea.producto}
                                                onChange={(e) => actualizarLinea(index, { producto: e.target.value })}
                                            />
                                            <Input
                                                className="sm:col-span-2"
                                                placeholder="Categoría"
                                                list={`categorias-lote-${index}`}
                                                value={linea.categoria}
                                                onChange={(e) => actualizarLinea(index, { categoria: e.target.value })}
                                            />
                                            <datalist id={`categorias-lote-${index}`}>
                                                {categorias.map((c) => (
                                                    <option key={c.id} value={c.nombre_categoria} />
                                                ))}
                                            </datalist>
                                            <Input
                                                className="sm:col-span-2"
                                                placeholder="Marca"
                                                value={linea.marca}
                                                onChange={(e) => actualizarLinea(index, { marca: e.target.value })}
                                            />
                                            <Input
                                                className="sm:col-span-2"
                                                placeholder="Modelo"
                                                value={linea.modelo}
                                                onChange={(e) => actualizarLinea(index, { modelo: e.target.value })}
                                            />
                                            <Select
                                                value={linea.almacen_id ? String(linea.almacen_id) : ''}
                                                onValueChange={(v) => actualizarLinea(index, { almacen_id: Number(v) })}
                                            >
                                                <SelectTrigger className="sm:col-span-3">
                                                    <SelectValue placeholder="Almacén" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {almacenes.map((a) => (
                                                        <SelectItem key={a.id} value={String(a.id)}>
                                                            {a.nombre_almacen}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Input
                                                className="sm:col-span-2"
                                                type="number"
                                                min={1}
                                                placeholder="Cantidad"
                                                value={linea.cantidad}
                                                onChange={(e) => actualizarLinea(index, { cantidad: Number(e.target.value) })}
                                            />
                                            <Input
                                                className="sm:col-span-2"
                                                type="number"
                                                step="0.01"
                                                min={0.01}
                                                placeholder="Precio"
                                                value={linea.precio}
                                                onChange={(e) => actualizarLinea(index, { precio: Number(e.target.value) })}
                                            />
                                            <Input
                                                className="sm:col-span-3"
                                                placeholder="Código de barras (opcional)"
                                                value={linea.codigo_barras}
                                                onChange={(e) => actualizarLinea(index, { codigo_barras: e.target.value })}
                                            />
                                            <div className="flex items-center justify-end sm:col-span-2">
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className="text-destructive"
                                                    disabled={form.data.productos.length <= 1}
                                                    onClick={() => quitarLinea(index)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-sm font-semibold">Total: {formatearMoneda(totalEditado)}</p>
                                {form.errors.productos && <p className="text-sm text-red-600">{form.errors.productos}</p>}
                            </div>

                            {!esDeuda && (
                                <div className="space-y-3 border-t pt-4">
                                    <div className="flex items-center justify-between">
                                        <Label>Pagos con cuenta</Label>
                                        <Button type="button" size="sm" variant="outline" onClick={agregarPagoCuenta}>
                                            <PlusCircle className="mr-1.5 h-4 w-4" />
                                            Agregar
                                        </Button>
                                    </div>
                                    {form.data.pagos.map((pago, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Select
                                                value={pago.cuenta_id ? String(pago.cuenta_id) : ''}
                                                onValueChange={(v) =>
                                                    form.setData(
                                                        'pagos',
                                                        form.data.pagos.map((p, i) => (i === index ? { ...p, cuenta_id: Number(v) } : p)),
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue placeholder="Cuenta" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {cuentas.map((c) => (
                                                        <SelectItem key={c.id} value={String(c.id)}>
                                                            {c.nombre_cuenta} (${c.saldo_cuenta.toFixed(2)})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                className="w-32"
                                                placeholder="Monto"
                                                value={pago.monto}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'pagos',
                                                        form.data.pagos.map((p, i) => (i === index ? { ...p, monto: Number(e.target.value) } : p)),
                                                    )
                                                }
                                            />
                                            <Button type="button" size="icon" variant="ghost" onClick={() => quitarPagoCuenta(index)}>
                                                <Trash2 className="text-destructive h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}

                                    <div className="flex items-center justify-between pt-2">
                                        <Label>Pagos con cliente (deuda usada como pago)</Label>
                                        <Button type="button" size="sm" variant="outline" onClick={agregarPagoCliente}>
                                            <PlusCircle className="mr-1.5 h-4 w-4" />
                                            Agregar
                                        </Button>
                                    </div>
                                    {form.data.pagos_clientes.map((pago, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Select
                                                value={pago.cliente_id ? String(pago.cliente_id) : ''}
                                                onValueChange={(v) =>
                                                    form.setData(
                                                        'pagos_clientes',
                                                        form.data.pagos_clientes.map((p, i) => (i === index ? { ...p, cliente_id: Number(v) } : p)),
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue placeholder="Cliente" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {clientes.map((c) => (
                                                        <SelectItem key={c.id} value={String(c.id)}>
                                                            {c.nombre_cliente}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                className="w-32"
                                                placeholder="Monto"
                                                value={pago.monto}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'pagos_clientes',
                                                        form.data.pagos_clientes.map((p, i) =>
                                                            i === index ? { ...p, monto: Number(e.target.value) } : p,
                                                        ),
                                                    )
                                                }
                                            />
                                            <Button type="button" size="icon" variant="ghost" onClick={() => quitarPagoCliente(index)}>
                                                <Trash2 className="text-destructive h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}

                                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={form.data.permitir_deuda_parcial}
                                            onCheckedChange={(marcado) => form.setData('permitir_deuda_parcial', marcado === true)}
                                        />
                                        Permitir completar con deuda si no alcanza
                                    </label>

                                    <p className="text-sm">
                                        Cubierto: <span className="font-semibold">{formatearMoneda(totalCubierto)}</span> de{' '}
                                        <span className="font-semibold">{formatearMoneda(totalEditado)}</span>
                                    </p>
                                    {(form.errors.pagos || form.errors.pagos_clientes) && (
                                        <p className="text-sm text-red-600">Revisa los pagos — deben cubrir el total (o quedar como deuda).</p>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2 border-t pt-4">
                                <Label htmlFor="nota_edicion">Nota (obligatoria)</Label>
                                <Textarea
                                    id="nota_edicion"
                                    value={form.data.nota}
                                    onChange={(e) => form.setData('nota', e.target.value)}
                                    placeholder="¿Por qué se edita esta compra?"
                                    rows={2}
                                />
                                {form.errors.nota && <p className="text-sm text-red-600">{form.errors.nota}</p>}
                            </div>

                            {form.errors.error && <p className="text-sm text-red-600">{form.errors.error}</p>}
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={form.processing}>
                        Cancelar
                    </Button>
                    <Button onClick={confirmar} disabled={form.processing || cargando}>
                        {form.processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
