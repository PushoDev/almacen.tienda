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
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { ProductosFilters, ProductosPaginados, ProductosSort, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    BarChart3,
    CloudUpload,
    CopyX,
    DollarSign,
    Download,
    Edit3,
    Eye,
    FileText,
    Filter,
    Hash,
    Package,
    Package2,
    QrCode,
    RefreshCw,
    Search,
    Trash2,
    Upload,
    Wallet,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';

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
            toast.error('❌ Formato inválido. Solo se aceptan archivos .xlsx o .xls');
            return;
        }

        // Validar tamaño (máximo 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            toast.error('❌ El archivo es demasiado grande. Máximo 5MB');
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
            toast.error('Por favor, selecciona un archivo para continuar');
            return;
        }

        if (!almacenId) {
            toast.error('Por favor, selecciona un almacén de destino');
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
}: ProductosPageProps) {
    // Estados para gestión de stock
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedCategoria, setSelectedCategoria] = useState(filters.categoria_id || '');
    const [soloStockBajo, setSoloStockBajo] = useState(filters.stock_bajo || false);

    // Estados para importación/exportación
    const [almacenExportId, setAlmacenExportId] = useState<number>(1);
    const [showImportModal, setShowImportModal] = useState(false);

    // Calcular estadísticas
    const productosData = productos.data || [];
    const productosConStockBajo = productosData.filter((p) => p.stock_bajo);
    const valorTotalInventario = productosData.reduce((sum, p) => sum + p.precio_compra_producto * p.cantidad_total, 0);
    const valorStockBajo = productosConStockBajo.reduce((sum, p) => sum + p.precio_compra_producto * p.cantidad_total, 0);

    // Eliminar Producto
    const deleteProducto = (id: number) => {
        router.delete(route('productos.destroy', { producto: id }), {
            onSuccess: () => {
                toast.success('Producto eliminado correctamente');
            },
            onError: () => {
                toast.error('Error en el proceso, inténtelo nuevamente');
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
                toast.success('Código de barras regenerado correctamente');
                // Recargar la página para ver los cambios
                router.reload();
            } else {
                toast.error(result.message || 'Error al regenerar el código de barras');
            }
        } catch {
            toast.error('Error al regenerar el código de barras');
        }
    };

    // Exportar a Excel
    const handleExport = () => {
        if (!almacenExportId) {
            toast.error('❌ Por favor, selecciona un almacén para exportar');
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
            toast.loading('⏳ Preparando exportación...', { duration: 2000 });

            link.click();

            document.body.removeChild(link);

            toast.success('✓ Exportación completada', {
                description: `Se exportaron los productos del almacén ${almacenSeleccionado?.nombre_almacen || 'seleccionado'}`,
            });
        } catch (error) {
            console.error('Error en exportación:', error);
            toast.error('❌ Error al exportar productos');
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
                    toast.success('✓ ¡Importación completada exitosamente!', {
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

                    toast.error('❌ Error en la importación', {
                        description: errorMessage,
                    });
                },
            });
        } catch (error: any) {
            console.error('Error desconocido:', error);
            const errorMessage = error?.message || 'Error desconocido al importar';
            toast.error('❌ Error al procesar la importación: ' + errorMessage);
        }
    };

    // Descargar plantilla
    const downloadTemplate = () => {
        // Crear contenido CSV con las columnas correctas
        const headers = ['nombre_producto', 'categoria', 'precio_compra', 'cantidad', 'marca', 'modelo', 'capacidad'];
        const exampleData = ['Laptop Dell', 'Electrónicos', '1500.00', '10', 'Dell', 'XPS 13', '512GB SSD'];

        let csvContent = headers.join(',') + '\n';
        csvContent += exampleData.join(',') + '\n';
        csvContent += 'Smartphone Samsung,Tecnología,800.00,5,Samsung,Galaxy S23,256GB' + '\n';

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'plantilla-productos.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.info('Plantilla descargada. Recuerda: El código de barras se genera automáticamente.');
    };

    // Aplicar filtros
    const aplicarFiltros = useCallback(() => {
        const params: Record<string, string | boolean> = {};
        if (searchTerm) params.search = searchTerm;
        if (selectedCategoria) params.categoria_id = selectedCategoria;
        if (soloStockBajo) params.stock_bajo = true;
        // Solo agregar parámetros de ordenamiento si son diferentes a los valores por defecto
        if (sort.field && sort.field !== 'nombre_producto') params.sort_field = sort.field;
        if (sort.direction && sort.direction !== 'asc') params.sort_direction = sort.direction;

        router.get(route('productos.index'), params, {
            preserveState: true,
            replace: true,
        });
    }, [searchTerm, selectedCategoria, soloStockBajo, sort.field, sort.direction]);

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

                {/* Panel de Información de Stock */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="flex items-center justify-between rounded-lg bg-blue-100 p-4 dark:bg-blue-900">
                        <div>
                            <h3 className="font-semibold">Total Productos</h3>
                            <p className="text-2xl">{productos.total}</p>
                        </div>
                        <BarChart3 className="text-blue-500" size={32} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-amber-100 p-4 dark:bg-amber-900">
                        <div>
                            <h3 className="font-semibold">Stock Bajo</h3>
                            <p className="text-2xl">{productosConStockBajo.length}</p>
                        </div>
                        <AlertTriangle className="text-amber-500" size={32} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-green-100 p-4 dark:bg-green-900">
                        <div>
                            <h3 className="font-semibold">Valor Total</h3>
                            <p className="text-2xl">${valorTotalInventario.toFixed(2)}</p>
                        </div>
                        <DollarSign className="text-green-500" size={32} />
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-red-100 p-4 dark:bg-red-900">
                        <div>
                            <h3 className="font-semibold">Valor Stock Bajo</h3>
                            <p className="text-2xl">${valorStockBajo.toFixed(2)}</p>
                        </div>
                        <DollarSign className="text-red-500" size={32} />
                    </div>
                </div>

                {/* Controles de Filtro */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Button
                            variant={soloStockBajo ? 'default' : 'outline'}
                            onClick={() => setSoloStockBajo(!soloStockBajo)}
                            className="flex items-center gap-2"
                        >
                            <Filter size={16} />
                            {soloStockBajo ? 'Mostrar Todos' : 'Solo Stock Bajo'}
                        </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {/* Buscador */}
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-500" />
                            <input
                                type="text"
                                placeholder="Buscar productos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="focus:ring-sidebar-accent border-primary rounded-md border px-3 py-2 pl-10 focus:ring-2 focus:outline-none"
                            />
                        </div>

                        {/* Filtro por categoría */}
                        <select
                            value={selectedCategoria}
                            onChange={(e) => setSelectedCategoria(e.target.value)}
                            className="focus:ring-sidebar-accent border-primary rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
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

                        {/* Selector de almacén para exportación */}
                        <select
                            value={almacenExportId}
                            onChange={(e) => setAlmacenExportId(Number(e.target.value))}
                            className="focus:ring-sidebar-accent border-primary rounded-md border px-3 py-2 focus:ring-2 focus:outline-none"
                        >
                            {almacenes.map((almacen) => (
                                <option key={almacen.id} value={almacen.id} className="bg-background">
                                    {almacen.nombre_almacen}
                                </option>
                            ))}
                        </select>

                        {/* Botones de exportación/importación */}
                        <Button variant="outline" className="hover:bg-chart-3 flex cursor-pointer items-center gap-2" onClick={downloadTemplate}>
                            <FileText size={16} />
                            Plantilla
                        </Button>

                        <Button
                            variant="secondary"
                            className="hover:bg-chart-1 flex cursor-pointer items-center gap-2"
                            onClick={() => setShowImportModal(true)}
                        >
                            <Download size={16} />
                            Importar
                        </Button>

                        <Button variant="secondary" className="hover:bg-chart-2 flex cursor-pointer items-center gap-2" onClick={handleExport}>
                            <Upload size={16} />
                            Exportar
                        </Button>
                    </div>
                </div>

                {/* Tabla de Productos */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <Table>
                        <TableCaption>
                            Lista de Productos {soloStockBajo && '(Solo productos con stock bajo)'} - Mostrando {productos.from} a {productos.to} de{' '}
                            {productos.total} productos
                        </TableCaption>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                <TableHead className="w-[200px] cursor-pointer" onClick={() => handleSort('nombre_producto')}>
                                    Nombre {sort.field === 'nombre_producto' && (sort.direction === 'asc' ? '↑' : '↓')}
                                </TableHead>
                                <TableHead>Marca</TableHead>
                                <TableHead>Modelo</TableHead>
                                <TableHead>Capacidad</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('precio_compra_producto')}>
                                    Precio {sort.field === 'precio_compra_producto' && (sort.direction === 'asc' ? '↑' : '↓')}
                                </TableHead>
                                <TableHead className="cursor-pointer" onClick={() => handleSort('cantidad_total')}>
                                    Cantidad {sort.field === 'cantidad_total' && (sort.direction === 'asc' ? '↑' : '↓')}
                                </TableHead>
                                <TableHead>Importe</TableHead>
                                <TableHead>Imagen</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {productosData.map((producto) => {
                                const isStockBajo = producto.stock_bajo;

                                return (
                                    <TableRow
                                        key={producto.id}
                                        className={isStockBajo ? 'animate-pulse border-l-4 border-red-500 bg-red-100 dark:bg-red-950/50' : ''}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Package size={14} className="text-primary shrink-0" />
                                                <div>
                                                    <span className="text-primary font-medium">{producto.nombre_producto}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono uppercase">
                                                {producto.marca_producto || 'Sin marca'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{producto.modelo_producto || 'N/A'}</TableCell>
                                        <TableCell>{producto.capacidad_producto || 'N/A'}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <QrCode size={14} className="shrink-0 text-gray-500" />
                                                <span className="font-mono text-sm">{producto.codigo_producto}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <CopyX size={14} className="shrink-0 text-indigo-500" />
                                                <span>{producto.categoria}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Wallet size={14} className="shrink-0 text-emerald-500" />
                                                <span>${producto.precio_compra_producto.toFixed(2)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Hash size={14} className="shrink-0 text-blue-500" />
                                                <span className={isStockBajo ? 'font-bold text-red-600' : ''}>{producto.cantidad_total}</span>
                                                {isStockBajo && (
                                                    <>
                                                        <div className="group relative">
                                                            <AlertTriangle size={16} className="animate-pulse cursor-help text-red-600" />
                                                            <div className="invisible absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg group-hover:visible">
                                                                <div className="text-center">⚠️ Producto con bajo stock</div>
                                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                                            </div>
                                                        </div>
                                                        <Badge variant="destructive" className="ml-1 animate-pulse">
                                                            Bajo
                                                        </Badge>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <DollarSign size={14} className="shrink-0 text-emerald-500" />
                                                <span>${(producto.precio_compra_producto * producto.cantidad_total).toFixed(2)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {producto.imagen_url ? (
                                                <img
                                                    src={producto.imagen_url}
                                                    alt={producto.nombre_producto}
                                                    className="h-10 w-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
                                                    <Package size={16} className="text-gray-500" />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {/* Botón Detalles */}
                                                <Link href={route('productos.show', { producto: producto.id })}>
                                                    <Button variant="outline" size="sm" className="hover:bg-chart-3 cursor-pointer">
                                                        <Eye size={14} />
                                                    </Button>
                                                </Link>

                                                {/* Botón Editar */}
                                                <Link href={route('productos.edit', { producto: producto.id })}>
                                                    <Button variant="outline" size="sm" className="cursor-pointer hover:bg-blue-600 hover:text-white">
                                                        <Edit3 size={14} />
                                                    </Button>
                                                </Link>

                                                {/* Botón Regenerar Código de Barras */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="cursor-pointer hover:bg-purple-600 hover:text-white"
                                                    onClick={() => regenerarBarcode(producto.id)}
                                                    title="Regenerar código de barras"
                                                >
                                                    <RefreshCw size={14} />
                                                </Button>

                                                {/* Diálogo de Confirmación para Eliminar */}
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="hover:bg-destructive dark:hover:bg-destructive cursor-pointer hover:text-white"
                                                        >
                                                            <Trash2 size={14} />
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
                                <TableCell colSpan={6} className="bg-sidebar-accent">
                                    Total de Productos {soloStockBajo && 'con Stock Bajo'}
                                </TableCell>
                                <TableCell className="bg-sidebar-accent text-center font-bold">
                                    {productosData.reduce((sum, p) => sum + p.cantidad_total, 0)}
                                </TableCell>
                                <TableCell colSpan={4} className="bg-sidebar-accent text-right font-bold">
                                    Valor Total: ${productosData.reduce((sum, p) => sum + p.precio_compra_producto * p.cantidad_total, 0).toFixed(2)}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>

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
                                    {link.label.replace('&laquo;', '«').replace('&raquo;', '»')}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Modal de Importación */}
                <ImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleImport} almacenes={almacenes} />

                <Toaster position="top-center" />
            </div>
        </AppLayout>
    );
}
