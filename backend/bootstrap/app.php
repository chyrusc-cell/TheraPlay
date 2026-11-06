<?php

use App\Http\Middleware\AddSecurityHeaders;
use App\Http\Middleware\EnsureActivityNotArchived;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\EnsureVerifiedParent;
use App\Http\Middleware\RequireVerifiedEmailWhenEnforced;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Http\Exceptions\ThrottleRequestsException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Behind a Cloudflare Quick Tunnel the request reaches PHP from cloudflared on this
        // same machine, with the real scheme/host/client address in X-Forwarded-* headers.
        // Trusting ONLY loopback makes url() produce https links (pictures, downloads) and
        // the rate limiters see real client addresses; a remote client cannot forge them.
        $middleware->trustProxies(at: ['127.0.0.1', '::1']);

        $middleware->alias([
            'role' => EnsureUserHasRole::class,
            'activity.live' => EnsureActivityNotArchived::class,
            'verified.parent' => EnsureVerifiedParent::class,
        ]);

        // Every API request: accounts that must verify their email are held back.
        $middleware->api(append: [AddSecurityHeaders::class, RequireVerifiedEmailWhenEnforced::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // A clear message (the app shows it as it is) instead of the bare default.
        $exceptions->render(function (ThrottleRequestsException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => 'Too many requests. Please wait a moment and try again.',
                ], 429, $e->getHeaders());
            }
        });
    })->create();
