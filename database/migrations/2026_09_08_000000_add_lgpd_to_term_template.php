<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const LGPD = 'Os dados pessoais informados serão tratados pela ARL Informática somente para executar o atendimento, manter o histórico da ordem de serviço, cumprir obrigações legais e realizar os contatos necessários, com acesso restrito e armazenamento seguro, nos termos da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018). O titular poderá solicitar informações e exercer seus direitos pelos canais de contato da empresa.';

    public function up(): void
    {
        $current = DB::table('versioned_templates')->where('type', 'term')->where('active', true)->orderByDesc('version')->first();
        if (! $current || str_contains($current->body, self::LGPD)) {
            return;
        }

        DB::transaction(function () use ($current) {
            DB::table('versioned_templates')->where('type', 'term')->update(['active' => false, 'updated_at' => now()]);
            DB::table('versioned_templates')->insert([
                'type' => 'term', 'name' => $current->name, 'version' => $current->version + 1,
                'body' => rtrim($current->body)."\n\n".self::LGPD, 'active' => true,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        });
    }

    public function down(): void
    {
        // Modelos versionados podem estar referenciados por documentos históricos; rollback não os apaga.
    }
};
