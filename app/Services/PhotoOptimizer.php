<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

final class PhotoOptimizer
{
    public const MAX_BYTES = 100 * 1024;

    public const SIZE = 1200;

    public const INITIAL_QUALITY = 85;

    public function optimize(UploadedFile $file): string
    {
        $info = @getimagesize($file->getRealPath());
        if (! $info || ! in_array($info['mime'], ['image/jpeg', 'image/png', 'image/webp'], true)) {
            throw ValidationException::withMessages(['photo' => 'Imagem inválida.']);
        }
        $source = match ($info['mime']) {
            'image/jpeg' => @imagecreatefromjpeg($file->getRealPath()),
            'image/png' => @imagecreatefrompng($file->getRealPath()),
            default => @imagecreatefromwebp($file->getRealPath()),
        };
        if (! $source) {
            throw ValidationException::withMessages(['photo' => 'Imagem inválida.']);
        }

        $source = $this->orient($source, $file, $info['mime']);
        $side = min(imagesx($source), imagesy($source));
        $sourceX = (int) floor((imagesx($source) - $side) / 2);
        $sourceY = (int) floor((imagesy($source) - $side) / 2);
        $square = imagecreatetruecolor(self::SIZE, self::SIZE);
        imagecopyresampled($square, $source, 0, 0, $sourceX, $sourceY, self::SIZE, self::SIZE, $side, $side);
        imagedestroy($source);

        $data = '';
        for ($quality = self::INITIAL_QUALITY; $quality >= 0; $quality -= 5) {
            ob_start();
            imagewebp($square, null, $quality);
            $data = (string) ob_get_clean();
            if (strlen($data) <= self::MAX_BYTES) {
                break;
            }
        }
        imagedestroy($square);
        if ($data === '' || strlen($data) > self::MAX_BYTES) {
            throw ValidationException::withMessages(['photo' => 'Não foi possível reduzir a foto a 100 KB.']);
        }

        return $data;
    }

    private function orient(\GdImage $source, UploadedFile $file, string $mime): \GdImage
    {
        if ($mime !== 'image/jpeg' || ! function_exists('exif_read_data')) {
            return $source;
        }

        $orientation = (int) ((@exif_read_data($file->getRealPath()) ?: [])['Orientation'] ?? 1);
        $angle = match ($orientation) {
            3 => 180,
            6 => -90,
            8 => 90,
            default => 0,
        };
        if ($angle === 0) {
            return $source;
        }

        $rotated = imagerotate($source, $angle, 0);
        imagedestroy($source);

        return $rotated ?: throw ValidationException::withMessages(['photo' => 'Não foi possível corrigir a orientação da foto.']);
    }
}
