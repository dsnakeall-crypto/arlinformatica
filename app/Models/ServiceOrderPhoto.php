<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceOrderPhoto extends Model
{
    protected $fillable = ['disk', 'path', 'mime', 'bytes', 'width', 'height', 'uploaded_by'];
}
