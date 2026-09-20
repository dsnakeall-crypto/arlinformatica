<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceOrderItem extends Model
{
    protected $fillable = ['catalog_id', 'description', 'quantity', 'stock_applied_quantity', 'unit_price_cents', 'subtotal_cents', 'warranty_snapshot'];

    protected function casts(): array
    {
        return ['warranty_snapshot' => 'array'];
    }
}
