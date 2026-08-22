# Integración de módulo de Formación de Costos y Precios

Estoy desarrollando un **sistema de gestión de inventario** y quiero incorporar un nuevo módulo denominado:

> **Formación de Costos y Precios**

El objetivo es permitir que los usuarios puedan elaborar una **ficha/modelo de formación del precio de costo de un producto**, tomando como referencia la metodología utilizada en Cuba y, específicamente, dos hojas de cálculo que adjunto como referencia:

* `cerveza parranda.xlsx`
* `malta.xlsx`

Estas hojas NO deben copiarse literalmente ni convertirse en una plantilla rígida. Deben utilizarse como **referencia funcional y matemática** para comprender la estructura de cálculo.

---

## 1. Objetivo del módulo

El módulo debe permitir al usuario:

1. Seleccionar un producto existente del inventario.
2. Crear una ficha de formación de costos para ese producto.
3. Definir los componentes que intervienen en el costo.
4. Agregar, eliminar y editar conceptos.
5. Introducir cantidades, unidades, precios y porcentajes.
6. Definir diferentes tipos de costos y gastos.
7. Configurar márgenes de utilidad.
8. Configurar impuestos/tributos.
9. Obtener automáticamente:

   * costo directo;
   * costo indirecto;
   * gastos generales;
   * costo total;
   * utilidad;
   * impuestos;
   * precio calculado;
   * precio sugerido/final.
10. Guardar la ficha.
11. Versionar/revisar la ficha cuando cambien los costos.
12. Recalcular automáticamente cuando cambie cualquiera de sus componentes.

---

# 2. PRINCIPIO FUNDAMENTAL

NO quiero una calculadora rígida.

Quiero un **motor de formación de costos configurable**.

El sistema debe proporcionar una estructura inicial basada en la metodología de las hojas Excel, pero el usuario debe poder modificarla.

Por ejemplo, inicialmente podrían existir:

### Costos directos

* Materias primas
* Materiales
* Envases
* Mano de obra directa
* Otros costos directos

### Costos indirectos

* Energía eléctrica
* Agua
* Combustible
* Mantenimiento
* Depreciación
* Otros costos indirectos

### Gastos generales

* Administración
* Comercialización
* Distribución
* Financieros
* Otros gastos

### Formación del precio

* Utilidad
* Impuestos
* Otros tributos
* Ajustes
* Precio final

Pero TODOS estos conceptos deben ser configurables.

---

# 3. El usuario debe poder crear conceptos personalizados

Por ejemplo:

El usuario podría crear:

> "Consumo de combustible"

Tipo:

> Costo indirecto

Unidad:

> Litros

Cantidad:

> 2.5

Precio unitario:

> 150 CUP

Importe:

> 375 CUP

O crear:

> "Gastos de transporte"

Tipo:

> Gasto general

Método:

> Importe fijo

Valor:

> 50 CUP

El sistema debe calcular automáticamente el importe.

---

# 4. Métodos de cálculo

Cada componente debería poder tener diferentes métodos de cálculo.

Como mínimo considerar:

### Importe directo

```text
Cantidad × Precio unitario
```

### Porcentaje sobre una base

```text
Base × Porcentaje / 100
```

### Porcentaje sobre costo directo

```text
Costo directo × Porcentaje / 100
```

### Porcentaje sobre costo total

```text
Costo total × Porcentaje / 100
```

### Importe fijo

```text
Valor introducido por el usuario
```

### Cálculo basado en tiempo

Para conceptos como mano de obra:

```text
Tarifa × Tiempo
```

La arquitectura debe permitir agregar nuevos métodos posteriormente.

---

# 5. Mano de obra

La mano de obra merece un tratamiento especial.

Debe ser posible definir:

* trabajador/categoría;
* salario base;
* horas/minutos trabajados;
* tarifa horaria;
* tarifa por minuto;
* cantidad de trabajadores;
* porcentaje adicional;
* importe resultante.

Por ejemplo:

```text
Salario base
÷ horas laborales
= tarifa por hora

Tarifa por hora
× tiempo utilizado
= costo de mano de obra
```

No asumir que todos los negocios utilizan exactamente la misma fórmula.

Debe ser configurable.

---

# 6. Monedas

El sistema de inventario puede trabajar con diferentes monedas.

El módulo debe permitir:

* CUP
* USD
* EUR
* MLC
* otras monedas configurables.

Debe existir una configuración de:

> Tasa de cambio

Por ejemplo:

```text
USD → CUP = 400
EUR → CUP = 470
MLC → CUP = 300
```

El usuario debe poder decidir cuál es la moneda base de la ficha.

Ejemplo:

```text
Materia prima
100 USD

Tasa USD/CUP
400

Costo equivalente
40,000 CUP
```

IMPORTANTE:

No convertir valores históricos automáticamente sin control.

Debe quedar registrada la tasa utilizada en la ficha para mantener trazabilidad.

---

# 7. Integración con inventario

El módulo debe integrarse con el producto existente.

Ejemplo:

```text
Producto:
Cerveza Parranda 500 ml

SKU:
CER-500

Unidad:
Unidad

Costo actual de inventario:
420 CUP
```

El usuario puede crear:

> Nueva ficha de formación de costos

Y utilizar el costo de inventario como referencia inicial.

Sin embargo:

**NO modificar automáticamente el costo del inventario solamente por crear una ficha.**

Debe existir una acción explícita como:

> "Aplicar costo calculado al producto"

y solicitar confirmación.

---

# 8. Estructura conceptual de la ficha

La interfaz debería tener algo parecido a:

```text
FORMACIÓN DE COSTOS

Producto
─────────────────────────────
Cerveza Parranda 500 ml
SKU: CER-500
Unidad: Unidad

─────────────────────────────

1. COSTOS DIRECTOS

Concepto          Cantidad   Precio   Importe
────────────────────────────────────────────
Malta               2        150      300
Envase              1         80       80
Otros                1         40       40

                         Total: 420

─────────────────────────────

2. MANO DE OBRA

Concepto          Método       Importe
────────────────────────────────────────
Producción        Tiempo        2.85

                         Total: 2.85

─────────────────────────────

3. COSTOS INDIRECTOS

Energía eléctrica              20.00
Agua                           10.00
Mantenimiento                   5.00

                         Total: 35.00

─────────────────────────────

4. GASTOS GENERALES

Administración                 18.83
Transporte                     25.00

                         Total: 43.83

─────────────────────────────

RESUMEN

Costo directo                 422.85
Costos indirectos              35.00
Gastos generales               43.83
─────────────────────────────
COSTO TOTAL                   501.68

Utilidad 15%                   75.25
Impuestos                      XX.XX
─────────────────────────────
PRECIO CALCULADO               XXX.XX

Precio comercial               XXX.XX
```

Los números son únicamente ilustrativos.

---

# 9. Precio calculado vs precio final

Esto es MUY importante.

El sistema debe diferenciar:

### Precio calculado

El precio matemáticamente resultante del modelo.

### Precio sugerido

El precio que el sistema recomienda.

### Precio final/aprobado

El precio que el usuario decide utilizar.

Ejemplo:

```text
Costo total:        496.68 CUP

Utilidad:             15 %

Precio calculado:    646.18 CUP

Precio sugerido:     650.00 CUP

Precio aprobado:    650.00 CUP
```

El usuario debe poder introducir manualmente el precio final.

El sistema debe recalcular entonces:

* utilidad real;
* margen real;
* rentabilidad;
* diferencia entre precio calculado y precio aprobado.

---

# 10. Impuestos y tributos

No codificar impuestos rígidamente.

Debe existir una sección configurable:

```text
Tributos

Nombre                   Tipo          Valor
─────────────────────────────────────────────
Impuesto sobre ventas    Porcentaje     10 %
Otro impuesto            Porcentaje      5 %
```

Cada tributo debe permitir definir:

* nombre;
* porcentaje o importe;
* base de cálculo;
* si está incluido/excluido;
* activo/inactivo.

La base puede ser, dependiendo de la configuración:

```text
Costo total
+
Utilidad
+
Precio calculado
+
otra base configurable
```

---

# 11. Plantillas de costeo

Quiero que el sistema permita crear:

> Plantillas de formación de costos.

Por ejemplo:

### Plantilla estándar

```text
Materias primas
Mano de obra
Costos indirectos
Gastos generales
Utilidad
Impuestos
```

### Plantilla manufactura

```text
Materias primas
Materiales
Mano de obra directa
Costos indirectos de fabricación
Gastos generales
Utilidad
Impuestos
```

### Plantilla servicios

```text
Mano de obra
Materiales
Transporte
Gastos operativos
Gastos administrativos
Utilidad
Impuestos
```

El usuario puede crear sus propias plantillas.

---

# 12. Versionado

Una ficha no debería sobrescribirse destructivamente.

Ejemplo:

```text
Cerveza Parranda 500 ml

Ficha #001
Fecha: 2026-08-01
Costo total: 420 CUP
Precio: 550 CUP

Ficha #002
Fecha: 2026-08-22
Costo total: 496.68 CUP
Precio: 650 CUP
```

Debe ser posible consultar versiones anteriores.

Idealmente:

```text
Borrador
→ Revisada
→ Aprobada
→ Vigente
→ Reemplazada
```

---

# 13. Auditoría

Registrar:

* quién creó la ficha;
* quién modificó un concepto;
* fecha;
* valores anteriores;
* valores nuevos;
* quién aprobó;
* cuándo fue aprobada.

Esto es importante para trazabilidad.

---

# 14. UX/UI

No quiero una interfaz que parezca una hoja de Excel incrustada.

Debe sentirse como un módulo profesional del sistema de inventario.

Utilizar:

* tarjetas;
* tablas editables;
* formularios dinámicos;
* resumen lateral;
* indicadores;
* badges;
* estados;
* cálculos en tiempo real;
* validaciones;
* tooltips explicativos.

El usuario debería poder agregar conceptos mediante:

> * Agregar concepto

y elegir:

```text
Tipo
├── Costo directo
├── Mano de obra
├── Costo indirecto
├── Gasto general
├── Impuesto
└── Otro
```

---

# 15. Arquitectura

Antes de implementar, analiza la arquitectura actual del proyecto.

NO crees código inmediatamente.

Primero:

1. Analiza el stack existente.
2. Analiza modelos relacionados con:

   * productos;
   * inventario;
   * almacenes;
   * costos;
   * precios;
   * monedas;
   * usuarios.
3. Determina qué entidades existentes pueden reutilizarse.
4. Determina qué nuevas entidades son necesarias.
5. Propón las relaciones.
6. Propón las migraciones.
7. Propón los servicios/clases responsables del cálculo.
8. Propón cómo mantener el cálculo independiente de la UI.
9. Propón pruebas automatizadas.

Quiero evitar duplicar lógica existente.

---

# 16. Motor de cálculo

El cálculo NO debe estar disperso dentro de los componentes frontend.

Crear una capa de dominio/servicio claramente responsable de:

```text
CostCalculationEngine
```

o un nombre equivalente acorde con la arquitectura actual.

El motor debe recibir una estructura de datos y devolver un resultado calculado.

Conceptualmente:

```text
Input
 ↓
CostCalculationEngine
 ↓
DirectCosts
IndirectCosts
GeneralExpenses
Taxes
Profit
 ↓
CalculationResult
```

El resultado debería contener como mínimo:

```text
direct_cost
labor_cost
indirect_cost
general_expenses
total_cost
profit
taxes
calculated_price
suggested_price
final_price
real_profit
real_margin
```

---

# 17. Reglas importantes

### Regla 1

No modificar automáticamente el inventario al calcular.

### Regla 2

No sobrescribir una ficha aprobada.

### Regla 3

Toda modificación importante debe generar una nueva versión.

### Regla 4

Los porcentajes deben ser configurables.

### Regla 5

Las fórmulas deben ser transparentes para el usuario.

### Regla 6

El usuario debe poder editar los conceptos.

### Regla 7

Los cálculos deben ser reproducibles.

### Regla 8

Guardar las tasas de cambio utilizadas.

### Regla 9

No asumir que todos los negocios utilizan la misma estructura de costos.

### Regla 10

La metodología inicial debe estar inspirada en las hojas Excel proporcionadas, pero el sistema debe ser extensible.

---

# 18. Validación con los Excel proporcionados

Utiliza:

* `cerveza parranda.xlsx`
* `malta.xlsx`

como casos de prueba.

Analiza sus fórmulas y estructura.

Identifica:

* conceptos;
* fórmulas;
* porcentajes;
* bases de cálculo;
* dependencias entre celdas;
* costos;
* gastos;
* utilidad;
* impuestos;
* precio final.

Después crea pruebas automatizadas donde sea posible.

El objetivo es que, utilizando los mismos valores de entrada, el nuevo motor produzca resultados equivalentes a la lógica de las hojas originales.

Si encuentras inconsistencias o fórmulas ambiguas en las hojas, NO las ocultes.

Documenta:

```text
Excel original
→ comportamiento detectado
→ interpretación
→ comportamiento propuesto
```

---

# 19. Dashboard del módulo

El módulo debería tener una vista general con:

* fichas activas;
* fichas pendientes;
* fichas aprobadas;
* fichas vencidas/reemplazadas;
* productos sin ficha de costo;
* productos cuyo costo aumentó;
* productos con margen insuficiente;
* productos cuyo precio actual está por debajo del costo.

También sería interesante mostrar:

```text
Productos
───────────────
125 con ficha
18 sin ficha
7 con costo actualizado
12 con margen < 10 %
4 vendidos por debajo del costo
```

---

# 20. Resultado esperado

No quiero que simplemente agregues una página con una calculadora.

Quiero incorporar al sistema un **módulo completo de Formación de Costos y Precios**, integrado con inventario, productos y precios, pero suficientemente desacoplado para poder evolucionar posteriormente hacia:

* análisis de rentabilidad;
* costo de reposición;
* inflación;
* historial de costos;
* análisis de variación;
* múltiples monedas;
* escenarios;
* presupuestos;
* comparación costo vs precio;
* reportes;
* exportación PDF/Excel.

---

## Antes de programar

Primero entrégame:

### A. Análisis de la arquitectura actual

Qué existe y qué podemos reutilizar.

### B. Modelo de datos propuesto

Entidades, campos y relaciones.

### C. Flujo funcional

Desde crear la ficha hasta aprobar/aplicar el precio.

### D. Motor de cálculo

Explicar las fórmulas y reglas.

### E. Diseño UX

Explicar las pantallas y componentes.

### F. Plan de implementación

Dividirlo en fases pequeñas.

### G. Riesgos

Identificar posibles problemas de arquitectura, precisión decimal, concurrencia, versionado, auditoría y consistencia de datos.

**No implementes nada hasta presentar primero este análisis y esperar mi aprobación.**
