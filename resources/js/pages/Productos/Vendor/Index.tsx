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
import { type BreadcrumbItem, type VendedorProductoProps } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Edit3, Eye, FileText, Sheet, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Todos los Productos', href: '/productos' },
    { title: 'Productos Disponibles', href: '#' },
];

export default function VendedorPage({ productos }: { productos: VendedorProductoProps[] }) {
    const deleteProducto = (id: number) => {
        router.delete(route('productos.destroy', { producto: id }), {
            onSuccess: () => toast.success('Producto eliminado correctamente'),
            onError: () => toast.error('Error al eliminar el producto'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Productos Disponibles" />
            <div className="flex flex-col gap-4 p-4">
                {/* Header */}
                <div className="border-sidebar-accent bg-sidebar relative rounded-2xl border border-dashed p-4">
                    <HeadingSmall title="Opciones Generales del Sistema" description="Gestión del Negocio. Listado de Productos disponibles" />
                    <ShoppingBag size={70} color="#d6d3d1" className="absolute right-2 bottom-0 opacity-40" />
                </div>

                <Separator />

                {/* Acciones */}
                <div className="flex justify-end gap-2">
                    <Button variant="outline" className="hover:bg-chart-5 gap-2">
                        <FileText size={16} />
                        Exportar PDF
                    </Button>
                    <Button variant="secondary" className="hover:bg-chart-2 gap-2">
                        <Sheet size={16} />
                        Exportar Excel
                    </Button>
                </div>

                {/* Tabla de Productos */}
                <div className="border-sidebar-border/70 rounded-xl border">
                    <Table>
                        <TableCaption>Listado de Productos Disponibles</TableCaption>
                        <TableHeader>
                            <TableRow className="bg-sidebar-accent">
                                <TableHead>Nombre</TableHead>
                                <TableHead>Marca</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Precio</TableHead>
                                <TableHead>Cantidad</TableHead>
                                <TableHead>Ganancia</TableHead>
                                <TableHead>Imagen</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {productos.map((producto) => (
                                <TableRow key={producto.id}>
                                    <TableCell className="font-medium">{producto.nombre_producto}</TableCell>
                                    <TableCell>{producto.marca_producto || '—'}</TableCell>
                                    <TableCell>{producto.codigo_producto || '—'}</TableCell>
                                    <TableCell>{producto.categoria || '—'}</TableCell>
                                    <TableCell>
                                        ${typeof producto.precio_compra_producto === 'number' ? producto.precio_compra_producto.toFixed(2) : '0.00'}
                                    </TableCell>
                                    <TableCell>{producto.cantidad_producto}</TableCell>
                                    <TableCell>${(producto.precio_compra_producto * producto.cantidad_producto).toFixed(2)}</TableCell>
                                    <TableCell>
                                        {producto.imagen_url ? (
                                            <img
                                                src={producto.imagen_url}
                                                alt={producto.nombre_producto}
                                                className="h-10 w-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            '—'
                                        )}
                                    </TableCell>
                                    <TableCell className="flex justify-end gap-1">
                                        <Link href={route('productos.show', { producto: producto.id })}>
                                            <Button variant="outline" size="icon" className="hover:bg-chart-3">
                                                <Eye size={16} />
                                            </Button>
                                        </Link>
                                        <Link href={route('productos.edit', { producto: producto.id })}>
                                            <Button variant="outline" size="icon" className="hover:bg-blue-600 hover:text-white">
                                                <Edit3 size={16} />
                                            </Button>
                                        </Link>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="outline" size="icon" className="hover:bg-destructive hover:text-white">
                                                    <Trash2 size={16} />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                                                    <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => deleteProducto(producto.id)}
                                                        className="bg-destructive hover:bg-destructive/90"
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
                                <TableCell colSpan={8}>Total de Productos</TableCell>
                                <TableCell className="text-center font-bold">{productos.length}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
