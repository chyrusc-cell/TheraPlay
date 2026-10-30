<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class ConfigurationAndLimitsTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role = 'parent'): User
    {
        $user = User::create(['name' => 'U', 'email' => $role.'@example.com', 'password' => 'password123']);
        $user->forceFill(['role' => $role])->save();

        return $user;
    }

    // ---------------- Errors never leak internals when debug is off ----------------

    public function test_a_public_404_has_no_stack_trace_or_file_paths_when_debug_is_off(): void
    {
        config(['app.debug' => false]);

        $body = $this->getJson('/api/activities/999999')->assertNotFound()->getContent();

        $this->assertStringNotContainsString('trace', $body);
        $this->assertStringNotContainsString('.php', $body);
        $this->assertStringNotContainsString('vendor', $body);
        $this->assertStringNotContainsString('Symfony', $body);
    }

    public function test_the_example_environment_file_ships_safe_values(): void
    {
        $example = file_get_contents(base_path('.env.example'));

        $this->assertMatchesRegularExpression('/^APP_DEBUG=false$/m', $example);
        $this->assertMatchesRegularExpression('/^APP_KEY=$/m', $example);
        $this->assertDoesNotMatchRegularExpression('/^DB_PASSWORD=.+$/m', $example);
        $this->assertDoesNotMatchRegularExpression('/^MAIL_PASSWORD=(?!null).+$/m', $example);
    }

    // ---------------- Token lifetime ----------------

    public function test_tokens_expire_after_the_configured_lifetime(): void
    {
        config(['sanctum.expiration' => 60]);
        $user = $this->user();
        $token = $user->createToken('t')->plainTextToken;

        $this->withToken($token)->getJson('/api/user')->assertOk();

        PersonalAccessToken::query()->update(['created_at' => Carbon::now()->subMinutes(61)]);

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
    }

    public function test_a_fresh_login_works_and_logout_still_revokes_the_token(): void
    {
        $this->user();

        $token = $this->postJson('/api/login', ['email' => 'parent@example.com', 'password' => 'password123'])
            ->assertOk()->json('token');

        $this->withToken($token)->getJson('/api/user')->assertOk();
        $this->withToken($token)->postJson('/api/logout')->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
    }

    public function test_the_default_token_lifetime_is_seven_days(): void
    {
        $this->assertSame(10080, config('sanctum.expiration'));
    }

    // ---------------- CORS ----------------

    public function test_only_the_configured_origins_may_call_the_api_from_a_browser(): void
    {
        config(['cors.allowed_origins' => ['https://app.example.test']]);

        $allowed = $this->call('OPTIONS', '/api/activities', [], [], [], [
            'HTTP_ORIGIN' => 'https://app.example.test',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
        ]);
        $this->assertSame('https://app.example.test', $allowed->headers->get('Access-Control-Allow-Origin'));

        $other = $this->call('OPTIONS', '/api/activities', [], [], [], [
            'HTTP_ORIGIN' => 'https://evil.example.test',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
        ]);
        // A browser only accepts the response when the header names ITS origin.
        $this->assertNotSame('https://evil.example.test', $other->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_the_local_vite_origin_is_allowed_by_default(): void
    {
        $response = $this->call('OPTIONS', '/api/activities', [], [], [], [
            'HTTP_ORIGIN' => 'http://localhost:5173',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'GET',
        ]);

        $this->assertSame('http://localhost:5173', $response->headers->get('Access-Control-Allow-Origin'));
    }

    // ---------------- Throttling ----------------

    public function test_feedback_is_rate_limited_with_a_clear_message(): void
    {
        $parent = $this->user('parent');
        $this->actingAs($parent, 'sanctum');

        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/feedback', ['message' => "Message {$i}"])->assertCreated();
        }

        $this->postJson('/api/feedback', ['message' => 'One too many'])
            ->assertStatus(429)
            ->assertJsonPath('message', 'Too many requests. Please wait a moment and try again.');
    }

    public function test_profile_picture_changes_are_rate_limited(): void
    {
        Storage::fake('local');
        $this->actingAs($this->user('parent'), 'sanctum');

        for ($i = 0; $i < 10; $i++) {
            $this->deleteJson('/api/profile/photo')->assertOk();
        }

        $this->deleteJson('/api/profile/photo')->assertStatus(429)->assertJsonPath('message', 'Too many requests. Please wait a moment and try again.');
    }
}
