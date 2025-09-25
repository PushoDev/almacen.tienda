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
import { ProductoProps, type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
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
    Trash2,
    Upload,
    Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast, Toaster } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Productos',
        href: '/productos',
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
    const [almacenId, setAlmacenId] = useState<number>(1);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (file: File) => {
        if (file.type.includes('excel') || file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            setSelectedFile(file);
        } else {
            toast.error('Por favor, selecciona un archivo Excel válido (.xlsx o .xls)');
        }
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            toast.error('Por favor, selecciona un archivo');
            return;
        }
        onImport(selectedFile, almacenId);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-800">
                <h2 className="mb-4 text-lg font-semibold">Importar Productos desde Excel</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Selector de almacén */}
                    <div>
                        <label className="mb-2 block text-sm font-medium">Almacén de destino</label>
                        <select value={almacenId} onChange={(e) => setAlmacenId(Number(e.target.value))} className="w-full rounded-md border p-2">
                            {almacenes.map((almacen) => (
                                <option key={almacen.id} value={almacen.id} className="bg-background">
                                    {almacen.nombre_almacen}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Área de arrastrar y soltar */}
                    <div
                        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('file-input')?.click()}
                    >
                        <CloudUpload className="mx-auto mb-2" size={24} />
                        <p className="text-sm text-gray-600">
                            {selectedFile
                                ? `Archivo seleccionado: ${selectedFile.name}`
                                : 'Arrastra un archivo Excel aquí o haz clic para seleccionar'}
                        </p>
                        <input
                            id="file-input"
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelect(file);
                            }}
                        />
                    </div>

                    {/* Información del formato requerido */}
                    <div className="border-sidebar-accent rounded border p-3 text-sm">
                        <p className="mb-1 font-medium">Formato requerido:</p>
                        <ul className="list-inside list-disc space-y-1">
                            <li>Columnas: nombre_producto, marca, codigo, categoria, precio_compra, cantidad</li>
                            <li>Formato: .xlsx o .xls</li>
                            <li>Tamaño máximo: 2MB</li>
                        </ul>
                    </div>

                    {/* Botones */}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" className="cursor-pointer" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={!selectedFile} className="cursor-pointer bg-green-600 hover:bg-green-700">
                            <Upload size={16} className="mr-2" />
                            Importar
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function ProductosPage({
    productos,
    almacenes = [],
}: {
    productos: ProductoProps[];
    almacenes?: { id: number; nombre_almacen: string }[];
}) {
    console.log('Productos recibidos:', productos);

    // Estados para gestión de stock
    const [umbralStockBajo, setUmbralStockBajo] = useState(5);
    const [soloStockBajo, setSoloStockBajo] = useState(false);
    const [filtroTipo, setFiltroTipo] = useState<string>('');
    const [busqueda, setBusqueda] = useState<string>('');

    // Estados para importación/exportación
    const [almacenExportId, setAlmacenExportId] = useState<number>(1);
    const [showImportModal, setShowImportModal] = useState(false);
    const { data, setData, post, processing } = useForm({
        file: null as File | null,
        almacen_id: 1,
    });

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 25;

    // Categorías únicas
    const categoriasUnicas = [...new Set(productos.map((producto) => producto.categoria))];

    // Calcular estadísticas
    const productosConStockBajo = productos.filter((p) => p.cantidad_total <= umbralStockBajo);
    const valorTotalInventario = productos.reduce((sum, p) => sum + p.precio_compra_producto * p.cantidad_total, 0);
    const valorStockBajo = productosConStockBajo.reduce((sum, p) => sum + p.precio_compra_producto * p.cantidad_total, 0);

    // Filtrar productos
    const productosFiltrados = productos.filter((producto) => {
        const matchesCategoria = !filtroTipo || producto.categoria === filtroTipo;
        const matchesBusqueda = producto.nombre_producto.toLowerCase().includes(busqueda.toLowerCase());
        const matchesStockFilter = !soloStockBajo || producto.cantidad_total <= umbralStockBajo;

        return matchesCategoria && matchesBusqueda && matchesStockFilter;
    });

    // Paginación
    const indiceUltimoElemento = paginaActual * elementosPorPagina;
    const indicePrimerElemento = indiceUltimoElemento - elementosPorPagina;
    const productosAmostrar = productosFiltrados.slice(indicePrimerElemento, indiceUltimoElemento);
    const totalPaginas = Math.ceil(productosFiltrados.length / elementosPorPagina);

    // Resetear paginación cuando cambian los filtros
    useEffect(() => {
        setPaginaActual(1);
    }, [filtroTipo, busqueda, soloStockBajo, umbralStockBajo]);

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

    // Exportar a Excel
    const handleExport = () => {
        // Crear URL con parámetros
        const url = route('productos.export', { almacen_id: almacenExportId });

        // Crear un enlace temporal y hacer clic
        const link = document.createElement('a');
        link.href = url;
        link.download = `productos-almacen-${almacenExportId}-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Exportación iniciada');
    };

    // Importar desde Excel
    const handleImport = (file: File, almacenId: number) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('almacen_id', almacenId.toString());

        router.post(route('productos.import'), formData, {
            forceFormData: true,
            onSuccess: () => {
                toast.success('Productos importados correctamente');
                setShowImportModal(false);
            },
            onError: (errors) => {
                toast.error('Error al importar: ' + (errors.file || errors.almacen_id || 'Error desconocido'));
            },
        });
    };

    // Descargar plantilla
    const downloadTemplate = () => {
        toast.info('Función de plantilla en desarrollo');
        // Implementar cuando tengas la ruta para descargar plantilla
        // router.get(route('productos.template'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Productos" />
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento. Listado de los Productos"
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
                            <p className="text-2xl">{productos.length}</p>
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
                        <span>Umbral stock bajo:</span>
                        <select value={umbralStockBajo} onChange={(e) => setUmbralStockBajo(Number(e.target.value))} className="rounded border p-1">
                            <option value={3} className="bg-background">
                                3 unidades
                            </option>
                            <option value={5} className="bg-background">
                                5 unidades
                            </option>
                            <option value={10} className="bg-background">
                                10 unidades
                            </option>
                            <option value={15} className="bg-background">
                                15 unidades
                            </option>
                        </select>

                        <Button
                            variant={soloStockBajo ? 'default' : 'outline'}
                            onClick={() => setSoloStockBajo(!soloStockBajo)}
                            className="flex items-center gap-2"
                        >
                            <Filter size={16} />
                            {soloStockBajo ? 'Mostrar Todos' : 'Solo Stock Bajo'}
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        {/* Buscador */}
                        <input
                            type="text"
                            placeholder="Buscar productos..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="focus:ring-sidebar-accent border-primary rounded-md border px-3 py-1 focus:ring-2 focus:outline-none"
                        />

                        {/* Filtro por categoría*/}
                        <select
                            id="filtro-tipo"
                            value={filtroTipo}
                            onChange={(e) => setFiltroTipo(e.target.value)}
                            className="focus:ring-sidebar-accent border-primary rounded-md border px-3 py-1 focus:ring-2 focus:outline-none"
                        >
                            <option className="bg-background" value="">
                                Todas las categorías
                            </option>
                            {categoriasUnicas.map((categoria, index) => (
                                <option key={index} className="bg-background" value={categoria}>
                                    {categoria} ({productos.filter((p) => p.categoria === categoria).length})
                                </option>
                            ))}
                        </select>

                        {/* Selector de almacén para exportación */}
                        <select
                            value={almacenExportId}
                            onChange={(e) => setAlmacenExportId(Number(e.target.value))}
                            className="focus:ring-sidebar-accent border-primary rounded-md border px-3 py-1 focus:ring-2 focus:outline-none"
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

                {/* Resto del código de la tabla (se mantiene igual) */}
                {/* Tabla de Productos */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <Table>
                        <TableCaption>Lista de Productos {soloStockBajo && '(Solo productos con stock bajo)'}</TableCaption>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                <TableHead className="w-[100px]">Nombre</TableHead>
                                <TableHead>Marca</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Precio</TableHead>
                                <TableHead>Cantidad</TableHead>
                                <TableHead>Importe</TableHead>
                                <TableHead>Imagen</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {productosAmostrar.map((producto) => {
                                const isStockBajo = producto.cantidad_total <= umbralStockBajo;

                                return (
                                    <TableRow key={producto.id} className={isStockBajo ? 'animate-pulse bg-red-50 dark:bg-red-950/30' : ''}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Package size={14} className="text-primary shrink-0" />
                                                <span className="text-primary truncate font-medium">{producto.nombre_producto}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="font-mono uppercase">
                                                    {producto.marca_producto || 'Sin marca'}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <QrCode size={14} className="shrink-0 text-gray-500" />
                                                <span>{producto.codigo_producto || 'Sin código'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <CopyX size={14} className="shrink-0 text-indigo-500" />
                                                <span>{producto.categoria || 'Sin categoría'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Wallet size={14} className="shrink-0 text-emerald-500" />
                                                <span>
                                                    {typeof producto.precio_compra_producto === 'number'
                                                        ? `$${producto.precio_compra_producto.toFixed(2)}`
                                                        : 'Sin precio'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Hash size={14} className="shrink-0 text-blue-500" />
                                                <span className={isStockBajo ? 'font-bold text-red-600' : ''}>{producto.cantidad_total}</span>
                                                {isStockBajo && (
                                                    <Badge variant="destructive" className="ml-2 animate-pulse">
                                                        <AlertTriangle size={12} className="mr-1" />
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <DollarSign size={14} className="shrink-0 text-emerald-500" />
                                                <span>$ {(producto.precio_compra_producto * producto.cantidad_total).toFixed(2)}</span>
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
                                                'Sin imagen'
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {/* Botón Detalles */}
                                            <Link href={route('productos.show', { producto: producto.id })}>
                                                <Button variant="outline" className="hover:bg-chart-3 cursor-pointer hover:text-white">
                                                    <Eye />
                                                </Button>
                                            </Link>
                                            {/* Botón Editar */}
                                            <Link href={route('productos.edit', { producto: producto.id })}>
                                                <Button
                                                    variant="outline"
                                                    className="cursor-pointer hover:bg-blue-900 hover:text-white dark:hover:bg-blue-700"
                                                >
                                                    <Edit3 />
                                                </Button>
                                            </Link>

                                            {/* Diálogo de Confirmación para Eliminar */}
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        className="hover:bg-destructive dark:hover:bg-destructive cursor-pointer hover:text-white"
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="text-center">Atención</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            ¿Estás seguro de eliminar este producto? Esta acción es irreversible.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogAction
                                                            onClick={() => deleteProducto(producto.id)}
                                                            className="bg-destructive cursor-pointer hover:bg-red-300"
                                                        >
                                                            Aceptar
                                                        </AlertDialogAction>
                                                        <AlertDialogCancel className="cursor-pointer text-white hover:bg-emerald-300 hover:text-emerald-950 dark:hover:bg-emerald-300 dark:hover:text-emerald-950">
                                                            Cancelar
                                                        </AlertDialogCancel>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={5} className="bg-gray-700">
                                    Total de Productos {soloStockBajo && 'con Stock Bajo'}
                                </TableCell>
                                <TableCell className="bg-gray-700 text-center font-bold">{productosFiltrados.length}</TableCell>
                                <TableCell colSpan={3} className="bg-gray-700 text-right">
                                    Valor Total: $
                                    {productosFiltrados.reduce((sum, p) => sum + p.precio_compra_producto * p.cantidad_total, 0).toFixed(2)}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>

                {/* Controles de Paginación */}
                <div className="mt-4 flex items-center justify-between">
                    <Button onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))} disabled={paginaActual === 1}>
                        Anterior
                    </Button>
                    <span>
                        Página {paginaActual} de {totalPaginas} - {productosFiltrados.length} productos
                    </span>
                    <Button onClick={() => setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))} disabled={paginaActual === totalPaginas}>
                        Siguiente
                    </Button>
                </div>

                {/* Modal de Importación */}
                <ImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} onImport={handleImport} almacenes={almacenes} />

                <Toaster position="top-center" />
            </div>
        </AppLayout>
    );
}
