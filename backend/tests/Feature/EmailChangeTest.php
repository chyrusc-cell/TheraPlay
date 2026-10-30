<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\VerifyEmailAddress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EmailChangeTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function makeUser(string $email = 'old@example.com', bool $verified = true): User
    {
        $user = User::create(['name' => 'Pat Parent', 'email' => $email, 'password' => 'password123']);
        $user->forceFill(['role' => 'parent', 'email_verified_at' => $verified ? now() : null])->save();

        return $user;
    }

    private function change(string $email, ?string $password = 'password123', array $extra = [])
    {
        return $this->putJson('/api/profile', array_filter([
            'name' => 'Pat Parent',
            'email' => $email,
            'current_password' => $password,
        ], fn ($value) => $value !== null) + $extra);
    }

    private function sentTo(string $email): bool
    {
        $found = false;

        Notification::assertSentOnDemand(VerifyEmailAddress::class, function ($notification, $channels, $notifiable) use ($email, &$found) {
            $found = $found || ($notifiable->routes['mail'] ?? null) === $email;

            return true;
        });

        return $found;
    }

    // ---------------------------------------------------------------- password

    public function test_the_current_password_is_required_to_change_the_email(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        Sanctum::actingAs($user);

        $this->change('new@example.com', null)
            ->assertStatus(422)->assertJsonValidationErrors('current_password');

        $this->assertSame('old@example.com', $user->fresh()->email);
        $this->assertNull($user->fresh()->pendingEmail());
        Notification::assertNothingSent();
    }

    public function test_a_wrong_password_is_rejected(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        Sanctum::actingAs($user);

        $this->change('new@example.com', 'not-my-password')
            ->assertStatus(422)->assertJsonValidationErrors('current_password');

        $this->assertNull($user->fresh()->pendingEmail());
        Notification::assertNothingSent();
    }

    public function test_the_password_is_not_needed_when_the_email_is_unchanged(): void
    {
        $user = $this->makeUser();
        Sanctum::actingAs($user);

        $this->putJson('/api/profile', ['name' => 'New Name', 'email' => 'old@example.com', 'contact_number' => '0917'])
            ->assertOk();

        $this->assertSame('New Name', $user->fresh()->name);
        $this->assertSame('0917', $user->fresh()->contact_number);
    }

    // ---------------------------------------------------------------- pending

    public function test_a_valid_change_waits_for_verification_instead_of_changing_the_email(): void
    {
        Notification::fake();
        config(['mail.default' => 'smtp']);
        $user = $this->makeUser();
        Sanctum::actingAs($user);

        $this->change('New@Example.com')
            ->assertOk()
            ->assertJsonPath('user.email', 'old@example.com')
            ->assertJsonPath('user.pending_email', 'New@Example.com')
            ->assertJsonPath('user.email_verified', true)
            ->assertJsonPath('email_delivered', true);

        $user = $user->fresh();
        $this->assertSame('old@example.com', $user->email);
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame('New@Example.com', $user->pendingEmail());

        // The link goes to the NEW address only.
        $this->assertTrue($this->sentTo('New@Example.com'));
        Notification::assertNotSentTo($user, VerifyEmailAddress::class);
    }

    public function test_other_profile_fields_are_saved_at_once(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        Sanctum::actingAs($user);

        $this->putJson('/api/profile', ['name' => 'Renamed', 'email' => 'new@example.com', 'current_password' => 'password123', 'contact_number' => '0999'])
            ->assertOk();

        $this->assertSame('Renamed', $user->fresh()->name);
        $this->assertSame('0999', $user->fresh()->contact_number);
    }

    public function test_the_response_does_not_claim_delivery_with_the_log_driver(): void
    {
        Notification::fake();
        config(['mail.default' => 'log']);
        Sanctum::actingAs($this->makeUser());

        $this->change('new@example.com')->assertOk()
            ->assertJsonPath('email_delivered', false)
            ->assertJsonPath('user.pending_email', 'new@example.com');
    }

    public function test_the_account_endpoint_shows_the_pending_address(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        Sanctum::actingAs($user);
        $this->change('new@example.com')->assertOk();

        $this->getJson('/api/user')->assertOk()
            ->assertJsonPath('email', 'old@example.com')
            ->assertJsonPath('pending_email', 'new@example.com');
    }

    public function test_submitting_the_current_address_again_cancels_the_pending_change(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        Sanctum::actingAs($user);
        $this->change('new@example.com')->assertOk();

        $this->putJson('/api/profile', ['name' => 'Pat Parent', 'email' => 'old@example.com'])->assertOk()
            ->assertJsonPath('user.pending_email', null);

        $this->assertNull($user->fresh()->pendingEmail());
    }

    public function test_a_newer_request_replaces_the_older_pending_address_and_its_link(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        Sanctum::actingAs($user);
        $this->change('first@example.com')->assertOk();
        $firstLink = VerifyEmailAddress::signedPath($user->id, 'first@example.com');

        $this->change('second@example.com')->assertOk();

        $this->postJson($firstLink)->assertForbidden()->assertJsonPath('status', 'invalid');
        $this->assertSame('old@example.com', $user->fresh()->email);
        $this->assertSame('second@example.com', $user->fresh()->pendingEmail());
    }

    // ---------------------------------------------------------------- duplicates

    public function test_a_duplicate_email_is_rejected(): void
    {
        Notification::fake();
        $this->makeUser('taken@example.com');
        $user = $this->makeUser('old@example.com');
        Sanctum::actingAs($user);

        $this->change('taken@example.com')->assertStatus(422)->assertJsonValidationErrors('email');
        // ...also when only the letter case differs.
        $this->change('TAKEN@example.com')->assertStatus(422)->assertJsonValidationErrors('email');

        $this->assertNull($user->fresh()->pendingEmail());
        Notification::assertNothingSent();
    }

    public function test_an_invalid_address_is_rejected(): void
    {
        $user = $this->makeUser();
        Sanctum::actingAs($user);

        $this->change('not-an-email')->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_an_address_taken_after_the_request_cannot_be_claimed(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        Sanctum::actingAs($user);
        $this->change('wanted@example.com')->assertOk();

        // Someone else registers that address before the link is opened.
        $this->makeUser('wanted@example.com');

        $this->postJson(VerifyEmailAddress::signedPath($user->id, 'wanted@example.com'))
            ->assertStatus(409)->assertJsonPath('status', 'email_taken');

        $this->assertSame('old@example.com', $user->fresh()->email);
        $this->assertNull($user->fresh()->pendingEmail());
    }

    // ---------------------------------------------------------------- verifying the new address

    public function test_opening_the_link_makes_the_new_address_the_verified_account_email(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        Sanctum::actingAs($user);
        $this->change('new@example.com')->assertOk();

        Carbon::setTestNow(now()->addMinutes(10));
        $this->postJson(VerifyEmailAddress::signedPath($user->id, 'new@example.com'))
            ->assertOk()->assertJsonPath('status', 'email_changed');

        $user = $user->fresh();
        $this->assertSame('new@example.com', $user->email);
        // Verified "now": the old address's verification time is not carried over.
        $this->assertTrue($user->email_verified_at->greaterThanOrEqualTo(now()->subSecond()));
        $this->assertNull($user->pendingEmail());
    }

    public function test_after_the_change_only_the_new_address_can_log_in(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        Sanctum::actingAs($user);
        $this->change('new@example.com')->assertOk();
        $this->postJson(VerifyEmailAddress::signedPath($user->id, 'new@example.com'))->assertOk();

        $this->postJson('/api/login', ['email' => 'old@example.com', 'password' => 'password123'])->assertUnauthorized();
        $this->postJson('/api/login', ['email' => 'new@example.com', 'password' => 'password123'])->assertOk();
    }

    public function test_until_it_is_verified_the_old_address_keeps_working_and_stays_verified(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        Sanctum::actingAs($user);
        $this->change('new@example.com')->assertOk();

        $this->postJson('/api/login', ['email' => 'old@example.com', 'password' => 'password123'])->assertOk();
        $this->postJson('/api/login', ['email' => 'new@example.com', 'password' => 'password123'])->assertUnauthorized();
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_the_link_for_the_new_address_cannot_be_reused(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        Sanctum::actingAs($user);
        $this->change('new@example.com')->assertOk();
        $link = VerifyEmailAddress::signedPath($user->id, 'new@example.com');

        $this->postJson($link)->assertJsonPath('status', 'email_changed');
        $this->postJson($link)->assertOk()->assertJsonPath('status', 'already_verified');
    }

    public function test_an_expired_link_changes_nothing(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        Sanctum::actingAs($user);
        $this->change('new@example.com')->assertOk();
        $link = VerifyEmailAddress::signedPath($user->id, 'new@example.com');

        Carbon::setTestNow(now()->addMinutes(61));

        $this->postJson($link)->assertStatus(410)->assertJsonPath('status', 'expired');
        $this->assertSame('old@example.com', $user->fresh()->email);
    }

    public function test_a_valid_link_for_an_address_that_was_never_requested_is_invalid(): void
    {
        $user = $this->makeUser();

        // Correctly signed, but nobody asked to change to this address.
        $this->postJson(VerifyEmailAddress::signedPath($user->id, 'never-asked@example.com'))
            ->assertForbidden()->assertJsonPath('status', 'invalid');

        $this->assertSame('old@example.com', $user->fresh()->email);
    }

    public function test_the_pending_address_is_forgotten_when_it_times_out(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        Sanctum::actingAs($user);
        $this->change('new@example.com')->assertOk();

        Carbon::setTestNow(now()->addMinutes(61));
        Cache::flush();

        $this->assertNull($user->fresh()->pendingEmail());
    }

    // ---------------------------------------------------------------- other people's emails

    public function test_a_user_cannot_change_another_users_email(): void
    {
        Notification::fake();
        $victim = $this->makeUser('victim@example.com');
        $attacker = $this->makeUser('attacker@example.com');
        Sanctum::actingAs($attacker);

        // The account is always the token's: ids in the request are ignored.
        $this->putJson('/api/profile', [
            'name' => 'Attacker', 'email' => 'attacker@example.com',
            'id' => $victim->id, 'user_id' => $victim->id,
        ])->assertOk();

        $this->change('mine@example.com', 'password123', ['id' => $victim->id, 'user_id' => $victim->id])->assertOk();

        $this->assertSame('victim@example.com', $victim->fresh()->email);
        $this->assertNull($victim->fresh()->pendingEmail());
        $this->assertSame('mine@example.com', $attacker->fresh()->pendingEmail());
    }

    public function test_a_guest_cannot_change_any_email(): void
    {
        $user = $this->makeUser();

        $this->putJson('/api/profile', ['name' => 'X', 'email' => 'new@example.com', 'current_password' => 'password123'])
            ->assertUnauthorized();

        $this->assertSame('old@example.com', $user->fresh()->email);
    }

    public function test_the_pending_address_of_one_user_cannot_be_verified_through_another_users_link(): void
    {
        Notification::fake();
        $a = $this->makeUser('a@example.com');
        $b = $this->makeUser('b@example.com');
        Sanctum::actingAs($a);
        $this->change('a-new@example.com')->assertOk();

        // The link is bound to the user id it was signed for.
        $forged = str_replace('/verify/'.$a->id.'/', '/verify/'.$b->id.'/', VerifyEmailAddress::signedPath($a->id, 'a-new@example.com'));
        $this->postJson($forged)->assertForbidden();

        $this->assertSame('b@example.com', $b->fresh()->email);
        $this->assertSame('a@example.com', $a->fresh()->email);
    }
}
