<?php

namespace App\Services;

use App\Models\ServiceOrderPhoto;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

final class PdfPhotoOptimizer
{
    public const MAX_DIMENSION = 400;

    public const QUALITY = 80;

    /** @return array{mime: string, data: string} */
    public function fromStoredPhoto(ServiceOrderPhoto $photo): array
    {
        $bytes = Storage::disk($photo->disk)->get($photo->path);
        $source = @imagecreatefromstring($bytes);
        if (! $source) {
            throw ValidationException::withMessages(['photos' => 'Uma das fotos da OS não pôde ser preparada para o PDF.']);
        }

        $sourceWidth = imagesx($source);
        $sourceHeight = imagesy($source);
        $scale = min(1, self::MAX_DIMENSION / max($sourceWidth, $sourceHeight));
        $width = max(1, (int) round($sourceWidth * $scale));
        $height = max(1, (int) round($sourceHeight * $scale));
        $output = imagecreatetruecolor($width, $height);
        imagefill($output, 0, 0, imagecolorallocate($output, 255, 255, 255));
        imagecopyresampled($output, $source, 0, 0, 0, 0, $width, $height, $sourceWidth, $sourceHeight);
        imagedestroy($source);

        ob_start();
        imagejpeg($output, null, self::QUALITY);
        $jpeg = (string) ob_get_clean();
        imagedestroy($output);

        if ($jpeg === '') {
            throw ValidationException::withMessages(['photos' => 'Uma das fotos da OS não pôde ser preparada para o PDF.']);
        }

        return ['mime' => 'image/jpeg', 'data' => base64_encode($jpeg)];
    }
}
