<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

final class SignatureProcessor
{
    public function process(UploadedFile $file): string
    {
        $source = @imagecreatefromstring((string) file_get_contents($file->getRealPath()));
        if (! $source) {
            throw ValidationException::withMessages(['signature' => 'A imagem da assinatura é inválida.']);
        }

        $width = imagesx($source);
        $height = imagesy($source);
        $transparent = imagecreatetruecolor($width, $height);
        imagealphablending($transparent, false);
        imagesavealpha($transparent, true);
        imagefill($transparent, 0, 0, imagecolorallocatealpha($transparent, 255, 255, 255, 127));
        $minX = $width;
        $minY = $height;
        $maxX = -1;
        $maxY = -1;

        for ($y = 0; $y < $height; $y++) {
            for ($x = 0; $x < $width; $x++) {
                $rgba = imagecolorat($source, $x, $y);
                $r = ($rgba >> 16) & 0xFF;
                $g = ($rgba >> 8) & 0xFF;
                $b = $rgba & 0xFF;
                $darkness = 255 - min($r, $g, $b);
                if ($darkness < 12) {
                    continue;
                }
                $alpha = $darkness >= 55 ? 0 : (int) round(127 * (1 - (($darkness - 12) / 43)));
                imagesetpixel($transparent, $x, $y, imagecolorallocatealpha($transparent, $r, $g, $b, max(0, min(127, $alpha))));
                $minX = min($minX, $x);
                $minY = min($minY, $y);
                $maxX = max($maxX, $x);
                $maxY = max($maxY, $y);
            }
        }
        imagedestroy($source);

        if ($maxX < $minX || $maxY < $minY) {
            imagedestroy($transparent);
            throw ValidationException::withMessages(['signature' => 'Não foi possível identificar a assinatura sobre o fundo branco.']);
        }

        $padding = 12;
        $cropX = max(0, $minX - $padding);
        $cropY = max(0, $minY - $padding);
        $cropWidth = min($width - $cropX, $maxX - $minX + 1 + ($padding * 2));
        $cropHeight = min($height - $cropY, $maxY - $minY + 1 + ($padding * 2));
        $cropped = imagecrop($transparent, ['x' => $cropX, 'y' => $cropY, 'width' => $cropWidth, 'height' => $cropHeight]);
        imagedestroy($transparent);
        if (! $cropped) {
            throw ValidationException::withMessages(['signature' => 'Não foi possível recortar a assinatura.']);
        }

        $scale = min(1, 1000 / imagesx($cropped), 360 / imagesy($cropped));
        $output = imagescale($cropped, max(1, (int) round(imagesx($cropped) * $scale)), max(1, (int) round(imagesy($cropped) * $scale)));
        imagedestroy($cropped);
        if (! $output) {
            throw ValidationException::withMessages(['signature' => 'Não foi possível redimensionar a assinatura.']);
        }

        imagesavealpha($output, true);
        ob_start();
        imagepng($output, null, 8);
        $data = (string) ob_get_clean();
        imagedestroy($output);

        return $data;
    }
}
