import { FusionFichasDialog, mensajeDeError, postJson, type GrupoDuplicado } from '@/components/fusion-fichas-dialog';
import HeadingSmall from '@/components/heading-small';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { ScrollProgress } from '@/components/ui/scroll';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sileo-toaster';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { sileo } from '@/lib/sileo';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    BadgeDollarSign,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Eye,
    EyeOff,
    FileText,
    GitMerge,
    History,
    Layers,
    Package,
    Search,
    Sheet,
    ShieldAlert,
    Upload,
    Warehouse,
    XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface Producto {
    id: number;
    nombre_producto: string;
    marca_producto: string;
    modelo_producto?: string;
    capacidad_producto?: string;
    color_producto?: string;
    categoria: string;
    precio_compra: number;
    stock_almacen: number;
    precio_venta: number | null;
    ganancia: number | null;
    comision: number | null;
    imagen_producto?: string;
    tiene_precio: boolean;
    almacen_id: number;
    puesto_por_nombre?: string | null;
    // Fichas hermanas (mismo producto repetido como 2+ fichas con stock en este almacén) comparten
    // la clave; null = producto sin repetir. Ver FichasHermanasService.
    grupo_clave: string | null;
    // true = el precio viene del "precio del grupo" y se actualiza con él; false = precio propio.
    precio_de_grupo: boolean;
    // Costo real por lote en este almacén (incluye prorrateos) — solo admin/moderador.
    costo_real: number | null;
    // Solo cuando el producto tiene 2+ lotes a costo distinto en este almacén (raro); si no, null.
    lotes: LoteDisponible[] | null;
}

interface LoteDisponible {
    id: number;
    codigo: string;
    cantidad: number;
    costo: number | null;
    // Precio propio del lote ("Opción A"); null = hereda el precio del producto en el almacén.
    precio_venta: number | null;
    // El movimiento que creó el lote tiene el prorrateo pendiente: no se puede fusionar.
    prorrateo_pendiente: boolean;
}

interface ResultadoFusionMasiva {
    message: string;
    fusionados: { producto_id: number; nombre_producto: string; codigo: string; cantidad: number; costo: number }[];
    fallidos: { producto_id: number; nombre_producto: string; motivo: string }[];
}

/** Fila de la tabla: un producto sin repetir, o un grupo de fichas hermanas (collapsible). */
type EntradaTabla = { tipo: 'producto'; producto: Producto } | { tipo: 'grupo'; clave: string; fichas: Producto[] };

interface AlmacenData {
    almacen_id: number;
    nombre_almacen: string;
    productos: Producto[];
}

interface PageProps {
    almacenes: AlmacenData[];
    meta: { total_almacenes: number; role_usuario: string };
    canViewSensitiveData?: boolean;
}

interface HistorialItem {
    id: number;
    usuario: string;
    precio_anterior: number | null;
    precio_nuevo: number;
    comision: number | null;
    accion: string;
    fecha: string;
}

interface PrecioActual {
    precio_venta: number;
    ganancia: number;
    comision: number;
    puesto_por_nombre: string;
    ultima_actualizacion: string;
}

interface HistorialData {
    success: boolean;
    producto: { id: number; nombre: string; marca: string; modelo?: string; capacidad?: string; color?: string; precio_compra: number };
    almacen: { id: number; nombre: string };
    precio_actual: PrecioActual | null;
    historial: HistorialItem[];
    total_cambios: number;
}

interface AparicionAlmacen {
    almacen_id: number;
    nombre_almacen: string;
    precio_venta: number | null;
    stock_almacen: number;
}

interface ProductoUnico {
    id: number;
    nombre_producto: string;
    marca_producto: string;
    modelo_producto?: string;
    capacidad_producto?: string;
    color_producto?: string;
    categoria: string;
    imagen_producto?: string;
    precio_compra: number;
    apariciones: AparicionAlmacen[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Productos', href: '/listado-productos' },
    { title: 'Precios por Almacén', href: '#' },
];

export default function VendedorPage({ almacenes: initialAlmacenes, meta, canViewSensitiveData = false }: PageProps) {
    const [almacenes, setAlmacenes] = useState<AlmacenData[]>(initialAlmacenes);
    // Tras una fusión o un precio de grupo se recargan los props (router.reload) — sin esto el
    // estado local se quedaría con los datos viejos.
    useEffect(() => {
        setAlmacenes(initialAlmacenes);
    }, [initialAlmacenes]);
    const [selectedAlmacenId, setSelectedAlmacenId] = useState<number | null>(initialAlmacenes.length > 0 ? initialAlmacenes[0].almacen_id : null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
    const [newPrice, setNewPrice] = useState<string>('');
    const [newComision, setNewComision] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [filtroPrecio, setFiltroPrecio] = useState<'todos' | 'con_precio' | 'sin_precio' | 'varios_costos'>('todos');
    const itemsPerPage = 10;

    // Estados para el modal de historial
    const [isHistorialDialogOpen, setIsHistorialDialogOpen] = useState(false);
    const [historialData, setHistorialData] = useState<HistorialData | null>(null);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    // Estados para importar
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ actualizados: number; omitidos: number; errores: string[] } | null>(null);

    // Estados para el modal "Buscar Producto" (asignar precio en varios almacenes a la vez, solo admin)
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkSelectedProductId, setBulkSelectedProductId] = useState<number | null>(null);
    const [bulkPrice, setBulkPrice] = useState('');
    const [bulkComision, setBulkComision] = useState('');
    const [bulkSelectedAlmacenIds, setBulkSelectedAlmacenIds] = useState<number[]>([]);
    const [isBulkLoading, setIsBulkLoading] = useState(false);
    const [bulkError, setBulkError] = useState<string | null>(null);
    const [isBulkPasswordDialogOpen, setIsBulkPasswordDialogOpen] = useState(false);
    const [bulkPasswordInput, setBulkPasswordInput] = useState('');
    const [bulkShowPassword, setBulkShowPassword] = useState(false);

    // Fichas hermanas: grupos expandidos, diálogo de "precio del grupo" y atajo a la fusión
    const [gruposExpandidos, setGruposExpandidos] = useState<Record<string, boolean>>({});
    const [grupoPrecio, setGrupoPrecio] = useState<Producto[] | null>(null);
    const [grupoPrecioVenta, setGrupoPrecioVenta] = useState('');
    const [grupoComision, setGrupoComision] = useState('');
    const [grupoIncluirPropios, setGrupoIncluirPropios] = useState(false);
    const [grupoGuardando, setGrupoGuardando] = useState(false);
    const [grupoError, setGrupoError] = useState<string | null>(null);
    const [grupoFusion, setGrupoFusion] = useState<GrupoDuplicado | null>(null);
    const [isFusionOpen, setIsFusionOpen] = useState(false);
    const puedeGestionar = meta.role_usuario === 'admin' || meta.role_usuario === 'moderador';

    // Desglose por lote (productos con 2+ costos): abierto, lotes marcados y precio a aplicar, por producto+almacén
    const [lotesExpandidos, setLotesExpandidos] = useState<Record<string, boolean>>({});
    const [lotesSeleccionados, setLotesSeleccionados] = useState<Record<string, number[]>>({});
    const [precioLotesInput, setPrecioLotesInput] = useState<Record<string, string>>({});
    const [lotesGuardando, setLotesGuardando] = useState<string | null>(null);
    const [loteFusion, setLoteFusion] = useState<{ producto: Producto; lotes: LoteDisponible[] } | null>(null);
    const [loteFusionPrecioPropio, setLoteFusionPrecioPropio] = useState(false);
    const [loteFusionPrecio, setLoteFusionPrecio] = useState('');
    const [loteFusionGuardando, setLoteFusionGuardando] = useState(false);
    const [loteFusionError, setLoteFusionError] = useState<string | null>(null);
    const [isFusionMasivaOpen, setIsFusionMasivaOpen] = useState(false);
    const [masivaSeleccion, setMasivaSeleccion] = useState<number[]>([]);
    const [masivaPaso, setMasivaPaso] = useState<'elegir' | 'confirmar' | 'resultado'>('elegir');
    const [masivaGuardando, setMasivaGuardando] = useState(false);
    const [masivaResultado, setMasivaResultado] = useState<ResultadoFusionMasiva | null>(null);

    const selectedAlmacen = almacenes.find((a) => a.almacen_id === selectedAlmacenId);
    const productsInAlmacen = selectedAlmacen?.productos || [];

    const productosUnicos = useMemo<ProductoUnico[]>(() => {
        const mapa = new Map<number, ProductoUnico>();

        almacenes.forEach((almacen) => {
            almacen.productos.forEach((producto) => {
                if (!mapa.has(producto.id)) {
                    mapa.set(producto.id, {
                        id: producto.id,
                        nombre_producto: producto.nombre_producto,
                        marca_producto: producto.marca_producto,
                        modelo_producto: producto.modelo_producto,
                        capacidad_producto: producto.capacidad_producto,
                        color_producto: producto.color_producto,
                        categoria: producto.categoria,
                        imagen_producto: producto.imagen_producto,
                        precio_compra: producto.precio_compra,
                        apariciones: [],
                    });
                }

                mapa.get(producto.id)!.apariciones.push({
                    almacen_id: almacen.almacen_id,
                    nombre_almacen: almacen.nombre_almacen,
                    precio_venta: producto.precio_venta,
                    stock_almacen: producto.stock_almacen,
                });
            });
        });

        return Array.from(mapa.values()).sort((a, b) => a.nombre_producto.localeCompare(b.nombre_producto));
    }, [almacenes]);

    const bulkSelectedProduct = productosUnicos.find((p) => p.id === bulkSelectedProductId) ?? null;

    // El AlertDialog (Radix) atrapa el foco en su propio subárbol del DOM. El popup del Combobox
    // de producto (base-ui) se porta a <body> por defecto, quedando como hermano —no descendiente—
    // del contenido del diálogo, lo que rompe la selección con mouse (funciona con teclado porque
    // no involucra un evento de puntero "escapando" del focus-trap). Mismo caso ya resuelto en
    // PaymentForm.tsx y Comprar/Index.tsx (ver docs/pendiente-combobox-reemplazo.md) — se resuelve
    // portando el popup dentro del propio AlertDialogContent.
    const [bulkDialogContainer, setBulkDialogContainer] = useState<HTMLElement | undefined>(undefined);
    const resolveBulkDialogContainer = (node: HTMLElement | null) => {
        const container = node?.closest('[data-slot="alert-dialog-content"]');
        if (container instanceof HTMLElement) {
            setBulkDialogContainer(container);
        }
    };

    const availableAlmacenes = initialAlmacenes.map((a) => {
        const totalProductos = a.productos.length;
        const totalStock = a.productos.reduce((sum, p) => sum + p.stock_almacen, 0);
        // Valor a costo real del almacén (el mismo criterio del Valor Total de Productos y del reporte)
        // y valor a precio de venta de lo que ya tiene precio — antes se mezclaban en una sola cifra.
        const valorCosto = a.productos.reduce((sum, p) => sum + (p.costo_real ?? p.precio_compra) * p.stock_almacen, 0);
        const valorVenta = a.productos.reduce((sum, p) => sum + (p.precio_venta ?? 0) * p.stock_almacen, 0);
        const productosConPrecio = a.productos.filter((p) => p.precio_venta !== null).length;

        return {
            id: a.almacen_id,
            nombre: a.nombre_almacen,
            totalProductos,
            totalStock,
            valorCosto,
            valorVenta,
            productosConPrecio,
            productosSinPrecio: totalProductos - productosConPrecio,
        };
    });

    const formatCurrency = (value: number | null) => {
        if (value === null || value === undefined) return 'No definido';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const openEditModal = (producto: Producto) => {
        setSelectedProduct(producto);
        setNewPrice(producto.precio_venta?.toString() || '');
        setNewComision(producto.comision?.toString() || '');
        setError(null);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!selectedProduct || !newPrice) return;
        const parsedPrice = parseFloat(newPrice);

        if (isNaN(parsedPrice) || parsedPrice < 0.01) {
            setError('El precio debe ser un número positivo mayor a 0.00');
            sileo.warning({ title: 'Precio inválido', description: 'El precio debe ser un número positivo mayor a 0.00' });
            return;
        }

        if (!selectedProduct.almacen_id) {
            setError('Error: ID de almacén no definido.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const responseData = await sileo.promise(
                fetch(`/disponibles/${selectedProduct.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify({
                        precio_venta: parsedPrice,
                        almacen_id: selectedProduct.almacen_id,
                        comision: newComision !== '' ? parseFloat(newComision) : null,
                    }),
                }).then(async (response) => {
                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.message || data.error || 'Error al actualizar el precio');
                    }
                    return data;
                }),
                {
                    loading: { title: 'Actualizando precio...', description: selectedProduct.nombre_producto },
                    success: (data) => ({
                        title: data.message || 'Precio actualizado correctamente',
                        description: `${selectedProduct.nombre_producto} — ${formatCurrency(parsedPrice)}${
                            newComision !== '' ? ` · Comisión ${formatCurrency(parseFloat(newComision))}` : ''
                        }`,
                    }),
                    error: (err) => ({
                        title: 'No se pudo actualizar el precio',
                        description: err instanceof Error ? err.message : 'Error inesperado al procesar la solicitud',
                    }),
                },
            );

            setAlmacenes((prevAlmacenes) =>
                prevAlmacenes.map((almacen) => {
                    if (almacen.almacen_id !== selectedProduct.almacen_id) return almacen;
                    return {
                        ...almacen,
                        productos: almacen.productos.map((p) =>
                            p.id === selectedProduct.id && p.almacen_id === selectedProduct.almacen_id
                                ? {
                                      ...p,
                                      precio_venta: parsedPrice,
                                      ganancia: parsedPrice - p.precio_compra,
                                      // Precio puesto a mano: la ficha se separa del precio del grupo.
                                      precio_de_grupo: false,
                                      comision:
                                          responseData.new_comision !== undefined && responseData.new_comision !== null
                                              ? responseData.new_comision
                                              : p.comision,
                                      puesto_por_nombre: responseData.puesto_por_nombre ?? p.puesto_por_nombre,
                                  }
                                : p,
                        ),
                    };
                }),
            );

            setIsModalOpen(false);
        } catch (err) {
            console.error('Error en la solicitud:', err);
            setError(err instanceof Error ? err.message : 'Error inesperado al procesar la solicitud');
        } finally {
            setIsLoading(false);
        }
    };

    const openBulkModal = () => {
        setBulkSelectedProductId(null);
        setBulkPrice('');
        setBulkComision('');
        setBulkSelectedAlmacenIds([]);
        setBulkError(null);
        setBulkPasswordInput('');
        setIsBulkModalOpen(true);
    };

    const requestBulkConfirmation = () => {
        if (!bulkSelectedProduct || !bulkPrice || bulkSelectedAlmacenIds.length === 0) return;
        const parsedPrice = parseFloat(bulkPrice);

        if (isNaN(parsedPrice) || parsedPrice < 0.01) {
            setBulkError('El precio debe ser un número positivo mayor a 0.00');
            sileo.warning({ title: 'Precio inválido', description: 'El precio debe ser un número positivo mayor a 0.00' });
            return;
        }

        setBulkError(null);
        setBulkPasswordInput('');
        setIsBulkPasswordDialogOpen(true);
    };

    const handleBulkProductChange = (producto: ProductoUnico | null) => {
        setBulkSelectedProductId(producto?.id ?? null);
        setBulkSelectedAlmacenIds([]);
        setBulkPrice('');
        setBulkComision('');
        setBulkError(null);
    };

    const toggleBulkAlmacen = (almacenId: number) => {
        setBulkSelectedAlmacenIds((prev) => (prev.includes(almacenId) ? prev.filter((id) => id !== almacenId) : [...prev, almacenId]));
    };

    const handleBulkSubmit = async () => {
        if (!bulkSelectedProduct || !bulkPrice || bulkSelectedAlmacenIds.length === 0) return;
        const parsedPrice = parseFloat(bulkPrice);

        if (isNaN(parsedPrice) || parsedPrice < 0.01) {
            setBulkError('El precio debe ser un número positivo mayor a 0.00');
            sileo.warning({ title: 'Precio inválido', description: 'El precio debe ser un número positivo mayor a 0.00' });
            return;
        }

        setIsBulkLoading(true);
        setBulkError(null);

        try {
            const responseData = await sileo.promise(
                fetch('/disponibles/bulk-actualizar', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    body: JSON.stringify({
                        producto_id: bulkSelectedProduct.id,
                        almacen_ids: bulkSelectedAlmacenIds,
                        precio_venta: parsedPrice,
                        comision: bulkComision !== '' ? parseFloat(bulkComision) : null,
                        password_confirmacion: bulkPasswordInput,
                    }),
                }).then(async (response) => {
                    const data = await response.json();
                    if (!response.ok) {
                        throw new Error(data.message || data.error || 'Error al actualizar los precios');
                    }
                    return data;
                }),
                {
                    loading: { title: 'Actualizando precios...', description: bulkSelectedProduct.nombre_producto },
                    success: () => ({
                        title: 'Precio actualizado',
                        description: `${bulkSelectedProduct.nombre_producto} — ${formatCurrency(parsedPrice)} · ${bulkSelectedAlmacenIds.length} almacén(es)${
                            bulkComision !== '' ? ` · Comisión ${formatCurrency(parseFloat(bulkComision))}` : ''
                        }`,
                    }),
                    error: (err) => ({
                        title: 'No se pudo actualizar el precio',
                        description: err instanceof Error ? err.message : 'Error inesperado al procesar la solicitud',
                    }),
                },
            );

            const almacenIdsActualizados = bulkSelectedAlmacenIds;
            const productoId = bulkSelectedProduct.id;

            setAlmacenes((prevAlmacenes) =>
                prevAlmacenes.map((almacen) => {
                    if (!almacenIdsActualizados.includes(almacen.almacen_id)) return almacen;
                    return {
                        ...almacen,
                        productos: almacen.productos.map((p) =>
                            p.id === productoId
                                ? {
                                      ...p,
                                      precio_venta: parsedPrice,
                                      ganancia: parsedPrice - p.precio_compra,
                                      // Precio puesto a mano: la ficha se separa del precio del grupo.
                                      precio_de_grupo: false,
                                      comision:
                                          responseData.new_comision !== undefined && responseData.new_comision !== null
                                              ? responseData.new_comision
                                              : p.comision,
                                  }
                                : p,
                        ),
                    };
                }),
            );

            setIsBulkPasswordDialogOpen(false);
            setBulkPasswordInput('');
            setIsBulkModalOpen(false);
        } catch (err) {
            console.error('Error en la solicitud:', err);
            const message = err instanceof Error ? err.message : 'Error inesperado al procesar la solicitud';
            setBulkPasswordInput('');
            setBulkError(message);
        } finally {
            setIsBulkLoading(false);
        }
    };

    const abrirPrecioGrupo = (fichas: Producto[]) => {
        const conPrecio = fichas.find((f) => f.precio_de_grupo && f.precio_venta !== null) ?? fichas.find((f) => f.precio_venta !== null);
        setGrupoPrecio(fichas);
        setGrupoPrecioVenta(conPrecio?.precio_venta?.toString() ?? '');
        setGrupoComision(conPrecio?.comision?.toString() ?? '');
        setGrupoIncluirPropios(false);
        setGrupoError(null);
    };

    // A qué fichas llega el precio del grupo: las sin precio y las que ya lo siguen; las de
    // precio propio solo si se marca "incluir" (mismo criterio que actualizarPrecioGrupo()).
    const recibePrecioGrupo = (ficha: Producto) => ficha.precio_venta === null || ficha.precio_de_grupo || grupoIncluirPropios;

    const guardarPrecioGrupo = async () => {
        if (!grupoPrecio) return;
        const precio = parseFloat(grupoPrecioVenta);

        if (isNaN(precio) || precio < 0.01) {
            setGrupoError('El precio debe ser un número positivo mayor a 0.00');
            return;
        }

        setGrupoGuardando(true);
        setGrupoError(null);

        try {
            const response = await fetch(route('disponibles.precio-grupo'), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    producto_id: grupoPrecio[0].id,
                    almacen_id: grupoPrecio[0].almacen_id,
                    precio_venta: precio,
                    comision: grupoComision !== '' ? parseFloat(grupoComision) : null,
                    incluir_con_precio_propio: grupoIncluirPropios,
                }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                setGrupoError(mensajeDeError(data, 'No se pudo aplicar el precio del grupo'));
                return;
            }

            sileo.success({ title: data.message, description: `${grupoPrecio[0].nombre_producto} — ${formatCurrency(precio)}` });
            setGrupoPrecio(null);
            router.reload({ only: ['almacenes'] });
        } catch {
            setGrupoError('Error de conexión. Inténtalo nuevamente.');
        } finally {
            setGrupoGuardando(false);
        }
    };

    // Atajo a la fusión (la misma de Productos → "Limpiar duplicados"): busca el grupo completo
    // de estas fichas en todo el catálogo, porque la ficha es una sola para todos los almacenes.
    const abrirFusionGrupo = async (fichas: Producto[]) => {
        try {
            const response = await fetch(route('productos.duplicados'), {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await response.json();

            if (!response.ok) {
                sileo.error({ title: 'No se pudo abrir la fusión', description: mensajeDeError(data, 'Error al cargar las fichas') });
                return;
            }

            const grupo = (data.grupos as GrupoDuplicado[]).find((g) => g.productos.some((p) => p.id === fichas[0].id));

            if (!grupo) {
                sileo.warning({ title: 'Estas fichas ya no figuran como duplicadas' });
                return;
            }

            setGrupoFusion(grupo);
            setIsFusionOpen(true);
        } catch {
            sileo.error({ title: 'Error de conexión', description: 'No se pudieron cargar las fichas a fusionar' });
        }
    };

    const verHistorial = async (producto: Producto) => {
        if (meta.role_usuario !== 'admin' && meta.role_usuario !== 'moderador') return;

        setLoadingHistorial(true);
        setIsHistorialDialogOpen(true);
        setHistorialData(null);

        try {
            const response = await fetch(`/disponibles/${producto.id}/precios-vendedores/${producto.almacen_id}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/json',
                },
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setHistorialData(data);
            } else {
                sileo.error({ title: 'No se pudo cargar el historial', description: data.error || 'Error al cargar el historial' });
                setIsHistorialDialogOpen(false);
            }
        } catch (err) {
            console.error('Error al obtener historial:', err);
            sileo.error({ title: 'No se pudo cargar el historial', description: 'Error al cargar el historial de precios' });
            setIsHistorialDialogOpen(false);
        } finally {
            setLoadingHistorial(false);
        }
    };

    const coincideBusqueda = (producto: Producto) =>
        (producto.nombre_producto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (producto.marca_producto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (producto.categoria || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (producto.modelo_producto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (producto.capacidad_producto || '').toLowerCase().includes(searchTerm.toLowerCase());

    const coincideFiltroPrecio = (producto: Producto) => {
        if (filtroPrecio === 'con_precio') return producto.precio_venta !== null;
        if (filtroPrecio === 'sin_precio') return producto.precio_venta === null;
        if (filtroPrecio === 'varios_costos') return producto.lotes !== null;
        return true;
    };

    const filteredProducts = productsInAlmacen.filter((producto) => coincideBusqueda(producto) && coincideFiltroPrecio(producto));

    // Fichas hermanas juntas en una sola entrada (collapsible), en la posición de la primera. Un
    // grupo entra si CUALQUIERA de sus fichas pasa los filtros, y se muestra completo — así el
    // filtro "Sin precio" muestra también a qué ficha con precio acompaña la que falta.
    const entradas = useMemo<EntradaTabla[]>(() => {
        const resultado: EntradaTabla[] = [];
        const grupos = new Map<string, Producto[]>();

        productsInAlmacen.forEach((producto) => {
            if (producto.grupo_clave) {
                if (!grupos.has(producto.grupo_clave)) {
                    grupos.set(producto.grupo_clave, []);
                    resultado.push({ tipo: 'grupo', clave: producto.grupo_clave, fichas: [] });
                }
                grupos.get(producto.grupo_clave)!.push(producto);
            } else {
                resultado.push({ tipo: 'producto', producto });
            }
        });

        return resultado
            .map((entrada) => (entrada.tipo === 'grupo' ? { ...entrada, fichas: grupos.get(entrada.clave)! } : entrada))
            .filter((entrada) => {
                const fichas = entrada.tipo === 'grupo' ? entrada.fichas : [entrada.producto];
                return fichas.some((f) => coincideBusqueda(f) && coincideFiltroPrecio(f));
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productsInAlmacen, searchTerm, filtroPrecio]);

    const toggleFiltroPrecio = (valor: 'con_precio' | 'sin_precio' | 'varios_costos') => {
        setFiltroPrecio((prev) => (prev === valor ? 'todos' : valor));
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(entradas.length / itemsPerPage);
    const currentEntradas = entradas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Costo real del almacén (lotes, incluye prorrateos); sin dato, el costo de la ficha.
    const costoDe = (producto: Producto) => producto.costo_real ?? producto.precio_compra;
    const gananciaDe = (producto: Producto) => (producto.precio_venta === null ? null : producto.precio_venta - costoDe(producto));

    const handleExport = () => {
        if (!selectedAlmacenId) return;
        window.location.href = `/disponibles/almacen/${selectedAlmacenId}/exportar`;
    };

    const handleImport = async () => {
        if (!importFile || !selectedAlmacenId) return;
        setIsImporting(true);
        setImportResult(null);

        const formData = new FormData();
        formData.append('archivo', importFile);
        formData.append('_method', 'POST');

        try {
            const response = await fetch(`/disponibles/almacen/${selectedAlmacenId}/importar`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setImportResult({ actualizados: data.actualizados, omitidos: data.omitidos, errores: data.errores ?? [] });
                setImportFile(null);
                if (data.actualizados > 0) {
                    setTimeout(() => window.location.reload(), 2000);
                }
            } else {
                let errorMsg = data.error ?? data.message ?? 'Error desconocido';
                if (data.errors) {
                    const firstField = Object.values(data.errors as Record<string, string[]>)[0];
                    if (firstField?.length) errorMsg = firstField[0];
                }
                setImportResult({ actualizados: 0, omitidos: 0, errores: [errorMsg] });
            }
        } catch {
            setImportResult({ actualizados: 0, omitidos: 0, errores: ['Error de conexión al importar.'] });
        } finally {
            setIsImporting(false);
        }
    };

    const getPageNumbers = (): (number | 'ellipsis')[] => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        if (currentPage <= 4) return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
        if (currentPage >= totalPages - 3) return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
    };

    const handleAlmacenChange = (almacenId: string) => {
        if (selectedProduct) {
            setSelectedProduct({ ...selectedProduct, almacen_id: parseInt(almacenId) });
        }
    };

    // Fila de un producto — sin repetir, o una ficha dentro de un grupo expandido (`enGrupo`).
    // Costo y ganancia usan el costo real del almacén (lotes, incluye prorrateos).
    const renderFilaBase = (producto: Producto, enGrupo = false) => (
        <TableRow key={`${producto.id}-${producto.almacen_id}`} className={cn(enGrupo && 'bg-muted/30')}>
            <TableCell className={cn('font-medium', enGrupo && 'pl-10')}>
                {enGrupo && (
                    <Badge variant="outline" className="mr-2 font-mono text-[10px]">
                        #{producto.id}
                    </Badge>
                )}
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="cursor-help decoration-gray-400 decoration-dashed underline-offset-4 hover:underline">
                                {producto.nombre_producto}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent className="border-primary/20 max-w-xs p-4 shadow-xl">
                            <div className="space-y-2">
                                {producto.imagen_producto && (
                                    <div className="mb-2 flex justify-center">
                                        <img
                                            src={`/${producto.imagen_producto}`}
                                            alt={producto.nombre_producto}
                                            className="h-20 w-20 rounded-lg object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}
                                <p className="text-base font-bold text-white">{producto.nombre_producto}</p>
                                <Separator className="bg-border/50" />
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                    <span className="text-muted-foreground">Marca:</span>
                                    <span className="font-medium">{producto.marca_producto}</span>
                                    {producto.modelo_producto && (
                                        <>
                                            <span className="text-muted-foreground">Modelo:</span>
                                            <span className="font-medium">{producto.modelo_producto}</span>
                                        </>
                                    )}
                                    {producto.capacidad_producto && (
                                        <>
                                            <span className="text-muted-foreground">Capacidad:</span>
                                            <span className="font-medium">{producto.capacidad_producto}</span>
                                        </>
                                    )}
                                    {producto.color_producto && (
                                        <>
                                            <span className="text-muted-foreground">Color:</span>
                                            <span className="font-medium">{producto.color_producto}</span>
                                        </>
                                    )}
                                    <span className="text-muted-foreground">Categoría:</span>
                                    <span className="font-medium">{producto.categoria}</span>
                                    {canViewSensitiveData && (
                                        <>
                                            <span className="text-muted-foreground">Costo real:</span>
                                            <span className="text-sidebar font-medium">{formatCurrency(costoDe(producto))}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                {(() => {
                    const detalles = [producto.marca_producto, producto.modelo_producto, producto.capacidad_producto].filter(Boolean);
                    return detalles.length > 0 ? <p className="text-muted-foreground mt-0.5 text-xs font-normal">{detalles.join(' • ')}</p> : null;
                })()}
                {producto.lotes && (
                    <button
                        type="button"
                        className="mt-1 inline-flex cursor-pointer items-center gap-1"
                        onClick={() => setLotesExpandidos((prev) => ({ ...prev, [claveLotes(producto)]: !prev[claveLotes(producto)] }))}
                        aria-expanded={lotesExpandidos[claveLotes(producto)] ?? false}
                    >
                        <Badge variant="outline" className="border-sky-500/50 text-[10px] text-sky-700 dark:text-sky-400">
                            {lotesExpandidos[claveLotes(producto)] ? (
                                <ChevronDown className="mr-1 h-3 w-3" />
                            ) : (
                                <ChevronRight className="mr-1 h-3 w-3" />
                            )}
                            {producto.lotes.length} lotes · costos distintos
                        </Badge>
                    </button>
                )}
            </TableCell>
            <TableCell>{producto.categoria || 'Sin categoría'}</TableCell>
            {canViewSensitiveData && <TableCell>{formatCurrency(costoDe(producto))}</TableCell>}
            <TableCell>
                {producto.stock_almacen > 0 ? (
                    <Badge variant="outline">{producto.stock_almacen}</Badge>
                ) : (
                    <Badge variant="destructive">Agotado</Badge>
                )}
            </TableCell>
            <TableCell className={cn(producto.precio_venta === null ? 'text-amber-400 italic' : 'text-amber-800')}>
                {formatCurrency(producto.precio_venta)}
                {enGrupo && producto.precio_venta !== null && (
                    <Badge
                        variant="outline"
                        className={cn(
                            'ml-2 text-[10px]',
                            producto.precio_de_grupo ? 'border-teal-500/50 text-teal-700 dark:text-teal-400' : 'text-muted-foreground',
                        )}
                    >
                        {producto.precio_de_grupo ? 'Grupo' : 'Propio'}
                    </Badge>
                )}
                {canViewSensitiveData && producto.precio_venta !== null && producto.precio_venta < costoDe(producto) && (
                    <Badge variant="destructive" className="ml-2 text-[10px]">
                        Bajo costo
                    </Badge>
                )}
            </TableCell>
            <TableCell className="font-medium text-indigo-600">
                {producto.comision && producto.comision > 0 ? (
                    formatCurrency(producto.comision)
                ) : (
                    <span className="text-xs text-gray-400 italic">Sin comisión</span>
                )}
            </TableCell>
            {canViewSensitiveData && (
                <TableCell
                    className={cn(
                        'font-medium',
                        gananciaDe(producto) === null ? 'text-gray-400 italic' : gananciaDe(producto)! >= 0 ? 'text-green-600' : 'text-red-600',
                    )}
                >
                    {formatCurrency(gananciaDe(producto))}
                </TableCell>
            )}
            <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                        producto.precio_venta !== null
                                            ? 'text-amber-600 hover:bg-amber-100 hover:text-amber-800'
                                            : 'text-green-600 hover:bg-emerald-100 hover:text-green-800',
                                    )}
                                    onClick={() => openEditModal(producto)}
                                >
                                    <BadgeDollarSign size={16} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{producto.precio_venta ? 'Editar precio' : 'Asignar precio'}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {(meta.role_usuario === 'admin' || meta.role_usuario === 'moderador') && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-600 hover:bg-blue-100 hover:text-blue-800"
                                        onClick={() => verHistorial(producto)}
                                    >
                                        <History size={16} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Ver historial de precios</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );

    // ─── Desglose por lote (opcional): solo productos con 2+ lotes a costo distinto ─────────
    const claveLotes = (producto: Producto) => `${producto.id}-${producto.almacen_id}`;

    // Precio con el que vende un lote: el propio si lo tiene, si no el del producto en el almacén.
    const precioDeLote = (producto: Producto, lote: LoteDisponible) => lote.precio_venta ?? producto.precio_venta;

    const toggleLoteSeleccionado = (clave: string, loteId: number) =>
        setLotesSeleccionados((prev) => {
            const actuales = prev[clave] ?? [];
            return { ...prev, [clave]: actuales.includes(loteId) ? actuales.filter((id) => id !== loteId) : [...actuales, loteId] };
        });

    // Pone (o quita, con `precio` null) el precio propio de los lotes seleccionados — uno por
    // uno contra el endpoint existente de "Opción A" (ProductoController::actualizarPrecioVentaLote).
    const aplicarPrecioLotes = async (producto: Producto, precio: number | null) => {
        const clave = claveLotes(producto);
        const ids = lotesSeleccionados[clave] ?? [];
        if (ids.length === 0) return;

        if (precio !== null && (isNaN(precio) || precio < 0.01)) {
            sileo.warning({ title: 'Precio inválido', description: 'El precio debe ser un número positivo mayor a 0.00' });
            return;
        }

        setLotesGuardando(clave);

        try {
            for (const loteId of ids) {
                const response = await fetch(route('productos.lotes.precio-venta', { producto: producto.id, lote: loteId }), {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    },
                    body: JSON.stringify({ precio_venta: precio }),
                });

                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(mensajeDeError(data, 'No se pudo actualizar el lote'));
                }
            }

            setAlmacenes((prev) =>
                prev.map((almacen) =>
                    almacen.almacen_id !== producto.almacen_id
                        ? almacen
                        : {
                              ...almacen,
                              productos: almacen.productos.map((p) =>
                                  p.id !== producto.id || !p.lotes
                                      ? p
                                      : { ...p, lotes: p.lotes.map((l) => (ids.includes(l.id) ? { ...l, precio_venta: precio } : l)) },
                              ),
                          },
                ),
            );
            setLotesSeleccionados((prev) => ({ ...prev, [clave]: [] }));
            setPrecioLotesInput((prev) => ({ ...prev, [clave]: '' }));
            sileo.success({
                title: precio === null ? 'Lotes al precio del producto' : 'Precio propio aplicado',
                description: `${producto.nombre_producto} — ${ids.length} lote(s)${precio !== null ? ` a ${formatCurrency(precio)}` : ''}`,
            });
        } catch (err) {
            sileo.error({ title: 'No se pudo actualizar', description: err instanceof Error ? err.message : 'Error inesperado' });
        } finally {
            setLotesGuardando(null);
        }
    };

    // Fusionar los lotes marcados en uno solo (admin/moderador) — siempre a pedido del usuario,
    // con confirmación: suma cantidades, costo promedio ponderado, antigüedad del más viejo.
    const abrirFusionLotes = (producto: Producto) => {
        const ids = lotesSeleccionados[claveLotes(producto)] ?? [];
        setLoteFusion({ producto, lotes: (producto.lotes ?? []).filter((l) => ids.includes(l.id)) });
        setLoteFusionPrecioPropio(false);
        setLoteFusionPrecio('');
        setLoteFusionError(null);
    };

    const confirmarFusionLotes = async () => {
        if (!loteFusion) return;
        const precio = loteFusionPrecioPropio ? parseFloat(loteFusionPrecio) : null;

        if (precio !== null && (isNaN(precio) || precio < 0.01)) {
            setLoteFusionError('El precio debe ser un número positivo mayor a 0.00');
            return;
        }

        setLoteFusionGuardando(true);
        setLoteFusionError(null);

        try {
            const { ok, data } = await postJson(route('productos.lotes.fusionar', { producto: loteFusion.producto.id }), {
                almacen_id: loteFusion.producto.almacen_id,
                lote_ids: loteFusion.lotes.map((l) => l.id),
                precio_venta: precio,
            });

            if (!ok) {
                setLoteFusionError(mensajeDeError(data, 'No se pudieron fusionar los lotes'));
                return;
            }

            sileo.success({ title: 'Lotes fusionados', description: data.message as string });
            setLotesSeleccionados((prev) => ({ ...prev, [claveLotes(loteFusion.producto)]: [] }));
            setLoteFusion(null);
            router.reload({ only: ['almacenes'] });
        } catch {
            setLoteFusionError('Error de conexión. Inténtalo nuevamente.');
        } finally {
            setLoteFusionGuardando(false);
        }
    };

    // ─── "Fusionar lotes" global del almacén seleccionado (admin/moderador) ─────────────
    const productosVariosCostos = productsInAlmacen.filter((p) => p.lotes !== null);
    const motivoBloqueoFusion = (producto: Producto) =>
        producto.lotes?.some((l) => l.prorrateo_pendiente) ? 'Tiene un prorrateo pendiente en Distribución de Costos' : null;

    const abrirFusionMasiva = () => {
        setMasivaSeleccion([]);
        setMasivaPaso('elegir');
        setMasivaResultado(null);
        setIsFusionMasivaOpen(true);
    };

    const confirmarFusionMasiva = async () => {
        if (!selectedAlmacenId || masivaSeleccion.length === 0) return;
        setMasivaGuardando(true);

        try {
            const { ok, data } = await postJson(route('disponibles.fusionar-lotes', { almacen: selectedAlmacenId }), {
                producto_ids: masivaSeleccion,
            });

            if (!ok) {
                sileo.error({ title: 'No se pudo fusionar', description: mensajeDeError(data, 'Error al fusionar los lotes') });
                setMasivaPaso('elegir');
                return;
            }

            setMasivaResultado(data as unknown as ResultadoFusionMasiva);
            setMasivaPaso('resultado');
            router.reload({ only: ['almacenes'] });
        } catch {
            sileo.error({ title: 'Error de conexión', description: 'No se pudieron fusionar los lotes' });
        } finally {
            setMasivaGuardando(false);
        }
    };

    const renderLotes = (producto: Producto) => {
        const clave = claveLotes(producto);
        const seleccionados = lotesSeleccionados[clave] ?? [];
        const lotes = producto.lotes ?? [];

        return [
            ...lotes.map((lote) => {
                const precio = precioDeLote(producto, lote);
                const margen = precio === null || lote.costo === null ? null : precio - (producto.comision ?? 0) - lote.costo;

                return (
                    <TableRow key={`lote-${lote.id}`} className="bg-sky-50/50 dark:bg-sky-950/20">
                        <TableCell className="pl-10">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={seleccionados.includes(lote.id)}
                                    onCheckedChange={() => toggleLoteSeleccionado(clave, lote.id)}
                                    aria-label={`Seleccionar lote ${lote.codigo}`}
                                />
                                <span className="font-mono text-xs">{lote.codigo}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">Lote</TableCell>
                        {canViewSensitiveData && <TableCell>{lote.costo !== null ? formatCurrency(lote.costo) : '—'}</TableCell>}
                        <TableCell>
                            <Badge variant="outline">{lote.cantidad}</Badge>
                        </TableCell>
                        <TableCell className={cn(precio === null ? 'text-amber-400 italic' : 'text-amber-800')}>
                            {formatCurrency(precio)}
                            <Badge
                                variant="outline"
                                className={cn(
                                    'ml-2 text-[10px]',
                                    lote.precio_venta !== null ? 'border-sky-500/50 text-sky-700 dark:text-sky-400' : 'text-muted-foreground',
                                )}
                            >
                                {lote.precio_venta !== null ? 'Propio' : 'Heredado'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">—</TableCell>
                        {canViewSensitiveData && (
                            <TableCell
                                className={cn(
                                    'font-medium',
                                    margen === null ? 'text-gray-400 italic' : margen >= 0 ? 'text-green-600' : 'text-red-600',
                                )}
                            >
                                {margen === null ? '—' : formatCurrency(margen)}
                            </TableCell>
                        )}
                        <TableCell />
                    </TableRow>
                );
            }),
            <TableRow key={`lotes-acciones-${clave}`} className="bg-sky-50/50 hover:bg-sky-50/50 dark:bg-sky-950/20">
                <TableCell colSpan={6 + (canViewSensitiveData ? 2 : 0)} className="pl-10">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-muted-foreground">
                            {seleccionados.length === 0
                                ? 'Marca los lotes a los que quieres darles un precio distinto (margen = precio − comisión − costo del lote).'
                                : `${seleccionados.length} lote(s) seleccionado(s):`}
                        </span>
                        {seleccionados.length > 0 && (
                            <>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    placeholder="Precio propio"
                                    aria-label="Precio propio de los lotes seleccionados"
                                    className="h-8 w-32"
                                    value={precioLotesInput[clave] ?? ''}
                                    onChange={(e) => setPrecioLotesInput((prev) => ({ ...prev, [clave]: e.target.value }))}
                                />
                                <Button
                                    size="sm"
                                    className="h-8 bg-sky-600 hover:bg-sky-700"
                                    disabled={lotesGuardando === clave || !precioLotesInput[clave]}
                                    onClick={() => aplicarPrecioLotes(producto, parseFloat(precioLotesInput[clave] ?? ''))}
                                >
                                    Poner precio propio
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8"
                                    disabled={lotesGuardando === clave}
                                    onClick={() => aplicarPrecioLotes(producto, null)}
                                >
                                    Vender al precio del producto
                                </Button>
                                {puedeGestionar && seleccionados.length >= 2 && (
                                    <Button
                                        size="sm"
                                        className="h-8 gap-1 bg-amber-600 hover:bg-amber-700"
                                        disabled={lotesGuardando === clave}
                                        onClick={() => abrirFusionLotes(producto)}
                                    >
                                        <GitMerge className="h-3.5 w-3.5" />
                                        Fusionar lotes
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </TableCell>
            </TableRow>,
        ];
    };

    // Fila de producto + (si el usuario lo abre) su desglose por lote.
    const renderFilaProducto = (producto: Producto, enGrupo = false) => [
        renderFilaBase(producto, enGrupo),
        ...(producto.lotes && lotesExpandidos[claveLotes(producto)] ? renderLotes(producto) : []),
    ];

    // Fila padre de un grupo de fichas hermanas: resumen + acciones del grupo; al expandir,
    // una fila por ficha (renderFilaProducto con enGrupo).
    const renderGrupo = (clave: string, fichas: Producto[]) => {
        const expandido = gruposExpandidos[clave] ?? false;
        // Solo las fichas con precio: una ficha todavía sin precio no hace que el grupo "varíe".
        const conPrecio = fichas.filter((f) => f.precio_venta !== null);
        const precios = [...new Set(conPrecio.map((f) => f.precio_venta))];
        const comisiones = [...new Set(conPrecio.map((f) => f.comision ?? 0))];
        const sinPrecio = fichas.filter((f) => f.precio_venta === null).length;
        const bajoCosto = canViewSensitiveData && fichas.some((f) => f.precio_venta !== null && f.precio_venta < costoDe(f));
        const costos = fichas.map(costoDe);
        const primera = fichas[0];
        const detalles = [primera.marca_producto, primera.modelo_producto, primera.capacidad_producto].filter(Boolean);

        return [
            <TableRow key={`grupo-${clave}`} className="bg-teal-50/60 hover:bg-teal-50 dark:bg-teal-950/20 dark:hover:bg-teal-950/30">
                <TableCell className="font-medium">
                    <button
                        type="button"
                        className="flex cursor-pointer items-center gap-1.5 text-left"
                        onClick={() => setGruposExpandidos((prev) => ({ ...prev, [clave]: !expandido }))}
                        aria-expanded={expandido}
                    >
                        {expandido ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <span>{primera.nombre_producto}</span>
                    </button>
                    {detalles.length > 0 && <p className="text-muted-foreground mt-0.5 pl-6 text-xs font-normal">{detalles.join(' • ')}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-1 pl-6">
                        <Badge variant="outline" className="border-teal-500/50 text-[10px] text-teal-700 dark:text-teal-400">
                            <Layers className="mr-1 h-3 w-3" />
                            {fichas.length} fichas
                        </Badge>
                        {sinPrecio > 0 && (
                            <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-700 dark:text-amber-400">
                                {sinPrecio} sin precio
                            </Badge>
                        )}
                        {bajoCosto && (
                            <Badge variant="destructive" className="text-[10px]">
                                Bajo costo
                            </Badge>
                        )}
                    </div>
                </TableCell>
                <TableCell>{primera.categoria || 'Sin categoría'}</TableCell>
                {canViewSensitiveData && (
                    <TableCell className="text-xs">
                        {Math.min(...costos) === Math.max(...costos)
                            ? formatCurrency(costos[0])
                            : `${formatCurrency(Math.min(...costos))} – ${formatCurrency(Math.max(...costos))}`}
                    </TableCell>
                )}
                <TableCell>
                    <Badge variant="outline">{fichas.reduce((sum, f) => sum + f.stock_almacen, 0)}</Badge>
                </TableCell>
                <TableCell className={cn(precios.length === 1 ? 'text-amber-800' : 'text-amber-400 italic')}>
                    {precios.length === 0 ? 'No definido' : precios.length === 1 ? formatCurrency(precios[0]) : 'Varía'}
                </TableCell>
                <TableCell className="font-medium text-indigo-600">
                    {comisiones.length === 1 && comisiones[0] > 0 ? (
                        formatCurrency(comisiones[0])
                    ) : (
                        <span className="text-xs text-gray-400 italic">—</span>
                    )}
                </TableCell>
                {canViewSensitiveData && <TableCell className="text-xs text-gray-400 italic">Ver fichas</TableCell>}
                <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-teal-600 hover:bg-teal-100 hover:text-teal-800"
                                        onClick={() => abrirPrecioGrupo(fichas)}
                                    >
                                        <Layers size={16} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Precio del grupo</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        {puedeGestionar && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-amber-600 hover:bg-amber-100 hover:text-amber-800"
                                            onClick={() => abrirFusionGrupo(fichas)}
                                        >
                                            <GitMerge size={16} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Fusionar fichas</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </TableCell>
            </TableRow>,
            ...(expandido ? fichas.map((ficha) => renderFilaProducto(ficha, true)) : []),
        ];
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Precios por Almacén" />
            <Toaster position="top-center" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="border-sidebar-accent bg-sidebar relative rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Gestión de Precios de Venta por Almacén"
                        description="Asigne precios de venta específicos a los productos en cada uno de sus almacenes."
                    />
                    <Warehouse size={70} color="#d6d3d1" className="absolute right-2 bottom-0 opacity-40" />
                </div>
                <Separator />

                {/* Estadísticas */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border space-y-3 rounded-xl border p-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <p>
                            Total de Productos Asignados:{' '}
                            <span className="font-medium">
                                <Badge variant="secondary">{filteredProducts.length}</Badge>
                            </span>
                        </p>
                        <p>
                            Rol actual:{' '}
                            <span className="text-primary font-sans font-medium">
                                {meta.role_usuario === 'admin' ? 'Administrador' : meta.role_usuario === 'moderador' ? 'Moderador' : 'Vendedor'}
                            </span>
                        </p>
                    </div>

                    {selectedAlmacen &&
                        (() => {
                            const almacenStats = availableAlmacenes.find((a) => a.id === selectedAlmacen.almacen_id);
                            return almacenStats ? (
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                    <Card className="border-l-4 border-blue-500/30 shadow-sm transition-shadow hover:shadow-md">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <CardDescription className="text-xs font-medium tracking-wider text-blue-600 uppercase dark:text-blue-400">
                                                    Total Productos
                                                </CardDescription>
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                                                    <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                </div>
                                            </div>
                                            <CardTitle className="text-2xl font-bold text-blue-600 tabular-nums dark:text-blue-400">
                                                {almacenStats.totalProductos}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-muted-foreground text-xs">Asignados a este almacén</p>
                                        </CardContent>
                                    </Card>

                                    <Card
                                        onClick={() => toggleFiltroPrecio('con_precio')}
                                        className={cn(
                                            'cursor-pointer border-l-4 border-emerald-500/30 shadow-sm transition-shadow hover:shadow-md',
                                            filtroPrecio === 'con_precio' && 'ring-offset-background ring-2 ring-emerald-500 ring-offset-2',
                                        )}
                                    >
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <CardDescription className="text-xs font-medium tracking-wider text-emerald-600 uppercase dark:text-emerald-400">
                                                    Con Precio
                                                </CardDescription>
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                            </div>
                                            <CardTitle className="text-2xl font-bold text-emerald-600 tabular-nums dark:text-emerald-400">
                                                {almacenStats.productosConPrecio}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-muted-foreground text-xs">
                                                {filtroPrecio === 'con_precio' ? 'Filtrando · click para quitar' : 'Listos para vender'}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card
                                        onClick={() => toggleFiltroPrecio('sin_precio')}
                                        className={cn(
                                            'cursor-pointer border-l-4 border-amber-500/30 shadow-sm transition-shadow hover:shadow-md',
                                            filtroPrecio === 'sin_precio' && 'ring-offset-background ring-2 ring-amber-500 ring-offset-2',
                                        )}
                                    >
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <CardDescription className="text-xs font-medium tracking-wider text-amber-600 uppercase dark:text-amber-400">
                                                    Sin Precio
                                                </CardDescription>
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                                                    <XCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                </div>
                                            </div>
                                            <CardTitle className="text-2xl font-bold text-amber-600 tabular-nums dark:text-amber-400">
                                                {almacenStats.productosSinPrecio}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-muted-foreground text-xs">
                                                {filtroPrecio === 'sin_precio' ? 'Filtrando · click para quitar' : 'Pendientes de asignar'}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-l-4 border-purple-500/30 shadow-sm transition-shadow hover:shadow-md">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <CardDescription className="text-xs font-medium tracking-wider text-purple-600 uppercase dark:text-purple-400">
                                                    Stock Total
                                                </CardDescription>
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50">
                                                    <Warehouse className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                                </div>
                                            </div>
                                            <CardTitle className="text-2xl font-bold text-purple-600 tabular-nums dark:text-purple-400">
                                                {almacenStats.totalStock}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-muted-foreground text-xs">Unidades en almacén</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            ) : null;
                        })()}
                </div>

                {/* Controles del almacén: selector, búsqueda y exportar/importar (todos específicos del almacén seleccionado) */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border flex flex-wrap items-end gap-4 rounded-xl border p-4">
                    <div className="max-w-sm min-w-[220px] flex-1">
                        <Label htmlFor="almacen-selector" className="mb-2 block text-sm font-medium">
                            Seleccionar Almacén
                        </Label>
                        <Combobox
                            items={availableAlmacenes}
                            itemToStringLabel={(almacen: (typeof availableAlmacenes)[number]) => almacen.nombre}
                            itemToStringValue={(almacen: (typeof availableAlmacenes)[number]) => almacen.nombre}
                            value={availableAlmacenes.find((a) => a.id === selectedAlmacenId) ?? null}
                            onValueChange={(almacen: (typeof availableAlmacenes)[number] | null) => {
                                if (almacen) {
                                    setSelectedAlmacenId(almacen.id);
                                    setCurrentPage(1);
                                    setSearchTerm('');
                                    setFiltroPrecio('todos');
                                }
                            }}
                        >
                            <ComboboxInput
                                id="almacen-selector"
                                className="bg-background hover:bg-accent/50 h-11 w-full transition-colors"
                                placeholder="Buscar almacén..."
                            />
                            <ComboboxContent>
                                <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                                <ComboboxList>
                                    {(almacen: (typeof availableAlmacenes)[number]) => (
                                        <ComboboxItem key={almacen.id} value={almacen}>
                                            <div className="flex flex-col items-start">
                                                <span className="font-medium">{almacen.nombre}</span>
                                                <span className="text-muted-foreground text-xs">
                                                    {almacen.totalProductos} productos • {almacen.totalStock} unidades
                                                    {canViewSensitiveData &&
                                                        ` • Costo ${formatCurrency(almacen.valorCosto)} • Venta ${formatCurrency(almacen.valorVenta)}`}
                                                </span>
                                            </div>
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>

                    <div className="min-w-[220px] flex-1">
                        <Label htmlFor="buscar-producto" className="mb-2 block text-sm font-medium">
                            Buscar
                        </Label>
                        <Input
                            id="buscar-producto"
                            type="text"
                            placeholder="Buscar producto o almacén..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="h-11 uppercase placeholder:normal-case"
                        />
                    </div>

                    <div className="flex gap-2">
                        {productsInAlmacen.some((p) => p.lotes !== null) && (
                            <Button
                                variant={filtroPrecio === 'varios_costos' ? 'default' : 'outline'}
                                className="h-11 gap-2"
                                onClick={() => toggleFiltroPrecio('varios_costos')}
                            >
                                <Layers size={16} />
                                Varios costos ({productsInAlmacen.filter((p) => p.lotes !== null).length})
                            </Button>
                        )}
                        {meta.role_usuario === 'admin' && (
                            <Button variant="default" className="h-11 gap-2" onClick={openBulkModal}>
                                <Search size={16} />
                                Precio Global
                            </Button>
                        )}
                        {puedeGestionar && (
                            <Button
                                variant="outline"
                                className="h-11 gap-2 border-amber-500/60 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                                onClick={abrirFusionMasiva}
                                disabled={productosVariosCostos.length === 0}
                            >
                                <GitMerge size={16} />
                                Fusionar lotes
                            </Button>
                        )}
                        <Button variant="outline" className="h-11 gap-2" onClick={handleExport} disabled={!selectedAlmacenId}>
                            <Sheet size={16} />
                            Exportar Excel
                        </Button>
                        <Button
                            variant="secondary"
                            className="h-11 gap-2"
                            onClick={() => {
                                setImportFile(null);
                                setImportResult(null);
                                setIsImportDialogOpen(true);
                            }}
                            disabled={!selectedAlmacenId}
                        >
                            <FileText size={16} />
                            Importar Excel
                        </Button>
                    </div>
                </div>

                {/* Tabla de Productos */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative flex-1 overflow-x-auto rounded-xl border">
                    {selectedAlmacen && currentEntradas.length > 0 ? (
                        <div>
                            <div className="border-b bg-gray-50 p-3 dark:bg-gray-800">
                                <h3 className="flex items-center gap-2 text-lg font-semibold">
                                    <Warehouse size={20} className="text-primary" />
                                    {selectedAlmacen.nombre_almacen}
                                    <Badge variant="secondary" className="ml-2">
                                        {filteredProducts.length} productos
                                    </Badge>
                                </h3>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-100 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-900">
                                        <TableHead className="w-[220px]">Producto</TableHead>
                                        <TableHead>Categoría</TableHead>
                                        {canViewSensitiveData && <TableHead>Costo real</TableHead>}
                                        <TableHead>Stock</TableHead>
                                        <TableHead>Precio Venta</TableHead>
                                        <TableHead>Comisión</TableHead>
                                        {canViewSensitiveData && <TableHead>Ganancia</TableHead>}
                                        <TableHead className="text-center">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentEntradas.map((entrada) =>
                                        entrada.tipo === 'grupo' ? renderGrupo(entrada.clave, entrada.fichas) : renderFilaProducto(entrada.producto),
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            <Warehouse size={48} className="mx-auto mb-4 text-gray-300" />
                            <h3 className="mb-2 text-lg font-medium">{selectedAlmacen ? 'No hay productos disponibles' : 'Seleccione un almacén'}</h3>
                            <p className="text-sm">
                                {selectedAlmacen
                                    ? 'No se encontraron productos en este almacén que coincidan con la búsqueda.'
                                    : 'Por favor seleccione un almacén para ver sus productos.'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Paginación */}
                {totalPages > 1 && (
                    <Pagination className="mt-2">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                            {getPageNumbers().map((page, index) =>
                                page === 'ellipsis' ? (
                                    <PaginationItem key={`ellipsis-${index}`}>
                                        <PaginationEllipsis />
                                    </PaginationItem>
                                ) : (
                                    <PaginationItem key={page}>
                                        <PaginationLink
                                            onClick={() => setCurrentPage(page as number)}
                                            isActive={currentPage === page}
                                            className="cursor-pointer"
                                        >
                                            {page}
                                        </PaginationLink>
                                    </PaginationItem>
                                ),
                            )}
                            <PaginationItem>
                                <PaginationNext
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}

                {/* Modal de Editar Precio */}
                {selectedProduct && (
                    <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <AlertDialogContent className="overflow-hidden border-0 p-0 shadow-2xl sm:max-w-md">
                            <div className="from-primary/10 to-primary/5 border-primary/10 border-b bg-linear-to-r p-6">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-primary flex items-center gap-2 text-xl">
                                        <BadgeDollarSign className="h-6 w-6" />
                                        {isEditMode ? 'Actualizar Precio' : 'Asignar Nuevo Precio'}
                                    </AlertDialogTitle>
                                    <div className="text-muted-foreground mt-1 text-sm">Gestiona el valor comercial para este producto.</div>
                                </AlertDialogHeader>
                            </div>

                            <div className="space-y-6 p-6">
                                <div className="bg-secondary/30 border-border/50 space-y-3 rounded-lg border p-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">Producto</p>
                                            <p className="text-foreground mt-0.5 text-base font-semibold">{selectedProduct.nombre_producto}</p>
                                        </div>
                                        <Badge variant="outline" className="bg-background">
                                            {selectedProduct.marca_producto}
                                        </Badge>
                                    </div>
                                    <div className="border-border/50 flex gap-4 border-t pt-2">
                                        {canViewSensitiveData && (
                                            <>
                                                <div>
                                                    <p className="text-muted-foreground text-xs">Costo real</p>
                                                    <p className="font-medium text-amber-700">{formatCurrency(costoDe(selectedProduct))}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground text-xs">Ganancia Actual</p>
                                                    <p
                                                        className={cn(
                                                            'font-medium',
                                                            (gananciaDe(selectedProduct) ?? 0) >= 0 ? 'text-success' : 'text-destructive',
                                                        )}
                                                    >
                                                        {formatCurrency(gananciaDe(selectedProduct))}
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {selectedProduct.grupo_clave && selectedProduct.precio_de_grupo && (
                                    <div className="flex items-start gap-2 rounded-md border border-teal-300 bg-teal-50 p-3 text-xs text-teal-800 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
                                        <Layers className="mt-0.5 h-4 w-4 shrink-0" />
                                        <span>
                                            Esta ficha sigue el precio del grupo. Si le pones un precio aquí, queda con precio propio y el precio del
                                            grupo ya no la va a actualizar.
                                        </span>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="almacen-select" className="text-sm font-medium">
                                            Almacén Destino
                                        </Label>
                                        <Select
                                            onValueChange={handleAlmacenChange}
                                            defaultValue={selectedProduct.almacen_id.toString()}
                                            disabled={isEditMode || availableAlmacenes.length <= 1}
                                        >
                                            <SelectTrigger id="almacen-select" className="bg-background hover:bg-accent/50 h-10 transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <Warehouse className="text-muted-foreground h-4 w-4" />
                                                    <SelectValue placeholder="Seleccione un almacén" />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableAlmacenes.map((almacen) => (
                                                    <SelectItem key={almacen.id} value={almacen.id.toString()}>
                                                        {almacen.nombre}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {isEditMode && (
                                            <p className="text-muted-foreground ml-1 flex items-center gap-1 text-[10px]">
                                                <span className="block h-1 w-1 rounded-full bg-amber-500"></span>
                                                Almacén bloqueado en modo edición
                                            </p>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="new-price" className="text-sm font-medium">
                                            Precio de Venta (USD)
                                        </Label>
                                        <div className="relative">
                                            <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 font-semibold">$</span>
                                            <Input
                                                id="new-price"
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                value={newPrice}
                                                onChange={(e) => setNewPrice(e.target.value)}
                                                className="bg-background border-input hover:border-primary/50 focus-visible:ring-primary/20 h-11 pl-7 text-lg font-semibold shadow-sm transition-all"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between px-1">
                                            {canViewSensitiveData && (
                                                <p className="text-muted-foreground text-[10px]">
                                                    Mínimo sugerido: {formatCurrency(costoDe(selectedProduct) * 1.01)}
                                                </p>
                                            )}
                                            {canViewSensitiveData && newPrice && !isNaN(parseFloat(newPrice)) && (
                                                <p
                                                    className={cn(
                                                        'text-xs font-medium',
                                                        parseFloat(newPrice) - costoDe(selectedProduct) >= 0 ? 'text-success' : 'text-destructive',
                                                    )}
                                                >
                                                    Ganancia: {formatCurrency(parseFloat(newPrice) - costoDe(selectedProduct))}
                                                </p>
                                            )}
                                        </div>
                                        {error && <p className="text-destructive animate-in slide-in-from-top-1 px-1 text-xs font-medium">{error}</p>}
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="new-comision" className="text-sm font-medium">
                                            {meta.role_usuario === 'vendedor' ? 'Mi Comisión (USD)' : 'Comisión del Vendedor (USD)'}
                                        </Label>
                                        <div className="relative">
                                            <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 font-semibold">$</span>
                                            <Input
                                                id="new-comision"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={newComision}
                                                onChange={(e) => setNewComision(e.target.value)}
                                                className="bg-background border-input hover:border-primary/50 focus-visible:ring-primary/20 h-11 pl-7 text-lg font-semibold shadow-sm transition-all"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <p className="text-muted-foreground ml-1 text-[10px]">
                                            {meta.role_usuario === 'vendedor'
                                                ? 'Lo que ganarás por cada unidad vendida a este precio'
                                                : 'Monto fijo que ganará el vendedor por cada unidad vendida'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/50 border-border/50 flex justify-end gap-3 border-t p-4">
                                <AlertDialogCancel onClick={() => setIsModalOpen(false)} disabled={isLoading} className="h-9">
                                    Cancelar
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleSubmit}
                                    className="bg-primary hover:bg-primary/90 h-9 min-w-[120px] px-6"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            Guardando
                                        </span>
                                    ) : (
                                        <span>Confirmar</span>
                                    )}
                                </AlertDialogAction>
                            </div>
                        </AlertDialogContent>
                    </AlertDialog>
                )}

                {/* Modal "Buscar Producto" — asignar precio en varios almacenes a la vez (solo admin) */}
                <AlertDialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
                    <AlertDialogContent className="flex h-[85vh] w-[95vw] !max-w-none max-w-[900px] flex-col p-0">
                        <AlertDialogHeader className="shrink-0 border-b px-6 py-4">
                            <AlertDialogTitle className="flex items-center gap-3 text-xl font-semibold">
                                <Search className="h-6 w-6" />
                                <span>Buscar Producto y Asignar Precio</span>
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Buscá un producto y aplicá el mismo precio de venta (y comisión opcional) en varios almacenes a la vez.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <div ref={resolveBulkDialogContainer} className="grid flex-1 overflow-hidden lg:grid-cols-[1fr_380px]">
                            {/* Columna principal: buscar producto + precio/comisión */}
                            <div className="flex flex-col gap-y-6 overflow-y-auto px-6 py-6">
                                <div className="space-y-2">
                                    <Label htmlFor="bulk-producto">Producto</Label>
                                    <Combobox
                                        items={productosUnicos}
                                        itemToStringLabel={(p: ProductoUnico) => p.nombre_producto}
                                        itemToStringValue={(p: ProductoUnico) => p.nombre_producto}
                                        value={bulkSelectedProduct}
                                        onValueChange={handleBulkProductChange}
                                    >
                                        <ComboboxInput
                                            id="bulk-producto"
                                            className="w-full"
                                            placeholder="Buscar por nombre, marca o modelo..."
                                            showClear={!!bulkSelectedProduct}
                                        />
                                        <ComboboxContent container={bulkDialogContainer}>
                                            <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                                            <ComboboxList>
                                                {(p: ProductoUnico) => (
                                                    <ComboboxItem key={p.id} value={p}>
                                                        <div className="flex w-full items-center gap-3 py-1">
                                                            {p.imagen_producto && (
                                                                <img
                                                                    src={`/${p.imagen_producto}`}
                                                                    alt={p.nombre_producto}
                                                                    className="h-10 w-10 shrink-0 rounded-md object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                                    }}
                                                                />
                                                            )}
                                                            <div className="flex flex-col items-start">
                                                                <span className="font-medium">{p.nombre_producto}</span>
                                                                <span className="text-muted-foreground text-xs">
                                                                    {[p.marca_producto, p.modelo_producto, p.capacidad_producto, p.color_producto]
                                                                        .filter(Boolean)
                                                                        .join(' • ') || 'Sin atributos adicionales'}
                                                                </span>
                                                                <span className="text-muted-foreground text-xs">
                                                                    {p.categoria} · Disponible en {p.apariciones.length} almacén(es)
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </ComboboxItem>
                                                )}
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                </div>

                                {bulkSelectedProduct && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="bulk-precio">Precio de Venta (USD)</Label>
                                                <Input
                                                    id="bulk-precio"
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    value={bulkPrice}
                                                    onChange={(e) => setBulkPrice(e.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="bulk-comision">Comisión (USD, opcional)</Label>
                                                <Input
                                                    id="bulk-comision"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={bulkComision}
                                                    onChange={(e) => setBulkComision(e.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>

                                        {bulkError && <p className="text-sm text-red-500">{bulkError}</p>}

                                        <Card className="border-primary/30 border-l-4">
                                            <CardHeader className="flex-row items-start gap-4 space-y-0 pb-2">
                                                {bulkSelectedProduct.imagen_producto && (
                                                    <img
                                                        src={`/${bulkSelectedProduct.imagen_producto}`}
                                                        alt={bulkSelectedProduct.nombre_producto}
                                                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                )}
                                                <div>
                                                    <CardTitle className="text-base">{bulkSelectedProduct.nombre_producto}</CardTitle>
                                                    <CardDescription>{bulkSelectedProduct.categoria}</CardDescription>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                    <span className="text-muted-foreground">Marca:</span>
                                                    <span className="font-medium">{bulkSelectedProduct.marca_producto || '—'}</span>
                                                    {bulkSelectedProduct.modelo_producto && (
                                                        <>
                                                            <span className="text-muted-foreground">Modelo:</span>
                                                            <span className="font-medium">{bulkSelectedProduct.modelo_producto}</span>
                                                        </>
                                                    )}
                                                    {bulkSelectedProduct.capacidad_producto && (
                                                        <>
                                                            <span className="text-muted-foreground">Capacidad:</span>
                                                            <span className="font-medium">{bulkSelectedProduct.capacidad_producto}</span>
                                                        </>
                                                    )}
                                                    {bulkSelectedProduct.color_producto && (
                                                        <>
                                                            <span className="text-muted-foreground">Color:</span>
                                                            <span className="font-medium">{bulkSelectedProduct.color_producto}</span>
                                                        </>
                                                    )}
                                                    <span className="text-muted-foreground">Precio Compra:</span>
                                                    <span className="font-medium">{formatCurrency(bulkSelectedProduct.precio_compra)}</span>
                                                    <span className="text-muted-foreground">Stock Total:</span>
                                                    <span className="font-medium">
                                                        {bulkSelectedProduct.apariciones.reduce((sum, a) => sum + a.stock_almacen, 0)} unidades
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}
                            </div>

                            {/* Panel lateral: almacenes donde está disponible */}
                            <div className="flex flex-col overflow-y-auto border-l bg-slate-50/50 p-6 dark:bg-slate-800/20">
                                {!bulkSelectedProduct ? (
                                    <p className="text-muted-foreground text-sm">Seleccioná un producto para ver en qué almacenes está disponible.</p>
                                ) : (
                                    <>
                                        <p className="mb-3 text-sm font-medium">Disponible en {bulkSelectedProduct.apariciones.length} almacén(es)</p>
                                        <div className="space-y-2">
                                            {bulkSelectedProduct.apariciones.map((a) => (
                                                <div
                                                    key={a.almacen_id}
                                                    onClick={() => toggleBulkAlmacen(a.almacen_id)}
                                                    className="bg-background flex cursor-pointer items-center justify-between gap-2 rounded-lg border p-3"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Checkbox checked={bulkSelectedAlmacenIds.includes(a.almacen_id)} />
                                                        <span className="text-sm font-medium">{a.nombre_almacen}</span>
                                                    </div>
                                                    <span
                                                        className={cn(
                                                            'text-xs',
                                                            a.precio_venta === null ? 'text-amber-500 italic' : 'text-muted-foreground',
                                                        )}
                                                    >
                                                        {formatCurrency(a.precio_venta)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-auto rounded-xl border-2 p-4">
                                            <p className="text-sm">
                                                <span className="font-semibold">{bulkSelectedAlmacenIds.length}</span> almacén(es) seleccionado(s)
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <AlertDialogFooter className="shrink-0 flex-row justify-end space-x-4 border-t px-6 py-4">
                            <AlertDialogCancel onClick={() => setIsBulkModalOpen(false)} disabled={isBulkLoading}>
                                Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={(e) => {
                                    e.preventDefault();
                                    requestBulkConfirmation();
                                }}
                                disabled={!bulkSelectedProduct || !bulkPrice || bulkSelectedAlmacenIds.length === 0 || isBulkLoading}
                            >
                                {`Aplicar a ${bulkSelectedAlmacenIds.length} almacén(es)`}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Confirmación con contraseña antes de aplicar el precio masivo (mismo patrón que Productos/Edit.tsx) */}
                <Dialog
                    open={isBulkPasswordDialogOpen}
                    onOpenChange={(open) => {
                        setIsBulkPasswordDialogOpen(open);
                        if (!open) {
                            setBulkPasswordInput('');
                            setBulkShowPassword(false);
                            setBulkError(null);
                        }
                    }}
                >
                    <DialogContent className="sm:max-w-[420px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <ShieldAlert className="text-amber-500" size={20} />
                                Confirmar cambio de precio masivo
                            </DialogTitle>
                            <DialogDescription>
                                Vas a aplicar <strong>{formatCurrency(bulkSelectedProduct ? parseFloat(bulkPrice) || 0 : 0)}</strong> a{' '}
                                <strong>{bulkSelectedProduct?.nombre_producto}</strong> en{' '}
                                <strong>{bulkSelectedAlmacenIds.length} almacén(es)</strong>. Esta acción queda registrada en el historial. Ingresa tu
                                contraseña para confirmar.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="bulk-confirm-password">Contraseña</Label>
                                <div className="relative">
                                    <Input
                                        id="bulk-confirm-password"
                                        type={bulkShowPassword ? 'text' : 'password'}
                                        value={bulkPasswordInput}
                                        onChange={(e) => setBulkPasswordInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && bulkPasswordInput) handleBulkSubmit();
                                        }}
                                        placeholder="Ingresa tu contraseña"
                                        className="pr-10 normal-case"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setBulkShowPassword((v) => !v)}
                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        tabIndex={-1}
                                    >
                                        {bulkShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                {bulkError && <p className="text-sm text-red-500">{bulkError}</p>}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsBulkPasswordDialogOpen(false);
                                    setBulkPasswordInput('');
                                    setBulkShowPassword(false);
                                    setBulkError(null);
                                }}
                                disabled={isBulkLoading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                disabled={!bulkPasswordInput || isBulkLoading}
                                onClick={handleBulkSubmit}
                                className="bg-amber-600 text-white hover:bg-amber-700"
                            >
                                {isBulkLoading ? 'Aplicando...' : 'Confirmar cambio'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Modal de Historial de Precios */}
                <AlertDialog open={isHistorialDialogOpen} onOpenChange={setIsHistorialDialogOpen}>
                    <AlertDialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-4xl">
                        <div className="border-b border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:from-blue-950 dark:to-indigo-950">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-3 text-xl text-blue-700 dark:text-blue-300">
                                    <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                                        <History className="h-5 w-5" />
                                    </div>
                                    Historial de Precios
                                </AlertDialogTitle>
                                {historialData && (
                                    <div className="mt-3 space-y-1">
                                        <p className="text-foreground text-base font-semibold">{historialData.producto.nombre}</p>
                                        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                                            <Badge variant="outline">{historialData.producto.marca}</Badge>
                                            {historialData.producto.modelo && <span>Modelo: {historialData.producto.modelo}</span>}
                                            {historialData.producto.capacidad && <span>• {historialData.producto.capacidad}</span>}
                                            {historialData.producto.color && <span>• {historialData.producto.color}</span>}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 pt-2">
                                            <span className="flex items-center gap-2 text-sm">
                                                <Warehouse className="h-4 w-4 text-blue-600" />
                                                <span className="font-medium">{historialData.almacen.nombre}</span>
                                            </span>
                                            {canViewSensitiveData && (
                                                <>
                                                    <Separator orientation="vertical" className="h-4" />
                                                    <span className="text-sm">
                                                        <span className="text-muted-foreground">Precio Compra:</span>{' '}
                                                        <span className="font-semibold text-amber-700">
                                                            {formatCurrency(historialData.producto.precio_compra)}
                                                        </span>
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </AlertDialogHeader>
                        </div>

                        <div className="max-h-[550px] overflow-y-auto p-6">
                            {loadingHistorial ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="relative">
                                            <span className="absolute h-12 w-12 animate-ping rounded-full bg-blue-400 opacity-75" />
                                            <span className="relative flex h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                                        </div>
                                        <p className="text-muted-foreground text-sm font-medium">Cargando historial...</p>
                                    </div>
                                </div>
                            ) : historialData ? (
                                <div className="space-y-5">
                                    {/* Precio actual */}
                                    {historialData.precio_actual ? (
                                        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:bg-green-950/30">
                                            <p className="mb-2 text-xs font-semibold tracking-wider text-green-700 uppercase dark:text-green-400">
                                                Precio Vigente
                                            </p>
                                            <div className="flex flex-wrap items-center gap-6">
                                                <div>
                                                    <p className="text-xs text-green-600">Precio Venta</p>
                                                    <p className="text-xl font-bold text-green-800 dark:text-green-200">
                                                        {formatCurrency(historialData.precio_actual.precio_venta)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-indigo-600">Comisión</p>
                                                    <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                                                        {formatCurrency(historialData.precio_actual.comision)}
                                                    </p>
                                                </div>
                                                {canViewSensitiveData && (
                                                    <div>
                                                        <p className="text-xs text-gray-500">Ganancia</p>
                                                        <p
                                                            className={cn(
                                                                'text-xl font-bold',
                                                                historialData.precio_actual.ganancia >= 0 ? 'text-green-700' : 'text-red-600',
                                                            )}
                                                        >
                                                            {formatCurrency(historialData.precio_actual.ganancia)}
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="ml-auto text-right">
                                                    <p className="text-xs text-gray-500">Puesto por</p>
                                                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                                                        {historialData.precio_actual.puesto_por_nombre}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{historialData.precio_actual.ultima_actualizacion}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                                            Este producto no tiene precio asignado en este almacén.
                                        </div>
                                    )}

                                    {/* Tabla de historial */}
                                    {historialData.historial.length > 0 ? (
                                        <div>
                                            <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                Historial de cambios ({historialData.total_cambios})
                                            </p>
                                            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-gray-100 hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-900">
                                                            <TableHead className="font-semibold">Fecha</TableHead>
                                                            <TableHead className="font-semibold">Usuario</TableHead>
                                                            <TableHead className="text-right font-semibold">Precio Anterior</TableHead>
                                                            <TableHead className="text-right font-semibold">Precio Nuevo</TableHead>
                                                            <TableHead className="text-right font-semibold">Comisión</TableHead>
                                                            <TableHead className="font-semibold">Acción</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {historialData.historial.map((item, index) => (
                                                            <TableRow
                                                                key={item.id}
                                                                className={cn(
                                                                    index === 0
                                                                        ? 'bg-blue-50/50 dark:bg-blue-950/20'
                                                                        : index % 2 === 0
                                                                          ? 'bg-background'
                                                                          : 'bg-muted/30',
                                                                    'hover:bg-accent/50 transition-colors',
                                                                )}
                                                            >
                                                                <TableCell className="text-xs text-gray-500">{item.fecha}</TableCell>
                                                                <TableCell className="font-medium">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                                                            {item.usuario.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        {item.usuario}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-right text-gray-400">
                                                                    {item.precio_anterior !== null ? (
                                                                        formatCurrency(item.precio_anterior)
                                                                    ) : (
                                                                        <span className="text-xs italic">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400">
                                                                    {formatCurrency(item.precio_nuevo)}
                                                                </TableCell>
                                                                <TableCell className="text-right text-indigo-600 dark:text-indigo-400">
                                                                    {item.comision !== null ? (
                                                                        formatCurrency(item.comision)
                                                                    ) : (
                                                                        <span className="text-xs text-gray-400 italic">—</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-xs text-gray-500">{item.accion}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-8 text-center text-sm text-gray-500">No hay cambios registrados en el historial.</div>
                                    )}
                                </div>
                            ) : null}
                        </div>

                        <div className="flex justify-end border-t bg-gray-50 p-4 dark:bg-gray-900">
                            <AlertDialogCancel
                                onClick={() => {
                                    setIsHistorialDialogOpen(false);
                                    setHistorialData(null);
                                }}
                                className="h-10"
                            >
                                Cerrar
                            </AlertDialogCancel>
                        </div>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Modal de Importar Excel */}
                <AlertDialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                    <AlertDialogContent className="overflow-hidden border-0 p-0 shadow-2xl sm:max-w-md">
                        <div className="border-b border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 dark:from-emerald-950 dark:to-teal-950">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2 text-xl text-emerald-700 dark:text-emerald-300">
                                    <Upload className="h-6 w-6" />
                                    Importar Precios desde Excel
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground mt-1 text-sm">
                                    Sube el Excel exportado con los precios completados.
                                    {selectedAlmacen && (
                                        <span className="ml-1 font-medium text-emerald-700 dark:text-emerald-400">
                                            Almacén: {selectedAlmacen.nombre_almacen}
                                        </span>
                                    )}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                        </div>

                        <div className="space-y-4 p-6">
                            {importResult && (
                                <div
                                    className={cn(
                                        'rounded-lg border p-4 text-sm',
                                        importResult.errores.length === 0
                                            ? 'border-green-200 bg-green-50 dark:bg-green-950/30'
                                            : 'border-amber-200 bg-amber-50 dark:bg-amber-950/30',
                                    )}
                                >
                                    <div className="mb-2 flex items-center gap-2 font-semibold">
                                        {importResult.errores.length === 0 ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <XCircle className="h-4 w-4 text-amber-600" />
                                        )}
                                        <span>Resultado de la importación</span>
                                    </div>
                                    <p className="text-green-700 dark:text-green-400">✓ {importResult.actualizados} producto(s) actualizados</p>
                                    {importResult.omitidos > 0 && (
                                        <p className="text-gray-500">— {importResult.omitidos} fila(s) sin cambios (celdas vacías)</p>
                                    )}
                                    {importResult.errores.length > 0 && (
                                        <ul className="mt-2 space-y-1 text-amber-700 dark:text-amber-400">
                                            {importResult.errores.map((e, i) => (
                                                <li key={i} className="text-xs">
                                                    • {e}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {importResult.actualizados > 0 && (
                                        <p className="mt-2 text-xs text-gray-500 italic">Recargando página en unos segundos...</p>
                                    )}
                                </div>
                            )}

                            {!importResult && (
                                <div>
                                    <label
                                        htmlFor="import-file"
                                        className={cn(
                                            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors',
                                            importFile
                                                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                                                : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10',
                                        )}
                                    >
                                        <Upload className={cn('mb-3 h-10 w-10', importFile ? 'text-emerald-500' : 'text-gray-400')} />
                                        {importFile ? (
                                            <>
                                                <p className="font-semibold text-emerald-700 dark:text-emerald-300">{importFile.name}</p>
                                                <p className="mt-1 text-xs text-gray-500">
                                                    {(importFile.size / 1024).toFixed(1)} KB — Click para cambiar
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-medium text-gray-600 dark:text-gray-300">Arrastra el archivo aquí</p>
                                                <p className="mt-1 text-xs text-gray-400">o haz click para seleccionar</p>
                                                <p className="mt-2 text-xs text-gray-400">Solo archivos .xlsx o .xls</p>
                                            </>
                                        )}
                                        <input
                                            id="import-file"
                                            type="file"
                                            accept=".xlsx,.xls"
                                            className="hidden"
                                            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                                        />
                                    </label>
                                </div>
                            )}
                        </div>

                        <div className="bg-muted/50 border-border/50 flex justify-end gap-3 border-t p-4">
                            <AlertDialogCancel
                                onClick={() => {
                                    setIsImportDialogOpen(false);
                                    setImportResult(null);
                                    setImportFile(null);
                                }}
                                disabled={isImporting}
                                className="h-9"
                            >
                                {importResult ? 'Cerrar' : 'Cancelar'}
                            </AlertDialogCancel>
                            {!importResult && (
                                <AlertDialogAction
                                    onClick={handleImport}
                                    disabled={!importFile || isImporting}
                                    className="h-9 min-w-[130px] bg-emerald-600 px-6 hover:bg-emerald-700"
                                >
                                    {isImporting ? (
                                        <span className="flex items-center gap-2">
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                            Importando...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Upload className="h-4 w-4" />
                                            Importar
                                        </span>
                                    )}
                                </AlertDialogAction>
                            )}
                        </div>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Precio del grupo — mismo producto repetido como 2+ fichas en este almacén */}
                <Dialog open={grupoPrecio !== null} onOpenChange={(v) => !v && !grupoGuardando && setGrupoPrecio(null)}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Layers className="h-5 w-5 text-teal-600" />
                                Precio del grupo
                            </DialogTitle>
                            <DialogDescription>
                                {grupoPrecio?.[0].nombre_producto} — {grupoPrecio?.length} fichas en {selectedAlmacen?.nombre_almacen}. Se venden
                                igual aunque cada ficha tenga su propio costo.
                            </DialogDescription>
                        </DialogHeader>

                        {grupoPrecio && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="grupo-precio">Precio de venta</Label>
                                        <Input
                                            id="grupo-precio"
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            value={grupoPrecioVenta}
                                            onChange={(e) => setGrupoPrecioVenta(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="grupo-comision">Comisión</Label>
                                        <Input
                                            id="grupo-comision"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            placeholder="Sin cambiar"
                                            value={grupoComision}
                                            onChange={(e) => setGrupoComision(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Ficha</TableHead>
                                            <TableHead className="text-right">Stock</TableHead>
                                            {canViewSensitiveData && <TableHead className="text-right">Costo real</TableHead>}
                                            <TableHead className="text-right">Precio actual</TableHead>
                                            <TableHead className="text-right">Quedará</TableHead>
                                            {canViewSensitiveData && <TableHead className="text-right">Margen</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {grupoPrecio.map((ficha) => {
                                            const recibe = recibePrecioGrupo(ficha);
                                            const precioNuevo = parseFloat(grupoPrecioVenta);
                                            const precioFinal = recibe && !isNaN(precioNuevo) ? precioNuevo : ficha.precio_venta;
                                            const comisionFinal = recibe && grupoComision !== '' ? parseFloat(grupoComision) : (ficha.comision ?? 0);
                                            const margen = precioFinal === null ? null : precioFinal - comisionFinal - costoDe(ficha);

                                            return (
                                                <TableRow key={ficha.id}>
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-mono text-[10px]">
                                                            #{ficha.id}
                                                        </Badge>
                                                        {ficha.precio_venta !== null && (
                                                            <span className="text-muted-foreground ml-2 text-xs">
                                                                {ficha.precio_de_grupo ? 'sigue al grupo' : 'precio propio'}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">{ficha.stock_almacen}</TableCell>
                                                    {canViewSensitiveData && (
                                                        <TableCell className="text-right">{formatCurrency(costoDe(ficha))}</TableCell>
                                                    )}
                                                    <TableCell className="text-right">{formatCurrency(ficha.precio_venta)}</TableCell>
                                                    <TableCell className={cn('text-right font-medium', !recibe && 'text-muted-foreground')}>
                                                        {recibe ? formatCurrency(precioFinal) : 'Sin cambio'}
                                                    </TableCell>
                                                    {canViewSensitiveData && (
                                                        <TableCell
                                                            className={cn(
                                                                'text-right font-medium',
                                                                margen === null ? 'text-gray-400' : margen >= 0 ? 'text-green-600' : 'text-red-600',
                                                            )}
                                                        >
                                                            {margen === null ? '—' : formatCurrency(margen)}
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>

                                {grupoPrecio.some((f) => f.precio_venta !== null && !f.precio_de_grupo) && (
                                    <div className="flex items-start gap-2">
                                        <Checkbox
                                            id="grupo-incluir-propios"
                                            checked={grupoIncluirPropios}
                                            onCheckedChange={(v) => setGrupoIncluirPropios(v === true)}
                                        />
                                        <Label htmlFor="grupo-incluir-propios" className="text-sm leading-snug font-normal">
                                            Aplicar también a las fichas con precio propio (pasan a seguir el precio del grupo)
                                        </Label>
                                    </div>
                                )}

                                {canViewSensitiveData &&
                                    grupoPrecio.some((f) => recibePrecioGrupo(f) && parseFloat(grupoPrecioVenta) < costoDe(f)) && (
                                        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                            <span>
                                                Este precio queda por debajo del costo real de alguna ficha: el POS no deja venderla así salvo con
                                                venta especial.
                                            </span>
                                        </div>
                                    )}

                                {grupoError && (
                                    <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                                        {grupoError}
                                    </div>
                                )}
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setGrupoPrecio(null)} disabled={grupoGuardando}>
                                Cancelar
                            </Button>
                            <Button
                                className="gap-1 bg-teal-600 hover:bg-teal-700"
                                onClick={guardarPrecioGrupo}
                                disabled={grupoGuardando || !grupoPrecioVenta}
                            >
                                <Layers className="h-4 w-4" />
                                {grupoGuardando ? 'Aplicando…' : 'Aplicar precio del grupo'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* "Fusionar lotes" global del almacén seleccionado */}
                <Dialog open={isFusionMasivaOpen} onOpenChange={(v) => !masivaGuardando && setIsFusionMasivaOpen(v)}>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <GitMerge className="h-5 w-5 text-amber-600" />
                                Fusionar lotes — {selectedAlmacen?.nombre_almacen}
                            </DialogTitle>
                            <DialogDescription>
                                {masivaPaso === 'elegir' &&
                                    'Productos con lotes a costo distinto en este almacén. Los que marques quedan con un solo lote (costo promedio ponderado) que vende al precio del producto.'}
                                {masivaPaso === 'confirmar' && 'Revisa antes de confirmar. Esta acción no se puede deshacer.'}
                                {masivaPaso === 'resultado' && masivaResultado?.message}
                            </DialogDescription>
                        </DialogHeader>

                        {masivaPaso === 'elegir' && (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10">
                                            <Checkbox
                                                aria-label="Seleccionar todos"
                                                checked={
                                                    masivaSeleccion.length > 0 &&
                                                    masivaSeleccion.length === productosVariosCostos.filter((p) => !motivoBloqueoFusion(p)).length
                                                }
                                                onCheckedChange={(v) =>
                                                    setMasivaSeleccion(
                                                        v === true
                                                            ? productosVariosCostos.filter((p) => !motivoBloqueoFusion(p)).map((p) => p.id)
                                                            : [],
                                                    )
                                                }
                                            />
                                        </TableHead>
                                        <TableHead>Producto</TableHead>
                                        <TableHead>Lotes</TableHead>
                                        <TableHead className="text-right">Resultado</TableHead>
                                        <TableHead className="text-right">Precio</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {productosVariosCostos.map((producto) => {
                                        const lotes = producto.lotes ?? [];
                                        const cantidad = lotes.reduce((sum, l) => sum + l.cantidad, 0);
                                        const costo =
                                            cantidad > 0
                                                ? Math.round((lotes.reduce((sum, l) => sum + l.cantidad * (l.costo ?? 0), 0) / cantidad) * 100) / 100
                                                : 0;
                                        const bloqueo = motivoBloqueoFusion(producto);
                                        const conPrecioPropio = lotes.filter((l) => l.precio_venta !== null);

                                        return (
                                            <TableRow key={producto.id} className={cn(bloqueo && 'opacity-60')}>
                                                <TableCell>
                                                    <Checkbox
                                                        aria-label={`Seleccionar ${producto.nombre_producto}`}
                                                        disabled={bloqueo !== null}
                                                        checked={masivaSeleccion.includes(producto.id)}
                                                        onCheckedChange={() =>
                                                            setMasivaSeleccion((prev) =>
                                                                prev.includes(producto.id)
                                                                    ? prev.filter((id) => id !== producto.id)
                                                                    : [...prev, producto.id],
                                                            )
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell className="whitespace-normal">
                                                    <p className="font-medium">{producto.nombre_producto}</p>
                                                    <p className="text-muted-foreground text-xs">
                                                        {[producto.marca_producto, producto.modelo_producto, producto.capacidad_producto]
                                                            .filter(Boolean)
                                                            .join(' • ')}
                                                    </p>
                                                    {bloqueo && <p className="text-xs text-red-600 dark:text-red-400">{bloqueo}</p>}
                                                    {conPrecioPropio.map((l) => (
                                                        <p key={l.id} className="text-xs text-amber-700 dark:text-amber-400">
                                                            {l.codigo} tiene precio propio {formatCurrency(l.precio_venta)} → quedará a{' '}
                                                            {formatCurrency(producto.precio_venta)} (precio del producto)
                                                        </p>
                                                    ))}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {lotes.map((l) => (
                                                        <div key={l.id}>
                                                            {l.cantidad} × {l.costo !== null ? formatCurrency(l.costo) : '—'}
                                                        </div>
                                                    ))}
                                                </TableCell>
                                                <TableCell className="text-right text-sm font-medium">
                                                    {cantidad} u. a {formatCurrency(costo)}
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrency(producto.precio_venta)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}

                        {masivaPaso === 'confirmar' && (
                            <div className="space-y-2 text-sm">
                                <p>
                                    Vas a fusionar los lotes de <strong>{masivaSeleccion.length}</strong> producto(s) en{' '}
                                    {selectedAlmacen?.nombre_almacen}:
                                </p>
                                <ul className="text-muted-foreground list-disc pl-5">
                                    {productosVariosCostos
                                        .filter((p) => masivaSeleccion.includes(p.id))
                                        .map((p) => (
                                            <li key={p.id}>
                                                {p.nombre_producto} — {p.lotes?.length} lotes → 1 lote
                                            </li>
                                        ))}
                                </ul>
                                <p className="font-medium text-amber-700 dark:text-amber-400">Esta acción no se puede deshacer.</p>
                            </div>
                        )}

                        {masivaPaso === 'resultado' && masivaResultado && (
                            <div className="space-y-3 text-sm">
                                {masivaResultado.fusionados.length > 0 && (
                                    <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/40">
                                        <p className="mb-1 font-semibold text-emerald-700 dark:text-emerald-400">Fusionados</p>
                                        {masivaResultado.fusionados.map((f) => (
                                            <p key={f.producto_id}>
                                                {f.nombre_producto}: <span className="font-mono text-xs">{f.codigo}</span> — {f.cantidad} u. a{' '}
                                                {formatCurrency(f.costo)}
                                            </p>
                                        ))}
                                    </div>
                                )}
                                {masivaResultado.fallidos.length > 0 && (
                                    <div className="rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/40">
                                        <p className="mb-1 font-semibold text-red-700 dark:text-red-400">No se pudieron fusionar — revísalos</p>
                                        {masivaResultado.fallidos.map((f) => (
                                            <p key={f.producto_id}>
                                                {f.nombre_producto}: {f.motivo}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <DialogFooter>
                            {masivaPaso === 'elegir' && (
                                <>
                                    <Button variant="outline" onClick={() => setIsFusionMasivaOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button
                                        className="gap-1 bg-amber-600 hover:bg-amber-700"
                                        disabled={masivaSeleccion.length === 0}
                                        onClick={() => setMasivaPaso('confirmar')}
                                    >
                                        <GitMerge className="h-4 w-4" />
                                        Fusionar {masivaSeleccion.length > 0 ? `(${masivaSeleccion.length})` : ''}…
                                    </Button>
                                </>
                            )}
                            {masivaPaso === 'confirmar' && (
                                <>
                                    <Button variant="outline" onClick={() => setMasivaPaso('elegir')} disabled={masivaGuardando}>
                                        Volver
                                    </Button>
                                    <Button
                                        className="gap-1 bg-amber-600 hover:bg-amber-700"
                                        onClick={confirmarFusionMasiva}
                                        disabled={masivaGuardando}
                                    >
                                        <GitMerge className="h-4 w-4" />
                                        {masivaGuardando ? 'Fusionando…' : 'Sí, fusionar'}
                                    </Button>
                                </>
                            )}
                            {masivaPaso === 'resultado' && <Button onClick={() => setIsFusionMasivaOpen(false)}>Cerrar</Button>}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Fusionar lotes marcados en uno solo */}
                <Dialog open={loteFusion !== null} onOpenChange={(v) => !v && !loteFusionGuardando && setLoteFusion(null)}>
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <GitMerge className="h-5 w-5 text-amber-600" />
                                Fusionar lotes
                            </DialogTitle>
                            <DialogDescription>
                                {loteFusion?.producto.nombre_producto} en {selectedAlmacen?.nombre_almacen}. Los lotes marcados pasan a ser un solo
                                lote.
                            </DialogDescription>
                        </DialogHeader>

                        {loteFusion &&
                            (() => {
                                const cantidad = loteFusion.lotes.reduce((sum, l) => sum + l.cantidad, 0);
                                const costo =
                                    cantidad > 0
                                        ? Math.round((loteFusion.lotes.reduce((sum, l) => sum + l.cantidad * (l.costo ?? 0), 0) / cantidad) * 100) /
                                          100
                                        : 0;

                                return (
                                    <div className="space-y-4 text-sm">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Lote</TableHead>
                                                    <TableHead className="text-right">Cantidad</TableHead>
                                                    <TableHead className="text-right">Costo</TableHead>
                                                    <TableHead className="text-right">Precio</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loteFusion.lotes.map((lote) => (
                                                    <TableRow key={lote.id}>
                                                        <TableCell className="font-mono text-xs">{lote.codigo}</TableCell>
                                                        <TableCell className="text-right">{lote.cantidad}</TableCell>
                                                        <TableCell className="text-right">
                                                            {lote.costo !== null ? formatCurrency(lote.costo) : '—'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {formatCurrency(precioDeLote(loteFusion.producto, lote))}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                <TableRow className="font-semibold">
                                                    <TableCell>Lote resultante</TableCell>
                                                    <TableCell className="text-right">{cantidad}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(costo)}</TableCell>
                                                    <TableCell />
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                        <p className="text-muted-foreground text-xs">
                                            Costo = promedio ponderado por cantidad. El lote nuevo toma la antigüedad del lote más viejo. Los lotes
                                            originales quedan en 0 y se conservan para el historial de ventas.
                                        </p>

                                        <div className="space-y-2">
                                            <Label>Precio de venta del lote resultante</Label>
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="fusion-lotes-precio-propio"
                                                    checked={loteFusionPrecioPropio}
                                                    onCheckedChange={(v) => setLoteFusionPrecioPropio(v === true)}
                                                />
                                                <Label htmlFor="fusion-lotes-precio-propio" className="font-normal">
                                                    Ponerle un precio propio (si no, vende al precio del producto:{' '}
                                                    {formatCurrency(loteFusion.producto.precio_venta)})
                                                </Label>
                                            </div>
                                            {loteFusionPrecioPropio && (
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    aria-label="Precio propio del lote resultante"
                                                    className="w-40"
                                                    value={loteFusionPrecio}
                                                    onChange={(e) => setLoteFusionPrecio(e.target.value)}
                                                />
                                            )}
                                        </div>

                                        <p className="font-medium text-amber-700 dark:text-amber-400">Esta acción no se puede deshacer.</p>

                                        {loteFusionError && (
                                            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                                                {loteFusionError}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setLoteFusion(null)} disabled={loteFusionGuardando}>
                                Cancelar
                            </Button>
                            <Button
                                className="gap-1 bg-amber-600 hover:bg-amber-700"
                                onClick={confirmarFusionLotes}
                                disabled={loteFusionGuardando || (loteFusionPrecioPropio && !loteFusionPrecio)}
                            >
                                <GitMerge className="h-4 w-4" />
                                {loteFusionGuardando ? 'Fusionando…' : 'Sí, fusionar lotes'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Fusión de fichas (mismo diálogo que Productos → "Limpiar duplicados") */}
                <FusionFichasDialog
                    grupo={grupoFusion}
                    open={isFusionOpen}
                    onOpenChange={setIsFusionOpen}
                    onCompletado={() => router.reload({ only: ['almacenes'] })}
                />
            </div>
            <ScrollProgress />
        </AppLayout>
    );
}
