<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class Stage4SecurityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    private function parent(string $email = 'p@example.com'): User
    {
        $user = User::create(['name' => 'Parent', 'email' => $email, 'password' => 'password123']);
        $user->forceFill(['role' => 'parent'])->save();

        return $user;
    }

    private function loginFails(string $email, string $ip = '10.0.0.1')
    {
        return $this->withServerVariables(['REMOTE_ADDR' => $ip])
            ->postJson('/api/login', ['email' => $email, 'password' => 'wrong-password']);
    }

    private function registerPayload(string $email): array
    {
        return [
            'first_name' => 'A', 'last_name' => 'B', 'email' => $email, 'phone' => '0900',
            'password' => 'password123', 'password_confirmation' => 'password123',
        ];
    }

    // ---- login: per-account protection ----

    public function test_repeated_failures_for_one_account_from_one_address_get_a_clear_429(): void
    {
        $this->parent();

        for ($i = 0; $i < 5; $i++) {
            $this->loginFails('p@example.com')->assertStatus(401);
        }

        $this->loginFails('p@example.com')
            ->assertStatus(429)
            ->assertJsonPath('message', 'Too many requests. Please wait a moment and try again.')
            ->assertHeader('Retry-After');

        // Even the right password waits out the window, from that address.
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.1'])
            ->postJson('/api/login', ['email' => 'p@example.com', 'password' => 'password123'])
            ->assertStatus(429);
    }

    public function test_hammering_an_account_from_one_address_does_not_lock_the_owner_out_elsewhere(): void
    {
        $this->parent();

        for ($i = 0; $i < 6; $i++) {
            $this->loginFails('p@example.com', '10.0.0.1');
        }

        // The real owner, from another address, is not affected.
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.2'])
            ->postJson('/api/login', ['email' => 'p@example.com', 'password' => 'password123'])
            ->assertOk();
    }

    public function test_one_account_being_throttled_does_not_block_other_accounts_from_the_same_address(): void
    {
        $this->parent('a@example.com');
        $this->parent('b@example.com');

        for ($i = 0; $i < 6; $i++) {
            $this->loginFails('a@example.com');
        }

        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.1'])
            ->postJson('/api/login', ['email' => 'b@example.com', 'password' => 'password123'])
            ->assertOk();
    }

    public function test_one_address_trying_many_accounts_is_limited_per_address(): void
    {
        for ($i = 1; $i <= 20; $i++) {
            $this->loginFails("nobody{$i}@example.com")->assertStatus(401);
        }

        $this->loginFails('nobody21@example.com')->assertStatus(429);
    }

    public function test_the_account_key_ignores_letter_case_so_it_cannot_be_dodged(): void
    {
        $this->parent();

        foreach (['p@example.com', 'P@Example.com', 'p@Example.COM', 'P@EXAMPLE.COM', 'p@example.com'] as $email) {
            $this->loginFails($email);
        }

        $this->loginFails('P@example.com')->assertStatus(429);
    }

    // ---- separate buckets ----

    public function test_a_throttled_login_does_not_block_registration_feedback_or_photos(): void
    {
        $parent = $this->parent();

        for ($i = 0; $i < 25; $i++) {
            $this->loginFails('p@example.com');
        }
        $this->loginFails('p@example.com')->assertStatus(429);

        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.1'])
            ->postJson('/api/register', $this->registerPayload('new@example.com'))->assertCreated();

        Sanctum::actingAs($parent);
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.1'])
            ->postJson('/api/feedback', ['message' => 'Great', 'rating' => 5])->assertCreated();
        $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.1'])
            ->deleteJson('/api/profile/photo')->assertOk();
    }

    public function test_exhausting_registration_does_not_block_login(): void
    {
        $this->parent();

        for ($i = 1; $i <= 10; $i++) {
            $this->postJson('/api/register', $this->registerPayload("r{$i}@example.com"))->assertCreated();
        }
        $this->postJson('/api/register', $this->registerPayload('r11@example.com'))->assertStatus(429);

        $this->postJson('/api/login', ['email' => 'p@example.com', 'password' => 'password123'])->assertOk();
    }

    public function test_exhausting_feedback_does_not_block_login_or_registration(): void
    {
        $parent = $this->parent();
        Sanctum::actingAs($parent);

        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/feedback', ['message' => "Note {$i}", 'rating' => 4])->assertCreated();
        }
        $this->postJson('/api/feedback', ['message' => 'One more', 'rating' => 4])->assertStatus(429);

        $this->postJson('/api/register', $this->registerPayload('fresh@example.com'))->assertCreated();
        $this->postJson('/api/login', ['email' => 'p@example.com', 'password' => 'password123'])->assertOk();
    }

    // ---- unknown email behaviour ----

    public function test_an_unknown_email_gets_the_same_answer_as_a_wrong_password(): void
    {
        $this->parent();

        $wrong = $this->postJson('/api/login', ['email' => 'p@example.com', 'password' => 'nope-nope']);
        $unknown = $this->postJson('/api/login', ['email' => 'ghost@example.com', 'password' => 'nope-nope']);

        $wrong->assertStatus(401);
        $unknown->assertStatus(401);
        $this->assertSame($wrong->json(), $unknown->json());
    }

    public function test_an_unknown_email_still_pays_for_one_password_check(): void
    {
        $this->parent();
        $mock = Hash::partialMock();
        $mock->shouldReceive('check')->once()->andReturn(false);

        $this->postJson('/api/login', ['email' => 'ghost@example.com', 'password' => 'whatever1'])
            ->assertStatus(401);
    }

    public function test_a_known_email_still_logs_in_with_the_expected_response(): void
    {
        $this->parent();

        $this->postJson('/api/login', ['email' => 'p@example.com', 'password' => 'password123'])
            ->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']])
            ->assertJsonMissingPath('user.password');
    }

    // ---- production-safe errors and headers ----

    public function test_an_unexpected_server_error_shows_no_details_when_debug_is_off(): void
    {
        config(['app.debug' => false]);
        Route::get('/api/test-boom', fn () => throw new \RuntimeException('secret detail in /var/www/app/File.php'));

        $response = $this->getJson('/api/test-boom')->assertStatus(500);
        $body = json_encode($response->json());

        $this->assertStringNotContainsString('secret detail', $body);
        $this->assertStringNotContainsString('/var/www', $body);
        $this->assertStringNotContainsString('RuntimeException', $body);
        $this->assertArrayNotHasKey('trace', $response->json());
        $this->assertArrayNotHasKey('exception', $response->json());
    }

    public function test_validation_errors_never_echo_passwords(): void
    {
        $response = $this->postJson('/api/register', $this->registerPayload('x') + ['password' => 'short', 'password_confirmation' => 'different']);

        $response->assertStatus(422);
        $this->assertStringNotContainsString('different', json_encode($response->json()));
    }

    public function test_api_responses_carry_conservative_security_headers(): void
    {
        $response = $this->getJson('/api/activities')->assertOk();

        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        $this->assertSame('DENY', $response->headers->get('X-Frame-Options'));
        $this->assertSame('no-referrer', $response->headers->get('Referrer-Policy'));
    }

    public function test_cors_is_still_limited_to_the_configured_origins(): void
    {
        $allowed = $this->withHeaders(['Origin' => 'http://localhost:5173'])->getJson('/api/activities');
        $this->assertSame('http://localhost:5173', $allowed->headers->get('Access-Control-Allow-Origin'));

        $other = $this->withHeaders(['Origin' => 'https://evil.example'])->getJson('/api/activities');
        $this->assertNull($other->headers->get('Access-Control-Allow-Origin'));
    }

    // ---- mail tooling and deployment visibility ----

    public function test_the_mail_test_command_refuses_to_pretend_with_the_log_driver(): void
    {
        config(['mail.default' => 'log']);
        Mail::shouldReceive('raw')->never();

        $this->artisan('mail:test', ['address' => 'me@example.com'])
            ->expectsOutputToContain('never delivers')
            ->assertExitCode(1);
    }

    public function test_the_mail_test_command_sends_through_a_real_mailer_and_reports_failures_safely(): void
    {
        config(['mail.default' => 'smtp']);
        Mail::shouldReceive('raw')->once();

        $this->artisan('mail:test', ['address' => 'me@example.com'])
            ->expectsOutputToContain('accepted the test message')
            ->assertExitCode(0);
    }

    public function test_the_mail_test_command_hides_server_details_when_sending_fails(): void
    {
        config(['mail.default' => 'smtp']);
        Mail::shouldReceive('raw')->once()->andThrow(new \RuntimeException('connect to smtp.secret-host.test:587 as user@secret failed'));

        $this->artisan('mail:test', ['address' => 'me@example.com'])
            ->expectsOutputToContain('did not accept')
            ->doesntExpectOutputToContain('secret-host')
            ->assertExitCode(1);
    }

    public function test_the_mail_test_command_rejects_a_bad_address(): void
    {
        $this->artisan('mail:test', ['address' => 'not-an-email'])->assertExitCode(1);
    }

    public function test_about_shows_whether_verification_is_enforced_and_mail_can_deliver(): void
    {
        config(['auth.verification.enforced_from' => null, 'mail.default' => 'log']);
        Artisan::call('about', ['--json' => true]);
        $about = json_decode(Artisan::output(), true)['thera_play'];

        $this->assertStringContainsString('NOT enforced', $about['email_verification']);
        $this->assertStringContainsString('NOT delivering', $about['email_delivery']);

        config(['auth.verification.enforced_from' => '2026-12-01 00:00:00', 'mail.default' => 'smtp']);
        Artisan::call('about', ['--json' => true]);
        $about = json_decode(Artisan::output(), true)['thera_play'];

        $this->assertStringContainsString('2026-12-01', $about['email_verification']);
        $this->assertStringContainsString('real mailer: smtp', $about['email_delivery']);
    }
}
