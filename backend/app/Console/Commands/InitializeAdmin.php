<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

/**
 * Creates the predefined administrator (config/theraplay.php: the official
 * TheraPlay address, with the password from THERAPLAY_ADMIN_PASSWORD).
 *
 * Safe to repeat: it never creates a second account, never changes an existing
 * account's password, and never promotes an existing non-admin account (that is
 * reported as a conflict and nothing is changed). Nothing is deleted.
 */
class InitializeAdmin extends Command
{
    protected $signature = 'admin:initialize';

    protected $description = 'Create the predefined administrator account (idempotent; never changes an existing password or role)';

    public function handle(): int
    {
        $email = trim((string) config('theraplay.admin.email'));
        $password = (string) config('theraplay.admin.password');

        if (Validator::make(['email' => $email], ['email' => 'required|email'])->fails()) {
            $this->error('THERAPLAY_ADMIN_EMAIL is not a valid email address. Nothing was changed.');

            return self::FAILURE;
        }

        $existing = User::whereRaw('LOWER(email) = ?', [mb_strtolower($email)])->first();

        if ($existing) {
            return $this->reportExisting($existing);
        }

        if ($password === '') {
            $this->error('THERAPLAY_ADMIN_PASSWORD is not set in backend/.env. Add it (a password only you know), run "php artisan config:clear", then run this command again. Nothing was created.');

            return self::FAILURE;
        }

        if (Validator::make(['password' => $password], ['password' => [Password::min(8)]])->fails()) {
            $this->error('THERAPLAY_ADMIN_PASSWORD must be at least 8 characters. Nothing was created.');

            return self::FAILURE;
        }

        // The mail App Password is a different secret and must not double as a login.
        $mailPassword = (string) config('mail.mailers.smtp.password');

        if ($mailPassword !== '' && hash_equals($mailPassword, $password)) {
            $this->error('THERAPLAY_ADMIN_PASSWORD must not be the same as MAIL_PASSWORD (the Gmail App Password). Choose a different password. Nothing was created.');

            return self::FAILURE;
        }

        $admin = new User([
            'name' => (string) config('theraplay.admin.name'),
            'email' => $email,
            'password' => Hash::make($password),
        ]);
        // role and verification are not mass-assignable on purpose.
        $admin->forceFill(['role' => 'admin', 'email_verified_at' => now()])->save();

        $this->info("Administrator created: {$admin->email} (role admin, email verified). Log in with the password from THERAPLAY_ADMIN_PASSWORD.");

        return self::SUCCESS;
    }

    private function reportExisting(User $existing): int
    {
        if ($existing->role !== 'admin') {
            $this->error("CONFLICT: {$existing->email} already exists as a '{$existing->role}' account. It was not changed, promoted or deleted. Resolve this yourself (for example use a different THERAPLAY_ADMIN_EMAIL, or promote it deliberately with \"php artisan user:promote-admin\").");

            return self::FAILURE;
        }

        if ($existing->email_verified_at === null) {
            $existing->forceFill(['email_verified_at' => now()])->save();
            $this->info("{$existing->email} already exists as an admin; it was marked as email-verified. Its password was not changed.");

            return self::SUCCESS;
        }

        $this->info("{$existing->email} already exists as a verified admin. Nothing was changed (the password is never overwritten).");

        return self::SUCCESS;
    }
}
