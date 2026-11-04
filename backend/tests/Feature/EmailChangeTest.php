<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The email address of an existing account cannot be changed (by the owner or
 * by an admin). The form may send the current address back; a different one is
 * refused and nothing is saved or emailed.
 */
class EmailChangeTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $email = 'old@example.com'): User
    {
        $user = User::create(['name' => 'Pat Parent', 'email' => $email, 'password' => 'password123']);
        $user->forceFill(['role' => 'parent', 'email_verified_at' => now()])->save();

        return $user;
    }

    public function test_a_different_email_is_refused_and_nothing_changes(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        Sanctum::actingAs($user);

        $this->putJson('/api/profile', ['name' => 'Renamed', 'email' => 'new@example.com', 'current_password' => 'password123'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        $fresh = $user->fresh();
        $this->assertSame('old@example.com', $fresh->email);
        $this->assertSame('Pat Parent', $fresh->name);
        $this->assertNotNull($fresh->email_verified_at);
        $this->assertNull($fresh->pendingEmail());
        Notification::assertNothingSent();
    }

    public function test_sending_the_current_address_back_saves_the_other_fields(): void
    {
        Notification::fake();
        $user = $this->makeUser();
        Sanctum::actingAs($user);

        $this->putJson('/api/profile', ['name' => 'Renamed', 'email' => 'OLD@example.com', 'contact_number' => '0917'])
            ->assertOk()
            ->assertJsonPath('user.email', 'old@example.com');

        $fresh = $user->fresh();
        $this->assertSame('Renamed', $fresh->name);
        $this->assertSame('old@example.com', $fresh->email);
        Notification::assertNothingSent();
    }

    public function test_the_email_may_be_left_out_entirely(): void
    {
        $user = $this->makeUser();
        Sanctum::actingAs($user);

        $this->putJson('/api/profile', ['name' => 'Renamed'])->assertOk();

        $this->assertSame('old@example.com', $user->fresh()->email);
    }

    public function test_a_change_requested_before_the_lock_is_cancelled_by_the_next_save(): void
    {
        $user = $this->makeUser();
        $user->setPendingEmail('pending@example.com');
        Sanctum::actingAs($user);

        $this->putJson('/api/profile', ['name' => 'Pat Parent', 'email' => 'old@example.com'])->assertOk();

        $this->assertNull($user->fresh()->pendingEmail());
    }

    public function test_a_guest_cannot_update_a_profile(): void
    {
        $this->putJson('/api/profile', ['name' => 'X', 'email' => 'x@example.com'])->assertUnauthorized();
    }
}
