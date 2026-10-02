<?php

namespace App\Services;

use App\Models\ServiceOrder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function addStock(int $productId, int $quantity, string $reason, int $userId, array $details = []): object
    {
        return DB::transaction(function () use ($productId, $quantity, $reason, $userId, $details) {
            $product = DB::table('service_catalog')
                ->where('id', $productId)
                ->where('category', 'product')
                ->lockForUpdate()
                ->first();
            abort_unless($product, 404);

            if (! empty($details['request_key'])) {
                $previous = DB::table('stock_entry_details')->join('stock_movements', 'stock_movements.id', '=', 'stock_entry_details.stock_movement_id')->where('stock_entry_details.request_key', $details['request_key'])->first();
                if ($previous) {
                    abort_unless((int) $previous->product_id === $productId && (int) $previous->quantity === $quantity && $previous->reason === $reason && $previous->origin === ($details['origin'] ?? 'unspecified') && ($previous->unit_cost_cents === null ? null : (int) $previous->unit_cost_cents) === ($details['unit_cost_cents'] ?? null) && ($previous->supplier_id === null ? null : (int) $previous->supplier_id) === ($details['supplier_id'] ?? null), 409, 'Esta solicitação já registrou outra entrada. Confira as movimentações.');

                    return $product;
                }
            }

            $balance = (int) $product->stock_quantity + $quantity;
            if ($balance > 4294967295) {
                throw ValidationException::withMessages(['quantity' => 'A entrada ultrapassa o limite suportado para o saldo do produto.']);
            }
            DB::table('service_catalog')->where('id', $productId)->update([
                'stock_quantity' => $balance,
                'updated_at' => now(),
            ]);
            $movementId = $this->record($productId, null, $userId, 'entry', $quantity, $balance, $reason);
            DB::table('stock_entry_details')->insert($details + ['stock_movement_id' => $movementId, 'origin' => 'unspecified', 'unit_cost_cents' => null, 'created_at' => now(), 'updated_at' => now()]);

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
        $requestedByCatalog = collect($requested)->groupBy('catalog_id');
        $grouped = $requestedByCatalog->mapWithKeys(function (Collection $rows, $catalogId) {
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

        return $grouped->map(function (int $quantity, int $catalogId) use ($selectable, $appliedByCatalog, $requestedByCatalog) {
            $catalog = $selectable->get($catalogId);
            $requestedRow = $requestedByCatalog->get($catalogId)?->first();
            $requestedPrice = $requestedRow['unit_price_cents'] ?? null;
            $unitPrice = $this->catalogUnitPrice($catalog, $requestedPrice);
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
                'unit_price_cents' => $unitPrice,
                'subtotal_cents' => $quantity * $unitPrice,
                'warranty_snapshot' => $warranty,
            ];
        })->values()->all();
    }

    /** @return array<int, array<string, mixed>> */
    public function resolveFinalItemPrices(array $items): array
    {
        $catalogs = DB::table('service_catalog')
            ->whereIn('id', collect($items)->pluck('catalog_id')->filter())
            ->get()
            ->keyBy('id');

        return collect($items)->map(function (array $item) use ($catalogs) {
            if (! isset($item['catalog_id'])) {
                return $item;
            }
            $catalog = $catalogs->get((int) $item['catalog_id']);
            if ($catalog && $catalog->category !== 'product' && (bool) ($catalog->free_price ?? false)) {
                $item['unit_price_cents'] = $this->catalogUnitPrice($catalog, $item['unit_price_cents'] ?? null);
            }

            return $item;
        })->all();
    }

    /**
     * Apply the product delta selected in the finalization while its transaction is open.
     * Services and free-text items do not participate in stock control.
     */
    public function applyFinalOrderProducts(ServiceOrder $order, array $finalItems, int $userId): void
    {
        $productIds = DB::table('service_catalog')
            ->where('category', 'product')
            ->whereIn('id', collect($finalItems)->pluck('catalog_id')->filter())
            ->pluck('id')
            ->map(fn ($id) => (int) $id);
        $products = collect($finalItems)
            ->filter(fn ($item) => isset($item['catalog_id']) && $productIds->contains((int) $item['catalog_id']))
            ->values()
            ->all();

        $this->syncActiveOrderItems(
            $order,
            $products,
            $userId,
            'Ajuste automático dos produtos na finalização da OS '.$order->number,
        );
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

    private function record(int $productId, ?int $orderId, int $userId, string $type, int $quantity, int $balance, string $reason): int
    {
        return DB::table('stock_movements')->insertGetId([
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

    private function catalogUnitPrice(object $catalog, mixed $requestedPrice): int
    {
        if ($catalog->category !== 'product' && (bool) ($catalog->free_price ?? false)) {
            $price = (int) $requestedPrice;
            if ($price <= 0) {
                throw ValidationException::withMessages([
                    'items' => "Informe um valor maior que zero para {$catalog->name}.",
                ]);
            }

            return $price;
        }

        return (int) $catalog->price_cents;
    }
}
