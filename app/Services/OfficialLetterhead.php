<?php

namespace App\Services;

use RuntimeException;

class OfficialLetterhead
{
    public const WIDTH = 1055;

    public const HEIGHT = 1491;

    public const SHA256 = '68a8da62efcebb7713c0346d5c9946977157e2583263a822ecfb461bac4eda2a';

    public static function path(): string
    {
        // This service is also used by a plain PHPUnit test, before Laravel's
        // application container (and therefore resource_path()) is available.
        $path = dirname(__DIR__, 2).'/resources/images/documents/papel-timbrado.png';
        $size = @getimagesize($path);

        if ($size === false || $size[0] !== self::WIDTH || $size[1] !== self::HEIGHT || hash_file('sha256', $path) !== self::SHA256) {
            throw new RuntimeException('O papel timbrado oficial não passou pela validação de integridade.');
        }

        return $path;
    }
}
