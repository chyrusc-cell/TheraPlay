<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\EmailVerificationCode;
use App\Support\MailDelivery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * The six-digit email verification code (see EmailVerificationCode). Every route
 * is for the logged-in account only (auth:sanctum, its own named rate limiter):
 * the account comes from the token, never from the request, and the code is
 * checked against that account alone.
 */
class EmailCodeController extends Controller
{
    public function status(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $left = EmailVerificationCode::secondsLeft($user);

        return response()->json([
            'verified' => $user->hasVerifiedEmail(),
            'email' => $user->email,
            'code_active' => $left !== null,
            'expires_in' => $left,
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $validated = $request->validate([
            'code' => ['required', 'string', 'regex:/^\d{6}$/'],
        ], [
            'code.regex' => 'Enter the six-digit code from the email.',
        ]);

        $result = EmailVerificationCode::verify($user, $validated['code']);

        return match ($result['status']) {
            'verified', 'already_verified' => response()->json([
                'status' => $result['status'],
                'message' => 'Your email address is verified.',
                'user' => $user->fresh()->accountSummary(),
            ]),
            'expired' => response()->json([
                'status' => 'expired',
                'message' => 'This code has expired or is no longer valid. Request a new code.',
            ], 410),
            'too_many_attempts' => response()->json([
                'status' => 'too_many_attempts',
                'message' => 'Too many incorrect codes. That code no longer works; request a new one.',
            ], 422),
            default => response()->json([
                'status' => 'invalid',
                'message' => 'That code is not correct. Check the email and try again.',
                'attempts_left' => $result['attempts_left'] ?? null,
            ], 422),
        };
    }

    public function resend(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'status' => 'already_verified',
                'message' => 'Your email address is already verified.',
            ]);
        }

        // Asking again right away is refused (the earlier code stays valid).
        $wait = EmailVerificationCode::cooldownLeft($user);

        if ($wait > 0) {
            return response()->json([
                'status' => 'cooldown',
                'message' => "Please wait {$wait} seconds before asking for another code.",
                'retry_after' => $wait,
            ], 429, ['Retry-After' => $wait]);
        }

        try {
            EmailVerificationCode::issue($user);
        } catch (Throwable $e) {
            // Never log the code or the address.
            Log::warning('Verification code email could not be sent.', [
                'user_id' => $user->id,
                'error' => class_basename($e),
            ]);

            return response()->json([
                'status' => 'not_sent',
                'message' => 'We could not send the code right now. Please try again in a moment.',
            ], 503);
        }

        $delivered = MailDelivery::isConfigured();

        return response()->json([
            'status' => $delivered ? 'sent' : 'not_delivered',
            'delivered' => $delivered,
            'message' => $delivered
                ? 'A new code was sent. The previous code no longer works.'
                : 'Email delivery is not set up on this server yet, so no email was delivered. Please contact the administrator.',
            'expires_in' => EmailVerificationCode::secondsLeft($user),
        ]);
    }
}
