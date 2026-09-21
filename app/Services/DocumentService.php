<?php

namespace App\Services;

use App\Models\ServiceOrder;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DocumentService
{
    public function issue(ServiceOrder $order, string $type, array $snapshot, int $userId, int $revision = 1): void
    {
        $bytes = $this->render($type, $snapshot);
        $path = "documents/orders/{$order->id}/$type-r$revision.pdf";
        abort_if(DB::table('generated_documents')->where(['service_order_id' => $order->id, 'type' => $type, 'revision' => $revision])->exists(), 409, 'Uma revisão emitida não pode ser sobrescrita.');
        Storage::disk('local')->put($path, $bytes);
        DB::table('generated_documents')->insert(['service_order_id' => $order->id, 'type' => $type, 'revision' => $revision, 'path' => $path, 'sha256' => hash('sha256', $bytes), 'snapshot' => json_encode($snapshot), 'issued_at' => now(), 'issued_by' => $userId, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function render(string $type, array $snapshot): string
    {
        return Pdf::loadView("documents.$type", $snapshot)
            ->setOption('enable_font_subsetting', true)
            ->setPaper('a4')
            ->output();
    }

    public function response(ServiceOrder $order, string $type, int $revision = 1)
    {
        $document = DB::table('generated_documents')->where(['service_order_id' => $order->id, 'type' => $type, 'revision' => $revision])->first();
        abort_unless($document, 404);

        return Storage::disk('local')->response($document->path, "$type-OS-{$order->number}-R$revision.pdf", ['Content-Type' => 'application/pdf', 'Cache-Control' => 'private, no-store']);
    }
}
