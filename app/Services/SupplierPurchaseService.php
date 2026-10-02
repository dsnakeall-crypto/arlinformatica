<?php

namespace App\Services;

use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SupplierPurchaseService
{
    public function __construct(private InventoryService $inventory, private Audit $audit) {}

    public function create(Supplier $supplier, array $data, Request $request): object
    {
        return DB::transaction(function () use ($supplier, $data, $request) {
            // Serialize same-supplier purchase creation and reject conflicting retries.
            $supplier = Supplier::whereKey($supplier->id)->lockForUpdate()->firstOrFail();
            $hash = hash('sha256', json_encode($data));
            $previous = DB::table('supplier_purchases')->where('request_key', $data['request_key'])->first();
            if ($previous) {
                abort_unless((int) $previous->supplier_id === $supplier->id && hash_equals($previous->payload_hash, $hash), 409, 'Esta solicitação já registrou outra compra. Confira o histórico antes de tentar novamente.');

                return $previous;
            }
            abort_unless($supplier->active, 422, 'Reative o fornecedor antes de registrar uma nova compra.');
            $catalogs = DB::table('service_catalog')->whereIn('id', array_column($data['items'], 'product_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $total = 0;
            $rows = [];
            foreach ($data['items'] as $item) {
                $product = $catalogs->get($item['product_id']);
                if (! $product || ! $product->active || $product->category !== 'product') {
                    throw ValidationException::withMessages(['items' => 'Selecione apenas produtos ativos do catálogo.']);
                }
                $subtotal = $item['quantity'] * $item['unit_cost_cents'];
                $total += $subtotal;
                $rows[] = ['product_id' => $product->id, 'description' => $product->name, 'quantity' => $item['quantity'], 'unit_cost_cents' => $item['unit_cost_cents'], 'subtotal_cents' => $subtotal, 'created_at' => now(), 'updated_at' => now()];
            }
            abort_if($total > 999999999999, 422, 'O total da compra ultrapassa o limite permitido.');
            $id = DB::table('supplier_purchases')->insertGetId(['supplier_id' => $supplier->id, 'user_id' => $request->user()->id, 'request_key' => $data['request_key'], 'payload_hash' => $hash, 'supplier_snapshot' => $supplier->toJson(), 'purchased_on' => $data['purchased_on'], 'expected_on' => $data['expected_on'] ?? null, 'reference' => $data['reference'] ?? null, 'notes' => $data['notes'] ?? null, 'total_cents' => $total, 'status' => 'pending', 'created_at' => now(), 'updated_at' => now()]);
            foreach ($rows as $row) {
                DB::table('supplier_purchase_items')->insert($row + ['purchase_id' => $id]);
            }
            app(SupplierPayables::class)->create($id, $total, $data, $request);
            $this->audit->record($request, 'supplier.purchase_created', 'supplier_purchases', $id, null, ['supplier_id' => $supplier->id, 'total_cents' => $total]);
            if ($data['received_now'] ?? false) {
                $items = DB::table('supplier_purchase_items')->where('purchase_id', $id)->get()->map(fn ($item) => ['item_id' => $item->id, 'quantity' => $item->quantity])->all();
                $this->receive($id, ['request_key' => $data['request_key'], 'received_on' => $data['purchased_on'], 'items' => $items], $request);
            }

            return DB::table('supplier_purchases')->find($id);
        }, 3);
    }

    public function receive(int $id, array $data, Request $request): object
    {
        return DB::transaction(function () use ($id, $data, $request) {
            $purchase = DB::table('supplier_purchases')->where('id', $id)->lockForUpdate()->first();
            abort_unless($purchase, 404);
            $hash = hash('sha256', json_encode($data));
            $previous = DB::table('supplier_purchase_receipts')->where('purchase_id', $id)->where('request_key', $data['request_key'])->first();
            if ($previous) {
                abort_unless(hash_equals($previous->payload_hash, $hash), 409, 'Esta confirmação já registrou outro recebimento. Confira o histórico.');

                return $previous;
            }
            abort_unless(in_array($purchase->status, ['pending', 'partially_received'], true), 409, 'Esta compra não possui recebimento pendente.');
            if ($data['received_on'] < $purchase->purchased_on) {
                throw ValidationException::withMessages(['received_on' => 'O recebimento não pode ser anterior à compra.']);
            }
            $items = DB::table('supplier_purchase_items')->where('purchase_id', $id)->orderBy('product_id')->get()->keyBy('id');
            $requested = collect($data['items'])->keyBy('item_id');
            $rows = [];
            foreach ($items as $item) {
                if (! $requested->has($item->id)) {
                    continue;
                }
                $qty = $requested[$item->id]['quantity'];
                if ($qty > $item->quantity - $item->received_quantity) {
                    throw ValidationException::withMessages(['items' => 'A quantidade recebida ultrapassa o saldo pendente de '.$item->description.'.']);
                }
                $rows[] = ['item_id' => $item->id, 'product_id' => $item->product_id, 'description' => $item->description, 'quantity' => $qty, 'unit_cost_cents' => $item->unit_cost_cents];
            }
            if (count($rows) !== $requested->count()) {
                throw ValidationException::withMessages(['items' => 'Um dos itens não pertence a esta compra.']);
            }
            $receiptId = DB::table('supplier_purchase_receipts')->insertGetId(['purchase_id' => $id, 'user_id' => $request->user()->id, 'request_key' => $data['request_key'], 'payload_hash' => $hash, 'received_on' => $data['received_on'], 'items' => json_encode($rows), 'notes' => $data['notes'] ?? null, 'created_at' => now(), 'updated_at' => now()]);
            foreach ($rows as $row) {
                $this->inventory->addStock($row['product_id'], $row['quantity'], 'Recebimento da compra #'.str_pad((string) $id, 6, '0', STR_PAD_LEFT), $request->user()->id, ['origin' => 'purchase', 'unit_cost_cents' => $row['unit_cost_cents'], 'supplier_id' => $purchase->supplier_id, 'supplier_snapshot' => $purchase->supplier_snapshot, 'purchase_item_id' => $row['item_id'], 'receipt_id' => $receiptId]);
                DB::table('supplier_purchase_items')->where('id', $row['item_id'])->increment('received_quantity', $row['quantity'], ['updated_at' => now()]);
            }
            $pending = DB::table('supplier_purchase_items')->where('purchase_id', $id)->whereColumn('received_quantity', '<', 'quantity')->exists();
            DB::table('supplier_purchases')->where('id', $id)->update(['status' => $pending ? 'partially_received' : 'received', 'updated_at' => now()]);
            $this->audit->record($request, 'supplier.purchase_received', 'supplier_purchases', $id, null, ['receipt_id' => $receiptId, 'items' => $rows]);

            return DB::table('supplier_purchase_receipts')->find($receiptId);
        }, 3);
    }

    public function cancel(int $id, string $reason, Request $request): void
    {
        DB::transaction(function () use ($id, $reason, $request) {
            $purchase = DB::table('supplier_purchases')->where('id', $id)->lockForUpdate()->first();
            abort_unless($purchase, 404);
            abort_unless(in_array($purchase->status, ['pending', 'partially_received'], true), 409, 'Esta compra não pode ser cancelada.');
            DB::table('supplier_purchases')->where('id', $id)->update(['status' => 'cancelled', 'cancellation_reason' => $reason, 'cancelled_at' => now(), 'updated_at' => now()]);
            $this->audit->record($request, 'supplier.purchase_cancelled', 'supplier_purchases', $id, $purchase, ['reason' => $reason]);
        });
    }
}
