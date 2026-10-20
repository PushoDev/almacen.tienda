/** Tipos de `Casillero/Index`, compartidos por sus componentes. Los arma `CasilleroController::index()`. */

export interface CargoCasillero {
    id: number;
    concepto: string;
    monto_usd: number;
    fecha: string;
}

export interface ProductoCasillero {
    compra_producto_id: number;
    nombre_producto: string;
    marca_producto: string | null;
    modelo_producto: string | null;
    categoria: string | null;
    cantidad: number;
    /** Unidades de la línea que siguen esperando en Panamá (las demás ya subieron a un contenedor). */
    en_casillero: number;
    precio: number;
}

/** Una compra del flujo casillero que espera en Panamá: pagada, sin stock y sin contenedor. */
export interface CompraCasillero {
    id: number;
    fecha_compra: string;
    llegada_panama_at: string | null;
    proveedor: string | null;
    total_compra: number;
    unidades_en_casillero: number;
    valor_en_casillero: number;
    cargos_usd: number;
    cargos: CargoCasillero[];
    productos: ProductoCasillero[];
}

export interface CuentaUsdCasillero {
    id: number;
    nombre_cuenta: string;
    saldo_cuenta: number;
}

export interface ResumenCasillero {
    compras: number;
    unidades: number;
    valor_mercancia_usd: number;
    cargos_usd: number;
}

/** Una línea de compra con unidades que aún se pueden asignar a un contenedor. */
export interface LineaDisponible {
    compra_producto_id: number;
    compra_id: number;
    proveedor: string | null;
    producto: string;
    en_casillero: number;
    precio: number;
}

/** Unidades de una línea de compra que están en un contenedor. */
export interface LineaContenedor {
    compra_producto_id: number;
    compra_id: number;
    proveedor: string | null;
    producto: string | null;
    cantidad: number;
    precio: number;
    valor: number;
}

/** Un contenedor abierto: lo que lleva y los cargos que se le anotaron. Lo arma `ContenedorController`. */
export interface ContenedorCasillero {
    id: number;
    nombre: string;
    notas: string | null;
    fecha_salida: string | null;
    unidades: number;
    valor_mercancia_usd: number;
    cargos_usd: number;
    cargos: CargoCasillero[];
    lineas: LineaContenedor[];
}

export interface ResumenContenedores {
    contenedores: number;
    unidades: number;
    valor_mercancia_usd: number;
    cargos_usd: number;
}

export const formatearUsd = (monto: number) => `$${monto.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** "2026-10-19" → "19/10/2026" sin pasar por Date (evita el desfase de zona horaria). */
export const formatearFecha = (fecha: string) => {
    const [anio, mes, dia] = fecha.slice(0, 10).split('-');

    return `${dia}/${mes}/${anio}`;
};
