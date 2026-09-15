<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class CompanySettings
{
    public const DEFAULTS = [
        'company_name' => 'ARL Informática', 'trade_name' => 'ARL Informática', 'cnpj' => '18588208000139', 'phone' => '35988285777', 'email' => 'arlinfocg@gmail.com',
        'postal_code' => '37160000', 'street' => 'Rua Nossa Senhora do Carmo', 'number' => '331', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG', 'complement' => '',
        'instagram' => 'https://www.instagram.com/allanluttembarck', 'google_review' => 'https://g.page/r/CSxkz5Y88MaJEBM/review',
        'budget_validity_days' => '7', 'budget_observation' => '',
        'budget_institutional_text' => 'Após análise técnica do equipamento acima identificado, foram constatados os serviços e/ou componentes descritos neste orçamento. A execução será realizada mediante aprovação do cliente.',
        'theme_primary' => '#C9001C', 'theme_sidebar' => '#09080A', 'theme_accent' => '#FF2443',
        'warranty_general_enabled' => '0', 'warranty_general_text' => '', 'show_company_document' => '1', 'show_company_address' => '1',
        'order_opened_whatsapp' => "Olá {{nome_cliente}}, seu chamado foi aberto com o número {{numero_os}}.\n\nLogo avaliaremos seu item e notificaremos novas atualizações do andamento do serviço.\n\nARL Informática",
        'post_sale_follow_up' => "Olá, {{nome_cliente}}.\n\nPassando para saber se está tudo certo com o equipamento e se o serviço está funcionando normalmente.\n\nSe tiver qualquer dúvida ou precisar de ajuda, pode entrar em contato com a ARL Informática.",
        'post_sale_google' => "Olá, {{nome_cliente}}\n\nPoderia avaliar a ARL Informática no Google?\nLeva 10 segundos:\n\nBasta clicar no link e dar sua avaliação =))\n\n{{link_google}}",
        'post_sale_instagram' => "Olá, {{nome_cliente}} 😊\n\nAcompanhe a ARL Informática no Instagram para ver dicas, novidades e nosso trabalho:\n\n{{instagram}}\n\nSerá um prazer ter você por lá!",
    ];

    public function all(): array
    {
        $values = array_replace(self::DEFAULTS, DB::table('settings')->pluck('value', 'key')->all());
        unset($values['layout_mode']);
        $values['term_text'] = (string) DB::table('versioned_templates')->where('type', 'term')->where('active', true)->latest('version')->value('body');

        return $values;
    }

    public function theme(): array
    {
        return [
            'theme_primary' => self::DEFAULTS['theme_primary'],
            'theme_sidebar' => self::DEFAULTS['theme_sidebar'],
            'theme_accent' => self::DEFAULTS['theme_accent'],
        ];
    }

    public function snapshot(): array
    {
        $values = $this->all();
        $values['logo'] = DB::table('settings')->where('key', 'logo_budget')->value('value');

        return $values;
    }
}
