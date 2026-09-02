<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class SchedulerHeartbeat extends Command
{
    protected $signature = 'scheduler:heartbeat';
    protected $description = 'Registra que o cron do Laravel Scheduler está ativo';

    public function handle(): int
    {
        DB::table('settings')->updateOrInsert(['key' => 'scheduler_heartbeat_at'], ['value' => now()->toIso8601String(), 'type' => 'datetime', 'created_at' => now(), 'updated_at' => now()]);
        return self::SUCCESS;
    }
}
