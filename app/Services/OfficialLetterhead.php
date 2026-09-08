<?php

namespace App\Services;

use RuntimeException;

class OfficialLetterhead
{
    public const WIDTH = 1055;

    public const HEIGHT = 1491;

    public const SHA256 = '5e640a129a7b33d954e9f3b44a872b6f003ed8266f30039a578c11fe599e0087';

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
