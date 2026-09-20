<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreClienteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            //
            'nombre_cliente' => 'required|string|max:255|unique:clientes',
            'tipo_cliente' => 'required|in:fisico,asociado',
            'deuda_pago_cliente' => 'numeric|min:-9999999|max:9999999',
            'telefono_cliente' => 'required|string|max:255|unique:clientes',
            'direccion_cliente' => 'nullable|string|max:255',
            'ciudad_cliente' => 'nullable|string|max:255',
        ];
    }
}
