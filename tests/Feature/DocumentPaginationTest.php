<?php

namespace Tests\Feature;

use Barryvdh\DomPDF\Facade\Pdf;
use Tests\TestCase;

class DocumentPaginationTest extends TestCase
{
    public function test_short_final_document_stays_on_one_page(): void
    {
        $pdf = Pdf::loadView('documents.final', $this->documentData(1))->setPaper('a4');
        $pdf->render();
        $html = view('documents.final', $this->documentData(1))->render();

        $this->assertSame(1, $pdf->getDomPDF()->getCanvas()->get_page_count());
        $this->assertStringContainsString('official-letterhead', $html);
        $this->assertStringContainsString('.dates-line{width:100%;table-layout:fixed', $html);
        $this->assertStringContainsString('.two-column{width:calc(100% + 10px);table-layout:fixed', $html);
        $this->assertSame(1, substr_count($html, '<table class="two-column">'));
        $this->assertStringContainsString('<p class="equipment-line"><strong>Notebook</strong><span class="equipment-details">carregador e capa cinza</span></p>', $html);
        $this->assertStringContainsString('<div class="equipment-condition"><div class="section-title">Estado físico na entrada</div>', $html);
        $this->assertStringContainsString('<div class="full-box problem-box"><div class="section-title">Problema relatado</div>', $html);
        $this->assertStringContainsString('<div class="full-box technical-report-box"><div class="section-title">Laudo técnico / descrição do atendimento</div>', $html);
        $this->assertLessThan(strpos($html, 'technical-report-box'), strpos($html, 'problem-box'));
        $this->assertStringNotContainsString('Resultado:', $html);
        $this->assertStringContainsString('class="grand-total-row"', $html);
        $this->assertStringContainsString('background:#FFF3BF;border-top:1px solid #C9001C', $html);
    }

    public function test_long_final_document_uses_multiple_pages(): void
    {
        $pdf = Pdf::loadView('documents.final', $this->documentData(80))->setPaper('a4');
        $pdf->render();

        $this->assertGreaterThan(1, $pdf->getDomPDF()->getCanvas()->get_page_count());
    }

    private function documentData(int $itemCount): array
    {
        $items = [];
        for ($index = 1; $index <= $itemCount; $index++) {
            $items[] = [
                'description' => "Serviço detalhado {$index} com descrição suficiente para validar a quebra de página",
                'quantity' => 1,
                'unit_price_cents' => 1000,
                'subtotal_cents' => 1000,
                'warranty_snapshot' => null,
            ];
        }

        return [
            'company' => ['theme_primary' => '#087443', 'theme_accent' => '#28BD65'],
            'order' => [
                'number' => '0099999',
                'received_at' => '2026-09-20 10:00:00',
                'attendance_type' => 'bench',
                'reported_problem' => 'Equipamento não inicializa.',
                'intake_condition' => 'Equipamento sem avarias aparentes.',
                'client' => [
                    'name' => 'Cliente de validação',
                    'document' => '52998224725',
                    'phone' => '35999999999',
                    'street' => 'Rua Principal',
                    'number' => '10',
                    'district' => 'Centro',
                    'city' => 'Campos Gerais',
                    'state' => 'MG',
                    'postal_code' => '37160000',
                ],
                'snapshot' => ['equipment' => ['name' => 'Notebook', 'details' => 'carregador e capa cinza']],
            ],
            'finalization' => [
                'completed_at' => '2026-09-20 15:00:00',
                'technical_report' => 'Equipamento revisado, reparado e testado com sucesso.',
                'subtotal_cents' => $itemCount * 1000,
                'discount_cents' => 0,
                'total_cents' => $itemCount * 1000,
            ],
            'items' => $items,
            'result_label' => 'Reparo realizado',
            'photos' => [],
            'technical_signature' => null,
            'show_item_warranties' => false,
        ];
    }
}
