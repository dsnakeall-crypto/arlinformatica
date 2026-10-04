<?php

namespace App\Support;

final class UserPasswordPolicy
{
    public static function rules(): array
    {
        return ['required', 'string', 'min:6', 'max:255', 'regex:/\p{Lu}/u', 'regex:/[^\p{L}\p{N}\s]/u'];
    }
}
