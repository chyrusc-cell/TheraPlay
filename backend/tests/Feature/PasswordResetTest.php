<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $email, string $role = 'parent'): User
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => $email,
            'password' => 'old-password-1',
        ]);

        $user->forceFill(['role' => $role])->save();

        return $user;
    }

    // Captures the token the user would receive in their email.
    private function captureToken(User $user): string
    {
        $token = null;

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use (&$token) {
            $token = $notification->token;

            return true;
        });

        return $token;
    }

    // --- Requesting a reset (authenticated) ---

    public function test_guests_cannot_request_a_reset_from_the_profile_endpoint(): void
    {
        Notification::fake();

        $this->postJson('/api/profile/password-reset', ['email' => 'someone@example.com'])
            ->assertUnauthorized();

        Notification::assertNothingSent();
    }

    public function test_a_user_can_request_a_reset_link_for_their_own_email(): void
    {
        Notification::fake();
        config(['mail.default' => 'smtp']);
        $user = $this->makeUser('me@example.com');
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/profile/password-reset')
            ->assertOk()
            ->assertJsonPath('delivered', true);

        Notification::assertSentTo($user, ResetPassword::class);
        Notification::assertCount(1);

        // The token is only ever inside the email, never in the response.
        $token = $this->captureToken($user);
        $this->assertStringNotContainsString($token, $response->getContent());
        $this->assertStringNotContainsString('token', strtolower($response->getContent()));
    }

    public function test_the_emailed_link_leads_to_the_react_reset_page(): void
    {
        Notification::fake();
        config(['app.frontend_url' => 'http://localhost:5173']);
        $user = $this->makeUser('me@example.com');
        Sanctum::actingAs($user);

        $this->postJson('/api/profile/password-reset')->assertOk();

        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
            $url = $notification->toMail($user)->actionUrl;

            return str_starts_with($url, 'http://localhost:5173/reset-password?token=')
                && str_contains($url, 'email='.urlencode('me@example.com'));
        });
    }

    public function test_a_forged_email_or_user_id_cannot_target_another_account(): void
    {
        Notification::fake();
        $me = $this->makeUser('me@example.com');
        $victim = $this->makeUser('victim@example.com');
        Sanctum::actingAs($me);

        $this->postJson('/api/profile/password-reset', [
            'email' => 'victim@example.com',
            'user_id' => $victim->id,
        ])->assertOk();

        Notification::assertSentTo($me, ResetPassword::class);
        Notification::assertNotSentTo($victim, ResetPassword::class);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'victim@example.com']);
    }

    public function test_requesting_a_reset_never_changes_the_password(): void
    {
        Notification::fake();
        $user = $this->makeUser('me@example.com');
        $before = $user->password;
        Sanctum::actingAs($user);

        $this->postJson('/api/profile/password-reset')->assertOk();

        $this->assertSame($before, $user->fresh()->password);
    }

    public function test_the_response_is_honest_when_email_delivery_is_not_configured(): void
    {
        Notification::fake();
        // The test environment uses the "array" mail driver, like "log".
        Sanctum::actingAs($this->makeUser('me@example.com'));

        $this->postJson('/api/profile/password-reset')
            ->assertOk()
            ->assertJsonPath('delivered', false)
            ->assertJsonPath('message', 'Email delivery is not set up on this server yet, so no email was delivered. Please contact the administrator.');
    }

    public function test_repeated_requests_are_throttled(): void
    {
        Notification::fake();
        $user = $this->makeUser('me@example.com');
        Sanctum::actingAs($user);

        $this->postJson('/api/profile/password-reset')->assertOk();
        $this->postJson('/api/profile/password-reset')->assertStatus(429);

        Notification::assertCount(1);
    }

    public function test_a_mail_failure_returns_a_safe_error_and_allows_an_immediate_retry(): void
    {
        $user = $this->makeUser('me@example.com');
        Sanctum::actingAs($user);

        ResetPassword::toMailUsing(function () {
            throw new RuntimeException('smtp password hunter2 at mail.internal');
        });

        try {
            $response = $this->postJson('/api/profile/password-reset')->assertStatus(503);
        } finally {
            ResetPassword::toMailUsing(null);
        }

        // Nothing internal leaks, and the unusable token was removed.
        $this->assertStringNotContainsString('hunter2', $response->getContent());
        $this->assertStringNotContainsString('mail.internal', $response->getContent());
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'me@example.com']);

        // So the user is not locked out by the throttle.
        Notification::fake();
        $this->postJson('/api/profile/password-reset')->assertOk();
    }

    // --- Completing a reset ---

    public function test_a_valid_token_resets_the_password_and_it_is_hashed(): void
    {
        Event::fake([PasswordReset::class]);
        $user = $this->makeUser('me@example.com');
        $user->createToken('device');
        $token = Password::createToken($user);

        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => 'me@example.com',
            'password' => 'brand-new-pass-1',
            'password_confirmation' => 'brand-new-pass-1',
        ])->assertOk();

        $fresh = $user->fresh();
        $this->assertNotSame('brand-new-pass-1', $fresh->password);
        $this->assertTrue(Hash::check('brand-new-pass-1', $fresh->password));
        $this->assertFalse(Hash::check('old-password-1', $fresh->password));

        // Old logins are revoked and the event is fired.
        $this->assertSame(0, $fresh->tokens()->count());
        Event::assertDispatched(PasswordReset::class);

        // The new password works for a real login.
        $this->postJson('/api/login', [
            'email' => 'me@example.com',
            'password' => 'brand-new-pass-1',
        ])->assertOk();
    }

    public function test_a_token_cannot_be_used_twice(): void
    {
        $user = $this->makeUser('me@example.com');
        $token = Password::createToken($user);
        $payload = [
            'token' => $token,
            'email' => 'me@example.com',
            'password' => 'brand-new-pass-1',
            'password_confirmation' => 'brand-new-pass-1',
        ];

        $this->postJson('/api/reset-password', $payload)->assertOk();

        $payload['password'] = $payload['password_confirmation'] = 'second-attempt-9';
        $this->postJson('/api/reset-password', $payload)->assertStatus(422);

        $this->assertTrue(Hash::check('brand-new-pass-1', $user->fresh()->password));
    }

    public function test_invalid_tokens_cannot_reset_a_password(): void
    {
        $user = $this->makeUser('me@example.com');
        $before = $user->password;
        Password::createToken($user);

        $this->postJson('/api/reset-password', [
            'token' => 'not-the-real-token',
            'email' => 'me@example.com',
            'password' => 'hijacked-pass-1',
            'password_confirmation' => 'hijacked-pass-1',
        ])->assertStatus(422)->assertJsonPath('message', 'This password reset link is invalid or has expired. Please request a new one.');

        $this->assertSame($before, $user->fresh()->password);
    }

    public function test_expired_tokens_cannot_reset_a_password(): void
    {
        $user = $this->makeUser('me@example.com');
        $before = $user->password;
        $token = Password::createToken($user);

        $this->travel(61)->minutes();

        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => 'me@example.com',
            'password' => 'too-late-pass-1',
            'password_confirmation' => 'too-late-pass-1',
        ])->assertStatus(422);

        $this->assertSame($before, $user->fresh()->password);
    }

    public function test_a_valid_token_cannot_reset_a_different_account(): void
    {
        $mine = $this->makeUser('me@example.com');
        $victim = $this->makeUser('victim@example.com');
        $victimBefore = $victim->password;
        $myToken = Password::createToken($mine);

        $this->postJson('/api/reset-password', [
            'token' => $myToken,
            'email' => 'victim@example.com',
            'password' => 'hijacked-pass-1',
            'password_confirmation' => 'hijacked-pass-1',
        ])->assertStatus(422);

        $this->assertSame($victimBefore, $victim->fresh()->password);
    }

    public function test_unknown_emails_get_the_same_answer_as_bad_tokens(): void
    {
        $bad = $this->postJson('/api/reset-password', [
            'token' => 'whatever',
            'email' => 'nobody@example.com',
            'password' => 'new-password-1',
            'password_confirmation' => 'new-password-1',
        ])->assertStatus(422);

        $this->assertSame(
            'This password reset link is invalid or has expired. Please request a new one.',
            $bad->json('message')
        );
    }

    public function test_new_passwords_are_validated(): void
    {
        $user = $this->makeUser('me@example.com');
        $token = Password::createToken($user);
        $base = ['token' => $token, 'email' => 'me@example.com'];

        $this->postJson('/api/reset-password', [])
            ->assertStatus(422)->assertJsonValidationErrors(['token', 'email', 'password']);

        $this->postJson('/api/reset-password', $base + [
            'password' => 'short', 'password_confirmation' => 'short',
        ])->assertStatus(422)->assertJsonValidationErrors('password');

        $this->postJson('/api/reset-password', $base + [
            'password' => 'long-enough-1', 'password_confirmation' => 'different-1',
        ])->assertStatus(422)->assertJsonValidationErrors('password');

        $this->postJson('/api/reset-password', $base + [
            'password' => 'long-enough-1',
        ])->assertStatus(422)->assertJsonValidationErrors('password');

        // None of the failed attempts consumed the token or changed anything.
        $this->assertTrue(Hash::check('old-password-1', $user->fresh()->password));
        $this->postJson('/api/reset-password', $base + [
            'password' => 'long-enough-1', 'password_confirmation' => 'long-enough-1',
        ])->assertOk();
    }

    public function test_existing_login_and_registration_still_work(): void
    {
        $this->makeUser('me@example.com');

        $this->postJson('/api/login', [
            'email' => 'me@example.com',
            'password' => 'old-password-1',
        ])->assertOk();

        $this->postJson('/api/register', [
            'first_name' => 'New',
            'last_name' => 'Parent',
            'email' => 'new@example.com',
            'phone' => '09171234567',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated()->assertJsonPath('user.role', 'parent');
    }
}
