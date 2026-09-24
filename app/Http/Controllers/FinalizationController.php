<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Services\CompanySettings;
use App\Services\DocumentService;
use App\Services\InventoryService;
use App\Services\PdfPhotoOptimizer;
use App\Services\ReplacedFinalDocumentService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FinalizationController extends Controller
{
    public function store(Request $request, ServiceOrder $order, CompanySettings $settings, DocumentService $documents, InventoryService $inventory, PdfPhotoOptimizer $pdfPhotos, ReplacedFinalDocumentService $replacedDocuments): JsonResponse
    {
        abort_if($order->status === 'completed', 409, 'A OS já possui uma finalização imutável.');
        abort_if($order->status === 'interrupted', 409, 'Uma OS interrompida já está fechada e não pode ser finalizada nem reaberta.');
        $data = $request->validate([
            'technical_report' => 'nullable|string|max:20000', 'discount_cents' => 'required|integer|min:0|max:999999999',
            'approved_budget_id' => 'nullable|exists:budgets,id', 'photo_ids' => 'array', 'photo_ids.*' => 'integer',
            'show_item_warranties' => 'sometimes|boolean',
            'is_paid' => 'sometimes|boolean',
            'payment_method' => ['nullable', 'required_if:is_paid,true', Rule::in(['cash', 'pix', 'credit', 'debit'])],
        ]);
        $data['result'] = 'repair_completed';
        $data['result_other'] = null;

        if (! empty($data['approved_budget_id'])) {
            $approved = DB::table('budgets')->where(['id' => $data['approved_budget_id'], 'service_order_id' => $order->id, 'status' => 'approved'])->whereNull('deleted_at')->first();
            abort_unless($approved, 422, 'O orçamento informado não está aprovado para esta OS.');
            abort_if(DB::table('service_order_items')->where('source_budget_id', $approved->id)->exists(), 409, 'Os itens deste orçamento já foram usados.');
            $data['items'] = DB::table('budget_items')->where('budget_id', $approved->id)->orderBy('id')->get()->map(function ($item) {
                $warranty = $item->warranty_snapshot ? json_decode($item->warranty_snapshot, true) : null;

                return [
                    'catalog_id' => $item->catalog_id,
                    'description' => $item->description,
                    'quantity' => (int) $item->quantity,
                    'unit_price_cents' => (int) $item->unit_price_cents,
                    'warranty_enabled' => ! empty($warranty),
                    'warranty_term' => $warranty['term'] ?? null,
                    'warranty_unit' => $warranty['unit'] ?? null,
                    'warranty_description' => $warranty['description'] ?? null,
                ];
            })->all();
            abort_if(count($data['items']) > 100, 422, 'O orçamento aprovado excede o limite de 100 itens para finalização.');
        } else {
            $itemData = $request->validate([
                'items' => 'array|max:100', 'items.*.catalog_id' => 'nullable|exists:service_catalog,id', 'items.*.description' => 'required|string|max:255',
                'items.*.quantity' => 'required|integer|min:1|max:999', 'items.*.unit_price_cents' => 'required|integer|min:0|max:999999999',
                'items.*.warranty_enabled' => 'boolean', 'items.*.warranty_term' => 'nullable|required_if:items.*.warranty_enabled,true|integer|min:1|max:999',
                'items.*.warranty_unit' => 'nullable|required_if:items.*.warranty_enabled,true|in:days,months,years', 'items.*.warranty_description' => 'nullable|string|max:500',
            ]);
            $data['items'] = $itemData['items'] ?? [];
        }

        if (empty($data['items'])) {
            throw ValidationException::withMessages(['items' => 'Informe ao menos um serviço ou produto para um reparo realizado.']);
        }
        $subtotal = collect($data['items'])->sum(fn ($item) => (int) $item['quantity'] * (int) $item['unit_price_cents']);
        if ((int) $data['discount_cents'] > $subtotal) {
            throw ValidationException::withMessages(['discount_cents' => 'O desconto não pode superar o subtotal.']);
        }
        $total = max(0, $subtotal - (int) $data['discount_cents']);
        $resultLabel = 'Reparo realizado';
        $company = $settings->snapshot();
        $signaturePath = $company['technical_signature'] ?? null;
        $technicalSignature = $signaturePath && Storage::disk('local')->exists($signaturePath)
            ? ['mime' => 'image/png', 'data' => base64_encode(Storage::disk('local')->get($signaturePath))]
            : null;
        unset($company['technical_signature']);
        $order->load(['client', 'snapshot', 'checklists', 'photos']);
        $photos = $order->photos->whereIn('id', $data['photo_ids'] ?? [])->map(function ($photo) use ($pdfPhotos) {
            return ['id' => $photo->id, ...$pdfPhotos->fromStoredPhoto($photo)];
        })->values()->all();
        $showItemWarranties = (bool) ($data['show_item_warranties'] ?? false);
        $isPaid = (bool) ($data['is_paid'] ?? false);
        $paymentMethod = $data['payment_method'] ?? null;
        if ($isPaid && $total <= 0) {
            throw ValidationException::withMessages(['is_paid' => 'Não é possível registrar pagamento para uma OS com total zerado.']);
        }
        $snapshot = ['company' => $company, 'order' => $order->toArray(), 'result_label' => $resultLabel, 'photos' => $photos, 'technical_signature' => $technicalSignature, 'show_item_warranties' => $showItemWarranties, 'payment' => ['is_paid' => $isPaid, 'method' => $paymentMethod]];
        $finalization = DB::transaction(function () use ($data, $order, $request, $subtotal, $total, $snapshot, $isPaid, $paymentMethod, $inventory) {
            $locked = ServiceOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            abort_if(in_array($locked->status, ['completed', 'interrupted'], true), 409, 'A OS já foi fechada e não pode ser finalizada.');
            $inventory->applyFinalOrderProducts($locked, $data['items'], $request->user()->id);
            $previous = DB::table('service_order_finalizations')->where('service_order_id', $order->id)->orderByDesc('revision')->first();
            $revision = ((int) ($previous->revision ?? 0)) + 1;
            $id = DB::table('service_order_finalizations')->insertGetId(['service_order_id' => $order->id, 'revision' => $revision, 'result' => $data['result'], 'result_other' => $data['result_other'] ?? null, 'technical_report' => $data['technical_report'] ?? null, 'subtotal_cents' => $subtotal, 'discount_cents' => $data['discount_cents'], 'total_cents' => $total, 'snapshot' => json_encode($snapshot), 'completed_by' => $request->user()->id, 'completed_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
            DB::table('service_order_items')->where('service_order_id', $order->id)->whereNull('finalization_id')->delete();
            foreach ($data['items'] as $item) {
                $warranty = ! empty($item['warranty_enabled']) ? ['enabled' => true, 'term' => (int) $item['warranty_term'], 'unit' => $item['warranty_unit'], 'description' => $item['warranty_description'] ?? null] : null;
                DB::table('service_order_items')->insert(['service_order_id' => $order->id, 'finalization_id' => $id, 'catalog_id' => $item['catalog_id'] ?? null, 'source_budget_id' => $data['approved_budget_id'] ?? null, 'description' => $item['description'], 'quantity' => $item['quantity'], 'stock_applied_quantity' => 0, 'unit_price_cents' => $item['unit_price_cents'], 'subtotal_cents' => $item['quantity'] * $item['unit_price_cents'], 'warranty_snapshot' => $warranty ? json_encode($warranty) : null, 'created_at' => now(), 'updated_at' => now()]);
            }
            $before = $locked->status;
            $paidBeforeRefinalization = $this->paidCentsForOrder($locked);
            $hasPreviousPayments = DB::table('payments')->where('service_order_id', $locked->id)->exists();
            $settledByPreviousPayments = $hasPreviousPayments && $paidBeforeRefinalization >= $total;
            $locked->forceFill([
                'status' => 'completed',
                'completed_at' => now(),
                'result' => $data['result'],
                'technical_report' => $data['technical_report'] ?? null,
                'subtotal_cents' => $subtotal,
                'discount_cents' => $data['discount_cents'],
                'total_cents' => $total,
                'closing_reference_cents' => null,
                'closing_marked_by' => null,
                'closing_marked_at' => null,
                'archived' => $settledByPreviousPayments,
            ])->save();
            DB::table('status_history')->insert(['service_order_id' => $order->id, 'from_status' => $before, 'to_status' => 'completed', 'user_id' => $request->user()->id, 'created_at' => now()]);
            $paymentId = $isPaid ? $this->registerFinalizationPayment($request, $locked, $total, (string) $paymentMethod, $revision) : null;
            DB::table('audit_logs')->insert(['user_id' => $request->user()->id, 'action' => 'service_order.finalized', 'subject_type' => 'service_order', 'subject_id' => $order->id, 'before' => $previous ? json_encode(['revision' => $previous->revision, 'result' => $previous->result, 'total_cents' => $previous->total_cents]) : null, 'after' => json_encode(['finalization_id' => $id, 'revision' => $revision, 'result' => $data['result'], 'total_cents' => $total, 'previous_total_cents' => $previous ? (int) $previous->total_cents : null, 'paid_cents_before_refinalization' => $paidBeforeRefinalization, 'settled_by_previous_payments' => $settledByPreviousPayments, 'payment_id' => $paymentId, 'approved_budget_id' => $data['approved_budget_id'] ?? null]), 'ip_address' => $request->ip(), 'created_at' => now()]);

            return DB::table('service_order_finalizations')->find($id);
        });
        $items = DB::table('service_order_items')->where('finalization_id', $finalization->id)->get()->map(fn ($item) => (array) $item)->all();
        $documentOrder = $order->fresh()->load(['client', 'snapshot', 'checklists']);
        $documentOrderData = $documentOrder->toArray();
        $documentOrderData['intake_condition'] = $documentOrder->intake_condition;
        $documents->issue($documentOrder, 'final', ['company' => $company, 'order' => $documentOrderData, 'finalization' => (array) $finalization, 'items' => $items, 'result_label' => $resultLabel, 'photos' => $photos, 'technical_signature' => $technicalSignature, 'show_item_warranties' => $showItemWarranties], $request->user()->id, (int) $finalization->revision);
        if ((int) $finalization->revision > 1) {
            $replacedDocuments->replacePrevious($documentOrder, (int) $finalization->revision - 1, (int) $finalization->revision, $request->user()->id, $request->ip());
        }

        $freshOrder = $order->fresh();
        $orderPayload = $freshOrder->toArray();
        $paidCents = $this->paidCentsForOrder($freshOrder);
        $orderPayload['display_status'] = $freshOrder->status === 'completed'
            ? ($paidCents >= (int) $freshOrder->total_cents ? 'paid' : 'awaiting_payment')
            : $freshOrder->status;

        return response()->json(['order' => $orderPayload, 'finalization' => $finalization], 201);
    }

    private function registerFinalizationPayment(Request $request, ServiceOrder $order, int $total, string $method, int $revision): int
    {
        if (DB::table('payments')->where('service_order_id', $order->id)->exists()) {
            throw ValidationException::withMessages(['is_paid' => 'Esta OS já possui pagamento. Finalize sem esta opção e registre apenas o saldo restante em Pagamento.']);
        }

        $now = CarbonImmutable::now('UTC');
        $paymentId = DB::table('payments')->insertGetId([
            'service_order_id' => $order->id, 'amount_cents' => $total, 'method' => $method,
            'paid_at' => $now, 'user_id' => $request->user()->id,
            'idempotency_key' => "finalization-payment-{$order->id}-r{$revision}",
            'created_at' => $now, 'updated_at' => $now,
        ]);
        $transactionId = DB::table('financial_transactions')->insertGetId([
            'payment_id' => $paymentId, 'origin' => 'service_order', 'description' => "OS {$order->number}",
            'amount_cents' => $total, 'occurred_at' => $now, 'user_id' => $request->user()->id,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('audit_logs')->insert([
            'user_id' => $request->user()->id, 'action' => 'payment.created', 'subject_type' => 'payment', 'subject_id' => $paymentId,
            'after' => json_encode(['transaction_id' => $transactionId, 'amount_cents' => $total, 'method' => $method, 'order_total_cents' => $total, 'previous_paid_cents' => 0, 'balance_after_cents' => 0, 'source' => 'finalization']),
            'ip_address' => $request->ip(), 'created_at' => $now,
        ]);
        $order->forceFill(['archived' => true])->save();
        DB::table('status_history')->insert(['service_order_id' => $order->id, 'from_status' => 'completed', 'to_status' => 'paid', 'user_id' => $request->user()->id, 'created_at' => $now]);
        DB::table('audit_logs')->insert([
            'user_id' => $request->user()->id, 'action' => 'service_order.marked_paid_and_retrieved', 'subject_type' => 'service_order', 'subject_id' => $order->id,
            'after' => json_encode(['archived' => true, 'display_status' => 'paid', 'payment_id' => $paymentId, 'source' => 'finalization']),
            'ip_address' => $request->ip(), 'created_at' => $now,
        ]);

        return $paymentId;
    }

    private function paidCentsForOrder(ServiceOrder $order): int
    {
        $latest = DB::table('financial_adjustments')
            ->select('transaction_id', DB::raw('MAX(id) as adjustment_id'))
            ->groupBy('transaction_id');

        return (int) (DB::table('financial_transactions as ft')
            ->join('payments as p', 'p.id', '=', 'ft.payment_id')
            ->leftJoinSub($latest, 'latest_adjustment', 'latest_adjustment.transaction_id', '=', 'ft.id')
            ->leftJoin('financial_adjustments as adjustment', 'adjustment.id', '=', 'latest_adjustment.adjustment_id')
            ->where('p.service_order_id', $order->id)
            ->where('ft.origin', 'service_order')
            ->selectRaw('COALESCE(SUM(COALESCE(adjustment.new_cents, ft.amount_cents)), 0) as paid_cents')
            ->value('paid_cents') ?? 0);
    }

}
