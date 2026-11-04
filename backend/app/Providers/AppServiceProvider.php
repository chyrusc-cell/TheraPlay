<?php

namespace App\Providers;

use App\Support\MailDelivery;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Console\AboutCommand;
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
        // Detailed errors (exception class, file paths, stack traces) are for a
        // developer's own machine only. A shared or deployed environment that is
        // not "local"/"testing" never shows them, even if APP_DEBUG is left true.
        if (! $this->app->environment(['local', 'testing'])) {
            config(['app.debug' => false]);
        }

        // "composer run dev" / "php artisan dev": run the API server and the
        // React frontend (the Vite app in the repo root, not this folder's own
        // unused Vite setup). The queue worker is not needed: mail is not queued.
        if ($this->app->runningInConsole()) {
            DevCommands::except('vite', 'queue');
            DevCommands::register('npm --prefix .. run dev', 'frontend');
        }

        // "php artisan about" shows the settings that matter for a safe deployment.
        AboutCommand::add('TheraPlay', fn () => [
            'Email verification' => config('auth.verification.enforced_from')
                ? 'required for parents created from '.config('auth.verification.enforced_from')
                : 'NOT enforced (set EMAIL_VERIFICATION_ENFORCED_FROM to require it)',
            'Email delivery' => MailDelivery::isConfigured()
                ? 'real mailer: '.config('mail.default')
                : 'NOT delivering ('.config('mail.default').' driver)',
            'Detailed errors' => config('app.debug') ? 'ON (development only)' : 'off',
        ]);

        // Rate limits for the account-security endpoints. Each has its OWN counter:
        // Laravel's string form (throttle:10,1) keys only on the client, so login,
        // register and these endpoints would otherwise share one bucket and a few
        // normal logins could lock someone out of "forgot password". Logged-in
        // routes count per account, public ones per client address.
        $perUserOrIp = fn (Request $request) => $request->user()?->getAuthIdentifier() ?: $request->ip();

        // Login: 20 requests a minute per client address, whatever the account, so
        // one machine cannot guess across many accounts. The per-ACCOUNT protection
        // (5 failed tries per 5 minutes for an email from one address) lives in
        // LoginController, because it must count only failures.
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(20)->by('login-ip:'.$request->ip()));
        RateLimiter::for('register', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
        RateLimiter::for('feedback', fn (Request $request) => Limit::perMinute(10)->by($perUserOrIp($request)));
        RateLimiter::for('profile-photo', fn (Request $request) => Limit::perMinute(10)->by($perUserOrIp($request)));
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
