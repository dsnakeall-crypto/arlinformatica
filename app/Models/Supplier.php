<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    protected $fillable = ['name', 'trade_name', 'document', 'contact_name', 'phone', 'email', 'postal_code', 'street', 'number', 'district', 'city', 'state', 'complement', 'notes', 'active'];

    protected function casts(): array
    {
        return ['active' => 'boolean'];
    }
}
