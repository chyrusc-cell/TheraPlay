<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Cloudflare Quick Tunnel support (see TUNNEL.md): cloudflared connects from this
 * machine, so only loopback is a trusted proxy, and only the listed frontend origins
 * may call the API from a browser.
 */
class TunnelSupportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::get('/api/_tunnel-probe', fn () => response()->json([
            'url' => url('/api/x'),
            'secure' => request()->isSecure(),
            'ip' => request()->ip(),
        ]));
    }

    public function test_forwarded_headers_from_the_local_tunnel_produce_https_links(): void
    {
        $response = $this->withServerVariables([
            'REMOTE_ADDR' => '127.0.0.1',
            'HTTP_X_FORWARDED_PROTO' => 'https',
            'HTTP_X_FORWARDED_HOST' => 'api-demo.trycloudflare.com',
            'HTTP_X_FORWARDED_FOR' => '203.0.113.7',
        ])->getJson('/api/_tunnel-probe')->assertOk();

        $response->assertJsonPath('url', 'https://api-demo.trycloudflare.com/api/x');
        $response->assertJsonPath('secure', true);
        $response->assertJsonPath('ip', '203.0.113.7');
    }

    public function test_forwarded_headers_from_any_other_address_are_ignored(): void
    {
        $response = $this->withServerVariables([
            'REMOTE_ADDR' => '203.0.113.9',
            'HTTP_X_FORWARDED_PROTO' => 'https',
            'HTTP_X_FORWARDED_HOST' => 'evil.example',
            'HTTP_X_FORWARDED_FOR' => '198.51.100.1',
        ])->getJson('/api/_tunnel-probe')->assertOk();

        $response->assertJsonPath('secure', false);
        $response->assertJsonPath('ip', '203.0.113.9');
        $this->assertStringNotContainsString('evil.example', $response->json('url'));
    }

    public function test_only_the_configured_frontend_origins_pass_cors(): void
    {
        config(['cors.allowed_origins' => ['https://web-demo.trycloudflare.com', 'http://localhost:5173']]);

        $this->call('OPTIONS', '/api/user', [], [], [], [
            'HTTP_ORIGIN' => 'https://web-demo.trycloudflare.com',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'authorization',
        ])->assertHeader('Access-Control-Allow-Origin', 'https://web-demo.trycloudflare.com');

        $this->call('OPTIONS', '/api/user', [], [], [], [
            'HTTP_ORIGIN' => 'https://other.trycloudflare.com',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
        ])->assertHeaderMissing('Access-Control-Allow-Origin');
    }

    public function test_cors_never_allows_credentials_or_every_origin(): void
    {
        $this->assertFalse(config('cors.supports_credentials'));
        $this->assertNotContains('*', config('cors.allowed_origins'));
    }
}
