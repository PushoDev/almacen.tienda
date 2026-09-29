<?php

use App\Services\DatabaseBackupService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

/**
 * Credenciales de cuenta de servicio de mentira (llave RSA real, generada al vuelo, para que
 * openssl_sign no falle) — App\Services\GoogleDriveBackupUploader las lee de este path.
 */
function credencialesGoogleDriveDeMentira(): void
{
    $llave = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
    openssl_pkey_export($llave, $privateKeyPem);

    $ruta = storage_path('app/private/google-drive-test-credentials.json');
    file_put_contents($ruta, json_encode([
        'client_email' => 'backup-test@example.iam.gserviceaccount.com',
        'private_key' => $privateKeyPem,
    ]));

    config([
        'services.google_drive.credentials_path' => $ruta,
        'services.google_drive.folder_id' => 'carpeta-de-prueba',
    ]);
}

function fakearGoogleDriveExitoso(): void
{
    Http::fake([
        'oauth2.googleapis.com/token' => Http::response(['access_token' => 'token-de-prueba']),
        'www.googleapis.com/upload/drive/v3/files*' => Http::response('', 200, [
            'Location' => 'https://www.googleapis.com/upload/drive/v3/files?upload_id=fake',
        ]),
    ]);
}

beforeEach(function () {
    Process::fake([
        '*mysqldump*' => Process::result(output: '-- dump falso --'),
    ]);
    Storage::fake('local');
    // Ningún admin de prueba tiene telegram_chat_id: enviarPorTelegram() corta antes de tocar
    // red (adminsConTelegram() vacío), así los tests no dependen de api.telegram.org.
});

it('guarda el dump comprimido en el disco local', function () {
    app(DatabaseBackupService::class)->ejecutar();

    $archivos = collect(Storage::disk('local')->files('backups'))
        ->filter(fn ($ruta) => str_ends_with($ruta, '.sql.gz'));

    expect($archivos)->toHaveCount(1);
});

it('sin admins con telegram_chat_id, ese destino falla sin romper el resto', function () {
    $resultado = app(DatabaseBackupService::class)->ejecutar();

    expect($resultado['telegram'])->toBeFalse()
        ->and($resultado['local'])->toBeTrue();
});

it('sube el backup a Google Drive', function () {
    credencialesGoogleDriveDeMentira();
    fakearGoogleDriveExitoso();

    $resultado = app(DatabaseBackupService::class)->ejecutar();

    expect($resultado['google_drive'])->toBeTrue();
    Http::assertSent(fn ($request) => str_contains((string) $request->url(), 'oauth2.googleapis.com/token'));
    Http::assertSent(fn ($request) => str_contains((string) $request->url(), 'googleapis.com/upload/drive/v3/files'));
});

it('si Google Drive no tiene credenciales configuradas, falla ese destino sin romper los demás', function () {
    // Sin credencialesGoogleDriveDeMentira(): el path de config queda vacío.
    $resultado = app(DatabaseBackupService::class)->ejecutar();

    expect($resultado['google_drive'])->toBeFalse()
        ->and($resultado['local'])->toBeTrue();
});

it('conserva solo las últimas 30 copias locales', function () {
    Storage::disk('local')->makeDirectory('backups');
    foreach (range(1, 30) as $i) {
        Storage::disk('local')->put("backups/backup-viejo-{$i}.sql.gz", 'contenido');
        touch(Storage::disk('local')->path("backups/backup-viejo-{$i}.sql.gz"), now()->subDays(40 - $i)->timestamp);
    }

    app(DatabaseBackupService::class)->ejecutar();

    expect(Storage::disk('local')->files('backups'))->toHaveCount(30);
});

it('falla el comando completo si mysqldump falla', function () {
    Process::fake([
        '*mysqldump*' => Process::result(output: '', errorOutput: 'acceso denegado', exitCode: 1),
    ]);

    expect(fn () => app(DatabaseBackupService::class)->ejecutar())
        ->toThrow(RuntimeException::class);
});
