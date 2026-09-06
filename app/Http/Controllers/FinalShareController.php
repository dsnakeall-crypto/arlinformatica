<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;

class FinalShareController extends Controller
{
    public function show(ServiceOrder $order): JsonResponse
    {
        $revision = (int) (DB::table('generated_documents')
            ->where('service_order_id', $order->id)
            ->where('type', 'final')
            ->max('revision') ?? 0);

        abort_if($revision < 1, 404, 'O PDF final ainda não foi emitido para esta OS.');

        $expiresAt = now()->addHours(48);

        return response()->json([
            'url' => URL::temporarySignedRoute('orders.final.public', $expiresAt, [
                'order' => $order->id,
                'revision' => $revision,
            ]),
            'expires_at' => $expiresAt->toIso8601String(),
            'revision' => $revision,
        ]);
    }

    public function download(ServiceOrder $order, int $revision, DocumentService $documents)
    {
        return $documents->response($order, 'final', $revision);
    }
}
