<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Telegram\Bot\FileUpload\InputFile;
use Telegram\Bot\Laravel\Facades\Telegram;
use Throwable;

class DatabaseBackupService
{
    private const DISCO_LOCAL = 'local';

    private const CARPETA_LOCAL = 'backups';

    private const COPIAS_A_CONSERVAR = 30;

    public function __construct(private GoogleDriveBackupUploader $googleDrive) {}

    /**
     * Genera el dump, lo sube a los destinos configurados y rota las copias locales viejas.
     *
     * @return array{local: bool, telegram: bool, google_drive: bool}
     */
    public function ejecutar(): array
    {
        $rutaLocal = $this->crearDump();

        $resultado = [
            'local' => true,
            'telegram' => $this->enviarPorTelegram($rutaLocal),
            'google_drive' => $this->enviarAGoogleDrive($rutaLocal),
        ];

        $this->rotarCopiasLocales();

        if (in_array(false, $resultado, true)) {
            $this->avisarFalloPorTelegram($resultado);
        }

        return $resultado;
    }

    /**
     * Corre mysqldump y guarda el resultado comprimido en el disco local (storage/app/private,
     * fuera de la carpeta pública).
     */
    private function crearDump(): string
    {
        $conexion = config('database.default');
        $config = config("database.connections.{$conexion}");

        $nombreArchivo = 'backup-'.now()->format('Y-m-d-His').'.sql.gz';
        $rutaRelativa = self::CARPETA_LOCAL.'/'.$nombreArchivo;

        $proceso = Process::timeout(300)
            ->env(['MYSQL_PWD' => $config['password'] ?? ''])
            ->run([
                'mysqldump',
                '-h', $config['host'] ?? '127.0.0.1',
                '-P', (string) ($config['port'] ?? 3306),
                '-u', $config['username'] ?? 'root',
                $config['database'] ?? '',
            ]);

        if (! $proceso->successful()) {
            throw new RuntimeException('mysqldump falló (código '.$proceso->exitCode().'): '.$proceso->errorOutput());
        }

        Storage::disk(self::DISCO_LOCAL)->put($rutaRelativa, gzencode($proceso->output(), 9));

        return $rutaRelativa;
    }

    private function enviarPorTelegram(string $rutaRelativa): bool
    {
        $admins = $this->adminsConTelegram();

        if ($admins->isEmpty()) {
            return false;
        }

        $rutaAbsoluta = Storage::disk(self::DISCO_LOCAL)->path($rutaRelativa);
        $exito = true;

        foreach ($admins as $admin) {
            try {
                Telegram::sendDocument([
                    'chat_id' => $admin->telegram_chat_id,
                    'document' => InputFile::create($rutaAbsoluta, basename($rutaRelativa)),
                    'caption' => 'Backup automático de la base de datos — '.now()->format('d/m/Y H:i'),
                ]);
            } catch (Throwable $e) {
                Log::error("DatabaseBackupService: fallo al enviar por Telegram a admin {$admin->id}: ".$e->getMessage());
                $exito = false;
            }
        }

        return $exito;
    }

    private function enviarAGoogleDrive(string $rutaRelativa): bool
    {
        try {
            $rutaAbsoluta = Storage::disk(self::DISCO_LOCAL)->path($rutaRelativa);
            $this->googleDrive->subir($rutaAbsoluta, basename($rutaRelativa));

            return true;
        } catch (Throwable $e) {
            Log::error('DatabaseBackupService: fallo al subir a Google Drive: '.$e->getMessage());

            return false;
        }
    }

    private function rotarCopiasLocales(): void
    {
        $disco = Storage::disk(self::DISCO_LOCAL);

        collect($disco->files(self::CARPETA_LOCAL))
            ->filter(fn (string $ruta) => str_ends_with($ruta, '.sql.gz'))
            ->sortByDesc(fn (string $ruta) => $disco->lastModified($ruta))
            ->values()
            ->slice(self::COPIAS_A_CONSERVAR)
            ->each(fn (string $ruta) => $disco->delete($ruta));
    }

    /**
     * @param  array{local: bool, telegram: bool, google_drive: bool}  $resultado
     */
    private function avisarFalloPorTelegram(array $resultado): void
    {
        $fallidos = collect($resultado)->filter(fn (bool $ok) => ! $ok)->keys()->implode(', ');

        foreach ($this->adminsConTelegram() as $admin) {
            try {
                Telegram::sendMessage([
                    'chat_id' => $admin->telegram_chat_id,
                    'text' => "⚠️ Backup de la base de datos: falló el envío a [{$fallidos}]. La copia local sí se guardó.",
                ]);
            } catch (Throwable $e) {
                Log::error('DatabaseBackupService: no se pudo avisar el fallo por Telegram: '.$e->getMessage());
            }
        }
    }

    /**
     * @return Collection<int, User>
     */
    private function adminsConTelegram(): Collection
    {
        return User::where('role', 'admin')->whereNotNull('telegram_chat_id')->get();
    }
}
