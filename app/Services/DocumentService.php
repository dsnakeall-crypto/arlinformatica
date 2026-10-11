<?php

namespace App\Services;

use App\Models\ServiceOrder;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Events\TransactionRolledBack;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class DocumentService
{
    public function issue(ServiceOrder $order, string $type, array $snapshot, int $userId, int $revision = 1): void
    {
        $this->issueBytes($order, $type, $snapshot, $this->render($type, $snapshot), $userId, $revision);
    }

    public function issueBytes(ServiceOrder $order, string $type, array $snapshot, string $bytes, int $userId, int $revision = 1, ?string $path = null): void
    {
        $path ??= "documents/orders/{$order->id}/$type-r$revision.pdf";
        $disk = Storage::disk('local');
        $hash = hash('sha256', $bytes);
        DB::transaction(function () use ($order, $type, $snapshot, $bytes, $userId, $revision, $path, $disk, $hash): void {
            abort_unless(DB::table('service_orders')->where('id', $order->id)->lockForUpdate()->first(), 404);
            $unique = ['service_order_id' => $order->id, 'type' => $type, 'revision' => $revision];
            abort_if(DB::table('generated_documents')->where($unique)->exists(), 409, 'Uma revisão emitida não pode ser sobrescrita.');
            abort_if($disk->exists($path), 409, 'Arquivo documental sem registro correspondente; exige reconciliação.');
            if (! $disk->makeDirectory(dirname($path))) {
                throw new RuntimeException('Não foi possível preparar o diretório documental.');
            }
            // Exclusive creation prevents an existing PDF from being overwritten,
            // including by a writer that does not share the database lock.
            $stream = @fopen($disk->path($path), 'x+b');
            if ($stream === false) {
                throw new RuntimeException('Não foi possível criar o PDF exclusivo.');
            }
            try {
                $this->writeBytes($stream, $bytes);
                if (! fflush($stream) || (function_exists('fsync') && ! fsync($stream)) || fstat($stream)['size'] !== strlen($bytes)) {
                    throw new RuntimeException('Gravação documental incompleta.');
                }
                rewind($stream);
                if (hash('sha256', stream_get_contents($stream)) !== $hash) {
                    throw new RuntimeException('Checksum documental divergente.');
                }
            } catch (\Throwable $error) {
                fclose($stream);
                // This handle was created exclusively by this operation.
                if (! $disk->delete($path)) {
                    throw new RuntimeException('Falha ao compensar gravação documental; arquivo preservado para inspeção.', 0, $error);
                }
                throw $error;
            }
            fclose($stream);
            $compensated = false;
            $cleanup = function () use ($disk, $path, $hash, &$compensated): void {
                if ($compensated) {
                    return;
                }
                $compensated = true;
                if ($disk->exists($path)) {
                    if (hash('sha256', $disk->get($path)) !== $hash) {
                        throw new RuntimeException('Arquivo alterado durante rollback; preservado para inspeção de integridade.');
                    }
                    if (! $disk->delete($path)) {
                        throw new RuntimeException('Falha ao compensar documento; exige inspeção de integridade.');
                    }
                }
            };
            $this->onRollback($cleanup);
            try {
                DB::table('generated_documents')->insert([...$unique, 'path' => $path, 'sha256' => $hash, 'snapshot' => json_encode($snapshot, JSON_THROW_ON_ERROR), 'issued_at' => now(), 'issued_by' => $userId, 'created_at' => now(), 'updated_at' => now()]);
            } catch (\Throwable $error) {
                $cleanup();
                throw $error;
            }
        });
    }

    public function onRollback(callable $callback): void
    {
        // Share errors across all document service instances in this application.
        // Throw only after Laravel has executed every compensation and cleared
        // its transaction records, rather than interrupting the manager itself.
        if (! app()->bound('arl.document-rollback-state')) {
            $state = new \stdClass;
            $state->errors = [];
            app()->instance('arl.document-rollback-state', $state);
            Event::listen(TransactionRolledBack::class, function (TransactionRolledBack $event) use ($state): void {
                $name = $event->connection->getName();
                $errors = $state->errors[$name] ?? [];
                unset($state->errors[$name]);
                if ($errors !== []) {
                    throw new RuntimeException('Falha na compensação documental; arquivos preservados exigem inspeção de integridade.', 0, $errors[0]);
                }
            });
        }
        $state = app('arl.document-rollback-state');
        $connection = DB::connection()->getName();
        $executed = false;
        $guarded = function () use ($callback, $state, $connection, &$executed): void {
            if ($executed) {
                return;
            }
            $executed = true;
            try {
                $callback();
            } catch (\Throwable $error) {
                $state->errors[$connection][] = $error;
                try {
                    report($error);
                } catch (\Throwable) {
                    error_log('Falha na compensação documental: '.$error->getMessage());
                }
            }
        };
        // Register on every ancestor: Laravel does not run a committed child's
        // rollback callbacks when a containing transaction later rolls back.
        foreach (app('db.transactions')->getPendingTransactions() as $transaction) {
            if ($transaction->connection === $connection) {
                $transaction->addCallbackForRollback($guarded);
            }
        }
    }

    protected function writeBytes($stream, string $bytes): void
    {
        $offset = 0;
        while ($offset < strlen($bytes)) {
            $written = fwrite($stream, substr($bytes, $offset));
            if ($written === false || $written === 0) {
                throw new RuntimeException('Não foi possível gravar o PDF completo.');
            }
            $offset += $written;
        }
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
        $disk = Storage::disk('local');
        abort_unless($disk->exists($document->path), 404, 'Arquivo documental indisponível.');
        $bytes = $disk->get($document->path);
        abort_unless(hash('sha256', $bytes) === $document->sha256, 409, 'Integridade documental divergente; exige inspeção.');

        $filename = $type === 'final-record'
            ? "Registro-Revisao-OS-{$order->number}-R$revision.pdf"
            : "$type-OS-{$order->number}-R$revision.pdf";

        $response = response()->stream(static function () use ($bytes): void {
            echo $bytes;
        }, 200, ['Content-Type' => 'application/pdf', 'Cache-Control' => 'private, no-store', 'Content-Length' => strlen($bytes)]);
        $response->headers->set('Content-Disposition', $response->headers->makeDisposition('inline', $filename));

        return $response;
    }
}
