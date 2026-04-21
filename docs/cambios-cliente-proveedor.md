# Cliente puede ser Proveedor

## Caso de Uso

Un cliente físico puede también ser proveedor (venta al negocio). Ejemplo: una empresa que compra pero también vende.

## Solución Simple

En el dropdown de proveedores del formulario de compras, agregar los clientes de tipo "fisico".

## Pendiente

- [ ] Modificar endpoint `compras.proveedores` para devolver clientes físicos
- [ ] En el select de proveedores, mostrar clientes con indicador "(Cliente)"
- [ ] Si el usuario selecciona un cliente nuevo, preguntarle si guardarlo como cliente o proveedor
