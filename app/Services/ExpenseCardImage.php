<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

final class ExpenseCardImage
{
    public function optimize(UploadedFile $file): string
    {
        $info = @getimagesize($file->getRealPath());
        if (! $info || ! in_array($info['mime'], ['image/jpeg', 'image/png', 'image/webp'], true) || $info[0] * $info[1] > 16000000 || max($info[0], $info[1]) > 8192) {
            throw ValidationException::withMessages(['image' => 'Envie uma imagem JPG, PNG ou WebP de até 16 megapixels.']);
        }
        $source = @imagecreatefromstring(file_get_contents($file->getRealPath()));
        if (! $source) {
            throw ValidationException::withMessages(['image' => 'Não foi possível ler esta imagem.']);
        }
        if ($info['mime'] === 'image/jpeg' && function_exists('exif_read_data')) {
            $orientation = (int) ((@exif_read_data($file->getRealPath()) ?: [])['Orientation'] ?? 1);
            if (in_array($orientation, [2, 4, 5, 7], true)) {
                imageflip($source, in_array($orientation, [2, 5, 7], true) ? IMG_FLIP_HORIZONTAL : IMG_FLIP_VERTICAL);
            }
            $angle = match ($orientation) {
                3 => 180, 5, 6 => -90, 7, 8 => 90, default => 0
            };
            if ($angle) {
                $rotated = imagerotate($source, $angle, 0);
                imagedestroy($source);
                $source = $rotated;
            }
        }
        $width = imagesx($source);
        $height = imagesy($source);
        $cropWidth = min($width, $height * 856 / 540);
        $cropHeight = $cropWidth * 540 / 856;
        $target = imagecreatetruecolor(856, 540);
        imagefill($target, 0, 0, imagecolorallocate($target, 255, 255, 255));
        imagecopyresampled($target, $source, 0, 0, (int) (($width - $cropWidth) / 2), (int) (($height - $cropHeight) / 2), 856, 540, (int) $cropWidth, (int) $cropHeight);
        imagedestroy($source);
        $data = '';
        for ($quality = 85; $quality >= 10; $quality -= 5) {
            ob_start();
            imagejpeg($target, null, $quality);
            $data = (string) ob_get_clean();
            if (strlen($data) <= 100 * 1024) {
                break;
            }
        }
        imagedestroy($target);
        if (! $data || strlen($data) > 100 * 1024) {
            throw ValidationException::withMessages(['image' => 'Não foi possível padronizar a imagem em até 100 KB.']);
        }

        return $data;
    }
}
