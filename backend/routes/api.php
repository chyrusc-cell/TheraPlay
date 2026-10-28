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
use App\Http\Controllers\Api\Admin\ActivityImageController;
use App\Http\Controllers\Api\ActivityMaterialController;
use App\Http\Controllers\Api\PasswordResetController;

// Rate limited per client to slow down automated sign-ups.
Route::post('/register', [RegisterController::class, 'store'])
    ->middleware('throttle:10,1');

// Rate limited per client to slow down password guessing.
Route::post('/login', [LoginController::class, 'store'])
    ->middleware('throttle:10,1');

Route::post('/logout', [LogoutController::class, 'destroy'])
    ->middleware('auth:sanctum');

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/activities', [ActivityController::class, 'index']);

Route::get('/activities/{id}', [ActivityController::class, 'show'])
    ->whereNumber('id');

// The picture of a PUBLISHED activity (404 for drafts).
Route::get('/activities/{activity}/image', [ActivityController::class, 'image'])
    ->whereNumber('activity');

// Download an uploaded file of a PUBLISHED activity (404 for drafts).
Route::get('/activities/{activity}/resources/{resource}/download', [ActivityMaterialController::class, 'download'])
    ->whereNumber(['activity', 'resource'])
    ->scopeBindings();

// Progress belongs to a parent's own child, so only parents can record it.
Route::post('/activities/{id}/complete', [ActivityCompletionController::class, 'store'])
    ->whereNumber('id')
    ->middleware(['auth:sanctum', 'role:parent']);

// A child profile belongs to a parent account (admins have none).
Route::post('/children', [ChildController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:parent']);

Route::put('/profile', [ProfileController::class, 'update'])
    ->middleware('auth:sanctum');

// Password reset: the request is for the logged-in user's OWN email only;
// completing it needs the emailed token and does not need a login.
Route::post('/profile/password-reset', [PasswordResetController::class, 'request'])
    ->middleware(['auth:sanctum', 'throttle:5,1']);

// Forgot Password page (nobody is logged in). Rate limited per client; the
// answer is identical for every email so accounts cannot be discovered.
Route::post('/forgot-password', [PasswordResetController::class, 'forgot'])
    ->middleware('throttle:5,1');

Route::post('/reset-password', [PasswordResetController::class, 'reset'])
    ->middleware('throttle:10,1');

Route::get('/progress', [ProgressController::class, 'index'])
    ->middleware('auth:sanctum');

// Public, read-only list of professional contacts (Contact Us page).
Route::get('/contacts', [ContactController::class, 'index']);

Route::get('/contacts/{contact}/photo', [ContactController::class, 'photo'])
    ->whereNumber('contact');

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

        // The activity's picture (private storage; one per activity).
        Route::get('activities/{activity}/image', [ActivityImageController::class, 'show'])
            ->name('activities.image.show');

        Route::post('activities/{activity}/image', [ActivityImageController::class, 'store'])
            ->name('activities.image.store');

        Route::delete('activities/{activity}/image', [ActivityImageController::class, 'destroy'])
            ->name('activities.image.destroy');

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

        Route::post('contacts/{contact}/photo', [ContactManagementController::class, 'storePhoto'])
            ->name('contacts.photo.store');

        Route::delete('contacts/{contact}/photo', [ContactManagementController::class, 'destroyPhoto'])
            ->name('contacts.photo.destroy');

        // Accounts: list, create, update (name, email, role) and guarded delete.
        Route::apiResource('users', UserManagementController::class);

        // Feedback: view only.
        Route::get('feedback', [FeedbackManagementController::class, 'index'])
            ->name('feedback.index');
    });
