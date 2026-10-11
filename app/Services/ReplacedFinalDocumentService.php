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
        DB::transaction(function () use ($order, $previousRevision, $currentRevision, $userId, $ipAddress): void {
            abort_unless(DB::table('service_orders')->where('id', $order->id)->lockForUpdate()->first(), 404);
            $this->replaceLocked($order, $previousRevision, $currentRevision, $userId, $ipAddress);
        });
    }

    private function replaceLocked(ServiceOrder $order, int $previousRevision, int $currentRevision, int $userId, ?string $ipAddress): void
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
        abort_unless($oldExists, 409, 'PDF anterior ausente; exige inspeção antes de substituir a revisão.');
        abort_if($oldExists && hash('sha256', $oldBytes) !== $previous->sha256, 409, 'Integridade do PDF anterior divergente; exige inspeção.');
        // A crash can skip rollback callbacks. Preserve a durable, private copy
        // before removing the previous path, even after a successful replacement.
        $recoveryPath = null;
        if ($oldBytes !== null) {
            $recoveryPath = "documents/recovery/orders/{$order->id}/final-r{$previousRevision}-".bin2hex(random_bytes(16)).'.pdf';
            $this->writeRecoveryFile($disk, $recoveryPath, $oldBytes);
            $this->writeRecoveryFile($disk, $recoveryPath.'.json', json_encode([
                'document_id' => $previous->id,
                'service_order_id' => $order->id,
                'revision' => $previousRevision,
                'original_path' => $previous->path,
                'sha256' => $previous->sha256,
                'current_revision' => $currentRevision,
                'created_at' => now()->toIso8601String(),
                'original_document' => (array) $previous,
            ], JSON_THROW_ON_ERROR));
        }
        $this->documents->issueBytes($order, 'final-record', $record, $bytes, $userId, $previousRevision, $recordPath);
        $restored = false;
        $this->documents->onRollback(function () use ($disk, $previous, $oldExists, $oldBytes, &$restored): void {
            if ($restored) {
                return;
            }
            $restored = true;
            if ($oldExists && ! $disk->exists($previous->path) && $oldBytes !== null) {
                $disk->makeDirectory(dirname($previous->path));
                $stream = @fopen($disk->path($previous->path), 'x+b');
                if ($stream === false) {
                    throw new RuntimeException('Não foi possível recuperar o PDF anterior no rollback.');
                }
                try {
                    $offset = 0;
                    while ($offset < strlen($oldBytes)) {
                        $written = fwrite($stream, substr($oldBytes, $offset));
                        if ($written === false || $written === 0) {
                            throw new RuntimeException('Recuperação do PDF anterior incompleta.');
                        }
                        $offset += $written;
                    }
                    if (! fflush($stream) || hash_file('sha256', $disk->path($previous->path)) !== $previous->sha256) {
                        throw new RuntimeException('Checksum do PDF recuperado divergente.');
                    }
                } finally {
                    fclose($stream);
                }
            }
        });
        DB::table('generated_documents')->where('id', $previous->id)->delete();
        DB::table('audit_logs')->insert([
            'user_id' => $userId,
            'action' => 'service_order.final_pdf_replaced',
            'subject_type' => 'service_order',
            'subject_id' => $order->id,
            'before' => json_encode(['type' => 'final', 'revision' => $previousRevision, 'path' => $previous->path]),
            'after' => json_encode(['type' => 'final-record', 'revision' => $previousRevision, 'path' => $recordPath, 'current_revision' => $currentRevision, 'recovery_path' => $recoveryPath, 'original_sha256' => $previous->sha256]),
            'ip_address' => $ipAddress,
            'created_at' => now(),
        ]);
        if ($oldExists && ! $disk->delete($previous->path)) {
            throw new RuntimeException('Não foi possível remover o PDF final substituído.');
        }
    }

    private function writeRecoveryFile($disk, string $path, string $bytes): void
    {
        if (! $disk->makeDirectory(dirname($path))) {
            throw new RuntimeException('Não foi possível preparar a cópia privada de recuperação.');
        }
        $stream = @fopen($disk->path($path), 'x+b');
        if ($stream === false) {
            throw new RuntimeException('Não foi possível criar a cópia privada de recuperação.');
        }
        try {
            $offset = 0;
            while ($offset < strlen($bytes)) {
                $written = fwrite($stream, substr($bytes, $offset));
                if ($written === false || $written === 0) {
                    throw new RuntimeException('Cópia privada de recuperação incompleta.');
                }
                $offset += $written;
            }
            if (! fflush($stream) || (function_exists('fsync') && ! fsync($stream)) || hash_file('sha256', $disk->path($path)) !== hash('sha256', $bytes)) {
                throw new RuntimeException('Cópia privada de recuperação não foi validada.');
            }
        } finally {
            fclose($stream);
        }
    }
}
