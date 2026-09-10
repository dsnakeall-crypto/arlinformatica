<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class FinalShareController extends Controller
{
    public function show(ServiceOrder $order): JsonResponse
    {
        $document = DB::table('generated_documents')
            ->where('service_order_id', $order->id)
            ->where('type', 'final')
            ->orderByDesc('revision')
            ->first();
        abort_unless($document, 404, 'O PDF final desta OS ainda não foi gerado.');

        $expiresAt = now()->addHours(48);
        $token = bin2hex(random_bytes(32));
        DB::table('final_share_tokens')->where('expires_at', '<=', now())->delete();
        DB::table('final_share_tokens')->insert([
            'service_order_id' => $order->id,
            'revision' => (int) $document->revision,
            'token_hash' => hash('sha256', $token),
            'expires_at' => $expiresAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'url' => route('orders.final.public', [
                'order' => $order->id,
                'revision' => (int) $document->revision,
                'token' => $token,
            ]),
            'expires_at' => $expiresAt->toIso8601String(),
            'revision' => (int) $document->revision,
        ]);
    }

    public function download(ServiceOrder $order, int $revision, string $token, DocumentService $documents)
    {
        $valid = DB::table('final_share_tokens')
            ->where('service_order_id', $order->id)
            ->where('revision', $revision)
            ->where('token_hash', hash('sha256', $token))
            ->where('expires_at', '>', now())
            ->exists();
        abort_unless($valid, 403, 'Este link não é válido ou já expirou.');

        $response = $documents->response($order, 'final', $revision);
        $response->headers->set('X-Robots-Tag', 'noindex');

        return $response;
    }
}
