<?php

namespace App\Services;

use App\Models\ServiceOrder;
use Illuminate\Support\Facades\DB;

class OpeningMessage
{
    public const INTERNAL = "Olá, {{nome_cliente}}\n\nInformamos que a sua *Ordem de Serviço nº {{numero_os}}* foi aberta com sucesso na *ARL Informática*.\n\nNosso departamento técnico já iniciou os procedimentos necessários. Em breve, entraremos em contato para atualizar o status do serviço e apresentar os detalhes da verificação do seu equipamento.\n\nPermanecemos à disposição para qualquer dúvida.\n\nAtenciosamente,\n\n*ARL Informática*";

    public const EXTERNAL = "Olá, {{nome_cliente}}\n\nInformamos que a sua Ordem de Serviço nº {{numero_os}} foi aberta com sucesso na ARL Informática.\n\nNosso departamento técnico já foi informado do chamado, e logo estará se deslocando para o local agendado do atendimento, avisaremos por este WhatsApp quando estivermos chegando.\n\nPermanecemos à disposição para qualquer dúvida.\n\nAtenciosamente,\n\nARL Informática";

    public function payload(ServiceOrder $order): array
    {
        $keys = ['order_opened_auto_whatsapp', 'order_opened_internal_message', 'order_opened_external_message', 'trade_name', 'company_name'];
        $settings = array_replace(
            array_intersect_key(CompanySettings::DEFAULTS, array_flip($keys)),
            DB::table('settings')->whereIn('key', $keys)->pluck('value', 'key')->all(),
        );
        $key = $order->attendance_type === 'external' ? 'order_opened_external_message' : 'order_opened_internal_message';
        $message = strtr($settings[$key], [
            '{{nome_cliente}}' => (string) $order->client->name,
            '{{numero_os}}' => (string) $order->number,
            '{{empresa}}' => (string) ($settings['trade_name'] ?: $settings['company_name']),
        ]);
        $condition = trim((string) $order->intake_condition);
        if ($condition === '' && $order->checklists->isNotEmpty()) {
            $condition = $order->checklists->map(fn ($check) => $check->label.($check->note ? ': '.$check->note : ''))->implode("\n");
        }
        if ($condition !== '') {
            $message .= "\n\nEstado físico registrado na abertura:\n".$condition;
        }
        $phone = preg_replace('/\D/', '', (string) $order->client->phone);

        return [
            'auto_open' => filter_var($settings['order_opened_auto_whatsapp'], FILTER_VALIDATE_BOOL),
            'url' => strlen($phone) >= 10 ? ContactLinks::whatsapp($phone, $message) : null,
        ];
    }
}
