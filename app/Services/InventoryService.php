<?php

namespace App\Services;

use App\Models\ServiceOrder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function addStock(int $productId, int $quantity, string $reason, int $userId): object
    {
        return DB::transaction(function () use ($productId, $quantity, $reason, $userId) {
            $product = DB::table('service_catalog')
                ->where('id', $productId)
                ->where('category', 'product')
                ->lockForUpdate()
                ->first();
            abort_unless($product, 404);

            $balance = (int) $product->stock_quantity + $quantity;
            if ($balance > 4294967295) {
                throw ValidationException::withMessages(['quantity' => 'A entrada ultrapassa o limite suportado para o saldo do produto.']);
            }
            DB::table('service_catalog')->where('id', $productId)->update([
                'stock_quantity' => $balance,
                'updated_at' => now(),
            ]);
            $this->record($productId, null, $userId, 'entry', $quantity, $balance, $reason);

            return DB::table('service_catalog')->find($productId);
        });
    }

    /**
     * Resolve snapshots and apply only the product delta while the caller's transaction is open.
     *
     * @return array<int, array<string, mixed>>
     */
    public function syncActiveOrderItems(ServiceOrder $order, array $requested, int $userId, string $reason): array
    {
        $grouped = collect($requested)->groupBy('catalog_id')->mapWithKeys(function (Collection $rows, $catalogId) {
            $quantity = (int) $rows->sum('quantity');
            abort_if($quantity > 999, 422, 'A quantidade de um item da OS não pode ultrapassar 999.');

            return [(int) $catalogId => $quantity];
        });
        $currentRows = DB::table('service_order_items')
            ->where('service_order_id', $order->id)
            ->whereNull('finalization_id')
            ->get();
        $catalogIds = $grouped->keys()
            ->merge($currentRows->pluck('catalog_id')->filter())
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->sort()
            ->values();
        $catalogs = DB::table('service_catalog')
            ->whereIn('id', $catalogIds)
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');
        $selectable = $catalogs->filter(fn ($catalog) => (bool) $catalog->active);
        abort_unless($selectable->keys()->intersect($grouped->keys())->count() === $grouped->count(), 422, 'Um serviço ou produto selecionado não está mais disponível.');

        $currentByCatalog = $currentRows->groupBy('catalog_id');
        $appliedByCatalog = [];
        foreach ($catalogs as $catalogId => $catalog) {
            if ($catalog->category !== 'product') {
                continue;
            }

            $current = (int) $currentByCatalog->get($catalogId, collect())->sum('quantity');
            $applied = (int) $currentByCatalog->get($catalogId, collect())->sum('stock_applied_quantity');
            $desired = (int) ($grouped->get($catalogId) ?? 0);
            $withdrawal = 0;
            $return = 0;
            if ($desired >= $current) {
                $withdrawal = $desired - $current;
                $newApplied = $applied + $withdrawal;
            } else {
                $return = min($applied, $current - $desired);
                $newApplied = $applied - $return;
            }

            $available = (int) $catalog->stock_quantity;
            if ($withdrawal > $available) {
                $unit = $available === 1 ? 'unidade' : 'unidades';
                throw ValidationException::withMessages([
                    'items' => "Estoque insuficiente para {$catalog->name}. Disponível: {$available} {$unit}.",
                ]);
            }

            if ($withdrawal > 0) {
                $balance = $available - $withdrawal;
                DB::table('service_catalog')->where('id', $catalogId)->update(['stock_quantity' => $balance, 'updated_at' => now()]);
                $this->record((int) $catalogId, $order->id, $userId, 'order_out', $withdrawal, $balance, $reason);
            } elseif ($return > 0) {
                $balance = $available + $return;
                DB::table('service_catalog')->where('id', $catalogId)->update(['stock_quantity' => $balance, 'updated_at' => now()]);
                $this->record((int) $catalogId, $order->id, $userId, 'order_return', $return, $balance, $reason);
            }
            $appliedByCatalog[(int) $catalogId] = $newApplied;
        }

        return $grouped->map(function (int $quantity, int $catalogId) use ($selectable, $appliedByCatalog) {
            $catalog = $selectable->get($catalogId);
            $warranty = $catalog->warranty_enabled ? [
                'enabled' => true,
                'term' => (int) $catalog->warranty_term,
                'unit' => $catalog->warranty_unit,
            ] : null;

            return [
                'catalog_id' => $catalog->id,
                'description' => $catalog->name,
                'quantity' => $quantity,
                'stock_applied_quantity' => (int) ($appliedByCatalog[$catalogId] ?? 0),
                'unit_price_cents' => (int) $catalog->price_cents,
                'subtotal_cents' => $quantity * (int) $catalog->price_cents,
                'warranty_snapshot' => $warranty,
            ];
        })->values()->all();
    }

    public function returnActiveOrderProducts(ServiceOrder $order, int $userId, string $reason): void
    {
        $items = DB::table('service_order_items')
            ->where('service_order_id', $order->id)
            ->whereNull('finalization_id')
            ->where('stock_applied_quantity', '>', 0)
            ->select('catalog_id', DB::raw('SUM(stock_applied_quantity) as applied_quantity'))
            ->groupBy('catalog_id')
            ->orderBy('catalog_id')
            ->get();
        if ($items->isEmpty()) {
            return;
        }

        $products = DB::table('service_catalog')
            ->whereIn('id', $items->pluck('catalog_id'))
            ->where('category', 'product')
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');
        foreach ($items as $item) {
            $product = $products->get($item->catalog_id);
            if (! $product) {
                continue;
            }
            $quantity = (int) $item->applied_quantity;
            $balance = (int) $product->stock_quantity + $quantity;
            DB::table('service_catalog')->where('id', $product->id)->update(['stock_quantity' => $balance, 'updated_at' => now()]);
            $this->record((int) $product->id, $order->id, $userId, 'order_return', $quantity, $balance, $reason);
        }
    }

    public function assertFinalProductsAlreadyApplied(ServiceOrder $order, array $finalItems): void
    {
        $productIds = DB::table('service_catalog')
            ->where('category', 'product')
            ->whereIn('id', collect($finalItems)->pluck('catalog_id')->filter())
            ->pluck('id');
        $final = collect($finalItems)->whereIn('catalog_id', $productIds)->groupBy('catalog_id')->map(fn ($rows) => (int) $rows->sum('quantity'))->sortKeys();
        $active = DB::table('service_order_items')
            ->join('service_catalog', 'service_catalog.id', '=', 'service_order_items.catalog_id')
            ->where('service_order_items.service_order_id', $order->id)
            ->whereNull('service_order_items.finalization_id')
            ->where('service_catalog.category', 'product')
            ->select('service_order_items.catalog_id', DB::raw('SUM(service_order_items.quantity) as quantity'))
            ->groupBy('service_order_items.catalog_id')
            ->pluck('quantity', 'catalog_id')
            ->map(fn ($quantity) => (int) $quantity)
            ->sortKeys();

        if ($final->all() !== $active->all()) {
            throw ValidationException::withMessages([
                'items' => 'Os produtos da finalização devem ser salvos na OS antes de concluir, para que a baixa ocorra no momento correto.',
            ]);
        }
    }

    private function record(int $productId, ?int $orderId, int $userId, string $type, int $quantity, int $balance, string $reason): void
    {
        DB::table('stock_movements')->insert([
            'product_id' => $productId,
            'service_order_id' => $orderId,
            'user_id' => $userId,
            'type' => $type,
            'quantity' => $quantity,
            'balance_after' => $balance,
            'reason' => $reason,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
