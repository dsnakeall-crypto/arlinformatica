<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceOrderSnapshot extends Model
{
    protected $fillable = ['client', 'company', 'equipment', 'term_text', 'warranty'];

    protected function casts(): array
    {
        return ['client' => 'array', 'company' => 'array', 'equipment' => 'array', 'warranty' => 'array'];
    }

    protected static function booted(): void
    {
        static::creating(function (ServiceOrderSnapshot $snapshot) {
            $order = ServiceOrder::withTrashed()->find($snapshot->service_order_id);
            if (! $order || blank($order->equipment_description)) {
                return;
            }

            $equipment = is_array($snapshot->equipment) ? $snapshot->equipment : [];
            $equipment['name'] = $order->equipment_description;
            $equipment['description'] = $order->equipment_description;
            $snapshot->equipment = $equipment;
        });
    }
}
