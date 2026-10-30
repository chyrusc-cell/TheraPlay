<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Holds back parent accounts that must verify their email address (only those
 * created at or after auth.verification.enforced_from; see config/auth.php).
 * It runs for every API request, so verification cannot be skipped by calling an
 * endpoint directly; the few routes a person needs in order to VERIFY (read their
 * account, resend, fix the email, log out, delete the account) stay open.
 * Guests and valid, exempt or verified accounts pass through unchanged.
 */
class RequireVerifiedEmailWhenEnforced
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->bearerToken()) {
            return $next($request);
        }

        $user = $request->user('sanctum');

        if ($user && $user->mustVerifyEmailNow() && ! $request->is(
            'api/user',
            'api/logout',
            'api/email/*',
            'api/profile',
            'api/profile/*'
        )) {
            return response()->json([
                'message' => 'Please verify your email address to continue. We sent you a verification link; you can ask for a new one.',
                'code' => 'email_not_verified',
            ], 403);
        }

        return $next($request);
    }
}
