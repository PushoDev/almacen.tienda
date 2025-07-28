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
import { AlmacenProps, CategoriasProps, ClienteProps, CuentaNegocioProps, ProductoComprarProps, ProveedorProps, type BreadcrumbItem } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { BookCheck, CalendarIcon, Edit2, HardDriveUpload, PlusIcon, ShoppingBasket, Trash2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

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
    const [activeTab, setActiveTab] = useState<'cuentas' | 'clientes' | 'combinado'>('cuentas');

    // Estado temporal para campos del producto
    const [tempFormData, setTempFormData] = useState<Omit<ProductoComprarProps, 'id'>>({
        producto: '',
        categoria: '',
        codigo: '',
        cantidad: 0,
        precio: 0,
    });

    // Estado para productos en la tabla
    const [productos, setProductos] = useState<ProductoComprarProps[]>([]);

    // Estado para controlar la apertura del diálogo
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Datos del formulario principal
    const { data, setData, post, processing } = useForm({
        compra: 'deuda_proveedor',
        cuenta_id: 1,
        almacen: '',
        proveedor: '',
        fecha: date ? date.toISOString().split('T')[0] : '',
        pagos: [] as { cuenta_id: number; monto: number }[],
        pagos_clientes: [] as { cliente_id: number; monto: number }[],
        productos: [] as ProductoComprarProps[],
    });

    // Estados para autocompletar
    const [searchProveedor, setSearchProveedor] = useState('');
    const [searchAlmacen, setSearchAlmacen] = useState('');
    const [searchCategoria, setSearchCategoria] = useState('');

    // Cargar datos iniciales
    useEffect(() => {
        fetch('/compras/almacenes')
            .then((res) => res.json())
            .then((data) => setAlmacens(data))
            .catch((err) => console.error(err));
        fetch('/compras/proveedores')
            .then((res) => res.json())
            .then((data) => setProveedors(data))
            .catch((err) => console.error(err));
        fetch('/compras/categorias')
            .then((res) => res.json())
            .then((data) => setCategorias(data))
            .catch((err) => console.error(err));
        fetch('/compras/cuentas/pago')
            .then((res) => res.json())
            .then((data) => setCuentas(data))
            .catch((err) => console.error(err));
        fetch('/compras/clientes/fisicos')
            .then((res) => res.json())
            .then((data) => setClientes(data))
            .catch((err) => console.error(err));
    }, []);

    // Manejar cambios en los campos temporales
    const handleTempInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setTempFormData((prev) => ({
            ...prev,
            [name]: name === 'cantidad' || name === 'precio' ? parseFloat(value) || 0 : value,
        }));
    };

    // Agregar/Editar producto
    const agregarProducto = () => {
        if (!tempFormData.producto || !tempFormData.categoria || !tempFormData.codigo || tempFormData.cantidad <= 0 || tempFormData.precio <= 0) {
            toast.warning('Por favor, completa todos los campos del formulario.');
            return;
        }

        const nuevoProducto: ProductoComprarProps = {
            id: editingProductId || Date.now(),
            ...tempFormData,
        };

        if (editingProductId) {
            setProductos((prev) => prev.map((p) => (p.id === editingProductId ? nuevoProducto : p)));
            setEditingProductId(null);
        } else {
            setProductos((prev) => [...prev, nuevoProducto]);
        }

        // Limpiar campos temporales
        setTempFormData({ producto: '', categoria: '', codigo: '', cantidad: 0, precio: 0 });
    };

    // Eliminar producto
    const eliminarProducto = (id: number) => {
        setProductos((prev) => prev.filter((p) => p.id !== id));
    };

    // Editar producto
    const editarProducto = (id: number) => {
        const productoParaEditar = productos.find((p) => p.id === id);
        if (productoParaEditar) {
            setTempFormData({
                producto: productoParaEditar.producto,
                categoria: productoParaEditar.categoria,
                codigo: productoParaEditar.codigo,
                cantidad: productoParaEditar.cantidad,
                precio: productoParaEditar.precio,
            });
            setEditingProductId(id);
            setIsDialogOpen(true); // Abrir el diálogo
        }
    };

    // Calcular total de la compra
    const calcularTotal = () => {
        return productos.reduce((total, p) => total + p.cantidad * p.precio, 0).toFixed(2);
    };

    // Filtrar proveedores, almacenes y categorias
    const filteredProvedors = proveedors.filter((proveedor) => proveedor.nombre_proveedor.toLowerCase().includes(searchProveedor.toLowerCase()));
    const filteredAlmacens = almacens.filter((almacen) => almacen.nombre_almacen.toLowerCase().includes(searchAlmacen.toLowerCase()));
    const filteredCategorias = categorias.filter((cat) => cat.nombre_categoria.toLowerCase().includes(searchCategoria.toLowerCase()));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Comprar" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
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

                {/* Formulario principal */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sidebar-accent text-center">Nuevos Productos</CardTitle>
                        <CardDescription className="text-center">
                            A continuación usted va a realizar una compra de Productos, recuerde debe asignar: fecha de compra, almacén destino y
                            proveedor.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={(e) => e.preventDefault()}>
                            <div className="grid grid-cols-3 gap-4">
                                {/* Fecha de la Compra */}
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Label htmlFor="fechaCompra">Fecha de la Compra</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant={'outline'}
                                                className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                                            >
                                                <CalendarIcon />
                                                {date ? format(date, 'PPP') : <span>Seleccione Fecha</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="mt-2 w-auto p-0" align="start">
                                            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    {errors.fecha && <InputError message={errors.fecha[0]} />}
                                </div>

                                {/* Proveedor */}
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Label htmlFor="proveedor">Proveedor</Label>
                                    <Select
                                        name="proveedor"
                                        value={data.proveedor}
                                        onValueChange={(value) => {
                                            setData('proveedor', value);
                                            setSearchProveedor('');
                                        }}
                                    >
                                        <SelectTrigger className="mt-2 w-full">
                                            <SelectValue placeholder="Seleccione Proveedor" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <input
                                                type="text"
                                                className="mb-2 w-full rounded border border-gray-300 p-2"
                                                placeholder="Buscar o crear proveedor..."
                                                value={searchProveedor}
                                                onChange={(e) => setSearchProveedor(e.target.value)}
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
                                            {filteredProvedors.length > 0 ? (
                                                filteredProvedors.map((proveedor) => (
                                                    <SelectItem
                                                        key={proveedor.id}
                                                        value={proveedor.nombre_proveedor}
                                                        onSelect={() => {
                                                            setData('proveedor', proveedor.nombre_proveedor);
                                                            setSearchProveedor('');
                                                        }}
                                                    >
                                                        {proveedor.nombre_proveedor}
                                                    </SelectItem>
                                                ))
                                            ) : searchProveedor.trim() ? (
                                                <SelectItem
                                                    value={searchProveedor.trim()}
                                                    onSelect={() => {
                                                        setData('proveedor', searchProveedor.trim());
                                                        setSearchProveedor('');
                                                    }}
                                                >
                                                    ➕ Crear nuevo proveedor: <strong>{searchProveedor.trim()}</strong>
                                                </SelectItem>
                                            ) : (
                                                <SelectItem disabled>No hay proveedores disponibles</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {errors.proveedor && <InputError message={errors.proveedor[0]} />}
                                </div>

                                {/* Almacén Destino */}
                                <div className="grid w-full max-w-sm items-center gap-1.5">
                                    <Label htmlFor="almacen">Almacén</Label>
                                    <Select name="almacen" value={data.almacen} onValueChange={(value) => setData('almacen', value)}>
                                        <SelectTrigger className="mt-2 w-full">
                                            <SelectValue placeholder="Seleccione Almacén" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <input
                                                type="text"
                                                className="mb-2 w-full rounded border border-gray-300 p-2"
                                                placeholder="Buscar almacén..."
                                                value={searchAlmacen}
                                                onChange={(e) => setSearchAlmacen(e.target.value)}
                                            />
                                            {filteredAlmacens.length > 0 ? (
                                                filteredAlmacens.map((almacen) => (
                                                    <SelectItem key={almacen.id} value={almacen.nombre_almacen}>
                                                        {almacen.nombre_almacen}
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <SelectItem disabled>No hay almacenes disponibles</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {errors.almacen && <InputError message={errors.almacen[0]} />}
                                </div>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Formulario de productos */}
                <Card>
                    <CardHeader>
                        <CardDescription className="text-center dark:text-emerald-400">Ingrese Datos del Producto a Comprar</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            {/* Nombre del Producto */}
                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="nombre_producto">Nombre del Producto</Label>
                                <Input
                                    className="mt-2"
                                    type="text"
                                    name="producto"
                                    placeholder="Producto"
                                    value={tempFormData.producto}
                                    onChange={handleTempInputChange}
                                />
                                {errors.producto && <InputError message={errors.producto[0]} />}
                            </div>

                            {/* Código del Producto */}
                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="codigo_producto">Código del Producto</Label>
                                <Input
                                    className="mt-2"
                                    type="text"
                                    name="codigo"
                                    placeholder="Código Producto"
                                    value={tempFormData.codigo}
                                    onChange={handleTempInputChange}
                                />
                                {errors.codigo && <InputError message={errors.codigo[0]} />}
                            </div>

                            {/* Categoría del Producto */}
                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="categorias">Categoría</Label>
                                <Select
                                    name="categoria"
                                    value={tempFormData.categoria}
                                    onValueChange={(value) => {
                                        setTempFormData({ ...tempFormData, categoria: value });
                                        setSearchCategoria(''); // Limpiar búsqueda al seleccionar
                                    }}
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
                                            onChange={(e) => setSearchCategoria(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const trimmed = searchCategoria.trim();
                                                    if (trimmed && !filteredCategorias.some((c) => c.nombre_categoria === trimmed)) {
                                                        setTempFormData({ ...tempFormData, categoria: trimmed });
                                                        setSearchCategoria('');
                                                    }
                                                }
                                            }}
                                        />

                                        {filteredCategorias.length > 0 ? (
                                            filteredCategorias.map((categoria) => (
                                                <SelectItem
                                                    key={categoria.id}
                                                    value={categoria.nombre_categoria}
                                                    onSelect={() => {
                                                        setTempFormData({
                                                            ...tempFormData,
                                                            categoria: categoria.nombre_categoria,
                                                        });
                                                        setSearchCategoria('');
                                                    }}
                                                >
                                                    {categoria.nombre_categoria}
                                                </SelectItem>
                                            ))
                                        ) : searchCategoria.trim() ? (
                                            <SelectItem
                                                value={searchCategoria.trim()}
                                                onSelect={() => {
                                                    setTempFormData({
                                                        ...tempFormData,
                                                        categoria: searchCategoria.trim(),
                                                    });
                                                    setSearchCategoria('');
                                                }}
                                            >
                                                ➕ Crear nueva categoría: <strong>{searchCategoria.trim()}</strong>
                                            </SelectItem>
                                        ) : (
                                            <SelectItem disabled>No hay categorías disponibles</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                {errors.categorias && <InputError message={errors.categorias[0]} />}
                            </div>

                            {/* Precio de Compra */}
                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="precio_producto">Precio</Label>
                                <Input
                                    type="number"
                                    name="precio"
                                    placeholder="$ 0.00"
                                    value={tempFormData.precio || ''}
                                    onChange={handleTempInputChange}
                                />
                                {errors.precio && <InputError message={errors.precio[0]} />}
                            </div>

                            {/* Cantidad de Productos */}
                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="cantidad_producto">Cantidad</Label>
                                <Input
                                    type="number"
                                    name="cantidad"
                                    placeholder="0"
                                    value={tempFormData.cantidad || ''}
                                    onChange={handleTempInputChange}
                                />
                                {errors.cantidad && <InputError message={errors.cantidad[0]} />}
                            </div>

                            {/* Botón Agregar */}
                            <div className="mt-6 grid w-full max-w-sm items-center gap-1">
                                <Button
                                    variant="secondary"
                                    className="cursor-pointer hover:animate-pulse hover:bg-blue-400"
                                    onClick={agregarProducto}
                                >
                                    <PlusIcon />
                                    Agregar Producto
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabla de productos */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <Table>
                        <TableCaption className="text-sidebar-accent">Lista de los Productos a Comprar</TableCaption>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                <TableHead>Producto</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>Cantidad</TableHead>
                                <TableHead>Precio</TableHead>
                                <TableHead>Importe</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {productos.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="font-medium">{p.producto}</TableCell>
                                    <TableCell>{p.categoria}</TableCell>
                                    <TableCell>{p.codigo}</TableCell>
                                    <TableCell>{p.cantidad}</TableCell>
                                    <TableCell>${p.precio.toFixed(2)}</TableCell>
                                    <TableCell>${(p.cantidad * p.precio).toFixed(2)}</TableCell>
                                    <TableCell className="text-right">
                                        {/* Dialog para Editar */}
                                        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="link"
                                                    className="cursor-pointer text-blue-600 hover:text-blue-800"
                                                    onClick={() => editarProducto(p.id)} // Cargar datos para editar
                                                >
                                                    <Edit2 />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Editar Producto</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Modifica los datos del producto y guarda los cambios.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>

                                                {/* Formulario de edición */}
                                                <div className="grid gap-4 py-4">
                                                    {/* Nombre del Producto */}
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-producto" className="text-right">
                                                            Nombre
                                                        </Label>
                                                        <Input
                                                            id="edit-producto"
                                                            value={tempFormData.producto}
                                                            onChange={(e) =>
                                                                setTempFormData({
                                                                    ...tempFormData,
                                                                    producto: e.target.value,
                                                                })
                                                            }
                                                            className="col-span-3"
                                                        />
                                                    </div>

                                                    {/* Código del Producto */}
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-codigo" className="text-right">
                                                            Código
                                                        </Label>
                                                        <Input
                                                            id="edit-codigo"
                                                            value={tempFormData.codigo}
                                                            onChange={(e) =>
                                                                setTempFormData({
                                                                    ...tempFormData,
                                                                    codigo: e.target.value,
                                                                })
                                                            }
                                                            className="col-span-3"
                                                        />
                                                    </div>

                                                    {/* Categoría del Producto */}
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-categoria" className="text-right">
                                                            Categoría
                                                        </Label>
                                                        <Select
                                                            value={tempFormData.categoria}
                                                            onValueChange={(value) =>
                                                                setTempFormData({
                                                                    ...tempFormData,
                                                                    categoria: value,
                                                                })
                                                            }
                                                        >
                                                            <SelectTrigger className="col-span-3">
                                                                <SelectValue placeholder="Seleccione o cree una categoría" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <input
                                                                    type="text"
                                                                    className="mb-2 w-full rounded border border-gray-300 p-2"
                                                                    placeholder="Buscar o crear categoría..."
                                                                    value={searchCategoria}
                                                                    onChange={(e) => setSearchCategoria(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            e.preventDefault();
                                                                            const trimmed = searchCategoria.trim();
                                                                            if (trimmed) {
                                                                                setTempFormData({
                                                                                    ...tempFormData,
                                                                                    categoria: trimmed,
                                                                                });
                                                                                setSearchCategoria('');
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                                {filteredCategorias.length > 0 ? (
                                                                    filteredCategorias.map((cat) => (
                                                                        <SelectItem
                                                                            key={cat.id}
                                                                            value={cat.nombre_categoria}
                                                                            onSelect={() =>
                                                                                setTempFormData({
                                                                                    ...tempFormData,
                                                                                    categoria: cat.nombre_categoria,
                                                                                })
                                                                            }
                                                                        >
                                                                            {cat.nombre_categoria}
                                                                        </SelectItem>
                                                                    ))
                                                                ) : searchCategoria.trim() ? (
                                                                    <SelectItem
                                                                        value={searchCategoria.trim()}
                                                                        onSelect={() =>
                                                                            setTempFormData({
                                                                                ...tempFormData,
                                                                                categoria: searchCategoria.trim(),
                                                                            })
                                                                        }
                                                                    >
                                                                        ➕ Crear: <strong>{searchCategoria.trim()}</strong>
                                                                    </SelectItem>
                                                                ) : (
                                                                    <SelectItem disabled>Sin categorías</SelectItem>
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* Precio */}
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-precio" className="text-right">
                                                            Precio
                                                        </Label>
                                                        <Input
                                                            id="edit-precio"
                                                            type="number"
                                                            step="0.01"
                                                            value={tempFormData.precio || ''}
                                                            onChange={(e) =>
                                                                setTempFormData({
                                                                    ...tempFormData,
                                                                    precio: parseFloat(e.target.value) || 0,
                                                                })
                                                            }
                                                            className="col-span-3"
                                                        />
                                                    </div>

                                                    {/* Cantidad */}
                                                    <div className="grid grid-cols-4 items-center gap-4">
                                                        <Label htmlFor="edit-cantidad" className="text-right">
                                                            Cantidad
                                                        </Label>
                                                        <Input
                                                            id="edit-cantidad"
                                                            type="number"
                                                            value={tempFormData.cantidad || ''}
                                                            onChange={(e) =>
                                                                setTempFormData({
                                                                    ...tempFormData,
                                                                    cantidad: parseInt(e.target.value) || 0,
                                                                })
                                                            }
                                                            className="col-span-3"
                                                        />
                                                    </div>
                                                </div>

                                                <AlertDialogFooter>
                                                    <AlertDialogCancel onClick={() => setIsDialogOpen(false)}>Cancelar</AlertDialogCancel>
                                                    <Button
                                                        className="cursor-pointer"
                                                        onClick={() => {
                                                            if (
                                                                !tempFormData.producto.trim() ||
                                                                !tempFormData.categoria.trim() ||
                                                                !tempFormData.codigo.trim() ||
                                                                tempFormData.cantidad <= 0 ||
                                                                tempFormData.precio <= 0
                                                            ) {
                                                                toast.warning('Por favor, completa todos los campos válidos.');
                                                                return;
                                                            }

                                                            // Actualizar producto
                                                            setProductos((prev) =>
                                                                prev.map((prod) =>
                                                                    prod.id === p.id
                                                                        ? {
                                                                              ...tempFormData,
                                                                              id: p.id,
                                                                          }
                                                                        : prod,
                                                                ),
                                                            );

                                                            // Resetear tempFormData después de guardar
                                                            setTempFormData({
                                                                producto: '',
                                                                categoria: '',
                                                                codigo: '',
                                                                cantidad: 0,
                                                                precio: 0,
                                                            });

                                                            toast.success('Producto actualizado correctamente');
                                                            setIsDialogOpen(false); // Cerrar el diálogo
                                                        }}
                                                    >
                                                        <HardDriveUpload className="mr-2 h-4 w-4" />
                                                        Actualizar
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
                                <TableCell colSpan={3} className="bg-gray-500 text-center text-white">
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

                {/* Botones de acción */}
                <div className="flex justify-center gap-4 p-4">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="bg-green-600 text-white hover:bg-green-700">
                                Realizar Compra
                            </Button>
                        </AlertDialogTrigger>
                        {/* Contenido */}
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Tipo de Compra</AlertDialogTitle>
                                <AlertDialogDescription>Seleccione si desea pagar ahora o comprar y pagar luego</AlertDialogDescription>
                            </AlertDialogHeader>

                            {/* Formulario dinámico */}
                            <div className="flex flex-col gap-4 pt-4">
                                {/* Tipo de Compra (siempre visible) */}
                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="tipo_compra">Tipo de Compra</Label>
                                    <Select
                                        name="compra"
                                        value={data.compra}
                                        onValueChange={(value) => setData('compra', value as 'deuda_proveedor' | 'pago_cash')}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Seleccione tipo de compra" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="deuda_proveedor">Generar Deuda a Proveedor</SelectItem>
                                            <SelectItem value="pago_cash">Pagar Ahora</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {errors.compra && <InputError message={errors.compra[0]} />}
                                </div>

                                {/* Solo mostrar si es pago_cash */}
                                {data.compra === 'pago_cash' && (
                                    <>
                                        <Separator />

                                        <div className="space-y-4">
                                            <div className="space-y-3">
                                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300"></h3>

                                                <Label htmlFor="cliente">Seleccione Clientes (Opcional)</Label>
                                                <Select
                                                    name="cliente"
                                                    value={data.cliente}
                                                    onValueChange={(value) => {
                                                        setData('cliente', value);
                                                        setData('montoVisible', value !== ''); // Muestra el input solo si hay un cliente seleccionado
                                                    }}
                                                >
                                                    <SelectTrigger className="mt-2 w-full">
                                                        <SelectValue placeholder="Seleccione Cliente" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {clientes.map((cliente) => (
                                                            <SelectItem key={cliente.id} value={cliente.nombre_cliente}>
                                                                {cliente.nombre_cliente}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {errors.clientes && <InputError message={errors.clientes} />}

                                                {data.cliente && ( // Solo muestra el nombre y el input si hay un cliente seleccionado
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1">
                                                            <span className="block font-medium">{data.cliente}</span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <Input
                                                                type="number"
                                                                min="0.01"
                                                                step="0.01"
                                                                placeholder="Monto"
                                                                value={
                                                                    data.pagos_clientes?.find(
                                                                        (p) =>
                                                                            p.cliente_id ===
                                                                            clientes.find((c) => c.nombre_cliente === data.cliente)?.id,
                                                                    )?.monto ?? ''
                                                                }
                                                                onChange={(e) => {
                                                                    const monto = parseFloat(e.target.value) || 0;
                                                                    const clienteId = clientes.find((c) => c.nombre_cliente === data.cliente)?.id;

                                                                    // Actualizar el monto en el estado de pagos_clientes
                                                                    const updatedPagos = [...(data.pagos_clientes || [])];
                                                                    const idx = updatedPagos.findIndex((p) => p.cliente_id === clienteId);

                                                                    if (idx > -1) {
                                                                        updatedPagos[idx].monto = monto;
                                                                    } else {
                                                                        updatedPagos.push({ cliente_id: clienteId, monto });
                                                                    }

                                                                    setData('pagos_clientes', updatedPagos);
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <Separator />

                                            <div className="space-y-3">
                                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Pagar con Cuentas</h3>

                                                {cuentas.map((cuenta) => {
                                                    const index = data.pagos?.findIndex((pago) => pago.cuenta_id === cuenta.id);
                                                    const pago = data.pagos?.[index] || null;

                                                    return (
                                                        <div key={cuenta.id} className="flex items-center gap-3">
                                                            <div className="flex-1">
                                                                <span className="block font-medium">{cuenta.nombre_cuenta}</span>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    Saldo: ${cuenta.saldo_cuenta.toFixed(2)}
                                                                </span>
                                                            </div>

                                                            <div className="flex-1">
                                                                <Input
                                                                    type="number"
                                                                    min="0.01"
                                                                    step="0.01"
                                                                    placeholder="Monto"
                                                                    value={pago?.monto ?? ''}
                                                                    onChange={(e) => {
                                                                        const monto = parseFloat(e.target.value) || 0;
                                                                        if (!data.pagos) {
                                                                            setData('pagos', [{ cuenta_id: cuenta.id, monto }]);
                                                                        } else {
                                                                            const updatedPagos = [...data.pagos];
                                                                            const idx = updatedPagos.findIndex((p) => p.cuenta_id === cuenta.id);

                                                                            if (idx > -1) {
                                                                                updatedPagos[idx].monto = monto;
                                                                            } else {
                                                                                updatedPagos.push({ cuenta_id: cuenta.id, monto });
                                                                            }

                                                                            setData('pagos', updatedPagos);
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Total acumulado y validación */}
                                        <div className="mt-2 space-y-2">
                                            <div className="text-right text-sm text-gray-600 dark:text-gray-400">
                                                Total pagado con cuentas: $
                                                {data.pagos?.reduce((acc, pago) => acc + pago.monto, 0).toFixed(2) || '0.00'}
                                            </div>
                                            <div className="text-right text-sm text-gray-600 dark:text-gray-400">
                                                Total pagado con clientes: $
                                                {data.pagos_clientes?.reduce((acc, pago) => acc + pago.monto, 0).toFixed(2) || '0.00'}
                                            </div>
                                            <div className="text-right text-sm font-medium">
                                                Total pagado: $
                                                {(
                                                    data.pagos?.reduce((acc, pago) => acc + pago.monto, 0) +
                                                    data.pagos_clientes?.reduce((acc, pago) => acc + pago.monto, 0)
                                                ).toFixed(2) || '0.00'}{' '}
                                                / ${parseFloat(calcularTotal()).toFixed(2)}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setData('productos', productos);
                                        post('/comprar', {
                                            preserveScroll: true,
                                            onSuccess: () => {
                                                setProductos([]);
                                                setTempFormData({
                                                    producto: '',
                                                    categoria: '',
                                                    codigo: '',
                                                    cantidad: 0,
                                                    precio: 0,
                                                });
                                                toast.success('Compra Realizada con Exito');
                                                // Resetear tabs
                                                setActiveTab('cuentas');
                                            },
                                        });
                                    }}
                                    disabled={processing}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {processing ? 'Registrando...' : 'Proceder Compra'}
                                </Button>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link href="/dashboard">
                                    <Button variant="secondary" className="ms-2">
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
