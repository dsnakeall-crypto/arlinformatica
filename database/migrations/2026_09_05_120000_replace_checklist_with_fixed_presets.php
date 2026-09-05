<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        $presets = [
            ['types' => ['Notebook', 'Mac Apple'], 'labels' => [
                'Carcaça Trincada',
                'Carcaça Amassada',
                'Cantos Quebrados',
                'Tampa Riscada',
                'Base Desgastada',
                'Parafusos Faltando',
                'Pé de Borracha Faltando',
                'Teclas Faltando',
                'Teclas Afundadas / Presas',
                'Touchpad Riscado ou Rachado',
                'Botão Power Quebrado / Afundado',
                'Dobradiça Solta / Folgada',
                'Dobradiça Dura / Travada',
                'Plástico da Dobradiça Quebrado',
            ]],
            ['types' => ['Computador'], 'labels' => [
                'Painel Lateral Amassado',
                'Vidro Temperado Trincado',
                'Tampa Frontal Solta',
                'Botões do Painel Quebrados',
                'Sinais de Oxidação',
                'Marcas de Derramamento de Líquido',
            ]],
            ['types' => ['Impressora'], 'labels' => [
                'Carcaça Trincada / Quebrada',
                'Tampas / Portas Soltas',
                'Bandeja de Papel Quebrada',
                'Bandeja de Saída Faltando',
                'Vidro do Scanner Riscado',
                'Vidro do Scanner Trincado',
                'Trava de Papel Quebrada',
                'Painel Digital Riscado / Trincado',
                'Botões do Painel Afundados',
                'Entrada USB / Rede Danificada',
                'Conector de Energia Folgado',
                'Marcas de Vazamento de Tinta',
                'Carcaça Manchada de Tinta',
                'Suporte de Cartucho / Cabeçote Solto',
                'Rolo Compressor / Tracionador Desgastado',
            ]],
            ['types' => ['Tablet', 'iPad'], 'labels' => [
                'Tela Trincada',
                'Riscos no Display',
                'Carcaça / Traseira Amassada',
                'Cantos Amassados / Raspados',
                'Vidro da Câmera Riscado / Trincado',
                'Bateria Visivelmente Estufada',
                'Conector do Carregador Quebrado',
                'Conector de Carga Com Sujeira / Obstruído',
                'Botão Power Afundado',
                'Botões de Volume Presos',
                'Entrada de Fone (P2) Danificada',
                'Grade dos Alto-Falantes Amassada',
                'Smart Connector / Pinos Danificados',
                'Selo / Adesivo de Vedação Solto',
                'Carcaça Empenada / Torta',
            ]],
        ];

        foreach ($presets as $preset) {
            foreach ($preset['types'] as $typeName) {
                $equipmentId = DB::table('equipment_types')->where('name', $typeName)->value('id');
                if (! $equipmentId) {
                    continue;
                }

                DB::table('checklist_templates')
                    ->where('equipment_type_id', $equipmentId)
                    ->update(['active' => false, 'updated_at' => $now]);

                foreach ($preset['labels'] as $position => $label) {
                    DB::table('checklist_templates')->updateOrInsert(
                        ['equipment_type_id' => $equipmentId, 'label' => $label],
                        [
                            'allows_note' => false,
                            'active' => true,
                            'position' => $position,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ],
                    );
                }
            }
        }
    }

    public function down(): void
    {
        // Checklist já pode estar referenciado por OS históricas; rollback não remove registros.
    }
};
