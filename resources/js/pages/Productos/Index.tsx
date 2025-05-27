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
import { ProductoProps, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Edit3, FileText, Package2, Sheet, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

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
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    {/* Contenido principal */}
                    <HeadingSmall
                        title="Opciones Generales del Sistema"
                        description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento. Listado de los Productos"
                    />
                    {/* Ícono semitransparente */}
                    <Package2
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>

                <Separator className="col-span-4" />

                {/* Acciones */}
                <div className="flex justify-end gap-2">
                    {/* Botón Exportar PDF */}
                    <Link href="#">
                        <Button variant="outline" className="hover:bg-chart-3 flex cursor-pointer items-center gap-2">
                            <FileText size={16} />
                            Exportar PDF
                        </Button>
                    </Link>

                    {/* Boton Importar Excel */}
                    <Link href="#">
                        <Button variant="secondary" className="hover:bg-chart-1 flex cursor-pointer items-center gap-2">
                            <Sheet size={16} />
                            Importar Excel
                        </Button>
                    </Link>

                    {/* Botón Exportar Excel */}
                    <Link href="#">
                        <Button variant="secondary" className="hover:bg-chart-2 flex cursor-pointer items-center gap-2">
                            <Sheet size={16} />
                            Exportar Excel
                        </Button>
                    </Link>
                </div>

                {/* Tabla de Productos */}
                <div className="border-sidebar-border/70 dark:border-sidebar-border relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border md:min-h-min">
                    <Table>
                        <TableCaption>Lista de Productos</TableCaption>
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
                            {productos.map((producto) => (
                                <TableRow key={producto.id}>
                                    <TableCell>{producto.nombre_producto}</TableCell>
                                    <TableCell>{producto.marca_producto || 'Sin marca'}</TableCell>
                                    <TableCell>{producto.codigo_producto || 'Sin código'}</TableCell>
                                    <TableCell>{producto.categoria || 'Sin categoría'}</TableCell>
                                    <TableCell>
                                        {typeof producto.precio_compra_producto === 'number'
                                            ? `$${producto.precio_compra_producto.toFixed(2)}`
                                            : 'Sin precio'}
                                    </TableCell>
                                    <TableCell>{producto.cantidad_producto}</TableCell>
                                    <TableCell>$ {(producto.precio_compra_producto * producto.cantidad_producto).toFixed(2)}</TableCell>
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
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={8} className="bg-gray-700">
                                    Total de Productos
                                </TableCell>
                                <TableCell className="bg-gray-500 text-center">{productos.length}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
