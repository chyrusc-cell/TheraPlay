<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\MailDelivery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Sends the real notification emails through a real (in-memory) mail transport
 * and through a transport that cannot connect, to check the hand-off and the
 * honest reporting of failures. It does not prove delivery to an inbox.
 */
class EmailTransportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(ThrottleRequests::class);
    }

    private function useCapturingTransport(): void
    {
        config([
            'mail.mailers.capture' => ['transport' => 'array'],
            'mail.default' => 'capture',
        ]);
    }

    private function useUnreachableTransport(): void
    {
        config([
            'mail.mailers.broken' => [
                'transport' => 'smtp', 'host' => '127.0.0.1', 'port' => 1,
                'username' => null, 'password' => null, 'timeout' => 2,
            ],
            'mail.default' => 'broken',
        ]);
    }

    /** @return array<int, \Symfony\Component\Mime\RawMessage> */
    private function captured(): array
    {
        return Mail::mailer('capture')->getSymfonyTransport()->messages()->all();
    }

    private function parent(): User
    {
        return User::create(['name' => 'P', 'email' => 'p@example.com', 'password' => 'password-123']);
    }

    public function test_registration_hands_the_verification_email_to_the_transport(): void
    {
        $this->useCapturingTransport();

        $this->postJson('/api/register', [
            'first_name' => 'New', 'last_name' => 'Parent', 'phone' => '0917', 'email' => 'new@example.com',
            'password' => 'password-123', 'password_confirmation' => 'password-123',
        ])->assertCreated()
            ->assertJsonPath('email_verification.sent', true)
            ->assertJsonPath('email_verification.delivery_available', true);

        $messages = $this->captured();
        $this->assertCount(1, $messages);
        $text = $messages[0]->getOriginalMessage()->toString();
        $this->assertStringContainsString('new@example.com', $text);
        $this->assertStringContainsString('/verify-email', $text);
    }

    public function test_resend_hands_a_fresh_email_to_the_transport(): void
    {
        $this->useCapturingTransport();
        Sanctum::actingAs($this->parent());

        $this->postJson('/api/email/verification-notification')
            ->assertOk()->assertJsonPath('delivered', true);

        $this->assertCount(1, $this->captured());
    }

    public function test_password_reset_email_reaches_the_transport_with_a_working_link(): void
    {
        $this->useCapturingTransport();
        $this->parent();

        $this->postJson('/api/forgot-password', ['email' => 'p@example.com'])
            ->assertOk()->assertJsonPath('delivery_available', true);

        $messages = $this->captured();
        $this->assertCount(1, $messages);
        $text = quoted_printable_decode($messages[0]->getOriginalMessage()->toString());
        $this->assertStringContainsString('/reset-password?token=', $text);
    }

    public function test_a_transport_failure_on_resend_is_reported_not_hidden(): void
    {
        $this->useUnreachableTransport();
        Sanctum::actingAs($this->parent());

        $this->postJson('/api/email/verification-notification')
            ->assertStatus(503)
            ->assertJsonMissingPath('delivered');
    }

    public function test_a_transport_failure_on_registration_does_not_claim_the_email_was_sent(): void
    {
        $this->useUnreachableTransport();

        $this->postJson('/api/register', [
            'first_name' => 'New', 'last_name' => 'Parent', 'phone' => '0917', 'email' => 'new@example.com',
            'password' => 'password-123', 'password_confirmation' => 'password-123',
        ])->assertCreated()->assertJsonPath('email_verification.sent', false);
    }

    public function test_a_transport_failure_on_the_profile_password_reset_is_a_503(): void
    {
        $this->useUnreachableTransport();
        Sanctum::actingAs($this->parent());

        $this->postJson('/api/profile/password-reset')->assertStatus(503);
        $this->assertDatabaseCount('password_reset_tokens', 0);
    }

    public function test_a_transport_failure_never_leaks_server_details(): void
    {
        $this->useUnreachableTransport();
        $this->parent();

        $response = $this->postJson('/api/forgot-password', ['email' => 'p@example.com'])->assertOk();

        $this->assertStringNotContainsString('127.0.0.1', $response->getContent());
        $this->assertDatabaseCount('password_reset_tokens', 0);
    }

    public function test_the_log_and_array_drivers_and_a_hostless_smtp_are_not_delivery(): void
    {
        config(['mail.default' => 'log']);
        $this->assertFalse(MailDelivery::isConfigured());
        config(['mail.default' => 'array']);
        $this->assertFalse(MailDelivery::isConfigured());
        config(['mail.mailers.smtp.host' => null, 'mail.mailers.smtp.url' => null, 'mail.default' => 'smtp']);
        $this->assertFalse(MailDelivery::isConfigured());
        config(['mail.mailers.smtp.host' => 'smtp.example.com']);
        $this->assertTrue(MailDelivery::isConfigured());
    }

    public function test_the_failover_mailer_cannot_fall_back_to_the_log(): void
    {
        $this->assertNotContains('log', config('mail.mailers.failover.mailers'));
    }
}
