<?php

namespace Tests\Unit;

use App\Services\OfficialLetterhead;
use PHPUnit\Framework\TestCase;

class OfficialLetterheadTest extends TestCase
{
    public function test_official_asset_has_expected_dimensions_and_checksum(): void
    {
        $path = dirname(__DIR__, 2).'/resources/images/documents/papel-timbrado.png';
        $size = getimagesize($path);

        $this->assertSame([OfficialLetterhead::WIDTH, OfficialLetterhead::HEIGHT], [$size[0], $size[1]]);
        $this->assertSame(OfficialLetterhead::SHA256, hash_file('sha256', $path));
        $this->assertSame($path, OfficialLetterhead::path());
    }
}
