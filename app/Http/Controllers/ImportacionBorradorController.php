<?php

namespace App\Http\Controllers;

use App\Imports\ProductoBorradorLector;
use App\Imports\ProductoImport;
use App\Models\Almacen;
use App\Models\ImportacionBorrador;
use App\Services\ImportacionProductosService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Importar productos en dos pasos: primero el Excel se lee a un BORRADOR que el usuario revisa y
 * edita en una vista tipo hoja de cálculo (sin tocar el inventario); solo al confirmar se
 * ejecuta la importación real, con lotes e historial (ImportacionProductosService).
 */
class ImportacionBorradorController extends Controller
{
    /** Tope de filas de un borrador (el archivo ya se limita por tamaño). */
    private const MAX_FILAS = 20000;

    /**
     * Lee el Excel y crea el borrador. No guarda nada en el inventario.
     */
    public function preparar(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:5120',
            'almacen_id' => 'required|integer|exists:almacens,id',
        ], [
            'file.required' => 'Debes seleccionar un archivo para importar',
            'file.file' => 'El archivo debe ser un archivo válido',
            'file.mimes' => 'El archivo debe ser de tipo Excel (.xlsx o .xls)',
            'file.max' => 'El archivo no debe superar 5MB',
            'almacen_id.required' => 'Debes seleccionar un almacén',
            'almacen_id.exists' => 'El almacén seleccionado no existe',
        ]);

        $file = $request->file('file');

        try {
            $filas = ProductoBorradorLector::normalizar(Excel::toArray(new ProductoBorradorLector, $file)[0] ?? []);
        } catch (\Exception $e) {
            Log::error('No se pudo leer el Excel del borrador: '.$e->getMessage(), ['archivo' => $file->getClientOriginalName()]);

            return back()->withErrors(['file' => 'No se pudo leer el archivo. Revisa que sea un Excel válido.']);
        }

        if ($filas === []) {
            return back()->withErrors(['file' => 'El archivo no tiene filas con datos para importar']);
        }

        if (count($filas) > self::MAX_FILAS) {
            return back()->withErrors(['file' => 'El archivo tiene más de '.self::MAX_FILAS.' filas. Divídelo en varios archivos.']);
        }

        $borrador = ImportacionBorrador::create([
            'user_id' => $request->user()->id,
            'almacen_id' => (int) $request->input('almacen_id'),
            'nombre_archivo' => $file->getClientOriginalName(),
            'hash_archivo' => hash_file('sha256', $file->getRealPath()),
            'filas' => $filas,
        ]);

        return redirect()->route('importaciones-borradores.show', $borrador->id);
    }

    /**
     * La vista tipo hoja de cálculo para revisar y editar el borrador.
     */
    public function show(Request $request, ImportacionBorrador $borrador): Response
    {
        $this->autorizar($request, $borrador);
        $borrador->load('almacen:id,nombre_almacen');

        return Inertia::render('Productos/Importaciones/Revisar', [
            'borrador' => [
                'id' => $borrador->id,
                'nombre_archivo' => $borrador->nombre_archivo,
                'almacen' => $borrador->almacen?->nombre_almacen,
                'creado' => $borrador->created_at->toIso8601String(),
            ],
            'filas' => $borrador->filas,
            'maxFilas' => self::MAX_FILAS,
        ]);
    }

    /**
     * Guarda las ediciones (sin importar) para poder retomar el borrador después.
     */
    public function guardar(Request $request, ImportacionBorrador $borrador): RedirectResponse
    {
        $this->autorizar($request, $borrador);
        $borrador->update(['filas' => $this->filasValidadas($request)]);

        return back()->with('success', 'Borrador guardado.');
    }

    /**
     * Importa de verdad lo que el usuario ve en la hoja. El borrador se elimina al terminar bien.
     */
    public function confirmar(Request $request, ImportacionBorrador $borrador, ImportacionProductosService $servicio): RedirectResponse
    {
        $this->autorizar($request, $borrador);
        $request->validate(['confirmar_repetido' => 'sometimes|boolean']);
        $filas = $this->filasValidadas($request);
        $borrador->update(['filas' => $filas]);

        $almacen = Almacen::findOrFail($borrador->almacen_id);

        // El mismo archivo ya se importó en este almacén: se avisa y solo se sigue si el usuario lo confirma.
        $previa = $servicio->buscarPrevia($almacen->id, $borrador->hash_archivo);
        if ($previa && ! $request->boolean('confirmar_repetido')) {
            return back()->with('importacion_repetida', $servicio->avisoRepetida($previa));
        }

        try {
            $importacion = $servicio->ejecutar(
                $request->user(),
                $almacen,
                $borrador->nombre_archivo,
                $borrador->hash_archivo,
                function (ProductoImport $importador) use ($filas) {
                    foreach ($filas as $fila) {
                        $importador->model($fila);
                    }
                },
            );
        } catch (\Exception $e) {
            Log::error('Error al confirmar el borrador de importación: '.$e->getMessage(), ['borrador_id' => $borrador->id]);

            return back()->withErrors(['error' => 'Error al importar productos: '.$e->getMessage()]);
        }

        $borrador->delete();

        return redirect()
            ->route('productos.index')
            ->with('success', $servicio->mensajeResumen($importacion))
            ->with('importacion_resultado', $servicio->resultadoParaVista($importacion, $almacen));
    }

    /**
     * Descarta el borrador sin importar nada.
     */
    public function descartar(Request $request, ImportacionBorrador $borrador): RedirectResponse
    {
        $this->autorizar($request, $borrador);
        $borrador->delete();

        return redirect()->route('importaciones-productos.index')->with('success', 'Borrador descartado.');
    }

    /**
     * Un borrador es de quien lo creó; el admin puede ver cualquiera.
     */
    private function autorizar(Request $request, ImportacionBorrador $borrador): void
    {
        abort_unless($request->user()->role === 'admin' || $borrador->user_id === $request->user()->id, 403);
    }

    /**
     * Filas que llegan de la hoja: solo las columnas conocidas, todo como texto y sin filas
     * vacías; con el mismo límite de largo que el importador por archivo.
     *
     * @return list<array<string, string>>
     */
    private function filasValidadas(Request $request): array
    {
        $entrada = $request->input('filas');
        $request->merge(['filas' => ProductoBorradorLector::normalizar(is_array($entrada) ? array_filter($entrada, 'is_array') : [])]);

        return $request->validate([
            'filas' => ['required', 'array', 'min:1', 'max:'.self::MAX_FILAS],
            'filas.*.nombre_producto' => ['nullable', 'string', 'max:255'],
            'filas.*.categoria' => ['nullable', 'string', 'max:255'],
            'filas.*.marca' => ['nullable', 'string', 'max:255'],
            'filas.*.modelo' => ['nullable', 'string', 'max:255'],
            'filas.*.capacidad' => ['nullable', 'string', 'max:255'],
            'filas.*.color' => ['nullable', 'string', 'max:100'],
            'filas.*.precio_compra' => ['nullable', 'string', 'max:50'],
            'filas.*.cantidad' => ['nullable', 'string', 'max:50'],
            'filas.*.codigo_barras' => ['nullable', 'string', 'max:255'],
        ], [
            'filas.required' => 'No hay filas con datos para importar',
            'filas.min' => 'No hay filas con datos para importar',
            'filas.max' => 'Demasiadas filas: el máximo es '.self::MAX_FILAS,
            'filas.*.nombre_producto.max' => 'La fila :position tiene un nombre de más de 255 caracteres',
            'filas.*.color.max' => 'La fila :position tiene un color de más de 100 caracteres',
            'filas.*.categoria.max' => 'La fila :position tiene una categoría de más de 255 caracteres',
            'filas.*.marca.max' => 'La fila :position tiene una marca de más de 255 caracteres',
            'filas.*.modelo.max' => 'La fila :position tiene un modelo de más de 255 caracteres',
            'filas.*.capacidad.max' => 'La fila :position tiene una capacidad de más de 255 caracteres',
            'filas.*.codigo_barras.max' => 'La fila :position tiene un código de barras de más de 255 caracteres',
        ])['filas'];
    }
}
