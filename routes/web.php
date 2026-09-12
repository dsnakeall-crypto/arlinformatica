<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\FinalShareController;
use App\Http\Controllers\SettingsController;
use Illuminate\Support\Facades\Route;

Route::get('/api/theme', [SettingsController::class, 'theme']);
Route::put('/api/theme', [SettingsController::class, 'updateTheme'])->middleware(['auth', 'role:Master,Administrador']);
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth');
Route::get('/share/orders/{order}/final/{revision}/{token}', [FinalShareController::class, 'download'])
    ->where('token', '[A-Fa-f0-9]{64}')
    ->name('orders.final.public');
Route::redirect('/orders/{order}/reports', '/orders/{order}');
Route::redirect('/desk', '/');
Route::redirect('/settings/checklist', '/settings');
Route::view('/{path?}', 'app')->where('path', '^(?!api|up|share).*$');
