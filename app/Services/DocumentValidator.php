<?php

namespace App\Services;

final class DocumentValidator
{
    public static function normalize(string $value): string
    {
        return preg_replace('/\D/', '', $value) ?? '';
    }

    public static function valid(string $value): bool
    {
        $n = self::normalize($value);
        if (preg_match('/^(\d)\1+$/', $n)) {
            return false;
        }
        if (strlen($n) === 11) {
            for ($p = 9; $p < 11; $p++) {
                $sum = 0;
                for ($i = 0; $i < $p; $i++) {
                    $sum += (int) $n[$i] * (($p + 1) - $i);
                } $d = (10 * ($sum % 11)) % 11;
                if ($d === 10) {
                    $d = 0;
                } if ((int) $n[$p] !== $d) {
                    return false;
                }
            }

return true;
        }
        if (strlen($n) === 14) {
            $weights = [[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]];
            foreach ($weights as $p => $w) {
                $sum = 0;
                foreach ($w as $i => $v) {
                    $sum += (int) $n[$i] * $v;
                }$d = $sum % 11 < 2 ? 0 : 11 - $sum % 11;
                if ((int) $n[12 + $p] !== $d) {
                    return false;
                }
            }

return true;
        }

        return false;
    }
}
