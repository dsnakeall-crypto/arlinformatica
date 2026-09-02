<?php

namespace App\Console\Commands;

use App\Services\BackupService;
use Illuminate\Console\Command;

class RunBackup extends Command
{
    protected $signature = 'backup:run {--force : Executar mesmo com backup automático desligado}';
    protected $description = 'Cria um backup automático portátil e aplica a retenção';

    public function handle(BackupService $service): int
    {
        if (! config('backup.automatic') && ! $this->option('force')) { $this->components->info('Backup automático desativado.'); return self::SUCCESS; }
        $backup = $service->create(null, 'automatic');
        $removed = $service->applyRetention();
        $this->components->info("Backup #{$backup->id} criado; $removed backup(s) removido(s) pela retenção.");
        return self::SUCCESS;
    }
}
