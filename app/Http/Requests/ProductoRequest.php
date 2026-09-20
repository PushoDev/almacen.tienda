<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProductoRequest extends FormRequest
{
    /**
     * Determina si el usuario está autorizado a hacer esta petición.
     */
    public function authorize(): bool
    {
        // En este caso, permitiremos que cualquier usuario autenticado haga la petición.
        // Puedes agregar aquí una lógica más compleja si necesitas,
        // por ejemplo, verificar si el usuario tiene un rol específico.
        return true;
    }

    /**
     * Obtiene las reglas de validación que se aplican a la petición.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // Obtiene la instancia del producto de la ruta si existe.
        // Esto es necesario para la regla 'unique' en la actualización.
        $productoId = $this->route('producto') ? $this->route('producto')->id : null;

        return [
            'nombre_producto' => ['required', 'string', 'max:255'],
            'marca_producto' => ['nullable', 'string', 'max:255'],
            'codigo_producto' => [
                'nullable',
                'string',
                'unique:productos,codigo_producto,'.$productoId,
            ],
            'categoria_id' => ['required', 'exists:categorias,id'],
            'precio_compra_producto' => ['required', 'numeric', 'min:0'],
            'cantidad_producto' => ['nullable', 'integer', 'min:0'], // 'cantidad_producto' ahora es nullable
            'imagen_producto' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif,webp', 'max:2048'],
        ];
    }

    /**
     * Mensajes de error personalizados para las reglas de validación.
     */
    public function messages(): array
    {
        return [
            'nombre_producto.required' => 'El nombre del producto es obligatorio.',
            'nombre_producto.string' => 'El nombre del producto debe ser un texto.',
            'nombre_producto.max' => 'El nombre del producto no puede superar los 255 caracteres.',
            'codigo_producto.unique' => 'Ya existe un producto con este código.',
            'categoria_id.required' => 'La categoría es obligatoria.',
            'categoria_id.exists' => 'La categoría seleccionada no es válida.',
            'precio_compra_producto.required' => 'El precio de compra es obligatorio.',
            'precio_compra_producto.numeric' => 'El precio debe ser un número.',
            'precio_compra_producto.min' => 'El precio no puede ser negativo.',
            'imagen_producto.image' => 'El archivo debe ser una imagen.',
            'imagen_producto.mimes' => 'El formato de la imagen no es válido. Formatos permitidos: jpeg, png, jpg, gif, webp.',
            'imagen_producto.max' => 'La imagen no debe pesar más de 2MB.',
        ];
    }
}
