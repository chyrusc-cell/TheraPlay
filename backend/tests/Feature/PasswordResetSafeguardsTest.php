<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

/**
 * Phase 5 additions to the password reset flow (the rest of it is covered by
 * PasswordResetTest and ForgotPasswordTest).
 */
class PasswordResetSafeguardsTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(bool $verified = false): User
    {
        $user = User::create(['name' => 'Pat', 'email' => 'pat@example.com', 'password' => 'old-password-1']);
        $user->forceFill(['role' => 'parent', 'email_verified_at' => $verified ? now() : null])->save();

        return $user;
    }

    private function reset(User $user, string $password = 'brand-new-pass-1')
    {
        $token = Password::createToken($user);

        return $this->postJson('/api/reset-password', [
            'token' => $token, 'email' => $user->email,
            'password' => $password, 'password_confirmation' => $password,
        ]);
    }

    public function test_the_reset_link_lifetime_and_throttle_are_the_documented_values(): void
    {
        $this->assertSame(60, config('auth.passwords.users.expire'));
        $this->assertSame(60, config('auth.passwords.users.throttle'));
    }

    public function test_a_successful_reset_proves_the_address_and_marks_it_verified(): void
    {
        $user = $this->makeUser(verified: false);

        $this->reset($user)->assertOk();

        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_a_failed_reset_verifies_nothing(): void
    {
        $user = $this->makeUser(verified: false);

        $this->postJson('/api/reset-password', [
            'token' => 'wrong', 'email' => $user->email,
            'password' => 'brand-new-pass-1', 'password_confirmation' => 'brand-new-pass-1',
        ])->assertStatus(422);

        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_a_reset_cancels_a_pending_email_change(): void
    {
        $user = $this->makeUser(verified: true);
        $user->setPendingEmail('attacker-controlled@example.com');

        $this->reset($user)->assertOk();

        $this->assertNull($user->fresh()->pendingEmail());
        $this->assertSame('pat@example.com', $user->fresh()->email);
    }

    public function test_a_reset_signs_the_account_out_everywhere(): void
    {
        $user = $this->makeUser(verified: true);
        $user->createToken('phone');
        $user->createToken('laptop');

        $this->reset($user)->assertOk();

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_a_reset_for_one_account_leaves_other_accounts_alone(): void
    {
        $user = $this->makeUser(verified: false);
        $other = User::create(['name' => 'Other', 'email' => 'other@example.com', 'password' => 'other-pass-1']);
        $other->createToken('t');

        $this->reset($user)->assertOk();

        $this->assertNull($other->fresh()->email_verified_at);
        $this->assertSame(1, $other->tokens()->count());
    }
}
