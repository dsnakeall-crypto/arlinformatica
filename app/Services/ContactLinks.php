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

        return 'https://wa.me/'.$digits.($message !== '' ? '?text='.rawurlencode(str_replace("\u{FFFD}", '🔴', $message)) : '');
    }

    public static function maps(array $address): string
    {
        $parts = array_filter([$address['street'] ?? null, $address['number'] ?? null, $address['district'] ?? null, $address['city'] ?? null, $address['state'] ?? null, $address['postal_code'] ?? null]);

        return 'https://www.google.com/maps/search/?api=1&query='.rawurlencode(implode(', ', $parts));
    }
}
