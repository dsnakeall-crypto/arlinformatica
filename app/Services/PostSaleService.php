<?php

namespace App\Services;

use App\Models\ServiceOrder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class PostSaleService
{
    public const ACTIONS = ['google', 'instagram'];

    public const MANUAL_EXCLUSION_REASON = 'Excluído manualmente do Pós-Venda';

    public const REOPENED_REASON = 'OS reaberta';

    public function __construct(private readonly NotificationService $notifications) {}

    public function catchUp(bool $throttled = false): int
    {
        if ($throttled && ! Cache::add('post-sale:catch-up', true, now()->addMinutes(10))) {
            return 0;
        }

        return DB::transaction(function () {
            $created = 0;
            ServiceOrder::query()->with('client')->where('status', 'completed')->where('result', 'repair_completed')->whereNotNull('completed_at')->orderBy('completed_at')->chunkById(100, function ($orders) use (&$created) {
                foreach ($orders as $order) {
                    $created += $this->ensureCycle($order) ? 1 : 0;
                }
            });

            DB::table('post_sale_cycles')->where('active', true)->where('eligible_at', '<=', now())->get()->each(function ($cycle) {
                $pending = DB::table('post_sale_actions')
                    ->where('cycle_id', $cycle->id)
                    ->whereIn('type', self::ACTIONS)
                    ->whereNull('confirmed_at')
                    ->exists();
                if (! $pending) {
                    $this->notifications->resolve("post-sale:$cycle->id");

                    return;
                }
                $order = ServiceOrder::with('client')->find($cycle->service_order_id);
                if ($order && $order->status === 'completed' && $order->completed_at) {
                    $this->notifications->notifyUsers('post_sale_due', 'Pós-Venda pendente', "OS {$order->number} — {$order->client->name}", '/post-sale', "post-sale:$cycle->id", ['cycle_id' => $cycle->id]);
                } else {
                    $this->notifications->resolve("post-sale:$cycle->id");
                }
            });

            return $created;
        });
    }

    private function ensureCycle(ServiceOrder $order): bool
    {
        DB::table('clients')->where('id', $order->client_id)->lockForUpdate()->first();
        $existing = DB::table('post_sale_cycles')->where('service_order_id', $order->id)->lockForUpdate()->first();
        if ($existing?->active) {
            return false;
        }
        $recentManualExclusion = DB::table('post_sale_cycles')
            ->where('client_id', $order->client_id)
            ->where('archive_reason', self::MANUAL_EXCLUSION_REASON)
            ->whereNotNull('archived_at')
            ->orderByDesc('archived_at')
            ->lockForUpdate()
            ->first();
        if ($recentManualExclusion && $order->completed_at->lessThan(Carbon::parse($recentManualExclusion->archived_at)->addDays(35))) {
            return false;
        }
        $active = DB::table('post_sale_cycles')->where('client_id', $order->client_id)->where('active', true)->lockForUpdate()->first();
        if ($active) {
            $old = ServiceOrder::find($active->service_order_id);
            if (! $old || ! $old->completed_at) {
                DB::table('post_sale_cycles')->where('id', $active->id)->update(['active' => false, 'archived_at' => now(), 'archive_reason' => 'Ciclo inconsistente desativado', 'updated_at' => now()]);
                $this->notifications->resolve("post-sale:$active->id");
            } elseif ($old->completed_at->diffInDays($order->completed_at, false) < 60) {
                return false;
            } else {
                DB::table('post_sale_cycles')->where('id', $active->id)->update(['active' => false, 'archived_at' => now(), 'archive_reason' => 'Nova OS elegível após 60 dias', 'updated_at' => now()]);
                $this->notifications->resolve("post-sale:$active->id");
            }
        }
        $eligibleAt = $order->completed_at->copy()->addDays(7);
        if ($existing) {
            DB::table('post_sale_cycles')->where('id', $existing->id)->update(['client_id' => $order->client_id, 'active' => true, 'eligible_at' => $eligibleAt, 'archived_at' => null, 'archive_reason' => null, 'updated_at' => now()]);
            DB::table('post_sale_actions')->where('cycle_id', $existing->id)->update(['confirmed_at' => null, 'confirmed_by' => null, 'message_snapshot' => null, 'updated_at' => now()]);

            return true;
        }
        $cycle = DB::table('post_sale_cycles')->insertGetId(['client_id' => $order->client_id, 'service_order_id' => $order->id, 'active' => true, 'eligible_at' => $eligibleAt, 'created_at' => now(), 'updated_at' => now()]);
        foreach (self::ACTIONS as $type) {
            DB::table('post_sale_actions')->insertOrIgnore(['cycle_id' => $cycle, 'type' => $type, 'created_at' => now(), 'updated_at' => now()]);
        }

        return true;
    }
}
