<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ServiceOrder;
use App\Services\CompanySettings;
use App\Services\NotificationService;
use App\Services\OrderNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ServiceOrderMaintenanceController extends Controller
{
    private const REOPEN_TYPES = [
        'warranty_service' => 'Garantia de serviço',
        'warranty_product' => 'Garantia de produto',
        'same_issue_return' => 'Retorno do mesmo defeito',
        'adjustment_return' => 'Retorno para ajuste',
        'other' => 'Outro retorno',
    ];

    public function update(Request $request, ServiceOrder $order): JsonResponse
    {
        $data = $request->validate([
            'client_id' => ['sometimes', 'required', 'integer', 'exists:clients,id'],
            'equipment_description' => ['sometimes', 'required', 'string', 'max:500'],
            'attendance_type' => ['sometimes', 'required', 'in:bench,external'],
            'reported_problem' => ['sometimes', 'required', 'string', 'max:10000'],
            'final_report' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'checklist' => ['sometimes', 'array', 'max:100'],
            'checklist.*.template_id' => ['required', 'integer'],
            'checklist.*.note' => ['nullable', 'string', 'max:255'],
            'items' => ['sometimes', 'array', 'max:100'],
            'items.*.catalog_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
        ]);

        abort_if($data === [], 422, 'Informe ao menos uma alteração para a OS.');

        $protectedAfterCompletion = ['client_id', 'final_report', 'checklist', 'items'];
        $changesProtectedAfterCompletion = array_intersect_key($data, array_flip($protectedAfterCompletion)) !== [];
        abort_if(
            ($order->archived || $order->status === 'completed') && $changesProtectedAfterCompletion,
            422,
            'Em OS finalizada ou paga, apenas atendimento, problema relatado e equipamento podem ser corrigidos administrativamente.'
        );

        $newClient = array_key_exists('client_id', $data)
            ? Client::query()->findOrFail((int) $data['client_id'])
            : null;
        $checklist = array_key_exists('checklist', $data)
            ? $this->resolveChecklist($order, $data['checklist'])
            : null;
        $items = array_key_exists('items', $data)
            ? $this->resolveItems($data['items'])
            : null;

        if ($items !== null) {
            $subtotal = (int) collect($items)->sum('subtotal_cents');
            $paid = $this->paidCentsForOrder($order);
            if ($paid > $subtotal) {
                throw ValidationException::withMessages([
                    'items' => 'O total dos serviços não pode ficar abaixo do valor já recebido. Corrija primeiro o pagamento ou mantenha serviços suficientes para cobrir o valor pago.',
                ]);
            }
        }

        $order->load(['client', 'checklists', 'items', 'snapshot']);
        $before = $this->auditState($order);
        $termIssued = $this->termIssued($order);

        DB::transaction(function () use ($request, $order, $data, $before, $newClient, $checklist, $items, $termIssued) {
            $scalar = [];
            foreach (['client_id', 'equipment_description', 'attendance_type', 'reported_problem', 'final_report'] as $field) {
                if (! array_key_exists($field, $data)) {
                    continue;
                }

                $value = $data[$field];
                if ($field === 'client_id') {
                    $value = (int) $value;
                } elseif ($field === 'equipment_description') {
                    $value = trim((string) $value);
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
                $order->items()->whereNull('finalization_id')->delete();
                $order->items()->createMany($items);
                $subtotal = (int) collect($items)->sum('subtotal_cents');
                $order->forceFill([
                    'subtotal_cents' => $subtotal,
                    'total_cents' => $subtotal,
                ])->save();
            }

            $identityChanged = array_key_exists('client_id', $data) || array_key_exists('equipment_description', $data);
            if ($identityChanged && ! $termIssued) {
                $snapshot = $order->snapshot()->first();
                if ($snapshot) {
                    $snapshotClient = $newClient ?? Client::withTrashed()->findOrFail($order->client_id);
                    $snapshotData = ['client' => $snapshotClient->toArray()];
                    if (array_key_exists('equipment_description', $data)) {
                        $equipment = is_array($snapshot->equipment) ? $snapshot->equipment : [];
                        $equipment['type_id'] = $order->equipment_type_id;
                        $equipment['manufacturer_id'] = $order->manufacturer_id;
                        $equipment['name'] = $order->equipment_description;
                        $equipment['description'] = $order->equipment_description;
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

    public function destroy(Request $request, ServiceOrder $order, NotificationService $notifications): JsonResponse
    {
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

        DB::transaction(function () use ($request, $order, $before) {
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
        OrderNumber $numbers,
        CompanySettings $settings,
        NotificationService $notifications,
    ): JsonResponse {
        abort_unless($order->status === 'completed', 422, 'Somente uma OS concluída pode ser reaberta.');

        $data = $request->validate([
            'reopen_type' => ['required', 'in:'.implode(',', array_keys(self::REOPEN_TYPES))],
            'note' => ['required', 'string', 'max:5000'],
        ]);

        $alreadyOpen = ServiceOrder::query()
            ->where('reopened_from_order_id', $order->id)
            ->whereNotIn('status', ['completed', 'interrupted'])
            ->exists();
        abort_if($alreadyOpen, 409, 'Esta OS já possui um retorno em andamento.');

        $label = self::REOPEN_TYPES[$data['reopen_type']];
        $newOrder = DB::transaction(function () use ($request, $order, $numbers, $settings, $data, $label, $notifications) {
            $client = Client::withTrashed()->findOrFail($order->client_id);
            $newOrder = new ServiceOrder;
            $newOrder->forceFill([
                'number' => $numbers->next(),
                'client_id' => $order->client_id,
                'reopened_from_order_id' => $order->id,
                'reopen_type' => $data['reopen_type'],
                'reopen_note' => trim($data['note']),
                'equipment_type_id' => $order->equipment_type_id,
                'manufacturer_id' => $order->manufacturer_id,
                'attendance_type' => $order->attendance_type,
                'status' => 'analysis',
                'reported_problem' => "{$label} da OS #{$order->number}:\n\n".trim($data['note']),
                'received_at' => now(),
                'created_by' => $request->user()->id,
            ])->save();
            $newOrder->histories()->create([
                'to_status' => 'analysis',
                'user_id' => $request->user()->id,
            ]);
            $newOrder->snapshot()->create([
                'client' => $client->toArray(),
                'company' => $settings->snapshot(),
                'equipment' => [
                    'type_id' => $order->equipment_type_id,
                    'manufacturer_id' => $order->manufacturer_id,
                ],
                'term_text' => (string) DB::table('versioned_templates')
                    ->where('type', 'term')
                    ->where('active', true)
                    ->latest('version')
                    ->value('body'),
            ]);

            $cycle = DB::table('post_sale_cycles')
                ->where('service_order_id', $order->id)
                ->where('active', true)
                ->first();
            if ($cycle) {
                DB::table('post_sale_cycles')->where('id', $cycle->id)->update([
                    'active' => false,
                    'archived_at' => now(),
                    'archive_reason' => "OS reaberta como {$label}",
                    'updated_at' => now(),
                ]);
                $notifications->resolve("post-sale:{$cycle->id}");
            }

            DB::table('audit_logs')->insert([
                'user_id' => $request->user()->id,
                'action' => 'service_order.reopened',
                'subject_type' => 'service_order',
                'subject_id' => $order->id,
                'after' => json_encode([
                    'new_service_order_id' => $newOrder->id,
                    'new_number' => $newOrder->number,
                    'reopen_type' => $data['reopen_type'],
                    'reopen_label' => $label,
                    'note' => trim($data['note']),
                ]),
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);

            return $newOrder;
        });

        $notifications->notifyUsers(
            'order_reopened',
            'OS reaberta',
            "OS {$newOrder->number} — {$newOrder->client->name} ({$label})",
            "/orders/{$newOrder->id}",
            "order-reopened:{$newOrder->id}",
            ['service_order_id' => $newOrder->id, 'reopened_from_order_id' => $order->id],
        );

        return response()->json([
            'order' => $newOrder->fresh()->load('client'),
            'reopen_label' => $label,
        ], 201);
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

    private function resolveItems(array $requested): array
    {
        if ($requested === []) {
            return [];
        }

        $grouped = collect($requested)->groupBy('catalog_id')->mapWithKeys(function ($rows, $catalogId) {
            $quantity = (int) $rows->sum('quantity');
            abort_if($quantity > 999, 422, 'A quantidade de um serviço não pode ultrapassar 999.');

            return [(int) $catalogId => $quantity];
        });
        $catalogs = DB::table('service_catalog')->whereIn('id', $grouped->keys())->where('active', true)->get()->keyBy('id');
        abort_unless($catalogs->count() === $grouped->count(), 422, 'Um serviço selecionado não está mais disponível.');

        return $grouped->map(function (int $quantity, int $catalogId) use ($catalogs) {
            $catalog = $catalogs->get($catalogId);
            $warranty = $catalog->warranty_enabled ? [
                'enabled' => true,
                'term' => (int) $catalog->warranty_term,
                'unit' => $catalog->warranty_unit,
            ] : null;

            return [
                'catalog_id' => $catalog->id,
                'description' => $catalog->name,
                'quantity' => $quantity,
                'unit_price_cents' => (int) $catalog->price_cents,
                'subtotal_cents' => $quantity * (int) $catalog->price_cents,
                'warranty_snapshot' => $warranty ? json_encode($warranty) : null,
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
