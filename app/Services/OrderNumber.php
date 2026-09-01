<?php
namespace App\Services;
use Illuminate\Support\Facades\DB;
final class OrderNumber { public function next(): string { $value=DB::transaction(function(){ $counter=DB::table('counters')->where('name','service_order')->lockForUpdate()->first(); if(!$counter){DB::table('counters')->insert(['name'=>'service_order','value'=>1,'created_at'=>now(),'updated_at'=>now()]);return 1;} $next=$counter->value+1;DB::table('counters')->where('name','service_order')->update(['value'=>$next,'updated_at'=>now()]);return $next;},5); return str_pad((string)$value,7,'0',STR_PAD_LEFT); } }
