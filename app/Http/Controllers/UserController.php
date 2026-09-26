<?php

namespace App\Http\Controllers;

use App\Models\Almacen;
use App\Models\Cuenta;
use App\Models\User;
use App\Services\CatalogoTarjetasService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $empleados = User::with('almacenes', 'cuentas')->get();
        $almacenes = Almacen::all();
        $cuentas = Cuenta::where('tipo_cuenta', 'permanentes')->get();

        return Inertia::render('Empleados/Index', [
            'empleados' => $empleados,
            'almacenes' => $almacenes,
            'cuentas' => $cuentas,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('Empleados/Create', [
            'almacenes' => Almacen::all(),
            'cuentas' => $this->cuentasParaAsignar(),
            'tiposCuenta' => CatalogoTarjetasService::tiposDeCuenta(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Validación
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8',
            'role' => 'required|in:admin,moderador,vendedor',
            'almacenes' => 'array|exists:almacens,id',
            'cuentas' => 'array',
            'cuentas.*.id' => 'required|distinct|exists:cuentas,id',
            'cuentas.*.acceso' => ['required', Rule::in([Cuenta::ACCESO_COMPLETO, Cuenta::ACCESO_COBRO])],
            'telegram_chat_id' => 'nullable|string|max:50',
        ]);

        // Creación del usuario
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'telegram_chat_id' => ! empty($validated['telegram_chat_id']) ? $validated['telegram_chat_id'] : null,
        ]);

        // Asignar almacenes (solo si no es admin/moderador)
        if (! in_array($validated['role'], ['admin', 'moderador']) && ! empty($validated['almacenes'])) {
            $user->almacenes()->sync($validated['almacenes']);
        }

        // Asignar cuentas (solo si no es admin/moderador)
        if (! in_array($validated['role'], ['admin', 'moderador']) && ! empty($validated['cuentas'])) {
            $user->cuentas()->sync($this->cuentasConAcceso($validated['cuentas']));
        }

        return redirect()->route('empleados.index');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        // Si necesitas mostrar detalles individuales
        $empleado = User::with('almacenes')->findOrFail($id);

        return Inertia::render('Empleados/Show', [
            'empleado' => $empleado,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $empleado = User::with('almacenes', 'cuentas')->findOrFail($id);

        return Inertia::render('Empleados/Edit', [
            'empleado' => $empleado,
            'almacenes' => Almacen::all(),
            'cuentas' => $this->cuentasParaAsignar(),
            'tiposCuenta' => CatalogoTarjetasService::tiposDeCuenta(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $user = User::findOrFail($id);

        // Validación
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,'.$user->id,
            'password' => 'nullable|min:8',
            'role' => 'required|in:admin,moderador,vendedor',
            'almacenes' => 'array|exists:almacens,id',
            'cuentas' => 'array',
            'cuentas.*.id' => 'required|distinct|exists:cuentas,id',
            'cuentas.*.acceso' => ['required', Rule::in([Cuenta::ACCESO_COMPLETO, Cuenta::ACCESO_COBRO])],
            'telegram_chat_id' => 'nullable|string|max:50',
        ]);

        // Actualización del usuario
        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'password' => $validated['password'] ? Hash::make($validated['password']) : $user->password,
            'telegram_chat_id' => ! empty($validated['telegram_chat_id']) ? $validated['telegram_chat_id'] : null,
        ]);

        // Actualizar almacenes (solo si no es admin/moderador)
        if (! in_array($validated['role'], ['admin', 'moderador'])) {
            $user->almacenes()->sync($validated['almacenes'] ?? []);
        } else {
            $user->almacenes()->detach();
        }

        // Actualizar cuentas (solo si no es admin/moderador)
        if (! in_array($validated['role'], ['admin', 'moderador'])) {
            $user->cuentas()->sync($this->cuentasConAcceso($validated['cuentas'] ?? []));
        } else {
            $user->cuentas()->detach();
        }

        return redirect()->route('empleados.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $user = User::findOrFail($id);
        $user->delete();

        return redirect()->route('empleados.index');
    }

    /**
     * Arma el mapa que espera `sync()` para la tabla `user_cuentas`: id de cuenta => nivel de acceso.
     *
     * @param  array<int, array{id: int|string, acceso: string}>  $cuentas
     * @return array<int, array{acceso: string}>
     */
    private function cuentasConAcceso(array $cuentas): array
    {
        return collect($cuentas)
            ->mapWithKeys(fn (array $cuenta) => [(int) $cuenta['id'] => ['acceso' => $cuenta['acceso']]])
            ->all();
    }

    /**
     * Cuentas que se pueden asignar a un empleado, con lo justo para reconocerlas en las tarjetas de
     * Crear/Editar Empleado (sin saldo: ahí se decide el acceso, no se consulta el dinero).
     *
     * @return array<int, array{id: int, nombre_cuenta: string, moneda: string|null, tipo: string, tipo_titular: string|null, estado: string, banco: array{slug: string, nombre: string, imagen_url: string}|null}>
     */
    private function cuentasParaAsignar(): array
    {
        return Cuenta::with('moneda')
            ->where('tipo_cuenta', 'permanentes')
            ->orderBy('nombre_cuenta')
            ->get()
            ->map(fn (Cuenta $cuenta) => [
                'id' => $cuenta->id,
                'nombre_cuenta' => $cuenta->nombre_cuenta,
                'moneda' => $cuenta->moneda?->codigo_moneda ?? $cuenta->tipo_moneda,
                'tipo' => $cuenta->tipo,
                'tipo_titular' => $cuenta->tipo_titular,
                'estado' => $cuenta->estado,
                'banco' => CatalogoTarjetasService::porSlug($cuenta->imagen),
            ])
            ->all();
    }
}
