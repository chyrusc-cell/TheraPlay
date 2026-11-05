<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use RuntimeException;
use Tests\TestCase;

class ForgotPasswordTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $email = 'me@example.com'): User
    {
        return User::create([
            'name' => 'Test User',
            'email' => $email,
            'password' => 'old-password-1',
        ]);
    }

    private function captureToken(User $user): string
    {
        $token = null;

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use (&$token) {
            $token = $notification->token;

            return true;
        });

        return $token;
    }

    // --- Accepting requests ---

    public function test_a_guest_can_request_a_reset_link(): void
    {
        Notification::fake();
        $user = $this->makeUser();

        $this->postJson('/api/forgot-password', ['email' => 'me@example.com'])
            ->assertOk()
            ->assertJsonStructure(['message', 'delivery_available']);

        Notification::assertSentTo($user, ResetPassword::class);
        Notification::assertCount(1);
    }

    public function test_the_request_uses_the_laravel_password_broker_and_the_react_reset_link(): void
    {
        Notification::fake();
        config(['app.frontend_url' => 'http://localhost:5173']);
        $user = $this->makeUser();

        $this->postJson('/api/forgot-password', ['email' => 'me@example.com'])->assertOk();

        // A token was stored by the standard broker, and the emailed link
        // points at the React reset page.
        $token = $this->captureToken($user);
        $this->assertTrue(Password::tokenExists($user, $token));
        $this->assertDatabaseHas('password_reset_tokens', ['email' => 'me@example.com']);

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
            $url = $notification->toMail($user)->actionUrl;

            return str_starts_with($url, 'http://localhost:5173/reset-password?token=')
                && str_contains($url, 'email='.urlencode('me@example.com'));
        });
    }

    public function test_requesting_a_link_never_changes_the_password(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        $user->createToken('device');
        $before = $user->password;

        $this->postJson('/api/forgot-password', ['email' => 'me@example.com'])->assertOk();

        $this->assertSame($before, $user->fresh()->password);
        $this->assertSame(1, $user->tokens()->count());
    }

    // --- Validation ---

    public function test_invalid_email_input_is_rejected(): void
    {
        // This test sends many requests; the rate limit has its own test below.
        $this->withoutMiddleware(ThrottleRequests::class);

        Notification::fake();

        $this->postJson('/api/forgot-password', [])
            ->assertStatus(422)->assertJsonValidationErrors('email');

        foreach (['', 'not-an-email', 'a@', str_repeat('a', 250).'@example.com', ['me@example.com']] as $bad) {
            $this->postJson('/api/forgot-password', ['email' => $bad])
                ->assertStatus(422)->assertJsonValidationErrors('email');
        }

        Notification::assertNothingSent();
    }

    // --- Account enumeration ---

    public function test_known_and_unknown_emails_get_identical_responses(): void
    {
        Notification::fake();
        config(['mail.default' => 'smtp']);
        $this->makeUser('real@example.com');

        $known = $this->postJson('/api/forgot-password', ['email' => 'real@example.com']);
        $unknown = $this->postJson('/api/forgot-password', ['email' => 'nobody@example.com']);

        $known->assertOk();
        $unknown->assertOk();
        $this->assertSame($known->status(), $unknown->status());
        $this->assertSame($known->json(), $unknown->json());

        // The wording is conditional, never "we sent it to you".
        $this->assertStringContainsString('If an account exists', $known->json('message'));

        // Only the real account got an email, and no token exists for the other.
        Notification::assertCount(1);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'nobody@example.com']);
    }

    public function test_a_repeat_request_inside_the_broker_throttle_looks_the_same(): void
    {
        Notification::fake();
        config(['mail.default' => 'smtp']);
        $this->makeUser('real@example.com');

        $first = $this->postJson('/api/forgot-password', ['email' => 'real@example.com']);
        $second = $this->postJson('/api/forgot-password', ['email' => 'real@example.com']);
        $unknown = $this->postJson('/api/forgot-password', ['email' => 'nobody@example.com']);

        // The broker throttled the second one internally, but the caller sees
        // the same 200 and body as for an address that does not exist.
        $this->assertSame(200, $second->status());
        $this->assertSame($first->json(), $second->json());
        $this->assertSame($unknown->json(), $second->json());
        Notification::assertCount(1);
    }

    public function test_a_mail_failure_looks_the_same_and_leaks_nothing(): void
    {
        config(['mail.default' => 'smtp']);
        $this->makeUser('real@example.com');

        $unknown = $this->postJson('/api/forgot-password', ['email' => 'nobody@example.com']);

        ResetPassword::toMailUsing(function () {
            throw new RuntimeException('smtp password hunter2 at mail.internal');
        });

        try {
            $failed = $this->postJson('/api/forgot-password', ['email' => 'real@example.com']);
        } finally {
            ResetPassword::toMailUsing(null);
        }

        $failed->assertOk();
        $this->assertSame($unknown->json(), $failed->json());
        $this->assertStringNotContainsString('hunter2', $failed->getContent());
        $this->assertStringNotContainsString('mail.internal', $failed->getContent());

        // The unusable token was removed.
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'real@example.com']);
    }

    // --- Secrets ---

    public function test_the_response_never_contains_a_token_or_a_reset_url(): void
    {
        Notification::fake();
        config(['mail.default' => 'smtp']);
        $user = $this->makeUser();

        $response = $this->postJson('/api/forgot-password', ['email' => 'me@example.com'])->assertOk();

        $token = $this->captureToken($user);
        $body = $response->getContent();

        $this->assertStringNotContainsString($token, $body);
        $this->assertStringNotContainsString('reset-password', $body);
        $this->assertStringNotContainsString('http', $body);
        $this->assertStringNotContainsString('token', strtolower($body));
        $this->assertSame(['message', 'delivery_available'], array_keys($response->json()));
    }

    // --- Honest delivery status ---

    public function test_it_does_not_claim_delivery_when_the_mail_driver_only_logs(): void
    {
        Notification::fake();
        $this->makeUser();

        foreach (['log', 'array'] as $driver) {
            config(['mail.default' => $driver]);

            $this->postJson('/api/forgot-password', ['email' => 'me@example.com'])
                ->assertOk()
                ->assertJsonPath('delivery_available', false)
                ->assertJsonPath(
                    'message',
                    'Email delivery is not set up on this server yet, so no email was delivered. Please contact the administrator.'
                );

            // Unknown addresses get the very same answer.
            $this->postJson('/api/forgot-password', ['email' => 'nobody@example.com'])
                ->assertOk()
                ->assertJsonPath('delivery_available', false);
        }
    }

    public function test_it_reports_delivery_available_with_a_real_mail_driver(): void
    {
        Notification::fake();
        config(['mail.default' => 'smtp']);
        $this->makeUser();

        $this->postJson('/api/forgot-password', ['email' => 'me@example.com'])
            ->assertOk()
            ->assertJsonPath('delivery_available', true);
    }

    // --- Rate limiting ---

    public function test_the_endpoint_is_rate_limited(): void
    {
        Notification::fake();

        foreach (range(1, 5) as $i) {
            $this->postJson('/api/forgot-password', ['email' => "user{$i}@example.com"])->assertOk();
        }

        $this->postJson('/api/forgot-password', ['email' => 'user6@example.com'])->assertStatus(429);
    }

    // --- The whole flow, and the existing flows still working ---

    public function test_the_full_flow_from_the_forgot_page_to_a_new_password(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        $user->createToken('old-device');

        $this->postJson('/api/forgot-password', ['email' => 'me@example.com'])->assertOk();
        $token = $this->captureToken($user);

        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => 'me@example.com',
            'password' => 'brand-new-pass-1',
            'password_confirmation' => 'brand-new-pass-1',
        ])->assertOk();

        $this->assertTrue(Hash::check('brand-new-pass-1', $user->fresh()->password));
        $this->assertSame(0, $user->tokens()->count());

        // The token is single-use.
        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => 'me@example.com',
            'password' => 'second-attempt-9',
            'password_confirmation' => 'second-attempt-9',
        ])->assertStatus(422);
    }

    public function test_the_authenticated_profile_request_still_works_and_stays_separate(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        $user->forceFill(['role' => 'parent'])->save();
        \Laravel\Sanctum\Sanctum::actingAs($user);

        // Still needs a login and still answers with its own shape.
        $this->postJson('/api/profile/password-reset')
            ->assertOk()
            ->assertJsonStructure(['message', 'delivered']);

        Notification::assertSentTo($user, ResetPassword::class);
    }
}
