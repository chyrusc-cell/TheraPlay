<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\EmailVerificationCode;
use App\Support\MailDelivery;
use Illuminate\Support\Facades\Log;
use Throwable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class RegisterController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        // A "child" sent by a client is deliberately not validated or used: a
        // child profile can only be created by a parent whose email address is
        // verified (ChildController::store), never during registration.
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => [
                'required', 'email', 'max:255', 'unique:users,email',
                // The official administrator address is reserved.
                function ($attribute, $value, $fail) {
                    if (mb_strtolower(trim((string) $value)) === mb_strtolower(trim((string) config('theraplay.admin.email')))) {
                        $fail('This email address cannot be used to register.');
                    }
                },
            ],
            'phone' => ['required', 'string', 'max:30'],
            'password' => [
                'required',
                'confirmed',
                Password::min(8),
            ],
        ]);

        // The account is created UNVERIFIED (email_verified_at stays empty) and
        // is restricted until its address is verified. The unique rule above keeps
        // the same address from registering twice, also while it is unverified.
        $user = User::create([
            'name' => trim(
                $validated['first_name'] . ' ' . $validated['last_name']
            ),
            'email' => $validated['email'],
            'contact_number' => $validated['phone'],
            'password' => Hash::make($validated['password']),
            'role' => 'parent',
        ]);

        // Email the six-digit verification code. A mail problem must never fail the
        // sign-up; the response says honestly whether it went out, and the person
        // can ask for another code on the verification screen.
        $verificationSent = false;

        try {
            EmailVerificationCode::issue($user);
            $verificationSent = true;
        } catch (Throwable $e) {
            Log::warning('Verification code email could not be sent after registration.', [
                'user_id' => $user->id,
                'error' => class_basename($e),
            ]);
        }

        return response()->json([
            'message' => 'Registration successful.',
            // The person stays signed in, so the next steps (verify the code, then
            // create the child profile) continue without a login page. The account
            // is still unverified and the server limits what it can do.
            'token' => $user->createToken('theraplay-app')->plainTextToken,
            // Honest about delivery: with the log/array mail drivers nothing is
            // delivered, so the app must not say an email is on its way.
            'email_verification' => [
                'sent' => $verificationSent,
                'delivery_available' => MailDelivery::isConfigured(),
                'expires_in' => $verificationSent ? EmailVerificationCode::secondsLeft($user) : null,
            ],
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'contact_number' => $user->contact_number,
                'role' => $user->role,
            ],
        ], 201);
    }
}
