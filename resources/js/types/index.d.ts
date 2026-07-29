import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

/**
 * Interfaces Proyect
 */
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
    roles: Array<'admin' | 'moderador' | 'vendedor'>;
}

export interface TasaMoneda {
    codigo_moneda: string;
    nombre_moneda: string;
    tasa_cambio: number;
    principal: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    flash: {
        success?: string;
        error?: string;
    };
    tasas: TasaMoneda[];
    [key: string]: unknown;
}

export interface PageProps extends SharedData {
    errors: Record<string, string>;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    avatar_url?: string | null;
    role: 'admin' | 'moderador' | 'vendedor';
    telegram_chat_id?: string | null;
    telegram_link_token?: string | null;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
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
    tipo_almacen: string;
    telefono_almacen: string;
    correo_almacen?: string | null;
    provincia_almacen?: string | null;
    ciudad_almacen?: string | null;
    notas_almacen?: string | null;
    // Nuevos campos del responsable
    nombre_responsable?: string | null;
    apellido_responsable?: string | null;
    carnet_responsable?: string | null;
    telefono_responsable?: string | null;
    created_at: string;
    updated_at: string;
    productos_count?: number; // Para el withCount
}

// Interface para Proveedores
export interface ProveedorProps {
    id: number;
    nombre_proveedor: string;
    telefono_proveedor?: string;
    correo_proveedor?: string | null;
    localidad_proveedor?: string;
    notas_proveedor?: string | null;
    saldo_proveedor?: number;
    created_at?: string;
    updated_at?: string;
}

export interface ResumenProveedorData {
    total_proveedores: number;
    total_fondo: number;
    total_deuda: number;
    balance_neto: number;
    por_estado: Record<string, { cantidad: number; saldo: number }>;
}

// Interface para Proveedor/Cliente combinado (para el select de compra)
export interface ProveedorClienteProps {
    id: number;
    nombre: string;
    tipo: 'proveedor' | 'cliente';
}

// Interface para Cuentas
export interface CuentaProps {
    id: number;
    nombre_cuenta: string;
    saldo_cuenta: number | null;
    deuda: number;
    tipo_cuenta: 'permanentes' | 'temporales' | 'deudas';
    tipo_moneda: 'USD' | 'EUR' | 'MLC' | 'CUP';
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
    marca_producto: string;
    modelo_producto?: string;
    capacidad_producto?: string;
    color_producto?: string;
    codigo_producto: string;
    categoria: string;
    categoria_id: number;
    precio_compra_producto: number;
    cantidad_total: number;
    imagen_url?: string;
    barcode_image_url?: string;
    precio_venta?: number;
    activo: boolean;
    descripcion_producto?: string;
    ganancia?: number;
    stock_bajo: boolean;
    created_at?: string;
    updated_at?: string;
    almacenes?: Array<{
        id: number;
        nombre_almacen: string;
        ciudad_almacen: string;
        provincia_almacen: string;
        telefono_almacen?: string;
        correo_almacen?: string;
        cantidad: number;
        stock_bajo: boolean;
    }>;
    codigos?: Array<{
        id: number;
        codigo_barras: string;
        cantidad: number;
        es_default: boolean;
        imagen_barcode: string | null;
    }>;
}

// Interface para la respuesta paginada
export interface ProductosPaginados {
    data: ProductoProps[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
}

// Interface para filtros
export interface ProductosFilters {
    search?: string;
    categoria_id?: string;
    almacen_id?: string;
    stock_bajo?: boolean;
}

// Interface para ordenamiento
export interface ProductosSort {
    field: string;
    direction: string;
}

// Interface para Clientes
export interface ClienteProps {
    id: number;
    nombre_cliente: string;
    tipo_cliente: 'fisico' | 'asociado';
    deuda_pago_cliente?: number | null;
    telefono_cliente: string;
    direccion_cliente?: string | null;
    ciudad_cliente?: string | null;
    created_at: string;
    updated_at: string;
}

export interface ResumenClienteData {
    total_clientes: number;
    total_fondo: number;
    total_deuda: number;
    balance_neto: number;
    por_estado: Record<string, { cantidad: number; saldo: number }>;
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
    // Firma de indice (Opcional)
    [key: string]: string | number | undefined; // Esto permite que el objeto tenga otras propiedades
}

// Interface para las cuentas del Negocio
export interface CuentaNegocioProps {
    id: number;
    nombre_cuenta: string;
    saldo_cuenta: number;
    deuda: number;
    tipo_cuenta: 'permanentes' | 'temporales' | 'deudas';
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

// Para deuda con el cliente
export interface DeudaClienteProps {
    id: number;
    nombre_cliente: string;
    deuda_pago_cliente: number;
}

// Interface para la solicitud de compra
export interface CompraRequest {
    compra: 'deuda_proveedor' | 'pago_cash' | 'pago_cliente_fisico';
    cuenta_id: number;
    almacen: string;
    proveedor: string;
    fecha: string;
    productos: ProductoComprarProps[];
}

// Interface para respuesta de compra (si es necesario)
export interface CompraResponse {
    id: number;
    tipo_compra: 'deuda_proveedor' | 'pago_cash' | 'pago_cliente_fisico';
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
    cliente_id?: number | string;
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
// Interface para la Logistica
export interface BalanceMoneda {
    codigo: string;
    nombre: string;
    simbolo: string;
    saldo: number;
    tasa: number;
    principal: boolean | number;
}

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

    // Balances Dinámicos
    balances: BalanceMoneda[];

    // Deudas y totales
    sumaDsiponible: number;
    deudaClienteFisico: number;
    clientesFisicos: number;

    // Permissions
    canViewFinance?: boolean;

    // Resumen de Cuentas (incorporado desde CuentaController)
    resumenCuentas?: {
        total_saldo: number;
        total_cuentas: number;
        cuentas_activas: number;
        cuentas_inactivas: number;
        cuentas_con_deuda: number;
        cuentas_deuda_saldo: number;
        moneda_principal: { simbolo: string; codigo: string };
        por_tipo: Record<string, number>;
        conteo_tipo: Record<string, number>;
        por_estado: Record<string, { saldo: number; cantidad: number }>;
        por_moneda_perm: Record<string, { original: number; equivalente: number; cantidad: number; simbolo: string }>;
        por_tipo_moneda: Record<string, Record<string, { original: number; equivalente: number; cantidad: number; simbolo: string }>>;
    } | null;

    // Resumen de Clientes
    resumenClientes?: {
        total_clientes: number;
        total_fondo: number;
        total_deuda: number;
        balance_neto: number;
        por_estado: Record<string, { cantidad: number; saldo: number }>;
    } | null;

    // Resumen de Proveedores
    resumenProveedores?: {
        total_proveedores: number;
        total_fondo: number;
        total_deuda: number;
        balance_neto: number;
        por_estado: Record<string, { cantidad: number; saldo: number }>;
    } | null;

    // Resumen de Productos
    resumenProductos?: {
        total_productos: number;
        total_unidades: number;
        total_importe_global: number;
        productos_stock_bajo: number;
        valor_stock_bajo: number;
        por_stock: Record<string, { cantidad: number; unidades: number }>;
    } | null;

}

// Interface para Productos por Almacén (Detalles)
export interface ProductoPorAlmacenDetalleRef {
    almacen_id: number;
    nombre_almacen: string;
    producto_id: number;
    nombre_producto: string;
    cantidad_total: number;
}

export interface ProductoPorAlmacenDetalleRef {
    producto_id: number;
    nombre_producto: string;
    cantidad: number;
    id?: number; // Para compatibilidad
    nombre?: string; // Para compatibilidad
    stock_actual?: number; // Para compatibilidad
}

export interface Movimiento {
    id: number;
    almacen_origen_id: number;
    almacen_destino_id: number;
    user_id: number;
    tipo_movimiento: string;
    estado: string;
    observaciones?: string;
    guia_transporte?: string;
    transportista?: string;
    fecha_aprobacion?: string;
    fecha_envio?: string;
    fecha_recepcion?: string;
    created_at: string;
    updated_at: string;
    detalles?: MovimientoDetalle[];
    seguimientos?: MovimientoSeguimiento[];
    almacen_origen?: AlmacenProps;
    almacen_destino?: AlmacenProps;
    usuario?: {
        name: string;
    };
}

export interface MovimientoDetalle {
    id: number;
    movimiento_id: number;
    producto_id: number;
    cantidad_solicitada: number;
    cantidad_despachada: number;
    cantidad_recibida: number;
    costo_unitario?: number;
    observaciones?: string;
    created_at: string;
    updated_at: string;
    producto?: Producto;
}

export interface MovimientoSeguimiento {
    id: number;
    movimiento_id: number;
    estado: string;
    observaciones?: string;
    user_id: number;
    ubicacion?: string;
    evidencia?: string;
    created_at: string;
    updated_at: string;
    usuario?: {
        name: string;
    };
}
// Interface para disponibilidad de venta
export interface VendedorProductoProps {
    id: number;
    nombre_producto: string;
    codigo_producto?: string | null;
    // Adds
    marca_producto: string;
    capacidad_producto?: string | null;
    color_producto?: string | null;
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

// Historial de Precios
export interface HistorialPrecioRef {
    id: number;
    producto: string;
    usuario: string;
    precio_anterior: number;
    precio_nuevo: number;
    fecha: string;
}

/**
/**
 * Forma de pago registrada
 */
export interface PagoVentaProps {
    tipo_pago: 'efectivo' | 'tarjeta' | 'transferencia' | 'otros';
    via_pago: 'zelle' | 'visa' | 'paypal' | 'mastercard' | 'stripe' | 'transfermovil' | 'enzona' | 'otros';
    tipo_moneda: 'usd' | 'euro' | 'mlc' | 'cup';
    monto: number;
    cuenta_id: number;
}

/**
 * Respuesta de venta desde backend
 */
export interface VentaResponseProps {
    id: number;
    user_id: number;
    almacen_id: number;
    cliente_id: number | null;
    total: number;
    detalles_venta: string | null;
    created_at: string;
    updated_at: string;
    detalles: Array<VentaDetalleProps>;
    pagos: Array<PagoVentaResponseProps>;
}

/**
 * Detalles de los productos vendidos (respuesta del backend)
 */
export interface VentaDetalleProps {
    id: number;
    venta_id: number;
    producto_id: number;
    producto_codigo_id?: number | null;
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
        codigo_vendido?: string | null;
    };
}

/**
 * Datos del pago (respuesta del backend)
 */
export interface PagoVentaResponseProps {
    id: number;
    venta_id: number;
    tipo_pago: string;
    via_pago: string;
    tipo_moneda: string;
    monto: number;
    cuenta_id: number;
    cuenta: {
        id: number;
        nombre_cuenta: string;
        tipo_cuenta: string;
        saldo_cuenta: number;
    };
}

// Agrega estas interfaces en tu archivo index.d.ts

// Interface para Producto en Compra
export interface ProductoCompra {
    id: number;
    nombre_producto: string;
    marca_producto?: string;
    modelo_producto?: string;
    capacidad_producto?: string;
    codigo_producto?: string;
    categoria?: {
        nombre_categoria: string;
    };
    pivot: {
        cantidad: number;
        precio: number;
        almacen_id: number;
    };
}

// Interface para Compra del Proveedor
export interface CompraProveedor {
    id: number;
    fecha_compra: string;
    tipo_compra: 'deuda_proveedor' | 'pago_cash';
    total_compra: number;
    productos: ProductoCompra[];
    proveedor_id: number;
    pagos?: Array<{
        id: number;
        monto: number;
        tipo_pago: string;
        cuenta?: { id: number; nombre_cuenta: string };
        cliente?: { id: number; nombre_cliente: string };
    }>;
}

// Interface para Transacciones del Proveedor
export interface TransaccionProveedor {
    id: number;
    fecha_operacion: string;
    tipo_movimiento_id: number;
    descripcion: string;
    monto: number;
    moneda: string;
    tasa_cambio_aplicada?: number;
    cuenta_origen_id?: number;
    cliente_origen_id?: number;
    cuenta_origen?: {
        nombre_cuenta: string;
    };
    cliente_origen?: {
        nombre_cliente: string;
    };
    proveedor_destino_id: number;
}

// Interface para Estadísticas del Proveedor
export interface EstadisticasProveedor {
    total_compras: number;
    monto_total_compras: number;
    total_transacciones: number;
    monto_total_ingresos: number;
    saldo_actual: number;
}
