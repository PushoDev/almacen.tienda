import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { sileo } from '@/lib/sileo';
import { AlmacenProps, CategoriasProps } from '@/types';
import { Edit2, HardDriveUpload, Package, Trash2Icon, Warehouse, X } from 'lucide-react';
import { useState } from 'react';

/** Una línea de la compra (producto + cantidad + precio + almacén destino). */
export interface LineaCompra {
    id: number;
    almacen_id: number;
    producto: string;
    marca?: string;
    modelo?: string;
    capacidad?: string;
    color?: string;
    categoria: string;
    codigo: string;
    codigo_barras?: string;
    cantidad: number;
    precio: number;
}

interface BorradorLinea {
    almacen_id: string;
    producto: string;
    marca: string;
    modelo: string;
    capacidad: string;
    color: string;
    categoria: string;
    codigo: string;
    cantidad: string;
    precio: string;
}

interface CompraListaProductosProps {
    productos: LineaCompra[];
    almacenes: AlmacenProps[];
    categorias: CategoriasProps[];
    onActualizar: (linea: LineaCompra) => void;
    onEliminar: (id: number) => void;
}

const formatearUsd = (monto: number) => `$${monto.toFixed(2)}`;

/**
 * Lista de los productos a comprar, con el diálogo "Editar Producto". La edición trabaja sobre un
 * borrador propio: ya no pisa el formulario de alta que el usuario pueda tener a medias.
 */
export default function CompraListaProductos({ productos, almacenes, categorias, onActualizar, onEliminar }: CompraListaProductosProps) {
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [borrador, setBorrador] = useState<BorradorLinea | null>(null);

    // Fix del Combobox (@base-ui/react) roto dentro de un AlertDialog (Radix): el popup se porta a <body>
    // por defecto, queda fuera del focus-trap del diálogo y el click con mouse no selecciona nada (ver
    // docs/pendiente-combobox-reemplazo.md). Se pasa el contenido del propio diálogo como contenedor.
    const [contenedor, setContenedor] = useState<HTMLElement | undefined>(undefined);
    const resolverContenedor = (node: HTMLElement | null) => {
        const encontrado = node?.closest('[data-slot="alert-dialog-content"]');
        if (encontrado instanceof HTMLElement) {
            setContenedor(encontrado);
        }
    };

    const totalImporte = productos.reduce((total, p) => total + p.cantidad * p.precio, 0);
    const totalUnidades = productos.reduce((total, p) => total + p.cantidad, 0);

    const abrirEdicion = (linea: LineaCompra) => {
        setBorrador({
            almacen_id: linea.almacen_id.toString(),
            producto: linea.producto,
            marca: linea.marca || '',
            modelo: linea.modelo || '',
            capacidad: linea.capacidad || '',
            color: linea.color || '',
            categoria: linea.categoria,
            codigo: linea.codigo,
            cantidad: String(linea.cantidad),
            precio: String(linea.precio),
        });
        setEditandoId(linea.id);
    };

    const cerrarEdicion = () => {
        setEditandoId(null);
        setBorrador(null);
    };

    const cambiarCampo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setBorrador((anterior) =>
            anterior ? { ...anterior, [name]: name === 'precio' || name === 'cantidad' ? value : value.toUpperCase() } : anterior,
        );
    };

    const guardar = () => {
        if (!borrador || editandoId === null) return;

        const cantidad = parseInt(borrador.cantidad) || 0;
        const precio = parseFloat(borrador.precio) || 0;

        if (!borrador.producto.trim() || !borrador.categoria.trim() || cantidad <= 0 || precio <= 0 || !borrador.almacen_id) {
            sileo.warning({
                title: 'Faltan datos',
                description: 'Completa los campos obligatorios válidos (Producto, Categoría, Cantidad, Precio y Almacén).',
            });
            return;
        }

        onActualizar({
            id: editandoId,
            almacen_id: parseInt(borrador.almacen_id),
            producto: borrador.producto,
            marca: borrador.marca,
            modelo: borrador.modelo,
            capacidad: borrador.capacidad,
            color: borrador.color,
            categoria: borrador.categoria,
            codigo: borrador.codigo,
            cantidad,
            precio,
        });

        cerrarEdicion();
        sileo.success({ title: 'Producto actualizado', description: 'Los cambios se guardaron correctamente.' });
    };

    const almacenSeleccionado = borrador ? almacenes.find((a) => a.id.toString() === borrador.almacen_id) || null : null;
    const categoriaSeleccionada = borrador ? categorias.find((c) => c.nombre_categoria === borrador.categoria) || null : null;

    return (
        <>
            <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                            <Package className="h-5 w-5" />
                        </div>
                        <div className="flex flex-1 items-center justify-between">
                            <CardTitle className="text-base font-semibold text-white">Lista de los Productos a Comprar</CardTitle>
                            <Badge variant="outline" className="border-white/30 bg-white/20 text-white backdrop-blur-sm">
                                {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                <TableHead>Producto</TableHead>
                                <TableHead>Marca</TableHead>
                                <TableHead>Modelo</TableHead>
                                <TableHead>Capacidad</TableHead>
                                <TableHead>Color</TableHead>
                                <TableHead>Almacén</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>Cant.</TableHead>
                                <TableHead>Precio</TableHead>
                                <TableHead>Importe</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="[&>tr:nth-child(even)]:bg-muted/40">
                            {productos.length === 0 && (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={12} className="text-muted-foreground h-24 text-center">
                                        Todavía no agregaste productos a esta compra.
                                    </TableCell>
                                </TableRow>
                            )}
                            {productos.map((p) => {
                                const almacen = almacenes.find((a) => a.id === p.almacen_id);

                                return (
                                    <TableRow key={p.id} className={!almacen ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                                        <TableCell className="font-medium">{p.producto}</TableCell>
                                        <TableCell>{p.marca || 'N/A'}</TableCell>
                                        <TableCell>{p.modelo || 'N/A'}</TableCell>
                                        <TableCell>{p.capacidad || 'N/A'}</TableCell>
                                        <TableCell>{p.color || 'N/A'}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {almacen ? (
                                                    <>
                                                        <Warehouse className="h-4 w-4 text-gray-500" />
                                                        <span>{almacen.nombre_almacen}</span>
                                                        {almacen.tipo_almacen && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {almacen.tipo_almacen}
                                                            </Badge>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="flex items-center gap-2 text-red-600">
                                                        <X className="h-4 w-4" />
                                                        <span>Almacén no válido</span>
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{p.categoria}</TableCell>
                                        <TableCell>{p.codigo || 'ERROR'}</TableCell>
                                        <TableCell>{p.cantidad}</TableCell>
                                        <TableCell>{formatearUsd(p.precio)}</TableCell>
                                        <TableCell>{formatearUsd(p.cantidad * p.precio)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="link"
                                                className="cursor-pointer text-blue-600 hover:text-blue-800"
                                                onClick={() => abrirEdicion(p)}
                                            >
                                                <Edit2 />
                                            </Button>
                                            <Button
                                                variant="link"
                                                onClick={() => onEliminar(p.id)}
                                                className="ms-2 cursor-pointer text-red-600 hover:text-red-800"
                                            >
                                                <Trash2Icon />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={6} className="font-medium">
                                    {productos.length} {productos.length === 1 ? 'tipo de mercancía' : 'tipos de mercancía'}
                                </TableCell>
                                <TableCell className="font-medium">{totalUnidades} unidades</TableCell>
                                <TableCell colSpan={5} className="text-right text-base font-bold text-emerald-600 dark:text-emerald-400">
                                    Importe General: ${totalImporte.toFixed(2)}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </CardContent>
            </Card>

            {/* DIÁLOGO "EDITAR PRODUCTO" — un solo diálogo para toda la lista, abierto sobre la línea elegida */}
            <AlertDialog open={editandoId !== null} onOpenChange={(abierto) => !abierto && cerrarEdicion()}>
                <AlertDialogContent className="flex h-[90vh] w-[95vw] !max-w-none max-w-[1024px] flex-col p-0">
                    <AlertDialogHeader className="shrink-0 border-b bg-gradient-to-r from-fuchsia-600 to-fuchsia-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Edit2 className="h-5 w-5" />
                            </div>
                            <div>
                                <AlertDialogTitle className="text-xl text-white sm:text-2xl">Editar Producto</AlertDialogTitle>
                                <AlertDialogDescription className="text-fuchsia-100">
                                    Realiza ajustes detallados al producto. Los cambios se reflejarán en la lista de compra.
                                </AlertDialogDescription>
                            </div>
                        </div>
                    </AlertDialogHeader>

                    {borrador && (
                        <div className="grid flex-1 overflow-hidden lg:grid-cols-[1fr_380px]">
                            {/* CONTENIDO PRINCIPAL */}
                            <div className="flex flex-col gap-y-8 overflow-y-auto px-6 py-8">
                                <div className="space-y-6 rounded-lg border border-slate-200 p-6 dark:border-slate-700">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Detalles del Producto</h3>

                                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                        <div className="sm:col-span-2">
                                            <Label htmlFor="edit-producto">Nombre del Producto *</Label>
                                            <Input id="edit-producto" name="producto" value={borrador.producto} onChange={cambiarCampo} />
                                        </div>

                                        <div>
                                            <Label htmlFor="edit-marca">Marca</Label>
                                            <Input id="edit-marca" name="marca" value={borrador.marca} onChange={cambiarCampo} />
                                        </div>

                                        <div>
                                            <Label htmlFor="edit-modelo">Modelo</Label>
                                            <Input id="edit-modelo" name="modelo" value={borrador.modelo} onChange={cambiarCampo} />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <Label htmlFor="edit-capacidad">Capacidad / Tamaño</Label>
                                            <Input id="edit-capacidad" name="capacidad" value={borrador.capacidad} onChange={cambiarCampo} />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <Label htmlFor="edit-color">Color</Label>
                                            <Input
                                                id="edit-color"
                                                name="color"
                                                placeholder="Ej: Negro, Rojo, Azul"
                                                value={borrador.color}
                                                onChange={cambiarCampo}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6 rounded-lg border border-slate-200 p-6 dark:border-slate-700">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Inventario y Precio</h3>

                                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                        <div>
                                            <Label htmlFor="edit-cantidad">Cantidad *</Label>
                                            <Input
                                                id="edit-cantidad"
                                                type="number"
                                                name="cantidad"
                                                value={borrador.cantidad}
                                                onChange={cambiarCampo}
                                                min="1"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="edit-precio">Precio Unitario *</Label>
                                            <div className="relative">
                                                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                                                    $
                                                </span>
                                                <Input
                                                    id="edit-precio"
                                                    type="number"
                                                    step="0.01"
                                                    name="precio"
                                                    value={borrador.precio}
                                                    onChange={cambiarCampo}
                                                    className="pl-7"
                                                    min="0.01"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* PANEL LATERAL */}
                            <div
                                ref={resolverContenedor}
                                className="flex flex-col border-l border-slate-200 bg-slate-50/50 p-6 dark:border-slate-700 dark:bg-slate-800/20"
                            >
                                <div className="space-y-6">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Organización</h3>

                                    <div>
                                        <Label>Almacén Destino *</Label>
                                        <Combobox
                                            items={almacenes}
                                            itemToStringLabel={(item) => item.nombre_almacen}
                                            itemToStringValue={(item) => item.nombre_almacen}
                                            value={almacenSeleccionado}
                                            onValueChange={(almacen) =>
                                                setBorrador({ ...borrador, almacen_id: almacen ? almacen.id.toString() : '' })
                                            }
                                        >
                                            <ComboboxInput placeholder="Seleccione Almacén" showClear={!!borrador.almacen_id} className="uppercase" />
                                            <ComboboxContent container={contenedor}>
                                                <ComboboxEmpty>No se encontraron almacenes.</ComboboxEmpty>
                                                <ComboboxList>
                                                    {(almacen) => (
                                                        <ComboboxItem key={almacen.id} value={almacen}>
                                                            <span className="uppercase">{almacen.nombre_almacen}</span>
                                                        </ComboboxItem>
                                                    )}
                                                </ComboboxList>
                                            </ComboboxContent>
                                        </Combobox>
                                    </div>

                                    <div>
                                        <Label>Categoría *</Label>
                                        <Combobox
                                            items={categorias}
                                            itemToStringLabel={(item) => item.nombre_categoria}
                                            itemToStringValue={(item) => item.nombre_categoria}
                                            value={categoriaSeleccionada}
                                            onValueChange={(categoria) =>
                                                setBorrador({ ...borrador, categoria: categoria ? categoria.nombre_categoria : '' })
                                            }
                                        >
                                            <ComboboxInput placeholder="Seleccione o cree" showClear={!!borrador.categoria} className="uppercase" />
                                            <ComboboxContent container={contenedor}>
                                                <ComboboxEmpty>No se encontraron categorías.</ComboboxEmpty>
                                                <ComboboxList>
                                                    {(categoria) => (
                                                        <ComboboxItem key={categoria.id} value={categoria}>
                                                            {categoria.nombre_categoria}
                                                        </ComboboxItem>
                                                    )}
                                                </ComboboxList>
                                            </ComboboxContent>
                                        </Combobox>
                                    </div>

                                    <div>
                                        <Label>Código de Barras</Label>
                                        <Input value={borrador.codigo || ''} disabled />
                                    </div>
                                </div>

                                <div className="mt-auto rounded-xl border-2 border-blue-500/40 bg-blue-50/50 p-4 dark:bg-blue-900/30">
                                    <div className="flex justify-between">
                                        <span>Subtotal</span>
                                        <span className="font-bold">
                                            ${((parseInt(borrador.cantidad) || 0) * (parseFloat(borrador.precio) || 0)).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <AlertDialogFooter className="shrink-0 flex-row justify-end space-x-4 border-t px-6 py-4">
                        <AlertDialogCancel asChild>
                            <Button variant="ghost" onClick={cerrarEdicion}>
                                Cancelar
                            </Button>
                        </AlertDialogCancel>

                        <Button className="bg-fuchsia-600 text-white hover:bg-fuchsia-700" onClick={guardar}>
                            <HardDriveUpload className="mr-2 h-4 w-4" />
                            Guardar Cambios
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
