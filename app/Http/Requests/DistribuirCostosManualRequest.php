<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DistribuirCostosManualRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Permite ususarios athetificados
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            //
            'purchase_id'   => 'required|exists:compras,id',
            'account_id'    => 'required|exists:cuentas,id',
            'amount_cup'    => 'required|numeric|min:0.01',
            'exchange_rate' => 'nullable|numeric|min:0.0001',
            'details'       => 'nullable|string|max:1000',

            // El array de productos con su distribución manual
            'productos'              => 'required|array',
            'productos.*.product_id' => 'required|exists:productos,id',
            'productos.*.amount_usd' => 'required|numeric|min:0',
        ];
    }
}
