<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class LogoProcessor
{
    public function store(UploadedFile $file): array
    {
        $source = imagecreatefromstring(file_get_contents($file->getRealPath()));
        abort_unless($source, 422, 'A imagem da logomarca é inválida.');
        $width = imagesx($source);
        $height = imagesy($source);
        $id = (string) str()->uuid();
        $paths = [];
        foreach (['app' => 320, 'menu' => 180, 'term' => 480, 'a4' => 900, 'budget' => 720, 'report' => 900] as $variant => $max) {
            $scale = min(1, $max / max($width, $height));
            $w = max(1, (int) round($width * $scale));
            $h = max(1, (int) round($height * $scale));
            $canvas = imagecreatetruecolor($w, $h);
            imagealphablending($canvas, false);
            imagesavealpha($canvas, true);
            imagecopyresampled($canvas, $source, 0, 0, 0, 0, $w, $h, $width, $height);
            ob_start();
            imagewebp($canvas, null, 88);
            $data = ob_get_clean();
            imagedestroy($canvas);
            $path = "company/logos/$id-$variant.webp";
            Storage::disk('local')->put($path, $data);
            $paths[$variant] = $path;
        }
        imagedestroy($source);

        return $paths;
    }
}
