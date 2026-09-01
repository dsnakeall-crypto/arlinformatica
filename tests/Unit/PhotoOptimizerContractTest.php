<?php

namespace Tests\Unit;

use App\Services\PhotoOptimizer;
use PHPUnit\Framework\TestCase;

class PhotoOptimizerContractTest extends TestCase
{
    public function test_storage_limit_is_exactly_one_hundred_kilobytes(): void
    {
        $this->assertSame(100 * 1024, PhotoOptimizer::MAX_BYTES);
    }
}
