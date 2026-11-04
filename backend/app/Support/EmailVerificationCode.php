<?php

namespace App\Support;

use App\Models\User;
use App\Notifications\VerificationCodeNotification;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Cache;
use Throwable;

/**
 * The six-digit email verification code (OTP) for a new parent account.
 *
 * Storage: one cache entry per account ("email-code:{id}", the persistent cache
 * store, so no migration) holding ONLY an HMAC of the code (keyed with the app
 * key and bound to the account id), its expiry and the number of wrong guesses.
 * The plaintext code exists only in memory while it is generated and in the email.
 *
 * Rules: codes come from random_int (CSPRNG); they expire (default 10 minutes,
 * auth.verification.code_expire); they are single use (deleted on success);
 * issuing a new code replaces, and so invalidates, the previous one; after
 * MAX_ATTEMPTS wrong guesses the code is destroyed and a new one must be
 * requested. Codes are never logged or returned by the API. The endpoints that
 * use this are authenticated and rate limited, and always act on the token's own
 * account, so one account cannot verify another's address.
 */
class EmailVerificationCode
{
    public const LENGTH = 6;

    public const MAX_ATTEMPTS = 5;

    public static function ttlMinutes(): int
    {
        return max(1, (int) config('auth.verification.code_expire', 10));
    }

    private static function key(User $user): string
    {
        return 'email-code:'.$user->id;
    }

    private static function digest(User $user, string $code): string
    {
        return hash_hmac('sha256', $user->id.'|'.$code, (string) config('app.key'));
    }

    /**
     * Creates a new code (invalidating any earlier one) and emails it to the
     * account's own address. Throws if the email cannot be sent; then no code is
     * left behind.
     */
    public static function issue(User $user): void
    {
        $code = str_pad((string) random_int(0, 999999), self::LENGTH, '0', STR_PAD_LEFT);
        $minutes = self::ttlMinutes();

        Cache::put(self::key($user), [
            'digest' => self::digest($user, $code),
            'expires_at' => now()->addMinutes($minutes)->getTimestamp(),
            'attempts' => 0,
        ], now()->addMinutes($minutes));

        try {
            $user->notify(new VerificationCodeNotification($code, $minutes));
        } catch (Throwable $e) {
            Cache::forget(self::key($user));

            throw $e;
        }
    }

    /** Seconds until the current code expires, or null when there is none. */
    public static function secondsLeft(User $user): ?int
    {
        $entry = Cache::get(self::key($user));

        if (! is_array($entry)) {
            return null;
        }

        $left = (int) $entry['expires_at'] - now()->getTimestamp();

        return $left > 0 ? $left : null;
    }

    /**
     * @return array{status: string, attempts_left?: int}
     *   verified | already_verified | expired | invalid | too_many_attempts
     */
    public static function verify(User $user, string $code): array
    {
        if ($user->hasVerifiedEmail()) {
            return ['status' => 'already_verified'];
        }

        // One guess at a time per account, so parallel requests cannot dodge the limit.
        return Cache::lock('email-code-lock:'.$user->id, 5)->block(3, function () use ($user, $code) {
            $entry = Cache::get(self::key($user));

            if (! is_array($entry) || (int) $entry['expires_at'] <= now()->getTimestamp()) {
                Cache::forget(self::key($user));

                return ['status' => 'expired'];
            }

            if (hash_equals((string) $entry['digest'], self::digest($user, $code))) {
                Cache::forget(self::key($user));
                $user->markEmailAsVerified();
                event(new Verified($user));

                return ['status' => 'verified'];
            }

            $entry['attempts'] = (int) $entry['attempts'] + 1;

            if ($entry['attempts'] >= self::MAX_ATTEMPTS) {
                Cache::forget(self::key($user));

                return ['status' => 'too_many_attempts'];
            }

            Cache::put(self::key($user), $entry, now()->setTimestamp((int) $entry['expires_at']));

            return ['status' => 'invalid', 'attempts_left' => self::MAX_ATTEMPTS - $entry['attempts']];
        });
    }
}
