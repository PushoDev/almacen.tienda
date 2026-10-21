<?php

namespace App\Services;

use App\Models\CasilleroCargo;
use App\Models\Compra;
use App\Models\Contenedor;
use App\Models\Cuenta;
use App\Models\MovimientoFinanciero;
use App\Models\User;
use DomainException;
use Illuminate\Support\Facades\DB;

/**
 * Casillero de Compras: las compras del flujo "casillero" esperan en Panamá sin tocar el stock, y
 * se les anotan cargos a mano (estadía, etc.); el contenedor que sale hacia el Mariel lleva los
 * suyos (transporte marítimo y otros). Ver docs/plan-casillero-de-compras.md.
 *
 * Los montos nunca se calculan solos: los escribe el usuario. Cada cargo se paga en el momento con
 * un Gasto (`movimientos_financieros`, tipo 1) desde una cuenta USD.
 */
class CasilleroService
{
    public const MONEDA_CARGOS_PANAMA = 'USD';

    private const TIPO_MOVIMIENTO_GASTO = 1;

    /**
     * Anota un cargo sobre una o varias compras del casillero y lo paga desde una cuenta USD.
     *
     * @param  array{compra_ids: array<int, int>, concepto: string, nota?: ?string, monto: float|int|string, cuenta_id: int, fecha?: ?string}  $datos
     *
     * @throws DomainException si una compra no está en el casillero, la cuenta no es USD o no alcanza el saldo
     */
    public function registrarCargo(User $usuario, array $datos): CasilleroCargo
    {
        $compraIds = array_values(array_unique(array_map('intval', $datos['compra_ids'])));

        if ($compraIds === []) {
            throw new DomainException('Elige al menos una compra del casillero.');
        }

        return DB::transaction(function () use ($usuario, $datos, $compraIds): CasilleroCargo {
            $compras = Compra::whereIn('id', $compraIds)->lockForUpdate()->get();

            if ($compras->count() !== count($compraIds)) {
                throw new DomainException('Alguna de las compras elegidas no existe.');
            }

            foreach ($compras as $compra) {
                $this->exigirEnCasillero($compra);
            }

            $cargo = $this->pagarCargo(
                $usuario,
                $datos,
                'Cargo del casillero: '.trim($datos['concepto']).' (compras #'.implode(', #', $compraIds).')',
            );

            $cargo->compras()->sync($compraIds);

            return $cargo->load(['compras', 'cuenta']);
        });
    }

    /**
     * Anota un cargo sobre un contenedor abierto (transporte marítimo y otros) y lo paga desde una
     * cuenta USD.
     *
     * @param  array{concepto: string, nota?: ?string, monto: float|int|string, cuenta_id: int, fecha?: ?string}  $datos
     *
     * @throws DomainException si el contenedor no está abierto, la cuenta no es USD o no alcanza el saldo
     */
    public function registrarCargoContenedor(User $usuario, Contenedor $contenedor, array $datos): CasilleroCargo
    {
        return DB::transaction(function () use ($usuario, $contenedor, $datos): CasilleroCargo {
            $contenedor = Contenedor::whereKey($contenedor->id)->lockForUpdate()->firstOrFail();

            if (! $contenedor->estaAbierto()) {
                throw new DomainException('Solo se anotan cargos en un contenedor abierto.');
            }

            return $this->pagarCargo(
                $usuario,
                $datos,
                'Cargo del contenedor «'.$contenedor->nombre.'»: '.trim($datos['concepto']),
                $contenedor->id,
            )->load('cuenta');
        });
    }

    /**
     * Anula un cargo: la cuenta recupera exactamente lo que se le descontó y el Gasto queda
     * cancelado. Un cargo de compras solo mientras todas sus compras sigan en el casillero; uno de
     * contenedor, mientras el contenedor siga abierto.
     *
     * @throws DomainException si el cargo ya está anulado o ya no se puede anular
     */
    public function anularCargo(CasilleroCargo $cargo, string $motivo): CasilleroCargo
    {
        return DB::transaction(function () use ($cargo, $motivo): CasilleroCargo {
            $cargo = CasilleroCargo::whereKey($cargo->id)->lockForUpdate()->firstOrFail();

            if (! $cargo->estaActivo()) {
                throw new DomainException('Este cargo ya está anulado.');
            }

            if ($cargo->contenedor_id !== null) {
                $contenedor = Contenedor::whereKey($cargo->contenedor_id)->lockForUpdate()->firstOrFail();

                if (! $contenedor->estaAbierto()) {
                    throw new DomainException('No se puede anular el cargo: el contenedor ya no está abierto.');
                }
            } else {
                foreach ($cargo->compras()->lockForUpdate()->get() as $compra) {
                    $this->exigirEnCasillero($compra, 'No se puede anular el cargo: la compra #'.$compra->id.' ya salió del casillero.');
                }
            }

            $movimiento = $cargo->movimientoFinanciero;

            if ($movimiento !== null && $movimiento->estado !== 'cancelado') {
                $delta = (float) $movimiento->saldo_anterior_origen - (float) $movimiento->saldo_posterior_origen;
                Cuenta::whereKey($movimiento->cuenta_origen_id)->lockForUpdate()->first()?->increment('saldo_cuenta', $delta);

                $movimiento->update([
                    'estado' => 'cancelado',
                    'motivo_anulacion' => 'otros',
                    'detalle_anulacion' => $motivo,
                ]);
            }

            $cargo->update([
                'estado' => CasilleroCargo::ESTADO_ANULADO,
                'motivo_anulacion' => $motivo,
            ]);

            return $cargo;
        });
    }

    /**
     * Anota el día en que la compra llegó al casillero de Panamá.
     *
     * @throws DomainException si la compra no está en el casillero
     */
    public function marcarLlegadaPanama(Compra $compra, string $fecha): Compra
    {
        return DB::transaction(function () use ($compra, $fecha): Compra {
            $compra = Compra::whereKey($compra->id)->lockForUpdate()->firstOrFail();

            $this->exigirEnCasillero($compra);

            $compra->update(['llegada_panama_at' => $fecha]);

            return $compra;
        });
    }

    /**
     * Descuenta el cargo de una cuenta USD con un Gasto y lo registra. Debe llamarse dentro de una
     * transacción; la validación de a qué se le anota el cargo es de quien lo llama.
     *
     * @param  array{concepto: string, nota?: ?string, monto: float|int|string, cuenta_id: int, fecha?: ?string}  $datos
     */
    private function pagarCargo(User $usuario, array $datos, string $descripcion, ?int $contenedorId = null): CasilleroCargo
    {
        $monto = round((float) $datos['monto'], 2);

        if ($monto <= 0) {
            throw new DomainException('El monto del cargo debe ser mayor que cero.');
        }

        $cuenta = Cuenta::with('moneda')->lockForUpdate()->findOrFail($datos['cuenta_id']);

        if ($cuenta->moneda?->codigo_moneda !== self::MONEDA_CARGOS_PANAMA) {
            throw new DomainException('Los cargos en Panamá se pagan desde una cuenta en '.self::MONEDA_CARGOS_PANAMA.'.');
        }

        if ((float) $cuenta->saldo_cuenta < $monto) {
            throw new DomainException("La cuenta {$cuenta->nombre_cuenta} no tiene saldo suficiente para este cargo.");
        }

        $saldoAnterior = (float) $cuenta->saldo_cuenta;
        $cuenta->decrement('saldo_cuenta', $monto);

        $movimiento = MovimientoFinanciero::create([
            'user_id' => $usuario->id,
            'turno_vendedor_id' => $usuario->turnoActivo()?->id,
            'tipo_movimiento_id' => self::TIPO_MOVIMIENTO_GASTO,
            'cuenta_origen_id' => $cuenta->id,
            'monto' => $monto,
            'monto_usd' => $monto,
            'moneda' => self::MONEDA_CARGOS_PANAMA,
            'tasa_cambio_aplicada' => 1.0,
            'descripcion' => $descripcion,
            'fecha_operacion' => now(),
            'estado' => 'completado',
            'saldo_anterior_origen' => $saldoAnterior,
            'saldo_posterior_origen' => $saldoAnterior - $monto,
            'moneda_origen' => self::MONEDA_CARGOS_PANAMA,
        ]);

        return CasilleroCargo::create([
            'user_id' => $usuario->id,
            'contenedor_id' => $contenedorId,
            'concepto' => trim($datos['concepto']),
            'nota' => $datos['nota'] ?? null,
            'moneda' => self::MONEDA_CARGOS_PANAMA,
            'monto' => $monto,
            'tasa_cambio' => 1,
            'monto_usd' => $monto,
            'cuenta_id' => $cuenta->id,
            'movimiento_financiero_id' => $movimiento->id,
            'fecha' => $datos['fecha'] ?? now()->toDateString(),
            'estado' => CasilleroCargo::ESTADO_ACTIVO,
        ]);
    }

    private function exigirEnCasillero(Compra $compra, ?string $mensaje = null): void
    {
        $enCasillero = $compra->esDelCasillero()
            && $compra->estado === 'pendiente'
            && $compra->etapa === Compra::ETAPA_CASILLERO;

        if (! $enCasillero) {
            throw new DomainException($mensaje ?? "La compra #{$compra->id} no está en el casillero.");
        }
    }
}
