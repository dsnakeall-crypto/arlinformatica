<?php

namespace App\Services;

use RuntimeException;

class OfficialLetterhead
{
    public const WIDTH = 1055;

    public const HEIGHT = 1491;

    public const SHA256 = '3aaa083837bcd3489df9904ae247cfa360a11f0b5e247ba6a0e322d40e90a70e';

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
