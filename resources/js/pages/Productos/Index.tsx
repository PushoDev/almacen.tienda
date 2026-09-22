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
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { ScrollProgress } from '@/components/ui/scroll';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AppLayout from '@/layouts/app-layout';
import { ProductosFilters, ProductosPaginados, ProductosSort, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    CloudUpload,
    DollarSign,
    Download,
    Edit3,
    Eye,
    FileText,
    Filter,
    GitMerge,
    Package,
    Package2,
    RefreshCw,
    Search,
    Trash2,
    Upload,
    Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { sileo } from '@/lib/sileo';
import { Toaster } from '@/components/ui/sileo-toaster';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Productos',
        href: '/listado-productos',
    },
];

// Interface para el modal de importación
interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (file: File, almacenId: number) => void;
    almacenes: { id: number; nombre_almacen: string }[];
}

// Modal para importar productos
function ImportModal({ isOpen, onClose, onImport, almacenes }: ImportModalProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [almacenId, setAlmacenId] = useState<number>(almacenes[0]?.id || 1);
    const [isDragging, setIsDragging] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [fileSize, setFileSize] = useState<string>('0 KB');

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 KB';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const handleFileSelect = (file: File) => {
        // Validar extensión
        const validExtensions = ['xlsx', 'xls'];
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

        if (!validExtensions.includes(fileExtension)) {
            sileo.error({ title: 'Formato inválido', description: 'Solo se aceptan archivos .xlsx o .xls' });
            return;
        }

        // Validar tamaño (máximo 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            sileo.error({ title: 'Archivo demasiado grande', description: 'El tamaño máximo permitido es 5MB' });
            return;
        }

        setSelectedFile(file);
        setFileSize(formatFileSize(file.size));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedFile) {
            sileo.warning({ title: 'Falta el archivo', description: 'Selecciona un archivo para continuar' });
            return;
        }

        if (!almacenId) {
            sileo.warning({ title: 'Falta el almacén', description: 'Selecciona un almacén de destino' });
            return;
        }

        setIsImporting(true);
        try {
            await onImport(selectedFile, almacenId);
            setSelectedFile(null);
            setFileSize('0 KB');
        } catch (error) {
            console.error('Error en importación:', error);
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        if (!isImporting) {
            setSelectedFile(null);
            setFileSize('0 KB');
            onClose();
        }
    };

    if (!isOpen) return null;

    const selectedAlmacen = almacenes.find((a) => a.id === almacenId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800">
                {/* Encabezado */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Importar Productos desde Excel</h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Carga un archivo Excel con los productos a importar. Se pueden crear nuevos productos o actualizar los existentes.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Selector de almacén */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">📦 Almacén de destino</label>
                        <select
                            value={almacenId}
                            onChange={(e) => setAlmacenId(Number(e.target.value))}
                            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            disabled={isImporting}
                        >
                            {almacenes.map((almacen) => (
                                <option key={almacen.id} value={almacen.id}>
                                    {almacen.nombre_almacen}
                                </option>
                            ))}
                        </select>
                        {selectedAlmacen && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Los productos se asignarán a: <strong>{selectedAlmacen.nombre_almacen}</strong>
                            </p>
                        )}
                    </div>

                    {/* Área de arrastrar y soltar */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">📄 Archivo Excel</label>
                        <div
                            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-all ${
                                isDragging
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700/30'
                            } ${isImporting ? 'pointer-events-none opacity-50' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => !isImporting && document.getElementById('file-input')?.click()}
                        >
                            {selectedFile ? (
                                <div className="space-y-2">
                                    <CloudUpload className="mx-auto text-green-500" size={32} />
                                    <p className="font-semibold text-gray-900 dark:text-white">✓ {selectedFile.name}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">{fileSize}</p>
                                    <p className="text-xs text-blue-600 dark:text-blue-400">Haz clic o arrastra para cambiar el archivo</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <CloudUpload className="mx-auto text-gray-400" size={32} />
                                    <p className="text-gray-900 dark:text-white">
                                        <span className="font-semibold">Arrastra tu archivo aquí</span> o haz clic para seleccionar
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">Formatos soportados: .xlsx, .xls | Tamaño máximo: 5MB</p>
                                </div>
                            )}
                            <input
                                id="file-input"
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileSelect(file);
                                }}
                                disabled={isImporting}
                            />
                        </div>
                    </div>

                    {/* Información del formato requerido */}
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                        <p className="mb-3 font-semibold text-blue-900 dark:text-blue-300">📋 Formato del archivo requerido:</p>
                        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                            <li className="flex items-start gap-2">
                                <span className="font-bold">•</span>
                                <span>
                                    <strong>Columnas obligatorias:</strong> nombre_producto, categoria, precio_compra, cantidad
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold">•</span>
                                <span>
                                    <strong>Columnas opcionales:</strong> marca, modelo, capacidad
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold">•</span>
                                <span>
                                    <strong>Comportamiento:</strong> Los códigos de barras se generan automáticamente. Si el producto existe, se
                                    actualiza la categoría, precio y cantidad en el almacén.
                                </span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold">•</span>
                                <span>
                                    <strong>Ejemplo de fila:</strong> Laptop Dell | Electrónicos | 1500.00 | 10 | Dell | XPS 13 | 512GB
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" className="cursor-pointer" onClick={handleClose} disabled={isImporting}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={!selectedFile || isImporting}
                            className="cursor-pointer gap-2 bg-green-600 hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isImporting ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    Importando...
                                </>
                            ) : (
                                <>
                                    <Upload size={16} />
                                    Importar Productos
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface ProductosPageProps {
    productos: ProductosPaginados;
    almacenes?: { id: number; nombre_almacen: string }[];
    categorias?: { id: number; nombre_categoria: string }[];
    filters?: ProductosFilters;
    sort?: ProductosSort;
    canViewStockStats?: boolean;
    canViewSensitiveData?: boolean;
    total_importe_global?: number;
    resumen_stock_bajo?: { cantidad: number; valor: number | null };
}

const defaultPaginator = {
    data: [],
    links: [],
    total: 0,
    from: 0,
    to: 0,
};

export default function ProductosPage({
    productos = defaultPaginator,
    almacenes = [],
    categorias = [],
    filters = {},
    sort = { field: 'nombre_producto', direction: 'asc' },
    canViewStockStats = false,
    canViewSensitiveData = false,
    total_importe_global = 0,
    resumen_stock_bajo,
}: ProductosPageProps) {
    // Estados para gestión de stock
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedCategoria, setSelectedCategoria] = useState(filters.categoria_id || '');
    const [selectedAlmacen, setSelectedAlmacen] = useState(filters.almacen_id || '');
    const [soloStockBajo, setSoloStockBajo] = useState(filters.stock_bajo || false);

    // Estados para importación/exportación
    const [almacenExportId, setAlmacenExportId] = useState<number>(1);
    const [showImportModal, setShowImportModal] = useState(false);

    // Estados para duplicados
    const [showDuplicadosModal, setShowDuplicadosModal] = useState(false);
    const [duplicados, setDuplicados] = useState<any[]>([]);
    const [loadingDuplicados, setLoadingDuplicados] = useState(false);
    const [gruposExpandidos, setGruposExpandidos] = useState<Record<number, boolean>>({});
    // Estado para Modal 2 (normalización + fusión)
    const [grupoActivo, setGrupoActivo] = useState<any>(null);
    const [showFusionModal, setShowFusionModal] = useState(false);
    const [conservarId, setConservarId] = useState<number | null>(null);
    const [valoresCanonicos, setValoresCanonicos] = useState<Record<string, any>>({});
    const [procesando, setProcesando] = useState(false);

    // Calcular estadísticas
    const productosData = productos.data || [];
    // Widgets de stock bajo: calculados en el backend sobre todo el catálogo (no solo esta página)
    const cantidadStockBajo = resumen_stock_bajo?.cantidad ?? 0;
    const valorStockBajo = resumen_stock_bajo?.valor ?? 0;

    // Verificar si hay filtros activos
    const hayFiltrosActivos = searchTerm || selectedCategoria || selectedAlmacen || soloStockBajo;

    // Con almacén filtrado, "Costo"/"Cant" de la tabla muestran el valor real de ESE almacén
    // (ver ProductoController::index()) en vez del promedio/total global — este nombre alimenta
    // el header para que no parezca el mismo dato de siempre.
    const almacenFiltradoNombre = almacenes.find((a) => String(a.id) === String(selectedAlmacen))?.nombre_almacen;

    // Opciones del Combobox de almacén-filtro, con "Todos" como primer ítem seleccionable
    // (id vacío = sin filtro — mismo criterio que ya tenía el <select> nativo que reemplaza).
    const almacenFiltroOptions = [{ id: '', nombre_almacen: 'Todos los almacenes' }, ...almacenes];

    // Eliminar Producto
    const deleteProducto = (id: number) => {
        router.delete(route('productos.destroy', { producto: id }), {
            onSuccess: () => {
                sileo.success({ title: 'Producto eliminado', description: 'El producto se eliminó correctamente' });
            },
            onError: () => {
                sileo.error({ title: 'Error al eliminar', description: 'Inténtalo nuevamente' });
            },
        });
    };

    // Regenerar código de barras
    const regenerarBarcode = async (id: number) => {
        try {
            const response = await fetch(route('productos.regenerar-barcode', { producto: id }), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
            });

            const result = await response.json();

            if (result.success) {
                sileo.success({ title: 'Código de barras regenerado', description: 'Se regeneró correctamente' });
                // Recargar la página para ver los cambios
                router.reload();
            } else {
                sileo.error({ title: 'Error al regenerar', description: result.message || 'Error al regenerar el código de barras' });
            }
        } catch {
            sileo.error({ title: 'Error al regenerar', description: 'No se pudo regenerar el código de barras' });
        }
    };

    // Exportar a Excel
    const handleExport = () => {
        if (!almacenExportId) {
            sileo.warning({ title: 'Falta el almacén', description: 'Selecciona un almacén para exportar' });
            return;
        }

        try {
            const url = route('productos.export', { almacen_id: almacenExportId });

            // Crear un elemento temporal para descargar
            const link = document.createElement('a');
            link.href = url;

            const almacenSeleccionado = almacenes.find((a) => a.id === almacenExportId);
            const nombreAlmacen = almacenSeleccionado
                ? almacenSeleccionado.nombre_almacen.replace(/\s+/g, '-').toLowerCase()
                : `almacen-${almacenExportId}`;
            const fecha = new Date().toISOString().split('T')[0];
            const hora = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');

            link.download = `productos-${nombreAlmacen}-${fecha}-${hora}.xlsx`;
            document.body.appendChild(link);

            // Mostrar notificación mientras se descarga
            sileo.info({ title: 'Preparando exportación...', duration: 2000 });

            link.click();

            document.body.removeChild(link);

            sileo.success({
                title: 'Exportación completada',
                description: `Se exportaron los productos del almacén ${almacenSeleccionado?.nombre_almacen || 'seleccionado'}`,
            });
        } catch (error) {
            console.error('Error en exportación:', error);
            sileo.error({ title: 'Error al exportar', description: 'No se pudieron exportar los productos' });
        }
    };

    // Importar desde Excel - VERSIÓN PROFESIONAL
    const handleImport = async (file: File, almacenId: number) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('almacen_id', almacenId.toString());

        try {
            await router.post(route('productos.import'), formData, {
                forceFormData: true,
                onSuccess: (page) => {
                    // La respuesta exitosa vendrá del servidor
                    sileo.success({
                        title: '¡Importación completada!',
                        description: 'Los productos han sido importados al almacén seleccionado.',
                    });
                    setShowImportModal(false);
                    // Recargamos la página para ver los productos actualizados
                    setTimeout(() => {
                        router.reload();
                    }, 1000);
                },
                onError: (errors: Record<string, string>) => {
                    console.error('Errores de importación:', errors);

                    const errorMessage = errors.error || errors.file || errors.almacen_id || 'Ocurrió un error al importar los productos.';

                    sileo.error({ title: 'Error en la importación', description: errorMessage });
                },
            });
        } catch (error: any) {
            console.error('Error desconocido:', error);
            const errorMessage = error?.message || 'Error desconocido al importar';
            sileo.error({ title: 'Error al importar', description: errorMessage });
        }
    };

    // Descargar plantilla desde el servidor (genera un .xlsx real)
    const downloadTemplate = () => {
        const link = document.createElement('a');
        link.href = route('productos.template');
        link.download = 'plantilla-importacion-productos.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        sileo.info({ title: 'Descargando plantilla Excel...' });
    };

    // Cargar duplicados
    const cargarDuplicados = async () => {
        setLoadingDuplicados(true);
        setShowDuplicadosModal(true);
        try {
            const response = await fetch(route('productos.duplicados'));
            const data = await response.json();
            if (data.success) {
                setDuplicados(data.grupos);
            } else {
                sileo.error({ title: 'Error al cargar duplicados' });
            }
        } catch {
            sileo.error({ title: 'Error de conexión', description: 'No se pudieron cargar los duplicados' });
        } finally {
            setLoadingDuplicados(false);
        }
    };

    // Abrir Modal 2 para normalizar/fusionar un grupo
    const abrirFusion = (grupo: any) => {
        const mejor = grupo.productos?.reduce((a: any, b: any) => a.cantidad_total > b.cantidad_total ? a : b);
        setGrupoActivo(grupo);
        setConservarId(mejor?.id || grupo.productos?.[0]?.id);
        const iniciales: Record<string, any> = {};
        (grupo.campos_variables || []).forEach((cv: any) => {
            iniciales[cv.campo] = cv.valor_sugerido;
        });
        setValoresCanonicos(iniciales);
        setShowFusionModal(true);
    };

    // Solo normalizar (sin fusionar)
    const handleNormalizar = async () => {
        const grupo = grupoActivo;
        if (!grupo || !Object.keys(valoresCanonicos).length) {
            sileo.warning({ title: 'Nada que normalizar', description: 'No hay campos para normalizar' });
            return;
        }
        setProcesando(true);
        try {
            const response = await fetch(route('productos.normalizar'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    productos_ids: grupo.productos.map((p: any) => p.id),
                    valores_canonicos: valoresCanonicos,
                }),
            });
            const data = await response.json();
            if (data.success) {
                sileo.success({ title: data.message });
                setShowFusionModal(false);
                cargarDuplicados();
            } else {
                sileo.error({ title: data.message || 'Error al normalizar' });
            }
        } catch {
            sileo.error({ title: 'Error de conexión', description: 'No se pudo normalizar' });
        } finally {
            setProcesando(false);
        }
    };

    // Normalizar + Fusionar
    const handleFusionar = async () => {
        const grupo = grupoActivo;
        if (!grupo || !conservarId) return;
        setProcesando(true);
        try {
            const eliminarIds = grupo.productos
                .filter((p: any) => p.id !== conservarId)
                .map((p: any) => p.id);

            const response = await fetch(route('productos.fusionar'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    producto_conservar_id: conservarId,
                    productos_eliminar_ids: eliminarIds,
                    valores_canonicos: valoresCanonicos,
                }),
            });
            const data = await response.json();
            if (data.success) {
                sileo.success({ title: data.message });
                setShowFusionModal(false);
                cargarDuplicados();
            } else {
                sileo.error({ title: data.message || 'Error al fusionar' });
            }
        } catch {
            sileo.error({ title: 'Error de conexión', description: 'No se pudo fusionar' });
        } finally {
            setProcesando(false);
        }
    };

    const toggleGrupo = (index: number) => {
        setGruposExpandidos(prev => ({ ...prev, [index]: !prev[index] }));
    };

    // Aplicar filtros
    const aplicarFiltros = useCallback(() => {
        const params: Record<string, string | boolean> = {};
        if (searchTerm) params.search = searchTerm;
        if (selectedCategoria) params.categoria_id = selectedCategoria;
        if (selectedAlmacen) params.almacen_id = selectedAlmacen;
        if (soloStockBajo) params.stock_bajo = true;
        // Solo agregar parámetros de ordenamiento si son diferentes a los valores por defecto
        if (sort.field && sort.field !== 'nombre_producto') params.sort_field = sort.field;
        if (sort.direction && sort.direction !== 'asc') params.sort_direction = sort.direction;

        router.get(route('productos.index'), params, {
            preserveState: true,
            replace: true,
        });
    }, [searchTerm, selectedCategoria, selectedAlmacen, soloStockBajo, sort.field, sort.direction]);

    // Cambiar ordenamiento
    const handleSort = (field: string) => {
        const direction = sort.field === field && sort.direction === 'asc' ? 'desc' : 'asc';
        const params: Record<string, any> = {
            ...filters,
        };

        if (field !== 'nombre_producto') params.sort_field = field;
        if (direction !== 'asc') params.sort_direction = direction;

        router.get(route('productos.index'), params, {
            preserveState: true,
            replace: true,
        });
    };

    // Navegación de páginas
    const navigateToPage = (url: string | null) => {
        if (url) {
            router.get(url, {}, { preserveState: true, preserveScroll: true });
        }
    };

    // Efecto para aplicar filtros con debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            aplicarFiltros();
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [aplicarFiltros]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Productos" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Gestión de Productos"
                        description="Administra y controla el inventario de productos del sistema. Los códigos de barras se generan automáticamente."
                    />
                    <Package2
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator className="col-span-4" />

                {/* Contenedor de Widgets de Estadísticas */}
                <div className="space-y-3">
                    {hayFiltrosActivos && (
                        <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-1.5 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                            <Filter size={12} />
                            <span>
                                Mostrando valores de {productosData.length} productos filtrados de {productos.total} totales
                            </span>
                        </div>
                    )}
                    <div className={`grid gap-4 ${canViewStockStats ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
                        {/* Widget: Productos Totales */}
                        <div className="bg-card rounded-lg border p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-muted-foreground text-sm font-medium">Productos Totales</p>
                                <Package className="h-4 w-4 text-blue-500" />
                            </div>
                            <p className="mt-1 text-2xl font-bold">{productos.total}</p>
                        </div>

                        {/* Widget: Valor Total del Inventario */}
                        {canViewSensitiveData && (
                            <div className="bg-card rounded-lg border p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-muted-foreground text-sm font-medium">Valor Total</p>
                                    <DollarSign className="h-4 w-4 text-green-500" />
                                </div>
                                <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                                    ${total_importe_global.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        )}

                        {/* Widget: Productos con Stock Bajo */}
                        <div className="bg-card rounded-lg border p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-muted-foreground text-sm font-medium">Stock Bajo</p>
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                            </div>
                            <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{cantidadStockBajo}</p>
                        </div>

                        {/* Widget: Valor Stock Bajo (Condicional) */}
                        {canViewStockStats && (
                            <div className="bg-card rounded-lg border p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-muted-foreground text-sm font-medium">Valor Stock Bajo</p>
                                    <Wallet className="h-4 w-4 text-red-500" />
                                </div>
                                <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                                    ${valorStockBajo.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Buscador y Filtros */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-wrap items-end gap-3">
                    {/* Buscador */}
                    <div className="relative w-full sm:w-72">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                        <input
                            type="text"
                            placeholder="Buscar productos por nombre, código, marca o modelo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border-input bg-background focus:border-primary focus:ring-primary w-full rounded-lg border px-4 py-2.5 pl-10 text-sm focus:ring-1 focus:outline-none"
                        />
                    </div>

                    {/* Filtro por categoría */}
                    <div className="w-44">
                        <Label htmlFor="categoria-filtro" className="text-muted-foreground mb-1.5 block text-xs">
                            Categoría
                        </Label>
                        <select
                            id="categoria-filtro"
                            value={selectedCategoria}
                            onChange={(e) => setSelectedCategoria(e.target.value)}
                            className="border-input bg-background focus:border-primary focus:ring-primary w-full rounded-md border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                        >
                            <option className="bg-background" value="">
                                Todas las categorías
                            </option>
                            {categorias.map((categoria) => (
                                <option key={categoria.id} className="bg-background" value={categoria.id}>
                                    {categoria.nombre_categoria}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro por almacén */}
                    <div className="w-48">
                        <Label htmlFor="almacen-filtro" className="text-muted-foreground mb-1.5 block text-xs">
                            Almacén
                        </Label>
                        <Combobox
                            items={almacenFiltroOptions}
                            itemToStringLabel={(a: (typeof almacenFiltroOptions)[number]) => a.nombre_almacen}
                            itemToStringValue={(a: (typeof almacenFiltroOptions)[number]) => a.nombre_almacen}
                            value={almacenFiltroOptions.find((a) => String(a.id) === String(selectedAlmacen)) ?? almacenFiltroOptions[0]}
                            onValueChange={(a: (typeof almacenFiltroOptions)[number] | null) => setSelectedAlmacen(a ? String(a.id) : '')}
                        >
                            <ComboboxInput
                                id="almacen-filtro"
                                className="w-full"
                                placeholder="Buscar almacén..."
                                onFocus={(e) => e.currentTarget.select()}
                            />
                            <ComboboxContent>
                                <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                                <ComboboxList>
                                    {(a: (typeof almacenFiltroOptions)[number]) => (
                                        <ComboboxItem key={a.id} value={a}>
                                            {a.nombre_almacen}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>

                    {/* Botón stock bajo */}
                    <Button
                        variant={soloStockBajo ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSoloStockBajo(!soloStockBajo)}
                        className="gap-1.5"
                    >
                        <Filter size={14} />
                        {soloStockBajo ? 'Todos' : 'Stock Bajo'}
                    </Button>

                    <Separator orientation="vertical" className="h-9" />

                    {/* Selector de almacén para exportación */}
                    <div className="w-48">
                        <Label htmlFor="almacen-exportar" className="text-muted-foreground mb-1.5 block text-xs">
                            Exportar a
                        </Label>
                        <Combobox
                            items={almacenes}
                            itemToStringLabel={(a: (typeof almacenes)[number]) => a.nombre_almacen}
                            itemToStringValue={(a: (typeof almacenes)[number]) => a.nombre_almacen}
                            value={almacenes.find((a) => a.id === almacenExportId) ?? null}
                            onValueChange={(a: (typeof almacenes)[number] | null) => a && setAlmacenExportId(a.id)}
                        >
                            <ComboboxInput
                                id="almacen-exportar"
                                className="w-full"
                                placeholder="Buscar almacén..."
                                onFocus={(e) => e.currentTarget.select()}
                            />
                            <ComboboxContent>
                                <ComboboxEmpty>Sin resultados</ComboboxEmpty>
                                <ComboboxList>
                                    {(a: (typeof almacenes)[number]) => (
                                        <ComboboxItem key={a.id} value={a}>
                                            {a.nombre_almacen}
                                        </ComboboxItem>
                                    )}
                                </ComboboxList>
                            </ComboboxContent>
                        </Combobox>
                    </div>

                    {/* Botones de exportación/importación - Solo icono con Tooltip */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon"
                                className="bg-primary hover:bg-sidebar h-8 w-8 cursor-pointer hover:text-white"
                                onClick={handleExport}
                            >
                                <Upload size={16} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Exportar productos</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 cursor-pointer bg-emerald-500 hover:bg-emerald-800"
                                onClick={downloadTemplate}
                            >
                                <FileText size={16} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Descargar plantilla</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 cursor-pointer bg-blue-500 hover:bg-blue-800"
                                onClick={() => setShowImportModal(true)}
                            >
                                <Download size={16} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Importar productos</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 cursor-pointer bg-amber-500 hover:bg-amber-600"
                                onClick={cargarDuplicados}
                            >
                                <GitMerge size={16} />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Limpiar duplicados</TooltipContent>
                    </Tooltip>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabla de Productos */}
                <Card className="overflow-hidden border-0 pt-0 shadow-lg">
                    <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-5 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <Package className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-white">Lista de Productos</CardTitle>
                                <CardDescription className="text-teal-100">
                                    {productos.total} producto{productos.total === 1 ? '' : 's'} en total
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 pt-5">
                        <div className="border-sidebar-border/70 dark:border-sidebar-border relative w-full overflow-auto rounded-b-xl border-t">
                            <Table>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                <TableHead className="w-[180px] cursor-pointer whitespace-nowrap" onClick={() => handleSort('nombre_producto')}>
                                    Nombre {sort.field === 'nombre_producto' && (sort.direction === 'asc' ? '↑' : '↓')}
                                </TableHead>
                                <TableHead className="whitespace-nowrap">Marca</TableHead>
                                <TableHead className="whitespace-nowrap">Modelo</TableHead>
                                <TableHead className="whitespace-nowrap">Capacidad</TableHead>
                                <TableHead className="whitespace-nowrap">Color</TableHead>
                                <TableHead className="whitespace-nowrap">Código</TableHead>
                                <TableHead className="whitespace-nowrap">Categoría</TableHead>
                                {canViewSensitiveData && (
                                    <TableHead
                                        className="cursor-pointer text-right whitespace-nowrap"
                                        onClick={() => handleSort('precio_compra_producto')}
                                    >
                                        {almacenFiltradoNombre ? `Costo en ${almacenFiltradoNombre.substring(0, 14)}` : 'Costo (promedio)'}{' '}
                                        {sort.field === 'precio_compra_producto' && (sort.direction === 'asc' ? '↑' : '↓')}
                                    </TableHead>
                                )}
                                <TableHead className="cursor-pointer text-right whitespace-nowrap" onClick={() => handleSort('cantidad_total')}>
                                    {almacenFiltradoNombre ? `Cant. en ${almacenFiltradoNombre.substring(0, 14)}` : 'Cant (total)'}{' '}
                                    {sort.field === 'cantidad_total' && (sort.direction === 'asc' ? '↑' : '↓')}
                                </TableHead>
                                {canViewSensitiveData && <TableHead className="text-right whitespace-nowrap">Importe</TableHead>}
                                <TableHead className="whitespace-nowrap">Img</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {productosData.map((producto) => {
                                const isStockBajo = producto.stock_bajo;
                                const productoCompleto = `${producto.nombre_producto}\nMarca: ${producto.marca_producto || 'Sin marca'}\nModelo: ${producto.modelo_producto || 'N/A'}\nCapacidad: ${producto.capacidad_producto || '-'}\nColor: ${producto.color_producto || '-'}\nCategoría: ${producto.categoria}\nCódigo: ${producto.codigo_producto}`;

                                return (
                                    <TableRow
                                        key={producto.id}
                                        className={isStockBajo ? 'border-l-4 border-red-500 bg-red-100 dark:bg-red-950/50' : ''}
                                    >
                                        <TableCell className="max-w-[180px]">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex cursor-help items-center gap-2">
                                                        <Package size={14} className="text-primary shrink-0" />
                                                        <span className="text-primary truncate font-medium">
                                                            {producto.nombre_producto.length > 25
                                                                ? producto.nombre_producto.substring(0, 25) + '...'
                                                                : producto.nombre_producto}
                                                        </span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-xs text-left whitespace-pre-line">
                                                    <p className="font-semibold">{producto.nombre_producto}</p>
                                                    <p className="text-muted-foreground mt-1 text-xs">
                                                        {producto.marca_producto || 'Sin marca'} - {producto.modelo_producto || 'N/A'}
                                                    </p>
                                                    <p className="text-muted-foreground text-xs">
                                                        {producto.capacidad_producto || '-'}{producto.color_producto ? ` · ${producto.color_producto}` : ''} | {producto.categoria}
                                                    </p>
                                                    <p className="text-muted-foreground mt-1 font-mono text-xs">{producto.codigo_producto}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className="h-5 border-slate-400/50 bg-slate-100 px-1.5 py-0 text-[10px] font-normal text-slate-700 dark:border-slate-500/40 dark:bg-slate-800/70 dark:text-slate-200"
                                            >
                                                {truncar(producto.marca_producto, 10, 'Sin marca')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs">{truncar(producto.modelo_producto, 12, 'N/A')}</TableCell>
                                        <TableCell className="text-xs">{truncar(producto.capacidad_producto, 8)}</TableCell>
                                        <TableCell className="text-xs">{truncar(producto.color_producto, 10)}</TableCell>
                                        <TableCell>
                                            <span className="font-mono text-[10px]">{truncar(producto.codigo_producto, 10, '')}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="h-5 px-1.5 py-0 text-[10px]">
                                                {truncar(producto.categoria, 12)}
                                            </Badge>
                                        </TableCell>
                                        {canViewSensitiveData && (
                                            <TableCell className="text-right whitespace-nowrap">
                                                <span className="text-xs">
                                                    ${producto.precio_compra_producto.toLocaleString('es-VE', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </span>
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="flex cursor-help items-center justify-end gap-1">
                                                        <span className={`text-xs font-medium ${isStockBajo ? 'font-bold text-red-600' : ''}`}>
                                                            {producto.cantidad_total}
                                                        </span>
                                                        {isStockBajo && <AlertTriangle size={12} className="text-red-600" />}
                                                    </div>
                                                </TooltipTrigger>
                                                {isStockBajo && (
                                                    <TooltipContent className="bg-red-500">
                                                        <p className="font-semibold text-white">⚠️ Stock bajo (menos de 3 unidades)</p>
                                                    </TooltipContent>
                                                )}
                                            </Tooltip>
                                        </TableCell>
                                        {canViewSensitiveData && (
                                            <TableCell className="text-right whitespace-nowrap">
                                                <span className="text-xs">
                                                    ${(producto.precio_compra_producto * producto.cantidad_total).toLocaleString('es-VE', {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </span>
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            {producto.imagen_url ? (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <img
                                                            src={producto.imagen_url}
                                                            alt={producto.nombre_producto}
                                                            className="h-8 w-8 cursor-help rounded-full object-cover"
                                                        />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <img
                                                            src={producto.imagen_url}
                                                            alt={producto.nombre_producto}
                                                            className="h-20 w-20 rounded object-cover"
                                                        />
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : (
                                                <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full">
                                                    <Package size={12} className="text-muted-foreground" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Link href={route('productos.show', { producto: producto.id })}>
                                                    <Button variant="outline" size="icon" className="hover:bg-chart-3 h-7 w-7 cursor-pointer">
                                                        <Eye size={12} />
                                                    </Button>
                                                </Link>

                                                <Link href={route('productos.edit', { producto: producto.id })}>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-7 w-7 cursor-pointer hover:bg-blue-600 hover:text-white"
                                                    >
                                                        <Edit3 size={12} />
                                                    </Button>
                                                </Link>

                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-7 w-7 cursor-pointer hover:bg-purple-600 hover:text-white"
                                                    onClick={() => regenerarBarcode(producto.id)}
                                                >
                                                    <RefreshCw size={12} />
                                                </Button>

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="hover:bg-destructive dark:hover:bg-destructive h-7 w-7 cursor-pointer hover:text-white"
                                                        >
                                                            <Trash2 size={12} />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="text-center">Confirmar Eliminación</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                ¿Estás seguro de eliminar el producto "{producto.nombre_producto}"? Esta acción es
                                                                irreversible y eliminará también el código de barras asociado.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="cursor-pointer">Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => deleteProducto(producto.id)}
                                                                className="bg-destructive cursor-pointer hover:bg-red-600"
                                                            >
                                                                Eliminar
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={8} className="bg-sidebar-accent font-semibold">
                                    Total General
                                    {canViewSensitiveData && (
                                        <span className="ml-2 font-bold text-green-600 dark:text-green-400">
                                            ${total_importe_global.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="bg-sidebar-accent text-right font-bold">
                                    {productosData.reduce((sum, p) => sum + p.cantidad_total, 0)}
                                </TableCell>
                                {canViewSensitiveData && (
                                    <TableCell className="bg-sidebar-accent text-right font-bold">
                                        $
                                        {productosData
                                            .reduce((sum, p) => sum + p.precio_compra_producto * p.cantidad_total, 0)
                                            .toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </TableCell>
                                )}
                                <TableCell className="bg-sidebar-accent"></TableCell>
                                <TableCell className="bg-sidebar-accent text-right">{productosData.length} prod.</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                        </div>
                    </CardContent>
                </Card>

                {/* Controles de Paginación */}
                {productos.links && productos.links.length > 3 && (
                    <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            Mostrando {productos.from} a {productos.to} de {productos.total} resultados
                        </div>
                        <div className="flex gap-1">
                            {productos.links.map((link, index) => (
                                <Button
                                    key={index}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => navigateToPage(link.url)}
                                    disabled={!link.url || link.active}
                                    className="cursor-pointer"
                                >
                                    {renderPaginationLabel(link.label)}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Modal de Importación */}
                <ImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleImport} almacenes={almacenes} />

                {/* Modal 1 - Exploración de duplicados */}
                {showDuplicadosModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="mx-4 w-full max-w-4xl rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">🧹 Limpiar productos duplicados</h2>
                                <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => setShowDuplicadosModal(false)}>✕</Button>
                            </div>

                            {loadingDuplicados ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                                    <span className="ml-3 text-gray-600">Analizando productos...</span>
                                </div>
                            ) : duplicados.length === 0 ? (
                                <div className="py-12 text-center text-gray-500">
                                    <Package size={48} className="mx-auto mb-3 text-green-400" />
                                    <p className="text-lg font-semibold text-green-600">No hay productos duplicados</p>
                                    <p className="mt-1 text-sm">Todos los productos están correctamente organizados.</p>
                                </div>
                            ) : (
                                <>
                                    <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                                        Se encontraron <strong>{duplicados.length}</strong> grupos de productos duplicados.
                                        Expande cada grupo para ver los detalles.
                                    </p>

                                    <div className="max-h-96 space-y-2 overflow-y-auto">
                                        {duplicados.map((grupo, index) => {
                                            const estaExpandido = gruposExpandidos[index] ?? false;

                                            return (
                                                <div key={index} className="rounded-lg border border-gray-200 dark:border-gray-700">
                                                    <button
                                                        className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                                        onClick={() => toggleGrupo(index)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-gray-900 dark:text-white">{estaExpandido ? '▼' : '▶'}</span>
                                                            <span className="font-medium text-gray-900 dark:text-white">{grupo.clave || 'Producto'}</span>
                                                            <Badge variant="outline" className="ml-2">{grupo.productos?.length || 0} productos</Badge>
                                                            <Badge variant="secondary" className="text-xs">{grupo.cantidad_total} unds</Badge>
                                                        </div>
                                                        <span className="text-sm font-bold text-green-600">${grupo.precio_promedio?.toFixed(2)}</span>
                                                    </button>

                                                    {estaExpandido && (
                                                        <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                                                            {grupo.productos?.map((prod: any) => (
                                                                <div key={prod.id} className="mb-2 flex items-center justify-between rounded bg-gray-50 px-3 py-2 dark:bg-gray-700/30">
                                                                    <div className="text-sm">
                                                                        <span className="font-mono text-xs text-gray-500">ID {prod.id}</span>
                                                                        <span className="ml-2 font-medium">${prod.precio_compra?.toFixed(2)}</span>
                                                                        <span className="ml-2 text-gray-500">— {prod.cantidad_total} unds</span>
                                                                        {prod.categoria && <Badge variant="outline" className="ml-2 text-[10px]">{prod.categoria}</Badge>}
                                                                        {prod.codigo && <span className="ml-2 font-mono text-[10px] text-gray-400">{prod.codigo}</span>}
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {prod.almacenes?.map((a: any) => (
                                                                            <Badge key={a.id} variant="secondary" className="text-[10px]">
                                                                                {a.nombre}: {a.cantidad}
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {(grupo.campos_variables?.length || 0) > 0 && (
                                                                <div className="mb-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                                                                    ⚠️ Campos que varían: {grupo.campos_variables.map((cv: any) =>
                                                                        `${cv.campo} (${cv.valores.join(', ')})`
                                                                    ).join(' | ')}
                                                                </div>
                                                            )}

                                                            <div className="mt-2 flex justify-end">
                                                                <Button
                                                                    size="sm"
                                                                    className="cursor-pointer gap-1 bg-amber-600 text-xs hover:bg-amber-700"
                                                                    onClick={() => abrirFusion(grupo)}
                                                                >
                                                                    <GitMerge size={12} />
                                                                    Normalizar y Fusionar
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}

                            <div className="mt-4 flex justify-end">
                                <Button variant="outline" className="cursor-pointer" onClick={() => setShowDuplicadosModal(false)}>
                                    Cerrar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal 2 - Normalización + Fusión */}
                {showFusionModal && grupoActivo && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="mx-4 w-full max-w-3xl rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">🔧 Normalizar y fusionar</h2>
                                <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => setShowFusionModal(false)}>✕</Button>
                            </div>

                            <p className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">{grupoActivo.clave}</p>

                            {/* Selector de producto a conservar */}
                            <div className="mb-4">
                                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-400">Conservar producto</label>
                                <select
                                    value={conservarId || ''}
                                    onChange={(e) => setConservarId(Number(e.target.value))}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                >
                                    {grupoActivo.productos?.map((prod: any) => (
                                        <option key={prod.id} value={prod.id}>
                                            ID {prod.id} — ${prod.precio_compra?.toFixed(2)} — {prod.cantidad_total} unds {prod.almacenes?.length ? `(${prod.almacenes.map((a: any) => `${a.nombre}: ${a.cantidad}`).join(', ')})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Campos variables con inputs */}
                            {(grupoActivo.campos_variables?.length || 0) > 0 && (
                                <div className="mb-4 space-y-3">
                                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Campos a normalizar (color y precio no se modifican):</p>
                                    {grupoActivo.campos_variables.map((cv: any) => (
                                        <div key={cv.campo} className="flex items-center gap-3">
                                            <label className="w-28 text-xs font-medium capitalize text-gray-700 dark:text-gray-300">
                                                {cv.campo.replace('_producto', '').replace('_id', '')}
                                            </label>
                                            <input
                                                type="text"
                                                value={valoresCanonicos[cv.campo] || ''}
                                                onChange={(e) => setValoresCanonicos(prev => ({ ...prev, [cv.campo]: e.target.value }))}
                                                placeholder={cv.valor_sugerido || ''}
                                                className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                            />
                                            <span className="text-[10px] text-gray-400">Actual: {cv.valores.join(', ')}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Resumen de cantidades */}
                            <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/30">
                                <p className="mb-1 text-xs font-semibold text-gray-600 dark:text-gray-400">Distribución actual en almacenes:</p>
                                <div className="max-h-24 space-y-0.5 overflow-y-auto text-xs text-gray-700 dark:text-gray-300">
                                    {grupoActivo.productos?.map((prod: any) => (
                                        <div key={prod.id} className="flex items-center gap-2">
                                            <span className="font-mono text-[10px] text-gray-400">ID {prod.id}</span>
                                            <span className="font-medium">${prod.precio_compra?.toFixed(2)}</span>
                                            <span>→</span>
                                            {prod.almacenes?.map((a: any) => (
                                                <Badge key={a.id} variant="secondary" className="text-[10px]">
                                                    {a.nombre}: {a.cantidad}
                                                </Badge>
                                            ))}
                                            {(!prod.almacenes || prod.almacenes.length === 0) && (
                                                <span className="text-gray-400">sin stock</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 border-t border-gray-200 pt-2 text-xs font-bold dark:border-gray-600">
                                    Total: {grupoActivo.cantidad_total} unds — Precio promedio: ${grupoActivo.precio_promedio?.toFixed(2)}
                                </div>
                            </div>

                            {/* Botones */}
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" className="cursor-pointer" onClick={() => setShowFusionModal(false)} disabled={procesando}>
                                    Cancelar
                                </Button>
                                {Object.keys(valoresCanonicos).length > 0 && (
                                    <Button
                                        variant="outline"
                                        className="cursor-pointer gap-1 border-blue-500 text-blue-600 hover:bg-blue-50"
                                        onClick={handleNormalizar}
                                        disabled={procesando}
                                    >
                                        {procesando ? (
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                                        ) : (
                                            'Solo normalizar'
                                        )}
                                    </Button>
                                )}
                                <Button
                                    className="cursor-pointer gap-1 bg-green-600 hover:bg-green-700"
                                    onClick={handleFusionar}
                                    disabled={procesando}
                                >
                                    {procesando ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                                    ) : (
                                        <GitMerge size={14} />
                                    )}
                                    Normalizar y Fusionar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                <Toaster position="top-center" />
            </div>
            <ScrollProgress />
        </AppLayout>
    );
}
const renderPaginationLabel = (label: string) => {
    if (!label) return '';
    const normalized = label.toLowerCase();
    if (normalized.includes('pagination.previous') || normalized.includes('previous')) return '«';
    if (normalized.includes('pagination.next') || normalized.includes('next')) return '»';
    return label.replace('&laquo;', '«').replace('&raquo;', '»');
};

// Recorta un valor de celda con "…" solo cuando de verdad se cortó — a diferencia de un
// substring() a secas, nunca hace parecer completo un valor que en realidad quedó truncado.
const truncar = (valor: string | null | undefined, max: number, fallback = '-'): string => {
    if (!valor) return fallback;
    return valor.length > max ? valor.slice(0, max) + '…' : valor;
};
