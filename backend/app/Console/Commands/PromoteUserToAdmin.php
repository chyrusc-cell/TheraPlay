<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class PromoteUserToAdmin extends Command
{
    protected $signature = 'user:promote-admin
                            {email : Email address of an EXISTING user}
                            {--force : Skip the confirmation question}';

    protected $description = 'Give an existing user the admin role (the only supported way to create an admin)';

    public function handle(): int
    {
        $email = (string) $this->argument('email');

        if (Validator::make(['email' => $email], ['email' => 'email'])->fails()) {
            $this->error('Please provide a valid email address.');

            return self::FAILURE;
        }

        $user = User::where('email', $email)->first();

        if (! $user) {
            $this->error("No user exists with the email {$email}. Nothing was changed.");

            return self::FAILURE;
        }

        if ($user->role === 'admin') {
            $this->info("{$user->email} is already an admin. Nothing was changed.");

            return self::SUCCESS;
        }

        if (! $this->option('force')
            && ! $this->confirm("Promote {$user->name} <{$user->email}> from '{$user->role}' to 'admin'?")) {
            $this->warn('Cancelled. Nothing was changed.');

            return self::FAILURE;
        }

        $user->forceFill(['role' => 'admin'])->save();

        $this->info("{$user->email} is now an admin.");

        return self::SUCCESS;
    }
}
