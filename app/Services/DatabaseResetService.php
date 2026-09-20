<?php

namespace App\Services;

use App\Models\Backup;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class DatabaseResetService
{
    private const DELETE_ORDER = [
        'final_share_tokens',
        'stock_movements',
        'service_order_refunds',
        'financial_adjustments',
        'financial_transactions',
        'payments',
        'financial_expenses',
        'post_sale_actions',
        'post_sale_cycles',
        'notifications',
        'push_subscriptions',
        'generated_documents',
        'technical_reports',
        'service_order_items',
        'budget_items',
        'budgets',
        'service_order_finalizations',
        'status_history',
        'service_order_photos',
        'service_order_checklists',
        'service_order_snapshots',
        'service_orders',
        'service_catalog',
        'clients',
        'audit_logs',
    ];

    public function preview(User $master): array
    {
        return [
            'clients' => $this->count('clients'),
            'service_orders' => $this->count('service_orders'),
            'order_items' => $this->count('service_order_items'),
            'budgets' => $this->count('budgets'),
            'services_and_products' => $this->count('service_catalog'),
            'financial_records' => $this->count('payments') + $this->count('financial_transactions') + $this->count('financial_adjustments') + $this->count('financial_expenses') + $this->count('service_order_refunds'),
            'documents' => $this->count('generated_documents'),
            'photos' => $this->count('service_order_photos'),
            'post_sales' => $this->count('post_sale_cycles') + $this->count('post_sale_actions'),
            'history_and_reports' => $this->count('status_history') + $this->count('technical_reports') + $this->count('service_order_finalizations'),
            'notifications' => $this->count('notifications'),
            'audit_logs' => $this->count('audit_logs'),
            'users' => DB::table('users')->where('id', '!=', $master->id)->count(),
        ];
    }

    public function prepare(User $master, BackupService $backups): array
    {
        $backup = $backups->create($master, 'pre_reset', true);
        $disk = Storage::disk(config('backup.disk'));
        throw_unless($backup->status === 'ready' && $disk->exists($backup->path), RuntimeException::class, 'O backup de segurança não foi gerado.');
        throw_unless($disk->size($backup->path) > 0, RuntimeException::class, 'O backup de segurança foi gerado vazio.');

        return [
            'backup_id' => $backup->id,
            'filename' => basename($backup->path),
            'bytes' => $backup->bytes,
            'counts' => $this->preview($master),
        ];
    }

    public function reset(User $master, Backup $backup, ?string $ipAddress): array
    {
        $this->assertUsableBackup($master, $backup);
        $counts = $this->preview($master);
        $photoPaths = Schema::hasTable('service_order_photos') ? DB::table('service_order_photos')->pluck('path')->all() : [];
        $documentPaths = Schema::hasTable('generated_documents') ? DB::table('generated_documents')->pluck('path')->all() : [];

        DB::transaction(function () use ($master, $backup, $counts, $ipAddress): void {
            foreach (self::DELETE_ORDER as $table) {
                if (Schema::hasTable($table)) {
                    DB::table($table)->delete();
                }
            }

            DB::table('versioned_templates')->where('created_by', '!=', $master->id)->update(['created_by' => null]);
            DB::table('backups')->where('created_by', '!=', $master->id)->update(['created_by' => null]);
            if (Schema::hasTable('sessions')) {
                DB::table('sessions')->whereNotNull('user_id')->where('user_id', '!=', $master->id)->delete();
            }
            DB::table('users')->where('id', '!=', $master->id)->delete();
            DB::table('counters')->updateOrInsert(
                ['name' => 'service_order'],
                ['value' => 0, 'created_at' => now(), 'updated_at' => now()],
            );
            DB::table('backups')->where('id', $backup->id)->update(['kind' => 'reset_backup', 'protected' => true, 'updated_at' => now()]);
            DB::table('audit_logs')->insert([
                'user_id' => $master->id,
                'action' => 'database.reset_completed',
                'subject_type' => 'database',
                'subject_id' => null,
                'before' => json_encode($counts),
                'after' => json_encode(['backup_id' => $backup->id, 'service_order_counter' => 0, 'preserved_master_id' => $master->id]),
                'ip_address' => $ipAddress,
                'created_at' => now(),
            ]);
        });

        $disk = Storage::disk('local');
        $disk->delete(array_values(array_unique([...$photoPaths, ...$documentPaths])));
        $disk->deleteDirectory('orders');
        $disk->deleteDirectory('documents/orders');
        $disk->deleteDirectory('documents/finance');
        $this->resetClientSequence();

        return $counts;
    }

    private function assertUsableBackup(User $master, Backup $backup): void
    {
        $disk = Storage::disk(config('backup.disk'));
        $valid = $backup->kind === 'pre_reset'
            && $backup->protected
            && $backup->status === 'ready'
            && $backup->created_by === $master->id
            && $backup->created_at?->greaterThanOrEqualTo(now()->subMinutes(30))
            && $disk->exists($backup->path)
            && $disk->size($backup->path) > 0;

        throw_unless($valid, RuntimeException::class, 'Crie um novo backup de segurança antes de zerar o banco.');
    }

    private function resetClientSequence(): void
    {
        match (DB::getDriverName()) {
            'mysql', 'mariadb' => DB::statement('ALTER TABLE clients AUTO_INCREMENT = 1'),
            'pgsql' => DB::statement('ALTER SEQUENCE clients_id_seq RESTART WITH 1'),
            'sqlite' => DB::table('sqlite_sequence')->where('name', 'clients')->delete(),
            default => null,
        };
    }

    private function count(string $table): int
    {
        return Schema::hasTable($table) ? DB::table($table)->count() : 0;
    }
}
