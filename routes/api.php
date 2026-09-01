<?php

use App\Http\Controllers\CatalogController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\ServiceOrderController;
use App\Http\Controllers\SettingsController;
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
    Route::get('/settings', [SettingsController::class, 'show']);
    Route::put('/settings', [SettingsController::class, 'update']);
    Route::post('/settings/logo', [SettingsController::class, 'logo']);
    Route::get('/settings/logo/{variant}', [SettingsController::class, 'logoFile']);
    Route::get('/orders/{order}/term', [DocumentController::class, 'term']);
    Route::get('/orders/{order}/budgets', [BudgetController::class, 'index']);
    Route::post('/orders/{order}/budgets', [BudgetController::class, 'store']);
    Route::patch('/orders/{order}/budgets/{revision}/status', [BudgetController::class, 'status']);
    Route::get('/orders/{order}/budgets/{revision}/pdf', [DocumentController::class, 'budget']);
});
