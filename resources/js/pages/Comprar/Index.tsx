import CompraCrearAlmacenDialog from '@/components/compras/compra-crear-almacen-dialog';
import CompraCrearCategoriaDialog from '@/components/compras/compra-crear-categoria-dialog';
import CompraCrearClienteDialog from '@/components/compras/compra-crear-cliente-dialog';
import CompraFormularioProducto, { FormularioProductoHandle } from '@/components/compras/compra-formulario-producto';
import CompraHistorial, { CompraReciente } from '@/components/compras/compra-historial';
import CompraListaProductos from '@/components/compras/compra-lista-productos';
import CompraPagoDialog, { TipoCompra } from '@/components/compras/compra-pago-dialog';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { entidadDeCliente, SelectorEntidad } from '@/components/transacciones/entidad';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollProgress } from '@/components/ui/scroll';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sileo-toaster';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { sileo } from '@/lib/sileo';
import { cn } from '@/lib/utils';
import { AlmacenProps, CategoriasProps, ClienteProps, CuentaNegocioProps, type BreadcrumbItem, type SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { format } from 'date-fns';
import { CalendarIcon, Container, PlusCircle, ShoppingBasket } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// =================================================================
// 🚨 ATRIBUTOS DE PRODUCTO ACTUALIZADOS EN TYPESCRIPT
// =================================================================
export interface ProductoComprarProps {
    id: number;
    /** null en una compra del casillero: el almacén se elige cuando la mercancía llega. */
    almacen_id: number | null;
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
// =================================================================

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Caja Principal',
        href: route('dashboard'),
    },
    {
        title: 'Compras',
        href: route('comprar.index'),
    },
];

export default function ComprarPage() {
    const { props } = usePage();
    const { errors } = props;
    const comprasRecientes: CompraReciente[] = (props as any).compras_recientes ?? [];
    // El casillero (compra pagada, sin stock y sin almacén hasta que llegue) lo registra solo el administrador.
    const { auth } = usePage<SharedData>().props;
    const puedeUsarCasillero = auth.user?.role === 'admin';
    const [casillero, setCasillero] = useState(false);
    const [almacens, setAlmacens] = useState<AlmacenProps[]>([]);
    const [categorias, setCategorias] = useState<CategoriasProps[]>([]);
    const [cuentas, setCuentas] = useState<CuentaNegocioProps[]>([]);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [clientes, setClientes] = useState<ClienteProps[]>([]);
    const [loading, setLoading] = useState(true);

    // Estados para búsqueda de clientes
    const [clienteSearchTerm, setClienteSearchTerm] = useState('');
    const [filteredClientes, setFilteredClientes] = useState<ClienteProps[]>([]);
    const [isSearchingClientes, setIsSearchingClientes] = useState(false);

    // El formulario de ingreso de producto vive en CompraFormularioProducto; esta referencia permite
    // seleccionarle el almacén/categoría recién creados y reiniciarlo cuando la compra se registra.
    const formularioRef = useRef<FormularioProductoHandle>(null);

    // Estado para el modal de crear almacén
    const [isCrearAlmacenDialogOpen, setIsCrearAlmacenDialogOpen] = useState(false);

    // Estado para el modal de crear categoría
    const [isCrearCategoriaDialogOpen, setIsCrearCategoriaDialogOpen] = useState(false);

    const [productos, setProductos] = useState<ProductoComprarProps[]>([]);

    const { data, setData, post, processing } = useForm({
        flujo: 'clasico' as 'clasico' | 'casillero',
        compra: '',
        proveedor: '',
        fecha: date ? date.toISOString().split('T')[0] : '',
        pagos: [] as { cuenta_id: number; monto: number }[],
        pagos_clientes: [] as { cliente_id: number; monto: number }[],
        productos: [] as ProductoComprarProps[],
        permitir_deuda_parcial: false,
    });

    // Estado para el modal de crear cliente
    const [isCrearClienteDialogOpen, setIsCrearClienteDialogOpen] = useState(false);
    // true cuando el modal se abrió desde el selector "Cliente" de la compra (y no desde el financiamiento)
    const [crearComoClienteDeCompra, setCrearComoClienteDeCompra] = useState(false);

    // 🔍 EFECTO PARA BÚSQUEDA EN TIEMPO REAL DE CLIENTES
    useEffect(() => {
        const searchClientes = async () => {
            if (clienteSearchTerm.length >= 2) {
                setIsSearchingClientes(true);
                try {
                    const response = await axios.get(route('compras.clientes.fisicos'), {
                        params: { search: clienteSearchTerm },
                    });
                    setFilteredClientes(response.data);
                } catch (error) {
                    console.error('Error buscando clientes:', error);
                    sileo.error({ title: 'Error al buscar clientes' });
                } finally {
                    setIsSearchingClientes(false);
                }
            } else {
                setFilteredClientes(clientes);
            }
        };

        const debounceTimer = setTimeout(searchClientes, 300);
        return () => clearTimeout(debounceTimer);
    }, [clienteSearchTerm, clientes]);

    useEffect(() => {
        const productosParaBackend = productos.map((p) => ({
            ...p,
            almacen_id: casillero ? null : p.almacen_id,
            codigo_barras: (p.codigo || '').trim(),
        }));
        setData('productos', productosParaBackend as ProductoComprarProps[]);
    }, [productos, casillero]);

    useEffect(() => {
        setData('flujo', casillero ? 'casillero' : 'clasico');
    }, [casillero]);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                setLoading(true);

                const [almacenesRes, categoriasRes, cuentasRes, clientesRes] = await Promise.all([
                    axios.get(route('compras.almacenes')),
                    axios.get(route('compras.categorias')),
                    axios.get(route('compras.cuentas.pago')),
                    axios.get(route('compras.clientes.fisicos')),
                ]);

                setAlmacens(almacenesRes.data);
                setCategorias(categoriasRes.data);
                setCuentas(cuentasRes.data);
                setClientes(clientesRes.data);
                setFilteredClientes(clientesRes.data);
            } catch (error) {
                console.error('Error al cargar datos:', error);
                sileo.error({ title: 'Error al cargar los datos necesarios' });
            } finally {
                setLoading(false);
            }
        };

        cargarDatos();
    }, []);

    // La validación de los campos ocurre en CompraFormularioProducto; acá solo se suma la línea.
    const agregarProducto = (linea: Omit<ProductoComprarProps, 'id'>) => {
        const nuevoProducto: ProductoComprarProps = { ...linea, id: Date.now() };

        setProductos((prev) => [...prev, nuevoProducto]);
        sileo.success({ title: 'Producto agregado', description: `${nuevoProducto.producto} se agregó a la lista de compra.` });
    };

    const eliminarProducto = (id: number) => {
        const producto = productos.find((p) => p.id === id);
        setProductos((prev) => prev.filter((p) => p.id !== id));
        if (producto) {
            sileo.info({ title: 'Producto quitado', description: `${producto.producto} se quitó de la lista.` });
        }
    };

    // La edición de una línea ocurre en CompraListaProductos con su propio borrador; acá solo se
    // reemplaza la línea ya validada.
    const actualizarProducto = (linea: ProductoComprarProps) => {
        setProductos((prev) => prev.map((prod) => (prod.id === linea.id ? { ...prod, ...linea } : prod)));
    };

    const calcularTotal = () => {
        return productos.reduce((total, p) => total + p.cantidad * p.precio, 0).toFixed(2);
    };

    const clienteDeCompra = clientes.find((c) => c.nombre_cliente === data.proveedor) || null;
    // Cada cliente se muestra como en Transacciones: insignia + badge con su saldo
    const entidadesCliente = clientes.map((c) =>
        entidadDeCliente({ id: c.id, nombre_cliente: c.nombre_cliente, deuda_pago_cliente: c.deuda_pago_cliente ?? 0 }),
    );

    const realizarCompra = () => {
        if (productos.length === 0) {
            sileo.warning({ title: 'Debe agregar al menos un producto para realizar la compra.' });
            return;
        }

        if (!data.proveedor || !date) {
            sileo.warning({ title: 'Por favor, complete la Fecha y el Asociado.' });
            return;
        }

        setData('fecha', format(date, 'yyyy-MM-dd'));

        // Swap directo, sin sileo.promise(): esta llamada mueve dinero/stock real en el backend
        // (CompraController::store) y no se puede verificar en navegador en esta sesión — mismo
        // criterio de cautela ya aplicado en Vendor/Index.tsx para su checkout.
        post(route('comprar.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setProductos([]);
                formularioRef.current?.reiniciar();
                sileo.success({
                    title: 'Compra realizada exitosamente',
                    description: casillero
                        ? 'La compra quedó en el casillero: pagada y sin stock hasta que la mercancía llegue al almacén.'
                        : 'Los productos han sido agregados al inventario.',
                });
            },
            onError: (errors) => {
                // Los errores de validación del backend vienen por índice real del carrito
                // (productos.2.precio, productos.5.cantidad, etc.) — antes solo se leía el
                // índice 0, así que si fallaba cualquier otra línea, el usuario no se enteraba
                // ni de qué producto era ni de qué campo. Acá se busca cualquier error
                // "productos.N.campo" y se señala el producto real por nombre.
                const claveErrorProducto = Object.keys(errors).find((clave) => /^productos\.\d+\./.test(clave));

                if (claveErrorProducto) {
                    const indice = parseInt(claveErrorProducto.split('.')[1], 10);
                    const nombreProducto = productos[indice]?.producto ?? `línea ${indice + 1}`;
                    sileo.error({
                        title: `Error en "${nombreProducto}"`,
                        description: errors[claveErrorProducto],
                    });
                } else if (errors.error) {
                    sileo.error({
                        title: 'Error al procesar la compra',
                        description: errors.error,
                    });
                } else {
                    sileo.error({ title: 'Ocurrió un error inesperado al procesar la compra.' });
                }
            },
        });
    };

    // Un almacén creado (o encontrado como ya existente) queda en la lista y seleccionado en el formulario.
    const almacenCreado = (almacen: AlmacenProps) => {
        setAlmacens((prev) => (prev.some((a) => a.id === almacen.id) ? prev : [...prev, almacen]));
        formularioRef.current?.seleccionarAlmacen(almacen.id);
    };

    const categoriaCreada = (categoria: CategoriasProps) => {
        setCategorias((prev) => [...prev, categoria]);
        formularioRef.current?.seleccionarCategoria(categoria.nombre_categoria);
    };

    // Un cliente creado (o encontrado como ya existente) queda visible de inmediato en los selectores
    // de esta página (el de "Cliente" de la compra y el de "Financiamiento con Clientes"), sin recargar.
    const clienteCreado = (cliente: ClienteProps) => {
        setClientes((prev) => (prev.some((c) => c.id === cliente.id) ? prev : [...prev, cliente]));

        if (crearComoClienteDeCompra) {
            // Creado desde el selector "Cliente" de la compra: queda seleccionado
            setData('proveedor', cliente.nombre_cliente);
        } else if (!data.pagos_clientes.some((p) => p.cliente_id === cliente.id)) {
            // Creado desde "Financiamiento con Clientes": se agrega a pagos_clientes con monto 0
            setData('pagos_clientes', [...data.pagos_clientes, { cliente_id: cliente.id, monto: 0 }]);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Comprar" />

            {loading && (
                <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-neutral-800">
                    <Spinner className="text-sidebar-accent size-8" />
                </div>
            )}

            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Compra de Productos"
                        description="Registra la compra de nuevos productos a un asociado: arma la lista, elige cómo se paga y queda pendiente hasta que se apruebe."
                    />
                    <ShoppingBasket
                        size={70}
                        color="#f59e0b"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator className="col-span-4" />

                {/* Sección de Datos Generales de la Compra */}
                <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <CalendarIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-semibold text-white">Nuevos Productos</CardTitle>
                                <CardDescription className="text-xs text-indigo-100">
                                    A continuación va a realizar una compra de productos, recuerde asignar: fecha y asociado.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-5">
                        <form onSubmit={(e) => e.preventDefault()}>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {/* Fecha de la Compra */}
                                <div className="space-y-2">
                                    <Label htmlFor="fechaCompra" className="text-sm font-medium">
                                        Fecha de la Compra
                                    </Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={'outline'}
                                                className={cn('h-11 w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {date ? format(date, 'PPP') : <span>Seleccione Fecha</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={date} onSelect={setDate} autoFocus />
                                        </PopoverContent>
                                    </Popover>
                                    {errors.fecha && <InputError message={errors.fecha} />}
                                </div>

                                {/* Cliente al que se le compra */}
                                <div className="space-y-2">
                                    <Label htmlFor="proveedor" className="text-sm font-medium">
                                        Asociado
                                    </Label>
                                    <SelectorEntidad
                                        id="proveedor"
                                        entidades={entidadesCliente}
                                        valor={clienteDeCompra ? String(clienteDeCompra.id) : ''}
                                        onChange={(entidad) => {
                                            setData((prev) => ({
                                                ...prev,
                                                proveedor: entidad?.nombre ?? '',
                                                // El asociado de la compra no puede además financiarla
                                                pagos_clientes: prev.pagos_clientes.filter((p) => String(p.cliente_id) !== entidad?.id),
                                            }));
                                        }}
                                        placeholder="Buscar asociado..."
                                        pie={
                                            <>
                                                <Separator className="my-2" />
                                                <div
                                                    className="hover:bg-accent flex cursor-pointer items-center gap-2 p-2 text-sm text-blue-600"
                                                    onClick={() => {
                                                        setCrearComoClienteDeCompra(true);
                                                        setIsCrearClienteDialogOpen(true);
                                                    }}
                                                >
                                                    <PlusCircle className="h-4 w-4" />
                                                    Crear Nuevo Asociado
                                                </div>
                                            </>
                                        }
                                    />
                                    {errors.proveedor && <InputError message={errors.proveedor} />}
                                </div>

                                {/* Casillero: solo el administrador; la compra queda pagada, sin stock y sin almacén hasta que llegue */}
                                {puedeUsarCasillero && (
                                    <div
                                        className={cn(
                                            'flex items-center justify-between gap-4 rounded-lg border p-4 md:col-span-2',
                                            casillero ? 'border-sky-400/40 bg-sky-500/10' : 'border-dashed',
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <Container
                                                className={cn('mt-0.5 h-5 w-5 shrink-0', casillero ? 'text-sky-600' : 'text-muted-foreground')}
                                            />
                                            <div>
                                                <Label htmlFor="enviar-casillero" className="text-sm font-medium">
                                                    Enviar al casillero (Panamá)
                                                </Label>
                                                <p className="text-muted-foreground text-xs">
                                                    {casillero
                                                        ? 'La compra queda pagada pero no suma al inventario ni pide almacén: el stock entra cuando la mercancía llegue. La encuentras en el Casillero de Compras.'
                                                        : 'Actívalo si la mercancía no va directo a un almacén sino que espera en Panamá.'}
                                                </p>
                                            </div>
                                        </div>
                                        <Switch id="enviar-casillero" checked={casillero} onCheckedChange={setCasillero} />
                                    </div>
                                )}
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <CompraFormularioProducto
                    ref={formularioRef}
                    almacenes={almacens}
                    categorias={categorias}
                    hayLineaSinAlmacen={!casillero && productos.some((p) => !p.almacen_id)}
                    almacenOpcional={casillero}
                    errorCategorias={errors.categorias}
                    onAgregar={agregarProducto}
                    onCrearAlmacen={() => setIsCrearAlmacenDialogOpen(true)}
                    onCrearCategoria={() => setIsCrearCategoriaDialogOpen(true)}
                />

                <CompraListaProductos
                    productos={productos}
                    almacenes={almacens}
                    categorias={categorias}
                    almacenOpcional={casillero}
                    onActualizar={actualizarProducto}
                    onEliminar={eliminarProducto}
                />

                {/* ==================== PROCESAR LAS COMPRAS DE LOS PRODUCTOS ==================== */}
                <div className="flex justify-center gap-4 p-6">
                    <CompraPagoDialog
                        tipoCompra={data.compra as TipoCompra}
                        onTipoCompraChange={(tipo) => setData('compra', tipo)}
                        pagos={data.pagos}
                        onPagosChange={(pagos) => setData('pagos', pagos)}
                        pagosClientes={data.pagos_clientes}
                        onPagosClientesChange={(pagos) => setData('pagos_clientes', pagos)}
                        permitirDeudaParcial={data.permitir_deuda_parcial}
                        onPermitirDeudaParcialChange={(permitir) => setData('permitir_deuda_parcial', permitir)}
                        totalCompra={parseFloat(calcularTotal())}
                        hayProductos={productos.length > 0}
                        hayAlmacenInvalido={!casillero && productos.some((p) => !almacens.find((a) => a.id === p.almacen_id))}
                        cuentas={cuentas}
                        clientes={clientes}
                        clientesFiltrados={filteredClientes}
                        buscandoClientes={isSearchingClientes}
                        onBuscarClientes={setClienteSearchTerm}
                        clienteDeCompraId={clienteDeCompra?.id ?? null}
                        onCrearCliente={() => {
                            setCrearComoClienteDeCompra(false);
                            setIsCrearClienteDialogOpen(true);
                        }}
                        procesando={processing}
                        onConfirmar={realizarCompra}
                    />

                    <CompraCrearClienteDialog open={isCrearClienteDialogOpen} onOpenChange={setIsCrearClienteDialogOpen} onCreado={clienteCreado} />

                    <CompraCrearAlmacenDialog open={isCrearAlmacenDialogOpen} onOpenChange={setIsCrearAlmacenDialogOpen} onCreado={almacenCreado} />
                </div>

                <CompraCrearCategoriaDialog
                    open={isCrearCategoriaDialogOpen}
                    onOpenChange={setIsCrearCategoriaDialogOpen}
                    onCreada={categoriaCreada}
                />

                <CompraHistorial compras={comprasRecientes} />

                <Toaster position="top-center" />
            </div>
            <ScrollProgress />
        </AppLayout>
    );
}
