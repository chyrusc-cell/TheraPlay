<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\EmailVerificationCode;
use App\Support\MailDelivery;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * The logged-in user's OWN account. There is no user id in any route: the
 * account always comes from the token, so nobody can change or delete another
 * account through these endpoints.
 */
class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json($request->user()->accountSummary());
    }

    public function update(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'string'],
            'contact_number' => ['nullable', 'string', 'max:30'],
        ]);

        // The email address is fixed once it is VERIFIED. While it is still
        // unverified the owner may correct it (wrong address, typo): the new address
        // must be valid and unused (any letter case), the old code stops working and
        // a new one is sent to the new address. Verification is never skipped by this.
        $requested = isset($validated['email']) ? trim($validated['email']) : '';
        $emailChanged = $requested !== '' && mb_strtolower($requested) !== mb_strtolower($user->email);

        if ($emailChanged) {
            if ($user->hasVerifiedEmail()) {
                throw ValidationException::withMessages(['email' => 'Your email address is verified and cannot be changed.']);
            }

            $this->assertUsableNewEmail($user, $requested);

            $key = 'email-change:'.$user->id;

            if (RateLimiter::tooManyAttempts($key, 5)) {
                throw ValidationException::withMessages(['email' => 'You changed your email address too many times. Please try again later.']);
            }

            RateLimiter::hit($key, 3600);
        }

        $messages = ['Profile updated successfully.'];
        $delivered = null;

        DB::transaction(function () use ($user, $validated, $emailChanged, $requested) {
            $user->update([
                'name' => $validated['name'],
                'contact_number' => $validated['contact_number'] ?? null,
            ]);

            if ($emailChanged) {
                // Still unverified: email_verified_at stays null on purpose.
                $user->forceFill(['email' => $requested, 'email_verified_at' => null])->save();
            }
        });

        // Any waiting (pending) change from the old flow must not complete later.
        if ($user->pendingEmail() !== null) {
            $user->clearPendingEmail();
        }

        if ($emailChanged) {
            // The code for the old address is destroyed, then a new one goes to the new address.
            EmailVerificationCode::forget($user);

            try {
                EmailVerificationCode::issue($user);
                $delivered = MailDelivery::isConfigured();
                $messages = [$delivered
                    ? 'Email address updated. We sent a new verification code to it.'
                    : 'Email address updated. Email delivery is not set up on this server, so no code was delivered.'];
            } catch (Throwable $e) {
                Log::warning('Verification code email could not be sent after an email change.', [
                    'user_id' => $user->id,
                    'error' => class_basename($e),
                ]);
                $delivered = false;
                $messages = ['Email address updated, but we could not send the verification code. Use "Resend code" to try again.'];
            }
        }

        return response()->json([
            'message' => implode(' ', $messages),
            'email_delivered' => $delivered,
            'user' => $this->summary($user->refresh()),
        ]);
    }

    // Self-service account deletion. Same safeguards as the admin side: the
    // account's children (and their saved progress) are never erased as a side
    // effect, because children.user_id cascades.
    public function destroy(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $request->validate(['password' => ['required', 'string']]);
        $this->requirePassword($user, $request->input('password'), 'password');

        if ($user->role === 'admin') {
            return response()->json([
                'message' => 'Administrator accounts cannot be deleted here.',
                'code' => 'admin_account',
            ], 403);
        }

        if ($user->children()->exists()) {
            return response()->json([
                'message' => 'Your account still has child profiles, and deleting it would erase them together with their saved activity progress. Remove your child profiles first. A child with saved progress cannot be removed, so please contact the administrator if you need this account deleted.',
                'code' => 'account_has_children',
            ], 409);
        }

        $photo = $user->hasPhoto() ? $user->photo_path : null;

        DB::transaction(function () use ($user) {
            // Logins are not linked by a foreign key, so remove them explicitly.
            $user->tokens()->delete();
            Password::deleteToken($user);
            $user->clearPendingEmail();
            // Feedback stays without an owner (nullOnDelete) and activities this
            // account created keep existing (created_by is nulled).
            $user->delete();
        });

        if ($photo) {
            Storage::disk(config('filesystems.activity_materials.disk'))->delete($photo);
        }

        return response()->json(['message' => 'Your account has been deleted.']);
    }

    private function assertUsableNewEmail(User $user, string $email): void
    {
        $validator = Validator::make(['email' => $email], ['email' => ['email', 'max:255']]);

        if ($validator->fails()) {
            throw ValidationException::withMessages(['email' => $validator->errors()->first('email')]);
        }

        $lower = mb_strtolower($email);
        $reserved = mb_strtolower(trim((string) config('theraplay.admin.email')));

        $taken = $lower === $reserved
            || User::query()->where('id', '!=', $user->id)->whereRaw('lower(email) = ?', [$lower])->exists();

        if ($taken) {
            throw ValidationException::withMessages(['email' => 'This email address cannot be used.']);
        }
    }

    private function requirePassword(User $user, ?string $password, string $field = 'current_password'): void
    {
        if ($password === null || $password === '') {
            throw ValidationException::withMessages([$field => 'Enter your current password to confirm this.']);
        }

        if (! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([$field => 'The password is incorrect.']);
        }
    }

    private function summary(User $user): array
    {
        return $user->only(['id', 'name', 'email', 'contact_number', 'role'])
            + [
                'email_verified' => $user->hasVerifiedEmail(),
                'pending_email' => $user->pendingEmail(),
            ];
    }
}
