<?php

namespace App\Services;

class ContactLinks
{
    public static function whatsapp(string $phone, string $message = ''): string
    {
        $digits = preg_replace('/\D/', '', $phone);
        if (strlen($digits) <= 11) {
            $digits = '55'.$digits;
        }

        $normalizedMessage = str_replace(
            ["\u{FFFD}", "\u{00EF}\u{00BF}\u{00BD}", "\u{00F0}\u{0178}\u{201D}\u{00B4}"],
            "\u{1F534}",
            $message,
        );

        return 'https://wa.me/'.$digits.($normalizedMessage !== '' ? '?text='.rawurlencode($normalizedMessage) : '');
    }

    public static function maps(array $address): string
    {
        $parts = array_filter([$address['street'] ?? null, $address['number'] ?? null, $address['district'] ?? null, $address['city'] ?? null, $address['state'] ?? null, $address['postal_code'] ?? null]);

        return 'https://www.google.com/maps/search/?api=1&query='.rawurlencode(implode(', ', $parts));
    }
}
