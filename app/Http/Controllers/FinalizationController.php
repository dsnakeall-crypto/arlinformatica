<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Services\CompanySettings;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class FinalizationController extends Controller
{
    private const RESULTS = ['repair_completed', 'irreparable', 'client_cancelled', 'economically_unviable', 'no_fault', 'other'];

    public function store(Request $request, ServiceOrder $order, CompanySettings $settings, DocumentService $documents): JsonResponse
    {
        abort_if($order->status === 'completed', 409, 'A OS já possui uma finalização imutável.');
        abort_if($order->status === 'interrupted', 409, 'Uma OS interrompida deve voltar ao fluxo antes de ser finalizada.');
        $data = $request->validate([
            'result' => 'required|in:'.implode(',', self::RESULTS), 'result_other' => 'nullable|required_if:result,other|string|max:255',
            'technical_report' => 'nullable|string|max:20000', 'discount_cents' => 'required|integer|min:0|max:999999999',
            'approved_budget_id' => 'nullable|exists:budgets,id', 'photo_ids' => 'array', 'photo_ids.*' => 'integer',
        ]);

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

        if ($data['result'] !== 'repair_completed' && blank($data['technical_report'] ?? null)) {
            throw ValidationException::withMessages(['technical_report' => 'O laudo/motivo é obrigatório quando não houve reparo.']);
        }
        if ($data['result'] === 'repair_completed' && empty($data['items'])) {
            throw ValidationException::withMessages(['items' => 'Informe ao menos um serviço ou produto para um reparo realizado.']);
        }
        $subtotal = collect($data['items'])->sum(fn ($item) => (int) $item['quantity'] * (int) $item['unit_price_cents']);
        if ((int) $data['discount_cents'] > $subtotal) {
            throw ValidationException::withMessages(['discount_cents' => 'O desconto não pode superar o subtotal.']);
        }
        $total = max(0, $subtotal - (int) $data['discount_cents']);
        $resultLabel = $this->resultLabel($data['result'], $data['result_other'] ?? null);
        $company = $settings->snapshot();
        $order->load(['client', 'snapshot', 'checklists', 'photos']);
        $photos = $order->photos->whereIn('id', $data['photo_ids'] ?? [])->map(function ($photo) {
            return ['id' => $photo->id, 'mime' => $photo->mime, 'data' => base64_encode(Storage::disk($photo->disk)->get($photo->path))];
        })->values()->all();
        $snapshot = ['company' => $company, 'order' => $order->toArray(), 'result_label' => $resultLabel, 'photos' => $photos];
        $finalization = DB::transaction(function () use ($data, $order, $request, $subtotal, $total, $snapshot) {
            $locked = ServiceOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            abort_if($locked->status === 'completed', 409, 'A OS já foi finalizada novamente.');
            $previous = DB::table('service_order_finalizations')->where('service_order_id', $order->id)->orderByDesc('revision')->first();
            $revision = ((int) ($previous->revision ?? 0)) + 1;
            $id = DB::table('service_order_finalizations')->insertGetId(['service_order_id' => $order->id, 'revision' => $revision, 'result' => $data['result'], 'result_other' => $data['result_other'] ?? null, 'technical_report' => $data['technical_report'] ?? null, 'subtotal_cents' => $subtotal, 'discount_cents' => $data['discount_cents'], 'total_cents' => $total, 'snapshot' => json_encode($snapshot), 'completed_by' => $request->user()->id, 'completed_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
            DB::table('service_order_items')->where('service_order_id', $order->id)->whereNull('finalization_id')->delete();
            foreach ($data['items'] as $item) {
                $warranty = ! empty($item['warranty_enabled']) ? ['enabled' => true, 'term' => (int) $item['warranty_term'], 'unit' => $item['warranty_unit'], 'description' => $item['warranty_description'] ?? null] : null;
                DB::table('service_order_items')->insert(['service_order_id' => $order->id, 'finalization_id' => $id, 'catalog_id' => $item['catalog_id'] ?? null, 'source_budget_id' => $data['approved_budget_id'] ?? null, 'description' => $item['description'], 'quantity' => $item['quantity'], 'unit_price_cents' => $item['unit_price_cents'], 'subtotal_cents' => $item['quantity'] * $item['unit_price_cents'], 'warranty_snapshot' => $warranty ? json_encode($warranty) : null, 'created_at' => now(), 'updated_at' => now()]);
            }
            $before = $order->status;
            $order->update(['status' => 'completed', 'completed_at' => now(), 'result' => $data['result'], 'technical_report' => $data['technical_report'] ?? null, 'subtotal_cents' => $subtotal, 'discount_cents' => $data['discount_cents'], 'total_cents' => $total]);
            DB::table('status_history')->insert(['service_order_id' => $order->id, 'from_status' => $before, 'to_status' => 'completed', 'user_id' => $request->user()->id, 'created_at' => now()]);
            $financialAdjustment = $this->adjustPaidAmountAfterRefinalization($request, $order, $total, $previous);
            DB::table('audit_logs')->insert(['user_id' => $request->user()->id, 'action' => 'service_order.finalized', 'subject_type' => 'service_order', 'subject_id' => $order->id, 'before' => $previous ? json_encode(['revision' => $previous->revision, 'result' => $previous->result, 'total_cents' => $previous->total_cents]) : null, 'after' => json_encode(['finalization_id' => $id, 'revision' => $revision, 'result' => $data['result'], 'total_cents' => $total, 'previous_total_cents' => $previous ? (int) $previous->total_cents : null, 'financial_adjustment_id' => $financialAdjustment, 'approved_budget_id' => $data['approved_budget_id'] ?? null]), 'ip_address' => $request->ip(), 'created_at' => now()]);

            return DB::table('service_order_finalizations')->find($id);
        });
        $items = DB::table('service_order_items')->where('finalization_id', $finalization->id)->get()->map(fn ($item) => (array) $item)->all();
        $documents->issue($order->fresh(), 'final', ['company' => $company, 'order' => $order->fresh()->load(['client', 'snapshot', 'checklists'])->toArray(), 'finalization' => (array) $finalization, 'items' => $items, 'result_label' => $resultLabel, 'photos' => $photos], $request->user()->id, (int) $finalization->revision);

        return response()->json(['order' => $order->fresh(), 'finalization' => $finalization], 201);
    }

    private function adjustPaidAmountAfterRefinalization(Request $request, ServiceOrder $order, int $newTotal, ?object $previous): ?int
    {
        if (! $previous || (int) $previous->total_cents === $newTotal) {
            return null;
        }
        $transactions = DB::table('financial_transactions as ft')->join('payments as p', 'p.id', '=', 'ft.payment_id')->where('p.service_order_id', $order->id)->orderBy('ft.id')->get(['ft.id', 'ft.amount_cents']);
        if ($transactions->isEmpty()) {
            return null;
        }
        $effective = $transactions->sum(function ($row) { return (int) (DB::table('financial_adjustments')->where('transaction_id', $row->id)->latest('id')->value('new_cents') ?? $row->amount_cents); });
        if ($effective <= $newTotal) {
            return null;
        }
        $last = $transactions->last();
        $previousEffective = (int) (DB::table('financial_adjustments')->where('transaction_id', $last->id)->latest('id')->value('new_cents') ?? $last->amount_cents);
        $newEffective = max(0, $previousEffective - ($effective - $newTotal));
        $reason = "Ajuste de cobrança da OS {$order->number}: nova finalização revisou o total de R$ ".number_format((int) $previous->total_cents / 100, 2, ',', '.').' para R$ '.number_format($newTotal / 100, 2, ',', '.');
        $id = DB::table('financial_adjustments')->insertGetId(['transaction_id' => $last->id, 'previous_cents' => $previousEffective, 'new_cents' => $newEffective, 'reason' => $reason, 'user_id' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('audit_logs')->insert(['user_id' => $request->user()->id, 'action' => 'finance.adjusted_after_refinalization', 'subject_type' => 'financial_transaction', 'subject_id' => $last->id, 'before' => json_encode(['amount_cents' => $previousEffective, 'service_order_id' => $order->id]), 'after' => json_encode(['amount_cents' => $newEffective, 'service_order_id' => $order->id, 'reason' => $reason]), 'ip_address' => $request->ip(), 'created_at' => now()]);

        return $id;
    }

    private function resultLabel(string $result, ?string $other): string
    {
        return $result === 'other' ? 'Outro: '.$other : ['repair_completed' => 'Reparo realizado', 'irreparable' => 'Equipamento sem possibilidade de reparo', 'client_cancelled' => 'Cliente desistiu/cancelou', 'economically_unviable' => 'Reparo economicamente inviável', 'no_fault' => 'Sem defeito constatado'][$result];
    }
}
