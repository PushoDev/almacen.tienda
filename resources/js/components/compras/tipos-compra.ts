/** Tipos del detalle de una compra (`Comprar/Show`), compartidos por sus componentes. */

/** A quien se le compró: el proveedor de una compra es un cliente. */
export interface ProveedorCompra {
    id?: number;
    nombre?: string;
}

export interface AlmacenCompra {
    id?: number;
    nombre_almacen: string;
}

export interface PagoCompra {
    tipo_pago: 'deuda_proveedor' | 'cuenta' | 'cliente';
    monto: number;
    cuenta: { id: number; nombre_cuenta: string } | null;
    cliente: { id: number; nombre_cliente: string } | null;
}

export type EstadoCompra = 'pendiente' | 'aprobada' | 'anulada';
export type TipoAnulacion = 'reversion' | 'fondo' | null;

export interface CompraDetalle {
    id: number;
    fecha_compra: string;
    total_compra: number;
    tipo_compra: 'pago_cash' | 'deuda_proveedor';
    estado: EstadoCompra;
    tipo_anulacion: TipoAnulacion;
    motivo_anulacion: string | null;
    es_parcial: boolean;
    proveedor?: ProveedorCompra | null;
    pagos: PagoCompra[];
}

export interface ProductoCompra {
    nombre_producto: string;
    marca_producto: string | null;
    modelo_producto: string | null;
    capacidad_producto: string | null;
    color_producto: string | null;
    codigo_producto: string;
    categoria: string | null;
    pivot: { cantidad: number; precio: number };
    almacen: AlmacenCompra;
    es_producto_nuevo: boolean | null;
}

export const formatearMoneda = (monto: number) => `$${monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
