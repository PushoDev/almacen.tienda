import { sileo as sileoBase, type SileoOptions } from 'sileo';

type ColoredType = 'success' | 'error' | 'warning' | 'info' | 'action';

// Mismas familias de color que sileo ya usa para el ícono/título de cada tipo
// (ver --sileo-state-* en node_modules/sileo/dist/styles.css), aplicadas ahora
// también al fondo del toast en vez del fondo invertido neutro (negro/blanco
// según tema claro/oscuro) — el cliente pidió que el color comunique el tipo
// de mensaje (éxito/error/advertencia/etc.), no que dependa del tema de la app.
const TYPE_COLORS: Record<ColoredType, string> = {
    success: '#16a34a',
    error: '#dc2626',
    warning: '#d97706',
    info: '#2563eb',
    action: '#7c3aed',
};

function withColor(type: ColoredType, opts: SileoOptions): SileoOptions {
    return {
        ...opts,
        fill: opts.fill ?? TYPE_COLORS[type],
        styles: {
            ...opts.styles,
            title: `!text-white ${opts.styles?.title ?? ''}`.trim(),
            description: `!text-white/80 ${opts.styles?.description ?? ''}`.trim(),
            badge: `!text-white !bg-white/20 ${opts.styles?.badge ?? ''}`.trim(),
        },
    };
}

type PromiseOptions<T> = Parameters<typeof sileoBase.promise<T>>[1];

export const sileo = {
    ...sileoBase,
    success: (opts: SileoOptions) => sileoBase.success(withColor('success', opts)),
    error: (opts: SileoOptions) => sileoBase.error(withColor('error', opts)),
    warning: (opts: SileoOptions) => sileoBase.warning(withColor('warning', opts)),
    info: (opts: SileoOptions) => sileoBase.info(withColor('info', opts)),
    action: (opts: SileoOptions) => sileoBase.action(withColor('action', opts)),
    promise: <T,>(promise: Promise<T> | (() => Promise<T>), opts: PromiseOptions<T>) =>
        sileoBase.promise(promise, {
            ...opts,
            success: (data: T) => withColor('success', typeof opts.success === 'function' ? opts.success(data) : opts.success),
            error: (err: unknown) => withColor('error', typeof opts.error === 'function' ? opts.error(err) : opts.error),
        }),
};
