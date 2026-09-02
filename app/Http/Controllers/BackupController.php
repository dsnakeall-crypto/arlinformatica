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
use Throwable;

class BackupController extends Controller
{
    public function index(): JsonResponse
    {
        $backups = Backup::latest()->get()->map(fn (Backup $backup) => $this->resource($backup));
        return response()->json(['data' => $backups, 'total_bytes' => $backups->sum('bytes'), 'automatic' => ['enabled' => (bool) config('backup.automatic'), 'frequency' => config('backup.frequency'), 'retention' => config('backup.retention')]]);
    }

    public function store(Request $request, BackupService $service): JsonResponse
    {
        return response()->json($this->resource($service->create($request->user())), 201);
    }

    public function download(Request $request, Backup $backup, Audit $audit)
    {
        abort_unless($backup->status === 'ready' || $backup->status === 'restored', 404);
        abort_unless(Storage::disk(config('backup.disk'))->exists($backup->path), 404);
        $audit->record($request, 'backup.downloaded', 'backup', $backup->id, null, ['sha256' => $backup->sha256]);
        return Storage::disk(config('backup.disk'))->download($backup->path, basename($backup->path), ['Content-Type' => 'application/zip', 'X-Content-Type-Options' => 'nosniff']);
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
        return $backup->only(['id', 'kind', 'sha256', 'bytes', 'manifest', 'status', 'protected', 'error', 'created_at']);
    }
}
