<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class CompanySettings
{
    public const DEFAULTS = [
        'company_name' => 'ARL Informática', 'trade_name' => 'ARL Informática', 'cnpj' => '', 'phone' => '', 'email' => '',
        'postal_code' => '', 'street' => '', 'number' => '', 'district' => '', 'city' => '', 'state' => '', 'complement' => '',
        'instagram' => 'https://www.instagram.com/allanluttembarck', 'google_review' => 'https://g.page/r/CSxkz5Y88MaJEBM/review',
        'budget_validity_days' => '7', 'budget_observation' => '',
        'budget_institutional_text' => 'Após análise técnica do equipamento acima identificado, foram constatados os serviços e/ou componentes descritos neste orçamento. A execução será realizada mediante aprovação do cliente.',
        'layout_mode' => 'automatic', 'show_company_document' => '1', 'show_company_address' => '1',
    ];

    public function all(): array
    {
        $values = array_replace(self::DEFAULTS, DB::table('settings')->pluck('value', 'key')->all());
        $values['term_text'] = (string) DB::table('versioned_templates')->where('type', 'term')->where('active', true)->latest('version')->value('body');

        return $values;
    }

    public function snapshot(): array
    {
        $values = $this->all();
        $values['logo'] = DB::table('settings')->where('key', 'logo_budget')->value('value');

        return $values;
    }
}
