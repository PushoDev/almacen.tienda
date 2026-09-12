<?php

namespace App\Services;

class CatalogoTarjetasService
{
    /**
     * Catálogo de bancos/diseños de tarjeta (+ imágenes de moneda para cuentas tipo
     * "efectivo") para la feature "Cuentas → tarjetas de banco". No es una tabla en base de
     * datos a propósito (ver migración agregar_imagen_a_cuentas_table): el catálogo de
     * imágenes en public/projects/ sigue creciendo según lo pida el cliente, así que agregar
     * un banco/moneda nuevo es solo agregar una fila acá + el archivo de imagen — sin migración.
     *
     * @return array<string, array{nombre: string, grupo: 'interna'|'externa'|'efectivo', imagen: string}>
     */
    private static function todos(): array
    {
        return [
            // Internas — bancos cubanos (público objetivo del proyecto).
            'bandec' => ['nombre' => 'BANDEC', 'grupo' => 'interna', 'imagen' => 'card_cubans/bandec_tarjeta.webp'],
            'bpa' => ['nombre' => 'BPA', 'grupo' => 'interna', 'imagen' => 'card_cubans/bpa_tarjeta.webp'],
            'metropolitano' => ['nombre' => 'Metropolitano', 'grupo' => 'interna', 'imagen' => 'card_cubans/metropolitano.webp'],
            'clasica' => ['nombre' => 'Clásica', 'grupo' => 'interna', 'imagen' => 'card_cubans/tarjeta_classica.webp'],
            'tropical' => ['nombre' => 'Tropical', 'grupo' => 'interna', 'imagen' => 'card_cubans/tropical_tarjeta.webp'],
            // Externas — redes/métodos internacionales.
            'visa' => ['nombre' => 'Visa', 'grupo' => 'externa', 'imagen' => 'card_interacionales/Visa.webp'],
            'mastercard' => ['nombre' => 'Mastercard', 'grupo' => 'externa', 'imagen' => 'card_interacionales/Mastercard.webp'],
            'zelle' => ['nombre' => 'Zelle', 'grupo' => 'externa', 'imagen' => 'card_interacionales/Zelle.webp'],
            'discovery' => ['nombre' => 'Discovery', 'grupo' => 'externa', 'imagen' => 'card_interacionales/Discovery.webp'],
            'diners_club' => ['nombre' => 'Diners Club', 'grupo' => 'externa', 'imagen' => 'card_interacionales/DinersClub.webp'],
            'amex_azul' => ['nombre' => 'American Express Azul', 'grupo' => 'externa', 'imagen' => 'card_interacionales/AmexAzul.webp'],
            'amex_gold' => ['nombre' => 'American Express Gold', 'grupo' => 'externa', 'imagen' => 'card_interacionales/AmexGold.webp'],
            'venture_x' => ['nombre' => 'Capital One Venture X', 'grupo' => 'externa', 'imagen' => 'card_interacionales/VentureX.webp'],
            'wells_fargo' => ['nombre' => 'Wells Fargo', 'grupo' => 'externa', 'imagen' => 'card_interacionales/WellsFargo.webp'],
            'citi' => ['nombre' => 'Citi', 'grupo' => 'externa', 'imagen' => 'card_interacionales/Citi.webp'],
            'cashapp' => ['nombre' => 'Cash App', 'grupo' => 'externa', 'imagen' => 'card_interacionales/CashApp.webp'],
            'amazon' => ['nombre' => 'Amazon', 'grupo' => 'externa', 'imagen' => 'card_interacionales/Amazon.webp'],
            'bank_of_america' => ['nombre' => 'Bank of America', 'grupo' => 'externa', 'imagen' => 'card_interacionales/BankOfAmerica.webp'],
            'freedom_unlimited' => ['nombre' => 'Chase Freedom Unlimited', 'grupo' => 'externa', 'imagen' => 'card_interacionales/FreedomUnlimited.webp'],
            'square' => ['nombre' => 'Square', 'grupo' => 'externa', 'imagen' => 'card_interacionales/Square.webp'],
            // Efectivo — insignias por moneda, para cuentas tipo=efectivo (mismo mecanismo,
            // no un mapeo automático desde cuentas.moneda_id: el usuario elige explícitamente,
            // igual que con el banco de una tarjeta).
            'usd' => ['nombre' => 'USD', 'grupo' => 'efectivo', 'imagen' => 'efectivo/usd.webp'],
            'cup' => ['nombre' => 'CUP', 'grupo' => 'efectivo', 'imagen' => 'efectivo/cup.webp'],
            'eur' => ['nombre' => 'EUR', 'grupo' => 'efectivo', 'imagen' => 'efectivo/eur.webp'],
        ];
    }

    /**
     * Slugs válidos — para la regla de validación `in:...` en CuentaController.
     *
     * @return array<int, string>
     */
    public static function slugsValidos(): array
    {
        return array_keys(self::todos());
    }

    /**
     * Bancos válidos para clasificar `cuentas.tipo_banco` — internas + externas, sin
     * efectivo (una moneda no es un banco; las cuentas tipo=efectivo hacen función de
     * caja y no tienen banco asignable). Lista plana para un `<select>` simple; crece
     * sola a medida que se agreguen bancos/tarjetas nuevos a todos(), sin tocar nada más.
     *
     * @return array<int, array{slug: string, nombre: string}>
     */
    public static function bancos(): array
    {
        $bancos = [];

        foreach (self::todos() as $slug => $item) {
            if (in_array($item['grupo'], ['interna', 'externa'], true)) {
                $bancos[] = ['slug' => $slug, 'nombre' => $item['nombre']];
            }
        }

        return $bancos;
    }

    /**
     * Slugs de banco válidos — para la regla `in:...` de `tipo_banco` en CuentaController.
     *
     * @return array<int, string>
     */
    public static function bancoSlugsValidos(): array
    {
        return array_column(self::bancos(), 'slug');
    }

    /**
     * Catálogo agrupado interna/externa/efectivo con la URL de imagen ya resuelta — para
     * exponer al frontend (selector con pestañas Internas/Externas para tarjeta, grilla
     * plana de efectivo para cuentas tipo=efectivo).
     *
     * @return array{interna: array<int, array{slug: string, nombre: string, imagen_url: string}>, externa: array<int, array{slug: string, nombre: string, imagen_url: string}>, efectivo: array<int, array{slug: string, nombre: string, imagen_url: string}>}
     */
    public static function agrupado(): array
    {
        $grupos = ['interna' => [], 'externa' => [], 'efectivo' => []];

        foreach (self::todos() as $slug => $item) {
            $grupos[$item['grupo']][] = [
                'slug' => $slug,
                'nombre' => $item['nombre'],
                'imagen_url' => asset('projects/'.$item['imagen']),
            ];
        }

        return $grupos;
    }

    /**
     * Un solo item del catálogo por slug (ej. para resolver la imagen de una cuenta ya
     * guardada sin repetir el mapeo en el frontend). Null si el slug no existe o es null
     * (cuenta sin banco asignado todavía).
     *
     * @return array{slug: string, nombre: string, imagen_url: string}|null
     */
    public static function porSlug(?string $slug): ?array
    {
        $item = self::todos()[$slug] ?? null;

        if (! $item) {
            return null;
        }

        return [
            'slug' => $slug,
            'nombre' => $item['nombre'],
            'imagen_url' => asset('projects/'.$item['imagen']),
        ];
    }
}
