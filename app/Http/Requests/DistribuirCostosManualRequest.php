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

            // Una o varias compras cubiertas por esta distribución ("lote"), O un lote de
            // movimientos (movimiento_ids) — mutuamente excluyentes, nunca ambos a la vez (ver
            // withValidator() más abajo).
            'purchase_ids'   => 'required_without:movimiento_ids|array|min:1',
            'purchase_ids.*' => 'required|exists:compras,id',

            'movimiento_ids'   => 'required_without:purchase_ids|array|min:1',
            'movimiento_ids.*' => 'required|exists:movimientos,id',

            // Una o varias cuentas financiando esta distribución — pueden ser CUP o USD
            // mezcladas; el monto va en la moneda propia de cada cuenta.
            'cuentas'              => 'required|array|min:1',
            'cuentas.*.account_id' => 'required|exists:cuentas,id',
            'cuentas.*.monto'      => 'required|numeric|min:0.01',

            // Los productos y sus montos ya NO se reciben del formulario — el reparto es
            // 100% automático, calculado en el controlador a partir del peso de cada producto
            // dentro del total de las compras del lote (ver DistribucionCostosController).
        ];
    }

    /**
     * purchase_ids y movimiento_ids son mutuamente excluyentes — un lote es de compras o de
     * movimientos, nunca ambos a la vez (compras y movimientos se prorratean por separado, ver
     * project_costo_promedio_ponderado). No hay una regla de validación nativa equivalente a
     * "prohibited_with" disponible en esta versión, así que se chequea a mano.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if (!empty($this->input('purchase_ids')) && !empty($this->input('movimiento_ids'))) {
                $validator->errors()->add('purchase_ids', 'No se puede combinar un lote de compras con un lote de movimientos en la misma operación.');
            }
        });
    }
}
