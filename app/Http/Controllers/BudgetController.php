<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Services\CompanySettings;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BudgetController extends Controller
{
    public function index(ServiceOrder $order): JsonResponse
    {
        return response()->json(DB::table('budgets')->where('service_order_id', $order->id)->whereNull('deleted_at')->orderByDesc('revision')->get()->map(function ($budget) {
            $budget->items = DB::table('budget_items')->where('budget_id', $budget->id)->get();
            $budget->used_in_finalization = DB::table('service_order_items')->where('source_budget_id', $budget->id)->whereNotNull('finalization_id')->exists();

            return $budget;
        }));
    }

    public function store(Request $request, ServiceOrder $order, CompanySettings $settings, DocumentService $documents): JsonResponse
    {
        abort_if($order->status === 'completed', 409, 'Não é possível criar orçamento para uma OS finalizada.');
        $data = $request->validate(['diagnosis' => 'required|string|max:5000', 'proposal' => 'required|string|max:5000', 'observation' => 'nullable|string|max:2000', 'validity_days' => 'required|integer|min:1|max:365', 'items' => 'required|array|min:1', 'items.*.catalog_id' => 'nullable|exists:service_catalog,id', 'items.*.description' => 'required|string|max:255', 'items.*.quantity' => 'required|integer|min:1|max:999', 'items.*.unit_price_cents' => 'required|integer|min:0|max:999999999', 'items.*.warranty_enabled' => 'boolean', 'items.*.warranty_term' => 'nullable|required_if:items.*.warranty_enabled,true|integer|min:1|max:999', 'items.*.warranty_unit' => 'nullable|required_if:items.*.warranty_enabled,true|in:days,months,years']);
        $budget = DB::transaction(function () use ($data, $order, $request, $settings) {
            $revision = ((int) DB::table('budgets')->where('service_order_id', $order->id)->max('revision')) + 1;
            $company = $settings->snapshot();
            $total = 0;
            $items = [];
            foreach ($data['items'] as $item) {
                $subtotal = $item['quantity'] * $item['unit_price_cents'];
                $total += $subtotal;
                $w = ! empty($item['warranty_enabled']) ? ['enabled' => true, 'term' => (int) $item['warranty_term'], 'unit' => $item['warranty_unit']] : null;
                $items[] = [...$item, 'subtotal_cents' => $subtotal, 'warranty_snapshot' => $w ? json_encode($w) : null];
            }$id = DB::table('budgets')->insertGetId(['service_order_id' => $order->id, 'revision' => $revision, 'status' => 'draft', 'diagnosis' => $data['diagnosis'], 'proposal' => $data['proposal'], 'observation' => $data['observation'] ?? null, 'institutional_text' => $company['budget_institutional_text'], 'validity_days' => $data['validity_days'], 'total_cents' => $total, 'created_by' => $request->user()->id, 'snapshot' => json_encode(['company' => $company, 'order' => $order->snapshot?->toArray()]), 'created_at' => now(), 'updated_at' => now()]);
            foreach ($items as $item) {
                DB::table('budget_items')->insert(['budget_id' => $id, 'catalog_id' => $item['catalog_id'] ?? null, 'description' => $item['description'], 'quantity' => $item['quantity'], 'unit_price_cents' => $item['unit_price_cents'], 'subtotal_cents' => $item['subtotal_cents'], 'warranty_snapshot' => $item['warranty_snapshot'], 'created_at' => now(), 'updated_at' => now()]);
            }

            return DB::table('budgets')->find($id);
        });
        $items = DB::table('budget_items')->where('budget_id', $budget->id)->get()->map(fn ($x) => (array) $x)->all();
        $snapshot = json_decode($budget->snapshot, true);
        $documents->issue($order, 'budget', ['budget' => (array) $budget, 'items' => $items, 'company' => $snapshot['company'], 'order' => $order->load('client')->toArray()], $request->user()->id, $budget->revision);

        return response()->json(['budget' => $budget, 'items' => $items], 201);
    }

    public function status(Request $request, ServiceOrder $order, int $revision): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:sent,approved,refused', 'note' => 'nullable|string|max:1000']);
        $budget = DB::table('budgets')->where(['service_order_id' => $order->id, 'revision' => $revision])->whereNull('deleted_at')->first();
        abort_unless($budget, 404);
        DB::table('budgets')->where('id', $budget->id)->update(['status' => $data['status'], 'decided_at' => in_array($data['status'], ['approved', 'refused']) ? now() : null, 'decided_by' => in_array($data['status'], ['approved', 'refused']) ? $request->user()->id : null, 'decision_note' => $data['note'] ?? null, 'updated_at' => now()]);
        DB::table('audit_logs')->insert(['user_id' => $request->user()->id, 'action' => 'budget.status_changed', 'subject_type' => 'budget', 'subject_id' => $budget->id, 'before' => json_encode(['status' => $budget->status]), 'after' => json_encode($data), 'ip_address' => $request->ip(), 'created_at' => now()]);

        return response()->json(DB::table('budgets')->find($budget->id));
    }

    public function destroy(Request $request, ServiceOrder $order, int $revision): JsonResponse
    {
        $budget = DB::table('budgets')->where(['service_order_id' => $order->id, 'revision' => $revision])->whereNull('deleted_at')->first();
        abort_unless($budget, 404);
        abort_if(
            DB::table('service_order_items')->where('source_budget_id', $budget->id)->whereNotNull('finalization_id')->exists(),
            409,
            'Este orçamento foi usado na finalização da OS e não pode ser excluído.'
        );

        DB::transaction(function () use ($budget, $request) {
            DB::table('budgets')->where('id', $budget->id)->update(['deleted_at' => now(), 'updated_at' => now()]);
            DB::table('audit_logs')->insert([
                'user_id' => $request->user()->id,
                'action' => 'budget.deleted',
                'subject_type' => 'budget',
                'subject_id' => $budget->id,
                'before' => json_encode((array) $budget),
                'after' => json_encode(['deleted_at' => now()->toIso8601String()]),
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        });

        return response()->json(['deleted' => true]);
    }
}
