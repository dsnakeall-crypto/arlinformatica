<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\FinalShareController;
use App\Http\Controllers\SettingsController;
use Illuminate\Support\Facades\Route;

Route::get('/api/theme', [SettingsController::class, 'theme']);
Route::put('/api/theme', [SettingsController::class, 'updateTheme'])->middleware(['auth', 'role:Master,Administrador']);
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth');
Route::get('/share/orders/{order}/final/{revision}', [FinalShareController::class, 'download'])
    ->middleware('signed')
    ->name('orders.final.public');
Route::view('/{path?}', 'app')->where('path', '^(?!api|up|share).*$');
