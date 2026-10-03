<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Services\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class SupplierWorkspaceController extends Controller
{
    public function show(Request $request, Supplier $supplier)
    {
        $data = $request->validate(['from' => 'nullable|date_format:Y-m-d', 'to' => ['nullable', 'date_format:Y-m-d', ...($request->filled('from') ? ['after_or_equal:from'] : [])]]);
        $purchases = DB::table('supplier_purchases')->where('supplier_id', $supplier->id);
        if (! empty($data['from'])) {
            $purchases->where('purchased_on', '>=', $data['from']);
        }
        if (! empty($data['to'])) {
            $purchases->where('purchased_on', '<=', $data['to']);
        }
        $payables = DB::table('supplier_payables as p')->joinSub((clone $purchases)->select('id'), 'buys', fn ($j) => $j->on('buys.id', '=', 'p.purchase_id'));
        $open = (clone $payables)->whereNull('paid_on')->whereNull('voided_at');
        $summary = ['purchases' => (clone $purchases)->count(), 'purchased_cents' => (int) (clone $purchases)->where('status', '!=', 'cancelled')->sum('total_cents'), 'paid_cents' => (int) (clone $payables)->whereNotNull('paid_on')->sum(DB::raw('amount_cents + interest_cents - discount_cents')), 'open_cents' => (int) (clone $open)->sum('amount_cents'), 'overdue_cents' => (int) (clone $open)->where('due_on', '<', today())->sum('amount_cents')];
        $lastCost = DB::table('supplier_purchase_items as i')->join('supplier_purchases as p', 'p.id', '=', 'i.purchase_id')->where('p.supplier_id', $supplier->id)->whereColumn('i.product_id', 'o.product_id')->where('i.received_quantity', '>', 0)->orderByDesc('p.purchased_on')->orderByDesc('i.id')->limit(1)->select('i.unit_cost_cents');
        $offerings = DB::table('supplier_offerings as o')->join('service_catalog as p', 'p.id', '=', 'o.product_id')->where('o.supplier_id', $supplier->id)->select('o.*', 'p.name', 'p.stock_quantity')->addSelect(['last_cost_cents' => $lastCost])->orderBy('p.name')->get();
        $priceHistory = DB::table('supplier_purchase_items as i')->joinSub((clone $purchases)->select('id', 'purchased_on'), 'buys', fn ($j) => $j->on('buys.id', '=', 'i.purchase_id'))->orderByDesc('buys.purchased_on')->orderByDesc('i.id')->select('i.id', 'i.product_id', 'i.description', 'i.quantity', 'i.unit_cost_cents', 'i.received_quantity', 'i.lot', 'buys.purchased_on')->paginate(25, ['*'], 'prices_page');
        $returns = DB::table('supplier_returns')->where('supplier_id', $supplier->id);
        $returned = DB::table('supplier_returns')->select('purchase_item_id')->selectRaw('SUM(quantity) as quantity')->groupBy('purchase_item_id');
        $returnItems = DB::table('supplier_purchase_items as i')->join('supplier_purchases as p', 'p.id', '=', 'i.purchase_id')->leftJoinSub($returned, 'r', fn ($j) => $j->on('r.purchase_item_id', '=', 'i.id'))->where('p.supplier_id', $supplier->id)->whereRaw('i.received_quantity > COALESCE(r.quantity, 0)')->select('i.*')->selectRaw('i.received_quantity - COALESCE(r.quantity, 0) as returnable_quantity')->orderByDesc('i.id')->get()->map(function ($row) {
            $row->returnable_quantity = (int) $row->returnable_quantity;

            return $row;
        });
        $occurrences = DB::table('supplier_occurrences')->where('supplier_id', $supplier->id);
        $ratings = (clone $occurrences)->selectRaw('AVG(delivery_rating) as delivery, AVG(quality_rating) as quality, AVG(price_rating) as price, AVG(service_rating) as service')->first();

        return response()->json([
            'profile' => $supplier->profile ?? [], 'summary' => $summary, 'offerings' => $offerings,
            'payables' => (clone $payables)->orderBy('p.due_on')->select('p.*')->paginate(25, ['*'], 'payments_page'),
            'late_purchases' => (clone $purchases)->whereIn('status', ['pending', 'partially_received'])->where('expected_on', '<', today())->orderBy('expected_on')->get(['id', 'reference', 'expected_on']),
            'documents' => DB::table('supplier_documents')->where('supplier_id', $supplier->id)->orderByDesc('id')->get(['id', 'category', 'original_name', 'bytes', 'purchase_id', 'created_at']),
            'returns' => (clone $returns)->orderByDesc('id')->paginate(25, ['*'], 'returns_page'),
            'credit_cents' => (int) (clone $returns)->where('resolution', 'credit')->sum('value_cents'),
            'refund_cents' => (int) (clone $returns)->where('resolution', 'refund')->sum('value_cents'),
            'return_items' => $returnItems,
            'occurrences' => (clone $occurrences)->orderByDesc('id')->paginate(25, ['*'], 'history_page'), 'ratings' => $ratings, 'prices' => $priceHistory,
            'most_purchased' => DB::table('supplier_purchase_items as i')->joinSub((clone $purchases)->where('status', '!=', 'cancelled')->select('id'), 'buys', fn ($j) => $j->on('buys.id', '=', 'i.purchase_id'))->select('i.product_id', 'i.description')->selectRaw('SUM(i.quantity) as quantity, SUM(i.subtotal_cents) as value_cents')->groupBy('i.product_id', 'i.description')->orderByDesc('quantity')->limit(10)->get()->map(function ($row) {
                $row->quantity = (int) $row->quantity;
                $row->value_cents = (int) $row->value_cents;

                return $row;
            }),
        ]);
    }

    public function profile(Request $request, Supplier $supplier, Audit $audit)
    {
        $strings = ['state_registration', 'municipal_registration', 'representative', 'representative_contact', 'bank', 'agency', 'account', 'pix_key'];
        $rules = ['profile' => 'required|array:'.implode(',', [...$strings, 'site', 'person_type', 'account_type', 'pix_type', 'payment_method', 'payment_days', 'discount_percent', 'minimum_order_cents', 'delivery_days', 'freight', 'commercial_notes'])];
        foreach ($strings as $field) {
            $rules['profile.'.$field] = 'nullable|string|max:150';
        }
        $rules += ['profile.site' => 'nullable|url:http,https|max:500', 'profile.person_type' => 'nullable|in:physical,legal', 'profile.account_type' => 'nullable|in:checking,savings,payment', 'profile.pix_type' => 'nullable|in:cpf,cnpj,email,phone,random', 'profile.payment_method' => 'nullable|in:pix,cash,bank_transfer,boleto,debit_card,credit_card,cheque,other', 'profile.payment_days' => 'nullable|integer|min:0|max:365', 'profile.discount_percent' => 'nullable|numeric|min:0|max:100', 'profile.minimum_order_cents' => 'nullable|integer|min:0|max:999999999', 'profile.delivery_days' => 'nullable|integer|min:0|max:365', 'profile.freight' => 'nullable|in:supplier,buyer,negotiated', 'profile.commercial_notes' => 'nullable|string|max:3000'];
        $data = $request->validate($rules);
        DB::transaction(function () use ($supplier, $data, $request, $audit) {
            $locked = Supplier::whereKey($supplier->id)->lockForUpdate()->firstOrFail();
            $before = $locked->profile;
            $locked->update(['profile' => $data['profile']]);
            $audit->record($request, 'supplier.profile_updated', 'suppliers', $supplier->id, $before, $data['profile']);
        });

        return response()->json(['ok' => true]);
    }

    public function offering(Request $request, Supplier $supplier, Audit $audit)
    {
        $data = $request->validate(['product_id' => ['required', 'integer', Rule::exists('service_catalog', 'id')->where('category', 'product')], 'supplier_code' => 'nullable|string|max:80', 'brand' => 'nullable|string|max:100', 'cost_cents' => 'nullable|integer|min:0|max:999999999', 'minimum_quantity' => 'required|integer|min:1|max:999999', 'delivery_days' => 'nullable|integer|min:0|max:365', 'active' => 'required|boolean']);
        DB::transaction(function () use ($supplier, $data, $request, $audit) {
            Supplier::whereKey($supplier->id)->lockForUpdate()->firstOrFail();
            $previous = DB::table('supplier_offerings')->where('supplier_id', $supplier->id)->where('product_id', $data['product_id'])->first();
            DB::table('supplier_offerings')->updateOrInsert(['supplier_id' => $supplier->id, 'product_id' => $data['product_id']], [...$data, 'created_at' => $previous?->created_at ?? now(), 'updated_at' => now()]);
            $audit->record($request, 'supplier.offering_saved', 'suppliers', $supplier->id, $previous, $data);
        });

        return response()->json(['ok' => true]);
    }

    public function occurrence(Request $request, Supplier $supplier, Audit $audit)
    {
        $rules = ['occurred_on' => 'required|date_format:Y-m-d|before_or_equal:today', 'category' => 'required|in:delivery,quality,price,service,other', 'description' => 'required|string|min:3|max:1000'];
        foreach (['delivery', 'quality', 'price', 'service'] as $rating) {
            $rules[$rating.'_rating'] = 'nullable|integer|min:1|max:5';
        }
        $data = $request->validate($rules);
        DB::transaction(function () use ($data, $supplier, $request, $audit) {
            $id = DB::table('supplier_occurrences')->insertGetId([...$data, 'supplier_id' => $supplier->id, 'user_id' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            $audit->record($request, 'supplier.occurrence_registered', 'supplier_occurrences', $id, null, $data);
        });

        return response()->json(['ok' => true], 201);
    }

    public function returnGoods(Request $request, Supplier $supplier, Audit $audit)
    {
        $data = $request->validate(['request_key' => 'required|uuid', 'purchase_item_id' => 'required|integer', 'quantity' => 'required|integer|min:1|max:999999', 'value_cents' => 'required|integer|min:0|max:999999999', 'returned_on' => 'required|date_format:Y-m-d|before_or_equal:today', 'reason' => 'required|string|min:3|max:500', 'resolution' => 'required|in:credit,refund,exchange,pending']);

        return DB::transaction(function () use ($supplier, $data, $request, $audit) {
            Supplier::whereKey($supplier->id)->lockForUpdate()->firstOrFail();
            $hash = hash('sha256', json_encode($data));
            $old = DB::table('supplier_returns')->where('request_key', $data['request_key'])->first();
            if ($old) {
                abort_unless((int) $old->supplier_id === $supplier->id && hash_equals($old->payload_hash, $hash), 409, 'Solicitação já utilizada para outra devolução.');

                return response()->json(['id' => $old->id, 'replayed' => true], 201);
            }
            $item = DB::table('supplier_purchase_items as i')->join('supplier_purchases as p', 'p.id', '=', 'i.purchase_id')->where('i.id', $data['purchase_item_id'])->where('p.supplier_id', $supplier->id)->select('i.*', 'p.purchased_on')->lockForUpdate()->first();
            abort_unless($item, 422, 'O item não pertence ao fornecedor.');
            $returned = (int) DB::table('supplier_returns')->where('purchase_item_id', $item->id)->sum('quantity');
            abort_if($data['quantity'] > $item->received_quantity - $returned, 422, 'Quantidade superior ao saldo recebido não devolvido.');
            abort_if($data['returned_on'] < $item->purchased_on, 422, 'Devolução anterior à compra.');
            $product = DB::table('service_catalog')->where('id', $item->product_id)->lockForUpdate()->first();
            abort_if(! $product || $product->stock_quantity < $data['quantity'], 422, 'Estoque insuficiente para a devolução.');
            $balance = $product->stock_quantity - $data['quantity'];
            DB::table('service_catalog')->where('id', $product->id)->update(['stock_quantity' => $balance, 'updated_at' => now()]);
            $movement = DB::table('stock_movements')->insertGetId(['product_id' => $product->id, 'service_order_id' => null, 'user_id' => $request->user()->id, 'type' => 'supplier_return', 'quantity' => $data['quantity'], 'balance_after' => $balance, 'reason' => 'Devolução ao fornecedor: '.$data['reason'], 'created_at' => now(), 'updated_at' => now()]);
            $id = DB::table('supplier_returns')->insertGetId([...$data, 'supplier_id' => $supplier->id, 'user_id' => $request->user()->id, 'stock_movement_id' => $movement, 'payload_hash' => $hash, 'description' => $item->description, 'created_at' => now(), 'updated_at' => now()]);
            $audit->record($request, 'supplier.goods_returned', 'supplier_returns', $id, null, $data);

            return response()->json(['id' => $id, 'replayed' => false], 201);
        }, 3);
    }

    public function document(Request $request, Supplier $supplier, Audit $audit)
    {
        $data = $request->validate(['request_key' => 'required|uuid', 'purchase_id' => 'nullable|integer', 'category' => 'required|in:invoice,boleto,receipt,contract,prices,other', 'file' => 'required|file|max:10240']);
        $file = $request->file('file');
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file->getRealPath());
        $bytes = file_get_contents($file->getRealPath());
        $pdf = $mime === 'application/pdf' && str_starts_with($bytes, '%PDF-');
        $image = in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true) && @getimagesize($file->getRealPath()) !== false;
        $xml = false;
        if (in_array($mime, ['text/xml', 'application/xml', 'text/plain'], true) && strtolower($file->getClientOriginalExtension()) === 'xml') {
            abort_if(preg_match('/<!DOCTYPE|<!ENTITY/i', $bytes), 422, 'XML com entidades externas não é permitido.');
            $previous = libxml_use_internal_errors(true);
            $doc = new \DOMDocument;
            $xml = $doc->loadXML($bytes, LIBXML_NONET);
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }
        abort_unless($pdf || $image || $xml, 422, 'Envie PDF, imagem ou XML válido.');
        $path = null;
        try {
            return DB::transaction(function () use ($data, $request, $supplier, $audit, $file, $mime, &$path) {
                Supplier::whereKey($supplier->id)->lockForUpdate()->firstOrFail();
                if ($data['purchase_id'] ?? null) {
                    abort_unless(DB::table('supplier_purchases')->where('id', $data['purchase_id'])->where('supplier_id', $supplier->id)->exists(), 422, 'Compra de outro fornecedor.');
                }
                $hash = hash_file('sha256', $file->getRealPath());
                $old = DB::table('supplier_documents')->where('request_key', $data['request_key'])->first();
                if ($old) {
                    abort_unless((int) $old->supplier_id === $supplier->id && $old->category === $data['category'] && (int) $old->purchase_id === (int) ($data['purchase_id'] ?? 0) && hash_equals($old->sha256, $hash), 409, 'Solicitação já utilizada para outro arquivo.');

                    return response()->json(['id' => $old->id], 201);
                }
                abort_if(DB::table('supplier_documents')->where('supplier_id', $supplier->id)->count() >= 200, 422, 'Limite de 200 documentos por fornecedor.');
                $path = $file->store('supplier-documents/'.$supplier->id, 'local');
                abort_unless($path, 500);
                $id = DB::table('supplier_documents')->insertGetId(['supplier_id' => $supplier->id, 'purchase_id' => $data['purchase_id'] ?? null, 'user_id' => $request->user()->id, 'request_key' => $data['request_key'], 'category' => $data['category'], 'path' => $path, 'original_name' => mb_substr(basename(str_replace('\\', '/', $file->getClientOriginalName())), 0, 240), 'mime' => $mime, 'bytes' => $file->getSize(), 'sha256' => $hash, 'created_at' => now(), 'updated_at' => now()]);
                $audit->record($request, 'supplier.document_attached', 'supplier_documents', $id, null, ['supplier_id' => $supplier->id, 'sha256' => $hash]);

                return response()->json(['id' => $id], 201);
            });
        } catch (\Throwable $e) {
            if ($path) {
                Storage::disk('local')->delete($path);
            } throw $e;
        }
    }

    public function download(int $id)
    {
        $row = DB::table('supplier_documents')->find($id);
        abort_unless($row && Storage::disk('local')->exists($row->path), 404);

        return Storage::disk('local')->download($row->path, $row->original_name, ['Content-Type' => $row->mime, 'X-Content-Type-Options' => 'nosniff']);
    }
}
