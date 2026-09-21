<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Services\Audit;
use App\Services\CompanySettings;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class FinalShareController extends Controller
{
    public function show(Request $request, ServiceOrder $order, Audit $audit): JsonResponse
    {
        abort_unless($order->status === 'completed', 409, 'O link só pode ser criado para uma OS finalizada.');
        $document = DB::table('generated_documents')
            ->where('service_order_id', $order->id)
            ->where('type', 'final')
            ->orderByDesc('revision')
            ->first();
        abort_unless($document, 404, 'O PDF final desta OS ainda não foi gerado.');

        $expiresAt = now()->addDays(30);
        $token = bin2hex(random_bytes(32));
        DB::table('final_share_tokens')->insert([
            'service_order_id' => $order->id,
            'generated_document_id' => $document->id,
            'revision' => (int) $document->revision,
            'token_hash' => hash('sha256', $token),
            'expires_at' => $expiresAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $audit->record($request, 'service_order.final_link_created', 'service_order', $order->id, null, [
            'revision' => (int) $document->revision,
            'expires_at' => $expiresAt->toIso8601String(),
        ]);

        return response()->json([
            'url' => route('orders.final.public', ['token' => $token]),
            'expires_at' => $expiresAt->toIso8601String(),
            'revision' => (int) $document->revision,
        ]);
    }

    public function status(ServiceOrder $order): JsonResponse
    {
        $active = DB::table('final_share_tokens as shares')
            ->join('generated_documents as documents', 'documents.id', '=', 'shares.generated_document_id')
            ->where('shares.service_order_id', $order->id)
            ->where('documents.type', 'final')
            ->whereNull('shares.revoked_at')
            ->where('shares.expires_at', '>', now())
            ->orderByDesc('shares.created_at')
            ->select(['shares.expires_at', 'shares.revision'])
            ->first();

        return response()->json([
            'active' => (bool) $active,
            'expires_at' => $active?->expires_at,
            'revision' => $active?->revision,
        ]);
    }

    public function revoke(Request $request, ServiceOrder $order, Audit $audit): JsonResponse
    {
        $revokedAt = now();
        $count = DB::table('final_share_tokens')
            ->where('service_order_id', $order->id)
            ->whereNull('revoked_at')
            ->where('expires_at', '>', $revokedAt)
            ->update(['revoked_at' => $revokedAt, 'updated_at' => $revokedAt]);
        $audit->record($request, 'service_order.final_links_revoked', 'service_order', $order->id, null, ['count' => $count]);

        return response()->json(['revoked' => $count]);
    }

    public function download(string $token, DocumentService $documents, CompanySettings $settings)
    {
        $share = DB::table('final_share_tokens')->where('token_hash', hash('sha256', $token))->first();
        if (! $share) {
            return $this->unavailable($settings, 'Este link não está mais disponível.', 404);
        }

        $document = $share->generated_document_id
            ? DB::table('generated_documents')->where('id', $share->generated_document_id)->where('type', 'final')->first()
            : null;
        if ($share->revoked_at || ! $document || (int) $document->service_order_id !== (int) $share->service_order_id || (int) $document->revision !== (int) $share->revision) {
            return $this->unavailable($settings, 'Este link não está mais disponível.', 410);
        }
        if (now()->greaterThanOrEqualTo($share->expires_at)) {
            return $this->unavailable($settings, 'Este link de acesso expirou.', 410);
        }
        if (! Storage::disk('local')->exists($document->path)) {
            return $this->unavailable($settings, 'Este link não está mais disponível.', 410);
        }

        $order = ServiceOrder::find($share->service_order_id);
        if (! $order) {
            return $this->unavailable($settings, 'Este link não está mais disponível.', 410);
        }

        DB::table('final_share_tokens')->where('id', $share->id)->update([
            'last_access_at' => now(),
            'access_count' => DB::raw('access_count + 1'),
            'updated_at' => now(),
        ]);

        $response = $documents->response($order, 'final', (int) $share->revision);
        $response->headers->set('Cache-Control', 'private, no-store');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('X-Robots-Tag', 'noindex, nofollow, noarchive');

        return $response;
    }

    private function unavailable(CompanySettings $settings, string $title, int $status)
    {
        return response()->view('shares.unavailable', [
            'title' => $title,
            'company' => $settings->all(),
        ], $status, [
            'Cache-Control' => 'no-store, private',
            'Pragma' => 'no-cache',
            'X-Robots-Tag' => 'noindex, nofollow, noarchive',
        ]);
    }
}
