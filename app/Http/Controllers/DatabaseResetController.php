<?php

namespace App\Http\Controllers;

use App\Models\Backup;
use App\Services\BackupService;
use App\Services\DatabaseResetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class DatabaseResetController extends Controller
{
    public function preview(Request $request, DatabaseResetService $service): JsonResponse
    {
        return response()->json(['counts' => $service->preview($request->user())]);
    }

    public function prepare(Request $request, DatabaseResetService $service, BackupService $backups): JsonResponse
    {
        try {
            return response()->json($service->prepare($request->user(), $backups), 201);
        } catch (Throwable $exception) {
            return response()->json(['message' => 'Não foi possível liberar o zeramento: '.$exception->getMessage()], 500);
        }
    }

    public function destroy(Request $request, DatabaseResetService $service): JsonResponse
    {
        $data = $request->validate([
            'password' => ['required', 'string'],
            'confirmation' => ['required', Rule::in(['ZERAR BANCO'])],
            'backup_id' => ['required', 'integer', 'exists:backups,id'],
        ]);
        if (! Hash::check($data['password'], $request->user()->password)) {
            throw ValidationException::withMessages(['password' => 'A senha informada está incorreta.']);
        }

        try {
            $counts = $service->reset($request->user(), Backup::findOrFail($data['backup_id']), $request->ip());
        } catch (Throwable $exception) {
            throw ValidationException::withMessages(['backup_id' => $exception->getMessage()]);
        }

        return response()->json(['message' => 'Banco zerado com segurança.', 'deleted' => $counts]);
    }
}
