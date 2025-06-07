import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    roles: Array<'admin' | 'vendedor'>;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    role: 'admin' | 'vendedor';
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
    almacenes?: AlmacenProps[];
}

// Interfaces del Proyecto:

// Interface para Categorias
export interface CategoriasProps {
    id: number;
    nombre_categoria: string;
    descripcion_categoria?: string;
    activar_categoria: boolean;
    created_at: string;
    updated_at: string;
}

// Interface para Almacenes
export interface AlmacenProps {
    id: number;
    nombre_almacen: string;
    telefono_almacen: string;
    correo_almacen?: string | null;
    provincia_almacen?: string | null;
    ciudad_almacen?: string | null;
    notas_almacen?: string | null;
    created_at: string;
    updated_at: string;
}

// Interface para Proveedores
export interface ProveedorProps {
    id: number;
    nombre_proveedor: string;
    telefono_proveedor: string;
    correo_proveedor?: string | null;
    localidad_proveedor: string;
    notas_proveedor?: string | null;
    created_at: string;
    updated_at: string;
}

// Interface para Cuentas
export interface CuentaProps {
    id: number;
    nombre_cuenta: string;
    saldo_cuenta: number | null;
    deuda: number;
    tipo_cuenta: 'permanentes' | 'temporales';
    notas_cuenta?: string | null;
    created_at: string;
    updated_at: string;
}

export interface AlmacenProductoProps {
    id: number;
    nombre_almacen: string;
    telefono_almacen: string;
    correo_almacen: string;
    ciudad_almacen: string;
    provincia_almacen: string;
    pivot: {
        cantidad: number;
    };
}

// Interface para Productos
export interface ProductoProps {
    id: number;
    nombre_producto: string;
    marca_producto?: string | null;
    codigo_producto?: string | null;
    categoria_id: number;
    categoria?: CategoriaProps;
    precio_compra_producto: number;
    cantidad_producto: number;
    imagen_producto?: string | null;
    imagen_url?: string | null;
    created_at: string;
    updated_at: string;
    almacenes?: AlmacenProductoProps[];
}

// Interface para Clientes
export interface ClienteProps {
    id: number;
    nombre_cliente: string;
    telefono_cliente: string;
    direccion_cliente?: string | null;
    ciudad_cliente?: string | null;
    created_at: string;
    updated_at: string;
}

// Otras Interfaces
// Interface para el formulario de Comprar Productos
export interface ProductoComprarProps {
    id: number;
    producto: string;
    categoria: string;
    codigo: string;
    cantidad: number;
    precio: number;
}

// Interface para las cuentas del Negocio
export interface CuentaNegocioProps {
    id: number;
    nombre_cuenta: string;
    saldo_cuenta: number;
    deuda: number;
    tipo_cuenta: 'permanentes' | 'temporales';
    notas_cuenta?: string;
    created_at?: string;
    updated_at?: string;
}

// Interface para las deudas con los Proveedores
export interface DeudasProveedoresProps {
    id: number;
    proveedor_id: number;
    monto_deuda: number;
    fecha_generacion: string;
    estado: 'pendiente' | 'pagado';
    notas?: string;
    created_at?: string;
    updated_at?: string;
}

// Interface para la solicitud de compra
export interface CompraRequest {
    compra: 'deuda_proveedor' | 'pago_cash';
    cuenta_id: number;
    almacen: string;
    proveedor: string;
    fecha: string;
    productos: ProductoComprarProps[];
}

// Interface para respuesta de compra (si es necesario)
export interface CompraResponse {
    id: number;
    tipo_compra: 'deuda_proveedor' | 'pago_cash';
    cuenta: {
        id: number;
        saldo: number;
        deuda: number;
    };
    almacen: string;
    proveedor: string;
    fecha: string;
    total: number;
    productos: ProductoComprarProps[];
}

// Interface Productos mas comprados
export interface ProductosMasCompradosRef {
    nombre_producto: string;
    total_cantidad: number;
    veces_comprado: number;
}
export type ProductosMasCompradosList = ProductosMasCompradosRef[];

// Interface de Compras por periodos
export interface CompraPorPeriodoRef {
    id: number;
    fecha_compra: string;
    total_compra: number;
    nombre_proveedor: string;
    tipo_compra: 'deuda_proveedor' | 'pago_cash';
}

// Interface de Gastos Mensuales
export interface GastoMensualRef {
    mes_anio: string;
    total: number;
    cantidad_compras: number;
}

// Interface de Compras por Proveedor
export interface CompraPorProveedorRef {
    id: number;
    fecha_compra: string;
    total_compra: number;
    tipo_compra: 'deuda_proveedor' | 'pago_cash';
}

// Inteface de Productos por Almacen
export interface ProductoPorAlmacenRef {
    almacen_id: number;
    nombre_almacen: string;
    total_productos: number;
    productos_unicos: number;
}

// Interface Productos por Almacen detalles
export interface ProductoPorAlmacenDetalleRef {
    almacen_id: number;
    nombre_almacen: string;
    producto_id: number;
    nombre_producto: string;
    cantidad_total: number;
}

// Para los Charts
// Interface para gráficos - Compras por Proveedor
export interface CompraPorProveedorChartRef {
    nombre_proveedor: string;
    cantidad_compras: number;
    total_gastado: number;
}

export interface ProductoPorAlmacenRefCharts {
    nombre_almacen: string;
    total_productos: number;
    productos_unicos: number;
}

// Interface para la Logistica
export interface LogisticaProps {
    totalCategorias: number;
    categoriasActivas: number;
    totalProveedores: number;
    totalClientes: number;
    totalAlmacenes: number;
    totalProductos: number;
    totalUnidades: number;
    inversionTotal: number;
    totalCuentas: number;
    saldoCuentas: number;
    montoGeneralInvertido: number;
    deudaPendientes: number;
    deudaPendietesSaldo: number;
    gastosMensuales: GastoMensualRef[];
    productosTop: ProductosMasCompradosRef[];
    comprasPorProveedor: CompraPorProveedorChartRef[];
    productosPorAlmacen: ProductoPorAlmacenRefCharts[];
}

// Interface para Productos por Almacén (Detalles)
export interface ProductoPorAlmacenDetalleRef {
    almacen_id: number;
    nombre_almacen: string;
    producto_id: number;
    nombre_producto: string;
    cantidad_total: number;
}

// Interface para Movimientos
export interface MovimientoProps {
    id: number;
    producto_id: number;
    almacen_origen_id: number;
    almacen_destino_id: number;
    cantidad: number;
    fecha_movimiento: string;
    created_at: string;
    updated_at: string;
    producto?: {
        nombre_producto: string;
    };
    almacen_origen?: {
        nombre_almacen: string;
    };
    almacen_destino?: {
        nombre_almacen: string;
    };
}

// Interface para la solicitud de movimiento
export interface MovimientoRequest {
    almacen_origen_id: number;
    almacen_destino_id: number;
    productos: {
        producto_id: number;
        cantidad: number;
    }[];
}

// Interface para la respuesta de movimiento
export interface MovimientoResponse {
    success: boolean;
    message: string;
    movimiento?: MovimientoProps;
}

// Interface para disponibilidad de venta
export interface VendedorProductoProps {
    id: number;
    nombre_producto: string;
    codigo_producto?: string | null;
    // Adds
    marca_producto: string;
    categoria: string;
    precio_compra_producto: number;
    precio_venta_producto: number;
    cantidad_producto: string;
    precio_venta: number; // Precio base o personalizado
    es_precio_personalizado: boolean; // True si el vendedor lo modificó
    stock_total: number; // Suma de stock en todos los almacenes del vendedor
    imagen_url?: string | null; // URL de la imagen (si existe)
    almacenes: Array<{
        id: number;
        nombre_almacen: string;
        stock_disponible: number; // Stock en este almacén específico
    }>;
    permisos: {
        editar_precio: boolean; // Ej: solo si el rol es 'vendedor' con permisos
        transferir_stock: boolean; // Si puede mover entre almacenes
    };
    // Fechas opcionales (depende de si las necesitas en la vista)
    creado_en?: string;
    actualizado_en?: string;
}
