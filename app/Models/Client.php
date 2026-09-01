<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Client extends Model
{
    use SoftDeletes;

    protected $fillable = ['name', 'document', 'phone', 'postal_code', 'street', 'number', 'district', 'city', 'state', 'complement'];
}
