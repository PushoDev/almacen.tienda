<?php

namespace App\Http\Controllers;

use App\Models\LoteStock;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LoteStockController extends Controller
{
    /**
     * Edita el código del lote — es la única columna pensada para editarse a mano (para hacerlo
     * coincidir con una referencia física del proveedor, por ejemplo). Cantidad/precio/producto/
     * almacén no se tocan aquí: son el registro de auditoría de lo que aprobar() ya sumó al
     * inventario real, cambiarlos desincronizaría el lote de lo que de verdad pasó.
     */
    public function actualizarCodigo(Request $request, LoteStock $lote): RedirectResponse
    {
        $validated = $request->validate([
            'codigo' => ['required', 'string', 'max:255', 'unique:lotes_stock,codigo,'.$lote->id],
        ]);

        $lote->update(['codigo' => $validated['codigo']]);

        return back()->with('success', 'Código del lote actualizado.');
    }
}
