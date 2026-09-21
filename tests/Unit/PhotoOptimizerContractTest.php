<?php

namespace Tests\Unit;

use App\Services\PhotoOptimizer;
use Illuminate\Http\UploadedFile;
use PHPUnit\Framework\TestCase;

class PhotoOptimizerContractTest extends TestCase
{
    public function test_storage_limit_is_exactly_one_hundred_kilobytes(): void
    {
        $this->assertSame(100 * 1024, PhotoOptimizer::MAX_BYTES);
    }

    public function test_photo_is_center_cropped_and_saved_as_four_hundred_pixel_jpeg(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'photo-');
        $source = imagecreatetruecolor(800, 500);
        imagealphablending($source, false);
        imagesavealpha($source, true);
        imagefill($source, 0, 0, imagecolorallocatealpha($source, 255, 255, 255, 127));
        imagefilledrectangle($source, 250, 0, 549, 499, imagecolorallocatealpha($source, 20, 80, 140, 0));
        imagepng($source, $path);
        imagedestroy($source);

        $bytes = (new PhotoOptimizer)->optimize(new UploadedFile($path, 'foto.png', 'image/png', null, true));
        @unlink($path);
        $info = getimagesizefromstring($bytes);

        $this->assertSame('image/jpeg', $info['mime']);
        $this->assertSame(PhotoOptimizer::SIZE, $info[0]);
        $this->assertSame(PhotoOptimizer::SIZE, $info[1]);
        $this->assertLessThanOrEqual(PhotoOptimizer::MAX_BYTES, strlen($bytes));
    }
}
