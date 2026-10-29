<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\DevCommands;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // "composer run dev" / "php artisan dev": run the API server and the
        // React frontend (the Vite app in the repo root, not this folder's own
        // unused Vite setup). The queue worker is not needed: mail is not queued.
        if ($this->app->runningInConsole()) {
            DevCommands::except('vite', 'queue');
            DevCommands::register('npm --prefix .. run dev', 'frontend');
        }

        // This app is API-only, so Laravel's default reset link (a web route
        // named "password.reset") does not exist. Point the emailed link at
        // the React reset page instead.
        ResetPassword::createUrlUsing(function ($user, string $token) {
            return rtrim(config('app.frontend_url'), '/')
                .'/reset-password?token='.$token
                .'&email='.urlencode($user->getEmailForPasswordReset());
        });
    }
}
