<?php

namespace App\Services;

use App\Models\ServiceOrder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

final class ReplacedFinalDocumentService
{
    public const MAX_BYTES = 60 * 1024;

    public function __construct(private readonly DocumentService $documents) {}

    public function replacePrevious(ServiceOrder $order, int $previousRevision, int $currentRevision, int $userId, ?string $ipAddress): void
    {
        $previous = DB::table('generated_documents')->where([
            'service_order_id' => $order->id,
            'type' => 'final',
            'revision' => $previousRevision,
        ])->first();
        if (! $previous) {
            return;
        }

        $snapshot = json_decode($previous->snapshot, true, 512, JSON_THROW_ON_ERROR);
        $reopening = DB::table('audit_logs')
            ->leftJoin('users', 'users.id', '=', 'audit_logs.user_id')
            ->where('audit_logs.subject_type', 'service_order')
            ->where('audit_logs.subject_id', $order->id)
            ->where('audit_logs.action', 'service_order.reopened')
            ->where('audit_logs.created_at', '>=', $previous->issued_at)
            ->orderByDesc('audit_logs.id')
            ->select('audit_logs.after', 'users.name as user_name')
            ->first();
        $reopeningAfter = $reopening ? json_decode($reopening->after, true) : [];
        $replacedAt = now();
        $record = [
            'order_number' => $order->number,
            'revision' => $previousRevision,
            'original_issued_at' => $previous->issued_at,
            'replaced_at' => $replacedAt->toDateTimeString(),
            'reopened_by' => $reopening->user_name ?? 'Não informado',
            'reopen_reason' => $reopeningAfter['note'] ?? null,
            'order' => $snapshot['order'] ?? [],
            'finalization' => $snapshot['finalization'] ?? [],
            'items' => $snapshot['items'] ?? [],
            'result_label' => $snapshot['result_label'] ?? null,
        ];
        $bytes = $this->documents->render('final-record', ['record' => $record]);
        if (strlen($bytes) > self::MAX_BYTES) {
            throw new RuntimeException('O registro da revisão substituída excedeu o limite de 60 KB.');
        }

        $disk = Storage::disk('local');
        $recordPath = "documents/orders/{$order->id}/Registro-Revisao-OS-{$order->number}-R{$previousRevision}.pdf";
        $oldExists = $disk->exists($previous->path);
        $oldBytes = $oldExists ? $disk->get($previous->path) : null;
        if (! $disk->put($recordPath, $bytes)) {
            throw new RuntimeException('Não foi possível gravar o registro da revisão substituída.');
        }

        try {
            DB::transaction(function () use ($order, $previous, $previousRevision, $currentRevision, $userId, $ipAddress, $record, $recordPath, $bytes, $disk, $oldExists) {
                DB::table('generated_documents')->insert([
                    'service_order_id' => $order->id,
                    'type' => 'final-record',
                    'revision' => $previousRevision,
                    'path' => $recordPath,
                    'sha256' => hash('sha256', $bytes),
                    'snapshot' => json_encode($record, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
                    'issued_at' => now(),
                    'issued_by' => $userId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                DB::table('generated_documents')->where('id', $previous->id)->delete();
                DB::table('audit_logs')->insert([
                    'user_id' => $userId,
                    'action' => 'service_order.final_pdf_replaced',
                    'subject_type' => 'service_order',
                    'subject_id' => $order->id,
                    'before' => json_encode(['type' => 'final', 'revision' => $previousRevision, 'path' => $previous->path]),
                    'after' => json_encode(['type' => 'final-record', 'revision' => $previousRevision, 'path' => $recordPath, 'current_revision' => $currentRevision]),
                    'ip_address' => $ipAddress,
                    'created_at' => now(),
                ]);
                if ($oldExists && ! $disk->delete($previous->path)) {
                    throw new RuntimeException('Não foi possível remover o PDF final substituído.');
                }
            });
        } catch (\Throwable $exception) {
            $disk->delete($recordPath);
            if ($oldExists && ! $disk->exists($previous->path) && $oldBytes !== null) {
                $disk->put($previous->path, $oldBytes);
            }
            throw $exception;
        }
    }
}
