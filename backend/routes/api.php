<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\RegisterController;
use App\Http\Controllers\Api\LoginController;
use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\EmailVerificationController;
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
use App\Http\Controllers\Api\ProfilePhotoController;
use App\Http\Controllers\Api\ConditionController;
use App\Http\Controllers\Api\Admin\ConditionManagementController;
use App\Http\Controllers\Api\Admin\CategoryManagementController;
use App\Http\Controllers\Api\DeveloperTeamController;
use App\Http\Controllers\Api\Admin\DeveloperTeamManagementController;

// Rate limited per client to slow down automated sign-ups.
Route::post('/register', [RegisterController::class, 'store'])
    ->middleware('throttle:10,1');

// Rate limited per client to slow down password guessing.
Route::post('/login', [LoginController::class, 'store'])
    ->middleware('throttle:10,1');

Route::post('/logout', [LogoutController::class, 'destroy'])
    ->middleware('auth:sanctum');

// The logged-in account (with its email verification status).
Route::get('/user', [ProfileController::class, 'show'])
    ->middleware('auth:sanctum');

// Email verification. The link is opened from an inbox, so verifying is public
// but needs the link's signature (and it expires). Resending needs a login.
Route::post('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
    ->whereNumber('id')
    ->middleware('throttle:email-verify')
    ->name('verification.verify');

Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])
    ->middleware(['auth:sanctum', 'throttle:email-resend']);

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

// A parent's own children (several per parent). Every route works only on the
// logged-in parent's children; admins have none.
Route::middleware(['auth:sanctum', 'role:parent'])->prefix('children')->group(function () {
    Route::get('/', [ChildController::class, 'index']);
    Route::post('/', [ChildController::class, 'store']);
    Route::put('/{child}', [ChildController::class, 'update'])->whereNumber('child');
    Route::delete('/{child}', [ChildController::class, 'destroy'])->whereNumber('child');
});

// The conditions parents can choose from (active ones; public, read-only).
Route::get('/conditions', [ConditionController::class, 'index']);

Route::put('/profile', [ProfileController::class, 'update'])
    ->middleware(['auth:sanctum', 'throttle:profile-update']);

// Delete the logged-in user's OWN account (needs their password).
Route::delete('/profile', [ProfileController::class, 'destroy'])
    ->middleware(['auth:sanctum', 'throttle:account-delete']);

// The logged-in user's own profile picture (no user id: it is always the token's account).
Route::middleware('auth:sanctum')->prefix('profile/photo')->group(function () {
    Route::get('/', [ProfilePhotoController::class, 'show']);
    Route::post('/', [ProfilePhotoController::class, 'store'])->middleware('throttle:10,1');
    Route::delete('/', [ProfilePhotoController::class, 'destroy'])->middleware('throttle:10,1');
});

// Password reset: the request is for the logged-in user's OWN email only;
// completing it needs the emailed token and does not need a login.
Route::post('/profile/password-reset', [PasswordResetController::class, 'request'])
    ->middleware(['auth:sanctum', 'throttle:profile-password-reset']);

// Forgot Password page (nobody is logged in). Rate limited per client; the
// answer is identical for every email so accounts cannot be discovered.
Route::post('/forgot-password', [PasswordResetController::class, 'forgot'])
    ->middleware('throttle:forgot-password');

Route::post('/reset-password', [PasswordResetController::class, 'reset'])
    ->middleware('throttle:reset-password');

Route::get('/progress', [ProgressController::class, 'index'])
    ->middleware('auth:sanctum');

// Public, read-only list of professional contacts (Contact Us page).
Route::get('/contacts', [ContactController::class, 'index']);

// The Developer Team card on the Contact Us page (edited by admins).
Route::get('/developer-team', [DeveloperTeamController::class, 'show']);

Route::get('/contacts/{contact}/photo', [ContactController::class, 'photo'])
    ->whereNumber('contact');

// Only logged-in parents can send feedback.
Route::post('/feedback', [FeedbackController::class, 'store'])
    ->middleware(['auth:sanctum', 'role:parent', 'throttle:10,1']);

// Admin-only management API. Order matters: authenticate first, then check role.
Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        // DELETE /activities/{activity} permanently deletes the activity AND the
        // children's progress records, resources, files and condition links that
        // belong to it (see ActivityManagementController::destroy).
        Route::apiResource('activities', ActivityManagementController::class);

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

        // Accounts: list, create an ADMINISTRATOR (the role is set by the server),
        // update name/email, promote/demote, and guarded delete.
        Route::apiResource('users', UserManagementController::class);

        Route::post('users/{user}/promote', [UserManagementController::class, 'promote'])
            ->whereNumber('user')
            ->name('users.promote');

        Route::post('users/{user}/demote', [UserManagementController::class, 'demote'])
            ->whereNumber('user')
            ->name('users.demote');

        // Predefined conditions: list, add, edit, switch on/off (no delete on purpose).
        Route::get('conditions', [ConditionManagementController::class, 'index'])
            ->name('conditions.index');

        Route::post('conditions', [ConditionManagementController::class, 'store'])
            ->name('conditions.store');

        Route::put('conditions/{condition}', [ConditionManagementController::class, 'update'])
            ->name('conditions.update');

        // Activity categories: list, add, rename; delete only while no activity uses it.
        Route::apiResource('categories', CategoryManagementController::class)
            ->except(['show']);

        // The Developer Team card shown on the Contact Us page (one settings row).
        Route::get('developer-team', [DeveloperTeamManagementController::class, 'show'])
            ->name('developer-team.show');

        Route::put('developer-team', [DeveloperTeamManagementController::class, 'update'])
            ->name('developer-team.update');

        // Feedback: view only.
        Route::get('feedback', [FeedbackManagementController::class, 'index'])
            ->name('feedback.index');
    });
