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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
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
    ChevronsUpDown,
    CreditCard,
    DollarSign,
    Edit2,
    HardDriveUpload,
    Info,
    Loader2,
    Phone,
    PlusCircle,
    PlusIcon,
    ShoppingBasket,
    ShoppingCart,
    Trash2Icon,
    Users,
    Wallet,
    Warehouse,
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

    // Estados para búsqueda de clientes
    const [clienteSearchTerm, setClienteSearchTerm] = useState('');
    const [filteredClientes, setFilteredClientes] = useState<ClienteProps[]>([]);
    const [isSearchingClientes, setIsSearchingClientes] = useState(false);
    const [clienteSelectOpen, setClienteSelectOpen] = useState(false);

    // Estados para búsqueda de almacenes
    const [almacenSearchTerm, setAlmacenSearchTerm] = useState('');
    const [filteredAlmacens, setFilteredAlmacens] = useState<AlmacenProps[]>([]);
    const [lastSelectedAlmacenId, setLastSelectedAlmacenId] = useState<string>('');

    // Estado para el modal de crear almacén
    const [isCrearAlmacenDialogOpen, setIsCrearAlmacenDialogOpen] = useState(false);
    const [almacenErrors, setAlmacenErrors] = useState<Record<string, string>>({});

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
    const [clienteErrors, setClienteErrors] = useState<Record<string, string>>({});

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
                    toast.error('Error al buscar clientes');
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

    // 🔍 EFECTO PARA BÚSQUEDA EN TIEMPO REAL DE ALMACENES
    useEffect(() => {
        if (almacenSearchTerm) {
            const filtered = almacens.filter((almacen) => almacen.nombre_almacen.toLowerCase().includes(almacenSearchTerm.toLowerCase()));
            setFilteredAlmacens(filtered);
        } else {
            setFilteredAlmacens(almacens);
        }
    }, [almacenSearchTerm, almacens]);

    // ⚡ EFECTO PARA MANTENER EL ÚLTIMO ALMACÉN SELECCIONADO
    useEffect(() => {
        if (lastSelectedAlmacenId && !tempFormData.almacen_id) {
            setTempFormData((prev) => ({
                ...prev,
                almacen_id: lastSelectedAlmacenId,
            }));
        }
    }, [lastSelectedAlmacenId, tempFormData.almacen_id]);

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
                setFilteredClientes(clientesRes.data);
                setFilteredAlmacens(almacenesRes.data);
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

        // Guardar el último almacén seleccionado
        if (name === 'almacen_id') {
            setLastSelectedAlmacenId(value);
        }
    };

    const resetTempForm = () => {
        setTempFormData({
            almacen_id: lastSelectedAlmacenId || '', // Mantener el último almacén seleccionado
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

    // 🏗️ COMPONENTE DE CREACIÓN DE ALMACÉN - CORREGIDO CON CAMPOS REALES
    const CrearAlmacenDialogContent = () => {
        const [localAlmacen, setLocalAlmacen] = useState({
            nombre_almacen: '',
            tipo_almacen: 'punto_venta',
            telefono_almacen: '',
            correo_almacen: '',
            provincia_almacen: '',
            ciudad_almacen: '',
            notas_almacen: '',
        });

        const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

        const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const { name, value } = e.target;
            setLocalAlmacen((prev) => ({
                ...prev,
                [name]: value,
            }));
        };

        const handleLocalSelectChange = (name: string, value: string) => {
            setLocalAlmacen((prev) => ({
                ...prev,
                [name]: value,
            }));
        };

        const crearAlmacenLocal = async () => {
            // Validación básica en frontend
            if (!localAlmacen.nombre_almacen.trim() || !localAlmacen.telefono_almacen.trim()) {
                toast.error('Nombre y teléfono son requeridos');
                return;
            }

            try {
                const response = await axios.post(route('compras.almacen.store'), localAlmacen);

                const { almacen, message } = response.data;

                toast.success(message, {
                    description: 'Almacén creado exitosamente.',
                });

                // Agregar a la lista de almacenes
                setAlmacens((prev) => [...prev, almacen]);
                setFilteredAlmacens((prev) => [...prev, almacen]);

                // Seleccionar automáticamente el nuevo almacén
                setLastSelectedAlmacenId(almacen.id.toString());
                setTempFormData((prev) => ({
                    ...prev,
                    almacen_id: almacen.id.toString(),
                }));

                // Limpiar formulario y cerrar diálogo
                setLocalAlmacen({
                    nombre_almacen: '',
                    tipo_almacen: 'punto_venta',
                    telefono_almacen: '',
                    correo_almacen: '',
                    provincia_almacen: '',
                    ciudad_almacen: '',
                    notas_almacen: '',
                });

                setLocalErrors({});
                setIsCrearAlmacenDialogOpen(false);
                setAlmacenSearchTerm('');
            } catch (error: any) {
                console.error('Error al crear almacén:', error);

                if (error.response?.status === 409) {
                    // Almacén ya existe
                    toast.warning('Almacén ya existe', {
                        description: 'El almacén ya se encuentra registrado en el sistema.',
                    });

                    // Buscar el almacén existente
                    const almacenExistente = almacens.find(
                        (a) => a.nombre_almacen.toLowerCase() === localAlmacen.nombre_almacen.trim().toLowerCase(),
                    );

                    if (almacenExistente) {
                        setLastSelectedAlmacenId(almacenExistente.id.toString());
                        setTempFormData((prev) => ({
                            ...prev,
                            almacen_id: almacenExistente.id.toString(),
                        }));
                    }

                    setIsCrearAlmacenDialogOpen(false);
                    setAlmacenSearchTerm('');
                } else if (error.response?.data?.errors) {
                    setLocalErrors(error.response.data.errors);
                    toast.error('Error de validación', {
                        description: 'Por favor corrige los errores en el formulario.',
                    });
                } else {
                    toast.error('Error al crear almacén', {
                        description: 'Intenta nuevamente o contacta al administrador.',
                    });
                }
            }
        };

        const resetDialog = () => {
            setLocalAlmacen({
                nombre_almacen: '',
                tipo_almacen: 'punto_venta',
                telefono_almacen: '',
                correo_almacen: '',
                provincia_almacen: '',
                ciudad_almacen: '',
                notas_almacen: '',
            });
            setLocalErrors({});
            setIsCrearAlmacenDialogOpen(false);
        };

        return (
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Warehouse className="h-5 w-5 text-blue-600" />
                        Crear Nuevo Almacén
                    </DialogTitle>
                    <DialogDescription>Configura un nuevo espacio de almacenamiento para tus productos.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-4">
                        <div className="grid gap-4">
                            {/* Nombre del Almacén */}
                            <div className="space-y-2">
                                <Label htmlFor="dialog-nombre-almacen" className="flex items-center gap-1">
                                    Nombre del Almacén <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="dialog-nombre-almacen"
                                    name="nombre_almacen"
                                    value={localAlmacen.nombre_almacen}
                                    onChange={handleLocalChange}
                                    placeholder="Ej: Almacén Central, Bodega Norte"
                                    className={localErrors.nombre_almacen ? 'border-red-500' : ''}
                                />
                                {localErrors.nombre_almacen && <p className="text-sm text-red-500">{localErrors.nombre_almacen}</p>}
                            </div>

                            {/* Tipo de Almacén */}
                            <div className="space-y-2">
                                <Label htmlFor="dialog-tipo-almacen">
                                    Tipo de Almacén <span className="text-red-500">*</span>
                                </Label>
                                <Select value={localAlmacen.tipo_almacen} onValueChange={(value) => handleLocalSelectChange('tipo_almacen', value)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="almacen">Almacén</SelectItem>
                                        <SelectItem value="punto_venta">Punto de Venta</SelectItem>
                                        <SelectItem value="transportacion">Transportación</SelectItem>
                                    </SelectContent>
                                </Select>
                                {localErrors.tipo_almacen && <p className="text-sm text-red-500">{localErrors.tipo_almacen}</p>}
                            </div>

                            {/* Teléfono */}
                            <div className="space-y-2">
                                <Label htmlFor="dialog-telefono-almacen" className="flex items-center gap-1">
                                    Teléfono <span className="text-red-500">*</span>
                                </Label>
                                <div className="flex items-center">
                                    <Phone className="absolute ml-3 h-4 w-4 text-gray-500" />
                                    <Input
                                        id="dialog-telefono-almacen"
                                        name="telefono_almacen"
                                        value={localAlmacen.telefono_almacen}
                                        onChange={handleLocalChange}
                                        placeholder="Ej: 555-1234"
                                        className={`pl-10 ${localErrors.telefono_almacen ? 'border-red-500' : ''}`}
                                    />
                                </div>
                                {localErrors.telefono_almacen && <p className="text-sm text-red-500">{localErrors.telefono_almacen}</p>}
                            </div>

                            {/* Correo */}
                            <div className="space-y-2">
                                <Label htmlFor="dialog-correo-almacen">Correo Electrónico</Label>
                                <Input
                                    id="dialog-correo-almacen"
                                    name="correo_almacen"
                                    type="email"
                                    value={localAlmacen.correo_almacen}
                                    onChange={handleLocalChange}
                                    placeholder="ejemplo@empresa.com"
                                />
                            </div>

                            {/* Provincia y Ciudad */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="dialog-provincia-almacen">Provincia</Label>
                                    <Input
                                        id="dialog-provincia-almacen"
                                        name="provincia_almacen"
                                        value={localAlmacen.provincia_almacen}
                                        onChange={handleLocalChange}
                                        placeholder="Ej: Lima"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dialog-ciudad-almacen">Ciudad</Label>
                                    <Input
                                        id="dialog-ciudad-almacen"
                                        name="ciudad_almacen"
                                        value={localAlmacen.ciudad_almacen}
                                        onChange={handleLocalChange}
                                        placeholder="Ej: Lima Centro"
                                    />
                                </div>
                            </div>

                            {/* Notas */}
                            <div className="space-y-2">
                                <Label htmlFor="dialog-notas-almacen">Notas Adicionales</Label>
                                <textarea
                                    id="dialog-notas-almacen"
                                    name="notas_almacen"
                                    value={localAlmacen.notas_almacen}
                                    onChange={handleLocalChange}
                                    placeholder="Información adicional sobre el almacén..."
                                    rows={3}
                                    className="border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                        </div>

                        {/* Información importante */}
                        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
                            <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 text-blue-600" />
                                <div className="text-sm text-blue-800 dark:text-blue-300">
                                    <p className="font-medium">Tipos de almacén:</p>
                                    <ul className="mt-1 list-inside list-disc space-y-1">
                                        <li>
                                            <strong>Almacén:</strong> Para guardar productos en inventario
                                        </li>
                                        <li>
                                            <strong>Punto de Venta:</strong> Para venta directa al público
                                        </li>
                                        <li>
                                            <strong>Transportación:</strong> Para movilización de productos
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={resetDialog}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={crearAlmacenLocal}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={!localAlmacen.nombre_almacen.trim() || !localAlmacen.telefono_almacen.trim()}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Crear Almacén
                    </Button>
                </DialogFooter>
            </DialogContent>
        );
    };

    // 🆕 COMPONENTE DE CREACIÓN DE CLIENTE
    const CrearClienteDialogContent = () => {
        const [localCliente, setLocalCliente] = useState({
            nombre_cliente: '',
            telefono_cliente: '',
            direccion_cliente: '',
            ciudad_cliente: '',
        });

        const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

        const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const { name, value } = e.target;
            setLocalCliente((prev) => ({
                ...prev,
                [name]: value,
            }));
        };

        const crearClienteLocal = async () => {
            // Validación básica en frontend
            if (!localCliente.nombre_cliente.trim() || !localCliente.telefono_cliente.trim()) {
                toast.error('Nombre y teléfono son requeridos');
                return;
            }

            try {
                const response = await axios.post(route('compras.cliente.store'), {
                    ...localCliente,
                    tipo_cliente: 'fisico',
                });

                const { cliente, existe, message } = response.data;

                // Si el cliente ya existe (retornado por el backend)
                if (existe) {
                    toast.info(message, {
                        description: 'El cliente ya existía en el sistema. Se ha agregado automáticamente.',
                    });

                    // Verificar si el cliente ya está en la lista
                    if (!clientes.some((c) => c.id === cliente.id)) {
                        setClientes((prev) => [...prev, cliente]);
                    }
                } else {
                    // Cliente nuevo creado
                    toast.success(message, {
                        description: 'Cliente creado exitosamente.',
                    });
                    setClientes((prev) => [...prev, cliente]);
                }

                // Agregar automáticamente a pagos_clientes con monto 0
                if (!data.pagos_clientes.some((p) => p.cliente_id === cliente.id)) {
                    setData('pagos_clientes', [...data.pagos_clientes, { cliente_id: cliente.id, monto: 0 }]);
                }

                // Limpiar formulario y cerrar diálogo
                setLocalCliente({
                    nombre_cliente: '',
                    telefono_cliente: '',
                    direccion_cliente: '',
                    ciudad_cliente: '',
                });

                setLocalErrors({});
                setIsCrearClienteDialogOpen(false);
            } catch (error: any) {
                console.error('Error al crear cliente:', error);

                if (error.response?.status === 409 && error.response?.data?.cliente_existente) {
                    // Cliente ya existe - usar el existente
                    const clienteExistente = error.response.data.cliente_existente;
                    toast.warning('Cliente ya existe', {
                        description: 'Se usará el cliente existente en el sistema.',
                    });

                    // Agregar a la lista si no está
                    if (!clientes.some((c) => c.id === clienteExistente.id)) {
                        setClientes((prev) => [...prev, clienteExistente]);
                    }

                    // Agregar a pagos_clientes
                    if (!data.pagos_clientes.some((p) => p.cliente_id === clienteExistente.id)) {
                        setData('pagos_clientes', [...data.pagos_clientes, { cliente_id: clienteExistente.id, monto: 0 }]);
                    }

                    setIsCrearClienteDialogOpen(false);
                } else if (error.response?.data?.errors) {
                    setLocalErrors(error.response.data.errors);
                    toast.error('Error de validación', {
                        description: 'Por favor corrige los errores en el formulario.',
                    });
                } else {
                    toast.error('Error al crear cliente', {
                        description: 'Intenta nuevamente o contacta al administrador.',
                    });
                }
            }
        };

        const resetDialog = () => {
            setLocalCliente({
                nombre_cliente: '',
                telefono_cliente: '',
                direccion_cliente: '',
                ciudad_cliente: '',
            });
            setLocalErrors({});
            setIsCrearClienteDialogOpen(false);
        };

        return (
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Users className="h-5 w-5 text-blue-600" />
                        Crear Nuevo Cliente Físico
                    </DialogTitle>
                    <DialogDescription>Los clientes físicos pueden usarse como fuente de financiamiento para compras.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="space-y-4">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="dialog-nombre-cliente" className="flex items-center gap-1">
                                    Nombre Completo <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="dialog-nombre-cliente"
                                    name="nombre_cliente"
                                    value={localCliente.nombre_cliente}
                                    onChange={handleLocalChange}
                                    placeholder="Ej: Juan Pérez"
                                    className={localErrors.nombre_cliente ? 'border-red-500' : ''}
                                />
                                {localErrors.nombre_cliente && <p className="text-sm text-red-500">{localErrors.nombre_cliente}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dialog-telefono-cliente" className="flex items-center gap-1">
                                    Teléfono <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="dialog-telefono-cliente"
                                    name="telefono_cliente"
                                    value={localCliente.telefono_cliente}
                                    onChange={handleLocalChange}
                                    placeholder="Ej: 555-1234"
                                    className={localErrors.telefono_cliente ? 'border-red-500' : ''}
                                />
                                {localErrors.telefono_cliente && <p className="text-sm text-red-500">{localErrors.telefono_cliente}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="dialog-ciudad-cliente">Ciudad</Label>
                                    <Input
                                        id="dialog-ciudad-cliente"
                                        name="ciudad_cliente"
                                        value={localCliente.ciudad_cliente}
                                        onChange={handleLocalChange}
                                        placeholder="Ej: Lima"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="deuda_inicial">Crédito Inicial</Label>
                                    <div className="flex items-center rounded-md border bg-gray-50">
                                        <span className="bg-muted px-3 py-2 text-gray-500">$</span>
                                        <Input type="number" value="0" disabled className="border-0 bg-transparent" />
                                    </div>
                                    <p className="text-xs text-gray-500">Todos los clientes nuevos empiezan con crédito 0</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="dialog-direccion-cliente">Dirección</Label>
                                <textarea
                                    id="dialog-direccion-cliente"
                                    name="direccion_cliente"
                                    value={localCliente.direccion_cliente}
                                    onChange={handleLocalChange}
                                    placeholder="Dirección completa"
                                    rows={3}
                                    className="border-input ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
                            <div className="flex items-start gap-3">
                                <Info className="h-5 w-5 text-blue-600" />
                                <div className="text-sm text-blue-800 dark:text-blue-300">
                                    <p className="font-medium">¿Cómo funciona el financiamiento con clientes?</p>
                                    <p className="mt-1">
                                        Los clientes pueden prestar dinero a la empresa. Al usar un cliente para pagar una compra, se reduce su
                                        crédito (si tenía) o se genera una nueva deuda con el cliente.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={resetDialog}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={crearClienteLocal}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={!localCliente.nombre_cliente.trim() || !localCliente.telefono_cliente.trim()}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Crear Cliente
                    </Button>
                </DialogFooter>
            </DialogContent>
        );
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
                            {/* Fila 1 - ALMACÉN CON BÚSQUEDA Y MODAL */}
                            <div className="grid w-full max-w-sm items-center gap-1">
                                <Label htmlFor="almacen_id">Almacén Destino *</Label>
                                <Select
                                    name="almacen_id"
                                    value={tempFormData.almacen_id}
                                    onValueChange={(value) => handleTempSelectChange('almacen_id', value)}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder={lastSelectedAlmacenId ? 'Último seleccionado' : 'Seleccione Almacén'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <div className="p-2">
                                            <Input
                                                type="text"
                                                placeholder="Buscar almacén..."
                                                value={almacenSearchTerm}
                                                onChange={(e) => setAlmacenSearchTerm(e.target.value)}
                                                className="text-sm"
                                            />
                                        </div>
                                        <div className="max-h-60 overflow-y-auto">
                                            {filteredAlmacens.length > 0 ? (
                                                filteredAlmacens.map((almacen) => (
                                                    <SelectItem key={almacen.id} value={almacen.id.toString()}>
                                                        <div className="flex items-center gap-2">
                                                            <Warehouse className="h-4 w-4 text-gray-500" />
                                                            <span>{almacen.nombre_almacen}</span>
                                                            {almacen.tipo_almacen && (
                                                                <Badge variant="outline" className="ml-auto text-xs">
                                                                    {almacen.tipo_almacen}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </SelectItem>
                                                ))
                                            ) : (
                                                <div className="text-muted-foreground px-2 py-4 text-center text-sm">
                                                    {almacenSearchTerm ? 'No se encontraron almacenes' : 'No hay almacenes disponibles'}
                                                </div>
                                            )}
                                        </div>
                                        <Separator className="my-2" />
                                        <div
                                            className="flex cursor-pointer items-center rounded-md bg-blue-50 px-3 py-3 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300"
                                            onClick={() => {
                                                setIsCrearAlmacenDialogOpen(true);
                                            }}
                                        >
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            <span className="font-medium">Crear nuevo almacén</span>
                                            {almacenSearchTerm && <span className="ml-2 text-sm">"{almacenSearchTerm}"</span>}
                                        </div>
                                    </SelectContent>
                                </Select>
                                {!tempFormData.almacen_id && productos.some((p) => !p.almacen_id) && (
                                    <p className="text-sm text-red-500">Debe seleccionar un almacén válido</p>
                                )}
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
                            {productos.map((p) => {
                                const almacen = almacens.find((a) => a.id === p.almacen_id);
                                return (
                                    <TableRow key={p.id} className={!almacen ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                                        <TableCell className="font-medium">{p.producto}</TableCell>
                                        <TableCell>{p.marca || 'N/A'}</TableCell>
                                        <TableCell>{p.modelo || 'N/A'}</TableCell>
                                        <TableCell>{p.capacidad || 'N/A'}</TableCell>
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
                                                        <AlertDialogTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800 sm:text-2xl dark:text-white">
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
                                                                            <div className="p-2">
                                                                                <Input
                                                                                    type="text"
                                                                                    placeholder="Buscar almacén..."
                                                                                    value={almacenSearchTerm}
                                                                                    onChange={(e) => setAlmacenSearchTerm(e.target.value)}
                                                                                    className="text-sm"
                                                                                />
                                                                            </div>
                                                                            <div className="max-h-40 overflow-y-auto">
                                                                                {filteredAlmacens.map((almacen) => (
                                                                                    <SelectItem key={almacen.id} value={almacen.id.toString()}>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <Warehouse className="h-4 w-4 text-gray-500" />
                                                                                            <span>{almacen.nombre_almacen}</span>
                                                                                            {almacen.tipo_almacen && (
                                                                                                <Badge variant="outline" className="ml-auto text-xs">
                                                                                                    {almacen.tipo_almacen}
                                                                                                </Badge>
                                                                                            )}
                                                                                        </div>
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </div>
                                                                            <Separator className="my-2" />
                                                                            <div
                                                                                className="flex cursor-pointer items-center rounded-md bg-blue-50 px-3 py-2 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300"
                                                                                onClick={() => {
                                                                                    setIsCrearAlmacenDialogOpen(true);
                                                                                }}
                                                                            >
                                                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                                                <span>Crear nuevo almacén</span>
                                                                            </div>
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
                                                                                    onChange={(e) => setSearchCategoria(e.target.value.toUpperCase())}
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
                                                                        <span className="text-slate-600 dark:text-slate-400">Precio Unitario:</span>
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
                                                                            ${((tempFormData.cantidad || 0) * (tempFormData.precio || 0)).toFixed(2)}
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
                                );
                            })}
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
                                disabled={productos.some((p) => !almacens.find((a) => a.id === p.almacen_id))}
                            >
                                <ShoppingCart className="mr-2 h-5 w-5" />
                                Realizar Compra
                                {productos.some((p) => !almacens.find((a) => a.id === p.almacen_id)) && (
                                    <Badge variant="destructive" className="ml-2">
                                        ¡Almacén inválido!
                                    </Badge>
                                )}
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

                                        {/* Sección de Pagos con Clientes - MEJORADA */}
                                        <div className="space-y-6 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 p-8 dark:border-blue-800 dark:from-blue-950/20 dark:to-indigo-950/20">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30">
                                                            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <div>
                                                            <Label className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                                                                Pagos con Crédito de Clientes
                                                            </Label>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                Usa créditos existentes de clientes o genera nuevos préstamos
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <Badge
                                                        variant="outline"
                                                        className="border-blue-300 text-blue-700 dark:border-blue-600 dark:text-blue-300"
                                                    >
                                                        {data.pagos_clientes.length} cliente(s) seleccionado(s)
                                                    </Badge>
                                                </div>

                                                {/* Selector de Clientes Mejorado */}
                                                <Popover open={clienteSelectOpen} onOpenChange={setClienteSelectOpen}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={clienteSelectOpen}
                                                            className="h-14 w-full justify-between border-2 border-blue-300 text-base hover:border-blue-400 dark:border-blue-600"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Users className="h-4 w-4" />
                                                                {clienteSearchTerm ? (
                                                                    <span>Buscando: "{clienteSearchTerm}"</span>
                                                                ) : (
                                                                    <span>Buscar cliente por nombre o teléfono...</span>
                                                                )}
                                                            </div>
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-full p-0" align="start">
                                                        <div className="space-y-2 p-2">
                                                            <Input
                                                                placeholder="Buscar cliente..."
                                                                value={clienteSearchTerm}
                                                                onChange={(e) => setClienteSearchTerm(e.target.value)}
                                                                className="h-9"
                                                            />
                                                            <ScrollArea className="h-60">
                                                                {isSearchingClientes ? (
                                                                    <div className="flex items-center justify-center py-6">
                                                                        <Skeleton className="h-4 w-32" />
                                                                    </div>
                                                                ) : filteredClientes.length > 0 ? (
                                                                    filteredClientes.map((cliente) => {
                                                                        const isSelected = data.pagos_clientes.some(
                                                                            (p) => p.cliente_id === cliente.id,
                                                                        );
                                                                        return (
                                                                            <div
                                                                                key={cliente.id}
                                                                                className={`hover:bg-accent flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm ${isSelected ? 'bg-accent' : ''}`}
                                                                                onClick={() => {
                                                                                    if (!isSelected) {
                                                                                        setData('pagos_clientes', [
                                                                                            ...data.pagos_clientes,
                                                                                            { cliente_id: cliente.id, monto: 0 },
                                                                                        ]);
                                                                                    }
                                                                                    setClienteSelectOpen(false);
                                                                                    setClienteSearchTerm('');
                                                                                }}
                                                                            >
                                                                                <div className="flex items-center gap-3">
                                                                                    <div
                                                                                        className={`h-2 w-2 rounded-full ${isSelected ? 'bg-green-500' : 'bg-gray-300'}`}
                                                                                    />
                                                                                    <div>
                                                                                        <p className="font-medium">{cliente.nombre_cliente}</p>
                                                                                        <p className="text-sm text-gray-500">
                                                                                            {cliente.telefono_cliente}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <p
                                                                                        className={`font-medium ${cliente.deuda_pago_cliente > 0 ? 'text-green-600' : 'text-gray-500'}`}
                                                                                    >
                                                                                        ${cliente.deuda_pago_cliente}
                                                                                    </p>
                                                                                    <p className="text-xs text-gray-500">Crédito disponible</p>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })
                                                                ) : clienteSearchTerm ? (
                                                                    <div className="py-6 text-center">
                                                                        <p className="text-gray-500">No se encontraron clientes</p>
                                                                        <Button
                                                                            variant="link"
                                                                            className="mt-2"
                                                                            onClick={() => {
                                                                                // Pre-llenar nombre si hay búsqueda
                                                                                setIsCrearClienteDialogOpen(true);
                                                                                setClienteSelectOpen(false);
                                                                            }}
                                                                        >
                                                                            <PlusCircle className="mr-2 h-4 w-4" />
                                                                            Crear cliente "{clienteSearchTerm}"
                                                                        </Button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="py-6 text-center">
                                                                        <p className="text-gray-500">Escribe para buscar clientes</p>
                                                                    </div>
                                                                )}
                                                            </ScrollArea>
                                                            <div
                                                                className="flex cursor-pointer items-center rounded-md bg-blue-50 px-3 py-2 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300"
                                                                onClick={() => {
                                                                    setIsCrearClienteDialogOpen(true);
                                                                    setClienteSelectOpen(false);
                                                                }}
                                                            >
                                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                                Crear nuevo cliente
                                                                {clienteSearchTerm && <span className="ml-2 font-medium">"{clienteSearchTerm}"</span>}
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>

                                                {/* Lista de Clientes Seleccionados */}
                                                {data.pagos_clientes.length > 0 && (
                                                    <div className="mt-6 space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                                                                Montos a Aplicar
                                                            </h4>
                                                            <Badge variant="secondary">
                                                                Total: ${data.pagos_clientes.reduce((acc, p) => acc + (p.monto || 0), 0).toFixed(2)}
                                                            </Badge>
                                                        </div>

                                                        <ScrollArea className="h-[300px]">
                                                            <div className="space-y-3 pr-4">
                                                                {data.pagos_clientes.map((pago) => {
                                                                    const cliente = clientes.find((c) => c.id === pago.cliente_id);
                                                                    const saldoCliente = cliente?.deuda_pago_cliente || 0;
                                                                    const montoAsignado = pago.monto || 0;

                                                                    return (
                                                                        <Card
                                                                            key={pago.cliente_id}
                                                                            className="overflow-hidden border-blue-200 dark:border-blue-800"
                                                                        >
                                                                            <CardContent className="p-4">
                                                                                <div className="flex items-start justify-between">
                                                                                    <div className="flex-1">
                                                                                        <div className="flex items-center gap-3">
                                                                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                                                                                                <span className="font-semibold text-blue-700 dark:text-blue-300">
                                                                                                    {cliente?.nombre_cliente?.charAt(0) || 'C'}
                                                                                                </span>
                                                                                            </div>
                                                                                            <div>
                                                                                                <p className="font-medium">
                                                                                                    {cliente?.nombre_cliente ||
                                                                                                        'Cliente no encontrado'}
                                                                                                </p>
                                                                                                <p className="text-sm text-gray-500">
                                                                                                    {cliente?.telefono_cliente}
                                                                                                </p>
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="mt-4 grid grid-cols-2 gap-4">
                                                                                            <div className="space-y-1">
                                                                                                <p className="text-sm text-gray-500">
                                                                                                    Crédito Disponible
                                                                                                </p>
                                                                                                <p
                                                                                                    className={`text-lg font-semibold ${saldoCliente > 0 ? 'text-green-600' : 'text-gray-600'}`}
                                                                                                >
                                                                                                    ${saldoCliente}
                                                                                                </p>
                                                                                            </div>
                                                                                            <div className="space-y-1">
                                                                                                <p className="text-sm text-gray-500">
                                                                                                    Monto a Aplicar
                                                                                                </p>
                                                                                                <div className="relative">
                                                                                                    <Input
                                                                                                        type="number"
                                                                                                        min="0"
                                                                                                        step="0.01"
                                                                                                        placeholder="0.00"
                                                                                                        value={montoAsignado}
                                                                                                        onChange={(e) => {
                                                                                                            const monto =
                                                                                                                parseFloat(e.target.value) || 0;
                                                                                                            const updated = data.pagos_clientes.map(
                                                                                                                (p) =>
                                                                                                                    p.cliente_id === pago.cliente_id
                                                                                                                        ? { ...p, monto }
                                                                                                                        : p,
                                                                                                            );
                                                                                                            setData('pagos_clientes', updated);
                                                                                                        }}
                                                                                                        className="h-10 text-base"
                                                                                                    />
                                                                                                    <div className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-500">
                                                                                                        USD
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>

                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                                                                                        onClick={() => {
                                                                                            const updated = data.pagos_clientes.filter(
                                                                                                (p) => p.cliente_id !== pago.cliente_id,
                                                                                            );
                                                                                            setData('pagos_clientes', updated);
                                                                                        }}
                                                                                    >
                                                                                        <X className="h-4 w-4" />
                                                                                    </Button>
                                                                                </div>

                                                                                {/* Estado del préstamo */}
                                                                                <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                                                                                    <div className="flex items-center justify-between text-sm">
                                                                                        <span className="text-gray-600 dark:text-gray-400">
                                                                                            {saldoCliente > 0
                                                                                                ? 'Usando crédito existente del cliente'
                                                                                                : 'Generando nuevo préstamo del cliente'}
                                                                                        </span>
                                                                                        <span
                                                                                            className={`font-medium ${
                                                                                                montoAsignado > 0 ? 'text-blue-600' : 'text-gray-500'
                                                                                            }`}
                                                                                        >
                                                                                            Nuevo saldo: ${(saldoCliente - montoAsignado).toFixed(2)}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </CardContent>
                                                                        </Card>
                                                                    );
                                                                })}
                                                            </div>
                                                        </ScrollArea>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Diálogo para crear cliente */}
                                        <Dialog open={isCrearClienteDialogOpen} onOpenChange={setIsCrearClienteDialogOpen}>
                                            <CrearClienteDialogContent />
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
                                    disabled={processing || productos.some((p) => !almacens.find((a) => a.id === p.almacen_id))}
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

                {/* Diálogo para crear almacén */}
                <Dialog open={isCrearAlmacenDialogOpen} onOpenChange={setIsCrearAlmacenDialogOpen}>
                    <CrearAlmacenDialogContent />
                </Dialog>

                <Toaster position="top-center" />
            </div>
        </AppLayout>
    );
}
