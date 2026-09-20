<?php

namespace App\Http\Controllers;

use App\Services\ContactLinks;
use App\Services\NotificationService;
use App\Services\PostSaleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PostSaleController extends Controller
{
    private const INSTAGRAM_URL = 'https://www.instagram.com/allanluttembarck';

    private const GOOGLE_REVIEW_URL = 'https://g.page/r/CSxkz5Y88MaJEBM/review';

    private const MESSAGES = [
        'instagram' => "Olá! 😊\nAgradecemos por escolher a Arl Informática.\nFoi um prazer atender você!\n\nSiga a gente no Instagram e acompanhe nossas novidades:\nhttps://www.instagram.com/allanluttembarck\n\nEquipe Arl Informática",
        'google' => "Olá! 😊\nAgradecemos por escolher a Arl Informática.\nFoi um prazer atender você!\n\nSe puder, deixe sua avaliação no Google. Sua opinião é muito importante para nós:\nhttps://g.page/r/CSxkz5Y88MaJEBM/review\n\nEquipe Arl Informática",
    ];

    public function index(PostSaleService $service): JsonResponse
    {
        // Sem throttle aqui: ao entrar no Pós-Venda, uma OS recém-concluída deve aparecer imediatamente.
        $service->catchUp();
        $rows = DB::table('post_sale_cycles as cycles')
            ->join('service_orders as orders', 'orders.id', '=', 'cycles.service_order_id')
            ->join('clients', 'clients.id', '=', 'cycles.client_id')
            ->where('cycles.active', true)
            ->whereNull('orders.deleted_at')
            ->where('orders.status', 'completed')
            ->whereNotNull('orders.completed_at')
            ->select('cycles.id', 'cycles.eligible_at', 'orders.number', 'clients.name', 'clients.phone')
            ->orderBy('cycles.eligible_at')
            ->get();
        $actions = DB::table('post_sale_actions')->whereIn('cycle_id', $rows->pluck('id'))->whereIn('type', PostSaleService::ACTIONS)->get()->groupBy('cycle_id');

        return response()->json($rows->map(function ($row) use ($actions) {
            $eligibleAt = Carbon::parse($row->eligible_at, config('app.timezone'));
            $row->available = now()->greaterThanOrEqualTo($eligibleAt);
            // SQL datetime values have no timezone. Include the offset so browsers
            // calculate the remaining seven days from the same instant as Laravel.
            $row->eligible_at = $eligibleAt->toIso8601String();
            $row->actions = $actions->get($row->id, collect())->mapWithKeys(fn ($action) => [$action->type => ['id' => $action->id, 'confirmed_at' => $action->confirmed_at]])->all();
            $row->messages = collect(PostSaleService::ACTIONS)->mapWithKeys(fn ($type) => [$type => $this->message($type)])->all();
            $links = collect($row->messages)->map(fn ($message) => ContactLinks::whatsapp($row->phone, $message));
            $row->whatsapp = $row->available ? $links->all() : $links->map(fn () => null)->all();

            return $row;
        }));
    }

    public function settings(): JsonResponse
    {
        return response()->json([
            'google_review' => self::GOOGLE_REVIEW_URL,
            'instagram' => self::INSTAGRAM_URL,
            'post_sale_google' => self::MESSAGES['google'],
            'post_sale_instagram' => self::MESSAGES['instagram'],
            'editable' => false,
        ]);
    }

    public function updateSettings(): JsonResponse
    {
        return response()->json([
            'message' => 'As mensagens de Pós-Venda são fixas e não podem ser editadas.',
        ], 405);
    }

    public function confirm(Request $request, int $cycle, string $type, NotificationService $notifications): JsonResponse
    {
        abort_unless(in_array($type, PostSaleService::ACTIONS, true), 404);
        $record = DB::table('post_sale_cycles as cycles')->join('clients', 'clients.id', '=', 'cycles.client_id')->where('cycles.id', $cycle)->where('cycles.active', true)->select('cycles.*', 'clients.name')->first();
        abort_unless($record, 404);
        abort_if(now()->lessThan($record->eligible_at), 409, 'O Pós-Venda desta OS será liberado 7 dias após a conclusão.');
        $message = $this->message($type);
        $updated = DB::table('post_sale_actions')->where('cycle_id', $cycle)->where('type', $type)->whereNull('confirmed_at')->update(['confirmed_at' => now(), 'confirmed_by' => $request->user()->id, 'message_snapshot' => $message, 'updated_at' => now()]);
        abort_unless($updated === 1, 409, 'Esta mensagem já foi confirmada como enviada.');
        DB::table('audit_logs')->insert(['user_id' => $request->user()->id, 'action' => 'post_sale.confirmed', 'subject_type' => 'post_sale_cycle', 'subject_id' => $cycle, 'after' => json_encode(['type' => $type, 'message_snapshot' => $message]), 'ip_address' => $request->ip(), 'created_at' => now()]);
        if (! DB::table('post_sale_actions')->where('cycle_id', $cycle)->whereIn('type', PostSaleService::ACTIONS)->whereNull('confirmed_at')->exists()) {
            $notifications->resolve("post-sale:$cycle");
        }

        return response()->json(['confirmed_at' => now()->toIso8601String()]);
    }

    public function destroy(Request $request, int $cycle, NotificationService $notifications): JsonResponse
    {
        DB::transaction(function () use ($request, $cycle) {
            $record = DB::table('post_sale_cycles')
                ->where('id', $cycle)
                ->where('active', true)
                ->lockForUpdate()
                ->first();
            abort_unless($record, 404, 'Este card de Pós-Venda não está mais disponível.');

            DB::table('post_sale_cycles')->where('id', $record->id)->update([
                'active' => false,
                'archived_at' => now(),
                'archive_reason' => PostSaleService::MANUAL_EXCLUSION_REASON,
                'updated_at' => now(),
            ]);
            DB::table('audit_logs')->insert([
                'user_id' => $request->user()->id,
                'action' => 'post_sale.card_deleted',
                'subject_type' => 'post_sale_cycle',
                'subject_id' => $record->id,
                'before' => json_encode(['active' => true, 'service_order_id' => $record->service_order_id]),
                'after' => json_encode([
                    'active' => false,
                    'archive_reason' => PostSaleService::MANUAL_EXCLUSION_REASON,
                    'service_order_preserved' => true,
                    'actions_preserved' => true,
                ]),
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        });

        $notifications->resolve("post-sale:$cycle");

        return response()->json(['deleted' => true, 'id' => $cycle]);
    }

    private function message(string $type): string
    {
        abort_unless(array_key_exists($type, self::MESSAGES), 404);

        return self::MESSAGES[$type];
    }
}
