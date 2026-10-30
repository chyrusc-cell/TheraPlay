<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\MailDelivery;
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
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'contact_number' => ['nullable', 'string', 'max:30'],
            'current_password' => ['nullable', 'string'],
        ]);

        $newEmail = trim($validated['email']);
        $changesEmail = mb_strtolower($newEmail) !== mb_strtolower($user->email);

        $messages = ['Profile updated successfully.'];
        $delivered = null;

        if ($changesEmail) {
            // An email change is account-takeover material, so it needs the
            // current password (a stolen login token alone is not enough).
            $this->requirePassword($user, $validated['current_password'] ?? null);

            // Case-insensitive duplicate check (the unique rule is not on every
            // database).
            if (User::whereRaw('LOWER(email) = ?', [mb_strtolower($newEmail)])->where('id', '!=', $user->id)->exists()) {
                throw ValidationException::withMessages(['email' => 'This email address is already in use.']);
            }
        }

        $user->update([
            'name' => $validated['name'],
            'contact_number' => $validated['contact_number'] ?? null,
        ]);

        if ($changesEmail) {
            // The address does NOT change yet. It waits, unverified, until its
            // owner opens the link sent to it; the current verified address keeps
            // working meanwhile.
            $user->setPendingEmail($newEmail);

            try {
                $user->sendPendingEmailVerification($newEmail);
                $delivered = MailDelivery::isConfigured();
                $messages = [$delivered
                    ? 'Profile updated. We sent a verification link to '.$newEmail.'. Your email will change once you open it.'
                    : 'Profile updated. Your new email address is waiting for verification, but email delivery is not set up on this server yet, so no email was delivered. Please contact the administrator.'];
            } catch (Throwable $e) {
                Log::warning('Email-change verification could not be sent.', [
                    'user_id' => $user->id,
                    'error' => class_basename($e),
                ]);
                $delivered = false;
                $messages = ['Profile updated, but we could not send the verification email right now. Use "Resend verification email" to try again.'];
            }
        } elseif ($user->pendingEmail() !== null && mb_strtolower($newEmail) === mb_strtolower($user->email)) {
            // Submitting the current address again cancels a pending change.
            $user->clearPendingEmail();
            $messages = ['Profile updated. The pending email change was cancelled.'];
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
