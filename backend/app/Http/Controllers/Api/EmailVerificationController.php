<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\MailDelivery;
use Illuminate\Auth\Events\Verified;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Throwable;

/**
 * Email verification (a new account's address, or a requested new address).
 *
 *  - verify(): public, because the link is opened from an inbox (any device). The
 *    link's signature (checked here) is what authorises it, and it expires. This
 *    is the ONLY place an address becomes verified; no other endpoint accepts a
 *    "verified" value from the client.
 *  - resend(): authenticated and rate limited; always sends to the logged-in
 *    account's own address (or its pending new address), never to a given one.
 *
 * Responses carry a machine-readable `status` so the React page can show the
 * right message: verified, email_changed, already_verified, expired, invalid,
 * email_taken.
 */
class EmailVerificationController extends Controller
{
    public function verify(Request $request, int $id, string $hash): JsonResponse
    {
        // Signature first: forged or edited links are invalid; correct but old
        // links are "expired" (the person can ask for a new one).
        if (! URL::hasCorrectSignature($request, false)) {
            return $this->invalid();
        }

        if (! URL::signatureHasNotExpired($request)) {
            return response()->json([
                'status' => 'expired',
                'message' => 'This verification link has expired. Please request a new one.',
            ], 410);
        }

        $user = User::find($id);

        if (! $user) {
            return $this->invalid();
        }

        // A requested NEW address: the link must be the one sent to it.
        $pending = $user->pendingEmail();

        if ($pending !== null && hash_equals(sha1($pending), $hash)) {
            return $this->completeEmailChange($user, $pending);
        }

        // The current address.
        if (hash_equals(sha1($user->email), $hash)) {
            if ($user->hasVerifiedEmail()) {
                return response()->json([
                    'status' => 'already_verified',
                    'message' => 'This email address is already verified.',
                ]);
            }

            $user->markEmailAsVerified();
            event(new Verified($user));

            return response()->json([
                'status' => 'verified',
                'message' => 'Your email address is verified. Thank you!',
            ]);
        }

        // A link for an address the account no longer uses (for example it was
        // replaced by a newer request).
        return $this->invalid();
    }

    public function resend(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $pending = $user->pendingEmail();

        if ($pending === null && $user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Your email address is already verified.',
                'already_verified' => true,
            ]);
        }

        try {
            if ($pending !== null) {
                $user->sendPendingEmailVerification($pending);
            } else {
                $user->sendEmailVerificationNotification();
            }
        } catch (Throwable $e) {
            // Never log the address or the link (it contains the signature).
            Log::warning('Verification email could not be sent.', [
                'user_id' => $user->id,
                'error' => class_basename($e),
            ]);

            return response()->json([
                'message' => 'We could not send the verification email right now. Please try again later.',
            ], 503);
        }

        if (! MailDelivery::isConfigured()) {
            return response()->json([
                'message' => 'Email delivery is not set up on this server yet, so no email was delivered. Please contact the administrator.',
                'delivered' => false,
            ]);
        }

        return response()->json([
            'message' => 'A verification email has been sent. The link expires in '.config('auth.verification.expire', 60).' minutes.',
            'delivered' => true,
        ]);
    }

    private function completeEmailChange(User $user, string $newEmail): JsonResponse
    {
        // Someone else may have taken the address since it was requested.
        if (User::where('email', $newEmail)->where('id', '!=', $user->id)->exists()) {
            $user->clearPendingEmail();

            return $this->emailTaken();
        }

        try {
            // The address and its verified time change together: the old address
            // can never stay "verified" for the new one.
            $user->forceFill(['email' => $newEmail, 'email_verified_at' => now()])->save();
        } catch (QueryException $e) {
            // The unique index decided a race.
            $user->clearPendingEmail();

            return $this->emailTaken();
        }

        $user->clearPendingEmail();
        event(new Verified($user));

        return response()->json([
            'status' => 'email_changed',
            'message' => 'Your new email address is verified and is now your account email.',
        ]);
    }

    private function invalid(): JsonResponse
    {
        return response()->json([
            'status' => 'invalid',
            'message' => 'This verification link is not valid. Please request a new one.',
        ], 403);
    }

    private function emailTaken(): JsonResponse
    {
        return response()->json([
            'status' => 'email_taken',
            'message' => 'That email address is now used by another account, so it cannot be set.',
        ], 409);
    }
}
