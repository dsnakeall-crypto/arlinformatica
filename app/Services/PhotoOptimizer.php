<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

final class PhotoOptimizer
{
    public const MAX_BYTES = 102400;

    public function optimize(UploadedFile $file): string
    {
        $info = @getimagesize($file->getRealPath());
        if (! $info || ! in_array($info['mime'], ['image/jpeg', 'image/png', 'image/webp'], true)) {
            throw ValidationException::withMessages(['photo' => 'Imagem inválida.']);
        } $image = match ($info['mime']) {
            'image/jpeg' => imagecreatefromjpeg($file->getRealPath()),'image/png' => imagecreatefrompng($file->getRealPath()),default => imagecreatefromwebp($file->getRealPath())
        };
        $scale = min(1, 1280 / max(imagesx($image), imagesy($image)));
        $quality = 82;
        do {
            $w = max(320, (int) (imagesx($image) * $scale));
            $h = max(240, (int) (imagesy($image) * $scale));
            $resized = imagescale($image, $w, $h);
            ob_start();
            imagewebp($resized, null, $quality);
            $data = ob_get_clean();
            imagedestroy($resized);
            $quality -= 8;
            $scale *= .85;
        } while (strlen($data) > self::MAX_BYTES && $quality >= 34);
        imagedestroy($image);
        if (strlen($data) > self::MAX_BYTES) {
            throw ValidationException::withMessages(['photo' => 'Não foi possível reduzir a foto a 100 KB.']);
        }

return $data;
    }
}
