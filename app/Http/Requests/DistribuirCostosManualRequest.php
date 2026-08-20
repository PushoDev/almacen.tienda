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
            'exchange_rate' => 'nullable|numeric|min:0.0001',
            'details'       => 'nullable|string|max:1000',

            // Una o varias compras cubiertas por esta distribución ("lote")
            'purchase_ids'   => 'required|array|min:1',
            'purchase_ids.*' => 'required|exists:compras,id',

            // Una o varias cuentas financiando esta distribución — pueden ser CUP o USD
            // mezcladas; el monto va en la moneda propia de cada cuenta.
            'cuentas'              => 'required|array|min:1',
            'cuentas.*.account_id' => 'required|exists:cuentas,id',
            'cuentas.*.monto'      => 'required|numeric|min:0.01',

            // El array de productos con su distribución manual
            'productos'              => 'required|array',
            'productos.*.product_id' => 'required|exists:productos,id',
            'productos.*.amount_usd' => 'required|numeric|min:0',
        ];
    }
}
