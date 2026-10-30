<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\VerifyEmailAddress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function makeUser(string $email = 'parent@example.com', string $role = 'parent', bool $verified = false): User
    {
        $user = User::create(['name' => 'Test User', 'email' => $email, 'password' => 'password123']);
        $user->forceFill(['role' => $role, 'email_verified_at' => $verified ? now() : null])->save();

        return $user;
    }

    private function link(User $user, ?string $email = null): string
    {
        return VerifyEmailAddress::signedPath($user->id, $email ?? $user->email);
    }

    private function register(string $email = 'new@example.com')
    {
        return $this->postJson('/api/register', [
            'first_name' => 'New', 'last_name' => 'Parent', 'email' => $email, 'phone' => '0917',
            'password' => 'password123', 'password_confirmation' => 'password123',
        ]);
    }

    // ---------------------------------------------------------------- registration

    public function test_registering_sends_a_verification_email_to_the_new_address(): void
    {
        Notification::fake();
        config(['mail.default' => 'smtp']);

        $this->register()->assertCreated()
            ->assertJsonPath('email_verification.sent', true)
            ->assertJsonPath('email_verification.delivery_available', true);

        $user = User::where('email', 'new@example.com')->first();
        $this->assertNull($user->email_verified_at);
        Notification::assertSentTo($user, VerifyEmailAddress::class);
    }

    public function test_the_registration_response_does_not_claim_delivery_with_the_log_driver(): void
    {
        Notification::fake();
        config(['mail.default' => 'log']);

        $this->register()->assertCreated()
            ->assertJsonPath('email_verification.delivery_available', false);
    }

    public function test_a_mail_failure_never_blocks_registration(): void
    {
        // A mail server that cannot be reached (nothing listens on port 1).
        config([
            'mail.default' => 'broken',
            'mail.mailers.broken' => ['transport' => 'smtp', 'host' => '127.0.0.1', 'port' => 1, 'timeout' => 1],
        ]);

        $response = $this->register()->assertCreated()
            ->assertJsonPath('email_verification.sent', false);

        $this->assertDatabaseHas('users', ['email' => 'new@example.com']);
        $this->assertStringNotContainsString('127.0.0.1', $response->getContent());
    }

    public function test_a_client_cannot_register_an_already_verified_account(): void
    {
        Notification::fake();

        $this->postJson('/api/register', [
            'first_name' => 'A', 'last_name' => 'B', 'email' => 'x@example.com', 'phone' => '0917',
            'password' => 'password123', 'password_confirmation' => 'password123',
            'email_verified_at' => now()->toDateTimeString(), 'email_verified' => true, 'role' => 'admin',
        ])->assertCreated();

        $user = User::where('email', 'x@example.com')->first();
        $this->assertNull($user->email_verified_at);
        $this->assertSame('parent', $user->role);
    }

    public function test_the_emailed_link_points_at_the_react_page_with_a_signed_request(): void
    {
        Notification::fake();
        config(['app.frontend_url' => 'http://localhost:5173']);
        $user = $this->makeUser();
        $user->sendEmailVerificationNotification();

        Notification::assertSentTo($user, VerifyEmailAddress::class, function (VerifyEmailAddress $notification) use ($user) {
            $link = $notification->link();
            $this->assertStringStartsWith('http://localhost:5173/verify-email?', $link);
            parse_str(parse_url($link, PHP_URL_QUERY), $query);
            $this->assertSame((string) $user->id, $query['id']);
            $this->assertSame(sha1($user->email), $query['hash']);
            $this->assertArrayHasKey('expires', $query);
            $this->assertArrayHasKey('signature', $query);

            return true;
        });
    }

    // ---------------------------------------------------------------- verifying

    public function test_a_valid_link_verifies_the_address(): void
    {
        $user = $this->makeUser();

        $this->postJson($this->link($user))
            ->assertOk()
            ->assertJsonPath('status', 'verified');

        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_the_link_works_whichever_host_the_api_is_reached_on(): void
    {
        $user = $this->makeUser();

        // Signed on one host, opened through another (127.0.0.1 versus localhost).
        $this->postJson('http://127.0.0.1:8000'.$this->link($user))
            ->assertOk()->assertJsonPath('status', 'verified');
    }

    public function test_verifying_does_not_need_a_login_but_does_need_the_signature(): void
    {
        $user = $this->makeUser();
        $path = '/api/email/verify/'.$user->id.'/'.sha1($user->email);

        $this->postJson($path)->assertForbidden()->assertJsonPath('status', 'invalid');
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_a_link_cannot_be_triggered_by_a_plain_page_load(): void
    {
        $user = $this->makeUser();

        $this->getJson($this->link($user))->assertStatus(405);
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_edited_or_forged_links_are_rejected(): void
    {
        $user = $this->makeUser();
        $other = $this->makeUser('other@example.com');
        $path = $this->link($user);

        // A tampered signature.
        $this->postJson(preg_replace('/signature=.{6}/', 'signature=000000', $path))
            ->assertForbidden()->assertJsonPath('status', 'invalid');

        // A signature made for another user's id, reused on this one.
        $this->postJson(str_replace('/verify/'.$user->id.'/', '/verify/'.$other->id.'/', $path))
            ->assertForbidden()->assertJsonPath('status', 'invalid');

        // A different address's hash.
        $this->postJson(str_replace(sha1($user->email), sha1('attacker@example.com'), $path))
            ->assertForbidden()->assertJsonPath('status', 'invalid');

        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertNull($other->fresh()->email_verified_at);
    }

    public function test_a_link_for_a_missing_account_is_just_invalid(): void
    {
        $this->postJson(VerifyEmailAddress::signedPath(9999, 'ghost@example.com'))
            ->assertForbidden()->assertJsonPath('status', 'invalid');
    }

    public function test_an_expired_link_is_reported_as_expired_and_verifies_nothing(): void
    {
        $user = $this->makeUser();
        $path = $this->link($user);

        Carbon::setTestNow(now()->addMinutes(61));

        $this->postJson($path)->assertStatus(410)->assertJsonPath('status', 'expired');
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_the_link_is_valid_until_it_expires(): void
    {
        $user = $this->makeUser();
        $path = $this->link($user);

        Carbon::setTestNow(now()->addMinutes(59));

        $this->postJson($path)->assertOk()->assertJsonPath('status', 'verified');
    }

    public function test_an_already_verified_account_is_told_so_and_is_not_re_stamped(): void
    {
        $user = $this->makeUser(verified: true);
        $before = $user->fresh()->email_verified_at;
        Carbon::setTestNow(now()->addDay());

        $this->postJson($this->link($user))
            ->assertOk()->assertJsonPath('status', 'already_verified');

        $this->assertEquals($before, $user->fresh()->email_verified_at);
    }

    public function test_using_a_link_twice_is_harmless(): void
    {
        $user = $this->makeUser();
        $path = $this->link($user);

        $this->postJson($path)->assertJsonPath('status', 'verified');
        $this->postJson($path)->assertOk()->assertJsonPath('status', 'already_verified');
    }

    public function test_verification_attempts_are_rate_limited(): void
    {
        $user = $this->makeUser();
        $path = '/api/email/verify/'.$user->id.'/'.sha1('x');

        for ($i = 0; $i < 10; $i++) {
            $this->postJson($path)->assertForbidden();
        }

        $this->postJson($path)->assertStatus(429);
    }

    public function test_ordinary_logins_do_not_use_up_the_verification_or_reset_limits(): void
    {
        Notification::fake();
        $user = $this->makeUser();

        // Several logins and a sign-up from the same address...
        for ($i = 0; $i < 6; $i++) {
            $this->postJson('/api/login', ['email' => 'parent@example.com', 'password' => 'password123'])->assertOk();
        }
        $this->register()->assertCreated();

        // ...must not count against the (separate) limits of these endpoints.
        $this->postJson($this->link($user))->assertOk()->assertJsonPath('status', 'verified');
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/forgot-password', ['email' => 'parent@example.com'])->assertOk();
        }
        $this->postJson('/api/forgot-password', ['email' => 'parent@example.com'])->assertStatus(429);
    }

    public function test_the_example_environment_documents_mail_and_keeps_safe_defaults(): void
    {
        $example = file_get_contents(base_path('.env.example'));

        $this->assertMatchesRegularExpression('/^MAIL_MAILER=log$/m', $example);
        $this->assertMatchesRegularExpression('/^EMAIL_VERIFICATION_ENFORCED_FROM=$/m', $example);
        $this->assertStringContainsString('smtp.gmail.com', $example);
        $this->assertStringContainsString('App password', $example);
        // No credentials are shipped.
        $this->assertDoesNotMatchRegularExpression('/^MAIL_PASSWORD=(?!null$).+$/m', $example);
        $this->assertDoesNotMatchRegularExpression('/^MAIL_USERNAME=(?!null$).+$/m', $example);
        $this->assertNull(config('auth.verification.enforced_from'));
    }

    // ---------------------------------------------------------------- resending

    public function test_resending_needs_a_login(): void
    {
        Notification::fake();

        $this->postJson('/api/email/verification-notification')->assertUnauthorized();

        Notification::assertNothingSent();
    }

    public function test_resending_sends_a_new_link_to_the_logged_in_accounts_own_address(): void
    {
        Notification::fake();
        config(['mail.default' => 'smtp']);
        $user = $this->makeUser();
        $other = $this->makeUser('other@example.com');
        Sanctum::actingAs($user);

        // Whatever the body says, the target is the token's account.
        $this->postJson('/api/email/verification-notification', ['email' => 'other@example.com', 'user_id' => $other->id])
            ->assertOk()->assertJsonPath('delivered', true);

        Notification::assertSentTo($user, VerifyEmailAddress::class);
        Notification::assertNotSentTo($other, VerifyEmailAddress::class);
    }

    public function test_resending_for_a_verified_account_sends_nothing(): void
    {
        Notification::fake();
        Sanctum::actingAs($this->makeUser(verified: true));

        $this->postJson('/api/email/verification-notification')
            ->assertOk()->assertJsonPath('already_verified', true);

        Notification::assertNothingSent();
    }

    public function test_resending_does_not_claim_delivery_with_the_log_driver(): void
    {
        Notification::fake();
        config(['mail.default' => 'log']);
        Sanctum::actingAs($this->makeUser());

        $this->postJson('/api/email/verification-notification')
            ->assertOk()->assertJsonPath('delivered', false);
    }

    public function test_resending_is_rate_limited(): void
    {
        Notification::fake();
        Sanctum::actingAs($this->makeUser());

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/email/verification-notification')->assertOk();
        }

        $this->postJson('/api/email/verification-notification')->assertStatus(429);
    }

    public function test_a_mail_failure_when_resending_is_a_safe_error(): void
    {
        config([
            'mail.default' => 'broken',
            'mail.mailers.broken' => ['transport' => 'smtp', 'host' => '127.0.0.1', 'port' => 1, 'timeout' => 1],
        ]);
        Sanctum::actingAs($this->makeUser());

        $response = $this->postJson('/api/email/verification-notification')->assertStatus(503);

        $this->assertStringNotContainsString('127.0.0.1', $response->getContent());
    }

    // ---------------------------------------------------------------- no bypass

    public function test_no_profile_request_can_mark_an_address_as_verified(): void
    {
        $user = $this->makeUser();
        Sanctum::actingAs($user);

        $this->putJson('/api/profile', [
            'name' => 'Test User', 'email' => $user->email,
            'email_verified_at' => now()->toDateTimeString(), 'email_verified' => true,
        ])->assertOk();

        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_the_account_endpoint_reports_the_verification_status_and_hides_secrets(): void
    {
        $user = $this->makeUser();
        Sanctum::actingAs($user);

        $this->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('email_verified', false)
            ->assertJsonPath('pending_email', null)
            ->assertJsonPath('email_verification_required', false)
            ->assertJsonMissingPath('password')
            ->assertJsonMissingPath('remember_token')
            ->assertJsonMissingPath('photo_path');
    }

    // ---------------------------------------------------------------- enforcement

    private function tokenFor(User $user): string
    {
        return $user->createToken('t')->plainTextToken;
    }

    public function test_nothing_is_enforced_until_a_date_is_configured(): void
    {
        $user = $this->makeUser();

        $this->withToken($this->tokenFor($user))->getJson('/api/progress')->assertOk();
    }

    public function test_a_new_unverified_parent_is_held_back_when_enforcement_is_on(): void
    {
        config(['auth.verification.enforced_from' => now()->subDay()->toDateTimeString()]);
        $user = $this->makeUser();
        $token = $this->tokenFor($user);

        $this->withToken($token)->getJson('/api/progress')
            ->assertForbidden()->assertJsonPath('code', 'email_not_verified');
        $this->withToken($token)->getJson('/api/children')
            ->assertForbidden()->assertJsonPath('code', 'email_not_verified');

        // What is needed to verify stays reachable.
        $this->withToken($token)->getJson('/api/user')
            ->assertOk()->assertJsonPath('email_verification_required', true);
        Notification::fake();
        $this->withToken($token)->postJson('/api/email/verification-notification')->assertOk();
    }

    public function test_verifying_lifts_the_hold(): void
    {
        config(['auth.verification.enforced_from' => now()->subDay()->toDateTimeString()]);
        $user = $this->makeUser();
        $token = $this->tokenFor($user);
        $this->withToken($token)->getJson('/api/children')->assertForbidden();

        $this->postJson($this->link($user))->assertJsonPath('status', 'verified');

        // (A real request is a fresh process; here, drop the cached login.)
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/children')->assertOk();
    }

    public function test_accounts_created_before_the_cutoff_are_never_locked_out(): void
    {
        $user = $this->makeUser();
        $user->forceFill(['created_at' => now()->subYear()])->save();
        config(['auth.verification.enforced_from' => now()->subDay()->toDateTimeString()]);

        $this->withToken($this->tokenFor($user))->getJson('/api/children')->assertOk();
    }

    public function test_admins_and_guests_are_not_held_back(): void
    {
        config(['auth.verification.enforced_from' => now()->subDay()->toDateTimeString()]);
        $admin = $this->makeUser('admin@example.com', 'admin');

        $this->withToken($this->tokenFor($admin))->getJson('/api/admin/feedback')->assertOk();
        $this->getJson('/api/activities')->assertOk();
    }

    public function test_the_hold_applies_to_every_api_route_not_just_some(): void
    {
        config(['auth.verification.enforced_from' => now()->subDay()->toDateTimeString()]);
        $token = $this->tokenFor($this->makeUser());

        foreach ([
            ['postJson', '/api/children', ['name' => 'Mia']],
            ['postJson', '/api/activities/1/complete', []],
            ['postJson', '/api/feedback', ['message' => 'hi']],
            ['getJson', '/api/progress', []],
        ] as [$method, $url, $data]) {
            $this->withToken($token)->{$method}($url, $data)
                ->assertForbidden()->assertJsonPath('code', 'email_not_verified');
        }
    }
}
