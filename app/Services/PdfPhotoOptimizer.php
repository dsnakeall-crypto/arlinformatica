<?php

namespace App\Services;

use App\Models\ServiceOrderPhoto;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

final class PdfPhotoOptimizer
{
    public const MAX_DIMENSION = 400;

    public const QUALITY = 80;

    public const MAX_BYTES = 45 * 1024;

    /** @return array{mime: string, data: string} */
    public function fromStoredPhoto(ServiceOrderPhoto $photo): array
    {
        return $this->fromBytes(Storage::disk($photo->disk)->get($photo->path));
    }

    /** @return array{mime: string, data: string} */
    public function fromBytes(string $bytes): array
    {
        $source = @imagecreatefromstring($bytes);
        if (! $source) {
            throw ValidationException::withMessages(['photos' => 'Uma das fotos da OS não pôde ser preparada para o PDF.']);
        }

        $sourceWidth = imagesx($source);
        $sourceHeight = imagesy($source);
        $jpeg = '';
        for ($maxDimension = self::MAX_DIMENSION; $maxDimension >= 160; $maxDimension -= 40) {
            $scale = min(1, $maxDimension / max($sourceWidth, $sourceHeight));
            $width = max(1, (int) round($sourceWidth * $scale));
            $height = max(1, (int) round($sourceHeight * $scale));
            $output = imagecreatetruecolor($width, $height);
            imagefill($output, 0, 0, imagecolorallocate($output, 255, 255, 255));
            imagecopyresampled($output, $source, 0, 0, 0, 0, $width, $height, $sourceWidth, $sourceHeight);

            for ($quality = self::QUALITY; $quality >= 40; $quality -= 5) {
                ob_start();
                imagejpeg($output, null, $quality);
                $jpeg = (string) ob_get_clean();
                if ($jpeg !== '' && strlen($jpeg) <= self::MAX_BYTES) {
                    imagedestroy($output);
                    imagedestroy($source);

                    return ['mime' => 'image/jpeg', 'data' => base64_encode($jpeg)];
                }
            }
            imagedestroy($output);
        }
        imagedestroy($source);

        throw ValidationException::withMessages(['photos' => 'Uma das fotos da OS não pôde ser preparada para o PDF.']);
    }
}
