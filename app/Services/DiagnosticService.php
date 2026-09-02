<?php

namespace App\Services;

use App\Models\Backup;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Throwable;

class DiagnosticService
{
    public function run(): array
    {
        $started = hrtime(true); $database = 'ok'; $databaseError = null;
        try { DB::select('select 1'); } catch (Throwable $e) { $database = 'error'; $databaseError = 'Falha ao consultar o banco.'; }
        $latency = round((hrtime(true) - $started) / 1_000_000, 2);
        $storage = $this->storageCheck();
        $heartbeat = DB::table('settings')->where('key', 'scheduler_heartbeat_at')->value('value');
        $heartbeatAt = $heartbeat ? now()->parse($heartbeat) : null;
        $scheduler = ! $heartbeatAt ? 'warning' : ($heartbeatAt->lt(now()->subMinutes(5)) ? 'warning' : 'ok');
        $ran = DB::table('migrations')->pluck('migration')->all();
        $files = collect(glob(database_path('migrations/*.php')))->map(fn ($path) => pathinfo($path, PATHINFO_FILENAME));
        $pending = $files->diff($ran)->values();
        $last = Backup::whereIn('status', ['ready', 'restored'])->latest()->first();
        return [
            'app' => ['version' => env('APP_VERSION', 'unknown'), 'commit' => env('APP_COMMIT', 'unknown'), 'environment' => app()->environment(), 'timezone' => config('app.timezone')],
            'runtime' => ['php' => PHP_VERSION, 'laravel' => app()->version(), 'https' => request()->isSecure(), 'queue' => config('queue.default'), 'pwa' => File::exists(public_path('manifest.webmanifest')) && File::exists(public_path('sw.js'))],
            'database' => ['status' => $database, 'driver' => DB::getDriverName(), 'connected' => $database === 'ok', 'latency_ms' => $latency, 'pending_migrations' => $pending, 'message' => $databaseError],
            'storage' => $storage,
            'backup' => ['status' => $last ? 'ok' : 'warning', 'last_at' => $last?->created_at, 'count' => Backup::count(), 'bytes' => Backup::sum('bytes')],
            'scheduler' => ['status' => $scheduler, 'heartbeat_at' => $heartbeatAt?->toIso8601String()],
            'web_push' => ['status' => $this->pushConfigured() ? 'ok' : 'warning', 'configured' => $this->pushConfigured(), 'library_available' => class_exists(\Minishlink\WebPush\WebPush::class)],
            'integrity' => ['status' => $database === 'ok' && $storage['status'] === 'ok' && $pending->isEmpty() ? 'ok' : 'warning'],
        ];
    }

    private function storageCheck(): array
    {
        $root = Storage::disk('local')->path(''); File::ensureDirectoryExists($root); $probe = '.diagnostic-'.bin2hex(random_bytes(6));
        try { File::put("$root/$probe", 'ok'); $writable = File::get("$root/$probe") === 'ok'; } catch (Throwable) { $writable = false; } finally { File::delete("$root/$probe"); }
        $sizes = ['private' => $this->directorySize($root), 'photos' => $this->directorySize("$root/orders"), 'documents' => $this->directorySize("$root/documents"), 'backups' => $this->directorySize("$root/".config('backup.directory'))];
        return ['status' => $writable ? 'ok' : 'error', 'exists' => is_dir($root), 'writable' => $writable, 'free_bytes' => @disk_free_space($root) ?: null, 'sizes' => $sizes];
    }

    private function directorySize(string $path): int { return is_dir($path) ? collect(File::allFiles($path))->sum(fn ($file) => $file->getSize()) : 0; }
    private function pushConfigured(): bool { return filled(config('webpush.subject')) && filled(config('webpush.public_key')) && filled(config('webpush.private_key')) && class_exists(\Minishlink\WebPush\WebPush::class); }
}
