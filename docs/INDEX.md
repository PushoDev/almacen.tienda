# Documentación — almacen.tienda

> Índice central de toda la documentación del proyecto. Empieza aquí.

---

## Lectura obligatoria antes de tocar código

| Documento | Por qué leerlo |
|---|---|
| [context.md](context.md) | Contexto completo: dominio, entidades, roles, lógica de negocio |
| [ESTADO_DESARROLLO.md](ESTADO_DESARROLLO.md) | Qué está hecho, qué bugs existen, qué falta — **actualizar siempre** |
| [guia-desarrollo.md](guia-desarrollo.md) | Cómo levantar el proyecto, comandos, entorno |

---

## Por módulo

### Ventas y POS
| Documento | Contenido |
|---|---|
| [ventas/flujos-venta.md](ventas/flujos-venta.md) | Flujos completos: normal, especial, gestor, mensajero |
| [ventas/contexto-actual.md](ventas/contexto-actual.md) | Estado actual del código de ventas, métodos del controlador, campos clave |
| [flujos-financieros-comision-mensajero.md](flujos-financieros-comision-mensajero.md) | Cómo funcionan los flujos financieros paralelos (comisión, mensajero, gestor) |
| [comision-vendedor-gestor-2026-05-25.md](comision-vendedor-gestor-2026-05-25.md) | Implementación del tracking de comisiones — fórmulas y cambios |

### Cierre de Caja
| Documento | Contenido |
|---|---|
| [ventas/pendiente-cierre-caja.md](ventas/pendiente-cierre-caja.md) | Estado actual del cierre, problemas resueltos, features añadidos |
| [comparativa-cierres.md](comparativa-cierres.md) | Explicación de la sección de comparativa con cierre anterior |
| [PLAN_Actualizar_Show_Cierres.md](PLAN_Actualizar_Show_Cierres.md) | Plan original para actualizar la vista Show del cierre |

### Mensajero
| Documento | Contenido |
|---|---|
| [pendiente-arreglar-mensajero.md](pendiente-arreglar-mensajero.md) | Ajustes pendientes del flujo de mensajero |

### Bot de Telegram
| Documento | Contenido |
|---|---|
| [TELEGRAM_BOT_PLAN.md](TELEGRAM_BOT_PLAN.md) | Plan completo de implementación con código, paso a paso |

### Base de Datos
| Documento | Contenido |
|---|---|
| [base-de-datos.md](base-de-datos.md) | Tablas principales, campos clave y relaciones |

### Productos
| Documento | Contenido |
|---|---|
| [codebar-ventas-y-fixes-2026-05-21.md](codebar-ventas-y-fixes-2026-05-21.md) | Sistema de códigos de barras y fixes de ventas |
| [plantilla-importar-productos.md](plantilla-importar-productos.md) | Cómo funciona la importación masiva de productos |
| [precios-vendedor-export-import.md](precios-vendedor-export-import.md) | Export/import de precios por vendedor vía Excel |

### Arquitectura y API
| Documento | Contenido |
|---|---|
| [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md) | Diagrama de arquitectura del sistema |
| [API_PUBLIC_CATALOG.md](API_PUBLIC_CATALOG.md) | Endpoints de la API pública de catálogo (sin auth) |
| [TECHNICAL_ANALYSIS.md](TECHNICAL_ANALYSIS.md) | Análisis técnico del stack y patrones |

### Otros
| Documento | Contenido |
|---|---|
| [cambios-cliente-proveedor.md](cambios-cliente-proveedor.md) | Cambios en el módulo de clientes/proveedores |
| [newforsale.md](newforsale.md) | Nuevas features para ventas |

---

## Convenciones del proyecto

- **Nombres en español**: modelos, columnas, rutas, vistas, variables.
- **Roles**: `admin` > `moderador` > `vendedor` — filtrar siempre con `in_array($user->role, [...])`.
- **Transacciones DB**: toda operación crítica usa `DB::beginTransaction()` con rollback.
- **Stock al crear**: el stock se descuenta al *crear* la venta (reserva), no al aprobar.
- **Financiero al aprobar**: saldos de cuentas y deudas de clientes solo se mueven al aprobar.
- **Mensajero es pass-through**: nunca incluir en cálculos de comisión ni cambiarios.
- **XOR comisión**: gestor Y vendedor son mutuamente excluyentes por venta.
