<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Services\PostSaleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class NavigationController extends Controller
{
    public function summary(PostSaleService $postSales): JsonResponse
    {
        $postSales->catchUp(true);

        return response()->json([
            'open_orders' => ServiceOrder::query()
                ->whereNotIn('status', ['completed', 'interrupted'])
                ->count(),
            'available_post_sales' => DB::table('post_sale_cycles as cycles')
                ->join('service_orders as orders', 'orders.id', '=', 'cycles.service_order_id')
                ->where('cycles.active', true)
                ->where('cycles.eligible_at', '<=', now())
                ->whereNull('orders.deleted_at')
                ->whereExists(function ($query) {
                    $query->selectRaw('1')
                        ->from('post_sale_actions as actions')
                        ->whereColumn('actions.cycle_id', 'cycles.id')
                        ->whereNull('actions.confirmed_at');
                })
                ->count(),
        ]);
    }
}
