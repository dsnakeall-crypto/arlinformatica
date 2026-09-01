<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class StatusHistory extends Model { public $timestamps=false; protected $table='status_history'; protected $fillable=['service_order_id','from_status','to_status','user_id']; }
