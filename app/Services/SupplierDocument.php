<?php

namespace App\Services;

final class SupplierDocument
{
    public static function normalize(string $value): string
    {
        return preg_replace('/[^A-Z0-9]/', '', strtoupper($value));
    }

    public static function valid(string $value): bool
    {
        if (preg_match('/^\d{11}$/', $value)) {
            return DocumentValidator::valid($value);
        }
        if (! preg_match('/^[A-Z0-9]{12}\d{2}$/', $value) || preg_match('/^(\d)\1+$/', $value)) {
            return false;
        }
        foreach ([[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]] as $p => $weights) {
            $sum = 0;
            foreach ($weights as $i => $weight) {
                $sum += (ord($value[$i]) - 48) * $weight;
            }
            $digit = $sum % 11 < 2 ? 0 : 11 - $sum % 11;
            if ((int) $value[12 + $p] !== $digit) {
                return false;
            }
        }

        return true;
    }
}
