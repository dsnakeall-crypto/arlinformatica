<?php

use App\Services\BackupService;
use App\Services\SupplierPayables;
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
    'weekly' => $backup->weeklyOn(1, '02:05'),
    'monthly' => $backup->monthlyOn(1, '02:05'),
    default => $backup->dailyAt('02:05'),
};

Schedule::call(fn () => app(SupplierPayables::class)->remind())->name('supplier-payables:remind')->hourly()->withoutOverlapping();
