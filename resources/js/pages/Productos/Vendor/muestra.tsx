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
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { VendedorProductoProps, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Edit3, Eye, FileText, Sheet, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resumen General',
        href: '/dashboard',
    },
    {
        title: 'Todos los Productos',
        href: '/productos',
    },
    {
        title: 'Productos Disponibles',
        href: '#',
    },
];

export default function VendedorPage({ productos }: { productos: VendedorProductoProps[] }) {
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

    // Calcular total de stock y valoración
    const totalStock = productos.reduce((sum, producto) => sum + producto.stock_total, 0);
    const totalValoracion = productos.reduce((sum, producto) => sum + producto.precio_venta * producto.stock_total, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Productos Disponibles" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Gestión de Productos para Vendedores"
                        description="Listado completo de productos disponibles en tus almacenes asignados"
                    />
                    <ShoppingBag
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator className="col-span-4" />

                {/* Acciones */}
                <div className="flex justify-end gap-2">
                    <Button variant="outline" className="hover:bg-chart-5 flex cursor-pointer items-center gap-2">
                        <FileText size={16} />
                        Exportar PDF
                    </Button>
                    <Button variant="secondary" className="hover:bg-chart-2 flex cursor-pointer items-center gap-2">
                        <Sheet size={16} />
                        Exportar Excel
                    </Button>
                </div>

                {/* Tabla de Productos */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <Table>
                        <TableCaption>Productos disponibles en tus almacenes</TableCaption>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent hover:bg-sidebar-accent">
                                <TableHead>Producto</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Precio (Compra/Venta)</TableHead>
                                <TableHead>Stock Total</TableHead>
                                <TableHead>Almacenes</TableHead>
                                <TableHead>Imagen</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {productos.map((producto) => (
                                <TableRow key={producto.id}>
                                    <TableCell className="font-medium">{producto.nombre_producto}</TableCell>
                                    <TableCell>{producto.codigo_producto || 'N/A'}</TableCell>
                                    <TableCell>{producto.categoria?.nombre_categoria || 'Sin categoría'}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-500">Compra: ${producto.precio_compra.toFixed(2)}</span>
                                            <span className={producto.es_precio_personalizado ? 'font-bold text-green-600' : ''}>
                                                Venta: ${producto.precio_venta.toFixed(2)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{producto.stock_total}</TableCell>
                                    <TableCell>
                                        <div className="max-w-[200px] truncate">{producto.almacenes.map((a) => a.nombre_almacen).join(', ')}</div>
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
                                    <TableCell className="flex justify-end gap-1">
                                        <Link href={route('productos.show', { producto: producto.id })}>
                                            <Button variant="outline" size="icon" className="hover:bg-blue-100">
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        {producto.permisos.editar_precio && (
                                            <Link href={route('productos.edit', { producto: producto.id })}>
                                                <Button variant="outline" size="icon" className="hover:bg-green-100">
                                                    <Edit3 className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                        )}
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="icon" className="hover:bg-red-100">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta acción no se puede deshacer. El producto será removido permanentemente.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => deleteProducto(producto.id)}
                                                        className="bg-red-600 hover:bg-red-700"
                                                    >
                                                        Eliminar
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={4}>Total general</TableCell>
                                <TableCell>{totalStock} unidades</TableCell>
                                <TableCell colSpan={2}>Valoración total:</TableCell>
                                <TableCell className="text-right font-bold">${totalValoracion.toFixed(2)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
