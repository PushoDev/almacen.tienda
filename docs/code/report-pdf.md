# Generación de Invoice PDF – Laravel + React + Inertia

## Contexto del proyecto
Estoy desarrollando una aplicación web usando **Laravel (backend)**, **React (frontend)** y **Inertia.js** como puente de comunicación entre ambos.

Necesito implementar un sistema profesional para **generar facturas (Invoice) en PDF**, basado en un diseño corporativo moderno y minimalista.

---

## Objetivo
Generar una solución completa para:
- Visualizar una factura (preview)
- Generar y descargar un **PDF profesional**

El sistema debe ser **estable, escalable y listo para producción**.

---

## Requisitos técnicos

### Backend (Laravel)
- Crear un `InvoiceController`
- Endpoint para:
  - Visualizar el PDF en el navegador
  - Descargar el PDF
- Usar una librería PDF estable:
  - `barryvdh/laravel-dompdf` **o**
  - `wkhtmltopdf` (Snappy)
- Vista **Blade exclusiva para el PDF**
- Datos dinámicos:
  - Empresa (nombre, logo, contacto)
  - Cliente (nombre, dirección)
  - Número de factura
  - Fecha
  - Items:
    - Descripción
    - Precio
    - Cantidad
    - Total por ítem
  - Subtotal
  - Impuestos
  - Descuento
  - Total final
- Soporte para múltiples ítems
- Código limpio y comentado

---

### Frontend (React + Inertia)
- Componente React para **preview de la factura**
- Botón **“Descargar PDF”**
- Envío de datos al backend mediante Inertia
- El PDF **NO debe depender de React**
- Separación clara entre UI y generación del documento

---

## Diseño del PDF

El diseño debe seguir una estructura profesional tipo invoice:

1. **Header**
   - Logo
   - Nombre de la empresa
   - Título grande: `INVOICE`
   - Número de factura

2. **Información**
   - Datos del cliente
   - Metadatos (fecha, invoice number)

3. **Tabla principal**
   - Columnas:
     - Nº
     - Descripción
     - Precio
     - Cantidad
     - Total
   - Filas alternadas para legibilidad
   - Descripción con título y texto secundario

4. **Totales**
   - Subtotal
   - Tax
   - Discount
   - **Grand Total destacado**

5. **Footer**
   - Firma (imagen)
   - Nombre y cargo
   - Información de contacto
   - Mensaje de agradecimiento

---

## Reglas de estilo para PDF
- HTML semántico
- CSS compatible con PDF:
  - Sin JavaScript
  - Sin animaciones
  - Layout estable
  - Evitar `flex` complejo o dinámico
- Tipografías seguras
- Colores sobrios (rojo, gris, blanco)

---

## Extras deseables
- Encabezado repetido en múltiples páginas
- Manejo correcto de saltos de página
- Ejemplo de datos mock
- Estructura de carpetas recomendada

---

## Resultado esperado
- Código completo y funcional
- Controller Laravel
- Vista Blade del PDF
- Componente React con integración Inertia
- Ejemplo listo para ejecutar
