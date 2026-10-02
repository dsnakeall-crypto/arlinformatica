<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Services\Audit;
use App\Services\DocumentValidator;
use App\Services\SupplierPurchaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SupplierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Supplier::query();
        $search = trim((string) $request->query('q', ''));
        if ($search !== '') {
            $query->where(fn ($q) => $q->where('name', 'like', '%'.$search.'%')->orWhere('trade_name', 'like', '%'.$search.'%')->orWhere('document', 'like', '%'.(DocumentValidator::normalize($search) ?: $search).'%')->orWhere('contact_name', 'like', '%'.$search.'%'));
        }
        if (in_array($request->query('status'), ['active', 'inactive'], true)) {
            $query->where('active', $request->query('status') === 'active');
        }
        $query->addSelect(['purchase_count' => DB::table('supplier_purchases')->selectRaw('COUNT(*)')->whereColumn('supplier_id', 'suppliers.id'), 'last_purchase_on' => DB::table('supplier_purchases')->selectRaw('MAX(purchased_on)')->whereColumn('supplier_id', 'suppliers.id')]);
        $result = $query->orderBy('name')->orderBy('id')->paginate(min(100, max(1, $request->integer('per_page', 20))))->toArray();
        $result['summary'] = ['total' => Supplier::count(), 'active' => Supplier::where('active', true)->count(), 'pending_purchases' => DB::table('supplier_purchases')->whereIn('status', ['pending', 'partially_received'])->count(), 'received_value_cents' => (int) DB::table('supplier_purchase_items')->selectRaw('COALESCE(SUM(received_quantity * unit_cost_cents),0) as total')->value('total')];

        return response()->json($result);
    }

    public function show(Request $request, Supplier $supplier): JsonResponse
    {
        $purchases = DB::table('supplier_purchases')->where('supplier_id', $supplier->id)->orderByDesc('id')->paginate(15, ['*'], 'page', $request->integer('page', 1));
        $products = DB::table('supplier_purchase_items as items')->join('supplier_purchases as purchases', 'purchases.id', '=', 'items.purchase_id')->join('service_catalog as products', 'products.id', '=', 'items.product_id')->where('purchases.supplier_id', $supplier->id)->select('items.product_id', 'products.name', 'products.stock_quantity')->selectRaw('SUM(items.received_quantity) as received_quantity, SUM(items.received_quantity * items.unit_cost_cents) as received_value_cents')->groupBy('items.product_id', 'products.name', 'products.stock_quantity')->orderBy('products.name')->get();
        $products->each(function ($product) {
            $product->received_quantity = (int) $product->received_quantity;
            $product->received_value_cents = (int) $product->received_value_cents;
        });

        return response()->json(['supplier' => $supplier, 'purchases' => $purchases, 'products' => $products]);
    }

    public function store(Request $request, Audit $audit): JsonResponse
    {
        return DB::transaction(function () use ($request, $audit) {
            $supplier = Supplier::create($this->validated($request));
            $audit->record($request, 'supplier.created', 'suppliers', $supplier->id, null, $supplier);

            return response()->json($supplier, 201);
        });
    }

    public function update(Request $request, Supplier $supplier, Audit $audit): JsonResponse
    {
        return DB::transaction(function () use ($request, $supplier, $audit) {
            $before = $supplier->toArray();
            $supplier->update($this->validated($request, $supplier->id));
            $audit->record($request, 'supplier.updated', 'suppliers', $supplier->id, $before, $supplier);

            return response()->json($supplier->fresh());
        });
    }

    public function storePurchase(Request $request, Supplier $supplier, SupplierPurchaseService $service): JsonResponse
    {
        $data = $request->validate(['request_key' => 'required|uuid', 'purchased_on' => 'required|date_format:Y-m-d|before_or_equal:today', 'expected_on' => 'nullable|date_format:Y-m-d|after_or_equal:purchased_on', 'reference' => 'nullable|string|max:100', 'notes' => 'nullable|string|max:5000', 'received_now' => 'boolean', 'items' => 'required|array|min:1|max:100', 'items.*' => 'array:product_id,quantity,unit_cost_cents', 'items.*.product_id' => 'required|integer|distinct', 'items.*.quantity' => 'required|integer|min:1|max:999999', 'items.*.unit_cost_cents' => 'required|integer|min:0|max:999999999']);

        return response()->json($service->create($supplier, $data, $request), 201);
    }

    public function purchase(int $id): JsonResponse
    {
        $purchase = DB::table('supplier_purchases')->find($id);
        abort_unless($purchase, 404);
        $purchase->supplier_snapshot = json_decode($purchase->supplier_snapshot, true);
        $purchase->items = DB::table('supplier_purchase_items')->where('purchase_id', $id)->orderBy('id')->get();
        $purchase->receipts = DB::table('supplier_purchase_receipts')->leftJoin('users', 'users.id', '=', 'supplier_purchase_receipts.user_id')->where('purchase_id', $id)->orderByDesc('supplier_purchase_receipts.id')->get(['supplier_purchase_receipts.*', 'users.name as user_name'])->map(function ($receipt) {
            $receipt->items = json_decode($receipt->items, true);

            return $receipt;
        });

        return response()->json($purchase);
    }

    public function receive(Request $request, int $id, SupplierPurchaseService $service): JsonResponse
    {
        $data = $request->validate(['request_key' => 'required|uuid', 'received_on' => 'required|date_format:Y-m-d|before_or_equal:today', 'notes' => 'nullable|string|max:500', 'items' => 'required|array|min:1|max:100', 'items.*' => 'array:item_id,quantity', 'items.*.item_id' => 'required|integer|distinct', 'items.*.quantity' => 'required|integer|min:1|max:999999']);

        return response()->json($service->receive($id, $data, $request), 201);
    }

    public function cancel(Request $request, int $id, SupplierPurchaseService $service): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|min:3|max:500']);
        $service->cancel($id, trim($data['reason']), $request);

        return response()->json(['message' => 'Saldo pendente cancelado. Recebimentos anteriores foram preservados.']);
    }

    private function validated(Request $request, ?int $id = null): array
    {
        $request->validate([
            'document' => ['nullable', 'string', 'max:18', 'regex:/^[0-9.\/\s-]+$/'],
            'postal_code' => ['nullable', 'string', 'regex:/^\d{5}-?\d{3}$/'],
            'state' => 'nullable|string|max:2',
        ]);
        $data = $request->all();
        foreach (['name', 'trade_name', 'contact_name', 'phone', 'email', 'street', 'number', 'district', 'city', 'state', 'complement', 'notes'] as $key) {
            if (isset($data[$key]) && is_string($data[$key])) {
                $data[$key] = trim($data[$key]);
            }
        }
        if (array_key_exists('document', $data)) {
            $data['document'] = trim((string) $data['document']) === '' ? null : DocumentValidator::normalize((string) $data['document']);
        }
        if (isset($data['postal_code'])) {
            $data['postal_code'] = DocumentValidator::normalize((string) $data['postal_code']) ?: null;
        }
        if (isset($data['state'])) {
            $data['state'] = strtoupper($data['state']) ?: null;
        }

        return validator($data, ['name' => 'required|string|min:2|max:255', 'trade_name' => 'nullable|string|max:255', 'document' => ['nullable', 'string', 'max:14', Rule::unique('suppliers')->ignore($id), function ($attribute, $value, $fail) {
            if (! DocumentValidator::valid($value)) {
                $fail('Informe um CPF ou CNPJ válido.');
            }
        }], 'contact_name' => 'nullable|string|max:255', 'phone' => ['nullable', 'string', 'max:30', 'regex:/^[+()\d\s.-]+$/'], 'email' => 'nullable|email|max:255', 'postal_code' => 'nullable|digits:8', 'street' => 'nullable|string|max:255', 'number' => 'nullable|string|max:30', 'district' => 'nullable|string|max:255', 'city' => 'nullable|string|max:255', 'state' => 'nullable|in:AC,AL,AP,AM,BA,CE,DF,ES,GO,MA,MT,MS,MG,PA,PB,PR,PE,PI,RJ,RN,RS,RO,RR,SC,SP,SE,TO', 'complement' => 'nullable|string|max:255', 'notes' => 'nullable|string|max:5000', 'active' => 'sometimes|boolean'])->validate();
    }
}
