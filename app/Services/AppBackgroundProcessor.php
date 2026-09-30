<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

final class AppBackgroundProcessor
{
    public const MAX_WIDTH = 1920;

    public const TARGET_BYTES = 300 * 1024;

    public const INITIAL_QUALITY = 88;

    public const MIN_QUALITY = 60;

    public function process(UploadedFile $file): string
    {
        $info = @getimagesize($file->getRealPath());
        if (! $info || ! in_array($info['mime'], ['image/jpeg', 'image/png', 'image/webp'], true)) {
            throw ValidationException::withMessages([
                'image' => 'Envie uma imagem JPG, PNG ou WEBP válida.',
            ]);
        }

        $source = match ($info['mime']) {
            'image/jpeg' => @imagecreatefromjpeg($file->getRealPath()),
            'image/png' => @imagecreatefrompng($file->getRealPath()),
            default => @imagecreatefromwebp($file->getRealPath()),
        };
        if (! $source) {
            throw ValidationException::withMessages(['image' => 'Não foi possível ler a imagem enviada.']);
        }

        $sourceWidth = imagesx($source);
        $sourceHeight = imagesy($source);
        $scale = min(1, self::MAX_WIDTH / $sourceWidth);
        $width = max(1, (int) round($sourceWidth * $scale));
        $height = max(1, (int) round($sourceHeight * $scale));
        $output = imagecreatetruecolor($width, $height);
        if (! $output) {
            imagedestroy($source);
            throw ValidationException::withMessages(['image' => 'Não foi possível preparar a imagem.']);
        }

        imagefill($output, 0, 0, imagecolorallocate($output, 255, 255, 255));
        imagealphablending($output, true);
        imagecopyresampled($output, $source, 0, 0, 0, 0, $width, $height, $sourceWidth, $sourceHeight);
        imagedestroy($source);

        $data = '';
        for ($quality = self::INITIAL_QUALITY; $quality >= self::MIN_QUALITY; $quality -= 4) {
            ob_start();
            imagejpeg($output, null, max(self::MIN_QUALITY, $quality));
            $data = (string) ob_get_clean();
            if (strlen($data) <= self::TARGET_BYTES) {
                break;
            }
        }
        imagedestroy($output);

        if ($data === '') {
            throw ValidationException::withMessages(['image' => 'Não foi possível converter a imagem para JPG.']);
        }

        return $data;
    }
}
