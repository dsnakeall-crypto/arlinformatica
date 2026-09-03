<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class CompanySettings
{
    public const DEFAULTS = [
        'company_name' => 'ARL Informática', 'trade_name' => 'ARL Informática', 'cnpj' => '18588208000139', 'phone' => '35988285777', 'email' => 'arlinfocg@gmail.com',
        'postal_code' => '', 'street' => 'Rua Nossa Senhora do Carmo', 'number' => '331', 'district' => 'Centro', 'city' => 'Campos Gerais', 'state' => 'MG', 'complement' => '',
        'instagram' => 'https://www.instagram.com/arlinformatica/', 'google_review' => 'https://g.page/r/CSxkz5Y88MaJEBM/review',
        'budget_validity_days' => '7', 'budget_observation' => '',
        'budget_institutional_text' => 'Após análise técnica do equipamento acima identificado, foram constatados os serviços e/ou componentes descritos neste orçamento. A execução será realizada mediante aprovação do cliente.',
        'theme_primary' => '#087443', 'theme_sidebar' => '#063B2D', 'theme_accent' => '#28BD65',
        'warranty_general_enabled' => '0', 'warranty_general_text' => '', 'show_company_document' => '1', 'show_company_address' => '1',
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
        $keys = ['theme_primary', 'theme_sidebar', 'theme_accent'];
        $stored = DB::table('settings')->whereIn('key', $keys)->pluck('value', 'key')->all();
        $values = array_replace(self::DEFAULTS, $stored);

        return array_intersect_key($values, array_flip($keys));
    }

    public function snapshot(): array
    {
        $values = $this->all();
        $values['logo'] = DB::table('settings')->where('key', 'logo_budget')->value('value');

        return $values;
    }
}
