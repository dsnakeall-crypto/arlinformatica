<?php

namespace Tests\Unit;

use App\Services\DocumentValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class DocumentValidatorTest extends TestCase
{
    #[DataProvider('validDocuments')]
    public function test_validates_and_normalizes_documents(string $formatted, string $normalized): void
    {
        $this->assertTrue(DocumentValidator::valid($formatted));
        $this->assertSame($normalized, DocumentValidator::normalize($formatted));
    }

    public static function validDocuments(): array
    {
        return [['529.982.247-25', '52998224725'], ['04.252.011/0001-10', '04252011000110']];
    }

    #[DataProvider('invalidDocuments')]
    public function test_rejects_invalid_documents(string $document): void
    {
        $this->assertFalse(DocumentValidator::valid($document));
    }

    public static function invalidDocuments(): array
    {
        return [['111.111.111-11'], ['123'], ['04.252.011/0001-11']];
    }
}
