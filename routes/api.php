<?php

use App\Http\Controllers\CatalogController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\ServiceOrderController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/clients', [ClientController::class, 'index']);
    Route::post('/clients', [ClientController::class, 'store']);
    Route::put('/clients/{client}', [ClientController::class, 'update']);
    Route::get('/catalogs/checklist', [CatalogController::class, 'checklist']);
    Route::get('/catalogs/{catalog}', [CatalogController::class, 'index']);
    Route::post('/catalogs/{catalog}', [CatalogController::class, 'store']);
    Route::patch('/catalogs/{catalog}/{id}', [CatalogController::class, 'update']);
    Route::get('/orders', [ServiceOrderController::class, 'index']);
    Route::post('/orders', [ServiceOrderController::class, 'store']);
    Route::get('/orders/{order}', [ServiceOrderController::class, 'show']);
    Route::post('/orders/{order}/photos', [ServiceOrderController::class, 'uploadPhoto']);
    Route::get('/orders/{order}/photos/{photo}', [ServiceOrderController::class, 'photo']);
    Route::patch('/orders/{order}/status', [ServiceOrderController::class, 'updateStatus']);
});
