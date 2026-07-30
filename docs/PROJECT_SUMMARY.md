# Project Summary: almacen.tienda

**ERP / POS multi-almacén** para tienda física con control multi-moneda (USD/CUP/MLC), inventario, ventas, compras, logística, comisiones, cierres de caja y bot de Telegram.

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Laravel 12, PHP 8.2+ |
| Frontend | React 19, TypeScript 5.9, Inertia v2 (SPA) |
| UI | Tailwind CSS 4, Radix UI, shadcn/ui, Lucide React |
| Build | Vite 7 |
| DB | MySQL 8.4+ |
| Testing | Pest PHP |
| Roles | spatie/laravel-permission (admin / moderador / vendedor) |
| Bot | irazasyed/telegram-bot-sdk v3 |
| Auth | Laravel Sanctum |

## Módulos principales

| Módulo | Estado |
|---|---|
| Productos (CRUD + códigos de barras + import/export Excel + duplicados) | ✅ Estable |
| Almacenes (multi-almacén + inventario + usuarios) | ✅ Estable |
| Ventas POS (multi-moneda, especial, gestor, mensajero, comisiones) | ✅ Estable |
| Compras (pagos múltiples, distribución de costos) | ✅ Estable |
| Movimientos de stock (traslados, estados, auditoría) | ✅ Estable |
| Cuentas financieras (control saldo, tipo_titular, resumen KPIs) | ✅ Estable |
| Monedas y tasas de cambio (USD/CUP/MLC, historial) | ✅ Estable |
| Transacciones financieras (gastos, ingresos, transferencias) | 🟡 75% |
| Cierre de caja (snapshots, comparativas, mensajero) | ✅ Estable |
| Reportes (16 vistas: ventas, compras, inventario, ganancias, etc.) | ✅ Estable |
| Logística (dashboard KPIs con capitales y resúmenes) | ✅ Estable |
| Bot de Telegram (notificaciones, comandos, aprobar/rechazar) | ✅ Estable |
| API Pública (catálogo sin auth para e-commerce) | ✅ Básico |
| Notificaciones (database + Telegram) | ✅ Estable |
| Settings (perfil, contraseña, apariencia, vinculación Telegram) | ✅ Estable |
| Remesas (control de envíos) | ✅ Básico |
| Usuarios y empleados (roles, asignación almacenes/cuentas) | ✅ Estable |

## Rama activa

`feature/desarrollo-caliente`

## Bugs activos

| ID | Descripción |
|---|---|
| B4 | Selector cuenta mensajero mezcla USD/CUP/MLC en Almacenes/Edit |
| B5 | Config mensajero debería estar en Empleados/Edit, no en Almacenes/Edit |

## Features pendientes

| ID | Descripción | Prioridad |
|---|---|---|
| F1 | Selector XOR visual PV/Gestor en distribución | Alta |
| F2 | Display mensajero multi-moneda completo | Media |
| F3 | Mover config mensajero de Almacenes a Empleados | Media |
| F4 | ganancia_real_total muestra 0 en algunos casos | Media |
| F5 | Selector de paginación en listado productos | Baja |

## Convenciones

- Nombres en español (modelos, columnas, rutas, vistas)
- Transacciones DB en operaciones críticas
- Stock se descuenta al crear la venta (reserva)
- Financiero solo se mueve al aprobar
- Mensajero es pass-through (no afecta comisiones ni cambiaria)
- XOR: gestor y comisión vendedor son mutuamente excluyentes
