/**
 * Punto de Venta (POS)
 */

// Producto disponible para vender
export interface ProductoVenta {
    id: number;
    nombre_producto: string;
    marca_producto: string | null;
    codigo_producto: string | null;
    categoria: string;
    categoria_id: number; // Corregido: caegoria_id → categoria_id
    precio_compra: number;
    cantidad_producto: number;
    imagen_producto: string | null;
    precio_venta?: number | null; // Precio definido por vendedor
    stock_total: number; // Stock total entre todos los almacenes
    ganancia: number | null;
    tiene_precio: boolean; // true si tiene precio_venta > 0
    cantidad?: number; // Usado temporalmente para carrito
}

// Detalle de un producto vendido
export interface ProductoVentaItemProps {
    producto_id: number;
    precio_compra: number;
    cantidad: number;
    precio_venta: number | string;
}

// Formato de solicitud para registrar una venta
export interface VentaRequestProps {
    almacen_id: number;
    productos: ProductoVentaItemProps[];
    pagos: PagoVentaProps[];
}

// Respuesta del backend tras registrar una venta
export interface VentaResponseProps {
    id: number;
    user_id: number;
    almacen_id: number;
    total: number;
    created_at: string;
    updated_at: string;
    detalles: VentaDetalleProps[];
    pagos: PagoVentaProps[];
}

// Detalles de los productos vendidos
export interface VentaDetalleProps {
    id: number;
    venta_id: number;
    producto_id: number;
    cantidad: number;
    precio_venta: number;
    subtotal: number;
    created_at: string;
    updated_at: string;
    producto: {
        id: number;
        nombre_producto: string;
        marca_producto: string | null;
        codigo_producto: string | null;
        categoria_id: number;
        precio_compra_producto: number;
        cantidad_producto: number;
        imagen_producto: string | null;
        created_at: string;
        updated_at: string;
    };
}

// Forma de pago registrada
export interface PagoVentaProps {
    tipo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'otros';
    via_pago: 'zelle' | 'visa' | 'paypal' | 'mastercard' | 'stripe' | 'transfermovil' | 'enzona' | 'otros';
    tipo_moneda: 'usd' | 'euro' | 'mlc' | 'cup';
    monto: number | string; // Puede ser string en formulario
}

// Tipos adicionales
export interface AlmacenUsuarioProps {
    id: number;
    nombre: string;
}
