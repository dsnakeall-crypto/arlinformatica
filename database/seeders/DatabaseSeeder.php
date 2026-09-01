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
        } DB::table('settings')->updateOrInsert(['key' => 'instagram'], ['value' => 'https://www.instagram.com/allanluttembarck', 'type' => 'url', 'created_at' => $now, 'updated_at' => $now]);
        DB::table('settings')->updateOrInsert(['key' => 'google_review'], ['value' => 'https://g.page/r/CSxkz5Y88MaJEBM/review', 'type' => 'url', 'created_at' => $now, 'updated_at' => $now]);
        DB::table('versioned_templates')->updateOrInsert(['type' => 'term', 'name' => 'Termo de recebimento', 'version' => 1], ['body' => "O cliente declara estar ciente de que o equipamento permanecerá sob responsabilidade da assistência durante o período necessário para diagnóstico ou reparo.\n\nApós a comunicação de que o equipamento está disponível para retirada, recomenda-se a retirada em até 30 dias corridos.\n\nCaso o equipamento não seja retirado, a assistência poderá realizar novas tentativas de contato e adotar as medidas legais cabíveis para cobrança de valores ou despesas de guarda.\n\nO simples decurso do prazo não transfere a propriedade do equipamento para a assistência, nem autoriza automaticamente sua venda, doação ou descarte.\n\nAo aceitar este termo, o cliente confirma que leu e concorda com as condições acima.", 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
    }
}
