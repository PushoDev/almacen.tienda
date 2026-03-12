# Comparativa con Cierre Anterior

## ¿Qué es esta sección?

La **Comparativa con Cierre Anterior** te permite ver cómo quedaron tus cuentas y clientes en el cierre anterior comparado con el estado actual. Es como una "foto" de lo que había la última vez que cerraste vs. lo que hay ahora.

---

## Tabla de Cuentas

| Campo               | Descripción                                                        |
| ------------------- | ------------------------------------------------------------------ |
| **Cuenta**          | Nombre de la cuenta (ej: ZELLE EDDY, Efectivo USD, Transferencias) |
| **Tipo**            | Si es efectivo o tarjeta                                           |
| **Moneda**          | La moneda de esa cuenta (USD, CUP, EUR, etc.)                      |
| **Cierre Anterior** | Lo que había en la cuenta cuando hiciste el último cierre          |
| **Cierre Hoy**      | Lo que hay actualmente en esa cuenta (saldo real en el sistema)    |
| **Diferencia**      | La resta: Actual - Anterior                                        |

### ¿Cómo se calcula?

1. Cuando realizas un cierre, el sistema guarda automáticamente el total de lo que entró a cada cuenta en ese momento
2. Al hacer un nuevo cierre, el sistema compara:
    - **Lo que hay ahora** (saldo actual de la cuenta en la base de datos)
    - **Lo que había antes** (lo que se guardó en el cierre anterior)

### Ejemplo prático

Supongamos que tu último cierre fue el lunes:

| Cuenta       | Cierre Anterior (Lunes) | Cierre Hoy (Martes) | Diferencia      |
| ------------ | ----------------------- | ------------------- | --------------- |
| Zelle Eddy   | $500.00                 | $800.00             | **+$300.00** ✅ |
| Efectivo USD | $200.00                 | $150.00             | **-$50.00** ❌  |

- **+$300** significa que entraton $300 más a la cuenta desde el último cierre
- **-$50** significa que gastaste o transferiste $50 más de lo que entró

---

## Tabla de Clientes

Similar a las cuentas, pero para las **deudas de los clientes**:

| Campo              | Descripción                                             |
| ------------------ | ------------------------------------------------------- |
| **Cliente**        | Nombre del cliente                                      |
| **Deuda Anterior** | Lo que debía el cliente cuando hiciste el último cierre |
| **Deuda Actual**   | Lo que debe ahora                                       |
| **Diferencia**     | La resta: Actual - Anterior                             |

### Ejemplo prático

| Cliente     | Deuda Anterior | Deuda Actual | Diferencia     |
| ----------- | -------------- | ------------ | -------------- |
| Juan Pérez  | $100.00        | $50.00       | **-$50.00** ✅ |
| María Gómez | $0.00          | $75.00       | **+$75.00** ⚠️ |

- **-$50** (negativo) es **BUENO** ✅ - El cliente pagó $50
- **+$75** (positivo) es **ATENCIÓN** ⚠️ - El cliente debe $75 más (compró a crédito)

---

## ¿Para qué sirve?

1. **Control de efectivo**: Saber exactamente cuánto dinero entró a cada cuenta
2. **Detectar errores**: Si la diferencia no es la esperada, puedes investigar qué pasó
3. **Seguimiento de deudas**: Ver cuánto han pagado o deben los clientes
4. **Toma de decisiones**: Saber si tienes más o menos dinero que en el cierre anterior

---

## Indicadores de color

- 🟢 **Verde (subió/mejoró)**: Money entered to accounts or customer debt decreased
- 🔴 **Rojo (bajó/empeoró)**: Money left accounts or customer debt increased
- ⚪ **Gris (igual)**: Sin cambios desde el último cierre
