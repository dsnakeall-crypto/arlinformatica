<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('post-sale:check')->hourly()->withoutOverlapping();
Schedule::command('scheduler:heartbeat')->everyMinute()->withoutOverlapping();

$frequency = app(\App\Services\BackupService::class)->automaticSettings()['frequency'];
$backup = Schedule::command('backup:run')->withoutOverlapping(120);
match ($frequency) {
    'weekly' => $backup->weeklyOn(1, '02:00'),
    'monthly' => $backup->monthlyOn(1, '02:00'),
    default => $backup->dailyAt('02:00'),
};
