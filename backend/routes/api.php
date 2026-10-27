<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\RegisterController;
use App\Http\Controllers\Api\LoginController;
use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ProgressController;
use App\Http\Controllers\Api\ActivityCompletionController;
use App\Http\Controllers\Api\ChildController;
use App\Http\Controllers\Api\LogoutController;

Route::post('/register', [RegisterController::class, 'store']);

Route::post('/login', [LoginController::class, 'store']);

Route::post('/logout', [LogoutController::class, 'destroy'])
    ->middleware('auth:sanctum');

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/activities', [ActivityController::class, 'index']);

Route::get('/activities/{id}', [ActivityController::class, 'show'])
    ->whereNumber('id');

Route::post('/activities/{id}/complete', [ActivityCompletionController::class, 'store'])
    ->whereNumber('id')
    ->middleware('auth:sanctum');

Route::post('/children', [ChildController::class, 'store'])
    ->middleware('auth:sanctum');

Route::put('/profile', [ProfileController::class, 'update'])
    ->middleware('auth:sanctum');

Route::get('/progress', [ProgressController::class, 'index'])
    ->middleware('auth:sanctum');
