<?php

namespace Tests\Feature;

use App\Models\Child;
use App\Models\User;
use App\Notifications\VerificationCodeNotification;
use App\Support\EmailVerificationCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The six-digit email verification code: registration -> verify -> child.
 */
class EmailCodeTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function registerPayload(string $email = 'new@example.com'): array
    {
        return [
            'first_name' => 'Pat', 'last_name' => 'Parent', 'phone' => '0917', 'email' => $email,
            'password' => 'password-123', 'password_confirmation' => 'password-123',
        ];
    }

    /** Registers, returns [User, token, code]. The code is read from the (faked) email. */
    private function register(string $email = 'new@example.com'): array
    {
        Notification::fake();
        config(['mail.default' => 'smtp']);

        $token = $this->postJson('/api/register', $this->registerPayload($email))
            ->assertCreated()->json('token');

        $user = User::where('email', $email)->firstOrFail();

        return [$user, $token, $this->lastCode($user)];
    }

    private function lastCode(User $user): string
    {
        $code = null;

        Notification::assertSentTo($user, VerificationCodeNotification::class, function ($notification) use (&$code) {
            $code = $notification->code;

            return true;
        });

        return $code;
    }

    private function as(string $token)
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($token);
    }

    private function wrongCode(string $right): string
    {
        return $right === '000000' ? '111111' : '000000';
    }

    // ---------------------------------------------------------------- registration

    public function test_registration_creates_an_unverified_parent_emails_a_code_and_signs_in(): void
    {
        [$user, $token, $code] = $this->register();

        $this->assertNull($user->email_verified_at);
        $this->assertSame('parent', $user->role);
        $this->assertSame(0, Child::count());
        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);
        $this->assertNotSame('', $token);
        Notification::assertSentTo($user, VerificationCodeNotification::class);
    }

    public function test_the_registration_response_never_contains_the_code(): void
    {
        Notification::fake();

        $response = $this->postJson('/api/register', $this->registerPayload())->assertCreated();
        $code = $this->lastCode(User::firstOrFail());

        $this->assertStringNotContainsString($code, $response->getContent());
    }

    public function test_the_stored_value_is_a_hash_not_the_code(): void
    {
        [$user, , $code] = $this->register();

        $entry = Cache::get('email-code:'.$user->id);

        $this->assertIsArray($entry);
        $this->assertStringNotContainsString($code, json_encode($entry));
        $this->assertSame(64, strlen($entry['digest']));
    }

    public function test_a_mail_failure_does_not_block_registration_and_leaves_no_code(): void
    {
        config([
            'mail.default' => 'smtp',
            'mail.mailers.smtp.host' => '127.0.0.1',
            'mail.mailers.smtp.port' => 1,
            'mail.mailers.smtp.timeout' => 2,
        ]);

        $this->postJson('/api/register', $this->registerPayload())
            ->assertCreated()
            ->assertJsonPath('email_verification.sent', false);

        $user = User::firstOrFail();
        $this->assertNull(EmailVerificationCode::secondsLeft($user));
    }

    public function test_the_admin_email_is_still_reserved_and_the_same_email_cannot_register_twice(): void
    {
        config(['theraplay.admin.email' => 'theraplay.system@gmail.com']);
        Notification::fake();

        $this->postJson('/api/register', $this->registerPayload('theraplay.system@gmail.com'))->assertStatus(422);
        $this->postJson('/api/register', $this->registerPayload())->assertCreated();
        $this->postJson('/api/register', $this->registerPayload())->assertStatus(422)->assertJsonValidationErrors('email');
    }

    // ---------------------------------------------------------------- verifying

    public function test_the_correct_code_verifies_the_email_and_is_single_use(): void
    {
        [$user, $token, $code] = $this->register();

        $this->as($token)->postJson('/api/email/code/verify', ['code' => $code])
            ->assertOk()
            ->assertJsonPath('status', 'verified')
            ->assertJsonPath('user.email_verified', true)
            ->assertJsonPath('user.onboarding', 'create_child');

        $this->assertNotNull($user->fresh()->email_verified_at);
        $this->assertNull(Cache::get('email-code:'.$user->id));

        // Using the same code again is refused (it was consumed); the account stays verified.
        User::whereKey($user->id)->update(['email_verified_at' => null]);
        $this->as($token)->postJson('/api/email/code/verify', ['code' => $code])
            ->assertStatus(410)->assertJsonPath('status', 'expired');
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_a_wrong_code_is_refused_and_the_flow_continues(): void
    {
        [$user, $token, $code] = $this->register();

        $this->as($token)->postJson('/api/email/code/verify', ['code' => $this->wrongCode($code)])
            ->assertStatus(422)
            ->assertJsonPath('status', 'invalid')
            ->assertJsonPath('attempts_left', 4);

        $this->assertNull($user->fresh()->email_verified_at);

        // The right code still works afterwards.
        $this->as($token)->postJson('/api/email/code/verify', ['code' => $code])->assertOk();
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_the_input_must_be_six_digits(): void
    {
        [, $token] = $this->register();

        foreach (['12345', '1234567', 'abcdef', '12 456', ''] as $bad) {
            $this->as($token)->postJson('/api/email/code/verify', ['code' => $bad])
                ->assertStatus(422)->assertJsonValidationErrors('code');
        }
    }

    public function test_an_expired_code_is_refused(): void
    {
        [$user, $token, $code] = $this->register();

        Carbon::setTestNow(now()->addMinutes(11));

        $this->as($token)->postJson('/api/email/code/verify', ['code' => $code])
            ->assertStatus(410)->assertJsonPath('status', 'expired');
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_five_wrong_guesses_destroy_the_code_even_for_the_right_one(): void
    {
        [$user, $token, $code] = $this->register();
        $wrong = $this->wrongCode($code);

        for ($i = 0; $i < 4; $i++) {
            $this->as($token)->postJson('/api/email/code/verify', ['code' => $wrong])->assertStatus(422)->assertJsonPath('status', 'invalid');
        }
        $this->as($token)->postJson('/api/email/code/verify', ['code' => $wrong])
            ->assertStatus(422)->assertJsonPath('status', 'too_many_attempts');

        $this->as($token)->postJson('/api/email/code/verify', ['code' => $code])->assertStatus(410);
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_verification_requests_are_rate_limited(): void
    {
        [, $token, $code] = $this->register();
        $wrong = $this->wrongCode($code);

        // 10 per minute; the attempt limit would stop earlier, so use fresh codes
        // by hitting the endpoint with malformed input (it still counts).
        for ($i = 0; $i < 10; $i++) {
            $this->as($token)->postJson('/api/email/code/verify', ['code' => 'x'])->assertStatus(422);
        }

        $this->as($token)->postJson('/api/email/code/verify', ['code' => $wrong])->assertStatus(429);
        $this->as($token)->postJson('/api/email/code/verify', ['code' => $code])->assertStatus(429);
    }

    // ---------------------------------------------------------------- resending

    public function test_a_new_code_invalidates_the_previous_one(): void
    {
        [$user, $token, $old] = $this->register();

        Notification::fake();
        $this->as($token)->postJson('/api/email/code/resend')->assertOk()->assertJsonPath('status', 'sent');
        $new = $this->lastCode($user);

        // (The two codes are random; in the one-in-a-million case they match, the
        // old one is by definition the new one.)
        if ($new !== $old) {
            $this->as($token)->postJson('/api/email/code/verify', ['code' => $old])
                ->assertStatus(422)->assertJsonPath('status', 'invalid');
            $this->assertNull($user->fresh()->email_verified_at);
        }

        $this->as($token)->postJson('/api/email/code/verify', ['code' => $new])->assertOk();
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_resending_is_rate_limited_and_honest_about_delivery(): void
    {
        [, $token] = $this->register();

        for ($i = 0; $i < 3; $i++) {
            $this->as($token)->postJson('/api/email/code/resend')->assertOk();
        }

        $this->as($token)->postJson('/api/email/code/resend')->assertStatus(429);
    }

    public function test_resend_does_not_claim_delivery_with_the_log_driver(): void
    {
        [, $token] = $this->register();
        config(['mail.default' => 'log']);

        $this->as($token)->postJson('/api/email/code/resend')
            ->assertOk()->assertJsonPath('delivered', false)->assertJsonPath('status', 'not_delivered');
    }

    public function test_resending_for_a_verified_account_sends_nothing(): void
    {
        [$user, $token] = $this->register();
        $user->forceFill(['email_verified_at' => now()])->save();
        Notification::fake();

        $this->as($token)->postJson('/api/email/code/resend')->assertOk()->assertJsonPath('status', 'already_verified');
        Notification::assertNothingSent();
    }

    public function test_the_status_tells_whether_a_code_is_active(): void
    {
        [, $token] = $this->register();

        $this->as($token)->getJson('/api/email/code/status')
            ->assertOk()->assertJsonPath('code_active', true)->assertJsonPath('verified', false);

        Carbon::setTestNow(now()->addMinutes(11));

        $this->as($token)->getJson('/api/email/code/status')
            ->assertOk()->assertJsonPath('code_active', false)->assertJsonPath('expires_in', null);
    }

    // ---------------------------------------------------------------- isolation

    public function test_a_code_cannot_verify_another_account_and_guests_are_refused(): void
    {
        [$alice, $aliceToken, $aliceCode] = $this->register('alice@example.com');
        [$bob, $bobToken] = $this->register('bob@example.com');

        // Bob presents Alice's code: it is checked against Bob's own account only.
        $this->as($bobToken)->postJson('/api/email/code/verify', ['code' => $aliceCode])->assertStatus(422);

        $this->assertNull($bob->fresh()->email_verified_at);
        $this->assertNull($alice->fresh()->email_verified_at);

        $this->app['auth']->forgetGuards();
        $this->flushHeaders()->postJson('/api/email/code/verify', ['code' => $aliceCode])->assertUnauthorized();
        $this->flushHeaders()->postJson('/api/email/code/resend')->assertUnauthorized();
    }

    // ---------------------------------------------------------------- onboarding

    public function test_the_onboarding_step_follows_the_account_state(): void
    {
        [$user, $token, $code] = $this->register();

        $this->as($token)->getJson('/api/user')->assertOk()->assertJsonPath('onboarding', 'verify_email');

        $this->as($token)->postJson('/api/email/code/verify', ['code' => $code])->assertOk();
        $this->as($token)->getJson('/api/user')->assertJsonPath('onboarding', 'create_child');

        $this->as($token)->postJson('/api/children', ['name' => 'Sam'])->assertCreated();
        $this->as($token)->getJson('/api/user')->assertJsonPath('onboarding', 'complete');
    }

    public function test_an_unverified_parent_cannot_create_a_child_but_a_verified_one_can(): void
    {
        [$user, $token, $code] = $this->register();

        $this->as($token)->postJson('/api/children', ['name' => 'Sam'])
            ->assertForbidden()->assertJsonPath('code', 'email_not_verified');
        $this->assertSame(0, Child::count());

        $this->as($token)->postJson('/api/email/code/verify', ['code' => $code])->assertOk();
        $this->as($token)->postJson('/api/children', ['name' => 'Sam'])->assertCreated();
        $this->assertSame(1, Child::where('user_id', $user->id)->count());
    }

    public function test_repeated_submissions_of_the_same_child_create_one_profile(): void
    {
        [$user, $token, $code] = $this->register();
        $this->as($token)->postJson('/api/email/code/verify', ['code' => $code])->assertOk();

        $this->as($token)->postJson('/api/children', ['name' => 'Sam', 'date_of_birth' => '2020-01-01'])->assertCreated();
        $this->as($token)->postJson('/api/children', ['name' => 'Sam', 'date_of_birth' => '2020-01-01'])
            ->assertOk()->assertJsonPath('message', 'This child profile was already created.');

        $this->assertSame(1, Child::where('user_id', $user->id)->count());

        // A different child is a different profile.
        $this->as($token)->postJson('/api/children', ['name' => 'Lee'])->assertCreated();
        $this->assertSame(2, Child::where('user_id', $user->id)->count());
    }

    public function test_existing_accounts_keep_their_state_and_admins_have_no_onboarding(): void
    {
        $verifiedWithChild = User::create(['name' => 'A', 'email' => 'a@example.com', 'password' => 'password-123']);
        $verifiedWithChild->forceFill(['role' => 'parent', 'email_verified_at' => now()])->save();
        Child::create(['user_id' => $verifiedWithChild->id, 'name' => 'Kid']);

        $verifiedNoChild = User::create(['name' => 'B', 'email' => 'b@example.com', 'password' => 'password-123']);
        $verifiedNoChild->forceFill(['role' => 'parent', 'email_verified_at' => now()])->save();

        $unverified = User::create(['name' => 'C', 'email' => 'c@example.com', 'password' => 'password-123']);
        $unverified->forceFill(['role' => 'parent'])->save();

        $admin = User::create(['name' => 'D', 'email' => 'd@example.com', 'password' => 'password-123']);
        $admin->forceFill(['role' => 'admin'])->save();

        $this->assertSame('complete', $verifiedWithChild->onboardingStep());
        $this->assertSame('create_child', $verifiedNoChild->onboardingStep());
        $this->assertSame('verify_email', $unverified->onboardingStep());
        $this->assertSame('complete', $admin->onboardingStep());

        // An old unverified account can finish through the same code flow after logging in.
        Notification::fake();
        Sanctum::actingAs($unverified);
        $this->postJson('/api/email/code/resend')->assertOk();
        Notification::assertSentTo($unverified, VerificationCodeNotification::class);
    }

    public function test_the_email_stays_locked_after_registration(): void
    {
        [, $token] = $this->register();

        $this->as($token)->putJson('/api/profile', ['name' => 'Pat', 'email' => 'other@example.com'])
            ->assertStatus(422)->assertJsonValidationErrors('email');
    }
}
