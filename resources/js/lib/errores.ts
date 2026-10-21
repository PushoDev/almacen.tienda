/**
 * Los errores de un `useForm` de Inertia están tipados con los campos del formulario, pero el servidor
 * también manda errores generales (`error`, `message`) y de campos que el formulario no declara. Este
 * helper los lee sin perder el tipo del resto de `form.errors`.
 */
export const errorDe = (errores: object, clave: string): string | undefined => {
    const valor = (errores as Record<string, unknown>)[clave];

    return typeof valor === 'string' ? valor : undefined;
};
