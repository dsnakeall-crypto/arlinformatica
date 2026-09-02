<?php

namespace App\Models;

use App\Services\ContactLinks;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use SoftDeletes;

    protected $fillable = ['name', 'document', 'phone', 'postal_code', 'street', 'number', 'district', 'city', 'state', 'complement'];

    public function serviceOrders(): HasMany
    {
        return $this->hasMany(ServiceOrder::class);
    }

    protected $appends = ['whatsapp_url', 'maps_url'];

    public function getWhatsappUrlAttribute(): string
    {
        return ContactLinks::whatsapp($this->phone);
    }

    public function getMapsUrlAttribute(): string
    {
        return ContactLinks::maps($this->attributes);
    }
}
