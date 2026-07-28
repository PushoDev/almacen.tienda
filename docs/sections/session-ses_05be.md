# Análisis flujo venta VentaController

**Session ID:** ses_05be5ddb0ffeM5CVcB5kC6wdnK
**Created:** 7/27/2026, 11:03:23 AM
**Updated:** 7/27/2026, 11:09:40 AM

---

## User

Necesito que analices @app/Http/Controllers/VentaController.php no te saltes nada, y hablame dl flujo que realiza el usuario para procesar una venta

---

## Assistant (Plan · DeepSeek V4 Flash Free · 6.1s)

_Thinking:_

The user wants me to analyze the VentaController.php file and explain the flow a user follows to process a sale. They said "no te saltes nada" (don't skip anything). Let me first read the rest of the file since it was truncated at line 1079, then provide a comprehensive analysis.

Let me read the rest of the file.

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Http/Controllers/VentaController.php",
  "offset": 1080
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Http/Controllers/VentaController.php</path>
<type>file</type>
<content>
1080:                     Notification::send($admins, new VentaCreadaNotification($venta));
1081:                 }
1082:             } catch (\Exception $e) {
1083:                 \Log::error('Error enviando notificación de venta: ' . $e->getMessage());
1084:             }
1085: 
1086:             return response()->json([
1087:                 'success' => true,
1088:                 'message' => 'Venta creada correctamente.',
1089:                 'redirect' => route('ventas.show', $venta->id)
1090:             ]);
1091:         } catch (\Exception $e) {
1092:             DB::rollBack();
1093:             \Log::error('Error al procesar venta: ' . $e->getMessage());
1094: 
1095:             return response()->json([
1096:                 'success' => false,
1097:                 'message' => 'Error al procesar la venta: ' . $e->getMessage()
1098:             ], 500);
1099:         }
1100:     }
1101: 
1102: 
1103:     /**
1104:      * Guarda o actualiza el destinatario de una venta pendiente
1105:      */
1106:     /**
1107:      * Guarda o actualiza el destinatario de una venta pendiente
1108:      * Permite duplicados libremente - cada venta tiene su registro independiente
1109:      */
1110:     public function guardarDestinatario(Request $request, Venta $venta)
1111:     {
1112:         if ($venta->estado !== 'pendiente') {
1113:             return response()->json([
1114:                 'success' => false,
1115:                 'message' => 'Solo se puede modificar el receptor en ventas pendientes.'
1116:             ], 403);
1117:         }
1118: 
1119:         $validated = $request->validate([
1120:             'nombre' => 'required|string|max:100',
1121:             'apellidos' => 'required|string|max:100',
1122:             'carnet_identidad' => 'nullable|string|size:11|regex:/^\d+$/',
1123:             'direccion_residencia' => 'nullable|string|max:500',
1124:             'telefono_contacto' => 'nullable|string|max:20',
1125:             'parentesco_cliente' => 'nullable|string|max:100',
1126:             'observaciones' => 'nullable|string|max:500',
1127:             // Campos opcionales del gestor
1128:             'es_venta_gestor' => 'nullable|boolean',
1129:             'gestor_monto' => 'nullable|numeric|min:0',
1130:             'gestor_cuenta_id' => 'nullable|exists:cuentas,id',
1131:             'gestor_comentario' => 'nullable|string|max:500',
1132:             'tasa_aplicada_venta' => 'nullable|numeric|min:0.0001',
1133:             'tasa_aplicada_gestor' => 'nullable|numeric|min:0.0001',
1134:         ]);
1135: 
1136:         if ($request->filled('carnet_identidad')) {
1137:             $validated['carnet_identidad'] = preg_replace('/\D/', '', $validated['carnet_identidad']);
1138:         }
1139: 
1140:         // Validar datos del gestor si está activado
1141:         if ($request->boolean('es_venta_gestor')) {
1142:             if (empty($validated['gestor_cuenta_id'])) {
1143:                 return response()->json([
1144:                     'success' => false,
1145:                     'message' => 'Debe seleccionar una cuenta del gestor'
1146:                 ], 422);
1147:             }
1148:             if (empty($validated['gestor_monto']) || $validated['gestor_monto'] <= 0) {
1149:                 return response()->json([
1150:                     'success' => false,
1151:                     'message' => 'El monto del gestor debe ser mayor a 0'
1152:                 ], 422);
1153:             }
1154:             if (empty($validated['tasa_aplicada_gestor'])) {
1155:                 return response()->json([
1156:                     'success' => false,
1157:                     'message' => 'Debe ingresar la tasa aplicada del gestor'
1158:                 ], 422);
1159:             }
1160:         }
1161: 
1162:         DB::transaction(function () use ($venta, $validated, $request) {
1163:             // Guardar destinatario
1164:             if ($venta->destinatario) {
1165:                 $venta->destinatario->update($validated);
1166:             } else {
1167:                 $venta->destinatario()->create($validated);
1168:             }
1169: 
1170:             // Guardar datos del gestor si es que vienen
1171:             if ($request->boolean('es_venta_gestor')) {
1172:                 $venta->update([
1173:                     'es_venta_gestor' => true,
1174:                     'gestor_monto' => $validated['gestor_monto'] ?? 0,
1175:                     'gestor_cuenta_id' => !empty($validated['gestor_cuenta_id']) ? (int) $validated['gestor_cuenta_id'] : null,
1176:                     'gestor_comentario' => $validated['gestor_comentario'] ?? null,
1177:                     'tasa_aplicada_venta' => !empty($validated['tasa_aplicada_venta']) ? (float) $validated['tasa_aplicada_venta'] : null,
1178:                     'tasa_aplicada_gestor' => !empty($validated['tasa_aplicada_gestor']) ? (float) $validated['tasa_aplicada_gestor'] : null,
1179:                 ]);
1180:             } else {
1181:                 // Si no es venta con gestor, limpiar los datos
1182:                 $venta->update([
1183:                     'es_venta_gestor' => false,
1184:                     'gestor_monto' => 0,
1185:                     'gestor_cuenta_id' => null,
1186:                     'gestor_comentario' => null,
1187:                     'tasa_aplicada_venta' => null,
1188:                     'tasa_aplicada_gestor' => null,
1189:                 ]);
1190:             }
1191:         });
1192: 
1193:         // Refrescar el modelo y relaciones para devolver datos actualizados
1194:         // inmediatamente al frontend (sin necesidad de F5).
1195:         $venta->refresh()->load(['destinatario', 'gestorCuenta.moneda']);
1196: 
1197:         return response()->json([
1198:             'success' => true,
1199:             'message' => 'Información del receptor guardada correctamente',
1200:             'destinatario' => $venta->destinatario ? [
1201:                 'id' => $venta->destinatario->id,
1202:                 'nombre' => $venta->destinatario->nombre,
1203:                 'apellidos' => $venta->destinatario->apellidos,
1204:                 'carnet_identidad' => $venta->destinatario->carnet_identidad,
1205:                 'direccion_residencia' => $venta->destinatario->direccion_residencia,
1206:                 'telefono_contacto' => $venta->destinatario->telefono_contacto,
1207:                 'parentesco_cliente' => $venta->destinatario->parentesco_cliente,
1208:                 'observaciones' => $venta->destinatario->observaciones,
1209:             ] : null,
1210:             'gestor' => $venta->es_venta_gestor && $venta->gestor_cuenta_id ? [
1211:                 'monto' => (float) $venta->gestor_monto,
1212:                 'monto_usd' => $venta->tasa_aplicada_gestor > 0
1213:                     ? round((float) $venta->gestor_monto / (float) $venta->tasa_aplicada_gestor, 2)
1214:                     : (float) $venta->gestor_monto,
1215:                 'cuenta_id' => $venta->gestor_cuenta_id,
1216:                 'comentario' => $venta->gestor_comentario,
1217:                 'cuenta_nombre' => $venta->gestorCuenta?->nombre_cuenta,
1218:                 'tasa_aplicada' => $venta->tasa_aplicada_venta ? (float) $venta->tasa_aplicada_venta : null,
1219:                 'tasa_aplicada_gestor' => $venta->tasa_aplicada_gestor ? (float) $venta->tasa_aplicada_gestor : null,
1220:                 'moneda' => $venta->gestorCuenta?->moneda ? [
1221:                     'codigo' => $venta->gestorCuenta->moneda->codigo_moneda,
1222:                     'simbolo' => $venta->gestorCuenta->moneda->simbolo_moneda,
1223:                     'nombre' => $venta->gestorCuenta->moneda->nombre_moneda,
1224:                     'tasa_cambio' => (float) $venta->gestorCuenta->moneda->tasa_cambio,
1225:                 ] : null,
1226:                 'tipo_cuenta' => $venta->gestorCuenta?->tipo,
1227:             ] : null,
1228:             'total_comision' => (float) $venta->total_comision,
1229:         ]);
1230:     }
1231: 
1232: 
1233:     /**
1234:      * Aprobar la venta
1235:      */
1236:     public function aprobarVenta(Venta $venta)
1237:     {
1238:         if ($venta->estado !== 'pendiente') {
1239:             return response()->json(['success' => false, 'message' => 'Ya no está pendiente'], 400);
1240:         }
1241: 
1242:         if (!$venta->destinatario) {
1243:             return response()->json(['success' => false, 'message' => 'Falta receptor'], 400);
1244:         }
1245: 
1246:         if ($venta->mensajero_monto > 0 && !$venta->mensajero_cuenta_id) {
1247:             return response()->json(['success' => false, 'message' => 'Esta venta tiene mensajero pero no se ha asignado la cuenta destino del mensajero'], 400);
1248:         }
1249: 
1250:         if ($venta->mensajero_monto > 0 && !$venta->mensajero_tipo) {
1251:             return response()->json(['success' => false, 'message' => 'Esta venta tiene mensajero pero no se ha definido el tipo (propio o externo)'], 400);
1252:         }
1253: 
1254:         // Validación propio comentada — habilitar cuando se implemente vehículo propio
1255:         // if ($venta->mensajero_monto > 0 && $venta->mensajero_tipo === 'propio' && !$venta->mensajero_cuenta_origen_id) {
1256:         //     return response()->json(['success' => false, 'message' => 'El mensajero propio requiere especificar la cuenta CUP de donde sale el dinero'], 400);
1257:         // }
1258: 
1259:         DB::transaction(function () use ($venta) {
1260:             // 1. Cambiar estado a completada
1261:             $venta->update(['estado' => 'completada']);
1262: 
1263:             // 2. Tasa oficial del CUP para ganancia/perdida cambiaria
1264:             $tasaOficialCUP = DB::table('monedas')
1265:                 ->where('codigo_moneda', 'CUP')
1266:                 ->value('tasa_cambio') ?? 365;
1267: 
1268:             // El mensajero es pass-through — excluirlo del cálculo de ganancia cambiaria
1269:             $mensajero_cup = 0;
1270:             if ($venta->mensajero_monto > 0) {
1271:                 $mensajero_cup = $venta->mensajero_tasa > 0
1272:                     ? round((float) $venta->mensajero_monto * (float) $venta->mensajero_tasa, 2)
1273:                     : (float) $venta->mensajero_monto;
1274:             }
1275: 
1276:             $totalCupPagado     = 0;
1277:             $totalCupContadoUSD = 0;
1278: 
1279:             $gananciaExtraUSD = 0;
1280: 
1281:             foreach ($venta->pagos as $pago) {
1282:                 // Acumular CUP separado del loop de cuentas para calcular cambiaria limpia
1283:                 if ($pago->moneda && $pago->moneda->codigo_moneda === 'CUP') {
1284:                     $totalCupPagado     += $pago->monto;
1285:                     $totalCupContadoUSD += $pago->monto_equivalente;
1286:                 }
1287: 
1288:                 // ✅ CAMBIO: Manejar destino del dinero (cuenta O cliente)
1289:                 // CASO 1: El destino es un Cliente Físico
1290:                 if ($pago->cliente_id) {
1291:                     $clienteDestino = $pago->cliente;
1292: 
1293:                     // Verificar que el cliente destino existe y es físico
1294:                     if ($clienteDestino && $clienteDestino->tipo_cliente === 'fisico') {
1295:                         // ✅ Incrementar la deuda del cliente destino
1296:                         $clienteDestino->increment('deuda_pago_cliente', $pago->monto);
1297: 
1298:                         // ✅ IMPORTANTE: Saltar al siguiente pago, NO procesar cuenta
1299:                         continue;
1300:                     }
1301:                 }
1302: 
1303:                 // CASO 2: El destino es una Cuenta (flujo normal)
1304:                 $cuenta = $pago->cuenta;
1305:                 if (!$cuenta) {
1306:                     continue;
1307:                 }
1308: 
1309:                 $codigoCuenta = $cuenta->moneda?->codigo_moneda ?? $cuenta->tipo_moneda;
1310:                 $codigoPago = $pago->moneda?->codigo_moneda;
1311: 
1312:                 if ($codigoPago === $codigoCuenta) {
1313:                     $cuenta->increment('saldo_cuenta', $pago->monto);
1314:                 }
1315:                 // Si no coinciden, por seguridad no acumulamos
1316:             }
1317: 
1318:             // Calcular ganancia cambiaria solo sobre los CUP de productos (sin mensajero)
1319:             $cupProductos = max(0.0, $totalCupPagado - $mensajero_cup);
1320:             if ($totalCupPagado > 0 && $cupProductos > 0) {
1321:                 $proporcion             = $cupProductos / $totalCupPagado;
1322:                 $cupContadoUSD_productos = $totalCupContadoUSD * $proporcion;
1323:                 $gananciaExtraUSD       = round(($cupProductos / $tasaOficialCUP) - $cupContadoUSD_productos, 2);
1324:             }
1325: 
1326:             $venta->update([
1327:                 'ganancia_perdida_cambiaria' => $gananciaExtraUSD,
1328:                 'ganancia_real_total'        => $venta->total_ganancia + $gananciaExtraUSD,
1329:             ]);
1330: 
1331:             // DESCUENTO GESTOR
1332:             if ($venta->es_venta_gestor && $venta->gestor_cuenta_id && $venta->gestor_monto > 0) {
1333:                 $cuentaGestor = $venta->gestorCuenta;
1334: 
1335:                 if ($cuentaGestor) {
1336:                     if ($cuentaGestor->saldo_cuenta < $venta->gestor_monto) {
1337:                         throw new \Exception('La cuenta del gestor no tiene saldo suficiente para cubrir la comisión');
1338:                     }
1339: 
1340:                     $cuentaGestor->decrement('saldo_cuenta', $venta->gestor_monto);
1341:                 }
1342:             }
1343: 
1344:             // MENSAJERO
1345:             if ($venta->mensajero_monto > 0 && $venta->mensajero_cuenta_id) {
1346:                 $cuentaMensajero = $venta->mensajeroCuenta;
1347: 
1348:                 if ($cuentaMensajero) {
1349:                     // monto_final_cup es el monto editable desde Show (puede incluir premio/sanción).
1350:                     // Si no fue configurado, cae al monto original que pagó el cliente en el POS.
1351:                     $montoFinal = $venta->mensajero_monto_final_cup
1352:                         ? (float) $venta->mensajero_monto_final_cup
1353:                         : (float) $venta->mensajero_monto_original;
1354: 
1355:                     // Bloque propio comentado — habilitar cuando se implemente vehículo propio
1356:                     // if ($venta->mensajero_tipo === 'propio') {
1357:                     //     if ($venta->mensajero_cuenta_origen_id) {
1358:                     //         $cuentaOrigen = Cuenta::find($venta->mensajero_cuenta_origen_id);
1359:                     //         if ($cuentaOrigen) {
1360:                     //             $cuentaOrigen->decrement('saldo_cuenta', $montoFinal);
1361:                     //         }
1362:                     //     }
1363:                     //     $cuentaMensajero->increment('saldo_cuenta', $montoFinal);
1364:                     // } else
1365: 
1366:                     // EXTERNO: sale de la cuenta del POS para pagar al mensajero (pago físico)
1367:                     if ($venta->mensajero_tipo === 'externo') {
1368:                         $cuentaMensajero->decrement('saldo_cuenta', $montoFinal);
1369:                     }
1370:                 }
1371:             }
1372: 
1373:             // COMISIÓN VENDEDOR — solo si no es venta con gestor (XOR)
1374:             if (!$venta->es_venta_gestor && $venta->total_comision > 0 && $venta->comision_cuenta_id && $venta->comision_tasa > 0) {
1375:                 $cuentaComision = $venta->comisionCuenta;
1376: 
1377:                 if ($cuentaComision) {
1378:                     $montoCUP = round((float) $venta->total_comision * (float) $venta->comision_tasa, 2);
1379: 
1380:                     if ($cuentaComision->saldo_cuenta < $montoCUP) {
1381:                         throw new \Exception(
1382:                             "La cuenta de comisión no tiene saldo suficiente. Necesita {$montoCUP} CUP, disponible: {$cuentaComision->saldo_cuenta} CUP."
1383:                         );
1384:                     }
1385: 
1386:                     $cuentaComision->decrement('saldo_cuenta', $montoCUP);
1387:                 }
1388:             }
1389:         });
1390: 
1391:         return response()->json([
1392:             'success' => true,
1393:             'message' => 'Venta Aprobada Satisfactoriamente'
1394:         ]);
1395:     }
1396: 
1397:     /**
1398:      * Obtener listado de ventas con filtros y paginación.
1399:      */
1400:     public function listadoVentas(Request $request)
1401:     {
1402:         $user = Auth::user();
1403:         if (!$user) {
1404:             return redirect()->route('login');
1405:         }
1406: 
1407:         // Construir query base
1408:         $query = Venta::with(['cliente', 'almacen', 'usuario', 'pagos', 'moneda', 'destinatario', 'monedaCobro', 'gestorCuenta', 'mensajeroCuenta'])
1409:             ->withCount('detalles');
1410: 
1411:         // Filtrar por usuario (excepto admin y moderador)
1412:         if (!in_array($user->role, ['admin', 'moderador'])) {
1413:             $query->where('user_id', $user->id);
1414:         }
1415: 
1416:         // Aplicar filtros
1417:         if ($request->has('estado') && $request->estado) {
1418:             $query->where('estado', $request->estado);
1419:         }
1420: 
1421:         if ($request->has('almacen_id') && $request->almacen_id) {
1422:             $query->where('almacen_id', $request->almacen_id);
1423:         }
1424: 
1425:         if ($request->has('fecha_desde') && $request->fecha_desde) {
1426:             $query->whereDate('created_at', '>=', $request->fecha_desde);
1427:         }
1428: 
1429:         if ($request->has('fecha_hasta') && $request->fecha_hasta) {
1430:             $query->whereDate('created_at', '<=', $request->fecha_hasta);
1431:         }
1432: 
1433:         // Ordenar y paginar
1434:         $ventas = $query->orderBy('created_at', 'desc')
1435:             ->paginate(15)
1436:             ->through(function ($venta) {
1437:                 return [
1438:                     'id' => $venta->id,
1439:                     'cliente' => $venta->cliente ? [
1440:                         'id' => $venta->cliente->id,
1441:                         'nombre' => $venta->cliente->nombre_cliente,
1442:                     ] : null,
1443:                     'almacen' => [
1444:                         'id' => $venta->almacen->id,
1445:                         'nombre' => $venta->almacen->nombre_almacen,
1446:                     ],
1447:                     'usuario' => [
1448:                         'id' => $venta->usuario->id,
1449:                         'nombre' => $venta->usuario->name,
1450:                     ],
1451:                     'total' => $venta->total,
1452:                     'total_ganancia' => $venta->total_ganancia,
1453:                     'total_comision' => (float) $venta->total_comision,
1454:                     'total_esperado_usd' => $venta->total_esperado_usd,
1455:                     'ganancia_perdida_cambiaria' => $venta->ganancia_perdida_cambiaria,
1456:                     'ganancia_real_total' => $venta->ganancia_real_total,
1457:                     'estado' => $venta->estado,
1458:                     'total_pagado' => $venta->pagos->sum('monto_equivalente'),
1459:                     'restante' => $venta->total - $venta->pagos->sum('monto_equivalente'),
1460:                     'cantidad_items' => $venta->detalles_count,
1461:                     'fecha' => $venta->created_at->format('d/m/Y H:i'),
1462:                     'fecha_iso' => $venta->created_at->toISOString(),
1463:                     'moneda_principal' => $venta->moneda ? [
1464:                         'id' => $venta->moneda->id,
1465:                         'codigo' => $venta->moneda->codigo_moneda,
1466:                         'nombre' => $venta->moneda->nombre_moneda,
1467:                     ] : null,
1468:                     'destinatario' => $venta->destinatario ? [
1469:                         'id' => $venta->destinatario->id,
1470:                         'nombre' => $venta->destinatario->nombre,
1471:                         'apellidos' => $venta->destinatario->apellidos,
1472:                         'carnet_identidad' => $venta->destinatario->carnet_identidad,
1473:                         'telefono_contacto' => $venta->destinatario->telefono_contacto,
1474:                     ] : null,
1475:                     // NUEVOS CAMPOS
1476:                     'tasa_aplicada_venta' => $venta->tasa_aplicada_venta,
1477:                     'moneda_cobro' => $venta->monedaCobro ? [
1478:                         'id' => $venta->monedaCobro->id,
1479:                         'codigo' => $venta->monedaCobro->codigo_moneda,
1480:                         'simbolo' => $venta->monedaCobro->simbolo_moneda,
1481:                     ] : null,
1482:                     'monto_diferencia_cambiaria' => $venta->monto_diferencia_cambiaria,
1483:                     'es_venta_especial'   => (bool) $venta->es_venta_especial,
1484:                     'nota_venta_especial' => $venta->nota_venta_especial,
1485:                     // MENSAJERO
1486:                     'mensajero' => $venta->mensajero_monto > 0 ? [
1487:                         'monto' => (float) $venta->mensajero_monto,
1488:                         'tipo'  => $venta->mensajero_tipo,
1489:                     ] : null,
1490:                     // GESTOR
1491:                     'gestor' => $venta->es_venta_gestor && $venta->gestor_cuenta_id ? [
1492:                         'monto' => (float) $venta->gestor_monto,
1493:                         'cuenta_id' => $venta->gestor_cuenta_id,
1494:                         'comentario' => $venta->gestor_comentario,
1495:                         'cuenta_nombre' => $venta->gestorCuenta?->nombre_cuenta,
1496:                         'tasa_aplicada' => $venta->tasa_aplicada_venta ? (float) $venta->tasa_aplicada_venta : null,
1497:                         'tasa_aplicada_gestor' => $venta->tasa_aplicada_gestor ? (float) $venta->tasa_aplicada_gestor : null,
1498:                         'monto_usd' => $venta->gestor_monto && $venta->tasa_aplicada_gestor 
1499:                             ? round($venta->gestor_monto / $venta->tasa_aplicada_gestor, 2) 
1500:                             : null,
1501:                         'moneda' => $venta->gestorCuenta?->moneda ? [
1502:                             'codigo' => $venta->gestorCuenta->moneda->codigo_moneda,
1503:                             'simbolo' => $venta->gestorCuenta->moneda->simbolo_moneda,
1504:                         ] : null,
1505:                     ] : null,
1506:                 ];
1507:             });
1508: 
1509:         // Obtener almacenes para filtros
1510:         $almacenes = in_array($user->role, ['admin', 'moderador'])
1511:             ? Almacen::select('id', 'nombre_almacen')->get()
1512:             : ($user ? $user->almacenes()->select('id', 'nombre_almacen')->get() : collect());
1513: 
1514:         return Inertia::render('Vendor/Listado', [
1515:             'ventas' => $ventas,
1516:             'filters' => $request->only(['estado', 'almacen_id', 'fecha_desde', 'fecha_hasta']),
1517:             'almacenes' => $almacenes,
1518:             'estados_venta' => [
1519:                 ['value' => 'pendiente',           'label' => 'Pendiente'],
1520:                 ['value' => 'completada',          'label' => 'Completada'],
1521:                 ['value' => 'cancelada',           'label' => 'Cancelada'],
1522:                 ['value' => 'solicitud_especial',  'label' => 'Solicitud Especial'],
1523:                 ['value' => 'rechazada',           'label' => 'Rechazada'],
1524:             ]
1525:         ]);
1526:     }
1527: 
1528:     /**
1529:      * Editar pagos y/o precios de una venta en estado pendiente.
1530:      */
1531:     public function editarVentaPendiente(Request $request, Venta $venta)
1532:     {
1533:         if ($venta->estado !== 'pendiente') {
1534:             return response()->json(['success' => false, 'message' => 'Solo se pueden editar ventas en estado pendiente.'], 400);
1535:         }
1536: 
1537:         $validated = $request->validate([
1538:             'pagos'                       => 'required|array|min:1',
1539:             'pagos.*.metodo'              => 'required|in:transferencia,efectivo',
1540:             'pagos.*.moneda_id'           => 'required|exists:monedas,id',
1541:             'pagos.*.monto'               => 'required|numeric|min:0',
1542:             'pagos.*.via'                 => 'nullable|string',
1543:             'pagos.*.tasa_cambio'         => 'required|numeric|min:0.0001',
1544:             'pagos.*.monto_equivalente'   => 'required|numeric|min:0',
1545:             'pagos.*.cuenta_id'           => 'nullable|exists:cuentas,id',
1546:             'pagos.*.cliente_id'          => 'nullable|exists:clientes,id',
1547:             'pagos.*.referencia'          => 'nullable|string',
1548:             'items'                       => 'nullable|array',
1549:             'items.*.venta_detalle_id'    => 'required|exists:venta_detalles,id',
1550:             'items.*.precio_venta'        => 'required|numeric|min:0',
1551:         ]);
1552: 
1553:         // Validar XOR en pagos
1554:         foreach ($validated['pagos'] as $pago) {
1555:             if (empty($pago['cuenta_id']) && empty($pago['cliente_id'])) {
1556:                 return response()->json(['success' => false, 'message' => 'Cada pago debe tener una cuenta o un cliente como destino.'], 422);
1557:             }
1558:             if (!empty($pago['cuenta_id']) && !empty($pago['cliente_id'])) {
1559:                 return response()->json(['success' => false, 'message' => 'Un pago no puede tener cuenta y cliente al mismo tiempo.'], 422);
1560:             }
1561:         }
1562: 
1563:         $user = Auth::user();
1564: 
1565:         try { DB::transaction(function () use ($venta, $validated, $user) {
1566:             // ── Actualizar precios si vienen ──────────────────────────────────
1567:             if (!empty($validated['items'])) {
1568:                 $venta->load('detalles.producto');
1569: 
1570:                 // Precargar precios del almacén para validar mínimos
1571:                 $productIds     = $venta->detalles->pluck('producto_id')->toArray();
1572:                 $preciosAlmacen = DB::table('producto_vendedors')
1573:                     ->where('almacen_id', $venta->almacen_id)
1574:                     ->whereIn('producto_id', $productIds)
1575:                     ->get()
1576:                     ->keyBy('producto_id');
1577: 
1578:                 $nuevoTotal    = 0;
1579:                 $nuevaGanancia = 0;
1580:                 $nuevaComision = 0;
1581: 
1582:                 foreach ($validated['items'] as $itemData) {
1583:                     $detalle = $venta->detalles->firstWhere('id', $itemData['venta_detalle_id']);
1584:                     if (!$detalle) continue;
1585: 
1586:                     $nuevoPrecio = (float) $itemData['precio_venta'];
1587:                     $costo       = (float) $detalle->costo_unitario;
1588: 
1589:                     // Validar mínimo solo si no es venta especial
1590:                     if (!$venta->es_venta_especial) {
1591:                         $precioRow = $preciosAlmacen->get($detalle->producto_id);
1592:                         if ($precioRow) {
1593:                             $precioMinimo = round((float) $precioRow->precio_venta - (float) $precioRow->comision, 2);
1594:                             if ($nuevoPrecio < $precioMinimo) {
1595:                                 throw new \Exception(
1596:                                     "El precio de \"{$detalle->producto->nombre_producto}\" (\${$nuevoPrecio}) " .
1597:                                     "está por debajo del mínimo permitido (\${$precioMinimo})."
1598:                                 );
1599:                             }
1600:                         }
1601:                         if ($nuevoPrecio < $costo) {
1602:                             throw new \Exception(
1603:                                 "El precio de \"{$detalle->producto->nombre_producto}\" no puede ser menor que su costo."
1604:                             );
1605:                         }
1606:                     }
1607: 
1608:                     // Recalcular comisión
1609:                     $precioRow    = $preciosAlmacen->get($detalle->producto_id);
1610:                     $precioBase   = $precioRow ? (float) $precioRow->precio_venta : $nuevoPrecio;
1611:                     $baseComision = (!$venta->es_venta_especial && $precioRow) ? (float) $precioRow->comision : 0;
1612: 
1613:                     if ($venta->es_venta_especial) {
1614:                         $comisionUnitaria = 0;
1615:                     } elseif ($nuevoPrecio >= $precioBase) {
1616:                         $comisionUnitaria = $baseComision + ($nuevoPrecio - $precioBase);
1617:                     } else {
1618:                         $descuento        = $precioBase - $nuevoPrecio;
1619:                         $comisionUnitaria = max(0.0, $baseComision - $descuento);
1620:                     }
1621: 
1622:                     $ganancia = ($nuevoPrecio - $costo) * $detalle->cantidad;
1623:                     $subtotal = $nuevoPrecio * $detalle->cantidad;
1624: 
1625:                     $detalle->update([
1626:                         'precio_venta'    => $nuevoPrecio,
1627:                         'subtotal'        => $subtotal,
1628:                         'ganancia'        => $ganancia,
1629:                         'comision_unitaria' => round($comisionUnitaria, 2),
1630:                     ]);
1631: 
1632:                     $nuevoTotal    += $subtotal;
1633:                     $nuevaGanancia += $ganancia;
1634:                     $nuevaComision += round($comisionUnitaria * $detalle->cantidad, 2);
1635:                 }
1636: 
1637:                 // Sumar mensajero en USD al total (si era USD; si era CUP directo no se suma al total USD)
1638:                 $mensajeroEnUSD = ($venta->mensajero_monto > 0 && $venta->mensajero_tasa > 0)
1639:                     ? (float) $venta->mensajero_monto
1640:                     : 0;
1641: 
1642:                 $venta->update([
1643:                     'total'          => $nuevoTotal + $mensajeroEnUSD,
1644:                     'total_ganancia' => $nuevaGanancia,
1645:                     'total_comision' => round($nuevaComision, 2),
1646:                 ]);
1647:             }
1648: 
1649:             // ── Reemplazar pagos ──────────────────────────────────────────────
1650:             $venta->pagos()->delete();
1651: 
1652:             foreach ($validated['pagos'] as $pago) {
1653:                 PagoVenta::create([
1654:                     'venta_id'             => $venta->id,
1655:                     'tipo_pago'            => $pago['metodo'],
1656:                     'moneda_id'            => $pago['moneda_id'],
1657:                     'cuenta_id'            => $pago['cuenta_id'] ?? null,
1658:                     'cliente_id'           => $pago['cliente_id'] ?? null,
1659:                     'via_pago'             => $pago['via'] ?? null,
1660:                     'monto'                => $pago['monto'],
1661:                     'tasa_cambio_aplicada' => $pago['tasa_cambio'],
1662:                     'monto_equivalente'    => $pago['monto_equivalente'],
1663:                     'referencia'           => $pago['referencia'] ?? null,
1664:                 ]);
1665:             }
1666:         }); } catch (\Exception $e) {
1667:             return response()->json([
1668:                 'success' => false,
1669:                 'message' => $e->getMessage(),
1670:             ], 422);
1671:         }
1672: 
1673:         // Devolver venta actualizada para refrescar el frontend sin recargar
1674:         $venta->refresh()->load(['detalles.producto', 'pagos.cuenta.moneda', 'pagos.moneda', 'pagos.cliente']);
1675: 
1676:         return response()->json([
1677:             'success' => true,
1678:             'message' => 'Venta actualizada correctamente.',
1679:             'total'   => (float) $venta->total,
1680:             'pagos'   => $venta->pagos->map(fn($p) => [
1681:                 'metodo'            => $p->tipo_pago,
1682:                 'monto'             => $p->monto,
1683:                 'monto_equivalente' => $p->monto_equivalente,
1684:                 'via'               => $p->via_pago,
1685:                 'tasa_cambio'       => $p->tasa_cambio_aplicada,
1686:                 'moneda'            => $p->moneda ? [
1687:                     'id'     => $p->moneda->id,
1688:                     'codigo' => $p->moneda->codigo_moneda,
1689:                     'nombre' => $p->moneda->nombre_moneda,
1690:                 ] : null,
1691:                 'cuenta'            => $p->cuenta ? [
1692:                     'id'     => $p->cuenta->id,
1693:                     'nombre' => $p->cuenta->nombre_cuenta,
1694:                 ] : null,
1695:                 'cliente_destino'   => $p->cliente ? [
1696:                     'id'     => $p->cliente->id,
1697:                     'nombre' => $p->cliente->nombre_cliente,
1698:                 ] : null,
1699:                 'destino_tipo'      => $p->cliente_id ? 'cliente' : 'cuenta',
1700:             ]),
1701:             'items' => $venta->detalles->map(fn($d) => [
1702:                 'precio_venta'     => (float) $d->precio_venta,
1703:                 'subtotal'         => (float) $d->subtotal,
1704:                 'ganancia'         => (float) $d->ganancia,
1705:                 'comision_unitaria'=> (float) $d->comision_unitaria,
1706:             ]),
1707:         ]);
1708:     }
1709: 
1710:     /**
1711:      * Guardar distribución de la venta: mensajero y comisión vendedor
1712:      */
1713:     public function guardarDistribucion(Request $request, Venta $venta)
1714:     {
1715:         if ($venta->estado !== 'pendiente') {
1716:             return response()->json(['success' => false, 'message' => 'Solo se puede modificar una venta pendiente.'], 422);
1717:         }
1718: 
1719:         $validated = $request->validate([
1720:             'mensajero_monto'             => 'nullable|numeric|min:0.01',
1721:             'mensajero_tipo'              => 'nullable|in:propio,externo',
1722:             'mensajero_cuenta_id'         => 'nullable|exists:cuentas,id',
1723:             'mensajero_cuenta_origen_id'  => 'nullable|exists:cuentas,id',
1724:             'mensajero_tasa'              => 'nullable|numeric|min:0.0001',
1725:             'mensajero_monto_final_cup'   => 'nullable|numeric|min:0.01',
1726:             'limpiar_mensajero'           => 'nullable|boolean',
1727:             'limpiar_gestor'      => 'nullable|boolean',
1728:             'comision_cuenta_id'  => 'nullable|exists:cuentas,id',
1729:             'comision_tasa'       => 'nullable|numeric|min:0.0001',
1730:             'limpiar_comision'    => 'nullable|boolean',
1731:         ]);
1732: 
1733:         $totalProductos = (float) $venta->detalles->sum('subtotal');
1734: 
1735:         $limpiarMensajero = $validated['limpiar_mensajero'] ?? false;
1736:         $limpiarComision  = $validated['limpiar_comision'] ?? false;
1737:         $limpiarGestor    = $validated['limpiar_gestor'] ?? false;
1738: 
1739:         // El monto USD del mensajero viene del POS y no cambia desde Show.
1740:         // Solo se actualiza si el payload incluye explícitamente mensajero_monto (caso raro).
1741:         $nuevoMensajeroMonto = $limpiarMensajero ? null : ($validated['mensajero_monto'] ?? $venta->mensajero_monto);
1742:         $mensajeroEnUSD = $nuevoMensajeroMonto > 0 ? (float) $nuevoMensajeroMonto : 0;
1743: 
1744:         $updates = ['total' => $totalProductos + $mensajeroEnUSD];
1745: 
1746:         // Actualizar monto solo si viene explícito
1747:         if (array_key_exists('mensajero_monto', $validated) || $limpiarMensajero) {
1748:             $updates['mensajero_monto'] = $limpiarMensajero ? null : ($validated['mensajero_monto'] ?? null);
1749:         }
1750: 
1751:         // Tipo, cuenta y tasa se pueden actualizar sin enviar monto (Show.tsx solo configura distribución)
1752:         $hayConfigMensajero = $limpiarMensajero
1753:             || array_key_exists('mensajero_tipo', $request->all())
1754:             || array_key_exists('mensajero_cuenta_id', $request->all())
1755:             || array_key_exists('mensajero_cuenta_origen_id', $request->all())
1756:             || array_key_exists('mensajero_tasa', $request->all());
1757: 
1758:         if ($hayConfigMensajero) {
1759:             $updates['mensajero_tipo']              = $limpiarMensajero ? null : ($validated['mensajero_tipo'] ?? $venta->mensajero_tipo);
1760:             $updates['mensajero_cuenta_id']         = $limpiarMensajero ? null : ($validated['mensajero_cuenta_id'] ?? null);
1761:             $updates['mensajero_cuenta_origen_id']  = $limpiarMensajero ? null : ($validated['mensajero_cuenta_origen_id'] ?? null);
1762:             $updates['mensajero_tasa']              = $limpiarMensajero ? null : ($validated['mensajero_tasa'] ?? null);
1763:             $updates['mensajero_monto_final_cup']   = $limpiarMensajero ? null : ($validated['mensajero_monto_final_cup'] ?? null);
1764:         }
1765: 
1766:         if (array_key_exists('comision_cuenta_id', $validated) || $limpiarComision) {
1767:             $updates['comision_cuenta_id'] = $limpiarComision ? null : ($validated['comision_cuenta_id'] ?? null);
1768:             $updates['comision_tasa']      = $limpiarComision ? null : ($validated['comision_tasa'] ?? null);
1769:         }
1770: 
1771:         // Limpiar gestor: la comisión pasa al punto de venta
1772:         if ($limpiarGestor) {
1773:             $updates['es_venta_gestor']      = false;
1774:             $updates['gestor_cuenta_id']     = null;
1775:             $updates['gestor_monto']         = null;
1776:             $updates['gestor_comentario']    = null;
1777:             $updates['tasa_aplicada_gestor'] = null;
1778:         }
1779: 
1780:         $venta->update($updates);
1781:         $venta->refresh()->load(['mensajeroCuenta.moneda', 'comisionCuenta.moneda', 'mensajeroMoneda', 'mensajeroOrigenCuenta']);
1782: 
1783:         return response()->json([
1784:             'success'  => true,
1785:             'message'  => 'Distribución guardada correctamente.',
1786:             'total'    => (float) $venta->total,
1787:             'gestor'   => $limpiarGestor ? null : 'unchanged',
1788:             'mensajero' => $venta->mensajero_monto > 0 ? [
1789:                 'monto'           => (float) $venta->mensajero_monto,
1790:                 'tipo'            => $venta->mensajero_tipo,
1791:                 'moneda'          => $venta->mensajeroMoneda?->codigo_moneda ?? ($venta->mensajero_tasa > 0 ? 'USD' : 'CUP'),
1792:                 'moneda_id'       => $venta->mensajero_moneda_id,
1793:                 'monto_original'  => $venta->mensajero_monto_original ? (float) $venta->mensajero_monto_original : null,
1794:                 'tasa_entrada'    => $venta->mensajero_tasa_entrada ? (float) $venta->mensajero_tasa_entrada : null,
1795:                 'tasa'            => $venta->mensajero_tasa ? (float) $venta->mensajero_tasa : null,
1796:                 'monto_cup'       => $venta->mensajero_tasa > 0
1797:                     ? round((float) $venta->mensajero_monto * (float) $venta->mensajero_tasa, 2)
1798:                     : null,
1799:                 'monto_final_cup' => $venta->mensajero_monto_final_cup ? (float) $venta->mensajero_monto_final_cup : null,
1800:                 'cuenta' => $venta->mensajeroCuenta ? [
1801:                     'id'     => $venta->mensajeroCuenta->id,
1802:                     'nombre' => $venta->mensajeroCuenta->nombre_cuenta,
1803:                     'moneda' => $venta->mensajeroCuenta->moneda?->codigo_moneda,
1804:                 ] : null,
1805:                 'cuenta_origen' => $venta->mensajeroOrigenCuenta ? [
1806:                     'id'     => $venta->mensajeroOrigenCuenta->id,
1807:                     'nombre' => $venta->mensajeroOrigenCuenta->nombre_cuenta,
1808:                 ] : null,
1809:             ] : null,
1810:             'comision_pago' => $venta->comision_cuenta_id ? [
1811:                 'tasa'      => $venta->comision_tasa ? (float) $venta->comision_tasa : null,
1812:                 'monto_cup' => $venta->comision_tasa > 0
1813:                     ? round((float) $venta->total_comision * (float) $venta->comision_tasa, 2)
1814:                     : null,
1815:                 'cuenta' => $venta->comisionCuenta ? [
1816:                     'id'               => $venta->comisionCuenta->id,
1817:                     'nombre'           => $venta->comisionCuenta->nombre_cuenta,
1818:                     'moneda'           => $venta->comisionCuenta->moneda?->codigo_moneda,
1819:                     'saldo_disponible' => (float) ($venta->comisionCuenta->saldo_cuenta ?? 0),
1820:                 ] : null,
1821:             ] : null,
1822:         ]);
1823:     }
1824: 
1825:     /**
1826:      * Anular venta (pendiente o completada)
1827:      */
1828:     public function anularVenta(Request $request, Venta $venta)
1829:     {
1830:         if ($venta->estado === 'cancelada') {
1831:             return response()->json(['success' => false, 'message' => 'La venta ya está anulada'], 400);
1832:         }
1833: 
1834:         $validated = $request->validate([
1835:             'motivo_anulacion' => 'required|in:error_precio,solicitud_cliente,producto_defectuoso,duplicado_venta,error_pedido,otros',
1836:             'detalle_anulacion' => 'nullable|string|max:500|required_if:motivo_anulacion,otros',
1837:         ]);
1838: 
1839:         // Cargar relaciones necesarias para poder revertirlas
1840:         $venta->load(['detalles', 'pagos.cliente', 'pagos.cuenta', 'gestorCuenta', 'comisionCuenta', 'mensajeroCuenta', 'mensajeroMoneda']);
1841: 
1842:         DB::transaction(function () use ($venta, $validated) {
1843:             // ✅ SIEMPRE revertir stock (pendiente o completada)
1844:             foreach ($venta->detalles as $detalle) {
1845:                 $almacenProducto = AlmacenProducto::where('almacen_id', $venta->almacen_id)
1846:                     ->where('producto_id', $detalle->producto_id)->first();
1847:                 
1848:                 if ($almacenProducto) {
1849:                     $almacenProducto->increment('cantidad', $detalle->cantidad);
1850:                 }
1851: 
1852:                 // ✅ Devolver stock al mismo código usado en la venta.
1853:                 // Para ventas antiguas sin producto_codigo_id, usar default o primero.
1854:                 if ($detalle->producto_codigo_id) {
1855:                     $codigoUsado = ProductoCodigo::find($detalle->producto_codigo_id);
1856:                     if ($codigoUsado) {
1857:                         $codigoUsado->increment('cantidad', $detalle->cantidad);
1858:                     }
1859:                 } else {
1860:                     $codigoDefault = ProductoCodigo::where('producto_id', $detalle->producto_id)
1861:                         ->orderByDesc('es_default')
1862:                         ->first();
1863: 
1864:                     if ($codigoDefault) {
1865:                         $codigoDefault->increment('cantidad', $detalle->cantidad);
1866:                     }
1867:                 }
1868: 
1869:                 HistorialStock::create([
1870:                     'producto_id' => $detalle->producto_id,
1871:                     'almacen_id' => $venta->almacen_id,
1872:                     'venta_id' => $venta->id,
1873:                     'cantidad_anterior' => $almacenProducto?->cantidad ?? 0,
1874:                     'cantidad_nueva' => ($almacenProducto?->cantidad ?? 0) + $detalle->cantidad,
1875:                     'diferencia' => $detalle->cantidad,
1876:                     'tipo' => 'venta_anulada',
1877:                     'observaciones' => 'Stock revertido por anulación de venta',
1878:                     'user_id' => Auth::id(),
1879:                 ]);
1880:             }
1881: 
1882:             // Revertir pagos y gestor solo si la venta fue completada.
1883:             // En ventas pendientes, cuentas y deudas nunca fueron modificadas.
1884:             if ($venta->estado === 'completada') {
1885:                 foreach ($venta->pagos as $pago) {
1886:                     if ($pago->cliente_id) {
1887:                         $cliente = $pago->cliente;
1888:                         if ($cliente) {
1889:                             $cliente->decrement('deuda_pago_cliente', $pago->monto);
1890:                         }
1891:                     }
1892: 
1893:                     if ($pago->cuenta_id) {
1894:                         $cuenta = $pago->cuenta;
1895:                         if ($cuenta) {
1896:                             $cuenta->decrement('saldo_cuenta', $pago->monto);
1897:                         }
1898:                     }
1899:                 }
1900: 
1901:                 if ($venta->es_venta_gestor && $venta->gestor_cuenta_id && $venta->gestor_monto > 0) {
1902:                     $cuentaGestor = $venta->gestorCuenta;
1903:                     if ($cuentaGestor) {
1904:                         $cuentaGestor->increment('saldo_cuenta', $venta->gestor_monto);
1905:                     }
1906:                 }
1907: 
1908:                 // Revertir mensajero — inverso exacto del aprobarVenta
1909:                 if ($venta->mensajero_monto > 0 && $venta->mensajero_cuenta_id) {
1910:                     $cuentaMensajero = $venta->mensajeroCuenta;
1911:                     if ($cuentaMensajero) {
1912:                         $montoFinal = $venta->mensajero_monto_final_cup
1913:                             ? (float) $venta->mensajero_monto_final_cup
1914:                             : (float) $venta->mensajero_monto_original;
1915: 
1916:                         // Bloque propio comentado — habilitar cuando se implemente vehículo propio
1917:                         // if ($venta->mensajero_tipo === 'propio') {
1918:                         //     if ($venta->mensajero_cuenta_origen_id) {
1919:                         //         $cuentaOrigen = Cuenta::find($venta->mensajero_cuenta_origen_id);
1920:                         //         if ($cuentaOrigen) {
1921:                         //             $cuentaOrigen->increment('saldo_cuenta', $montoFinal);
1922:                         //         }
1923:                         //     }
1924:                         //     $cuentaMensajero->decrement('saldo_cuenta', $montoFinal);
1925:                         // } else
1926: 
1927:                         // EXTERNO: devolver el dinero a la cuenta del POS
1928:                         if ($venta->mensajero_tipo === 'externo') {
1929:                             $cuentaMensajero->increment('saldo_cuenta', $montoFinal);
1930:                         }
1931:                     }
1932:                 }
1933: 
1934:                 // Revertir comisión vendedor — solo si no es venta con gestor (XOR)
1935:                 if (!$venta->es_venta_gestor && $venta->total_comision > 0 && $venta->comision_cuenta_id && $venta->comision_tasa > 0) {
1936:                     $cuentaComision = $venta->comisionCuenta;
1937:                     if ($cuentaComision) {
1938:                         $montoCUP = round((float) $venta->total_comision * (float) $venta->comision_tasa, 2);
1939:                         $cuentaComision->increment('saldo_cuenta', $montoCUP);
1940:                     }
1941:                 }
1942:             }
1943: 
1944:             $venta->update([
1945:                 'estado'            => 'cancelada',
1946:                 'motivo_anulacion'  => $validated['motivo_anulacion'],
1947:                 'detalle_anulacion' => $validated['detalle_anulacion'] ?? null,
1948:             ]);
1949:         });
1950: 
1951:         return response()->json([
1952:             'success' => true,
1953:             'message' => 'Venta anulada correctamente'
1954:         ]);
1955:     }
1956: 
1957:     // ========================================================================
1958:     // VENTAS ESPECIALES
1959:     // ========================================================================
1960: 
1961:     /**
1962:      * Admin aprueba la solicitud especial → pasa a "pendiente" (flujo normal continúa).
1963:      */
1964:     public function aprobarSolicitudEspecial(Venta $venta)
1965:     {
1966:         if ($venta->estado !== 'solicitud_especial') {
1967:             return response()->json(['success' => false, 'message' => 'Esta venta no está pendiente de aprobación especial'], 400);
1968:         }
1969: 
1970:         $venta->update([
1971:             'estado'              => 'pendiente',
1972:             'decision_notificada' => false,
1973:         ]);
1974: 
1975:         try {
1976:             Notification::send(collect([$venta->usuario]), new VentaEspecialDecisionNotification($venta, 'aprobada'));
1977:         } catch (\Exception $e) {
1978:             \Log::error('Error enviando notificación de decisión especial: ' . $e->getMessage());
1979:         }
1980: 
1981:         return response()->json([
1982:             'success' => true,
1983:             'message' => 'Solicitud aprobada. La venta está ahora pendiente de receptor.'
1984:         ]);
1985:     }
1986: 
1987:     /**
1988:      * Admin rechaza la solicitud especial → revierte stock y pasa a "rechazada".
1989:      */
1990:     public function rechazarSolicitudEspecial(Venta $venta)
1991:     {
1992:         if ($venta->estado !== 'solicitud_especial') {
1993:             return response()->json(['success' => false, 'message' => 'Esta venta no está pendiente de aprobación especial'], 400);
1994:         }
1995: 
1996:         $venta->load(['detalles']);
1997: 
1998:         DB::transaction(function () use ($venta) {
1999:             foreach ($venta->detalles as $detalle) {
2000:                 $almacenProducto = AlmacenProducto::where('almacen_id', $venta->almacen_id)
2001:                     ->where('producto_id', $detalle->producto_id)->first();
2002: 
2003:                 if ($almacenProducto) {
2004:                     $almacenProducto->increment('cantidad', $detalle->cantidad);
2005:                 }
2006: 
2007:                 if ($detalle->producto_codigo_id) {
2008:                     $codigo = ProductoCodigo::find($detalle->producto_codigo_id);
2009:                     if ($codigo) {
2010:                         $codigo->increment('cantidad', $detalle->cantidad);
2011:                     }
2012:                 }
2013: 
2014:                 HistorialStock::create([
2015:                     'producto_id'      => $detalle->producto_id,
2016:                     'almacen_id'       => $venta->almacen_id,
2017:                     'venta_id'         => $venta->id,
2018:                     'cantidad_anterior'=> $almacenProducto?->cantidad ?? 0,
2019:                     'cantidad_nueva'   => ($almacenProducto?->cantidad ?? 0) + $detalle->cantidad,
2020:                     'diferencia'       => $detalle->cantidad,
2021:                     'tipo'             => 'venta_anulada',
2022:                     'observaciones'    => 'Stock revertido por rechazo de solicitud especial',
2023:                     'user_id'          => Auth::id(),
2024:                 ]);
2025:             }
2026: 
2027:             $venta->update([
2028:                 'estado'              => 'rechazada',
2029:                 'decision_notificada' => false,
2030:             ]);
2031:         });
2032: 
2033:         try {
2034:             Notification::send(collect([$venta->usuario]), new VentaEspecialDecisionNotification($venta, 'rechazada'));
2035:         } catch (\Exception $e) {
2036:             \Log::error('Error enviando notificación de decisión especial: ' . $e->getMessage());
2037:         }
2038: 
2039:         return response()->json([
2040:             'success' => true,
2041:             'message' => 'Solicitud rechazada. El stock ha sido revertido.'
2042:         ]);
2043:     }
2044: 
2045:     /**
2046:      * Marca que el vendedor ya vio el veredicto del admin.
2047:      */
2048:     public function marcarDecisionNotificada(Venta $venta)
2049:     {
2050:         $venta->update(['decision_notificada' => true]);
2051:         return response()->json(['success' => true]);
2052:     }
2053: }

(End of file - total 2053 lines)
</content>
```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 32.2s)

_Thinking:_

Now I have the full file. Let me provide a comprehensive analysis of the complete sales flow. The user asked me to analyze the entire VentaController.php and explain the flow a user follows to process a sale. Let me organize the analysis clearly.

The controller has these main sections:

1. **Carga de datos (API/JSON)** - Data loading endpoints
2. **Métodos de vista (Inertia)** - View rendering
3. **Métodos de procesamiento** - Processing methods (the actual sale flow)
4. **Ventas especiales** - Special sales handling

Let me trace the complete flow step by step.

Aquí tienes el análisis completo del `VentaController.php` (2053 líneas) con el flujo que sigue un usuario para procesar una venta:

---

## Arquitectura General

El controlador tiene 4 bloques principales:
1. **Endpoints API/JSON** (carga de datos asíncrona)
2. **Vistas Inertia** (renderizado de páginas)
3. **Procesamiento de venta** (core del negocio)
4. **Ventas especiales** (sub-flujo con aprobación)

---

## FLUJO COMPLETO DEL USUARIO

### FASE 0 — Carga de la vista de venta (`index`)

El usuario entra a la ruta `/ventas` → `VentaController@index()`. Se renderiza `Vendor/Index` mediante Inertia, pasando como `meta`:
- `role_usuario` (admin/moderador/vendedor)
- `almacenes_usuario` (según role)
- `cuentas_usuario` (filtradas por role)
- `monedas` activas del sistema

---

### FASE 1 — Carga asíncrona de datos (AJAX desde el frontend)

El frontend Vue/React hace llamadas paralelas a:

| Endpoint | Método | Propósito |
|---|---|---|
| `getAlmacenes()` | GET | Almacenes a los que el usuario tiene acceso |
| `getProductosPorAlmacen($id)` | GET | Productos del almacén seleccionado (con stock, precios, códigos de barras) |
| `getCuentas()` | GET | Cuentas bancarias/efectivo del usuario |
| `getCuentasFiltradas()` | GET | Cuentas filtradas por moneda y método de pago |
| `getMonedas()` | GET | Monedas activas con tasas de cambio |
| `getClientes()` | GET | Lista de clientes para selector |
| `getClientesFisicosParaPago()` | GET | Clientes físicos (para pagos con destino a cliente) |
| `storeClienteForVenta()` | POST | Crear cliente rápido sin salir del flujo |

En `getProductosPorAlmacen` es clave: carga los productos con sus precios desde `producto_vendedors` (precios por almacén), filtra solo los que `tiene_precio === true`, y los admin/moderadores ven precio de compra.

---

### FASE 2 — Armado del carrito (frontend)

El usuario:
1. Selecciona un **almacén**
2. Agrega productos al carrito (con cantidad, código de barras específico)
3. El frontend calcula subtotales
4. Puede modificar precio de venta (respetando precio mínimo = precio_base - comisión)
5. Define **método de pago** por cada pago:
   - Destino: una **cuenta** (banco/efectivo) o un **cliente físico** (se registra como deuda)
   - En transferencia: selecciona **moneda** y **cuenta destino**
   - En efectivo: puede ir a cuenta tipo 'efectivo' o a cliente

---

### FASE 3 — Procesar venta (`procesarVenta`)

Endpoint **POST** con validación masiva. Esto es lo que ocurre dentro de una transacción DB:

**3.1 Validaciones previas**
- Cada pago debe tener **exclusivamente** `cuenta_id` o `cliente_id` (XOR)
- Si es venta gestor: requiere monto, cuenta, tasa, y validación de acceso a la cuenta + moneda coincidente
- Verifica acceso del usuario al almacén

**3.2 Por cada item del carrito:**
1. Valida que precio_venta >= precio_compra (excepto ventas especiales)
2. Valida precio mínimo (precio_base - comisión) si no es especial
3. Verifica stock en `almacen_producto`
4. Valida que el código de barras específico (`producto_codigo_id`) pertenezca al producto y tenga stock
5. ✅ **DESCUENTA STOCK INMEDIATAMENTE** (`almacenProducto->decrement`)
6. Crea registro en `HistorialStock` con tipo `'venta_pendiente'` (sin `venta_id` aún)
7. Descuenta del código específico usado

**3.3 Creación de la Venta**
- Estado inicial: `'pendiente'` (normal) o `'solicitud_especial'` (si es especial)
- Guarda moneda principal, tasa, moneda de cobro, campos de gestor, mensajero, comisión

**3.4 Vincula historial stock**
- Actualiza los registros de historial con el `venta_id` recién creado

**3.5 Creación de Detalles (VentaDetalle)**
Por cada item, calcula:
- `ganancia = (precio_venta - precio_compra) * cantidad`
- `comision_unitaria`: si precio >= precio_base → comisión_base + markup; si no → comisión_base - descuento (nunca negativa). En especiales → 0.

**3.6 Cálculo de diferencia cambiaria**
- Si hay moneda de cobro, calcula: `(monto_real_cobrado - mensajero) - (usd_objetivo * tasa_oficial)`

**3.7 Creación de Pagos**
- Cada pago se registra con moneda, monto, tasa_cambio, monto_equivalente, cuenta_id o cliente_id

**3.8 Notificaciones**
- Venta normal: `VentaCreadaNotification` a admins/moderadores
- Venta especial: `VentaEspecialSolicitudNotification` a admins/moderadores

---

### FASE 4 — Post-creación (venta queda en `pendiente`)

La venta se crea con stock ya descontado. Queda pendiente de:

| Acción | Método | Descripción |
|---|---|---|
| Guardar destinatario | `guardarDestinatario()` | POST asíncrono. Datos del receptor (nombre, carnet, dirección, teléfono, parentesco). Además, si es gestor, guarda cuenta, monto y tasas. |
| Editar pagos/precios | `editarVentaPendiente()` | Solo en estado pendiente. Reemplaza pagos y actualiza precios de items con recálculo de ganancia/comisión. |
| Guardar distribución | `guardarDistribucion()` | Configura mensajero (tipo, cuenta, monto, tasa) y comisión vendedor (cuenta, tasa). Recalcula total = productos + mensajero. |
| Aprobar venta | `aprobarVenta()` | Transición a `completada` |

---

### FASE 5 — Aprobar venta (`aprobarVenta`)

Validaciones previas:
- Estado debe ser `'pendiente'`
- Debe tener destinatario
- Si tiene mensajero, debe tener cuenta y tipo definidos

**Dentro de la transacción:**
1. Cambia estado a `'completada'`
2. **Procesa pagos**: por cada pago:
   - Si destino es **cliente físico**: incrementa `deuda_pago_cliente`
   - Si destino es **cuenta** y moneda coincide: incrementa `saldo_cuenta`
3. **Calcula ganancia cambiaria**: separa CUP de productos vs mensajero. Fórmula: `(cup_productos / tasa_oficial_CUP) - cup_contado_usd_productos`
4. **Descuenta gestor** (si aplica): resta de `gestor_cuenta.saldo_cuenta`
5. **Procesa mensajero externo**: resta de la cuenta POS el monto final en CUP
6. **Paga comisión vendedor** (si no es gestor): descuenta de `comision_cuenta` el equivalente en CUP

---

### FASE 6 — Venta Especial (sub-flujo alternativo)

1. Vendedor crea venta con `es_venta_especial=true` y estado `'solicitud_especial'`
2. Se notifica a admins via `VentaEspecialSolicitudNotification`
3. Admin ve la solicitud y puede:
   - **`aprobarSolicitudEspecial()`**: cambia estado a `'pendiente'`, notifica al vendedor (`VentaEspecialDecisionNotification` como 'aprobada'), y el flujo continúa normal (Fase 4 → Fase 5)
   - **`rechazarSolicitudEspecial()`**: **revierte el stock** (incrementa `almacen_producto.cantidad` y `producto_codigos.cantidad`), crea historial de reversión, cambia estado a `'rechazada'`, notifica al vendedor
4. Vendedor marca vista con `marcarDecisionNotificada()`

---

### FASE 7 — Anular venta (`anularVenta`)

Se puede anular desde cualquier estado excepto ya cancelada. Requiere motivo (`error_precio`, `solicitud_cliente`, `producto_defectuoso`, `duplicado_venta`, `error_pedido`, `otros`).

**Dentro de la transacción:**
1. **Siempre revierte stock**: incrementa `almacen_producto.cantidad` y `producto_codigos.cantidad`, crea historial tipo `'venta_anulada'`
2. **Si estaba completada**: revierte pagos (decrementa saldo cuentas o decrementa deuda cliente), reversa gestor (incrementa saldo), reversa mensajero externo (incrementa cuenta POS), reversa comisión vendedor
3. Marca estado `'cancelada'` con motivo y detalle

---

### MÉTODOS ADICIONALES

| Método | Propósito |
|---|---|
| `listadoVentas()` | GET con filtros (estado, almacén, fechas), paginación, solo propias si no es admin |
| `show($id)` | Vista detalle con todas las relaciones: items, pagos, cliente, destinatario, mensajero, gestor, comisión, monedas |
| `showReporteDiarioView()` | Renderiza vista de reporte diario |
| `getVentasReporte()` | API de KPIs agregados (diario/semanal/mensual) vía `DashboardStatsService` |
| `getCuentasParaGestor()` | Versión simplificada de cuentas para gestores |
| `guardarDestinatario()` | También soporta gestor (guarda `es_venta_gestor`, monto, cuenta, tasas) |

---

### DIAGRAMA DE ESTADOS

```
[solicitud_especial] ──(admin aprueba)──> [pendiente]
       │                                       │
  (admin rechaza)                          (guarda receptor,
       │                                   distribucion,
       ▼                                   edita pagos)
  [rechazada]                                  │
                                           (aprueba)
                                               │
                                               ▼
                                          [completada]
                                               │
                                       (anular venta)
                                               │
                                               ▼
                                          [cancelada]

  [pendiente] ──(anular)──> [cancelada]
  [completada] ──(anular)──> [cancelada]
```

---

### PUNTOS CLAVE DEL MODELO DE NEGOCIO

1. **Stock se descuenta al crear**, no al aprobar. La venta pendiente ya "reserva" stock.
2. **Comisión del vendedor**: se calcula como `comisión_base + (precio_venta - precio_base)` si vende por encima; si vende por debajo, el descuento se resta de su comisión.
3. **Diferencia cambiaria**: se calcula al momento de crear vs tasa oficial; se recalcula al aprobar con otra fórmula.
4. **Destino de pagos**: puede ser cuenta (ingresa al saldo) o cliente físico (aumenta su deuda). Es mutuamente excluyente.
5. **Mensajero es pass-through**: su monto se separa de los cálculos de ganancia y diferencia cambiaria.
6. **Gestor y comisión vendedor son mutuamente excluyentes** (XOR).
7. **Notificaciones**: siempre por evento (creación, solicitud especial, decisión especial).

---

## User

Bien, dentro de las fase 2 no hay una opcion que el usuario puede seleccionar un cliente fisico? O sea selecciona Alamcen y opcional seleccionar cliente, analiza esa parte

---

## Assistant (Plan · DeepSeek V4 Flash Free · 21.4s)

_Thinking:_

The user is asking me to analyze the part of the code related to how a user selects a client (cliente) during the sales process (Fase 2). They mention "cliente físico" specifically. Let me trace through the code to understand the client selection flow.

Let me look at the relevant parts:

1. The `index()` method passes data to the view
2. The `getClientes()` endpoint
3. The `getClientesFisicosParaPago()` endpoint
4. The `storeClienteForVenta()` endpoint
5. How `cliente_id` is used in `procesarVenta()`
6. How `cliente_id` is used in pagos within the flow

Let me trace through the code carefully.

From the `index()` method:
- It passes `role_usuario`, `almacenes_usuario`, `cuentas_usuario`, `monedas` as meta
- It does NOT pass `clientes` directly in the index method - but GET `/clientes` is available via `getClientes()`

From `getClientes()` (line 194-198):
```php
public function getClientes()
{
    $clientes = Cliente::select('id', 'nombre_cliente')->get();
    return response()->json($clientes);
}
```

From `getClientesFisicosParaPago()` (line 88-95):
```php
public function getClientesFisicosParaPago()
{
    $clientes = Cliente::where('tipo_cliente', 'fisico')
        ->select('id', 'nombre_cliente', 'deuda_pago_cliente')
        ->get();
    return response()->json($clientes);
}
```

From `storeClienteForVenta()` (line 42-86): Creates a new client on the fly.

Now in `procesarVenta()`:
- `cliente_id` is nullable (line 754): `'cliente_id' => 'nullable|exists:clientes,id'`
- It's stored on the Venta model (line 942)
- In pagos, there's also `cliente_id` (line 770): `'pagos.*.cliente_id' => 'nullable|exists:clientes,id'`

The user's question is: within Fase 2, isn't there an option where the user can select a "cliente físico"? They select Almacén and optionally select a client.

Looking at the code, there are actually **two** different client concepts:

1. **Cliente de la venta** (`venta.cliente_id`): The client this sale is for. Optional (nullable). Loaded from `getClientes()` which returns ALL clients (just id and name). This is the person who is buying/associated with the sale.

2. **Cliente como destino de pago** (`pago.cliente_id`): When a payment is made and the money goes to a "cliente físico" instead of to a bank account. This is handled by `getClientesFisicosParaPago()` which returns only `tipo_cliente = 'fisico'` with their debt balance. The idea: instead of depositing money to a bank account, the money goes directly to a physical person/cliente as payment (increasing their debt).

Then there's the `storeClienteForVenta()` which allows quick creation of a new client during the sale flow.

Let me analyze this clearly for the user. The user seems to be asking about the first type - selecting a client for the sale. They mention "Selecciona Almacen y opcional seleccionar cliente". 

Wait, re-reading their question: "dentro de las fase 2 no hay una opcion que el usuario puede seleccionar un cliente fisico? O sea selecciona Alamcen y opcional seleccionar cliente"

I think the user is asking me to confirm: Isn't there an option in Fase 2 where the user selects a "cliente físico"? I.e., they select an Almacén and optionally select a client. They want me to analyze this part.

So they want me to explain the client-related parts of Fase 2. Let me provide a clear analysis of how clients are handled in the flow.

Tienes toda la razón. En Fase 2 hay **dos conceptos distintos de "cliente"** que es importante separar:

---

### 1. Cliente de la Venta (`venta.cliente_id`)

El frontend carga vía API `GET /clientes` → `getClientes()` (línea 194), que devuelve **todos** los clientes (id, nombre_cliente) sin filtrar por tipo.

```
Clientes: [ { id: 1, nombre_cliente: "Juan Pérez" }, ... ]
```

En el formulario de venta, hay un selector **opcional** "Cliente" que el usuario puede elegir o dejar vacío. Este `cliente_id` se guarda en la tabla `ventas` como el cliente asociado a la compra (el comprador).

En `procesarVenta()` (línea 754 y 942):
```php
'cliente_id' => 'nullable|exists:clientes,id',  // validación
...
'cliente_id' => $validatedData['cliente_id'],   // guardado en Venta::create
```

Además, el vendedor puede **crear un cliente sobre la marcha** sin salir del flujo, mediante `storeClienteForVenta()` (línea 42). El endpoint verifica si ya existe por nombre o teléfono; si existe lo retorna, si no lo crea. Esto evita duplicados.

---

### 2. Cliente como Destino de Pago (`pago.cliente_id`)

Aquí está el detalle que mencionas. El frontend carga vía API `GET /clientes-fisicos-para-pago` → `getClientesFisicosParaPago()` (línea 88), que devuelve **solo** clientes de tipo `'fisico'` **con su deuda actual**:

```php
ClientesFisicos: [
  { id: 5, nombre_cliente: "Carlos Ruiz", deuda_pago_cliente: 150.00 },
  ...
]
```

**¿Para qué sirve?** Cuando el usuario define cada **pago**, puede elegir el destino del dinero:
- **Una cuenta bancaria/efectivo** (`cuenta_id`) → el dinero incrementa el saldo de esa cuenta
- **Un cliente físico** (`cliente_id`) → el dinero se registra como **deuda** a favor de ese cliente (incrementa `deuda_pago_cliente`)

Esto se valida en `procesarVenta()` (líneas 803-813):
```php
// Cada pago debe tener cuenta_id O cliente_id (XOR)
if (empty($pago['cuenta_id']) && empty($pago['cliente_id'])) {
    throw 'Cada pago debe tener una cuenta o un cliente como destino.';
}
if (!empty($pago['cuenta_id']) && !empty($pago['cliente_id'])) {
    throw 'Un pago no puede tener cuenta y cliente al mismo tiempo.';
}
```

Y al **aprobar la venta** (`aprobarVenta()`, líneas 1289-1301):
```php
// CASO 1: El destino es un Cliente Físico
if ($pago->cliente_id) {
    $clienteDestino->increment('deuda_pago_cliente', $pago->monto);
    continue; // Saltar procesamiento de cuenta
}
// CASO 2: El destino es una Cuenta
$cuenta->increment('saldo_cuenta', $pago->monto);
```

---

### Resumen visual de la Fase 2

```
┌──────────────────────────────────────────────────┐
│  PASO 1: Seleccionar ALMACÉN                     │
│  (getAlmacenes → lista de almacenes del usuario) │
├──────────────────────────────────────────────────┤
│  PASO 2: (Opcional) Seleccionar CLIENTE          │  ← venta.cliente_id
│  (getClientes → todos los clientes)              │    (el comprador)
│  O crear cliente rápido (storeClienteForVenta)   │
├──────────────────────────────────────────────────┤
│  PASO 3: Agregar PRODUCTOS al carrito            │
│  (getProductosPorAlmacen)                        │
├──────────────────────────────────────────────────┤
│  PASO 4: Definir PAGOS                           │
│  Por cada pago:                                  │
│    - Método: efectivo / transferencia            │
│    - Moneda: USD / CUP / etc                     │
│    - Destino:                                    │
│      ┌─ CUENTA (banco/efectivo) ─┐               │
│      │  o                        │               │
│      └─ CLIENTE FÍSICO ──────────┘               │  ← pago.cliente_id
│         (getClientesFisicosParaPago)              │    (aumenta su deuda)
└──────────────────────────────────────────────────┘
```

Son dos selecciones independientes: el cliente **de** la venta (quién compra, opcional) y el cliente **como destino** de un pago (a quién se le acredita como deuda, alternativa a una cuenta).

---

## User

Bien el  cliente de la venta (quién compra, opcional) que sucede cuando se selecciona? O sea que sucede en la venta en el caso que se selccione?

---

## Assistant (Plan · DeepSeek V4 Flash Free · 9.6s)

_Thinking:_

The user is asking about what happens when a client is selected as the "cliente de la venta" (the buyer). Let me trace through the code to see what impact `cliente_id` has on the sale flow. Let me search through the code to find all places where `cliente_id` is used.

From what I've already read, I can trace the usage:

1. In `procesarVenta()` - the `cliente_id` is saved to the `ventas` table
2. In `show()` - the cliente is loaded and displayed
3. In `listadoVentas()` - the cliente is loaded and displayed
4. In `aprobarVenta()` - I don't see `cliente_id` being used in the approval logic specifically for the sale's client (only for payment's client_id)

Let me think about what happens... The `cliente_id` on the venta itself is just stored as a reference to who made the purchase. It doesn't trigger any financial movements. Unlike the payment's `cliente_id` which increases debt, the sale's `cliente_id` is purely informational/relational.

Let me verify by searching for how `venta.cliente_id` is used elsewhere in the codebase to see if there are any side effects.

Cuando se selecciona el **cliente de la venta** (`venta.cliente_id`), **no tiene ningún efecto financiero**. Es puramente informativo/relacional. Te muestro exactamente dónde impacta:

### En `procesarVenta()` (línea 942)
Simplemente se guarda en la tabla `ventas`:
```php
'cliente_id' => $validatedData['cliente_id'],
```
No hay ningún `increment`, `decrement`, ni lógica de deuda asociada a este campo.

### En `aprobarVenta()` (líneas 1289-1301)
La única lógica de cliente que se ejecuta es sobre **`pago.cliente_id`** (destino del pago), no sobre `venta.cliente_id`.

### Entonces, ¿para qué sirve?

- **Visual/Reportes**: aparece en `show()` (línea 504), `listadoVentas()` (línea 1439), y en los reportes para saber **quién compró**
- **Filtrado**: en `listadoVentas()` se puede filtrar ventas por cliente
- **Relación**: permite tener trazabilidad de "a nombre de quién" se hizo la venta

### O sea:
| Campo | Efecto financiero |
|---|---|
| `venta.cliente_id` | ❌ **Ninguno**. Solo identifica quién compró. |
| `pago.cliente_id` | ✅ **Sí**. Al aprobar la venta, incrementa `deuda_pago_cliente` del cliente físico. |

---

