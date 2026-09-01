<?php

namespace App\Console\Commands;

use App\Services\PostSaleService;
use Illuminate\Console\Command;

class CheckPostSales extends Command
{
    protected $signature = 'post-sale:check';

    protected $description = 'Cria ciclos e notificações idempotentes de pós-venda vencido';

    public function handle(PostSaleService $service): int
    {
        $created = $service->catchUp();
        $this->info("Verificação concluída; $created ciclo(s) criado(s).");

        return self::SUCCESS;
    }
}
