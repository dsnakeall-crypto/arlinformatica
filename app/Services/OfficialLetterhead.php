<?php

namespace App\Services;

use RuntimeException;

class OfficialLetterhead
{
    public const WIDTH = 1055;

    public const HEIGHT = 1491;

    public const SHA256 = '8e900b1c8d8427c0bf1d3c9cbe80807131b7f704d22a2ba2babc437ecd2a5f21';

    public static function path(): string
    {
        // This service is also used by a plain PHPUnit test, before Laravel's
        // application container (and therefore resource_path()) is available.
        $path = dirname(__DIR__, 2).'/resources/images/documents/papel-timbrado-novo.png';
        $size = @getimagesize($path);

        if ($size === false || $size[0] !== self::WIDTH || $size[1] !== self::HEIGHT || hash_file('sha256', $path) !== self::SHA256) {
            throw new RuntimeException('O papel timbrado oficial não passou pela validação de integridade.');
        }

        return $path;
    }
}
