import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Separator } from '@/components/ui/separator';
import { sileo } from '@/lib/sileo';
import { cn } from '@/lib/utils';
import { AlmacenProps, CategoriasProps } from '@/types';
import axios from 'axios';
import { Info, Loader2, PlusCircle, PlusIcon, Warehouse } from 'lucide-react';
import { Ref, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { LineaCompra } from './compra-lista-productos';

/** Línea lista para agregar a la compra (el id lo asigna quien la recibe). */
export type NuevaLineaCompra = Omit<LineaCompra, 'id'>;

/** Acciones que el padre puede pedirle al formulario (crear almacén/categoría, compra registrada). */
export interface FormularioProductoHandle {
    seleccionarAlmacen: (id: number) => void;
    seleccionarCategoria: (nombre: string) => void;
    reiniciar: () => void;
}

interface ProductoExistente {
    id: number;
    nombre_producto: string;
    marca_producto: string | null;
    modelo_producto: string | null;
    capacidad_producto: string | null;
    categoria: string | null;
    precio_compra_producto: number;
    cantidad_total: number;
    stock_por_almacen: { almacen_id: number; nombre_almacen: string; cantidad: number }[];
}

type CampoAutocompletable = 'producto' | 'marca' | 'modelo';

interface BorradorProducto {
    almacen_id: string;
    producto: string;
    marca: string;
    modelo: string;
    capacidad: string;
    color: string;
    categoria: string;
    cantidad: string;
    precio: string;
}

const borradorVacio = (almacenId: string): BorradorProducto => ({
    almacen_id: almacenId,
    producto: '',
    marca: '',
    modelo: '',
    capacidad: '',
    color: '',
    categoria: '',
    cantidad: '',
    precio: '',
});

// Código de 14 caracteres: 3 del nombre + 3 de la marca + 3 del modelo + dígitos de la capacidad,
// completado con dígitos al azar. Es solo la vista previa/propuesta: el servidor lo guarda como código de barras.
const generarCodigoLocal = (producto: string, marca: string, modelo: string, capacidad: string): string => {
    const limpiarYCortar = (valor: string | undefined): string => {
        if (!valor) return '';

        return valor
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 3);
    };

    const nombre = limpiarYCortar(producto).replace(/[^A-Z]/g, '');
    const marcaLimpia = limpiarYCortar(marca);
    const modeloLimpio = limpiarYCortar(modelo);
    const capacidadNumeros = (capacidad || '').replace(/[^0-9]/g, '');

    let parteFija = nombre.padEnd(3, 'X') + marcaLimpia.padEnd(3, 'X') + modeloLimpio.padEnd(3, 'X') + capacidadNumeros;

    if (parteFija.length > 14) {
        parteFija = parteFija.substring(0, 14);
    }

    let codigo = parteFija;
    const longitudRestante = 14 - codigo.length;

    if (longitudRestante > 0) {
        let digitosAlAzar = '';
        for (let i = 0; i < longitudRestante; i++) {
            digitosAlAzar += Math.floor(Math.random() * 10).toString();
        }
        codigo += digitosAlAzar;
    }

    return codigo.substring(0, 14);
};

// Dropdown de sugerencias de productos existentes, compartido por los 3 campos que disparan el
// autocompletado (Nombre, Marca, Modelo). Componente de primer nivel (no anidado) para no perder
// estado en cada render del formulario.
function ProductoSugerenciasDropdown({
    mostrar,
    buscando,
    sugerencias,
    resaltada,
    onResaltar,
    onSeleccionar,
}: {
    mostrar: boolean;
    buscando: boolean;
    sugerencias: ProductoExistente[];
    resaltada: number;
    onResaltar: (index: number) => void;
    onSeleccionar: (producto: ProductoExistente) => void;
}) {
    if (!mostrar) return null;

    return (
        <div className="bg-popover absolute top-full left-0 z-50 mt-1 w-full max-w-sm rounded-md border shadow-lg">
            {buscando ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 p-3 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando...
                </div>
            ) : sugerencias.length > 0 ? (
                <ul className="max-h-64 overflow-y-auto py-1">
                    {sugerencias.map((p, index) => (
                        <li
                            key={p.id}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                onSeleccionar(p);
                            }}
                            onMouseEnter={() => onResaltar(index)}
                            className={cn('cursor-pointer px-3 py-2 text-sm', index === resaltada ? 'bg-accent' : 'hover:bg-accent')}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">{p.nombre_producto}</span>
                                <Badge variant={p.cantidad_total > 0 ? 'outline' : 'destructive'} className="shrink-0 text-xs">
                                    {p.cantidad_total} en stock
                                </Badge>
                            </div>
                            <p className="text-muted-foreground text-xs">
                                {[p.marca_producto, p.modelo_producto, p.capacidad_producto].filter(Boolean).join(' · ') || 'Sin especificaciones'}
                                {' — Costo actual: '}
                                <span className="font-medium">${p.precio_compra_producto.toFixed(2)}</span>
                            </p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-muted-foreground p-3 text-sm">No existe — se creará un producto nuevo.</p>
            )}
        </div>
    );
}

interface CompraFormularioProductoProps {
    ref?: Ref<FormularioProductoHandle>;
    almacenes: AlmacenProps[];
    categorias: CategoriasProps[];
    /** Alguna línea de la lista quedó sin almacén (se avisa debajo del selector de almacén). */
    hayLineaSinAlmacen: boolean;
    /** Compra del casillero: el almacén se elige cuando la mercancía llega, así que no se pide al comprar. */
    almacenOpcional?: boolean;
    errorCategorias?: string;
    onAgregar: (linea: NuevaLineaCompra) => void;
    onCrearAlmacen: () => void;
    onCrearCategoria: () => void;
}

/**
 * Formulario "Ingrese Datos del Producto a Comprar": identificación con autocompletado de productos
 * existentes, destino y categoría, y datos comerciales. Valida y entrega la línea a `onAgregar`.
 */
export default function CompraFormularioProducto({
    ref,
    almacenes,
    categorias,
    hayLineaSinAlmacen,
    almacenOpcional = false,
    errorCategorias,
    onAgregar,
    onCrearAlmacen,
    onCrearCategoria,
}: CompraFormularioProductoProps) {
    const [borrador, setBorrador] = useState<BorradorProducto>(borradorVacio(''));
    // El último almacén elegido se conserva entre producto y producto (se suelen cargar varios al mismo).
    const [ultimoAlmacenId, setUltimoAlmacenId] = useState('');

    // Autocompletado de productos existentes (evita duplicados y avisa antes de pisar el costo). Un solo
    // estado para los 3 campos que pueden dispararlo; `campoEnFoco` dice cuál dropdown se muestra.
    const [sugerencias, setSugerencias] = useState<ProductoExistente[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [campoEnFoco, setCampoEnFoco] = useState<CampoAutocompletable | null>(null);
    // Índice resaltado (teclado ↑/↓ y mouse comparten el estado). -1 = nada resaltado.
    const [sugerenciaResaltada, setSugerenciaResaltada] = useState(-1);
    const [productoCoincidente, setProductoCoincidente] = useState<ProductoExistente | null>(null);
    const recienSeleccionadoRef = useRef(false);

    const almacenSeleccionado = almacenes.find((a) => a.id.toString() === borrador.almacen_id) || null;
    const categoriaSeleccionada = categorias.find((c) => c.nombre_categoria === borrador.categoria) || null;

    const codigoPreview = borrador.producto ? generarCodigoLocal(borrador.producto, borrador.marca, borrador.modelo, borrador.capacidad) : '';

    const seleccionarAlmacen = (id: string) => {
        setBorrador((anterior) => ({ ...anterior, almacen_id: id }));
        setUltimoAlmacenId(id);
    };

    const reiniciar = () => {
        setBorrador(borradorVacio(ultimoAlmacenId));
        setProductoCoincidente(null);
        setCampoEnFoco(null);
    };

    useImperativeHandle(ref, () => ({
        seleccionarAlmacen: (id) => seleccionarAlmacen(id.toString()),
        seleccionarCategoria: (nombre) => setBorrador((anterior) => ({ ...anterior, categoria: nombre })),
        reiniciar,
    }));

    // Búsqueda debounced de productos existentes, desde Nombre, Marca o Modelo (el backend ya busca por
    // los 3 campos, ver Producto::scopeBuscar).
    useEffect(() => {
        // No re-buscar ni reabrir el dropdown cuando el texto cambió por elegir una sugerencia.
        if (recienSeleccionadoRef.current) {
            recienSeleccionadoRef.current = false;

            return;
        }

        if (!campoEnFoco) return;

        const termino = borrador[campoEnFoco].trim();
        if (termino.length < 2) {
            setSugerencias([]);
            setSugerenciaResaltada(-1);

            return;
        }

        const buscar = async () => {
            setBuscando(true);
            try {
                const respuesta = await axios.get(route('compras.productos.buscar'), { params: { search: termino } });
                setSugerencias(respuesta.data);
                setSugerenciaResaltada(-1);
            } catch (error) {
                console.error('Error buscando productos existentes:', error);
            } finally {
                setBuscando(false);
            }
        };

        const temporizador = setTimeout(buscar, 300);

        return () => clearTimeout(temporizador);
        // Solo interesan los 3 campos de búsqueda y cuál está enfocado.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [borrador.producto, borrador.marca, borrador.modelo, campoEnFoco]);

    const cambiarCampo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setBorrador((anterior) => ({ ...anterior, [name]: name === 'precio' || name === 'cantidad' ? value : value.toUpperCase() }));

        // Si sigue editando a mano después de elegir una sugerencia, el aviso queda desactualizado.
        if (productoCoincidente && (name === 'producto' || name === 'marca' || name === 'modelo')) {
            setProductoCoincidente(null);
        }
    };

    // Autocompleta marca/modelo/capacidad/categoría desde un producto existente. El color y el precio NO
    // se rellenan: el color suele distinguir la unidad real y el precio se deja en blanco a propósito para
    // compararlo contra el costo actual (mostrado abajo) sin arrastrarlo sin darse cuenta.
    const seleccionarProductoExistente = (producto: ProductoExistente) => {
        recienSeleccionadoRef.current = true;
        setBorrador((anterior) => ({
            ...anterior,
            producto: producto.nombre_producto,
            marca: producto.marca_producto || '',
            modelo: producto.modelo_producto || '',
            capacidad: producto.capacidad_producto || '',
            categoria: producto.categoria || '',
        }));
        setProductoCoincidente(producto);
        setCampoEnFoco(null);
        setSugerencias([]);
    };

    const agregar = () => {
        const cantidad = parseInt(borrador.cantidad) || 0;
        const precio = parseFloat(borrador.precio) || 0;

        if (!borrador.producto || !borrador.categoria || cantidad <= 0 || precio <= 0 || (!almacenOpcional && !borrador.almacen_id)) {
            sileo.warning({
                title: 'Faltan datos',
                description: almacenOpcional
                    ? 'Completa los campos obligatorios (Producto, Categoría, Cantidad y Precio).'
                    : 'Completa los campos obligatorios (Producto, Categoría, Cantidad, Precio y Almacén).',
            });

            return;
        }

        onAgregar({
            almacen_id: almacenOpcional || !borrador.almacen_id ? null : parseInt(borrador.almacen_id),
            producto: borrador.producto,
            marca: borrador.marca,
            modelo: borrador.modelo,
            capacidad: borrador.capacidad,
            color: borrador.color,
            categoria: borrador.categoria,
            codigo: generarCodigoLocal(borrador.producto, borrador.marca, borrador.modelo, borrador.capacidad),
            cantidad,
            precio,
        });

        reiniciar();
    };

    // Enter en cualquier campo de texto agrega el producto, para no depender del mouse al cargar varias
    // líneas seguidas. Los Combobox (Almacén/Categoría) quedan afuera: Enter ahí lo usa el propio combobox.
    const enterAgrega = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            agregar();
        }
    };

    // Igual que enterAgrega, pero en Nombre/Marca/Modelo, que además disparan el dropdown: con el dropdown
    // abierto, ↑/↓ mueven el resaltado y Enter selecciona la sugerencia resaltada en vez de agregar.
    const teclaAutocompletar = (e: React.KeyboardEvent<HTMLInputElement>, campo: CampoAutocompletable) => {
        const dropdownAbierto = campoEnFoco === campo && borrador[campo].trim().length >= 2 && sugerencias.length > 0;

        if (dropdownAbierto) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSugerenciaResaltada((i) => (i + 1) % sugerencias.length);

                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSugerenciaResaltada((i) => (i <= 0 ? sugerencias.length - 1 : i - 1));

                return;
            }
            if (e.key === 'Enter' && sugerenciaResaltada >= 0) {
                e.preventDefault();
                seleccionarProductoExistente(sugerencias[sugerenciaResaltada]);

                return;
            }
            if (e.key === 'Escape') {
                setCampoEnFoco(null);

                return;
            }
        }

        enterAgrega(e);
    };

    const campoAutocompletable = (campo: CampoAutocompletable, etiqueta: string, placeholder: string) => (
        <Field className="relative">
            <FieldLabel htmlFor={`${campo}_producto`}>{etiqueta}</FieldLabel>
            <Input
                type="text"
                name={campo}
                placeholder={placeholder}
                autoComplete="off"
                value={borrador[campo]}
                onChange={cambiarCampo}
                onFocus={() => setCampoEnFoco(campo)}
                onBlur={() => setTimeout(() => setCampoEnFoco((c) => (c === campo ? null : c)), 150)}
                onKeyDown={(e) => teclaAutocompletar(e, campo)}
            />
            <ProductoSugerenciasDropdown
                mostrar={campoEnFoco === campo && borrador[campo].trim().length >= 2}
                buscando={buscando}
                sugerencias={sugerencias}
                resaltada={sugerenciaResaltada}
                onResaltar={setSugerenciaResaltada}
                onSeleccionar={seleccionarProductoExistente}
            />
        </Field>
    );

    // El stock es por almacén; el costo (precio_compra_producto) es la última referencia conocida. El
    // servidor reusa la ficha existente cuando nombre+categoría+marca+modelo+capacidad coinciden EXACTO
    // (mismo criterio que Producto::fichasHermanas()): la compra pasa a ser un lote nuevo bajo esa ficha,
    // con su propio costo real por almacén. Si algún campo no coincide exacto, crea una ficha separada.
    const avisoProductoExistente = productoCoincidente
        ? (() => {
              const stockEnEsteAlmacen = almacenSeleccionado
                  ? (productoCoincidente.stock_por_almacen.find((s) => s.almacen_id === almacenSeleccionado.id)?.cantidad ?? 0)
                  : null;

              const esIdentidadExacta =
                  productoCoincidente.nombre_producto === borrador.producto.trim() &&
                  (productoCoincidente.marca_producto || '') === borrador.marca.trim() &&
                  (productoCoincidente.modelo_producto || '') === borrador.modelo.trim() &&
                  (productoCoincidente.capacidad_producto || '') === borrador.capacidad.trim() &&
                  (productoCoincidente.categoria || '') === borrador.categoria.trim();

              return (
                  <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/30">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <p className="text-amber-800 dark:text-amber-300">
                          Ya existe un producto con estos datos.{' '}
                          {stockEnEsteAlmacen !== null && almacenSeleccionado ? (
                              <>
                                  Tiene <strong>{stockEnEsteAlmacen}</strong> unidades en <strong>{almacenSeleccionado.nombre_almacen}</strong>
                                  {productoCoincidente.cantidad_total > stockEnEsteAlmacen && (
                                      <> ({productoCoincidente.cantidad_total} en total entre todos los almacenes)</>
                                  )}
                                  .{' '}
                              </>
                          ) : (
                              <>
                                  Tiene <strong>{productoCoincidente.cantidad_total}</strong> unidades en stock, repartidas entre los almacenes que ya
                                  lo tienen — elegí el Almacén Destino para ver cuánto hay ahí específicamente.{' '}
                              </>
                          )}
                          Su costo actual es <strong>${productoCoincidente.precio_compra_producto.toFixed(2)}</strong>.{' '}
                          {esIdentidadExacta ? (
                              <>
                                  Esta compra va a sumar un <strong>lote nuevo</strong> a esta misma ficha (no un duplicado) — con su propio costo
                                  real en el almacén que elijas, sin tocar los demás.
                              </>
                          ) : (
                              <>
                                  Marca, modelo, capacidad o categoría no coinciden exacto con esta ficha, así que esta compra va a registrar una
                                  ficha nueva y separada. Si terminan siendo el mismo artículo, se pueden unificar después desde la herramienta de
                                  fusión de duplicados en Productos.
                              </>
                          )}
                      </p>
                  </div>
              );
          })()
        : null;

    return (
        <Card className="overflow-hidden border-0 pt-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-cyan-600 to-cyan-700 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                        <PlusCircle className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-semibold text-white">Ingrese Datos del Producto a Comprar</CardTitle>
                        <CardDescription className="text-xs text-cyan-100">
                            Identificación, destino y datos comerciales de cada producto
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-5">
                <FieldSet>
                    <FieldLegend>Identificación del Producto</FieldLegend>
                    <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {campoAutocompletable('producto', 'Nombre del Producto *', 'Producto')}
                        {campoAutocompletable('marca', 'Marca', 'Marca')}
                        {campoAutocompletable('modelo', 'Modelo', 'Modelo')}

                        <Field>
                            <FieldLabel htmlFor="capacidad_producto">Capacidad/Tamaño</FieldLabel>
                            <Input
                                type="text"
                                name="capacidad"
                                placeholder="Ej: 1TB, 16GB"
                                value={borrador.capacidad}
                                onChange={cambiarCampo}
                                onKeyDown={enterAgrega}
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="color_producto">Color</FieldLabel>
                            <Input
                                type="text"
                                name="color"
                                placeholder="Ej: Negro, Rojo, Azul"
                                value={borrador.color}
                                onChange={cambiarCampo}
                                onKeyDown={enterAgrega}
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="codigo_preview">Código (autogenerado)</FieldLabel>
                            <Input
                                id="codigo_preview"
                                value={codigoPreview}
                                placeholder="Se genera al completar el nombre"
                                disabled
                                className="font-mono text-xs"
                            />
                        </Field>
                    </FieldGroup>
                </FieldSet>

                <FieldSeparator />

                <FieldSet>
                    <FieldLegend>Destino y Categoría</FieldLegend>
                    <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {almacenOpcional && (
                            <Field>
                                <FieldLabel>Almacén Destino</FieldLabel>
                                <p className="text-muted-foreground rounded-md border border-dashed px-3 py-2.5 text-sm">
                                    Se elige cuando la mercancía llegue al almacén.
                                </p>
                            </Field>
                        )}
                        {!almacenOpcional && (
                            <Field>
                                <FieldLabel htmlFor="almacen_id">Almacén Destino *</FieldLabel>
                                <Combobox
                                    items={almacenes}
                                    itemToStringLabel={(item) => item.nombre_almacen}
                                    itemToStringValue={(item) => item.nombre_almacen}
                                    value={almacenSeleccionado}
                                    onValueChange={(almacen) => seleccionarAlmacen(almacen ? almacen.id.toString() : '')}
                                >
                                    <ComboboxInput
                                        placeholder={ultimoAlmacenId ? 'Último seleccionado' : 'Seleccione Almacén'}
                                        showClear={!!borrador.almacen_id}
                                        className="uppercase"
                                    />
                                    <ComboboxContent>
                                        <ComboboxEmpty>No se encontraron almacenes.</ComboboxEmpty>
                                        <ComboboxList>
                                            {(almacen) => (
                                                <ComboboxItem key={almacen.id} value={almacen}>
                                                    <div className="flex items-center gap-2 uppercase">
                                                        <Warehouse className="h-4 w-4 text-gray-500" />
                                                        <span>{almacen.nombre_almacen}</span>
                                                        {almacen.tipo_almacen && (
                                                            <Badge variant="outline" className="ml-auto text-xs">
                                                                {almacen.tipo_almacen}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </ComboboxItem>
                                            )}
                                        </ComboboxList>
                                        <Separator className="my-2" />
                                        <div
                                            className="flex cursor-pointer items-center rounded-md bg-blue-50 px-3 py-3 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300"
                                            onClick={onCrearAlmacen}
                                        >
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            <span className="font-medium">Crear nuevo almacén</span>
                                        </div>
                                    </ComboboxContent>
                                </Combobox>
                                {!borrador.almacen_id && hayLineaSinAlmacen && (
                                    <p className="text-sm text-red-500">Debe seleccionar un almacén válido</p>
                                )}
                            </Field>
                        )}

                        <Field>
                            <FieldLabel htmlFor="categorias">Categoría *</FieldLabel>
                            <Combobox
                                items={categorias}
                                itemToStringLabel={(item) => item.nombre_categoria}
                                itemToStringValue={(item) => item.nombre_categoria}
                                value={categoriaSeleccionada}
                                onValueChange={(categoria) =>
                                    setBorrador((anterior) => ({ ...anterior, categoria: categoria ? categoria.nombre_categoria : '' }))
                                }
                            >
                                <ComboboxInput placeholder="Seleccione Categoría" showClear={!!borrador.categoria} className="uppercase" />
                                <ComboboxContent>
                                    <ComboboxEmpty>No se encontraron categorías.</ComboboxEmpty>
                                    <ComboboxList>
                                        {(categoria) => (
                                            <ComboboxItem key={categoria.id} value={categoria}>
                                                <span className="uppercase">{categoria.nombre_categoria}</span>
                                            </ComboboxItem>
                                        )}
                                    </ComboboxList>
                                    <Separator className="my-2" />
                                    <div
                                        className="hover:bg-accent flex cursor-pointer items-center gap-2 p-2 text-sm text-purple-600"
                                        onClick={onCrearCategoria}
                                    >
                                        <PlusCircle className="h-4 w-4" />
                                        Crear Nueva Categoría
                                    </div>
                                </ComboboxContent>
                            </Combobox>
                            {errorCategorias && <InputError message={errorCategorias} />}
                        </Field>
                    </FieldGroup>
                </FieldSet>

                <FieldSeparator />

                <FieldSet>
                    <FieldLegend>Datos Comerciales</FieldLegend>
                    <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field>
                            <FieldLabel htmlFor="precio_producto">Precio *</FieldLabel>
                            <InputGroup>
                                <InputGroupAddon>$</InputGroupAddon>
                                <InputGroupInput
                                    inputMode="decimal"
                                    name="precio"
                                    placeholder="0.00"
                                    value={borrador.precio}
                                    onChange={cambiarCampo}
                                    onKeyDown={enterAgrega}
                                />
                            </InputGroup>
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="cantidad_producto">Cantidad *</FieldLabel>
                            <Input
                                inputMode="numeric"
                                name="cantidad"
                                placeholder="0"
                                value={borrador.cantidad}
                                onChange={cambiarCampo}
                                onKeyDown={enterAgrega}
                            />
                        </Field>
                    </FieldGroup>

                    {avisoProductoExistente}
                </FieldSet>

                <div className="mt-6 flex justify-end">
                    <Button variant="secondary" className="cursor-pointer hover:animate-pulse hover:bg-blue-400" onClick={agregar}>
                        <PlusIcon />
                        Agregar Producto
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
