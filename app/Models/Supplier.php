<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    protected $fillable = ['name', 'trade_name', 'document', 'contact_name', 'phone', 'whatsapp', 'landline', 'email', 'postal_code', 'street', 'number', 'district', 'city', 'state', 'complement', 'notes', 'active', 'profile'];

    protected function casts(): array
    {
        return ['active' => 'boolean', 'profile' => 'array'];
    }
}
