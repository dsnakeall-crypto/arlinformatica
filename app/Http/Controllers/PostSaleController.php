<?php

namespace App\Http\Controllers;

use App\Services\CompanySettings;
use App\Services\ContactLinks;
use App\Services\NotificationService;
use App\Services\PostSaleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PostSaleController extends Controller
{
    public function index(PostSaleService $service, CompanySettings $settings): JsonResponse
    {
        // Sem throttle aqui: ao entrar no Pós-Venda, uma OS recém-concluída deve aparecer imediatamente.
        $service->catchUp();
        $configuration = $settings->all();
        $rows = DB::table('post_sale_cycles as cycles')
            ->join('service_orders as orders', 'orders.id', '=', 'cycles.service_order_id')
            ->join('clients', 'clients.id', '=', 'cycles.client_id')
            ->where('cycles.active', true)
            ->select('cycles.id', 'cycles.eligible_at', 'orders.number', 'clients.name', 'clients.phone')
            ->orderBy('cycles.eligible_at')
            ->get();
        $actions = DB::table('post_sale_actions')->whereIn('cycle_id', $rows->pluck('id'))->get()->groupBy('cycle_id');

        return response()->json($rows->map(function ($row) use ($actions, $configuration) {
            $row->available = now()->greaterThanOrEqualTo($row->eligible_at);
            $row->actions = $actions->get($row->id, collect())->mapWithKeys(fn ($action) => [$action->type => ['id' => $action->id, 'confirmed_at' => $action->confirmed_at]])->all();
            $row->messages = collect(PostSaleService::ACTIONS)->mapWithKeys(fn ($type) => [$type => $this->message($type, $row->name, $configuration)])->all();
            $links = collect($row->messages)->map(fn ($message) => ContactLinks::whatsapp($row->phone, $message));
            $row->whatsapp = $row->available ? $links->all() : $links->map(fn () => null)->all();

            return $row;
        }));
    }

    public function settings(CompanySettings $settings): JsonResponse
    {
        $configuration = $settings->all();

        return response()->json([
            'google_review' => (string) $configuration['google_review'],
            'post_sale_follow_up' => (string) $configuration['post_sale_follow_up'],
            'post_sale_google' => (string) $configuration['post_sale_google'],
            'post_sale_instagram' => (string) $configuration['post_sale_instagram'],
        ]);
    }

    public function updateSettings(Request $request, CompanySettings $settings): JsonResponse
    {
        $data = $request->validate([
            'post_sale_follow_up' => ['required', 'string', 'max:5000'],
            'post_sale_google' => ['required', 'string', 'max:5000'],
            'post_sale_instagram' => ['required', 'string', 'max:5000'],
        ]);

        DB::transaction(function () use ($data, $request) {
            foreach ($data as $key => $value) {
                DB::table('settings')->updateOrInsert(
                    ['key' => $key],
                    ['value' => $value, 'updated_at' => now(), 'created_at' => now()]
                );
            }
            DB::table('audit_logs')->insert([
                'user_id' => $request->user()->id,
                'action' => 'post_sale.settings_updated',
                'subject_type' => 'settings',
                'after' => json_encode($data),
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);
        });

        return $this->settings($settings);
    }

    public function confirm(Request $request, int $cycle, string $type, CompanySettings $settings, NotificationService $notifications): JsonResponse
    {
        abort_unless(in_array($type, PostSaleService::ACTIONS, true), 404);
        $configuration = $settings->all();
        $record = DB::table('post_sale_cycles as cycles')->join('clients', 'clients.id', '=', 'cycles.client_id')->where('cycles.id', $cycle)->where('cycles.active', true)->select('cycles.*', 'clients.name')->first();
        abort_unless($record, 404);
        abort_if(now()->lessThan($record->eligible_at), 409, 'O Pós-Venda desta OS será liberado 24 horas após a conclusão.');
        $message = $this->message($type, $record->name, $configuration);
        $updated = DB::table('post_sale_actions')->where('cycle_id', $cycle)->where('type', $type)->whereNull('confirmed_at')->update(['confirmed_at' => now(), 'confirmed_by' => $request->user()->id, 'message_snapshot' => $message, 'updated_at' => now()]);
        abort_unless($updated === 1, 409, 'Esta mensagem já foi confirmada como enviada.');
        DB::table('audit_logs')->insert(['user_id' => $request->user()->id, 'action' => 'post_sale.confirmed', 'subject_type' => 'post_sale_cycle', 'subject_id' => $cycle, 'after' => json_encode(['type' => $type, 'message_snapshot' => $message]), 'ip_address' => $request->ip(), 'created_at' => now()]);
        if (! DB::table('post_sale_actions')->where('cycle_id', $cycle)->whereNull('confirmed_at')->exists()) {
            $notifications->resolve("post-sale:$cycle");
        }

        return response()->json(['confirmed_at' => now()->toIso8601String()]);
    }

    private function message(string $type, string $name, array $settings): string
    {
        $defaults = [
            'follow_up' => "Olá, {{nome_cliente}}.\n\nPassando para saber se está tudo certo com o equipamento e se o serviço está funcionando normalmente.\n\nSe tiver qualquer dúvida ou precisar de ajuda, pode entrar em contato com a ARL Informática.",
            'google' => "Olá, {{nome_cliente}}\n\nPoderia avaliar a ARL Informática no Google?\nLeva 10 segundos:\n\nBasta clicar no link e dar sua avaliação =))\n\n{{link_google}}",
            'instagram' => "Olá, {{nome_cliente}} 😊\n\nAcompanhe a ARL Informática no Instagram para ver dicas, novidades e nosso trabalho:\n\n{{instagram}}\n\nSerá um prazer ter você por lá!",
        ];
        $template = $settings["post_sale_$type"] ?? $defaults[$type];

        return strtr($template, ['{{nome_cliente}}' => $name, '{{link_google}}' => $settings['google_review'], '{{instagram}}' => $settings['instagram']]);
    }
}
