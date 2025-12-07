import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { AlmacenProps, CategoriasProps, ClienteProps, CuentaNegocioProps, ProveedorProps, type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    BookCheck,
    CalendarIcon,
    CheckCircle,
    CreditCard,
    DollarSign,
    Edit2,
    HardDriveUpload,
    Loader2,
    PlusCircle,
    PlusIcon,
    ShoppingBasket,
    ShoppingCart,
    Trash2Icon,
    Users,
    Wallet,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

// =================================================================
// 🚨 ATRIBUTOS DE PRODUCTO ACTUALIZADOS EN TYPESCRIPT
// =================================================================
export interface ProductoComprarProps {
    id: number;
    almacen_id: number;
    producto: string;
    marca?: string;
    modelo?: string;
    capacidad?: string;
    categoria: string;
    codigo: string;
    cantidad: number;
    precio: number;
}
// =================================================================

// =================================================================
// ⚡ FUNCIÓN DE GENERACIÓN DE CÓDIGO EN FRONTEND
// =================================================================
const generarCodigoLocal = (producto: string, marca: string, modelo: string, capacidad: string): string => {
    const cleanAndTruncate = (value: string | undefined): string => {
        if (!value) return '';
        const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        return cleaned.substring(0, 3);
    };

    const nombre = cleanAndTruncate(producto).replace(/[^A-Z]/g, '');
    const marcaClean = cleanAndTruncate(marca);
    const modeloClean = cleanAndTruncate(modelo);
    const capacidadNumeros = (capacidad || '').replace(/[^0-9]/g, '');

    const nombrePadded = nombre.padEnd(3, 'X');
    const marcaPadded = marcaClean.padEnd(3, 'X');
    const modeloPadded = modeloClean.padEnd(3, 'X');

    let parteFija = nombrePadded + marcaPadded + modeloPadded + capacidadNumeros;

    if (parteFija.length > 14) {
        parteFija = parteFija.substring(0, 14);
    }

    let codigo = parteFija;
    const longitudRestante = 14 - codigo.length;

    if (longitudRestante > 0) {
        let randomDigits = '';
        for (let i = 0; i < longitudRestante; i++) {
            randomDigits += Math.floor(Math.random() * 10).toString();
        }
        codigo += randomDigits;
    }

    return codigo.substring(0, 14);
};
// =================================================================

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Caja Principal',
        href: '/dashboard',
    },
    {
        title: 'Productos',
        href: '/productos',
    },
    {
        title: 'Realizar Venta',
        href: 'punto-venta',
    },
    {
        title: 'Adquirir Nuevos Productos',
        href: '/comprar',
    },
];

export default function ComprarPage() {
    const { props } = usePage();
    const { errors } = props;
    const [almacens, setAlmacens] = useState<AlmacenProps[]>([]);
    const [proveedors, setProveedors] = useState<ProveedorProps[]>([]);
    const [categorias, setCategorias] = useState<CategoriasProps[]>([]);
    const [cuentas, setCuentas] = useState<CuentaNegocioProps[]>([]);
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [editingProductId, setEditingProductId] = useState<number | null>(null);
    const [clientes, setClientes] = useState<ClienteProps[]>([]);
    const [loading, setLoading] = useState(true);

    const [tempFormData, setTempFormData] = useState<Omit<ProductoComprarProps, 'id' | 'almacen_id'> & { almacen_id: string }>({
        almacen_id: '',
        producto: '',
        marca: '',
        modelo: '',
        capacidad: '',
        categoria: '',
        codigo: '',
        cantidad: 0,
        precio: 0,
    });

    const [productos, setProductos] = useState<ProductoComprarProps[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const { data, setData, post, processing } = useForm({
        compra: 'deuda_proveedor',
        proveedor: '',
        fecha: date ? date.toISOString().split('T')[0] : '',
        pagos: [] as { cuenta_id: number; monto: number }[],
        pagos_clientes: [] as { cliente_id: number; monto: number }[],
        productos: [] as ProductoComprarProps[],
    });

    const [searchProveedor, setSearchProveedor] = useState('');
    const [searchCategoria, setSearchCategoria] = useState('');

    // Estado para el modal de crear cliente
    const [isCrearClienteDialogOpen, setIsCrearClienteDialogOpen] = useState(false);
    const [nuevoCliente, setNuevoCliente] = useState({
        nombre_cliente: '',
        telefono_cliente: '',
        direccion_cliente: '',
        ciudad_cliente: '',
    });
    const [clienteErrors, setClienteErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        const productosParaBackend = productos.map((p) => ({
            ...p,
            almacen_id: parseInt(p.almacen_id as any),
            codigo: '',
        }));
        setData('productos', productosParaBackend as ProductoComprarProps[]);
    }, [productos]);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                setLoading(true);

                const [almacenesRes, proveedoresRes, categoriasRes, cuentasRes, clientesRes] = await Promise.all([
                    axios.get(route('compras.almacenes')),
                    axios.get(route('compras.proveedores')),
                    axios.get(route('compras.categorias')),
                    axios.get(route('compras.cuentas.pago')),
                    axios.get(route('compras.clientes.fisicos')),
                ]);

                setAlmacens(almacenesRes.data);
                setProveedors(proveedoresRes.data);
                setCategorias(categoriasRes.data);
                setCuentas(cuentasRes.data);
                setClientes(clientesRes.data);
            } catch (error) {
                console.error('Error al cargar datos:', error);
                toast.error('Error al cargar los datos necesarios');
            } finally {
                setLoading(false);
            }
        };

        cargarDatos();
    }, []);

    const handleTempInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setTempFormData((prev) => ({
            ...prev,
            [name]: name === 'cantidad' || name === 'precio' ? parseFloat(value) || 0 : value.toUpperCase(),
        }));
    };

    const handleTempSelectChange = (name: string, value: string) => {
        setTempFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const resetTempForm = () => {
        setTempFormData({
            almacen_id: '',
            producto: '',
            marca: '',
            modelo: '',
            capacidad: '',
            categoria: '',
            codigo: '',
            cantidad: 0,
            precio: 0,
        });
    };

    const agregarProducto = () => {
        if (!tempFormData.producto || !tempFormData.categoria || tempFormData.cantidad <= 0 || tempFormData.precio <= 0 || !tempFormData.almacen_id) {
            toast.warning('Por favor, completa los campos obligatorios (Producto, Categoría, Cantidad, Precio y Almacén).');
            return;
        }

        const nuevoCodigo = generarCodigoLocal(
            tempFormData.producto,
            tempFormData.marca || '',
            tempFormData.modelo || '',
            tempFormData.capacidad || '',
        );

        const nuevoProducto: ProductoComprarProps = {
            id: editingProductId || Date.now(),
            almacen_id: parseInt(tempFormData.almacen_id as any),
            producto: tempFormData.producto,
            marca: tempFormData.marca,
            modelo: tempFormData.modelo,
            capacidad: tempFormData.capacidad,
            categoria: tempFormData.categoria,
            codigo: nuevoCodigo,
            cantidad: tempFormData.cantidad,
            precio: tempFormData.precio,
        };

        if (editingProductId) {
            setProductos((prev) => prev.map((p) => (p.id === editingProductId ? nuevoProducto : p)));
            setEditingProductId(null);
        } else {
            setProductos((prev) => [...prev, nuevoProducto]);
        }

        resetTempForm();
    };

    const eliminarProducto = (id: number) => {
        setProductos((prev) => prev.filter((p) => p.id !== id));
    };

    const editarProducto = (id: number) => {
        const productoParaEditar = productos.find((p) => p.id === id);
        if (productoParaEditar) {
            setTempFormData({
                almacen_id: productoParaEditar.almacen_id.toString(),
                producto: productoParaEditar.producto,
                marca: productoParaEditar.marca || '',
                modelo: productoParaEditar.modelo || '',
                capacidad: productoParaEditar.capacidad || '',
                categoria: productoParaEditar.categoria,
                codigo: productoParaEditar.codigo,
                cantidad: productoParaEditar.cantidad,
                precio: productoParaEditar.precio,
            });
            setEditingProductId(id);
            setIsDialogOpen(true);
        }
    };

    const handleActualizarProducto = () => {
        if (
            !tempFormData.producto.trim() ||
            !tempFormData.categoria.trim() ||
            tempFormData.cantidad <= 0 ||
            tempFormData.precio <= 0 ||
            !tempFormData.almacen_id
        ) {
            toast.warning('Por favor, completa los campos obligatorios válidos (Producto, Categoría, Cantidad, Precio y Almacén).');
            return;
        }

        setProductos((prev) =>
            prev.map((prod) =>
                prod.id === editingProductId
                    ? ({
                          id: editingProductId,
                          almacen_id: parseInt(tempFormData.almacen_id),
                          producto: tempFormData.producto,
                          marca: tempFormData.marca,
                          modelo: tempFormData.modelo,
                          capacidad: tempFormData.capacidad,
                          categoria: tempFormData.categoria,
                          codigo: tempFormData.codigo,
                          cantidad: tempFormData.cantidad,
                          precio: tempFormData.precio,
                      } as ProductoComprarProps)
                    : prod,
            ),
        );

        resetTempForm();
        setEditingProductId(null);
        toast.success('Producto actualizado correctamente');
        setIsDialogOpen(false);
    };

    const calcularTotal = () => {
        return productos.reduce((total, p) => total + p.cantidad * p.precio, 0).toFixed(2);
    };

    const handleNuevoClienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNuevoCliente(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const crearNuevoCliente = async () => {
        try {
            const response = await axios.post(route('compras.cliente.store'), {
                ...nuevoCliente,
                tipo_cliente: 'fisico', // Siempre crear como fisico con deuda 0
            });

            // Agregar el nuevo cliente a la lista de clientes
            setClientes(prev => [...prev, response.data.cliente]);

            // Agregar el nuevo cliente a los pagos_clientes
            setData('pagos_clientes', [
                ...data.pagos_clientes,
                { cliente_id: response.data.cliente.id, monto: 0 }
            ]);

            toast.success('Cliente creado y agregado a los pagos exitosamente');

            // Limpiar el formulario
            setNuevoCliente({
                nombre_cliente: '',
                telefono_cliente: '',
                direccion_cliente: '',
                ciudad_cliente: '',
            });

            setIsCrearClienteDialogOpen(false);
            setClienteErrors({});
        } catch (error: any) {
            if (error.response?.data?.errors) {
                setClienteErrors(error.response.data.errors);
                toast.error('Error al crear el cliente. Por favor, revisa los datos ingresados.');
            } else {
                console.error('Error al crear cliente:', error);
                toast.error('Error al crear el cliente');
            }
        }
    };

    const filteredProvedors = proveedors.filter((proveedor) => proveedor.nombre_proveedor.toLowerCase().includes(searchProveedor.toLowerCase()));
    const filteredCategorias = categorias.filter((cat) => cat.nombre_categoria.toLowerCase().includes(searchCategoria.toLowerCase()));

    const realizarCompra = () => {
        if (productos.length === 0) {
            toast.warning('Debe agregar al menos un producto para realizar la compra.');
            return;
        }

        if (!data.proveedor || !date) {
            toast.warning('Por favor, complete la Fecha y el Proveedor.');
            return;
        }

        setData('fecha', format(date, 'yyyy-MM-dd'));

        post(route('comprar.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setProductos([]);
                resetTempForm();
                toast.success('Compra realizada exitosamente!', {
                    description: 'Los productos han sido agregados al inventario.',
                });
            },
            onError: (errors) => {
                if (errors.error) {
                    toast.error('Error al procesar la compra', {
                        description: errors.error,
                    });
                } else {
                    toast.error('Ocurrió un error inesperado al procesar la compra.');
                }
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Comprar" />

            {loading && (
                <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
                    <div className="bg-sidebar-accent rounded-lg p-4 shadow-lg">
                        <p>Cargando datos...</p>
                    </div>
                </div>
            )}

            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Comprar o adquirir nuevos productos para el negocio, antes de distribuir"
                    />
                    <ShoppingBasket
                        size={70}
                        color="#f59e0b"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator className="col-span-4" />

                {/* Sección de Datos Generales de la Compra */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sidebar-accent text-center">Nuevos Productos</CardTitle>
                        <CardDescription className="text-center">
                            A continuación va a realizar una compra de productos, recuerde asignar: fecha y proveedor.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
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
                                            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    {errors.fecha && <InputError message={errors.fecha} />}
                                </div>

                                {/* Proveedor */}
                                <div className="space-y-2">
                                    <Label htmlFor="proveedor" className="text-sm font-medium">
                                        Proveedor
                                    </Label>
                                    <Select
                                        name="proveedor"
                                        value={data.proveedor}
                                        onValueChange={(value) => {
                                            setData('proveedor', value);
                                            setSearchProveedor('');
                                        }}
                                    >
                                        <SelectTrigger className="h-11 w-full">
                                            <SelectValue placeholder="Seleccione Proveedor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <div className="p-2">
                                                <input
                                                    type="text"
                                                    className="w-full rounded border border-gray-300 p-2 text-sm"
                                                    placeholder="Buscar o crear proveedor..."
                                                    value={searchProveedor}
                                                    onChange={(e) => setSearchProveedor(e.target.value.toUpperCase())}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const trimmed = searchProveedor.trim();
                                                            if (trimmed && !filteredProvedors.some((p) => p.nombre_proveedor === trimmed)) {
                                                                setData('proveedor', trimmed);
                                                                setSearchProveedor('');
                                                            }
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className="max-h-60 overflow-y-auto">
                                                {filteredProvedors.length > 0 ? (
                                                    filteredProvedors.map((proveedor) => (
                                                        <SelectItem key={proveedor.id} value={proveedor.nombre_proveedor}>
                                                            {proveedor.nombre_proveedor}
                                                        </SelectItem>
                                                    ))
                                                ) : searchProveedor.trim() ? (
                                                    <SelectItem value={searchProveedor.trim()}>
                                                        <div className="flex items-center">
                                                            <PlusCircle className="mr-2 h-4 w-4" />
                                                            Crear: {searchProveedor.trim()}
                                                        </div>
                                                    </SelectItem>
                                                ) : (
                                                    <div className="text-muted-foreground px-2 py-4 text-center text-sm">
                                                        No hay proveedores disponibles
                                                    </div>
                                                )}
                                            </div>
                                        </SelectContent>
                                    </Select>
                                    {errors.proveedor && <InputError message={errors.proveedor} />}
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Sección de Ingreso de Producto */}
                <Card>
                    <CardHeader>
                        <CardDescription className="text-center dark:text-emerald-400">Ingrese Datos del Producto a Comprar</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-4 gap-4">
                            {/* Fila 1 */}
                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="almacen_id">Almacén Destino *</Label>
                                <Select
                                    name="almacen_id"
                                    value={tempFormData.almacen_id}
                                    onValueChange={(value) => handleTempSelectChange('almacen_id', value)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Seleccione Almacén" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {almacens.map((almacen) => (
                                            <SelectItem key={almacen.id} value={almacen.id.toString()}>
                                                {almacen.nombre_almacen}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="nombre_producto">Nombre del Producto *</Label>
                                <Input
                                    type="text"
                                    name="producto"
                                    placeholder="Producto"
                                    value={tempFormData.producto}
                                    onChange={handleTempInputChange}
                                />
                            </div>

                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="marca_producto">Marca</Label>
                                <Input type="text" name="marca" placeholder="Marca" value={tempFormData.marca} onChange={handleTempInputChange} />
                            </div>

                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="modelo_producto">Modelo</Label>
                                <Input type="text" name="modelo" placeholder="Modelo" value={tempFormData.modelo} onChange={handleTempInputChange} />
                            </div>

                            {/* Fila 2 */}
                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="capacidad_producto">Capacidad/Tamaño</Label>
                                <Input
                                    type="text"
                                    name="capacidad"
                                    placeholder="Ej: 1TB, 16GB"
                                    value={tempFormData.capacidad}
                                    onChange={handleTempInputChange}
                                />
                            </div>

                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="categorias">Categoría *</Label>
                                <Select
                                    name="categoria"
                                    value={tempFormData.categoria}
                                    onValueChange={(value) => handleTempSelectChange('categoria', value)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Seleccione Categoría" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <input
                                            type="text"
                                            className="mb-2 w-full rounded border border-gray-300 p-2"
                                            placeholder="Buscar o crear categoría..."
                                            value={searchCategoria}
                                            onChange={(e) => setSearchCategoria(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const trimmed = searchCategoria.trim();
                                                    if (trimmed && !filteredCategorias.some((c) => c.nombre_categoria === trimmed)) {
                                                        handleTempSelectChange('categoria', trimmed);
                                                        setSearchCategoria('');
                                                    }
                                                }
                                            }}
                                        />
                                        {filteredCategorias.length > 0 ? (
                                            filteredCategorias.map((categoria) => (
                                                <SelectItem key={categoria.id} value={categoria.nombre_categoria}>
                                                    {categoria.nombre_categoria}
                                                </SelectItem>
                                            ))
                                        ) : searchCategoria.trim() ? (
                                            <SelectItem value={searchCategoria.trim()}>
                                                ➕ Crear nueva categoría: <strong>{searchCategoria.trim()}</strong>
                                            </SelectItem>
                                        ) : (
                                            <SelectItem disabled>No hay categorías disponibles</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                {errors.categorias && <InputError message={errors.categorias} />}
                            </div>

                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="precio_producto">Precio *</Label>
                                <Input
                                    type="number"
                                    name="precio"
                                    placeholder="$ 0.00"
                                    value={tempFormData.precio || ''}
                                    onChange={handleTempInputChange}
                                />
                                {errors['productos.0.precio'] && <InputError message={errors['productos.0.precio']} />}
                            </div>

                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="cantidad_producto">Cantidad *</Label>
                                <Input
                                    type="number"
                                    name="cantidad"
                                    placeholder="0"
                                    value={tempFormData.cantidad || ''}
                                    onChange={handleTempInputChange}
                                />
                                {errors['productos.0.cantidad'] && <InputError message={errors['productos.0.cantidad']} />}
                            </div>
                        </div>

                        {/* Botón Agregar */}
                        <div className="mt-6 flex justify-end">
                            <Button variant="secondary" className="cursor-pointer hover:animate-pulse hover:bg-blue-400" onClick={agregarProducto}>
                                <PlusIcon />
                                Agregar Producto
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Sección de la Tabla de Productos CON DIÁLOGO MEJORADO */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <Table>
                        <TableCaption className="text-sidebar-accent">Lista de los Productos a Comprar</TableCaption>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                <TableHead>Producto</TableHead>
                                <TableHead>Marca</TableHead>
                                <TableHead>Modelo</TableHead>
                                <TableHead>Capacidad</TableHead>
                                <TableHead>Almacén</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>Cant.</TableHead>
                                <TableHead>Precio</TableHead>
                                <TableHead>Importe</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {productos.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.producto}</TableCell>
                                    <TableCell>{p.marca || 'N/A'}</TableCell>
                                    <TableCell>{p.modelo || 'N/A'}</TableCell>
                                    <TableCell>{p.capacidad || 'N/A'}</TableCell>
                                    <TableCell>{almacens.find((a) => a.id === p.almacen_id)?.nombre_almacen || 'Desconocido'}</TableCell>
                                    <TableCell>{p.categoria}</TableCell>
                                    <TableCell>{p.codigo || 'ERROR'}</TableCell>
                                    <TableCell>{p.cantidad}</TableCell>
                                    <TableCell>${p.precio.toFixed(2)}</TableCell>
                                    <TableCell>${(p.cantidad * p.precio).toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        {/* DIÁLOGO MEJORADO - LISTO PARA USAR */}
                                        <AlertDialog open={isDialogOpen && editingProductId === p.id} onOpenChange={setIsDialogOpen}>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="link"
                                                    className="cursor-pointer text-blue-600 hover:text-blue-800"
                                                    onClick={() => editarProducto(p.id)}
                                                >
                                                    <Edit2 />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="flex h-[90vh] w-[95vw] max-w-6xl flex-col p-0 sm:h-[85vh]">
                                                <AlertDialogHeader className="shrink-0 border-b px-6 py-4">
                                                    <AlertDialogTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800 dark:text-white sm:text-2xl">
                                                        <Edit2 className="h-6 w-6" />
                                                        <span>Editar Producto</span>
                                                    </AlertDialogTitle>
                                                    <AlertDialogDescription className="text-base text-gray-600 dark:text-gray-300">
                                                        Realiza ajustes detallados al producto. Los cambios se reflejarán en la lista de compra.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>

                                                <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-3 lg:grid-cols-4">
                                                    {/* Main Form Section */}
                                                    <div className="col-span-1 flex flex-col gap-y-8 overflow-y-auto px-6 py-8 md:col-span-2 lg:col-span-3">
                                                        {/* Product Information Card */}
                                                        <div className="space-y-6 rounded-lg border border-slate-200 p-6 dark:border-slate-700">
                                                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                                                Detalles del Producto
                                                            </h3>
                                                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                                                <div className="sm:col-span-2">
                                                                    <Label htmlFor="edit-producto">Nombre del Producto *</Label>
                                                                    <Input
                                                                        id="edit-producto"
                                                                        name="producto"
                                                                        value={tempFormData.producto}
                                                                        onChange={handleTempInputChange}
                                                                        placeholder="Ej: Memoria RAM"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label htmlFor="edit-marca">Marca</Label>
                                                                    <Input
                                                                        id="edit-marca"
                                                                        name="marca"
                                                                        value={tempFormData.marca}
                                                                        onChange={handleTempInputChange}
                                                                        placeholder="Ej: Kingston"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <Label htmlFor="edit-modelo">Modelo</Label>
                                                                    <Input
                                                                        id="edit-modelo"
                                                                        name="modelo"
                                                                        value={tempFormData.modelo}
                                                                        onChange={handleTempInputChange}
                                                                        placeholder="Ej: Fury Beast"
                                                                    />
                                                                </div>
                                                                <div className="sm:col-span-2">
                                                                    <Label htmlFor="edit-capacidad">Capacidad / Tamaño</Label>
                                                                    <Input
                                                                        id="edit-capacidad"
                                                                        name="capacidad"
                                                                        value={tempFormData.capacidad}
                                                                        onChange={handleTempInputChange}
                                                                        placeholder="Ej: 16GB, 1TB, 27''"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Inventory and Pricing Card */}
                                                        <div className="space-y-6 rounded-lg border border-slate-200 p-6 dark:border-slate-700">
                                                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                                                Inventario y Precio
                                                            </h3>
                                                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                                                <div>
                                                                    <Label htmlFor="edit-cantidad">Cantidad *</Label>
                                                                    <Input
                                                                        id="edit-cantidad"
                                                                        type="number"
                                                                        name="cantidad"
                                                                        value={tempFormData.cantidad || ''}
                                                                        onChange={handleTempInputChange}
                                                                        placeholder="0"
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
                                                                            value={tempFormData.precio || ''}
                                                                            onChange={handleTempInputChange}
                                                                            className="pl-7"
                                                                            placeholder="0.00"
                                                                            min="0"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Sidebar Section */}
                                                    <div className="col-span-1 flex flex-col border-l border-slate-200 bg-slate-50/50 p-6 dark:border-slate-700 dark:bg-slate-800/20">
                                                        <div className="space-y-6">
                                                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                                                Organización
                                                            </h3>
                                                            <div>
                                                                <Label htmlFor="edit-almacen">Almacén Destino *</Label>
                                                                <Select
                                                                    name="almacen_id"
                                                                    value={tempFormData.almacen_id}
                                                                    onValueChange={(value) => handleTempSelectChange('almacen_id', value)}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Seleccione Almacén" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {almacens.map((almacen) => (
                                                                            <SelectItem key={almacen.id} value={almacen.id.toString()}>
                                                                                {almacen.nombre_almacen}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="edit-categoria">Categoría *</Label>
                                                                <Select
                                                                    value={tempFormData.categoria}
                                                                    onValueChange={(value) => handleTempSelectChange('categoria', value)}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Seleccione o cree" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <div className="p-2">
                                                                            <Input
                                                                                type="text"
                                                                                placeholder="Buscar o crear..."
                                                                                value={searchCategoria}
                                                                                onChange={(e) =>
                                                                                    setSearchCategoria(e.target.value.toUpperCase())
                                                                                }
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') {
                                                                                        e.preventDefault();
                                                                                        const trimmed = searchCategoria.trim();
                                                                                        if (trimmed) {
                                                                                            handleTempSelectChange('categoria', trimmed);
                                                                                            setSearchCategoria('');
                                                                                        }
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <div className="max-h-40 overflow-y-auto">
                                                                            {searchCategoria.trim() &&
                                                                                !filteredCategorias.some(
                                                                                    (c) => c.nombre_categoria === searchCategoria.trim(),
                                                                                ) && (
                                                                                    <SelectItem value={searchCategoria.trim()}>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <PlusIcon className="h-4 w-4" />
                                                                                            <span>
                                                                                                Crear: <strong>{searchCategoria.trim()}</strong>
                                                                                            </span>
                                                                                        </div>
                                                                                    </SelectItem>
                                                                                )}
                                                                            {filteredCategorias.map((cat) => (
                                                                                <SelectItem key={cat.id} value={cat.nombre_categoria}>
                                                                                    {cat.nombre_categoria}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </div>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div>
                                                                <Label htmlFor="edit-codigo">Código de Barras</Label>
                                                                <Input
                                                                    id="edit-codigo"
                                                                    value={tempFormData.codigo || 'Generado automáticamente...'}
                                                                    className="cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-700"
                                                                    disabled
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="mt-auto rounded-xl border-2 border-blue-500/40 bg-blue-50/50 p-4 shadow-lg dark:border-blue-700/60 dark:bg-blue-900/30">
                                                            <h4 className="mb-3 text-lg font-bold text-blue-900 dark:text-blue-200">
                                                                Resumen de Costo
                                                            </h4>
                                                            <div className="space-y-2 text-base">
                                                                <div className="flex justify-between">
                                                                    <span className="text-slate-600 dark:text-slate-400">Unidades:</span>
                                                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                                                        {tempFormData.cantidad || 0}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span className="text-slate-600 dark:text-slate-400">
                                                                        Precio Unitario:
                                                                    </span>
                                                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                                                        ${(tempFormData.precio || 0).toFixed(2)}
                                                                    </span>
                                                                </div>
                                                                <Separator className="!my-3 bg-blue-300/50 dark:bg-blue-600/40" />
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">
                                                                        Subtotal:
                                                                    </span>
                                                                    <span className="text-xl font-bold text-blue-800 dark:text-blue-300">
                                                                        $
                                                                        {(
                                                                            (tempFormData.cantidad || 0) * (tempFormData.precio || 0)
                                                                        ).toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <AlertDialogFooter className="shrink-0 flex-row items-center justify-end space-x-4 border-t border-slate-200 bg-slate-50/70 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
                                                    <AlertDialogCancel asChild>
                                                        <Button
                                                            variant="ghost"
                                                            className="hover:bg-slate-200 dark:hover:bg-slate-700"
                                                            onClick={() => setIsDialogOpen(false)}
                                                        >
                                                            Cancelar
                                                        </Button>
                                                    </AlertDialogCancel>
                                                    <Button
                                                        className="cursor-pointer bg-blue-600 text-white shadow-sm transition-all duration-200 hover:bg-blue-700"
                                                        onClick={handleActualizarProducto}
                                                    >
                                                        <HardDriveUpload className="mr-2 h-4 w-4" />
                                                        Guardar Cambios
                                                    </Button>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>

                                        <Button
                                            variant="link"
                                            onClick={() => eliminarProducto(p.id)}
                                            className="ms-2 cursor-pointer text-red-600 hover:text-red-800"
                                        >
                                            <Trash2Icon />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={6} className="bg-gray-500 text-center text-white">
                                    {productos.length} Tipo de Mercancía
                                </TableCell>
                                <TableCell className="bg-gray-600 text-amber-300">{productos.reduce((t, p) => t + p.cantidad, 0)} Unidades</TableCell>
                                <TableCell colSpan={3} className="bg-gray-900 text-center font-bold text-emerald-300">
                                    Importe General: ${calcularTotal()}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>

                {/* Sección del Modal de Compra */}
                <div className="flex justify-center gap-4 p-4">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="outline"
                                className="cursor-pointer rounded-lg bg-green-600 px-6 py-2 font-semibold text-white transition-colors duration-200 hover:bg-green-700 hover:text-white"
                            >
                                <ShoppingCart className="mr-2 h-5 w-5" />
                                Realizar Compra
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-h-[500px] overflow-y-auto sm:max-w-[800px]">
                            <AlertDialogHeader className="border-b pb-6">
                                <div className="flex flex-col items-center space-y-3">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                        <ShoppingCart className="h-6 w-6 text-green-600 dark:text-green-400" />
                                    </div>
                                    <AlertDialogTitle className="text-center text-2xl font-bold text-green-700 dark:text-green-400">
                                        Tipo de Compra
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-center text-lg text-gray-600 dark:text-gray-300">
                                        Seleccione si desea pagar ahora o comprar y pagar luego
                                    </AlertDialogDescription>
                                </div>
                            </AlertDialogHeader>

                            <div className="flex flex-col gap-8 py-8">
                                {/* Tipo de Compra */}
                                <div className="space-y-4">
                                    <Label htmlFor="tipo_compra" className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                                        Tipo de Compra *
                                    </Label>
                                    <Select
                                        name="compra"
                                        value={data.compra}
                                        onValueChange={(value) => setData('compra', value as 'deuda_proveedor' | 'pago_cash')}
                                    >
                                        <SelectTrigger className="h-14 w-full border-2 border-green-300 text-base transition-all duration-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 dark:border-green-600 dark:focus:border-green-400">
                                            <SelectValue placeholder="Seleccione tipo de compra" />
                                        </SelectTrigger>
                                        <SelectContent className="border-0 text-base shadow-xl">
                                            <SelectItem value="deuda_proveedor" className="py-4 text-base hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <div className="flex items-center space-x-4">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                                                        <CreditCard className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="font-medium text-gray-900 dark:text-white">Generar Deuda a Proveedor</div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">Pagar más tarde</div>
                                                    </div>
                                                </div>
                                            </SelectItem>
                                            <SelectItem value="pago_cash" className="py-4 text-base hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <div className="flex items-center space-x-4">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                                        <DollarSign className="h-5 w-5 text-green-500 dark:text-green-400" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <div className="font-medium text-gray-900 dark:text-white">Pagar Ahora</div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">Pago inmediato</div>
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.compra && <InputError message={errors.compra} />}
                                </div>

                                {data.compra === 'pago_cash' && (
                                    <>
                                        <Separator className="my-2" />

                                        {/* Sección de Pagos con Clientes */}
                                        <div className="space-y-6 rounded-2xl border border-blue-200 bg-blue-50/50 p-8 dark:border-blue-800 dark:bg-blue-950/20">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                                                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="clientes" className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                                                            Pagos con Clientes
                                                        </Label>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            Opcional - Aplicar pagos de clientes
                                                        </p>
                                                    </div>
                                                </div>

                                                <Select
                                                    name="clientes"
                                                    value={data.pagos_clientes.map((p) => p.cliente_id.toString())}
                                                    onValueChange={(value) => {
                                                        // Verificar si se seleccionó la opción de crear nuevo cliente
                                                        if (value === 'crear_nuevo_cliente') {
                                                            setIsCrearClienteDialogOpen(true);
                                                            return;
                                                        }

                                                        const selectedClientes = Array.isArray(value) ? value : [value];
                                                        const updatedClientes = [
                                                            ...new Set([
                                                                ...data.pagos_clientes.map((p) => p.cliente_id),
                                                                ...selectedClientes.map((id) => parseInt(id)),
                                                            ]),
                                                        ];
                                                        const updatedPagosClientes = updatedClientes.map((cliente_id) => ({
                                                            cliente_id,
                                                            monto: data.pagos_clientes.find((p) => p.cliente_id === cliente_id)?.monto || 0,
                                                        }));
                                                        setData('pagos_clientes', updatedPagosClientes);
                                                    }}
                                                    multiple
                                                >
                                                    <SelectTrigger className="h-14 w-full border-2 border-blue-300 text-base shadow-sm dark:border-blue-600">
                                                        <SelectValue placeholder="Seleccione clientes para pago..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-60 border-0 shadow-xl">
                                                        {clientes.map((cliente) => (
                                                            <SelectItem key={cliente.id} value={cliente.id.toString()} className="py-3 text-base">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-medium">{cliente.nombre_cliente}</span>
                                                                    <span className="text-sm text-gray-500">
                                                                        Deuda: ${cliente.deuda_pago_cliente}
                                                                    </span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                        <SelectItem value="crear_nuevo_cliente" className="py-3 text-base">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-medium text-blue-600">+ Crear Nuevo Cliente</span>
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                {data.pagos_clientes.length > 0 && (
                                                    <div className="mt-6 space-y-4">
                                                        <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Montos a cobrar:</h4>
                                                        <div className="grid gap-4">
                                                            {data.pagos_clientes.map((pago) => (
                                                                <div
                                                                    key={pago.cliente_id}
                                                                    className="flex items-center gap-4 rounded-xl border border-blue-200 bg-white p-4 shadow-sm dark:border-blue-800 dark:bg-gray-800"
                                                                >
                                                                    <div className="flex-1">
                                                                        <span className="block font-medium text-gray-900 dark:text-white">
                                                                            {clientes.find((c) => c.id === pago.cliente_id)?.nombre_cliente}
                                                                        </span>
                                                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                                                            Deuda pendiente: $
                                                                            {clientes.find((c) => c.id === pago.cliente_id)?.deuda_pago_cliente}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <Input
                                                                            type="number"
                                                                            min="0.01"
                                                                            step="0.01"
                                                                            placeholder="$ 0.00"
                                                                            value={pago.monto || ''}
                                                                            onChange={(e) => {
                                                                                const monto = parseFloat(e.target.value) || 0;
                                                                                const updatedPagos = data.pagos_clientes.map((p) =>
                                                                                    p.cliente_id === pago.cliente_id ? { ...p, monto } : p,
                                                                                );
                                                                                setData('pagos_clientes', updatedPagos);
                                                                            }}
                                                                            className="h-12 border-blue-200 text-base focus:border-blue-400 dark:border-gray-600"
                                                                        />
                                                                    </div>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        className="h-12 cursor-pointer px-4"
                                                                        onClick={() => {
                                                                            const updatedPagos = data.pagos_clientes.filter(
                                                                                (p) => p.cliente_id !== pago.cliente_id,
                                                                            );
                                                                            setData('pagos_clientes', updatedPagos);
                                                                        }}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Diálogo para crear nuevo cliente */}
                                        <Dialog open={isCrearClienteDialogOpen} onOpenChange={setIsCrearClienteDialogOpen}>
                                            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
                                                <DialogHeader>
                                                    <DialogTitle className="flex items-center gap-2">
                                                        <Users className="h-6 w-6 text-blue-600" />
                                                        Crear Nuevo Cliente
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        Agrega un nuevo cliente físico al sistema. Inicialmente tendrá deuda 0.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="grid gap-6 py-4">
                                                    <div className="grid grid-cols-1 gap-4">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="nombre_cliente">Nombre del Cliente *</Label>
                                                            <Input
                                                                id="nombre_cliente"
                                                                name="nombre_cliente"
                                                                value={nuevoCliente.nombre_cliente}
                                                                onChange={handleNuevoClienteChange}
                                                                placeholder="Nombre completo del cliente"
                                                            />
                                                            {clienteErrors.nombre_cliente && (
                                                                <p className="text-sm text-red-500">{clienteErrors.nombre_cliente}</p>
                                                            )}
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="telefono_cliente">Teléfono *</Label>
                                                            <Input
                                                                id="telefono_cliente"
                                                                name="telefono_cliente"
                                                                value={nuevoCliente.telefono_cliente}
                                                                onChange={handleNuevoClienteChange}
                                                                placeholder="Teléfono del cliente"
                                                            />
                                                            {clienteErrors.telefono_cliente && (
                                                                <p className="text-sm text-red-500">{clienteErrors.telefono_cliente}</p>
                                                            )}
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="direccion_cliente">Dirección</Label>
                                                            <Input
                                                                id="direccion_cliente"
                                                                name="direccion_cliente"
                                                                value={nuevoCliente.direccion_cliente}
                                                                onChange={handleNuevoClienteChange}
                                                                placeholder="Dirección del cliente"
                                                            />
                                                            {clienteErrors.direccion_cliente && (
                                                                <p className="text-sm text-red-500">{clienteErrors.direccion_cliente}</p>
                                                            )}
                                                        </div>

                                                        <div className="space-y-2">
                                                            <Label htmlFor="ciudad_cliente">Ciudad</Label>
                                                            <Input
                                                                id="ciudad_cliente"
                                                                name="ciudad_cliente"
                                                                value={nuevoCliente.ciudad_cliente}
                                                                onChange={handleNuevoClienteChange}
                                                                placeholder="Ciudad del cliente"
                                                            />
                                                            {clienteErrors.ciudad_cliente && (
                                                                <p className="text-sm text-red-500">{clienteErrors.ciudad_cliente}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <DialogFooter className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        onClick={() => setIsCrearClienteDialogOpen(false)}
                                                    >
                                                        Cancelar
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        onClick={crearNuevoCliente}
                                                        className="bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        Crear Cliente
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>

                                        {/* Sección de Pagos con Cuentas */}
                                        <div className="space-y-6 rounded-2xl border border-green-200 bg-green-50/50 p-8 dark:border-green-800 dark:bg-green-950/20">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                                        <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <div>
                                                        <Label htmlFor="cuentas" className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                                                            Pagos con Cuentas
                                                        </Label>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                                            Opcional - Pagar desde cuentas disponibles
                                                        </p>
                                                    </div>
                                                </div>

                                                <Select
                                                    name="cuentas"
                                                    value={data.pagos.map((p) => p.cuenta_id.toString())}
                                                    onValueChange={(value) => {
                                                        const selectedCuentas = Array.isArray(value) ? value : [value];
                                                        const updatedCuentas = [
                                                            ...new Set([
                                                                ...data.pagos.map((p) => p.cuenta_id),
                                                                ...selectedCuentas.map((id) => parseInt(id)),
                                                            ]),
                                                        ];
                                                        const updatedPagos = updatedCuentas.map((cuenta_id) => ({
                                                            cuenta_id,
                                                            monto: data.pagos.find((p) => p.cuenta_id === cuenta_id)?.monto || 0,
                                                        }));
                                                        setData('pagos', updatedPagos);
                                                    }}
                                                    multiple
                                                >
                                                    <SelectTrigger className="h-14 w-full border-2 border-green-300 text-base shadow-sm dark:border-green-600">
                                                        <SelectValue placeholder="Seleccione cuentas para pago..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="max-h-60 border-0 shadow-xl">
                                                        {cuentas.map((cuenta) => (
                                                            <SelectItem key={cuenta.id} value={cuenta.id.toString()} className="py-3 text-base">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-medium">{cuenta.nombre_cuenta}</span>
                                                                    <span className="text-sm text-gray-500">Saldo: ${cuenta.saldo_cuenta}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                {data.pagos.length > 0 && (
                                                    <div className="mt-6 space-y-4">
                                                        <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Montos a debitar:</h4>
                                                        <div className="grid gap-4">
                                                            {data.pagos.map((pago) => (
                                                                <div
                                                                    key={pago.cuenta_id}
                                                                    className="flex items-center gap-4 rounded-xl border border-green-200 bg-white p-4 shadow-sm dark:border-green-800 dark:bg-gray-800"
                                                                >
                                                                    <div className="flex-1">
                                                                        <span className="block font-medium text-gray-900 dark:text-white">
                                                                            {cuentas.find((c) => c.id === pago.cuenta_id)?.nombre_cuenta}
                                                                        </span>
                                                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                                                            Saldo disponible: $
                                                                            {cuentas.find((c) => c.id === pago.cuenta_id)?.saldo_cuenta}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <Input
                                                                            type="number"
                                                                            min="0.01"
                                                                            step="0.01"
                                                                            placeholder="$ 0.00"
                                                                            value={pago.monto || ''}
                                                                            onChange={(e) => {
                                                                                const monto = parseFloat(e.target.value) || 0;
                                                                                const updatedPagos = data.pagos.map((p) =>
                                                                                    p.cuenta_id === pago.cuenta_id ? { ...p, monto } : p,
                                                                                );
                                                                                setData('pagos', updatedPagos);
                                                                            }}
                                                                            className="h-12 border-green-200 text-base focus:border-green-400 dark:border-gray-600"
                                                                        />
                                                                    </div>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        className="h-12 cursor-pointer px-4"
                                                                        onClick={() => {
                                                                            const updatedPagos = data.pagos.filter(
                                                                                (p) => p.cuenta_id !== pago.cuenta_id,
                                                                            );
                                                                            setData('pagos', updatedPagos);
                                                                        }}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Resumen de Pagos */}
                                        <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-8 shadow-sm dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
                                            <h3 className="mb-6 text-xl font-semibold text-gray-700 dark:text-gray-200">Resumen de Pagos</h3>
                                            <div className="space-y-4 text-base">
                                                <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm dark:bg-gray-700">
                                                    <span className="text-gray-600 dark:text-gray-300">Total pagado con cuentas:</span>
                                                    <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                                                        ${data.pagos?.reduce((acc, pago) => acc + pago.monto, 0).toFixed(2) || '0.00'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm dark:bg-gray-700">
                                                    <span className="text-gray-600 dark:text-gray-300">Total pagado con clientes:</span>
                                                    <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                                                        ${data.pagos_clientes?.reduce((acc, pago) => acc + pago.monto, 0).toFixed(2) || '0.00'}
                                                    </span>
                                                </div>
                                                <Separator className="my-4" />
                                                <div className="flex items-center justify-between rounded-lg bg-gradient-to-r from-green-50 to-green-100 p-6 dark:from-green-900/30 dark:to-green-800/30">
                                                    <span className="text-xl font-bold text-gray-700 dark:text-gray-200">Total pagado:</span>
                                                    <span
                                                        className={`text-2xl font-bold ${
                                                            (
                                                                data.pagos?.reduce((acc, pago) => acc + pago.monto, 0) +
                                                                data.pagos_clientes?.reduce((acc, pago) => acc + pago.monto, 0)
                                                            ).toFixed(2) === parseFloat(calcularTotal()).toFixed(2)
                                                                ? 'text-green-600 dark:text-green-400'
                                                                : 'text-orange-600 dark:text-orange-400'
                                                        }`}
                                                    >
                                                        $
                                                        {(
                                                            data.pagos?.reduce((acc, pago) => acc + pago.monto, 0) +
                                                            data.pagos_clientes?.reduce((acc, pago) => acc + pago.monto, 0)
                                                        ).toFixed(2) || '0.00'}
                                                        <span className="ml-3 text-base font-normal text-gray-500 dark:text-gray-400">
                                                            / ${parseFloat(calcularTotal()).toFixed(2)}
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <AlertDialogFooter className="border-t pt-6">
                                <AlertDialogCancel className="h-14 cursor-pointer border-2 border-gray-300 px-8 text-base font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">
                                    Cancelar
                                </AlertDialogCancel>
                                <Button
                                    type="button"
                                    onClick={realizarCompra}
                                    disabled={processing}
                                    className="h-14 cursor-pointer bg-green-600 px-10 text-base font-semibold text-white transition-all duration-200 hover:bg-green-700 hover:shadow-lg"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                            Registrando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="mr-3 h-5 w-5" />
                                            Proceder Compra
                                        </>
                                    )}
                                </Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link href="/dashboard">
                                    <Button variant="secondary" className="ms-2 cursor-pointer">
                                        <BookCheck />
                                        Cancelar Compra
                                    </Button>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Cancelar y regresar</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <Toaster position="top-center" />
            </div>
        </AppLayout>
    );
}
