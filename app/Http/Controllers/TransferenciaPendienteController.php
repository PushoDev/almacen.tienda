<?php

namespace App\Http\Controllers;

use App\Models\Cuenta;
use App\Models\TransferenciaPendiente;
use App\Models\TransferenciaPendienteSeguimiento;
use App\Services\CatalogoTarjetasService;
use App\Services\TransferenciaPendienteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Pestaña "En tránsito" de Transacciones: los envíos de dinero que esperan confirmación. Los saldos de las
 * cuentas nunca viajan aquí: el vendedor no ve el de las cuentas de cobro ni el de las que no son suyas.
 */
class TransferenciaPendienteController extends Controller
{
    /** Filtros que ofrecen los widgets de la vista. */
    private const FILTROS = ['en_transito', 'por_confirmar', 'diferencia'];

    public function __construct(private TransferenciaPendienteService $servicio) {}

    /**
     * Vista "Envíos de dinero": lo que sigue abierto (en tránsito o con una diferencia por resolver) más los
     * últimos cerrados. Los widgets de arriba filtran con `?estado=en_transito|por_confirmar|diferencia`.
     */
    public function index(Request $request): Response
    {
        $usuario = Auth::user();
        $filtro = in_array($request->query('estado'), self::FILTROS, true) ? $request->query('estado') : null;

        $relaciones = [
            'cuentaOrigen.moneda',
            'cuentaDestino.moneda',
            'cuentaDestino.users:id,name',
            'usuario:id,name',
            'confirmador:id,name',
            'seguimientos.usuario:id,name',
        ];

        $abiertos = TransferenciaPendiente::visiblesPara($usuario)
            ->with($relaciones)
            ->where(function ($query) {
                $query->where('estado', TransferenciaPendiente::ESTADO_EN_TRANSITO)
                    ->orWhere(fn ($diferencia) => $diferencia
                        ->where('estado', TransferenciaPendiente::ESTADO_RECIBIDO_PARCIAL)
                        ->whereNull('diferencia_resuelta_en'));
            })
            ->orderByDesc('id')
            ->get();

        $cerrados = TransferenciaPendiente::visiblesPara($usuario)
            ->with($relaciones)
            ->whereNotIn('id', $abiertos->pluck('id'))
            ->orderByDesc('id')
            ->limit(30)
            ->get();

        $envios = match ($filtro) {
            'en_transito' => $abiertos->filter->estaEnTransito(),
            'por_confirmar' => $abiertos->filter(fn (TransferenciaPendiente $envio) => $envio->permisosPara($usuario)['confirmar']),
            'diferencia' => $abiertos->filter->tieneDiferenciaPorResolver(),
            default => $abiertos->concat($cerrados),
        };

        return Inertia::render('Transacciones/Envios', [
            'envios' => $envios->map(fn (TransferenciaPendiente $envio) => $this->presentar($envio, $usuario))->values(),
            'totales' => TransferenciaPendiente::totalesPara($usuario),
            'filtro' => $filtro,
        ]);
    }

    /**
     * Hoja imprimible del envío: antes de recibir es el comprobante con el recuadro en blanco para anotar lo
     * recibido; ya cerrado, la evidencia (lo recibido, la diferencia y quién lo confirmó). Sin saldos de cuentas.
     * La puede abrir quien puede ver el envío. Se abre en pestaña nueva (Ctrl+P / Guardar PDF).
     */
    public function imprimir(TransferenciaPendiente $transferenciaPendiente): Response
    {
        $usuario = Auth::user();

        abort_unless(
            TransferenciaPendiente::visiblesPara($usuario)->whereKey($transferenciaPendiente->id)->exists(),
            403,
            'No tienes acceso a este envío.'
        );

        $transferenciaPendiente->load([
            'cuentaOrigen.moneda',
            'cuentaDestino.moneda',
            'cuentaDestino.users:id,name',
            'usuario:id,name',
            'confirmador:id,name',
            'seguimientos.usuario:id,name',
        ]);

        $envio = $this->presentar($transferenciaPendiente, $usuario);

        return Inertia::render('Transacciones/ImprimirEnvio', [
            'envio' => [
                ...collect($envio)->only([
                    'id', 'estado', 'monto', 'moneda', 'monto_destino', 'moneda_destino', 'tasa_cambio_aplicada', 'comentario',
                    'monto_recibido', 'diferencia', 'diferencia_por_resolver', 'diferencia_nota', 'fecha_envio', 'fecha_confirmacion',
                    'enviado_por', 'confirmado_por',
                ])->all(),
                'cuenta_origen' => ['nombre' => $envio['cuenta_origen']['nombre'], 'moneda' => $envio['cuenta_origen']['moneda']],
                'cuenta_destino' => [
                    'nombre' => $envio['cuenta_destino']['nombre'],
                    'moneda' => $envio['cuenta_destino']['moneda'],
                    'responsables' => $envio['cuenta_destino']['responsables'],
                ],
                // Quien y por qué cerró un envío rechazado o anulado
                'motivo_cierre' => $transferenciaPendiente->seguimientos
                    ->whereIn('estado', [TransferenciaPendiente::ESTADO_RECHAZADO, TransferenciaPendiente::ESTADO_ANULADO])
                    ->sortByDesc('id')
                    ->map(fn (TransferenciaPendienteSeguimiento $seguimiento) => [
                        'observaciones' => $seguimiento->observaciones,
                        'usuario' => $seguimiento->usuario?->name,
                    ])
                    ->first(),
                'es_evidencia' => ! $transferenciaPendiente->estaEnTransito(),
            ],
        ]);
    }

    public function confirmar(Request $request, TransferenciaPendiente $transferenciaPendiente): JsonResponse
    {
        abort_unless($transferenciaPendiente->puedeRecibir(Auth::user()), 403, 'No tienes acceso a este envío.');

        $datos = $request->validate([
            'monto_recibido' => ['required', 'numeric', 'min:0.01'],
            'observaciones' => ['nullable', 'string', 'max:255'],
        ]);

        return $this->ejecutar(
            fn () => $this->servicio->confirmar($transferenciaPendiente, Auth::user(), (float) $datos['monto_recibido'], $datos['observaciones'] ?? null),
            'Recepción confirmada.'
        );
    }

    public function rechazar(Request $request, TransferenciaPendiente $transferenciaPendiente): JsonResponse
    {
        abort_unless($transferenciaPendiente->puedeRecibir(Auth::user()), 403, 'No tienes acceso a este envío.');

        $datos = $request->validate(['observaciones' => ['required', 'string', 'max:255']]);

        return $this->ejecutar(
            fn () => $this->servicio->rechazar($transferenciaPendiente, Auth::user(), $datos['observaciones']),
            'Envío rechazado: el dinero volvió a la cuenta de origen.'
        );
    }

    public function anular(Request $request, TransferenciaPendiente $transferenciaPendiente): JsonResponse
    {
        abort_unless($transferenciaPendiente->puedeAnular(Auth::user()), 403, 'No tienes acceso a este envío.');

        $datos = $request->validate(['observaciones' => ['required', 'string', 'max:255']]);

        return $this->ejecutar(
            fn () => $this->servicio->anular($transferenciaPendiente, Auth::user(), $datos['observaciones']),
            'Envío anulado: el dinero volvió a la cuenta de origen.'
        );
    }

    public function resolverDiferencia(Request $request, TransferenciaPendiente $transferenciaPendiente): JsonResponse
    {
        abort_unless($transferenciaPendiente->esGlobal(Auth::user()), 403, 'Solo admin y moderador resuelven diferencias.');

        $datos = $request->validate(['nota' => ['required', 'string', 'max:255']]);

        return $this->ejecutar(
            fn () => $this->servicio->resolverDiferencia($transferenciaPendiente, Auth::user(), $datos['nota']),
            'Diferencia resuelta.'
        );
    }

    /**
     * @param  callable(): TransferenciaPendiente  $accion
     */
    private function ejecutar(callable $accion, string $mensaje): JsonResponse
    {
        try {
            $accion();
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['message' => $mensaje]);
    }

    /**
     * @return array<string, mixed>
     */
    private function presentar(TransferenciaPendiente $envio, $usuario): array
    {
        return [
            'id' => $envio->id,
            'estado' => $envio->estado,
            'monto' => $envio->monto,
            'moneda' => $envio->moneda,
            'monto_destino' => $envio->monto_destino,
            'moneda_destino' => $envio->moneda_destino,
            'tasa_cambio_aplicada' => $envio->tasa_cambio_aplicada,
            'comentario' => $envio->comentario,
            'monto_recibido' => $envio->monto_recibido,
            'monto_acreditado' => $envio->monto_acreditado,
            'diferencia' => $envio->diferencia,
            'diferencia_por_resolver' => $envio->tieneDiferenciaPorResolver(),
            'diferencia_nota' => $envio->diferencia_nota,
            'fecha_envio' => $envio->created_at?->toISOString(),
            'fecha_confirmacion' => $envio->fecha_confirmacion?->toISOString(),
            'enviado_por' => $envio->usuario?->name,
            'confirmado_por' => $envio->confirmador?->name,
            'cuenta_origen' => $this->presentarCuenta($envio->cuentaOrigen),
            'cuenta_destino' => $this->presentarCuenta($envio->cuentaDestino) + [
                'responsables' => $envio->cuentaDestino->users->pluck('name')->values()->all(),
            ],
            'permisos' => $envio->permisosPara($usuario),
            'seguimientos' => $envio->seguimientos->map(fn (TransferenciaPendienteSeguimiento $seguimiento) => [
                'estado' => $seguimiento->estado,
                'observaciones' => $seguimiento->observaciones,
                'usuario' => $seguimiento->usuario?->name,
                'fecha' => $seguimiento->created_at?->toISOString(),
            ])->values()->all(),
        ];
    }

    /**
     * @return array{id: int, nombre: string, moneda: string|null, banco: array{slug: string, nombre: string, imagen_url: string}|null}
     */
    private function presentarCuenta(Cuenta $cuenta): array
    {
        return [
            'id' => $cuenta->id,
            'nombre' => $cuenta->nombre_cuenta,
            'moneda' => $cuenta->moneda?->codigo_moneda,
            'banco' => CatalogoTarjetasService::porSlug($cuenta->imagen),
        ];
    }
}
