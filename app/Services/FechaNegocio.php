<?php

namespace App\Services;

use Carbon\CarbonImmutable;
use DateTimeInterface;

/**
 * Convierte el día que el usuario elige en un filtro (día de la zona del negocio) al rango de
 * instantes UTC con que se guardan los timestamps. Sin esto, `whereDate` compara contra el día
 * UTC y una venta de las 20:00 a las 24:00 en Cuba cae en el día siguiente.
 *
 * Solo para columnas timestamp. Una columna `date` (p. ej. compras.fecha_compra) ya es el día
 * del negocio y se sigue filtrando con `whereDate`.
 */
class FechaNegocio
{
    /** Primer instante del día (Y-m-d) en la zona del negocio, expresado en UTC. */
    public static function inicioDelDiaUtc(string $dia): string
    {
        return self::dia($dia)->startOfDay()->utc()->format('Y-m-d H:i:s');
    }

    /** Último instante del día (Y-m-d) en la zona del negocio, expresado en UTC. */
    public static function finDelDiaUtc(string $dia): string
    {
        return self::dia($dia)->endOfDay()->utc()->format('Y-m-d H:i:s');
    }

    /**
     * Rango UTC [inicio, fin] de un día completo, listo para `whereBetween`.
     *
     * @return array{0: string, 1: string}
     */
    public static function rangoDelDiaUtc(string $dia): array
    {
        return [self::inicioDelDiaUtc($dia), self::finDelDiaUtc($dia)];
    }

    /** El instante actual, en la zona del negocio (para mostrar horas y decidir qué es "hoy"). */
    public static function ahora(): CarbonImmutable
    {
        return CarbonImmutable::now(config('app.business_timezone'));
    }

    /** Un instante guardado en UTC (timestamp de la BD), llevado a la zona del negocio. */
    public static function aZonaDelNegocio(DateTimeInterface|string $instante): CarbonImmutable
    {
        return CarbonImmutable::parse($instante)->setTimezone(config('app.business_timezone'));
    }

    /** Día (Y-m-d) del negocio al que pertenece un instante guardado en UTC. */
    public static function diaDe(DateTimeInterface|string $instante): string
    {
        return self::aZonaDelNegocio($instante)->toDateString();
    }

    /** Inicio, en UTC, del día que empezó hace `$dias` días (en la zona del negocio). */
    public static function inicioDeHaceDiasUtc(int $dias): string
    {
        return self::inicioDelDiaUtc(self::ahora()->subDays($dias)->toDateString());
    }

    /**
     * Rango UTC [inicio, fin] del mes actual del negocio.
     *
     * @return array{0: string, 1: string}
     */
    public static function rangoDelMesActualUtc(): array
    {
        $ahora = self::ahora();

        return [
            self::inicioDelDiaUtc($ahora->startOfMonth()->toDateString()),
            self::finDelDiaUtc($ahora->endOfMonth()->toDateString()),
        ];
    }

    private static function dia(string $dia): CarbonImmutable
    {
        return CarbonImmutable::parse($dia, config('app.business_timezone'));
    }
}
