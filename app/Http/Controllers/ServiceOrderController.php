<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ServiceOrder;
use App\Models\StatusHistory;
use App\Services\CompanySettings;
use App\Services\ContactLinks;
use App\Services\InventoryService;
use App\Services\NotificationService;
use App\Services\OrderNumber;
use App\Services\PhotoOptimizer;
use App\Services\PostSaleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ServiceOrderController extends Controller
{
    public function index(Request $r, PostSaleService $postSales): JsonResponse
    {
        $postSales->catchUp(true);
        $paidByOrder = $this->effectivePaymentsByOrder();
        $q = ServiceOrder::query()
            ->select('service_orders.*')
            ->addSelect(DB::raw('COALESCE(payment_status.paid_cents, 0) as paid_cents'))
            ->leftJoinSub($paidByOrder, 'payment_status', 'payment_status.service_order_id', '=', 'service_orders.id')
            ->with(['client:id,name,nickname,phone,street,number,district,city,state', 'closingMarkedBy:id,name'])
            ->withExists(['histories as reopened' => fn ($history) => $history->where('from_status', 'completed')->where('to_status', 'analysis')]);
        $requestedStatus = (string) $r->query('status', '');
        $tab = (string) $r->query('tab', 'all');
        if ($r->has('finalized')) {
            $q->where('archived', $r->boolean('finalized'));
        }
        if ($requestedStatus === 'paid') {
            $q->where('status', 'completed')->where('archived', true);
        }
        match ($tab) {
            'progress' => $q->whereIn('status', ['analysis', 'waiting_part', 'in_service']),
            'awaiting_payment' => $q
                ->where('status', 'completed')
                ->whereRaw('COALESCE(payment_status.paid_cents, 0) < service_orders.total_cents'),
            'finalized' => $q
                ->where('status', 'completed')
                ->whereRaw('COALESCE(payment_status.paid_cents, 0) >= service_orders.total_cents'),
            'interrupted' => $q->where('status', 'interrupted'),
            'closed_week' => $q
                ->whereIn('status', ['completed', 'interrupted'])
                ->where('completed_at', '>=', now('America/Sao_Paulo')->startOfWeek()),
            default => null,
        };
        if ($requestedStatus !== '' && in_array($requestedStatus, ['analysis', 'waiting_part', 'in_service', 'interrupted'], true)) {
            $q->where('status', $requestedStatus);
        }
        if ($search = trim((string) $r->query('q'))) {
            $q->where(fn ($x) => $x->where('number', 'like', "%$search%")->orWhere('reported_problem', 'like', "%$search%")->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%$search%")->orWhere('nickname', 'like', "%$search%")->orWhere('phone', 'like', "%$search%")->orWhere('street', 'like', "%$search%")));
        }
        match ((string) $r->query('sort', 'recent')) {
            'oldest' => $q->oldest('received_at'),
            'client' => $q->orderBy(Client::select('name')->whereColumn('clients.id', 'service_orders.client_id'))->latest('received_at'),
            default => match ($tab) {
                'closed_week' => $q->latest('completed_at'),
                'all' => $q->latest('received_at'),
                default => $q->latest('service_orders.updated_at'),
            },
        };

        $summary = [
            'open' => ServiceOrder::whereNotIn('status', ['completed', 'interrupted'])->count(),
            'completed_week' => ServiceOrder::whereIn('status', ['completed', 'interrupted'])->where('completed_at', '>=', now('America/Sao_Paulo')->startOfWeek())->count(),
        ];

        $perPage = max(1, min(100, (int) $r->integer('per_page', 12)));

        $orders = $q->paginate($perPage);
        $orders->getCollection()->transform(function (ServiceOrder $order) {
            $paidCents = (int) $order->paid_cents;
            $order->setAttribute('paid_cents', $paidCents);
            $order->setAttribute('display_status', $this->displayStatus($order, $paidCents));

            return $order;
        });

        return response()->json([...$orders->toArray(), 'summary' => $summary]);
    }

    public function desk(PostSaleService $postSales): JsonResponse
    {
        $postSales->catchUp(true);
        $orders = ServiceOrder::query()
            ->select('service_orders.*')
            ->with(['client:id,name,nickname,phone,street,number,district,city,state', 'closingMarkedBy:id,name'])
            ->withExists(['histories as reopened' => fn ($history) => $history->where('from_status', 'completed')->where('to_status', 'analysis')])
            ->whereNotIn('status', ['completed', 'interrupted'])
            ->oldest('received_at')
            ->get();

        return response()->json($orders);
    }

    public function store(Request $r, OrderNumber $numbers, NotificationService $notifications, InventoryService $inventory): JsonResponse
    {
        $data = $r->validate([
            'client_id' => 'required|exists:clients,id',
            'equipment_type_id' => 'required|exists:equipment_types,id',
            'manufacturer_id' => 'nullable|exists:manufacturers,id',
            'equipment_description' => 'nullable|string|max:500',
            'equipment_details' => 'nullable|string|max:500',
            'attendance_type' => 'required|in:bench,external',
            'reported_problem' => 'required|string|max:10000',
            'intake_condition' => 'nullable|string|max:10000',
            'checklist' => 'array',
            'checklist.*.template_id' => 'nullable|integer',
            'checklist.*.label' => 'nullable|string|max:255',
            'checklist.*.note' => 'nullable|string|max:255',
            'items' => 'array|max:50',
            'items.*.catalog_id' => 'required|integer|exists:service_catalog,id',
            'items.*.quantity' => 'required|integer|min:1|max:999',
        ]);
        $data['equipment_description'] = trim((string) ($data['equipment_description'] ?? '')) ?: null;
        $data['equipment_details'] = trim((string) ($data['equipment_details'] ?? '')) ?: null;
        $manualEquipment = DB::table('equipment_types')->where('id', $data['equipment_type_id'])->value('name') === 'Informado manualmente';
        if ($manualEquipment && blank($data['equipment_description'])) {
            abort(422, 'Descreva o equipamento informado manualmente.');
        }
        $data['intake_condition'] = trim((string) ($data['intake_condition'] ?? '')) ?: null;
        $requested = collect($data['checklist'] ?? []);
        $templates = DB::table('checklist_templates')->where('equipment_type_id', $data['equipment_type_id'])->where('active', true)
            ->where(fn ($q) => $q->whereIn('id', $requested->pluck('template_id')->filter())->orWhereIn('label', $requested->pluck('label')->filter()))->get();
        abort_unless($templates->count() === $requested->count(), 422, 'Uma opção do checklist não é válida para este equipamento.');
        $data['checklist'] = collect($data['checklist'] ?? [])->map(function ($item) use ($templates) {
            $template = $templates->first(fn ($option) => isset($item['template_id']) ? $option->id === $item['template_id'] : $option->label === ($item['label'] ?? null));
            abort_if($template->allows_note && blank($item['note'] ?? null), 422, "Descreva a avaria em {$template->label}.");

            return ['label' => $template->label, 'note' => $template->allows_note ? trim($item['note']) : null];
        })->all();

        $order = DB::transaction(function () use ($data, $numbers, $r, $inventory) {
            $client = Client::findOrFail($data['client_id']);
            $order = ServiceOrder::create([...$data, 'number' => $numbers->next(), 'status' => 'analysis', 'received_at' => now(), 'created_by' => $r->user()->id]);
            $order->histories()->create(['to_status' => 'analysis', 'user_id' => $r->user()->id]);
            $order->checklists()->createMany($data['checklist'] ?? []);
            $items = $inventory->syncActiveOrderItems(
                $order,
                $data['items'] ?? [],
                $r->user()->id,
                'Produto adicionado na abertura da OS '.$order->number,
            );
            $order->items()->createMany($items);
            $order->snapshot()->create(['client' => $client->toArray(), 'company' => $this->companySnapshot(), 'equipment' => ['type_id' => $data['equipment_type_id'], 'manufacturer_id' => $data['manufacturer_id'] ?? null], 'term_text' => $this->term()]);

            return $order;
        });
        $notifications->notifyUsers('order_created', 'Nova OS aberta', "OS {$order->number} — {$order->client->name}", "/orders/{$order->id}", "order-created:{$order->id}", ['service_order_id' => $order->id]);

        return response()->json($order->load(['client', 'items']), 201);
    }

    public function show(ServiceOrder $order): JsonResponse
    {
        $order->load(['client', 'closingMarkedBy:id,name', 'checklists', 'items', 'photos:id,service_order_id,mime,bytes,width,height,created_at', 'histories.user:id,name', 'snapshot']);
        $payload = $order->toArray();
        if (in_array($order->status, ['completed', 'interrupted'], true) && is_array($order->snapshot?->client)) {
            $payload['client'] = $order->snapshot->client;
        }
        $payload['display_status'] = $this->displayStatus($order, $this->paidCentsForOrder($order));
        $payload['reopened'] = $order->histories->contains(fn ($history) => $history->from_status === 'completed' && $history->to_status === 'analysis');
        $payload['interruption_reason'] = $order->status === 'interrupted' ? $order->technical_report : null;
        $payload['interruption_work_done'] = $order->status === 'interrupted' ? $order->interruption_work_done : null;
        if ($order->attendance_type === 'external') {
            $message = "Olá, {$order->client->name}. Aqui é a ARL Informática sobre a OS #{$order->number}.";
            $intakeCondition = trim((string) $order->intake_condition);
            if ($intakeCondition === '' && $order->checklists->isNotEmpty()) {
                $intakeCondition = $order->checklists
                    ->map(fn ($check) => $check->label.($check->note ? ': '.$check->note : ''))
                    ->implode("\n");
            }
            if ($intakeCondition !== '') {
                $message .= "\n\nEstado físico registrado na abertura:\n{$intakeCondition}";
            }
            $message .= "\n\nEstamos em atendimento externo e podemos continuar o contato por aqui.";
            $payload['mobile_actions'] = [
                'whatsapp_url' => ContactLinks::whatsapp($order->client->phone, $message),
                'maps_url' => ContactLinks::maps($order->client->toArray()),
            ];
        }

        return response()->json($payload);
    }

    public function uploadPhoto(Request $request, ServiceOrder $order, PhotoOptimizer $optimizer): JsonResponse
    {
        $request->validate(['photo' => 'required|file|max:15360']);
        $path = null;
        try {
            $photo = DB::transaction(function () use ($request, $order, $optimizer, &$path) {
                ServiceOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
                abort_if($order->photos()->count() >= 5, 422, 'Esta OS já possui o limite de 5 fotos. Remova uma foto antes de enviar outra.');
                $data = $optimizer->optimize($request->file('photo'));
                $path = 'orders/'.$order->id.'/'.str()->uuid().'.jpg';
                Storage::disk('local')->put($path, $data);
                [$width, $height] = getimagesizefromstring($data);

                return $order->photos()->create(['disk' => 'local', 'path' => $path, 'mime' => 'image/jpeg', 'bytes' => strlen($data), 'width' => $width, 'height' => $height, 'uploaded_by' => $request->user()->id]);
            });
        } catch (\Throwable $exception) {
            if ($path) {
                Storage::disk('local')->delete($path);
            }
            throw $exception;
        }

        return response()->json($photo, 201);
    }

    public function photo(ServiceOrder $order, int $photo)
    {
        $record = $order->photos()->findOrFail($photo);

        $extension = $record->mime === 'image/jpeg' ? 'jpg' : pathinfo($record->path, PATHINFO_EXTENSION);

        return Storage::disk($record->disk)->response($record->path, "OS-{$order->number}-{$record->id}.$extension", ['Content-Type' => $record->mime, 'Cache-Control' => 'private, max-age=3600']);
    }

    public function updateStatus(Request $r, ServiceOrder $order, InventoryService $inventory): JsonResponse
    {
        $data = $r->validate([
            'status' => 'required|in:analysis,waiting_part,in_service,completed,interrupted,paid',
            'interruption_reason' => 'nullable|required_if:status,interrupted|string|max:10000',
            'interruption_work_done' => 'nullable|required_if:status,interrupted|string|max:10000',
            'payment_method' => ['nullable', Rule::in(['cash', 'pix', 'credit', 'debit'])],
        ]);
        if ($data['status'] === 'interrupted') {
            abort_if(blank(trim((string) $data['interruption_reason'])), 422, 'Informe o motivo da interrupção.');
            abort_if(blank(trim((string) $data['interruption_work_done'])), 422, 'Informe o que já foi feito no equipamento, mesmo que a resposta seja “Nada”.');
        }

        if ($r->user()->hasRole('Funcionário')) {
            abort_if(
                in_array($data['status'], ['completed', 'interrupted', 'paid'], true),
                403,
                'Funcionário não pode concluir, interromper ou registrar a retirada/pagamento de uma OS.'
            );
        }

        if ($data['status'] === 'completed') {
            abort(422, 'Use a finalização para concluir a OS.');
        }

        if ($data['status'] === 'paid') {
            DB::transaction(function () use ($order, $r, $data) {
                $locked = ServiceOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
                abort_if($locked->archived, 409, 'Esta OS já está em OS Finalizadas.');
                abort_unless($locked->status === 'completed', 422, 'Finalize a OS antes de marcá-la como paga e retirada.');
                $total = $this->orderTotalCents($locked);
                $paid = $this->paidCentsForOrder($locked);
                $balance = max(0, $total - $paid);

                if ($balance > 0 && blank($data['payment_method'] ?? null)) {
                    throw ValidationException::withMessages(['payment_method' => 'Escolha a forma de pagamento.']);
                }

                $paymentId = null;
                if ($balance > 0) {
                    $now = now('UTC');
                    $paymentId = DB::table('payments')->insertGetId([
                        'service_order_id' => $locked->id,
                        'amount_cents' => $balance,
                        'method' => $data['payment_method'],
                        'paid_at' => $now,
                        'user_id' => $r->user()->id,
                        'idempotency_key' => 'status-payment-'.Str::uuid(),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                    $transactionId = DB::table('financial_transactions')->insertGetId([
                        'payment_id' => $paymentId,
                        'origin' => 'service_order',
                        'description' => "OS {$locked->number}",
                        'amount_cents' => $balance,
                        'occurred_at' => $now,
                        'user_id' => $r->user()->id,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]);
                    DB::table('audit_logs')->insert([
                        'user_id' => $r->user()->id,
                        'action' => 'payment.created',
                        'subject_type' => 'payment',
                        'subject_id' => $paymentId,
                        'after' => json_encode(['transaction_id' => $transactionId, 'amount_cents' => $balance, 'method' => $data['payment_method'], 'order_total_cents' => $total, 'previous_paid_cents' => $paid, 'balance_after_cents' => 0, 'source' => 'status']),
                        'ip_address' => $r->ip(),
                        'created_at' => $now,
                    ]);
                }

                $before = $locked->status;
                $locked->forceFill(['archived' => true])->save();
                StatusHistory::create([
                    'service_order_id' => $locked->id,
                    'from_status' => $before,
                    'to_status' => 'paid',
                    'user_id' => $r->user()->id,
                ]);
                DB::table('audit_logs')->insert([
                    'user_id' => $r->user()->id,
                    'action' => 'service_order.marked_paid_and_retrieved',
                    'subject_type' => 'service_order',
                    'subject_id' => $locked->id,
                    'after' => json_encode(['archived' => true, 'display_status' => 'paid', 'payment_id' => $paymentId]),
                    'ip_address' => $r->ip(),
                    'created_at' => now(),
                ]);
            });

            $fresh = $order->fresh();
            $payload = $fresh->toArray();
            $payload['display_status'] = 'paid';

            return response()->json($payload);
        }

        abort_if($order->archived, 422, 'Uma OS paga e retirada só pode voltar ao fluxo pela opção Reabrir OS.');
        abort_if(in_array($order->status, ['completed', 'interrupted'], true), 422, 'Uma OS fechada não pode voltar ao fluxo por alteração de status.');

        if ($data['status'] === 'interrupted') {
            DB::transaction(function () use ($order, $data, $r, $inventory) {
                $locked = ServiceOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
                abort_if(in_array($locked->status, ['completed', 'interrupted'], true) || $locked->archived, 409, 'Esta OS já está fechada.');
                abort_if(
                    DB::table('payments')->where('service_order_id', $locked->id)->exists(),
                    409,
                    'Esta OS possui pagamento registrado e não pode ser interrompida. Preserve este atendimento e use o fluxo normal de finalização.'
                );

                $reason = trim((string) $data['interruption_reason']);
                $workDone = trim((string) $data['interruption_work_done']);
                $before = [
                    'status' => $locked->status,
                    'subtotal_cents' => (int) $locked->subtotal_cents,
                    'discount_cents' => (int) $locked->discount_cents,
                    'total_cents' => (int) $locked->total_cents,
                    'items_count' => DB::table('service_order_items')->where('service_order_id', $locked->id)->whereNull('finalization_id')->count(),
                ];

                $inventory->returnActiveOrderProducts(
                    $locked,
                    $r->user()->id,
                    'Devolução por interrupção da OS '.$locked->number,
                );
                DB::table('service_order_items')->where('service_order_id', $locked->id)->whereNull('finalization_id')->delete();
                $locked->forceFill([
                    'status' => 'interrupted',
                    'completed_at' => now(),
                    'result' => null,
                    'technical_report' => $reason,
                    'interruption_work_done' => $workDone,
                    'subtotal_cents' => 0,
                    'discount_cents' => 0,
                    'total_cents' => 0,
                ])->save();
                StatusHistory::create([
                    'service_order_id' => $locked->id,
                    'from_status' => $before['status'],
                    'to_status' => 'interrupted',
                    'user_id' => $r->user()->id,
                    'reason' => $reason,
                ]);
                DB::table('audit_logs')->insert([
                    'user_id' => $r->user()->id,
                    'action' => 'service_order.interrupted',
                    'subject_type' => 'service_order',
                    'subject_id' => $locked->id,
                    'before' => json_encode($before),
                    'after' => json_encode([
                        'status' => 'interrupted',
                        'reason' => $reason,
                        'work_done' => $workDone,
                        'completed_at' => $locked->completed_at?->toISOString(),
                        'subtotal_cents' => 0,
                        'discount_cents' => 0,
                        'total_cents' => 0,
                        'items_count' => 0,
                    ]),
                    'ip_address' => $r->ip(),
                    'created_at' => now(),
                ]);
            });

            $fresh = $order->fresh();
            $payload = $fresh->toArray();
            $payload['display_status'] = 'interrupted';
            $payload['interruption_reason'] = $fresh->technical_report;
            $payload['interruption_work_done'] = $fresh->interruption_work_done;

            return response()->json($payload);
        }

        DB::transaction(function () use ($order, $data, $r) {
            $before = $order->status;
            $order->forceFill([
                'status' => $data['status'],
                'technical_report' => null,
                'interruption_work_done' => null,
            ])->save();
            StatusHistory::create([
                'service_order_id' => $order->id,
                'from_status' => $before,
                'to_status' => $data['status'],
                'user_id' => $r->user()->id,
                'reason' => null,
            ]);
        });

        $fresh = $order->fresh();
        $payload = $fresh->toArray();
        $payload['display_status'] = $this->displayStatus($fresh, $this->paidCentsForOrder($fresh));
        $payload['interruption_reason'] = $fresh->status === 'interrupted' ? $fresh->technical_report : null;
        $payload['interruption_work_done'] = $fresh->status === 'interrupted' ? $fresh->interruption_work_done : null;

        return response()->json($payload);
    }

    private function orderTotalCents(ServiceOrder $order): int
    {
        $total = (int) ($order->total_cents ?? 0);
        if ($total > 0) {
            return $total;
        }

        $approvedBudget = (int) (DB::table('budgets')
            ->where('service_order_id', $order->id)
            ->where('status', 'approved')
            ->orderByDesc('revision')
            ->value('total_cents') ?? 0);
        if ($approvedBudget > 0) {
            return $approvedBudget;
        }

        return (int) DB::table('service_order_items')->where('service_order_id', $order->id)->sum('subtotal_cents');
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

    private function effectivePaymentsByOrder()
    {
        $latest = DB::table('financial_adjustments')
            ->select('transaction_id', DB::raw('MAX(id) as adjustment_id'))
            ->groupBy('transaction_id');

        return DB::table('financial_transactions as ft')
            ->join('payments as p', 'p.id', '=', 'ft.payment_id')
            ->leftJoinSub($latest, 'latest_adjustment', 'latest_adjustment.transaction_id', '=', 'ft.id')
            ->leftJoin('financial_adjustments as adjustment', 'adjustment.id', '=', 'latest_adjustment.adjustment_id')
            ->where('ft.origin', 'service_order')
            ->groupBy('p.service_order_id')
            ->select('p.service_order_id', DB::raw('SUM(COALESCE(adjustment.new_cents, ft.amount_cents)) as paid_cents'));
    }

    private function displayStatus(ServiceOrder $order, int $paidCents): string
    {
        if ($order->status === 'completed') {
            return $paidCents >= (int) $order->total_cents ? 'paid' : 'awaiting_payment';
        }

        return $order->status;
    }

    private function companySnapshot(): array
    {
        return app(CompanySettings::class)->snapshot();
    }

    private function term(): string
    {
        return (string) DB::table('versioned_templates')->where('type', 'term')->where('active', true)->latest('version')->value('body');
    }
}
