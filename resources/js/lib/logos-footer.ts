import type { LogoLoopItem } from '@/components/animated/logo-loop';

/**
 * Logos de la cinta del footer del login: bancos, redes de pago, vías de pago y monedas. Son
 * miniaturas recortadas de las imágenes de public/projects/* (card_cubans, card_interacionales,
 * metodos_pago, efectivo y monedas), generadas en public/projects/footer/ con el nombre
 * `{carpeta}__{archivo}.webp`.
 */
const logo = (carpeta: string, archivo: string, alt: string): LogoLoopItem => ({
    src: `/projects/footer/${carpeta}__${archivo}.webp`,
    alt,
});

export const LOGOS_FOOTER: LogoLoopItem[] = [
    logo('card_cubans', 'bandec_tarjeta', 'BANDEC'),
    logo('card_cubans', 'bpa_tarjeta', 'BPA'),
    logo('card_cubans', 'metropolitano', 'Metropolitano'),
    logo('card_cubans', 'tarjeta_classica', 'Clásica'),
    logo('card_cubans', 'tropical_tarjeta', 'Tropical'),
    logo('card_interacionales', 'Visa', 'Visa'),
    logo('card_interacionales', 'Mastercard', 'Mastercard'),
    logo('card_interacionales', 'Zelle', 'Zelle'),
    logo('card_interacionales', 'Discovery', 'Discovery'),
    logo('card_interacionales', 'DinersClub', 'Diners Club'),
    logo('card_interacionales', 'AmexAzul', 'American Express Azul'),
    logo('card_interacionales', 'AmexGold', 'American Express Gold'),
    logo('card_interacionales', 'VentureX', 'Capital One Venture X'),
    logo('card_interacionales', 'WellsFargo', 'Wells Fargo'),
    logo('card_interacionales', 'Citi', 'Citi'),
    logo('card_interacionales', 'CashApp', 'Cash App'),
    logo('card_interacionales', 'Amazon', 'Amazon'),
    logo('card_interacionales', 'BankOfAmerica', 'Bank of America'),
    logo('card_interacionales', 'FreedomUnlimited', 'Chase Freedom Unlimited'),
    logo('card_interacionales', 'Square', 'Square'),
    logo('metodos_pago', 'paypal', 'PayPal'),
    logo('metodos_pago', 'stripe', 'Stripe'),
    logo('metodos_pago', 'qvapay', 'QvaPay'),
    logo('metodos_pago', 'tropipay', 'TropiPay'),
    logo('metodos_pago', 'enzona', 'EnZona'),
    logo('metodos_pago', 'transfermovil', 'Transfermóvil'),
    logo('metodos_pago', 'googlepay', 'Google Pay'),
    logo('metodos_pago', 'moneygram', 'MoneyGram'),
    logo('metodos_pago', 'westernunion', 'Western Union'),
    logo('metodos_pago', 'transferencia', 'Transferencia'),
    logo('metodos_pago', 'efectivo', 'Efectivo'),
    logo('efectivo', 'cup', 'Efectivo CUP'),
    logo('efectivo', 'eur', 'Efectivo EUR'),
    logo('efectivo', 'usd', 'Efectivo USD'),
    logo('monedas', 'cup', 'CUP'),
    logo('monedas', 'eur', 'EUR'),
    logo('monedas', 'usd', 'USD'),
    logo('monedas', 'brl', 'BRL'),
    logo('monedas', 'mxn', 'MXN'),
];
