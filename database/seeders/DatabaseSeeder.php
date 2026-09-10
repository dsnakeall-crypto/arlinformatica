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
        } foreach (['Computador', 'Notebook', 'Impressora', 'Tablet', 'Mac Apple', 'iPad'] as $name) {
            DB::table('equipment_types')->updateOrInsert(['name' => $name], ['active' => true, 'created_at' => $now, 'updated_at' => $now]);
        } foreach (['Acer', 'Apple', 'ASUS', 'Avell', 'Brother', 'Canon', 'Compaq', 'Dell', 'Epson', 'Gigabyte', 'HP', 'Huawei', 'Lenovo', 'Lexmark', 'LG', 'Microsoft', 'Motorola', 'MSI', 'Multi', 'Philco', 'Positivo', 'Razer', 'Samsung', 'Toshiba', 'VAIO', 'Xerox', 'Xiaomi'] as $name) {
            DB::table('manufacturers')->updateOrInsert(['name' => $name], ['active' => true, 'created_at' => $now, 'updated_at' => $now]);
        }
        $groups = [
            [['Notebook', 'Mac Apple'], [
                'Carcaça Trincada', 'Carcaça Amassada', 'Cantos Quebrados', 'Tampa Riscada', 'Base Desgastada',
                'Parafusos Faltando', 'Pé de Borracha Faltando', 'Teclas Faltando', 'Teclas Afundadas / Presas',
                'Touchpad Riscado ou Rachado', 'Botão Power Quebrado / Afundado', 'Dobradiça Solta / Folgada',
                'Dobradiça Dura / Travada', 'Plástico da Dobradiça Quebrado',
            ]],
            [['Computador'], [
                'Painel Lateral Amassado', 'Vidro Temperado Trincado', 'Tampa Frontal Solta',
                'Botões do Painel Quebrados', 'Sinais de Oxidação', 'Marcas de Derramamento de Líquido',
            ]],
            [['Impressora'], [
                'Carcaça Trincada / Quebrada', 'Tampas / Portas Soltas', 'Bandeja de Papel Quebrada',
                'Bandeja de Saída Faltando', 'Vidro do Scanner Riscado', 'Vidro do Scanner Trincado',
                'Trava de Papel Quebrada', 'Painel Digital Riscado / Trincado', 'Botões do Painel Afundados',
                'Entrada USB / Rede Danificada', 'Conector de Energia Folgado', 'Marcas de Vazamento de Tinta',
                'Carcaça Manchada de Tinta', 'Suporte de Cartucho / Cabeçote Solto',
                'Rolo Compressor / Tracionador Desgastado',
            ]],
            [['Tablet', 'iPad'], [
                'Tela Trincada', 'Riscos no Display', 'Carcaça / Traseira Amassada', 'Cantos Amassados / Raspados',
                'Vidro da Câmera Riscado / Trincado', 'Bateria Visivelmente Estufada',
                'Conector do Carregador Quebrado', 'Conector de Carga Com Sujeira / Obstruído',
                'Botão Power Afundado', 'Botões de Volume Presos', 'Entrada de Fone (P2) Danificada',
                'Grade dos Alto-Falantes Amassada', 'Smart Connector / Pinos Danificados',
                'Selo / Adesivo de Vedação Solto', 'Carcaça Empenada / Torta',
            ]],
        ];
        foreach ($groups as [$types, $labels]) {
            foreach ($types as $type) {
                $equipmentId = DB::table('equipment_types')->where('name', $type)->value('id');
                foreach ($labels as $position => $label) {
                    DB::table('checklist_templates')->updateOrInsert(
                        ['equipment_type_id' => $equipmentId, 'label' => $label],
                        ['allows_note' => false, 'active' => true, 'position' => $position, 'created_at' => $now, 'updated_at' => $now],
                    );
                }
            }
        }
        DB::table('settings')->updateOrInsert(['key' => 'instagram'], ['value' => 'https://www.instagram.com/allanluttembarck', 'type' => 'url', 'created_at' => $now, 'updated_at' => $now]);
        DB::table('settings')->updateOrInsert(['key' => 'google_review'], ['value' => 'https://g.page/r/CSxkz5Y88MaJEBM/review', 'type' => 'url', 'created_at' => $now, 'updated_at' => $now]);
        DB::table('settings')->updateOrInsert(['key' => 'postal_code'], ['value' => '37160000', 'type' => 'string', 'created_at' => $now, 'updated_at' => $now]);
        DB::table('versioned_templates')->updateOrInsert(['type' => 'term', 'name' => 'Termo de recebimento', 'version' => 1], ['body' => "O cliente declara estar ciente de que o equipamento permanecerá sob responsabilidade da assistência durante o período necessário para diagnóstico ou reparo.\n\nApós a comunicação de que o equipamento está disponível para retirada, recomenda-se a retirada em até 30 dias corridos.\n\nCaso o equipamento não seja retirado, a assistência poderá realizar novas tentativas de contato e adotar as medidas legais cabíveis para cobrança de valores ou despesas de guarda.\n\nO simples decurso do prazo não transfere a propriedade do equipamento para a assistência, nem autoriza automaticamente sua venda, doação ou descarte.\n\nAo aceitar este termo, o cliente confirma que leu e concorda com as condições acima.\n\nOs dados pessoais informados serão tratados pela ARL Informática somente para executar o atendimento, manter o histórico da ordem de serviço, cumprir obrigações legais e realizar os contatos necessários, com acesso restrito e armazenamento seguro, nos termos da Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018). O titular poderá solicitar informações e exercer seus direitos pelos canais de contato da empresa.", 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
        foreach ([
            ['Laudo Técnico Geral', 'general'], ['Laudo de Dano Elétrico', 'electrical'], ['Equipamento Irreparável', 'general'],
            ['Reparo Economicamente Inviável', 'general'], ['Inspeção / Estado do Equipamento', 'general'], ['Pós-Reparo', 'general'],
        ] as [$name, $kind]) {
            DB::table('technical_report_templates')->updateOrInsert(['name' => $name], ['kind' => $kind, 'body' => 'Modelo editável. O conteúdo técnico deve ser preenchido e confirmado pelo profissional responsável.', 'active' => true, 'used' => false, 'created_at' => $now, 'updated_at' => $now]);
        }
    }
}
