<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class CheckDocumentIntegrity extends Command
{
    protected $signature = 'arl:documents:integrity';

    protected $description = 'Inspeciona documentos e checksums sem alterar arquivos ou banco';

    public function handle(): int
    {
        $disk = Storage::disk('local');
        $known = [];
        $problems = 0;
        foreach (DB::table('generated_documents')->orderBy('id')->cursor() as $document) {
            $known[$document->path] = true;
            $state = ! $disk->exists($document->path) ? 'DB_RECORD_FILE_MISSING'
                : (hash('sha256', $disk->get($document->path)) === $document->sha256 ? 'CONSISTENT' : 'HASH_MISMATCH');
            $this->line("$state document=$document->id path=$document->path");
            $problems += $state === 'CONSISTENT' ? 0 : 1;
        }
        foreach ($disk->allFiles('documents/orders') as $path) {
            if (! isset($known[$path])) {
                $state = str_starts_with(basename($path), '.pending-') ? 'PENDING_STALE' : 'ORPHAN_UNREGISTERED';
                $this->line("$state path=$path");
                if ($state === 'PENDING_STALE') {
                    $this->line('Arquivo pending exige inspeção: processos ativos não foram verificados; não excluir automaticamente.');
                }
                $problems++;
            }
        }
        foreach ($disk->allFiles('documents/recovery/orders') as $path) {
            if (! str_ends_with($path, '.pdf')) {
                continue;
            }
            $metadata = $disk->exists($path.'.json') ? json_decode($disk->get($path.'.json'), true) : null;
            $valid = is_array($metadata) && isset($metadata['sha256'], $metadata['original_path'])
                && hash('sha256', $disk->get($path)) === $metadata['sha256'];
            $this->line(($valid ? 'RECOVERY_SNAPSHOT' : 'RECOVERY_INVALID')." path=$path");
            $problems += $valid ? 0 : 1;
        }
        $this->line("Anomalias: $problems. Nenhum arquivo ou registro foi alterado.");

        return $problems === 0 ? self::SUCCESS : self::FAILURE;
    }
}
