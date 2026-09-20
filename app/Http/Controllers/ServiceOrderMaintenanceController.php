<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ServiceOrder;
use App\Services\InventoryService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ServiceOrderMaintenanceController extends Controller
{
    public function update(Request $request, ServiceOrder $order, InventoryService $inventory): JsonResponse
    {
        $data = $request->validate([
            'client_id' => ['sometimes', 'required', 'integer', 'exists:clients,id'],
            'equipment_description' => ['sometimes', 'required', 'string', 'max:500'],
            'equipment_details' => ['sometimes', 'nullable', 'string', 'max:500'],
            'attendance_type' => ['sometimes', 'required', 'in:bench,external'],
            'reported_problem' => ['sometimes', 'required', 'string', 'max:10000'],
            'intake_condition' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'final_report' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'checklist' => ['sometimes', 'array', 'max:100'],
            'checklist.*.template_id' => ['required', 'integer'],
            'checklist.*.note' => ['nullable', 'string', 'max:255'],
            'items' => ['sometimes', 'array', 'max:100'],
            'items.*.catalog_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
        ]);

        abort_if($data === [], 422, 'Informe ao menos uma alteração para a OS.');

        if ($request->user()->hasRole('Funcionário')) {
            abort_if(
                $order->archived || in_array($order->status, ['completed', 'interrupted'], true),
                403,
                'Funcionário só pode editar uma OS ativa em que está trabalhando.'
            );
            abort_if(
                array_intersect(array_keys($data), ['client_id']) !== [],
                403,
                'Funcionário não pode trocar o cliente vinculado à OS.'
            );
        }

        $protectedAfterCompletion = ['client_id', 'final_report', 'checklist', 'items'];
        $changesProtectedAfterCompletion = array_intersect_key($data, array_flip($protectedAfterCompletion)) !== [];
        abort_if(
            ($order->archived || in_array($order->status, ['completed', 'interrupted'], true)) && $changesProtectedAfterCompletion,
            422,
            'Em OS finalizada ou paga, apenas atendimento, problema relatado e equipamento podem ser corrigidos administrativamente.'
        );

        $newClient = array_key_exists('client_id', $data)
            ? Client::query()->findOrFail((int) $data['client_id'])
            : null;
        $checklist = array_key_exists('checklist', $data)
            ? $this->resolveChecklist($order, $data['checklist'])
            : null;
        $items = array_key_exists('items', $data) ? $data['items'] : null;

        $order->load(['client', 'checklists', 'items', 'snapshot']);
        $before = $this->auditState($order);
        $termIssued = $this->termIssued($order);

        DB::transaction(function () use ($request, $order, $data, $before, $newClient, $checklist, $items, $termIssued, $inventory) {
            ServiceOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            $order->refresh();
            $scalar = [];
            foreach (['client_id', 'equipment_description', 'equipment_details', 'attendance_type', 'reported_problem', 'intake_condition', 'final_report'] as $field) {
                if (! array_key_exists($field, $data)) {
                    continue;
                }

                $value = $data[$field];
                if ($field === 'client_id') {
                    $value = (int) $value;
                } elseif ($field === 'equipment_description') {
                    $value = trim((string) $value);
                } elseif ($field === 'equipment_details') {
                    $value = trim((string) $value) ?: null;
                } elseif ($field === 'final_report' && blank($value)) {
                    $value = null;
                }
                $scalar[$field] = $value;
            }
            if ($scalar !== []) {
                $order->forceFill($scalar)->save();
            }

            if ($checklist !== null) {
                $order->checklists()->delete();
                $order->checklists()->createMany($checklist);
            }

            if ($items !== null) {
                $items = $inventory->syncActiveOrderItems(
                    $order,
                    $items,
                    $request->user()->id,
                    'Alteração dos produtos da OS '.$order->number,
                );
                $subtotal = (int) collect($items)->sum('subtotal_cents');
                $paid = $this->paidCentsForOrder($order);
                if ($paid > $subtotal) {
                    throw ValidationException::withMessages([
                        'items' => 'O total dos serviços não pode ficar abaixo do valor já recebido. Corrija primeiro o pagamento ou mantenha serviços suficientes para cobrir o valor pago.',
                    ]);
                }
                $order->items()->whereNull('finalization_id')->delete();
                $order->items()->createMany($items);
                $order->forceFill([
                    'subtotal_cents' => $subtotal,
                    'total_cents' => $subtotal,
                ])->save();
            }

            $identityChanged = array_key_exists('client_id', $data) || array_key_exists('equipment_description', $data) || array_key_exists('equipment_details', $data);
            if ($identityChanged && ! $termIssued) {
                $snapshot = $order->snapshot()->first();
                if ($snapshot) {
                    $snapshotClient = $newClient ?? Client::withTrashed()->findOrFail($order->client_id);
                    $snapshotData = ['client' => $snapshotClient->toArray()];
                    if (array_key_exists('equipment_description', $data) || array_key_exists('equipment_details', $data)) {
                        $equipment = is_array($snapshot->equipment) ? $snapshot->equipment : [];
                        $equipment['type_id'] = $order->equipment_type_id;
                        $equipment['manufacturer_id'] = $order->manufacturer_id;
                        $equipment['name'] = $order->equipment_description;
                        $equipment['description'] = $order->equipment_description;
                        $equipment['details'] = $order->equipment_details;
                        $snapshotData['equipment'] = $equipment;
                    }
                    $snapshot->forceFill($snapshotData)->save();
                }
            }

            $fresh = $order->fresh()->load(['client', 'checklists', 'items', 'snapshot']);
            DB::table('audit_logs')->insert([
                'user_id' => $request->user()->id,
                'action' => 'service_order.edited',
                'subject_type' => 'service_order',
                'subject_id' => $order->id,
                'before' => json_encode($before),
                'after' => json_encode($this->auditState($fresh)),
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        });

        return response()->json($order->fresh()->load(['client', 'checklists', 'items', 'photos', 'histories.user:id,name', 'snapshot']));
    }

    public function destroy(Request $request, ServiceOrder $order, NotificationService $notifications, InventoryService $inventory): JsonResponse
    {
        abort_if(
            DB::table('payments')->where('service_order_id', $order->id)->exists(),
            409,
            'Esta OS possui pagamento registrado e não pode ser excluída.'
        );
        $order->load(['client', 'checklists', 'items', 'documents']);
        $before = [
            'order' => $order->toArray(),
            'documents' => $order->documents->map(fn ($document) => [
                'id' => $document->id,
                'type' => $document->type,
                'revision' => $document->revision,
            ])->values()->all(),
        ];
        $cycleIds = DB::table('post_sale_cycles')
            ->where('service_order_id', $order->id)
            ->where('active', true)
            ->pluck('id');

        DB::transaction(function () use ($request, $order, $before, $inventory) {
            ServiceOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            $inventory->returnActiveOrderProducts(
                $order,
                $request->user()->id,
                'Devolução por remoção administrativa da OS '.$order->number,
            );
            $order->delete();
            DB::table('post_sale_cycles')
                ->where('service_order_id', $order->id)
                ->where('active', true)
                ->update([
                    'active' => false,
                    'archived_at' => now(),
                    'archive_reason' => 'OS removida da operação',
                    'updated_at' => now(),
                ]);
            DB::table('audit_logs')->insert([
                'user_id' => $request->user()->id,
                'action' => 'service_order.deleted',
                'subject_type' => 'service_order',
                'subject_id' => $order->id,
                'before' => json_encode($before),
                'after' => json_encode([
                    'deleted_at' => $order->deleted_at?->toISOString(),
                    'soft_deleted' => true,
                    'financial_history_preserved' => true,
                    'documents_preserved' => true,
                ]),
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        });

        foreach ($cycleIds as $cycleId) {
            $notifications->resolve("post-sale:{$cycleId}");
        }

        return response()->json([
            'deleted' => true,
            'id' => $order->id,
            'message' => 'OS removida das listagens. Histórico financeiro, auditoria e documentos foram preservados.',
        ]);
    }

    public function reopen(
        Request $request,
        ServiceOrder $order,
    ): JsonResponse {
        abort_if($order->status === 'interrupted', 422, 'Uma OS interrompida é fechada definitivamente e não pode ser reaberta. Abra uma nova OS para um novo atendimento.');
        abort_unless($order->status === 'completed', 422, 'Somente uma OS concluída pode ser reaberta.');

        $data = $request->validate(['note' => ['required', 'string', 'max:5000']]);

        DB::transaction(function () use ($request, $order, $data) {
            $locked = ServiceOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            abort_if($locked->status === 'interrupted', 409, 'Uma OS interrompida não pode ser reaberta.');
            abort_unless($locked->status === 'completed', 409, 'Esta OS já foi reaberta.');
            $items = DB::table('service_order_items')->where('service_order_id', $locked->id)->whereNotNull('finalization_id')->orderBy('id')->get();
            foreach ($items as $item) {
                DB::table('service_order_items')->insert([
                    'service_order_id' => $locked->id, 'finalization_id' => null, 'catalog_id' => $item->catalog_id,
                    'source_budget_id' => null, 'description' => $item->description, 'quantity' => $item->quantity,
                    'stock_applied_quantity' => 0,
                    'unit_price_cents' => $item->unit_price_cents, 'subtotal_cents' => $item->subtotal_cents,
                    'warranty_snapshot' => $item->warranty_snapshot, 'created_at' => now(), 'updated_at' => now(),
                ]);
            }

            $before = ['status' => $locked->status, 'total_cents' => (int) $locked->total_cents, 'completed_at' => $locked->completed_at];
            $locked->update(['status' => 'analysis', 'completed_at' => null, 'archived' => false]);
            DB::table('status_history')->insert(['service_order_id' => $locked->id, 'from_status' => 'completed', 'to_status' => 'analysis', 'user_id' => $request->user()->id, 'created_at' => now()]);
            DB::table('audit_logs')->insert([
                'user_id' => $request->user()->id,
                'action' => 'service_order.reopened',
                'subject_type' => 'service_order',
                'subject_id' => $locked->id,
                'before' => json_encode($before),
                'after' => json_encode(['status' => 'analysis', 'previous_total_cents' => (int) $locked->total_cents, 'note' => trim($data['note'])]),
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        });

        $payload = $order->fresh()->load(['client', 'items', 'histories.user:id,name'])->toArray();
        $payload['reopened'] = true;

        return response()->json($payload);
    }

    private function resolveChecklist(ServiceOrder $order, array $requested): array
    {
        if ($requested === []) {
            return [];
        }

        $ids = collect($requested)->pluck('template_id')->map(fn ($id) => (int) $id)->unique()->values();
        abort_if($ids->count() !== count($requested), 422, 'O checklist contém opções repetidas.');

        $templates = DB::table('checklist_templates')
            ->where('equipment_type_id', $order->equipment_type_id)
            ->where('active', true)
            ->whereIn('id', $ids->all())
            ->get()
            ->keyBy('id');
        abort_unless($templates->count() === $ids->count(), 422, 'Uma opção do checklist não é válida para este equipamento.');

        return collect($requested)->map(function ($item) use ($templates) {
            $template = $templates->get((int) $item['template_id']);
            $note = trim((string) ($item['note'] ?? ''));
            if ($template->allows_note && $note === '') {
                throw ValidationException::withMessages(['checklist' => "Descreva a avaria em {$template->label}."]);
            }

            return [
                'label' => $template->label,
                'note' => $template->allows_note ? $note : null,
            ];
        })->values()->all();
    }

    private function auditState(ServiceOrder $order): array
    {
        $order->loadMissing(['client', 'checklists', 'items']);

        return [
            'client' => [
                'id' => (int) $order->client_id,
                'name' => $order->client?->name,
            ],
            'equipment_description' => $order->equipment_description,
            'equipment_details' => $order->equipment_details,
            'attendance_type' => $order->attendance_type,
            'reported_problem' => $order->reported_problem,
            'final_report' => $order->final_report,
            'checklist' => $order->checklists->map(fn ($item) => ['label' => $item->label, 'note' => $item->note])->values()->all(),
            'items' => $order->items->whereNull('finalization_id')->map(fn ($item) => [
                'catalog_id' => $item->catalog_id,
                'description' => $item->description,
                'quantity' => (int) $item->quantity,
                'unit_price_cents' => (int) $item->unit_price_cents,
            ])->values()->all(),
        ];
    }

    private function termIssued(ServiceOrder $order): bool
    {
        return DB::table('generated_documents')
            ->where('service_order_id', $order->id)
            ->where('type', 'term')
            ->exists();
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
