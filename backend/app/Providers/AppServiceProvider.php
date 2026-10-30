<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\DevCommands;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
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

        // Rate limits for the account-security endpoints. Each has its OWN counter:
        // Laravel's string form (throttle:10,1) keys only on the client, so login,
        // register and these endpoints would otherwise share one bucket and a few
        // normal logins could lock someone out of "forgot password". Logged-in
        // routes count per account, public ones per client address.
        $perUserOrIp = fn (Request $request) => $request->user()?->getAuthIdentifier() ?: $request->ip();

        RateLimiter::for('email-verify', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
        RateLimiter::for('email-resend', fn (Request $request) => Limit::perMinute(3)->by($perUserOrIp($request)));
        RateLimiter::for('forgot-password', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));
        RateLimiter::for('reset-password', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
        RateLimiter::for('profile-password-reset', fn (Request $request) => Limit::perMinute(5)->by($perUserOrIp($request)));
        RateLimiter::for('profile-update', fn (Request $request) => Limit::perMinute(20)->by($perUserOrIp($request)));
        RateLimiter::for('account-delete', fn (Request $request) => Limit::perMinute(5)->by($perUserOrIp($request)));

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
