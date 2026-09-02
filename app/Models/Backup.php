<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Backup extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['manifest' => 'array', 'protected' => 'boolean'];
    }
}
