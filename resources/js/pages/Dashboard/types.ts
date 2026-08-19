export interface Usuario {
    id: number;
    name: string;
    email: string;
    role: string;
}

export interface Moneda {
    id: number;
    nombre_moneda: string;
    codigo_moneda: string;
    simbolo_moneda: string;
    tasa_cambio: number;
    commission: number;
    estado: boolean;
    principal: boolean;
}

export interface MontoPorMoneda {
    descripcion: string;
    simbolo: string;
    monto: number;
    tasa_cambio: number;
}

export interface ComparacionMensual {
    moneda: string;
    nombre_moneda: string;
    simbolo_moneda: string;
    monto_actual: number;
    monto_anterior: number;
    diferencia: number;
    porcentaje_cambio: number;
    es_positivo: boolean;
    tasa_cambio: number;
}

export interface EstadoFinanciero {
    cuenta_id: number;
    nombre_cuenta: string;
    tipo: string;
    saldo_cuenta: number;
    deuda: number;
    tipo_cuenta: string;
    estado_cuenta: boolean;
    moneda: Moneda;
    usuarios: Usuario[];
}

export interface HistorialCambio {
    id: number;
    moneda: {
        id: number;
        nombre_moneda: string;
        codigo_moneda: string;
        simbolo_moneda: string;
    };
    usuario: {
        id: number;
        name: string;
    };
    tasa_anterior: string;
    tasa_nueva: string;
    diferencia_tasa: string;
    porcentaje_cambio: string;
    total_cuentas_afectadas: string;
    impacto_financiero: string;
    impacto_porcentaje: string;
    numero_cuentas_afectadas: number;
    es_ganancia: boolean;
    es_perdida: boolean;
    impacto_formateado: string;
    impacto_porcentaje_formateado: string;
    fecha_cambio: string;
    fecha_formateada: string;
}

export interface HistorialCostoPrecioItem {
    id: number;
    producto: { id: number; nombre_producto: string };
    usuario: { id: number; name: string };
    precio_anterior: number;
    precio_nuevo: number;
    diferencia: number;
    stock_momento: number;
    impacto_financiero: number;
    impacto_formateado: string;
    es_ganancia: boolean;
    es_perdida: boolean;
    motivo: string | null;
    fecha_formateada: string;
}

export interface StatsCostoPrecio {
    total_ganancias: number;
    total_perdidas: number;
    neto_impacto: number;
    numero_cambios: number;
}

export interface CapitalPorMoneda {
    codigo: string;
    simbolo: string;
    monto: number;
    incluye_clientes_proveedores_inventario: boolean;
}

export interface ResumenFinanciero {
    capital_financiero: number;
    capital_por_moneda: CapitalPorMoneda[];
    moneda_principal: { simbolo: string; codigo: string };
}

export interface GananciaAgenciaMes {
    ganancia_ventas: number;
    ganancia_transferencias: number;
    ganancia_neta_total: number;
}
