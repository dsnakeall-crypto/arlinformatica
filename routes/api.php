<?php
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ServiceOrderController;
use Illuminate\Support\Facades\Route;
Route::middleware('auth')->group(function(){Route::get('/clients',[ClientController::class,'index']);Route::post('/clients',[ClientController::class,'store']);Route::get('/orders',[ServiceOrderController::class,'index']);Route::post('/orders',[ServiceOrderController::class,'store']);Route::patch('/orders/{order}/status',[ServiceOrderController::class,'updateStatus']);});
