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
import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    BarChart3,
    CopyX,
    DollarSign,
    Edit3,
    Eye,
    FileText,
    Filter,
    Hash,
    Package,
    Package2,
    QrCode,
    Sheet,
    Trash2,
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

export default function ProductosPage({ productos }: { productos: ProductoProps[] }) {
    console.log('Productos recibidos:', productos);

    // Estados para gestión de stock
    const [umbralStockBajo, setUmbralStockBajo] = useState(5);
    const [soloStockBajo, setSoloStockBajo] = useState(false);
    const [filtroTipo, setFiltroTipo] = useState<string>('');
    const [busqueda, setBusqueda] = useState<string>('');

    // Paginación
    const [paginaActual, setPaginaActual] = useState(1);
    const elementosPorPagina = 25;

    // Categorías únicas
    const categoriasUnicas = [...new Set(productos.map((producto) => producto.categoria))];

    // Calcular estadísticas - CAMBIO: usar cantidad_total en lugar de cantidad_producto
    const productosConStockBajo = productos.filter((p) => p.cantidad_total <= umbralStockBajo);
    const valorTotalInventario = productos.reduce((sum, p) => sum + p.precio_compra_producto * p.cantidad_total, 0);
    const valorStockBajo = productosConStockBajo.reduce((sum, p) => sum + p.precio_compra_producto * p.cantidad_total, 0);

    // Filtrar productos - CAMBIO: usar cantidad_total en lugar de cantidad_producto
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
                            <option value={3}>3 unidades</option>
                            <option value={5}>5 unidades</option>
                            <option value={10}>10 unidades</option>
                            <option value={15}>15 unidades</option>
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
                            <option className="bg-background text-sidebar-accent" value="">
                                Todas las categorías
                            </option>
                            {categoriasUnicas.map((categoria, index) => (
                                <option key={index} className="bg-background text-sidebar-accent" value={categoria}>
                                    {categoria} ({productos.filter((p) => p.categoria === categoria).length})
                                </option>
                            ))}
                        </select>

                        {/* Botones de exportación */}
                        <Link href="#">
                            <Button variant="outline" className="hover:bg-chart-3 flex cursor-pointer items-center gap-2">
                                <FileText size={16} />
                                PDF
                            </Button>
                        </Link>

                        <Link href="#">
                            <Button variant="secondary" className="hover:bg-chart-1 flex cursor-pointer items-center gap-2">
                                <Sheet size={16} />
                                Importar
                            </Button>
                        </Link>

                        <Link href="#">
                            <Button variant="secondary" className="hover:bg-chart-2 flex cursor-pointer items-center gap-2">
                                <Sheet size={16} />
                                Exportar
                            </Button>
                        </Link>
                    </div>
                </div>

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
                                // CAMBIO: usar cantidad_total en lugar de cantidad_producto
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
                                                {/* CAMBIO: usar cantidad_total en lugar de cantidad_producto */}
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
                                                {/* CAMBIO: usar cantidad_total en lugar de cantidad_producto */}
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
                                    Valor Total: ${/* CAMBIO: usar cantidad_total en lugar de cantidad_producto */}
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
                <Toaster position="top-center" />
            </div>
        </AppLayout>
    );
}
