<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        foreach (['Master', 'Administrador', 'Funcionário'] as $name) {
            DB::table('roles')->updateOrInsert(['name' => $name], ['permissions' => json_encode($name === 'Master' ? ['*'] : ['orders', 'clients']), 'created_at' => $now, 'updated_at' => $now]);
        } foreach (['Notebook', 'CPU / Computador', 'Tablet', 'Impressora', 'MacBook', 'iPad'] as $name) {
            DB::table('equipment_types')->updateOrInsert(['name' => $name], ['active' => true, 'created_at' => $now, 'updated_at' => $now]);
        } foreach (['Dell', 'ASUS', 'Acer', 'Lenovo', 'HP', 'Apple', 'Samsung', 'Epson', 'Canon', 'Brother', 'Positivo', 'LG', 'Microsoft', 'Xiaomi', 'Motorola'] as $name) {
            DB::table('manufacturers')->updateOrInsert(['name' => $name], ['active' => true, 'created_at' => $now, 'updated_at' => $now]);
        }
        $groups = [
            [['Notebook', 'MacBook'], ['Tela riscada', 'Tela trincada', 'Tela quebrada', 'Carcaça quebrada', 'Carcaça trincada', 'Dobradiça quebrada', 'Dobradiça avariada', 'Carregador com emenda', 'Carregador danificado', 'Outro']],
            [['CPU / Computador'], ['Gabinete amassado', 'Gabinete quebrado', 'Tampa avariada', 'Conector danificado', 'Outro']],
            [['Tablet', 'iPad'], ['Tela riscada', 'Tela trincada', 'Tela quebrada', 'Carcaça amassada', 'Carcaça quebrada', 'Conector danificado', 'Outro']],
            [['Impressora'], ['Carcaça quebrada', 'Carcaça trincada', 'Tampa quebrada', 'Bandeja quebrada', 'Cabo danificado', 'Outro']],
        ];
        foreach ($groups as [$types, $labels]) {
            foreach ($types as $type) {
                $equipmentId = DB::table('equipment_types')->where('name', $type)->value('id');
                foreach ($labels as $label) {
                    DB::table('checklist_templates')->updateOrInsert(['equipment_type_id' => $equipmentId, 'label' => $label], ['allows_note' => $label === 'Outro', 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
                }
            }
        }
        DB::table('settings')->updateOrInsert(['key' => 'instagram'], ['value' => 'https://www.instagram.com/arlinformatica/', 'type' => 'url', 'created_at' => $now, 'updated_at' => $now]);
        DB::table('settings')->updateOrInsert(['key' => 'google_review'], ['value' => 'https://g.page/r/CSxkz5Y88MaJEBM/review', 'type' => 'url', 'created_at' => $now, 'updated_at' => $now]);
        DB::table('versioned_templates')->updateOrInsert(['type' => 'term', 'name' => 'Termo de recebimento', 'version' => 1], ['body' => "O cliente declara estar ciente de que o equipamento permanecerá sob responsabilidade da assistência durante o período necessário para diagnóstico ou reparo.\n\nApós a comunicação de que o equipamento está disponível para retirada, recomenda-se a retirada em até 30 dias corridos.\n\nCaso o equipamento não seja retirado, a assistência poderá realizar novas tentativas de contato e adotar as medidas legais cabíveis para cobrança de valores ou despesas de guarda.\n\nO simples decurso do prazo não transfere a propriedade do equipamento para a assistência, nem autoriza automaticamente sua venda, doação ou descarte.\n\nAo aceitar este termo, o cliente confirma que leu e concorda com as condições acima.", 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
        foreach ([
            ['Laudo Técnico Geral', 'general'], ['Laudo de Dano Elétrico', 'electrical'], ['Equipamento Irreparável', 'general'],
            ['Reparo Economicamente Inviável', 'general'], ['Inspeção / Estado do Equipamento', 'general'], ['Pós-Reparo', 'general'],
        ] as [$name, $kind]) {
            DB::table('technical_report_templates')->updateOrInsert(['name' => $name], ['kind' => $kind, 'body' => 'Modelo editável. O conteúdo técnico deve ser preenchido e confirmado pelo profissional responsável.', 'active' => true, 'used' => false, 'created_at' => $now, 'updated_at' => $now]);
        }
    }
}
