<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class LoginController extends Controller
{
    private const MAX_FAILURES = 5;

    private const FAILURE_WINDOW_SECONDS = 300;

    private static ?string $dummyHash = null;

    // Made once per process with the same hasher/cost as real passwords.
    private static function dummyHash(): string
    {
        return self::$dummyHash ??= Hash::make(Str::random(40));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        // Per-account protection: after 5 FAILED tries for this email from this
        // address, further tries wait. The address is part of the key on purpose,
        // so a stranger elsewhere cannot lock the real owner out by repeatedly
        // failing for their email. Successful logins never count, and the email
        // is hashed in the key.
        $attemptKey = 'login-account:'.sha1(Str::lower(trim($validated['email'])).'|'.$request->ip());

        if (RateLimiter::tooManyAttempts($attemptKey, self::MAX_FAILURES)) {
            return response()->json([
                'message' => 'Too many requests. Please wait a moment and try again.',
            ], 429, ['Retry-After' => RateLimiter::availableIn($attemptKey)]);
        }

        $user = User::where('email', $validated['email'])->first();

        // An unknown email still pays for one password check against a throw-away
        // hash, so the answer takes about as long as for a real account and the
        // response time does not reveal which emails are registered.
        $passwordIsRight = Hash::check($validated['password'], $user?->password ?? self::dummyHash());

        if (!$user || !$passwordIsRight) {
            RateLimiter::hit($attemptKey, self::FAILURE_WINDOW_SECONDS);

            return response()->json([
                'message' => 'The email or password is incorrect.',
            ], 401);
        }

        RateLimiter::clear($attemptKey);

        $token = $user->createToken('theraplay-app')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }
}