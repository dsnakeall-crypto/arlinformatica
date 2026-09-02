<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GeneratedDocument extends Model
{
    protected $hidden = ['path'];

    protected function casts(): array
    {
        return ['snapshot' => 'array', 'issued_at' => 'datetime'];
    }
}
