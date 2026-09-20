<?php

namespace Tests\Feature;

use Tests\TestCase;

class FinalDocumentTimezoneTest extends TestCase
{
    public function test_final_document_normalizes_mixed_timestamp_formats_to_sao_paulo(): void
    {
        config(['app.timezone' => 'America/Sao_Paulo']);

        $html = view('documents.final', [
            'company' => [
                'company_name' => 'ARL Informática',
                'street' => 'Rua Teste',
                'number' => '1',
                'district' => 'Centro',
                'city' => 'Campos Gerais',
                'state' => 'MG',
                'postal_code' => '37160000',
                'cnpj' => '',
                'phone' => '35999999999',
                'email' => '',
                'instagram' => '',
                'logo' => null,
                'warranty_general_enabled' => '0',
            ],
            'order' => [
                'number' => '0000001',
                // Formato ISO/UTC produzido pela serialização do model.
                'received_at' => '2026-09-04T15:40:46.000000Z',
                'client' => [
                    'name' => 'Cliente Teste',
                    'document' => '00000000000',
                    'phone' => '35999999999',
                    'street' => 'Rua Cliente',
                    'number' => '10',
                    'district' => 'Centro',
                    'city' => 'Campos Gerais',
                    'state' => 'MG',
                    'postal_code' => '37160000',
                ],
                'snapshot' => ['equipment' => ['name' => 'Notebook']],
                'attendance_type' => 'bench',
                'reported_problem' => 'Teste',
                'checklists' => [],
            ],
            'finalization' => [
                // Formato local/sem offset retornado diretamente pelo banco.
                'completed_at' => '2026-09-04 15:03:30',
                'technical_report' => 'Atendimento concluído.',
                'subtotal_cents' => 0,
                'discount_cents' => 0,
                'total_cents' => 0,
            ],
            'items' => [],
            'result_label' => 'Sem defeito constatado',
            'photos' => [],
        ])->render();

        $this->assertStringContainsString('<b>ENTRADA</b>04/09/2026 12:40', $html);
        $this->assertStringContainsString('<b>SAÍDA</b>04/09/2026 15:03', $html);
    }
}
