<?php

namespace App\Services;

use App\Models\ServiceOrder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class PostSaleService
{
    public const ACTIONS = ['google', 'instagram'];

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
                if ($order) {
                    $this->notifications->notifyUsers('post_sale_due', 'Pós-Venda pendente', "OS {$order->number} — {$order->client->name}", '/post-sale', "post-sale:$cycle->id", ['cycle_id' => $cycle->id]);
                }
            });

            return $created;
        });
    }

    private function ensureCycle(ServiceOrder $order): bool
    {
        DB::table('clients')->where('id', $order->client_id)->lockForUpdate()->first();
        if (DB::table('post_sale_cycles')->where('service_order_id', $order->id)->exists()) {
            return false;
        }
        $active = DB::table('post_sale_cycles')->where('client_id', $order->client_id)->where('active', true)->lockForUpdate()->first();
        if ($active) {
            $old = ServiceOrder::find($active->service_order_id);
            if (! $old || $old->completed_at->diffInDays($order->completed_at, false) < 60) {
                return false;
            }
            DB::table('post_sale_cycles')->where('id', $active->id)->update(['active' => false, 'archived_at' => now(), 'archive_reason' => 'Nova OS elegível após 60 dias', 'updated_at' => now()]);
            $this->notifications->resolve("post-sale:$active->id");
        }
        $cycle = DB::table('post_sale_cycles')->insertGetId(['client_id' => $order->client_id, 'service_order_id' => $order->id, 'active' => true, 'eligible_at' => $order->completed_at->copy()->addHours(24), 'created_at' => now(), 'updated_at' => now()]);
        foreach (self::ACTIONS as $type) {
            DB::table('post_sale_actions')->insertOrIgnore(['cycle_id' => $cycle, 'type' => $type, 'created_at' => now(), 'updated_at' => now()]);
        }

        return true;
    }
}
