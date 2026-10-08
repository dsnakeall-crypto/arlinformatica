<?php

namespace App\Services;

use App\Models\ServiceOrder;
use Illuminate\Support\Facades\DB;

class OrderPaymentStatus
{
    public function settled(ServiceOrder $order): bool
    {
        $latest = DB::table('financial_adjustments')->select('transaction_id', DB::raw('MAX(id) as adjustment_id'))->groupBy('transaction_id');
        $paid = (int) DB::table('financial_transactions as ft')
            ->join('payments as p', 'p.id', '=', 'ft.payment_id')
            ->leftJoinSub($latest, 'latest_adjustment', 'latest_adjustment.transaction_id', '=', 'ft.id')
            ->leftJoin('financial_adjustments as adjustment', 'adjustment.id', '=', 'latest_adjustment.adjustment_id')
            ->where('p.service_order_id', $order->id)->where('ft.origin', 'service_order')
            ->selectRaw('COALESCE(SUM(COALESCE(adjustment.new_cents, ft.amount_cents)), 0) as paid_cents')->value('paid_cents');
        $refunded = (int) DB::table('service_order_refunds')->where('service_order_id', $order->id)->sum('amount_cents');

        return $order->total_cents > 0 && $paid - $refunded >= $order->total_cents;
    }
}
