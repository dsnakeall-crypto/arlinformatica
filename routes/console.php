<?php

use App\Services\BackupService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Schedule::call(fn () => Artisan::call('post-sale:check'))
    ->name('post-sale:check')
    ->hourly()
    ->withoutOverlapping();

Schedule::call(fn () => Artisan::call('scheduler:heartbeat'))
    ->name('scheduler:heartbeat')
    ->everyMinute()
    ->withoutOverlapping();

try {
    $frequency = app(BackupService::class)->automaticSettings()['frequency'];
} catch (Throwable) {
    $frequency = (string) config('backup.frequency', 'daily');
}

$backup = Schedule::call(fn () => Artisan::call('backup:run'))
    ->name('backup:run')
    ->withoutOverlapping(120);

match ($frequency) {
    'weekly' => $backup->weeklyOn(1, '02:00'),
    'monthly' => $backup->monthlyOn(1, '02:00'),
    default => $backup->dailyAt('02:00'),
};
