<?php

namespace App\Http\Controllers;

use App\Models\Supplier;
use App\Services\Audit;
use App\Services\DocumentValidator;
use App\Services\SupplierDocument;
use App\Services\SupplierPayables;
use App\Services\SupplierPurchaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;

class SupplierController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        app(SupplierPayables::class)->remind();
        $query = Supplier::query();
        $search = trim((string) $request->query('q', ''));
        if ($search !== '') {
            $query->where(fn ($q) => $q->where('name', 'like', '%'.$search.'%')->orWhere('trade_name', 'like', '%'.$search.'%')->orWhere('document', 'like', '%'.(SupplierDocument::normalize($search) ?: $search).'%')->orWhere('contact_name', 'like', '%'.$search.'%'));
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
        $purchases = DB::table('supplier_purchases')->select('supplier_purchases.*')->addSelect([
            'open_amount_cents' => DB::table('supplier_payables')->selectRaw('COALESCE(SUM(amount_cents), 0)')->whereColumn('purchase_id', 'supplier_purchases.id')->whereNull('paid_on')->whereNull('voided_at'),
            'paid_amount_cents' => DB::table('supplier_payables')->selectRaw('COALESCE(SUM(amount_cents), 0)')->whereColumn('purchase_id', 'supplier_purchases.id')->whereNotNull('paid_on'),
            'payable_count' => DB::table('supplier_payables')->selectRaw('COUNT(*)')->whereColumn('purchase_id', 'supplier_purchases.id'),
            'next_due_on' => DB::table('supplier_payables')->selectRaw('MIN(due_on)')->whereColumn('purchase_id', 'supplier_purchases.id')->whereNull('paid_on')->whereNull('voided_at'),
        ])->where('supplier_id', $supplier->id)->orderByDesc('id')->paginate(15, ['*'], 'page', $request->integer('page', 1));
        foreach ($purchases->items() as $purchase) {
            $purchase->open_amount_cents = (int) $purchase->open_amount_cents;
            $purchase->paid_amount_cents = (int) $purchase->paid_amount_cents;
            $purchase->payable_count = (int) $purchase->payable_count;
        }
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
        $data = $request->validate(['request_key' => 'required|uuid', 'purchased_on' => 'required|date_format:Y-m-d|before_or_equal:today', 'expected_on' => 'nullable|date_format:Y-m-d|after_or_equal:purchased_on', 'reference' => 'nullable|string|max:100', 'notes' => 'nullable|string|max:5000', 'received_now' => 'boolean', 'payment_terms' => 'sometimes|in:cash,deferred,installments,duplicata', 'payment_method' => 'required_with:payment_terms|in:'.implode(',', SupplierPayables::METHODS), 'installments' => 'required_with:payment_terms|array|min:1|max:60', 'installments.*' => 'array:amount_cents,due_on,paid_on', 'installments.*.amount_cents' => 'required|integer|min:0|max:999999999999', 'installments.*.due_on' => 'required|date_format:Y-m-d', 'installments.*.paid_on' => 'nullable|date_format:Y-m-d|before_or_equal:today', 'items' => 'required|array|min:1|max:100', 'items.*' => 'array:product_id,quantity,unit_cost_cents', 'items.*.product_id' => 'required|integer|distinct', 'items.*.quantity' => 'required|integer|min:1|max:999999', 'items.*.unit_cost_cents' => 'required|integer|min:0|max:999999999']);

        return response()->json($service->create($supplier, $data, $request), 201);
    }

    public function purchase(int $id): JsonResponse
    {
        $purchase = DB::table('supplier_purchases')->find($id);
        abort_unless($purchase, 404);
        $purchase->supplier_snapshot = json_decode($purchase->supplier_snapshot, true);
        $purchase->installments = DB::table('supplier_payables')->where('purchase_id', $id)->orderBy('installment')->get();
        $purchase->invoices = DB::table('supplier_invoices')->where('purchase_id', $id)->orderByDesc('id')->get(['id', 'original_name', 'mime', 'bytes', 'created_at']);
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

    public function lookupDocument(Request $request): JsonResponse
    {
        $data = $request->validate(['document' => 'required|string|max:18']);
        $document = SupplierDocument::normalize($data['document']);
        abort_unless(SupplierDocument::valid($document), 422, 'Documento com dígitos inválidos.');
        if (strlen($document) === 11 || preg_match('/[A-Z]/', $document)) {
            return response()->json(['status' => 'manual', 'message' => 'Dígitos válidos. Consulte a Receita para confirmar a existência e a situação cadastral.']);
        }
        try {
            $result = Cache::remember('supplier-cnpj:'.$document, 3600, function () use ($document) {
                $response = Http::acceptJson()->connectTimeout(3)->timeout(8)->get('https://brasilapi.com.br/api/cnpj/v1/'.$document);
                if (! $response->successful()) {
                    throw new \RuntimeException('Consulta pública indisponível ou documento não encontrado.');
                }
                $body = $response->json();
                if (! is_array($body) || (string) ($body['cnpj'] ?? '') !== $document || empty($body['razao_social'])) {
                    throw new \RuntimeException('Resposta inválida.');
                }

                return ['status' => 'found', 'name' => $body['razao_social'], 'trade_name' => $body['nome_fantasia'] ?? null, 'registration_status' => $body['descricao_situacao_cadastral'] ?? 'Não informada', 'source' => 'BrasilAPI — base pública de CNPJ', 'message' => 'Cadastro localizado na base pública. Confira a situação atual na Receita Federal.'];
            });

            return response()->json($result);
        } catch (\Throwable) {
            return response()->json(['status' => 'unavailable', 'message' => 'Não foi possível confirmar o cadastro na base pública. Consulte a Receita; os dígitos válidos não comprovam existência.']);
        }
    }

    public function pay(Request $request, int $id, SupplierPayables $service): JsonResponse
    {
        $data = $request->validate(['paid_on' => 'required|date_format:Y-m-d|before_or_equal:today', 'paid_method' => 'required|in:'.implode(',', SupplierPayables::METHODS), 'payment_reference' => 'nullable|string|max:255']);

        return response()->json($service->pay($id, $data, $request));
    }

    public function voidPayable(Request $request, int $id, SupplierPayables $service): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|min:3|max:500']);
        $service->void($id, $data['reason'], $request);

        return response()->json(['ok' => true]);
    }

    private function validated(Request $request, ?int $id = null): array
    {
        $request->validate([
            'document' => ['required', 'string', 'max:18', 'regex:/^[a-zA-Z0-9.\/\s-]+$/'],
            'postal_code' => ['required', 'string', 'regex:/^\d{5}-?\d{3}$/'],
            'state' => 'required|string|max:2',
        ]);
        $data = $request->all();
        foreach (['name', 'trade_name', 'contact_name', 'phone', 'email', 'street', 'number', 'district', 'city', 'state', 'complement', 'notes'] as $key) {
            if (isset($data[$key]) && is_string($data[$key])) {
                $data[$key] = trim($data[$key]);
            }
        }
        if (array_key_exists('document', $data)) {
            $data['document'] = trim((string) $data['document']) === '' ? null : SupplierDocument::normalize((string) $data['document']);
        }
        if (isset($data['postal_code'])) {
            $data['postal_code'] = DocumentValidator::normalize((string) $data['postal_code']) ?: null;
        }
        if (isset($data['state'])) {
            $data['state'] = strtoupper($data['state']) ?: null;
        }

        foreach (['phone', 'whatsapp', 'landline'] as $key) {
            if (isset($data[$key]) && is_string($data[$key])) {
                $data[$key] = preg_replace('/[()\s.-]/', '', $data[$key]);
            }
        }

        return validator($data, ['name' => 'required|string|min:2|max:255', 'trade_name' => 'required|string|min:2|max:255', 'document' => ['required', 'string', 'max:14', Rule::unique('suppliers')->ignore($id), function ($attribute, $value, $fail) {
            if (! SupplierDocument::valid($value)) {
                $fail('Informe um CPF ou CNPJ válido.');
            }
        }], 'contact_name' => 'nullable|string|max:255', 'phone' => ['required', 'string', 'regex:/^[1-9][0-9]9[0-9]{8}$/'], 'whatsapp' => ['required', 'string', 'regex:/^[1-9][0-9]9[0-9]{8}$/'], 'landline' => ['nullable', 'string', 'regex:/^[1-9][0-9][2-5][0-9]{7}$/'], 'email' => 'nullable|email|max:255', 'postal_code' => 'required|digits:8', 'street' => 'required|string|max:255', 'number' => 'required|string|max:30', 'district' => 'required|string|max:255', 'city' => 'required|string|max:255', 'state' => 'required|in:AC,AL,AP,AM,BA,CE,DF,ES,GO,MA,MT,MS,MG,PA,PB,PR,PE,PI,RJ,RN,RS,RO,RR,SC,SP,SE,TO', 'complement' => 'nullable|string|max:255', 'notes' => 'nullable|string|max:5000', 'active' => 'sometimes|boolean'], ['required' => 'O campo :attribute é obrigatório.', 'regex' => 'Confira o formato de :attribute.', 'unique' => 'Este :attribute já está cadastrado.'], ['name' => 'razão social / nome completo', 'trade_name' => 'nome fantasia', 'document' => 'CPF/CNPJ', 'phone' => 'telefone celular', 'whatsapp' => 'WhatsApp', 'postal_code' => 'CEP', 'street' => 'rua / avenida', 'number' => 'número', 'district' => 'bairro', 'city' => 'cidade', 'state' => 'UF'])->validate();
    }
}
