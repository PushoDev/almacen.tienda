import HeadingSmall from '@/components/heading-small';
import { ConfirmarImportacionDialog } from '@/components/importaciones/confirmar-importacion-dialog';
import { ImportacionRepetidaDialog } from '@/components/importaciones/importacion-repetida-dialog';
import { type AvisoImportacionRepetida } from '@/components/importaciones/tipos';
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
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import AppLayout from '@/layouts/app-layout';
import { sileo } from '@/lib/sileo';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Info, Plus, PlusSquare, Save, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DataGrid, SelectColumn, renderTextEditor, type Column, type DataGridHandle } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';

type CampoHoja = 'nombre_producto' | 'categoria' | 'marca' | 'modelo' | 'capacidad' | 'color' | 'precio_compra' | 'cantidad' | 'codigo_barras';
type FilaServidor = Record<CampoHoja, string>;
type FilaHoja = FilaServidor & { id: number };

interface Props {
    borrador: { id: number; nombre_archivo: string; almacen: string | null; creado: string };
    filas: FilaServidor[];
    maxFilas: number;
}

const CAMPOS: { clave: CampoHoja; titulo: string; ancho: number; derecha?: boolean }[] = [
    { clave: 'nombre_producto', titulo: 'nombre_producto', ancho: 280 },
    { clave: 'categoria', titulo: 'categoria', ancho: 140 },
    { clave: 'marca', titulo: 'marca', ancho: 130 },
    { clave: 'modelo', titulo: 'modelo', ancho: 130 },
    { clave: 'capacidad', titulo: 'capacidad', ancho: 110 },
    { clave: 'color', titulo: 'color', ancho: 100 },
    { clave: 'precio_compra', titulo: 'precio_compra', ancho: 120, derecha: true },
    { clave: 'cantidad', titulo: 'cantidad', ancho: 100, derecha: true },
    { clave: 'codigo_barras', titulo: 'codigo_barras', ancho: 170 },
];

const LETRAS = 'ABCDEFGHIJ';
const esCampo = (clave: string): clave is CampoHoja => CAMPOS.some((campo) => campo.clave === clave);
const dinero = (valor: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(valor);

/** Igual que ProductoImport::normalizarCantidad (el servidor es la autoridad; esto solo adelanta el estado). */
function normalizarCantidad(valor: string): number {
    const numero = parseFloat(valor.trim());
    return Number.isNaN(numero) ? 0 : Math.trunc(numero);
}

/** Igual que ProductoImport::normalizarPrecio: acepta "45.00", "45,00", "$45", "1,234.56", "1.234,56". */
function normalizarPrecio(valor: string): number | null {
    const texto = valor.trim();
    if (texto === '') return null;
    if (!Number.isNaN(Number(texto))) return Number(texto);

    let limpio = texto.replace(/[^\d,.]/g, '');
    if (limpio === '') return null;

    const hayComa = limpio.includes(',');
    const hayPunto = limpio.includes('.');
    if (hayComa && hayPunto) {
        limpio = limpio.lastIndexOf(',') > limpio.lastIndexOf('.') ? limpio.replace(/\./g, '').replace(',', '.') : limpio.replace(/,/g, '');
    } else if (hayComa) {
        const partes = limpio.split(',');
        limpio = partes.length === 2 && partes[1].length <= 2 ? `${partes[0]}.${partes[1]}` : limpio.replace(/,/g, '');
    }

    return Number.isNaN(Number(limpio)) ? null : Number(limpio);
}

interface Evaluacion {
    estado: 'vacia' | 'ok' | 'solo_catalogo' | 'error';
    mensaje: string;
    cantidad: number;
    precio: number | null;
}

/** Mismas reglas que ProductoImport::model(): lo que aquí sale en rojo, el servidor lo omite con ese motivo. */
function evaluarFila(fila: FilaServidor): Evaluacion {
    const cantidad = normalizarCantidad(fila.cantidad);
    const precio = normalizarPrecio(fila.precio_compra);

    if (CAMPOS.every((campo) => fila[campo.clave].trim() === '')) return { estado: 'vacia', mensaje: '', cantidad: 0, precio: null };
    if (fila.nombre_producto.trim() === '') return { estado: 'error', mensaje: 'Falta el nombre del producto', cantidad, precio };
    if (cantidad < 0) return { estado: 'error', mensaje: 'La cantidad no puede ser negativa', cantidad, precio };
    if (precio !== null && precio < 0) return { estado: 'error', mensaje: 'El precio de compra no puede ser negativo', cantidad, precio };
    if (precio === null && cantidad > 0) {
        return { estado: 'error', mensaje: 'Falta el precio de compra o no es válido (obligatorio con unidades)', cantidad, precio };
    }
    if (cantidad === 0) return { estado: 'solo_catalogo', mensaje: 'Sin stock: queda registrado en el catálogo como historial', cantidad, precio };

    return { estado: 'ok', mensaje: `Se creará un lote de ${cantidad} unidad${cantidad === 1 ? '' : 'es'} a ${dinero(precio ?? 0)}`, cantidad, precio };
}

const breadcrumbs = (): BreadcrumbItem[] => [
    { title: 'Resumen General', href: '/dashboard' },
    { title: 'Productos', href: '/listado-productos' },
    { title: 'Historial de importaciones', href: route('importaciones-productos.index') },
    { title: 'Revisar importación', href: '#' },
];

export default function Revisar({ borrador, filas: filasIniciales, maxFilas }: Props) {
    const contadorIds = useRef(0);
    const gridRef = useRef<DataGridHandle>(null);
    const nuevaFila = (valores: Partial<FilaServidor> = {}): FilaHoja => ({
        nombre_producto: '',
        categoria: '',
        marca: '',
        modelo: '',
        capacidad: '',
        color: '',
        precio_compra: '',
        cantidad: '',
        codigo_barras: '',
        ...valores,
        id: ++contadorIds.current,
    });

    const [filas, setFilas] = useState<FilaHoja[]>(() => filasIniciales.map((fila) => nuevaFila(fila)));
    const [seleccion, setSeleccion] = useState<ReadonlySet<number>>(() => new Set());
    const [activa, setActiva] = useState<{ rowIdx: number; clave: CampoHoja | null }>({ rowIdx: -1, clave: null });
    const [sinGuardar, setSinGuardar] = useState(false);
    const [confirmando, setConfirmando] = useState(false);
    const [descartando, setDescartando] = useState(false);
    const [enviando, setEnviando] = useState(false);
    const [avisoRepetido, setAvisoRepetido] = useState<AvisoImportacionRepetida | null>(null);

    const resumen = useMemo(() => {
        const acumulado = { ok: 0, soloCatalogo: 0, errores: 0, unidades: 0, valor: 0 };
        filas.forEach((fila) => {
            const evaluacion = evaluarFila(fila);
            if (evaluacion.estado === 'ok') {
                acumulado.ok++;
                acumulado.unidades += evaluacion.cantidad;
                acumulado.valor += evaluacion.cantidad * (evaluacion.precio ?? 0);
            } else if (evaluacion.estado === 'solo_catalogo') {
                acumulado.soloCatalogo++;
            } else if (evaluacion.estado === 'error') {
                acumulado.errores++;
            }
        });
        return acumulado;
    }, [filas]);

    // Avisa antes de cerrar la pestaña con ediciones sin guardar.
    useEffect(() => {
        if (!sinGuardar) return;
        const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault();
        window.addEventListener('beforeunload', avisar);
        return () => window.removeEventListener('beforeunload', avisar);
    }, [sinGuardar]);

    const actualizarCelda = (rowIdx: number, clave: CampoHoja, valor: string) => {
        setFilas((previas) => previas.map((fila, indice) => (indice === rowIdx ? { ...fila, [clave]: valor } : fila)));
        setSinGuardar(true);
    };

    const agregarFilas = (cantidad: number) => {
        if (filas.length + cantidad > maxFilas) {
            sileo.warning({ title: 'Límite de filas', description: `Una importación admite hasta ${maxFilas.toLocaleString('es-ES')} filas.` });
            return;
        }
        const nuevas = Array.from({ length: cantidad }, () => nuevaFila());
        setFilas((previas) => [...previas, ...nuevas]);
        setSinGuardar(true);
        setTimeout(() => gridRef.current?.scrollToCell({ rowIdx: filas.length + cantidad - 1 }), 0);
    };

    const eliminarSeleccionadas = () => {
        setFilas((previas) => previas.filter((fila) => !seleccion.has(fila.id)));
        setSeleccion(new Set());
        setSinGuardar(true);
    };

    /** Pegar desde Excel: un rango (filas y columnas separadas por tabulaciones) desde la celda activa; crea las filas que falten. */
    const alPegar = (evento: React.ClipboardEvent<HTMLDivElement>) => {
        const destino = evento.target as HTMLElement;
        if (destino.tagName === 'INPUT' || destino.tagName === 'TEXTAREA') return; // editando: se pega normal
        if (activa.clave === null || activa.rowIdx < 0) return;

        const texto = evento.clipboardData.getData('text/plain');
        if (!texto) return;
        evento.preventDefault();
        evento.stopPropagation();

        const bloque = texto
            .replace(/\r\n?/g, '\n')
            .replace(/\n$/, '')
            .split('\n')
            .map((linea) => linea.split('\t'));
        const columnaInicial = CAMPOS.findIndex((campo) => campo.clave === activa.clave);
        const copia = [...filas];

        bloque.forEach((celdas, desplazamiento) => {
            const indice = activa.rowIdx + desplazamiento;
            if (indice >= maxFilas) return;
            while (copia.length <= indice) copia.push(nuevaFila());

            const actualizada = { ...copia[indice] };
            celdas.forEach((valor, columna) => {
                const campo = CAMPOS[columnaInicial + columna];
                if (campo) actualizada[campo.clave] = valor.trim();
            });
            copia[indice] = actualizada;
        });

        setFilas(copia);
        setSinGuardar(true);
    };

    const filasParaEnviar = (): FilaServidor[] => filas.map((fila) => Object.fromEntries(CAMPOS.map((campo) => [campo.clave, fila[campo.clave]])) as FilaServidor);

    const mostrarErrores = (errores: Record<string, string>) => {
        const primero = Object.values(errores)[0] ?? 'Ocurrió un error.';
        sileo.error({ title: 'No se pudo completar', description: primero });
    };

    const guardarBorrador = () => {
        router.put(
            route('importaciones-borradores.guardar', borrador.id),
            { filas: filasParaEnviar() },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setSinGuardar(false);
                    sileo.success({ title: 'Borrador guardado', description: 'Puedes retomarlo después desde el historial.' });
                },
                onError: mostrarErrores,
            },
        );
    };

    const confirmar = (confirmarRepetido: boolean) => {
        setEnviando(true);
        router.post(
            route('importaciones-borradores.confirmar', borrador.id),
            { filas: filasParaEnviar(), confirmar_repetido: confirmarRepetido },
            {
                preserveState: true,
                onSuccess: (pagina) => {
                    const flash = pagina.props.flash as { importacion_repetida?: AvisoImportacionRepetida | null } | undefined;
                    if (flash?.importacion_repetida) setAvisoRepetido(flash.importacion_repetida);
                },
                onError: (errores) => {
                    setConfirmando(false);
                    mostrarErrores(errores);
                },
                onFinish: () => setEnviando(false),
            },
        );
    };

    const descartar = () => router.delete(route('importaciones-borradores.descartar', borrador.id));

    const columnas = useMemo<readonly Column<FilaHoja>[]>(
        () => [
            SelectColumn,
            {
                key: '__numero',
                name: '',
                width: 46,
                frozen: true,
                resizable: false,
                headerCellClass: 'celda-numero-fila',
                cellClass: 'celda-numero-fila',
                renderCell: ({ rowIdx }) => rowIdx + 2,
            },
            {
                key: '__estado',
                name: '',
                width: 36,
                frozen: true,
                resizable: false,
                renderCell: ({ row }) => {
                    const { estado, mensaje } = evaluarFila(row);
                    if (estado === 'ok') return <CheckCircle2 aria-label={mensaje} className="h-4 w-4 text-emerald-600" />;
                    if (estado === 'solo_catalogo') return <Info aria-label={mensaje} className="h-4 w-4 text-blue-600" />;
                    if (estado === 'error') return <AlertTriangle aria-label={mensaje} className="h-4 w-4 text-red-600" />;
                    return null;
                },
            },
            ...CAMPOS.map<Column<FilaHoja>>((campo, indice) => ({
                key: campo.clave,
                name: campo.titulo,
                width: campo.ancho,
                resizable: true,
                renderEditCell: renderTextEditor,
                cellClass: campo.derecha ? 'celda-derecha' : undefined,
                renderHeaderCell: () => (
                    <div className="flex h-full flex-col">
                        <div className="border-b text-center text-[10px] leading-4" style={{ borderColor: 'var(--hoja-linea)', color: 'var(--hoja-texto-suave)' }}>
                            {LETRAS[indice]}
                        </div>
                        <div className="flex flex-1 items-center px-2">{campo.titulo}</div>
                    </div>
                ),
            })),
            {
                key: '__observacion',
                name: 'Observación',
                width: 380,
                resizable: true,
                renderHeaderCell: () => (
                    <div className="flex h-full flex-col">
                        <div className="border-b text-center text-[10px] leading-4" style={{ borderColor: 'var(--hoja-linea)', color: 'var(--hoja-texto-suave)' }}>
                            {LETRAS[CAMPOS.length]}
                        </div>
                        <div className="flex flex-1 items-center px-2">Observación</div>
                    </div>
                ),
                renderCell: ({ row }) => {
                    const { estado, mensaje } = evaluarFila(row);
                    const color = estado === 'error' ? 'text-red-600 dark:text-red-400' : estado === 'solo_catalogo' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground';
                    return <span className={color}>{mensaje}</span>;
                },
            },
        ],
        [],
    );

    const filasValidas = resumen.ok + resumen.soloCatalogo;
    const nombreCelda = activa.clave !== null && activa.rowIdx >= 0 ? `${LETRAS[CAMPOS.findIndex((campo) => campo.clave === activa.clave)]}${activa.rowIdx + 2}` : '';

    return (
        <AppLayout breadcrumbs={breadcrumbs()}>
            <Head title="Revisar importación" />
            <div className="animate__animated animate__fadeIn flex h-full min-w-0 flex-1 flex-col gap-3 rounded-xl p-4">
                <div className="bg-sidebar border-sidebar-accent relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <HeadingSmall
                        title="Revisar importación"
                        description="Revisa y corrige los datos como en una hoja de Excel. Nada se guarda en el inventario hasta que confirmes."
                    />
                    <FileSpreadsheet
                        size={70}
                        color="#d6d3d1"
                        className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-5] transform animate-pulse opacity-40"
                    />
                </div>
                <Separator className="col-span-4" />

                {/* `contain: inline-size`: el ancho natural de las columnas no debe ensanchar el layout; la hoja hace su propio scroll horizontal */}
                <div className="hoja-excel w-full min-w-0 overflow-hidden rounded-lg border shadow-lg" style={{ borderColor: 'var(--hoja-linea)', contain: 'inline-size' }}>
                    {/* Barra de título, verde Excel */}
                    <div className="flex items-center justify-between gap-3 px-4 py-2 text-white" style={{ background: 'var(--hoja-verde)' }}>
                        <div className="flex min-w-0 items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 shrink-0" />
                            <span className="truncate text-sm font-semibold">{borrador.nombre_archivo}</span>
                            <span className="hidden text-sm opacity-80 sm:inline">— Revisión antes de importar</span>
                        </div>
                        <span className="shrink-0 rounded bg-white/20 px-2 py-0.5 text-xs">Almacén: {borrador.almacen ?? '—'}</span>
                    </div>

                    {/* Cinta de opciones */}
                    <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5" style={{ background: 'var(--hoja-gris)', borderColor: 'var(--hoja-linea)' }}>
                        <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => agregarFilas(1)}>
                            <Plus className="mr-1 h-4 w-4" />
                            Agregar fila
                        </Button>
                        <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => agregarFilas(10)}>
                            <PlusSquare className="mr-1 h-4 w-4" />
                            Agregar 10 filas
                        </Button>
                        <Button variant="ghost" size="sm" className="cursor-pointer" disabled={seleccion.size === 0} onClick={eliminarSeleccionadas}>
                            <Trash2 className="mr-1 h-4 w-4" />
                            Eliminar seleccionadas{seleccion.size > 0 ? ` (${seleccion.size})` : ''}
                        </Button>
                        <div className="mx-1 h-5 w-px" style={{ background: 'var(--hoja-linea)' }} />
                        <Button variant="ghost" size="sm" className="cursor-pointer" onClick={guardarBorrador} disabled={!sinGuardar}>
                            <Save className="mr-1 h-4 w-4" />
                            Guardar borrador
                        </Button>
                        <Button variant="ghost" size="sm" className="cursor-pointer text-red-600 hover:text-red-700" onClick={() => setDescartando(true)}>
                            <X className="mr-1 h-4 w-4" />
                            Descartar
                        </Button>
                        <div className="ml-auto">
                            <Button
                                size="sm"
                                className="cursor-pointer text-white"
                                style={{ background: 'var(--hoja-verde)' }}
                                disabled={filasValidas === 0 || enviando}
                                onClick={() => setConfirmando(true)}
                            >
                                <Upload className="mr-1 h-4 w-4" />
                                Confirmar importación
                            </Button>
                        </div>
                    </div>

                    {/* Barra de fórmulas: referencia de la celda activa y su contenido (editable) */}
                    <div className="flex items-center gap-2 border-b px-2 py-1" style={{ background: 'var(--hoja-papel)', borderColor: 'var(--hoja-linea)' }}>
                        <div className="w-16 rounded border px-2 py-0.5 text-center text-xs font-semibold" style={{ borderColor: 'var(--hoja-linea)', color: 'var(--hoja-texto)' }}>
                            {nombreCelda || '—'}
                        </div>
                        <span className="text-xs font-semibold italic" style={{ color: 'var(--hoja-texto-suave)' }}>
                            fx
                        </span>
                        <input
                            className="min-w-0 flex-1 rounded border bg-transparent px-2 py-0.5 text-sm outline-none focus:ring-1"
                            style={{ borderColor: 'var(--hoja-linea)', color: 'var(--hoja-texto)' }}
                            value={activa.clave !== null && activa.rowIdx >= 0 ? (filas[activa.rowIdx]?.[activa.clave] ?? '') : ''}
                            placeholder="Selecciona una celda para ver o editar su contenido"
                            disabled={activa.clave === null || activa.rowIdx < 0}
                            onChange={(evento) => activa.clave !== null && actualizarCelda(activa.rowIdx, activa.clave, evento.target.value)}
                        />
                    </div>

                    {/* Hoja: la mascota va detrás (variante B del patrón de marca de agua) y la cuadrícula por delante */}
                    <div className="relative" style={{ background: 'var(--hoja-papel)', height: 'calc(100vh - 430px)', minHeight: 380 }}>
                        <img
                            src="/projects/mascota/mascota.webp"
                            alt=""
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 opacity-10 select-none"
                        />
                        <div className="relative h-full" onPasteCapture={alPegar}>
                            <DataGrid
                                ref={gridRef}
                                columns={columnas}
                                rows={filas}
                                rowKeyGetter={(fila) => fila.id}
                                onRowsChange={(nuevas) => {
                                    setFilas(nuevas);
                                    setSinGuardar(true);
                                }}
                                selectedRows={seleccion}
                                onSelectedRowsChange={setSeleccion}
                                headerRowHeight={46}
                                rowHeight={30}
                                rowClass={(fila) => {
                                    const { estado } = evaluarFila(fila);
                                    return estado === 'error' ? 'fila-error' : estado === 'solo_catalogo' ? 'fila-solo-catalogo' : undefined;
                                }}
                                onActivePositionChange={({ rowIdx, column }) => setActiva({ rowIdx, clave: column && esCampo(column.key) ? column.key : null })}
                                onFill={({ columnKey, sourceRow, targetRow }) => (esCampo(columnKey) ? { ...targetRow, [columnKey]: sourceRow[columnKey] } : targetRow)}
                                onCellKeyDown={(args, evento) => {
                                    if (args.mode === 'ACTIVE' && evento.key === 'Delete' && args.column && esCampo(args.column.key)) {
                                        actualizarCelda(args.rowIdx, args.column.key, '');
                                        evento.preventGridDefault();
                                    }
                                }}
                                className="h-full"
                            />
                        </div>
                    </div>

                    {/* Pestañas de hoja y barra de estado */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-2 py-1 text-xs" style={{ background: 'var(--hoja-gris)', borderColor: 'var(--hoja-linea)', color: 'var(--hoja-texto)' }}>
                        <div className="flex items-end gap-1">
                            <span
                                className="rounded-b border-x border-b px-4 py-1 font-semibold"
                                style={{ background: 'var(--hoja-papel)', borderColor: 'var(--hoja-linea)', borderBottom: '2px solid var(--hoja-verde)', color: 'var(--hoja-verde)' }}
                            >
                                Hoja1
                            </span>
                            <span className="pl-2" style={{ color: 'var(--hoja-texto-suave)' }}>
                                {sinGuardar ? 'Cambios sin guardar' : 'Listo'}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span>
                                Filas con datos: <strong>{resumen.ok + resumen.soloCatalogo + resumen.errores}</strong>
                            </span>
                            <span className="text-emerald-700 dark:text-emerald-400">
                                A importar: <strong>{resumen.ok}</strong>
                            </span>
                            <span className="text-blue-700 dark:text-blue-400">
                                Sin stock: <strong>{resumen.soloCatalogo}</strong>
                            </span>
                            <span className={resumen.errores > 0 ? 'text-red-700 dark:text-red-400' : ''}>
                                Con error: <strong>{resumen.errores}</strong>
                            </span>
                            <span>
                                Unidades: <strong>{resumen.unidades.toLocaleString('es-ES')}</strong>
                            </span>
                            <span>
                                Valor: <strong>{dinero(resumen.valor)}</strong>
                            </span>
                        </div>
                    </div>
                </div>

                <p className="text-muted-foreground text-xs">
                    Consejos: haz doble clic (o escribe) para editar una celda, pega un rango desde Excel con Ctrl+V, arrastra la esquina de la celda para rellenar y usa Supr para vaciarla.
                    Las filas en rojo tienen un error y no se importarán.
                </p>
            </div>

            <ConfirmarImportacionDialog
                abierto={confirmando && !avisoRepetido}
                archivo={borrador.nombre_archivo}
                tamano={`${filasValidas} filas`}
                almacen={borrador.almacen ?? ''}
                cargando={enviando}
                filasConError={resumen.errores}
                onConfirmar={() => confirmar(false)}
                onCancelar={() => setConfirmando(false)}
            />
            <ImportacionRepetidaDialog
                aviso={avisoRepetido}
                almacen={borrador.almacen ?? ''}
                cargando={enviando}
                onImportarDeTodosModos={() => confirmar(true)}
                onCancelar={() => {
                    setAvisoRepetido(null);
                    setConfirmando(false);
                }}
            />

            <AlertDialog open={descartando} onOpenChange={setDescartando}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Descartar este borrador?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Se perderán las ediciones de la hoja. No se ha importado nada, así que el inventario no cambia.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Seguir editando</AlertDialogCancel>
                        <AlertDialogAction onClick={descartar} className="bg-red-600 hover:bg-red-700">
                            Descartar borrador
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
