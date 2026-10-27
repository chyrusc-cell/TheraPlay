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
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\FeedbackController;
use App\Http\Controllers\Api\Admin\ActivityManagementController;
use App\Http\Controllers\Api\Admin\ContactManagementController;
use App\Http\Controllers\Api\Admin\FeedbackManagementController;
use App\Http\Controllers\Api\Admin\UserManagementController;
use App\Http\Controllers\Api\Admin\ActivityResourceController;
use App\Http\Controllers\Api\ActivityMaterialController;

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

// Download an uploaded file of a PUBLISHED activity (404 for drafts).
Route::get('/activities/{activity}/resources/{resource}/download', [ActivityMaterialController::class, 'download'])
    ->whereNumber(['activity', 'resource'])
    ->scopeBindings();

Route::post('/activities/{id}/complete', [ActivityCompletionController::class, 'store'])
    ->whereNumber('id')
    ->middleware('auth:sanctum');

Route::post('/children', [ChildController::class, 'store'])
    ->middleware('auth:sanctum');

Route::put('/profile', [ProfileController::class, 'update'])
    ->middleware('auth:sanctum');

Route::get('/progress', [ProgressController::class, 'index'])
    ->middleware('auth:sanctum');

// Public, read-only list of professional contacts (Contact Us page).
Route::get('/contacts', [ContactController::class, 'index']);

// Only logged-in parents can send feedback.
Route::post('/feedback', [FeedbackController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:parent']);

// Admin-only management API. Order matters: authenticate first, then check role.
Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        // No destroy route on purpose: deleting an activity would cascade-delete
        // children's progress. Use unpublish instead.
        Route::apiResource('activities', ActivityManagementController::class)
            ->except(['destroy']);

        Route::post('activities/{activity}/publish', [ActivityManagementController::class, 'publish'])
            ->name('activities.publish');

        Route::post('activities/{activity}/unpublish', [ActivityManagementController::class, 'unpublish'])
            ->name('activities.unpublish');

        // Uploaded file materials of an activity (private storage).
        Route::post('activities/{activity}/resources', [ActivityResourceController::class, 'store'])
            ->name('activities.resources.store');

        Route::delete('activities/{activity}/resources/{resource}', [ActivityResourceController::class, 'destroy'])
            ->scopeBindings()
            ->name('activities.resources.destroy');

        Route::get('activities/{activity}/resources/{resource}/download', [ActivityResourceController::class, 'download'])
            ->scopeBindings()
            ->name('activities.resources.download');

        // Professional contacts: full management (they are standalone records).
        Route::apiResource('contacts', ContactManagementController::class)
            ->parameters(['contacts' => 'contact']);

        // Accounts: list, create, update (name, email, role) and guarded delete.
        Route::apiResource('users', UserManagementController::class);

        // Feedback: view only.
        Route::get('feedback', [FeedbackManagementController::class, 'index'])
            ->name('feedback.index');
    });
