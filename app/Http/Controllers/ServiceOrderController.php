<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ServiceOrder;
use App\Models\StatusHistory;
use App\Services\CompanySettings;
use App\Services\ContactLinks;
use App\Services\NotificationService;
use App\Services\OrderNumber;
use App\Services\PhotoOptimizer;
use App\Services\PostSaleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ServiceOrderController extends Controller
{
    public function index(Request $r, PostSaleService $postSales): JsonResponse
    {
        $postSales->catchUp(true);
        $q = ServiceOrder::query()->with('client:id,name,phone,street,number,district,city,state');
        $requestedStatus = (string) $r->query('status', '');
        $tab = (string) $r->query('tab', 'all');
        if ($r->has('finalized')) {
            $q->where('archived', $r->boolean('finalized'));
        }
        if ($requestedStatus === 'paid') {
            $q->where('archived', true);
        }
        match ($tab) {
            'progress' => $q->whereIn('status', ['analysis', 'waiting_part', 'in_service']),
            'finalized' => $q->where('status', 'completed'),
            'interrupted' => $q->where('status', 'interrupted'),
            default => null,
        };
        if ($requestedStatus !== '' && in_array($requestedStatus, ['analysis', 'waiting_part', 'in_service', 'interrupted'], true)) {
            $q->where('status', $requestedStatus);
        }
        if ($search = trim((string) $r->query('q'))) {
            $q->where(fn ($x) => $x->where('number', 'like', "%$search%")->orWhere('reported_problem', 'like', "%$search%")->orWhereHas('client', fn ($c) => $c->where('name', 'like', "%$search%")->orWhere('phone', 'like', "%$search%")->orWhere('street', 'like', "%$search%")));
        }
        match ((string) $r->query('sort', 'recent')) {
            'oldest' => $q->oldest('received_at'),
            'client' => $q->orderBy(Client::select('name')->whereColumn('clients.id', 'service_orders.client_id'))->latest('received_at'),
            default => $q->latest('received_at'),
        };

        $summary = [
            'open' => ServiceOrder::whereNotIn('status', ['completed', 'interrupted'])->count(),
            'completed_week' => ServiceOrder::where('status', 'completed')->where('completed_at', '>=', now()->startOfWeek())->count(),
        ];

        $perPage = max(1, min(100, (int) $r->integer('per_page', 50)));

        return response()->json([...$q->paginate($perPage)->toArray(), 'summary' => $summary]);
    }

    public function desk(PostSaleService $postSales): JsonResponse
    {
        $postSales->catchUp(true);
        $orders = ServiceOrder::query()
            ->with('client:id,name,phone,street,number,district,city,state')
            ->where('status', '!=', 'completed')
            ->oldest('received_at')
            ->get();

        return response()->json($orders);
    }

    public function store(Request $r, OrderNumber $numbers, NotificationService $notifications): JsonResponse
    {
        $data = $r->validate([
            'client_id' => 'required|exists:clients,id',
            'equipment_type_id' => 'required|exists:equipment_types,id',
            'manufacturer_id' => 'nullable|exists:manufacturers,id',
            'attendance_type' => 'required|in:bench,external',
            'reported_problem' => 'required|string|max:10000',
            'checklist' => 'array',
            'checklist.*.template_id' => 'nullable|integer',
            'checklist.*.label' => 'nullable|string|max:255',
            'checklist.*.note' => 'nullable|string|max:255',
            'items' => 'array|max:50',
            'items.*.catalog_id' => 'required|integer|exists:service_catalog,id',
            'items.*.quantity' => 'required|integer|min:1|max:999',
        ]);
        $requested = collect($data['checklist'] ?? []);
        $templates = DB::table('checklist_templates')->where('equipment_type_id', $data['equipment_type_id'])->where('active', true)
            ->where(fn ($q) => $q->whereIn('id', $requested->pluck('template_id')->filter())->orWhereIn('label', $requested->pluck('label')->filter()))->get();
        abort_unless($templates->count() === $requested->count(), 422, 'Uma opção do checklist não é válida para este equipamento.');
        $data['checklist'] = collect($data['checklist'] ?? [])->map(function ($item) use ($templates) {
            $template = $templates->first(fn ($option) => isset($item['template_id']) ? $option->id === $item['template_id'] : $option->label === ($item['label'] ?? null));
            abort_if($template->allows_note && blank($item['note'] ?? null), 422, "Descreva a avaria em {$template->label}.");

            return ['label' => $template->label, 'note' => $template->allows_note ? trim($item['note']) : null];
        })->all();

        $requestedItems = collect($data['items'] ?? [])->groupBy('catalog_id')->mapWithKeys(function ($rows, $catalogId) {
            $quantity = (int) $rows->sum('quantity');
            abort_if($quantity > 999, 422, 'A quantidade de um item da OS não pode ultrapassar 999.');

            return [(int) $catalogId => $quantity];
        });
        $catalogs = DB::table('service_catalog')->whereIn('id', $requestedItems->keys())->where('active', true)->get()->keyBy('id');
        abort_unless($catalogs->count() === $requestedItems->count(), 422, 'Um serviço ou produto selecionado não está mais disponível.');
        $data['items'] = $requestedItems->map(function (int $quantity, int $catalogId) use ($catalogs) {
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
                'warranty_snapshot' => $warranty,
            ];
        })->values()->all();

        $order = DB::transaction(function () use ($data, $numbers, $r) {
            $client = Client::findOrFail($data['client_id']);
            $order = ServiceOrder::create([...$data, 'number' => $numbers->next(), 'status' => 'analysis', 'received_at' => now(), 'created_by' => $r->user()->id]);
            $order->histories()->create(['to_status' => 'analysis', 'user_id' => $r->user()->id]);
            $order->checklists()->createMany($data['checklist'] ?? []);
            $order->items()->createMany($data['items'] ?? []);
            $order->snapshot()->create(['client' => $client->toArray(), 'company' => $this->companySnapshot(), 'equipment' => ['type_id' => $data['equipment_type_id'], 'manufacturer_id' => $data['manufacturer_id'] ?? null], 'term_text' => $this->term()]);

            return $order;
        });
        $notifications->notifyUsers('order_created', 'Nova OS aberta', "OS {$order->number} — {$order->client->name}", "/orders/{$order->id}", "order-created:{$order->id}", ['service_order_id' => $order->id]);

        return response()->json($order->load(['client', 'items']), 201);
    }

    public function show(ServiceOrder $order): JsonResponse
    {
        $order->load(['client', 'checklists', 'items', 'photos:id,service_order_id,mime,bytes,width,height,created_at', 'histories.user:id,name', 'snapshot']);
        $payload = $order->toArray();
        $payload['display_status'] = $order->archived ? 'paid' : $order->status;
        $payload['interruption_reason'] = $order->status === 'interrupted' ? $order->technical_report : null;
        if ($order->attendance_type === 'external') {
            $damages = $order->checklists->map(fn ($check) => '• '.$check->label.($check->note ? ': '.$check->note : ''));
            $message = "Olá, {$order->client->name}. Aqui é a ARL Informática sobre a OS #{$order->number}.";
            if ($damages->isNotEmpty()) {
                $message .= "\n\nAvarias registradas na abertura:\n".$damages->implode("\n");
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
        $data = $optimizer->optimize($request->file('photo'));
        $path = 'orders/'.$order->id.'/'.str()->uuid().'.webp';
        Storage::disk('local')->put($path, $data);
        [$width, $height] = getimagesizefromstring($data);
        $photo = $order->photos()->create(['disk' => 'local', 'path' => $path, 'mime' => 'image/webp', 'bytes' => strlen($data), 'width' => $width, 'height' => $height, 'uploaded_by' => $request->user()->id]);

        return response()->json($photo, 201);
    }

    public function photo(ServiceOrder $order, int $photo)
    {
        $record = $order->photos()->findOrFail($photo);

        return Storage::disk($record->disk)->response($record->path, "OS-{$order->number}-{$record->id}.webp", ['Content-Type' => $record->mime, 'Cache-Control' => 'private, max-age=3600']);
    }

    public function updateStatus(Request $r, ServiceOrder $order): JsonResponse
    {
        $data = $r->validate([
            'status' => 'required|in:analysis,waiting_part,in_service,completed,interrupted,paid',
            'interruption_reason' => 'nullable|required_if:status,interrupted|string|max:10000',
        ]);

        if ($data['status'] === 'completed') {
            abort(422, 'Use a finalização para concluir a OS.');
        }

        if ($data['status'] === 'paid') {
            abort_if($order->archived, 409, 'Esta OS já está em OS Finalizadas.');
            abort_unless($order->status === 'completed', 422, 'Finalize a OS antes de marcá-la como paga e retirada.');
            $total = $this->orderTotalCents($order);
            $paid = $this->paidCentsForOrder($order);
            abort_if($paid < $total, 422, 'Ainda existe saldo pendente. Registre o pagamento restante antes de marcar a OS como PAGO.');

            DB::transaction(function () use ($order, $r) {
                $before = $order->status;
                $order->forceFill(['archived' => true])->save();
                StatusHistory::create([
                    'service_order_id' => $order->id,
                    'from_status' => $before,
                    'to_status' => 'paid',
                    'user_id' => $r->user()->id,
                ]);
                DB::table('audit_logs')->insert([
                    'user_id' => $r->user()->id,
                    'action' => 'service_order.marked_paid_and_retrieved',
                    'subject_type' => 'service_order',
                    'subject_id' => $order->id,
                    'after' => json_encode(['archived' => true, 'display_status' => 'paid']),
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
        abort_if($order->status === 'completed', 422, 'Uma OS concluída só pode ser marcada como PAGO ou reaberta como retorno/garantia.');

        DB::transaction(function () use ($order, $data, $r) {
            $before = $order->status;
            $reason = $data['status'] === 'interrupted' ? trim((string) $data['interruption_reason']) : null;
            $order->forceFill([
                'status' => $data['status'],
                'technical_report' => $reason,
            ])->save();
            StatusHistory::create([
                'service_order_id' => $order->id,
                'from_status' => $before,
                'to_status' => $data['status'],
                'user_id' => $r->user()->id,
                'reason' => $reason,
            ]);
            if ($data['status'] === 'interrupted') {
                DB::table('audit_logs')->insert([
                    'user_id' => $r->user()->id,
                    'action' => 'service_order.interrupted',
                    'subject_type' => 'service_order',
                    'subject_id' => $order->id,
                    'before' => json_encode(['status' => $before]),
                    'after' => json_encode(['status' => 'interrupted', 'reason' => $reason]),
                    'ip_address' => $r->ip(),
                    'created_at' => now(),
                ]);
            }
        });

        $fresh = $order->fresh();
        $payload = $fresh->toArray();
        $payload['display_status'] = $fresh->archived ? 'paid' : $fresh->status;
        $payload['interruption_reason'] = $fresh->status === 'interrupted' ? $fresh->technical_report : null;

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

    private function companySnapshot(): array
    {
        return app(CompanySettings::class)->snapshot();
    }

    private function term(): string
    {
        return (string) DB::table('versioned_templates')->where('type', 'term')->where('active', true)->latest('version')->value('body');
    }
}
