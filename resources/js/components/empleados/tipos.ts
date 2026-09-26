export type AccesoCuenta = 'completo' | 'cobro';

/** Cuenta asignada a un empleado: `completo` ve el saldo y opera; `cobro` solo recibe pagos de ventas. */
export interface CuentaAsignada {
    id: number;
    acceso: AccesoCuenta;
}

/** Cuenta que se puede asignar, con lo justo para reconocerla en su tarjeta (sin saldo). */
export interface CuentaDisponible {
    id: number;
    nombre_cuenta: string;
    moneda: string | null;
    tipo: 'efectivo' | 'tarjeta' | string;
    tipo_titular: 'personal' | 'externa' | null;
    estado: string;
    banco: { slug: string; nombre: string; imagen_url: string } | null;
}
