<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrderPhoto;
use App\Services\Audit;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class StorageController extends Controller
{
    public function statistics(): JsonResponse
    {
        $stats = ServiceOrderPhoto::query()->selectRaw('COUNT(*) as photo_count, COALESCE(SUM(bytes), 0) as photo_bytes, COUNT(DISTINCT service_order_id) as orders_with_photos')->first();
        $privateBytes = collect(Storage::disk('local')->allFiles())->sum(fn (string $path) => Storage::disk('local')->size($path));
        $root = Storage::disk('local')->path('');

        return response()->json([
            ...$stats->toArray(),
            'average_bytes' => $stats->photo_count ? (int) round($stats->photo_bytes / $stats->photo_count) : 0,
            'private_bytes' => $privateBytes,
            'disk_capacity_bytes' => is_int($capacity = @disk_total_space($root)) ? $capacity : null,
            'disk_free_bytes' => is_int($free = @disk_free_space($root)) ? $free : null,
        ]);
    }

    public function preview(Request $request): JsonResponse
    {
        $data = $this->filter($request);
        $query = $this->query($data);

        return response()->json(['count' => $query->count(), 'bytes' => (int) $query->sum('bytes')]);
    }

    public function purge(Request $request, Audit $audit): JsonResponse
    {
        $data = $this->filter($request);
        if ($data['filter'] === 'all') {
            $request->validate(['confirmation' => 'required|in:EXCLUIR TODAS AS FOTOS']);
        } else {
            $request->validate(['confirmation' => 'required|in:EXCLUIR FOTOS']);
        }
        $photos = $this->query($data)->get();
        $bytes = (int) $photos->sum('bytes');
        DB::transaction(function () use ($photos) {
            foreach ($photos as $photo) {
                Storage::disk($photo->disk)->delete($photo->path);
                $photo->delete();
            }
        });
        $audit->record($request, 'photos.purged', ServiceOrderPhoto::class, null, null, ['filter' => $data, 'count' => $photos->count(), 'bytes' => $bytes]);

        return response()->json(['deleted' => $photos->count(), 'bytes' => $bytes]);
    }

    public function destroy(Request $request, ServiceOrderPhoto $photo, Audit $audit): JsonResponse
    {
        abort_unless($photo->path !== '' && ! str_contains($photo->path, '..'), 422);
        Storage::disk($photo->disk)->delete($photo->path);
        $before = $photo->only(['id', 'service_order_id', 'bytes']);
        $photo->delete();
        $audit->record($request, 'photo.deleted', ServiceOrderPhoto::class, $photo->id, $before);

        return response()->json(['message' => 'Foto excluída; a OS e seus documentos foram preservados.']);
    }

    private function filter(Request $request): array
    {
        return $request->validate(['filter' => 'required|in:all,before,older_1,older_2,older_3', 'before' => 'required_if:filter,before|nullable|date|before_or_equal:today']);
    }

    private function query(array $data): Builder
    {
        $query = ServiceOrderPhoto::query();
        $date = match ($data['filter']) {
            'before' => Carbon::parse($data['before'])->endOfDay(),
            'older_1' => now()->subYear(),
            'older_2' => now()->subYears(2),
            'older_3' => now()->subYears(3),
            default => null,
        };

        return $date ? $query->where('created_at', '<', $date) : $query;
    }
}
