<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Transactions (child profiles, completing/undoing activities, ratings and journal
 * entries, site feedback) need a VERIFIED email address. An unverified parent can
 * log in and browse, but every one of these routes answers 403 email_not_verified
 * until the address is verified. It reads the stored email_verified_at, so
 * logging out and in, refreshing or calling the API directly changes nothing.
 * Alias: verified.parent (always after auth:sanctum).
 */
class EnsureVerifiedParent
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->role !== 'admin' && ! $user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Please verify your email address first. You can browse TheraPlay, but this needs a verified account.',
                'code' => 'email_not_verified',
            ], 403);
        }

        return $next($request);
    }
}
