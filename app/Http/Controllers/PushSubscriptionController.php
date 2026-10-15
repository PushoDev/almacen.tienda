<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    /**
     * Clave pública VAPID que el navegador necesita para suscribirse.
     */
    public function config(): JsonResponse
    {
        $publicKey = config('webpush.vapid.public_key');

        return response()->json([
            'habilitado' => ! empty($publicKey),
            'public_key' => $publicKey,
        ]);
    }

    /**
     * Guarda (o actualiza) la suscripción de este dispositivo para el usuario actual.
     */
    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'endpoint' => ['required', 'url', 'max:1024'],
            'keys.p256dh' => ['required', 'string'],
            'keys.auth' => ['required', 'string'],
            'contentEncoding' => ['nullable', 'string', 'in:aesgcm,aes128gcm'],
        ]);

        $request->user()->updatePushSubscription(
            $datos['endpoint'],
            $datos['keys']['p256dh'],
            $datos['keys']['auth'],
            $datos['contentEncoding'] ?? 'aesgcm',
        );

        return response()->json(['success' => true]);
    }

    /**
     * Elimina la suscripción de este dispositivo (el usuario desactivó los avisos).
     */
    public function destroy(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'endpoint' => ['required', 'url', 'max:1024'],
        ]);

        $request->user()->deletePushSubscription($datos['endpoint']);

        return response()->json(['success' => true]);
    }
}
