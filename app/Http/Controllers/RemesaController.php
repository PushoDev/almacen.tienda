<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use App\Models\Cuenta;
use App\Models\Moneda;
use App\Models\Proveedor;
use App\Models\Remesa;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\ValidationException;

class RemesaController extends Controller
{
    /**
     * Datos para el formulario de Remesa (admin/moderador ven todas las cuentas —
     * la ruta ya está gateada al middleware 'admin', no hay restricción de vendedor aquí).
     */
    public function formData()
    {
        return response()->json([
            'cuentas' => Cuenta::with('moneda')->get(),
            'clientes' => Cliente::all(),
            'proveedores' => Proveedor::all(),
        ]);
    }

    public function store(Request $request)
    {
        $monedasValidas = $this->obtenerCodigosMonedasActivas();

        $request->validate([
            'entrada_tipo' => 'required|string|in:cuenta,cliente,proveedor',
            'entrada_id' => 'required|integer',
            'entrada_monto' => 'required|numeric|min:0.01',
            'salida_tipo' => 'required|string|in:cuenta,cliente,proveedor',
            'salida_id' => 'required|integer',
            'salida_monto' => 'required|numeric|min:0.01',
            'mensajero_cuenta_id' => 'nullable|integer|exists:cuentas,id|required_with:mensajero_monto',
            'mensajero_monto' => 'nullable|numeric|min:0.01|required_with:mensajero_cuenta_id',
            'notas' => 'nullable|string|max:500',
        ]);

        DB::beginTransaction();

        try {
            $entrada = $this->resolverEntidad($request->entrada_tipo, $request->entrada_id);
            $salida = $this->resolverEntidad($request->salida_tipo, $request->salida_id);

            $entradaSaldoAnterior = $this->saldoDeEntidad($entrada, $request->entrada_tipo);
            $this->aplicarIngreso($entrada, $request->entrada_tipo, $request->entrada_monto);
            $entradaSaldoPosterior = $entradaSaldoAnterior + $request->entrada_monto;

            $salidaSaldoAnterior = $this->saldoDeEntidad($salida, $request->salida_tipo);
            $this->aplicarEgreso($salida, $request->salida_tipo, $request->salida_monto);
            $salidaSaldoPosterior = $salidaSaldoAnterior - $request->salida_monto;

            $remesaData = [
                'user_id' => auth()->id(),
                'turno_vendedor_id' => auth()->user()->turnoActivo()?->id,
                'entrada_tipo' => $request->entrada_tipo,
                'entrada_cuenta_id' => $request->entrada_tipo === 'cuenta' ? $entrada->id : null,
                'entrada_cliente_id' => $request->entrada_tipo === 'cliente' ? $entrada->id : null,
                'entrada_proveedor_id' => $request->entrada_tipo === 'proveedor' ? $entrada->id : null,
                'entrada_monto' => $request->entrada_monto,
                'entrada_moneda' => $this->monedaDeEntidad($entrada, $request->entrada_tipo),
                'entrada_saldo_anterior' => $entradaSaldoAnterior,
                'entrada_saldo_posterior' => $entradaSaldoPosterior,
                'salida_tipo' => $request->salida_tipo,
                'salida_cuenta_id' => $request->salida_tipo === 'cuenta' ? $salida->id : null,
                'salida_cliente_id' => $request->salida_tipo === 'cliente' ? $salida->id : null,
                'salida_proveedor_id' => $request->salida_tipo === 'proveedor' ? $salida->id : null,
                'salida_monto' => $request->salida_monto,
                'salida_moneda' => $this->monedaDeEntidad($salida, $request->salida_tipo),
                'salida_saldo_anterior' => $salidaSaldoAnterior,
                'salida_saldo_posterior' => $salidaSaldoPosterior,
                'notas' => $request->notas,
                'fecha_operacion' => now(),
            ];

            if ($request->filled('mensajero_cuenta_id')) {
                $mensajeroCuenta = Cuenta::with('moneda')->lockForUpdate()->findOrFail($request->mensajero_cuenta_id);

                $mensajeroSaldoAnterior = (float) $mensajeroCuenta->saldo_cuenta;
                $mensajeroCuenta->decrement('saldo_cuenta', $request->mensajero_monto);
                $mensajeroSaldoPosterior = $mensajeroSaldoAnterior - $request->mensajero_monto;

                $remesaData['mensajero_cuenta_id'] = $mensajeroCuenta->id;
                $remesaData['mensajero_monto'] = $request->mensajero_monto;
                $remesaData['mensajero_moneda'] = $mensajeroCuenta->moneda->codigo_moneda;
                $remesaData['mensajero_saldo_anterior'] = $mensajeroSaldoAnterior;
                $remesaData['mensajero_saldo_posterior'] = $mensajeroSaldoPosterior;
            }

            $remesa = Remesa::create($remesaData);

            DB::commit();

            return Redirect::route('transacciones')
                ->with('success', "✅ Remesa registrada con éxito (Entrada: {$request->entrada_monto} {$remesa->entrada_moneda}, Salida: {$request->salida_monto} {$remesa->salida_moneda}).");
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error al registrar remesa: '.$e->getMessage());
            throw ValidationException::withMessages(['message' => [$e->getMessage()]]);
        }
    }

    private function obtenerCodigosMonedasActivas(): array
    {
        return Moneda::where('estado', true)
            ->pluck('codigo_moneda')
            ->unique()
            ->toArray();
    }

    private function resolverEntidad(string $tipo, int $id)
    {
        return match ($tipo) {
            'cuenta' => Cuenta::with('moneda')->lockForUpdate()->findOrFail($id),
            'cliente' => Cliente::lockForUpdate()->findOrFail($id),
            'proveedor' => Proveedor::lockForUpdate()->findOrFail($id),
            default => throw new \Exception("Tipo de entidad no válido: {$tipo}"),
        };
    }

    private function monedaDeEntidad($entidad, string $tipo): string
    {
        return $tipo === 'cuenta' ? $entidad->moneda->codigo_moneda : 'USD';
    }

    private function saldoDeEntidad($entidad, string $tipo): float
    {
        return (float) match ($tipo) {
            'cuenta' => $entidad->saldo_cuenta,
            'cliente' => $entidad->deuda_pago_cliente,
            'proveedor' => $entidad->saldo_proveedor,
        };
    }

    private function aplicarIngreso($entidad, string $tipo, float $monto): void
    {
        match ($tipo) {
            'cuenta' => $entidad->increment('saldo_cuenta', $monto),
            'cliente' => $entidad->increment('deuda_pago_cliente', $monto),
            'proveedor' => $entidad->increment('saldo_proveedor', $monto),
        };
    }

    private function aplicarEgreso($entidad, string $tipo, float $monto): void
    {
        match ($tipo) {
            'cuenta' => $entidad->decrement('saldo_cuenta', $monto),
            'cliente' => $entidad->decrement('deuda_pago_cliente', $monto),
            'proveedor' => $entidad->decrement('saldo_proveedor', $monto),
        };
    }
}
