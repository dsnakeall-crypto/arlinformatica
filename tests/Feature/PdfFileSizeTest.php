<?php

namespace Tests\Feature;

use App\Services\DocumentService;
use App\Services\PdfPhotoOptimizer;
use Tests\TestCase;

class PdfFileSizeTest extends TestCase
{
    public function test_final_pdf_with_five_photos_stays_below_four_hundred_kilobytes(): void
    {
        $photos = [];
        for ($index = 0; $index < 5; $index++) {
            $photos[] = app(PdfPhotoOptimizer::class)->fromBytes($this->jpeg($index));
        }

        $bytes = app(DocumentService::class)->render('final', [
            'company' => ['theme_primary' => '#C9001C', 'theme_accent' => '#FF2443'],
            'order' => $this->order(),
            'finalization' => [
                'completed_at' => '2026-09-21 15:00:00',
                'technical_report' => 'Equipamento revisado, reparado e testado com sucesso.',
                'subtotal_cents' => 15000,
                'discount_cents' => 0,
                'total_cents' => 15000,
            ],
            'items' => [[
                'description' => 'Manutenção preventiva e testes',
                'quantity' => 1,
                'unit_price_cents' => 15000,
                'subtotal_cents' => 15000,
                'warranty_snapshot' => null,
            ]],
            'result_label' => 'Reparo realizado',
            'photos' => $photos,
            'technical_signature' => null,
            'show_item_warranties' => false,
        ]);

        $this->assertLessThanOrEqual(400 * 1024, strlen($bytes));
        $this->assertStringContainsString('/DCTDecode', $bytes);
        $this->assertStringNotContainsString('/SMask', $bytes);
    }

    public function test_budget_pdf_stays_below_two_hundred_kilobytes(): void
    {
        $bytes = app(DocumentService::class)->render('budget', [
            'company' => ['theme_primary' => '#C9001C', 'theme_accent' => '#FF2443'],
            'order' => $this->order(),
            'budget' => [
                'revision' => 1,
                'diagnosis' => 'Falha de inicialização após atualização.',
                'proposal' => 'Reparo do sistema e validação completa.',
                'institutional_text' => 'Orçamento válido conforme condições apresentadas.',
                'validity_days' => 7,
                'observation' => 'Valores expressos em reais.',
                'total_cents' => 15000,
            ],
            'items' => [[
                'description' => 'Manutenção do sistema',
                'quantity' => 1,
                'unit_price_cents' => 15000,
                'subtotal_cents' => 15000,
                'warranty_snapshot' => null,
            ]],
        ]);

        $this->assertLessThanOrEqual(200 * 1024, strlen($bytes));
    }

    private function order(): array
    {
        return [
            'number' => '0000001',
            'received_at' => '2026-09-21 10:00:00',
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
            'snapshot' => ['equipment' => ['name' => 'Notebook', 'details' => 'Modelo de teste']],
        ];
    }

    private function jpeg(int $seed): string
    {
        $image = imagecreatetruecolor(400, 400);
        for ($y = 0; $y < 400; $y++) {
            for ($x = 0; $x < 400; $x++) {
                $red = ($x * 11 + $y * 3 + $seed * 37) % 256;
                $green = ($x * 5 + $y * 13 + $seed * 53) % 256;
                $blue = ($x * 17 + $y * 7 + $seed * 71) % 256;
                imagesetpixel($image, $x, $y, ($red << 16) | ($green << 8) | $blue);
            }
        }
        ob_start();
        imagejpeg($image, null, 80);
        $bytes = (string) ob_get_clean();
        imagedestroy($image);

        return $bytes;
    }
}
