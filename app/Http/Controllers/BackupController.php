<?php

namespace App\Http\Controllers;

use App\Models\Backup;
use App\Services\Audit;
use App\Services\BackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Throwable;

class BackupController extends Controller
{
    public function index(BackupService $service): JsonResponse
    {
        $backups = Backup::latest()->get()->map(fn (Backup $backup) => $this->resource($backup));

        return response()->json(['data' => $backups, 'total_bytes' => $backups->sum('bytes'), 'automatic' => $service->automaticSettings()]);
    }

    public function updateAutomatic(Request $request, BackupService $service, Audit $audit): JsonResponse
    {
        $data = $request->validate(['enabled' => 'required|boolean', 'frequency' => ['required', Rule::in(['daily', 'weekly', 'monthly'])]]);
        $before = $service->automaticSettings();
        $service->saveAutomaticSettings($data);
        $audit->record($request, 'backup.automatic_settings_updated', 'settings', null, $before, $data);

        return response()->json($service->automaticSettings());
    }

    public function store(Request $request, BackupService $service): JsonResponse
    {
        return response()->json($this->resource($service->create($request->user())), 201);
    }

    public function manualDownload(Request $request, BackupService $service, Audit $audit): BinaryFileResponse|JsonResponse
    {
        $backup = null;

        try {
            $backup = $service->create($request->user());
            $disk = Storage::disk(config('backup.disk'));
            throw_unless($backup->status === 'ready' && $disk->exists($backup->path), \RuntimeException::class, 'O arquivo de backup não foi gerado.');
            throw_unless($disk->size($backup->path) > 0, \RuntimeException::class, 'O arquivo de backup foi gerado vazio.');

            $path = $disk->path($backup->path);
            $filename = basename($backup->path);
            $audit->record($request, 'backup.manual_downloaded', 'backup', $backup->id, null, ['sha256' => $backup->sha256]);
            $backup->delete();

            return response()->download($path, $filename, ['Content-Type' => 'application/zip', 'X-Content-Type-Options' => 'nosniff'])->deleteFileAfterSend(true);
        } catch (Throwable $exception) {
            if ($backup) {
                Storage::disk(config('backup.disk'))->delete($backup->path);
                $backup->delete();
            }

            return response()->json(['message' => 'Não foi possível gerar o backup: '.$exception->getMessage()], 500);
        }
    }

    public function download(Request $request, Backup $backup, Audit $audit)
    {
        abort_unless($backup->status === 'ready' || $backup->status === 'restored', 404);
        $disk = Storage::disk(config('backup.disk'));
        abort_unless($disk->exists($backup->path) && $disk->size($backup->path) > 0, 404, 'Arquivo de backup indisponível ou vazio.');
        $audit->record($request, 'backup.downloaded', 'backup', $backup->id, null, ['sha256' => $backup->sha256]);

        return $disk->download($backup->path, basename($backup->path), ['Content-Type' => 'application/zip', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function upload(Request $request, BackupService $service): JsonResponse
    {
        $data = $request->validate(['backup' => ['required', 'file', 'mimes:zip', 'max:'.config('backup.max_upload_kb')]]);
        try {
            $manifest = $service->validate($data['backup']->getRealPath());
        } catch (Throwable $exception) {
            throw ValidationException::withMessages(['backup' => $exception->getMessage()]);
        }
        $name = 'uploaded-'.now()->format('Ymd-His').'-'.bin2hex(random_bytes(4)).'.zip';
        $path = $data['backup']->storeAs(config('backup.directory'), $name, config('backup.disk'));
        $backup = Backup::create(['kind' => 'uploaded', 'path' => $path, 'sha256' => hash_file('sha256', $data['backup']->getRealPath()), 'bytes' => $data['backup']->getSize(), 'manifest' => $manifest, 'status' => 'ready', 'protected' => true, 'created_by' => $request->user()->id]);

        return response()->json($this->resource($backup), 201);
    }

    public function restore(Request $request, Backup $backup, BackupService $service): JsonResponse
    {
        $request->validate(['confirmation' => ['required', Rule::in(['RESTAURAR BACKUP'])]]);
        $safety = $service->restore($backup, $request->user());

        return response()->json(['message' => 'Restauração concluída e verificada.', 'safety_backup_id' => $safety->id]);
    }

    public function destroy(Request $request, Backup $backup, Audit $audit): JsonResponse
    {
        abort_if($backup->protected || $backup->status === 'creating', 422, 'Este backup está protegido.');
        Storage::disk(config('backup.disk'))->delete($backup->path);
        $audit->record($request, 'backup.deleted', 'backup', $backup->id, $this->resource($backup));
        $backup->delete();

        return response()->json(['message' => 'Backup removido.']);
    }

    private function resource(Backup $backup): array
    {
        return array_merge($backup->only(['id', 'kind', 'sha256', 'bytes', 'manifest', 'status', 'protected', 'error', 'created_at']), ['filename' => basename($backup->path)]);
    }
}
