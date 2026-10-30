<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Throwable;

/**
 * Uses Laravel's own password broker (tokens are stored hashed in the
 * password_reset_tokens table, expire after 60 minutes, and are throttled).
 * The token only ever travels inside the emailed link; no response contains it.
 */
class PasswordResetController extends Controller
{
    private const INVALID_LINK = 'This password reset link is invalid or has expired. Please request a new one.';

    // Authenticated: asks for a reset link for the CURRENT user's own email.
    public function request(Request $request): JsonResponse
    {
        // The target comes only from the verified token. Any "email" or
        // "user_id" in the request body is ignored.
        $user = $request->user();

        try {
            $status = Password::sendResetLink(['email' => $user->email]);
        } catch (Throwable $e) {
            // Mail transport/rendering failed. Log the problem WITHOUT the
            // message body (which contains the token) and let the user retry
            // straight away instead of waiting out the throttle.
            Log::warning('Password reset email could not be sent.', [
                'user_id' => $user->id,
                'error' => class_basename($e),
            ]);

            Password::deleteToken($user);

            return response()->json([
                'message' => 'We could not send the password reset email right now. Please try again later.',
            ], 503);
        }

        if ($status === Password::RESET_THROTTLED) {
            return response()->json([
                'message' => 'A reset link was requested a moment ago. Please wait a minute before asking again.',
            ], 429);
        }

        if ($status !== Password::RESET_LINK_SENT) {
            return response()->json([
                'message' => 'We could not send the password reset email. Please try again later.',
            ], 503);
        }

        // With the "log" or "array" mail drivers nothing leaves the server, so
        // do not tell the user an email is on its way.
        if (! $this->emailDeliveryIsConfigured()) {
            return response()->json([
                'message' => 'Email delivery is not set up on this server yet, so no email was delivered. Please contact the administrator.',
                'delivered' => false,
            ]);
        }

        return response()->json([
            'message' => 'A password reset link has been sent to your registered email address. It expires in 60 minutes.',
            'delivered' => true,
        ]);
    }

    // Public (for the Forgot Password page, where nobody is logged in):
    // asks for a reset link for any email address.
    //
    // Whatever happens (unknown email, an email sent a moment ago, a mail
    // failure, success) the answer is identical, so the response never reveals
    // which emails have an account. Only the global mail setup influences it.
    public function forgot(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        try {
            // Same broker, token table, expiry, throttle and email as the
            // Profile request. The status is deliberately ignored.
            Password::sendResetLink(['email' => $validated['email']]);
        } catch (Throwable $e) {
            // Only existing accounts reach the mail step, so a failure must not
            // change the response. Log the problem without the address or token
            // and drop the unusable token.
            Log::warning('Password reset email could not be sent (forgot password).', [
                'error' => class_basename($e),
            ]);

            $user = User::where('email', $validated['email'])->first();

            if ($user) {
                Password::deleteToken($user);
            }
        }

        if (! $this->emailDeliveryIsConfigured()) {
            return response()->json([
                'message' => 'Email delivery is not set up on this server yet, so no email was delivered. Please contact the administrator.',
                'delivery_available' => false,
            ]);
        }

        return response()->json([
            'message' => 'If an account exists for that email address, a password reset link has been sent. The link expires in 60 minutes.',
            'delivery_available' => true,
        ]);
    }

    // Public (the person may be logged out): completes a reset with the
    // emailed token. Validated and applied entirely on the server.
    public function reset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        $status = Password::reset(
            [
                'email' => $validated['email'],
                'token' => $validated['token'],
                'password' => $validated['password'],
                'password_confirmation' => $request->input('password_confirmation'),
            ],
            function (User $user, string $password) {
                // The model's "hashed" cast stores this as a hash.
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                ])->save();

                // Sign the account out everywhere: old logins must not survive
                // a password change.
                $user->tokens()->delete();

                // Opening the emailed link proves control of this address, and a
                // pending email change requested before the reset (possibly by
                // someone who had the old password) is cancelled.
                if (! $user->hasVerifiedEmail()) {
                    $user->markEmailAsVerified();
                }

                $user->clearPendingEmail();

                event(new PasswordReset($user));
            }
        );

        // Unknown email, wrong token and expired token all look the same, so
        // the response does not reveal which emails have accounts.
        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => self::INVALID_LINK], 422);
        }

        return response()->json([
            'message' => 'Your password has been reset. You can now log in with your new password.',
        ]);
    }

    // The "log" and "array" mail drivers never deliver anything. Real delivery
    // needs a real transport (for example smtp) in the mail configuration.
    private function emailDeliveryIsConfigured(): bool
    {
        return ! in_array(config('mail.default'), ['log', 'array'], true);
    }
}
