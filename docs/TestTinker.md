# Movimiento Financiero: Gasto
use App\Models\Cuenta;
use App\Models\MovimientoFinanciero;
use Illuminate\Support\Facades\DB;

// Datos de la transacción
$cuentaOrigenId = 1;
$montoGasto = 50.00;
$tipoMovimientoId = 1; // Gasto

// Iniciar la transacción de base de datos
DB::beginTransaction();

try {
    // 1. Encontrar y bloquear la cuenta
    $cuenta = Cuenta::lockForUpdate()->find($cuentaOrigenId);

    // 2. Verificar saldo y actualizar
    if ($cuenta->saldo_cuenta < $montoGasto) {
        throw new \Exception('Saldo insuficiente para el gasto.');
    }
    $cuenta->saldo_cuenta -= $montoGasto;
    $cuenta->save();

    // 3. Registrar el movimiento
    MovimientoFinanciero::create([
        'tipo_movimiento_id' => $tipoMovimientoId,
        'cuenta_origen_id' => $cuentaOrigenId,
        'cuenta_destino_id' => null, 
        'monto' => $montoGasto,
        'moneda' => 'USD',
        'fecha_operacion' => now(),
    ]);

    DB::commit();
    echo "✅ Gasto de $montoGasto registrado con éxito. Nuevo saldo: " . $cuenta->saldo_cuenta . "\n";

} catch (\Exception $e) {
    DB::rollBack();
    echo "❌ Error al registrar el gasto: " . $e->getMessage() . "\n";
}

# Movimiento Financiero: Ingreso
use App\Models\Cuenta;
use App\Models\MovimientoFinanciero;
use Illuminate\Support\Facades\DB;

// Datos de la transacción
$cuentaDestinoId = 2;
$montoIngreso = 10.00;
$tipoMovimientoId = 2; // Ingreso

// Iniciar la transacción de base de datos
DB::beginTransaction();

try {
    // 1. Encontrar y bloquear la cuenta
    $cuenta = Cuenta::lockForUpdate()->find($cuentaDestinoId);
    
    // 2. Actualizar saldo (SUMAR)
    $cuenta->saldo_cuenta += $montoIngreso;
    $cuenta->save();

    // 3. Registrar el movimiento
    MovimientoFinanciero::create([
        'tipo_movimiento_id' => $tipoMovimientoId,
        'cuenta_origen_id' => null, 
        'cuenta_destino_id' => $cuentaDestinoId,
        'monto' => $montoIngreso,
        'moneda' => 'EUR',
        'fecha_operacion' => now(),
    ]);

    DB::commit();
    echo "✅ Ingreso de $montoIngreso registrado con éxito. Nuevo saldo: " . $cuenta->saldo_cuenta . "\n";

} catch (\Exception $e) {
    DB::rollBack();
    echo "❌ Error al registrar el ingreso: " . $e->getMessage() . "\n";
}


# Movimiento Financiero: Transaferencia
use App\Models\Cuenta;
use App\Models\MovimientoFinanciero;
use Illuminate\Support\Facades\DB;

// Datos de la transacción
$origenId = 1;
$destinoId = 3; // ASUME que existe la Cuenta 3
$montoTransferencia = 100.00;
$tipoMovimientoId = 3; // Transferencia

// Iniciar la transacción de base de datos
DB::beginTransaction();

try {
    // 1. Bloquear ambas cuentas
    $cuentaOrigen = Cuenta::lockForUpdate()->find($origenId);
    $cuentaDestino = Cuenta::lockForUpdate()->find($destinoId);

    if (!$cuentaOrigen || !$cuentaDestino) {
         throw new \Exception('Una de las cuentas no existe.');
    }
    
    // 2. Validación de saldo en origen
    if ($cuentaOrigen->saldo_cuenta < $montoTransferencia) {
        throw new \Exception('Saldo insuficiente para la transferencia.');
    }
    
    // 3. Actualizar Origen (RESTAR)
    $cuentaOrigen->saldo_cuenta -= $montoTransferencia;
    $cuentaOrigen->save();

    // 4. Actualizar Destino (SUMAR) - Sin conversión, el monto es el mismo
    $montoAfectarDestino = $montoTransferencia; 
    $cuentaDestino->saldo_cuenta += $montoAfectarDestino;
    $cuentaDestino->save();

    // 5. Registrar el movimiento
    MovimientoFinanciero::create([
        'tipo_movimiento_id' => $tipoMovimientoId,
        'cuenta_origen_id' => $origenId,
        'cuenta_destino_id' => $destinoId,
        'monto' => $montoTransferencia,
        'moneda' => 'USD',
        'tasa_cambio_aplicada' => null, 
        'fecha_operacion' => now(),
    ]);

    DB::commit();
    echo "✅ Transferencia de $montoTransferencia registrada con éxito.\n";
    echo "Nuevo saldo Origen (ID $origenId): " . $cuentaOrigen->saldo_cuenta . "\n";
    echo "Nuevo saldo Destino (ID $destinoId): " . $cuentaDestino->saldo_cuenta . "\n";

} catch (\Exception $e) {
    DB::rollBack();
    echo "❌ Error al registrar la transferencia: " . $e->getMessage() . "\n";
}
