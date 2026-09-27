<?php

namespace App\Services;

use RuntimeException;

class OfficialLetterhead
{
    public const WIDTH = 1055;

    public const HEIGHT = 1491;

    public const SHA256 = '47e3b260bd34547d486ddf54af777e085ff7ed73448f8b5985e5e4c1476b8336';

    public static function path(): string
    {
        // This service is also used by a plain PHPUnit test, before Laravel's
        // application container (and therefore resource_path()) is available.
        $path = dirname(__DIR__, 2).'/resources/images/documents/papel-timbrado.jpg';
        $size = @getimagesize($path);

        if ($size === false || $size[0] !== self::WIDTH || $size[1] !== self::HEIGHT || hash_file('sha256', $path) !== self::SHA256) {
            throw new RuntimeException('O papel timbrado oficial não passou pela validação de integridade.');
        }

        return $path;
    }
}
