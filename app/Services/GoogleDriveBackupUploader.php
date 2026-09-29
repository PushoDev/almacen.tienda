<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Sube un archivo a una carpeta de Google Drive usando una cuenta de servicio (sin login
 * interactivo). Implementación propia con Http de Laravel — sin el SDK oficial de Google
 * (google/apiclient), que arrastra ~50MB de definiciones de API que no necesitamos para
 * subir un solo archivo.
 */
class GoogleDriveBackupUploader
{
    private const SCOPE = 'https://www.googleapis.com/auth/drive.file';

    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';

    public function subir(string $rutaLocalAbsoluta, string $nombreArchivo): void
    {
        $credenciales = $this->leerCredenciales();
        $accessToken = $this->obtenerAccessToken($credenciales);
        $this->subirArchivo($rutaLocalAbsoluta, $nombreArchivo, $accessToken);
    }

    /**
     * @return array{client_email: string, private_key: string}
     */
    private function leerCredenciales(): array
    {
        $ruta = config('services.google_drive.credentials_path');

        if (empty($ruta) || ! is_readable($ruta)) {
            throw new RuntimeException("No se encontró el archivo de credenciales de Google Drive en: {$ruta}");
        }

        $credenciales = json_decode(file_get_contents($ruta), true);

        if (empty($credenciales['client_email']) || empty($credenciales['private_key'])) {
            throw new RuntimeException('El archivo de credenciales de Google Drive no tiene client_email/private_key.');
        }

        return $credenciales;
    }

    /**
     * @param  array{client_email: string, private_key: string}  $credenciales
     */
    private function obtenerAccessToken(array $credenciales): string
    {
        $ahora = time();

        $segmentos = [
            $this->base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])),
            $this->base64UrlEncode(json_encode([
                'iss' => $credenciales['client_email'],
                'scope' => self::SCOPE,
                'aud' => self::TOKEN_URL,
                'iat' => $ahora,
                'exp' => $ahora + 3600,
            ])),
        ];

        $firma = '';
        openssl_sign(implode('.', $segmentos), $firma, $credenciales['private_key'], OPENSSL_ALGO_SHA256);
        $segmentos[] = $this->base64UrlEncode($firma);

        $respuesta = Http::asForm()->post(self::TOKEN_URL, [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => implode('.', $segmentos),
        ]);

        if ($respuesta->failed() || empty($respuesta->json('access_token'))) {
            throw new RuntimeException('No se pudo autenticar con Google Drive: '.$respuesta->body());
        }

        return $respuesta->json('access_token');
    }

    private function subirArchivo(string $rutaLocalAbsoluta, string $nombreArchivo, string $accessToken): void
    {
        $folderId = config('services.google_drive.folder_id');

        $sesion = Http::withToken($accessToken)
            ->withHeaders(['X-Upload-Content-Type' => 'application/gzip'])
            ->post(self::UPLOAD_URL, array_filter([
                'name' => $nombreArchivo,
                'parents' => $folderId ? [$folderId] : null,
            ]));

        $ubicacion = $sesion->header('Location');

        if ($sesion->failed() || empty($ubicacion)) {
            throw new RuntimeException('No se pudo iniciar la subida a Google Drive: '.$sesion->body());
        }

        $subida = Http::withBody(file_get_contents($rutaLocalAbsoluta), 'application/gzip')->put($ubicacion);

        if ($subida->failed()) {
            throw new RuntimeException('Falló la subida a Google Drive: '.$subida->body());
        }
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
