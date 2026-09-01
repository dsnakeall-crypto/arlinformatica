<?php
namespace App\Models; use Illuminate\Database\Eloquent\Model; class ServiceOrderSnapshot extends Model { protected $fillable=['client','company','equipment','term_text','warranty']; protected function casts():array{return ['client'=>'array','company'=>'array','equipment'=>'array','warranty'=>'array'];} }
