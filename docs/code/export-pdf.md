<AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="hover:bg-chart-5 flex cursor-pointer items-center gap-2">
                                <FileText size={16} />
                                Exportar PDF
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-3xl">
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    <div className="flex items-center justify-center">
                                        <AppLogoIcon />
                                    </div>
                                </AlertDialogTitle>
                            </AlertDialogHeader>
                            <div className="max-h-[70vh] overflow-y-auto">
                                <div className="p-6">
                                    <div className="mb-6 text-center">
                                        <AppLogoIcon />
                                        <h1 className="mt-4 text-xl font-bold">REPORTE DE VENTA</h1>
                                        <p className="text-sm text-gray-600">Venta #: {currentVenta.id}</p>
                                        <p className="text-sm text-gray-600">Fecha: {formatDate(currentVenta.fecha)}</p>
                                    </div>

                                    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <h3 className="border-b pb-1 font-semibold">Almacén</h3>
                                            <p>{currentVenta.almacen.nombre}</p>
                                        </div>

                                        <div>
                                            <h3 className="border-b pb-1 font-semibold">Cliente</h3>
                                            <p>{currentVenta.cliente ? currentVenta.cliente.nombre : 'Cliente no especificado'}</p>
                                        </div>
                                    </div>

                                    {currentVenta.destinatario && (
                                        <div className="mb-6">
                                            <h3 className="border-b pb-1 font-semibold">Datos del Receptor</h3>
                                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                                <p>
                                                    <span className="font-medium">Nombre:</span> {currentVenta.destinatario.nombre}{' '}
                                                    {currentVenta.destinatario.apellidos}
                                                </p>
                                                <p>
                                                    <span className="font-medium">CI:</span> {currentVenta.destinatario.carnet_identidad}
                                                </p>
                                                <p>
                                                    <span className="font-medium">Teléfono:</span>{' '}
                                                    {currentVenta.destinatario.telefono_contacto || 'No especificado'}
                                                </p>
                                                <p>
                                                    <span className="font-medium">Dirección:</span>{' '}
                                                    {currentVenta.destinatario.direccion_residencia || 'No especificada'}
                                                </p>
                                                <p>
                                                    <span className="font-medium">Parentesco:</span>{' '}
                                                    {currentVenta.destinatario.parentesco_cliente || 'No especificado'}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-6">
                                        <h3 className="border-b pb-1 font-semibold">Productos Vendidos</h3>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead>
                                                    <tr>
                                                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                            Producto
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                            Cant
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                            Precio Unitario
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                            Costo Unitario
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                            Ganancia Unitaria
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                                            Subtotal
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {currentVenta.items.map((item, index) => (
                                                        <tr key={index}>
                                                            <td className="px-4 py-2 text-sm">
                                                                {item.producto.nombre} - {item.producto.marca} ({item.producto.categoria})
                                                            </td>
                                                            <td className="px-4 py-2 text-sm">{item.cantidad}</td>
                                                            <td className="px-4 py-2 text-sm">
                                                                {formatCurrency(item.precio_venta, simboloMonedaPrincipal)}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm">
                                                                {formatCurrency(item.costo_unitario, simboloMonedaPrincipal)}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm">
                                                                {formatCurrency(item.ganancia, simboloMonedaPrincipal)}
                                                            </td>
                                                            <td className="px-4 py-2 text-sm">
                                                                {formatCurrency(item.subtotal, simboloMonedaPrincipal)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="font-semibold">
                                                    <tr>
                                                        <td colSpan={5} className="px-4 py-2 text-right">
                                                            TOTAL:
                                                        </td>
                                                        <td className="px-4 py-2">{formatCurrency(currentVenta.total, simboloMonedaPrincipal)}</td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="border-b pb-1 font-semibold">Detalles de Pago</h3>
                                        {currentVenta.pagos.length > 0 ? (
                                            currentVenta.pagos.map((pago, index) => {
                                                const simboloMonedaPago = getCurrencySymbol(pago.moneda);
                                                return (
                                                    <div key={index} className="mb-2 rounded border p-3">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <p>
                                                                <span className="font-medium">Método:</span> {pago.metodo}
                                                            </p>
                                                            <p>
                                                                <span className="font-medium">Moneda:</span>{' '}
                                                                {pago.moneda?.nombre || 'No especificada'}
                                                            </p>
                                                            <p>
                                                                <span className="font-medium">Monto Original:</span>{' '}
                                                                {formatCurrency(pago.monto, simboloMonedaPago)}
                                                            </p>
                                                            <p>
                                                                <span className="font-medium">Equivalente USD:</span>{' '}
                                                                {formatCurrency(pago.monto_equivalente, 'USD')}
                                                            </p>
                                                            <p>
                                                                <span className="font-medium">Tasa Cambio:</span>{' '}
                                                                {Number(pago.tasa_cambio)?.toFixed(2) || '0.00'}
                                                            </p>
                                                            <p>
                                                                <span className="font-medium">Destino:</span>{' '}
                                                                {pago.cliente_destino?.nombre
                                                                    ? `Cliente: ${pago.cliente_destino.nombre}`
                                                                    : pago.cuenta?.nombre
                                                                      ? `${pago.cuenta.nombre} (${pago.cuenta.moneda?.nombre || 'Sin moneda'})`
                                                                      : 'No especificado'}
                                                            </p>
                                                            {pago.via && (
                                                                <p>
                                                                    <span className="font-medium">Vía:</span> {pago.via}
                                                                </p>
                                                            )}
                                                            {pago.referencia && (
                                                                <p>
                                                                    <span className="font-medium">Referencia:</span> {pago.referencia}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <p>No hay pagos registrados</p>
                                        )}
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="border-b pb-1 font-semibold">Resumen Financiero</h3>
                                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                            <p>
                                                <span className="font-medium">Total de la Venta:</span>{' '}
                                                {formatCurrency(currentVenta.total, simboloMonedaPrincipal)}
                                            </p>
                                            <p>
                                                <span className="font-medium">Total Pagado:</span>{' '}
                                                {formatCurrency(currentVenta.total_pagado, simboloMonedaPrincipal)}
                                            </p>
                                            <p>
                                                <span className="font-medium">Restante por Pagar:</span>{' '}
                                                {formatCurrency(currentVenta.restante, simboloMonedaPrincipal)}
                                            </p>
                                            <p>
                                                <span className="font-medium">Ganancia Operacional:</span>{' '}
                                                {formatCurrency(currentVenta.total_ganancia, simboloMonedaPrincipal)}
                                            </p>
                                            <p>
                                                <span className="font-medium">Ganancia/Pérdida Cambiaria:</span>{' '}
                                                <span className={currentVenta.ganancia_perdida_cambiaria >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                    {formatCurrency(currentVenta.ganancia_perdida_cambiaria, simboloMonedaPrincipal)}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="font-medium">Ganancia Real Total:</span>{' '}
                                                <span className="font-bold text-blue-600">
                                                    {formatCurrency(currentVenta.ganancia_real_total, simboloMonedaPrincipal)}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="font-medium">Estado:</span> {currentVenta.estado}
                                            </p>
                                            <p>
                                                <span className="font-medium">Tasa Cambio Principal:</span> 1 {simboloMonedaPrincipal} ={' '}
                                                {Number(currentVenta.tasa_cambio_principal)?.toFixed(2) || '0.00'}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="border-b pb-1 font-semibold">Información del Vendedor</h3>
                                        <p>
                                            <span className="font-medium">Nombre:</span> {currentVenta.usuario.nombre}
                                        </p>
                                        <p>
                                            <span className="font-medium">Rol:</span> {currentVenta.usuario.rol}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <AlertDialogFooter>
                                <Button
                                    variant="secondary"
                                    onClick={async () => {
                                        try {
                                            // Importar jsPDF y jspdf-autotable
                                            const { jsPDF } = await import('jspdf');
                                            await import('jspdf-autotable');

                                            // Crear un nuevo documento PDF
                                            const doc = new jsPDF();

                                            // Agregar título
                                            doc.setFontSize(18);
                                            doc.text('REPORTE DE VENTA', 105, 20, null, null, 'center');

                                            // Agregar información básica
                                            doc.setFontSize(12);
                                            doc.text(`Venta #: ${currentVenta.id}`, 20, 40);
                                            doc.text(`Fecha: ${formatDate(currentVenta.fecha)}`, 20, 50);
                                            doc.text(`Almacén: ${currentVenta.almacen.nombre}`, 20, 60);
                                            doc.text(
                                                `Cliente: ${currentVenta.cliente ? currentVenta.cliente.nombre : 'Cliente no especificado'}`,
                                                20,
                                                70,
                                            );

                                            // Agregar información del destinatario si existe
                                            let startY = 80;
                                            if (currentVenta.destinatario) {
                                                doc.text('Datos del Receptor:', 20, startY);
                                                startY += 10;
                                                doc.text(
                                                    `Nombre: ${currentVenta.destinatario.nombre} ${currentVenta.destinatario.apellidos}`,
                                                    20,
                                                    startY,
                                                );
                                                startY += 10;
                                                doc.text(`CI: ${currentVenta.destinatario.carnet_identidad}`, 20, startY);
                                                startY += 10;
                                                if (currentVenta.destinatario.telefono_contacto) {
                                                    doc.text(`Teléfono: ${currentVenta.destinatario.telefono_contacto}`, 20, startY);
                                                    startY += 10;
                                                }
                                                if (currentVenta.destinatario.direccion_residencia) {
                                                    doc.text(`Dirección: ${currentVenta.destinatario.direccion_residencia}`, 20, startY);
                                                    startY += 10;
                                                }
                                                if (currentVenta.destinatario.parentesco_cliente) {
                                                    doc.text(`Parentesco: ${currentVenta.destinatario.parentesco_cliente}`, 20, startY);
                                                    startY += 10;
                                                }
                                                startY += 10;
                                            }

                                            // Agregar tabla de productos
                                            const productosData = currentVenta.items.map((item) => [
                                                `${item.producto.nombre} - ${item.producto.marca} (${item.producto.categoria})`,
                                                item.cantidad.toString(),
                                                formatCurrency(item.precio_venta, simboloMonedaPrincipal),
                                                formatCurrency(item.costo_unitario, simboloMonedaPrincipal),
                                                formatCurrency(item.ganancia, simboloMonedaPrincipal),
                                                formatCurrency(item.subtotal, simboloMonedaPrincipal),
                                            ]);

                                            // Configurar idioma español para la tabla
                                            (doc as any).autoTable({
                                                startY: startY,
                                                head: [['Producto', 'Cant', 'Precio Unitario', 'Costo Unitario', 'Ganancia Unitaria', 'Subtotal']],
                                                body: productosData,
                                                margin: { top: startY, right: 20, bottom: 20, left: 20 },
                                                styles: {
                                                    fontSize: 10,
                                                },
                                                headStyles: {
                                                    fillColor: [59, 130, 246], // bg-blue-500
                                                },
                                            });

                                            // Agregar resumen financiero
                                            const finalY = (doc as any).lastAutoTable.finalY || startY;
                                            doc.text(
                                                `Total de la Venta: ${formatCurrency(currentVenta.total, simboloMonedaPrincipal)}`,
                                                20,
                                                finalY + 20,
                                            );
                                            doc.text(
                                                `Total Pagado: ${formatCurrency(currentVenta.total_pagado, simboloMonedaPrincipal)}`,
                                                20,
                                                finalY + 30,
                                            );
                                            doc.text(
                                                `Restante por Pagar: ${formatCurrency(currentVenta.restante, simboloMonedaPrincipal)}`,
                                                20,
                                                finalY + 40,
                                            );
                                            doc.text(
                                                `Ganancia Operacional: ${formatCurrency(currentVenta.total_ganancia, simboloMonedaPrincipal)}`,
                                                20,
                                                finalY + 50,
                                            );
                                            if (currentVenta.estado === 'completada') {
                                                doc.text(
                                                    `Ganancia/Pérdida Cambiaria: ${formatCurrency(currentVenta.ganancia_perdida_cambiaria, simboloMonedaPrincipal)}`,
                                                    20,
                                                    finalY + 60,
                                                );
                                                doc.text(
                                                    `Ganancia Real Total: ${formatCurrency(currentVenta.ganancia_real_total, simboloMonedaPrincipal)}`,
                                                    20,
                                                    finalY + 70,
                                                );
                                                doc.text(`Estado: ${currentVenta.estado}`, 20, finalY + 80);
                                            } else {
                                                doc.text(`Estado: ${currentVenta.estado}`, 20, finalY + 60);
                                            }

                                            // Guardar el PDF
                                            doc.save(`venta_${currentVenta.id}_reporte.pdf`);

                                            toast.success('PDF generado exitosamente');
                                        } catch (error) {
                                            console.error('Error al generar PDF:', error);
                                            toast.error('No se pudo generar el PDF. Asegúrate de tener las dependencias instaladas correctamente.');
                                        }
                                    }}
                                >
                                    Exportar PDF
                                </Button>
                                <AlertDialogCancel className="bg-destructive hover:bg-destructive-foreground cursor-pointer text-white">
                                    Cerrar
                                </AlertDialogCancel>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
