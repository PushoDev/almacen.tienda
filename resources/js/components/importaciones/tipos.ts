export type EstadoImportacion = 'completada' | 'con_omitidas' | 'fallida' | 'revertida';

export interface ResumenImportacion {
    id: number;
    fecha: string;
    usuario: string | null;
    almacen: string | null;
    nombre_archivo: string;
    estado: EstadoImportacion;
    filas_procesadas: number;
    productos_creados: number;
    productos_actualizados: number;
    productos_sin_stock: number;
    filas_omitidas: number;
    lotes_creados: number;
    unidades_importadas: number;
}

export interface FilaOmitida {
    fila: number;
    nombre_producto: string | null;
    motivo: string | null;
}

/** Lo que el servidor deja en el flash `importacion_resultado` al terminar una importación. */
export interface ResultadoImportacion extends Omit<ResumenImportacion, 'fecha' | 'usuario' | 'almacen'> {
    almacen: string;
    omitidas: FilaOmitida[];
}

/** Flash `importacion_repetida`: el mismo archivo ya se importó en ese almacén. */
export interface AvisoImportacionRepetida {
    id: number;
    nombre_archivo: string;
    fecha: string;
    usuario: string | null;
}

export const formatFechaHora = (fecha: string): string =>
    new Date(fecha).toLocaleString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
