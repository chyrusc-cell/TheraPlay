<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityProgress;
use App\Models\Child;
use App\Models\Feedback;
use App\Models\User;
use App\Notifications\VerifyEmailAddress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Phase 5B: administrator account management. (The older, general tests for the
 * same endpoints are in UserManagementTest.)
 */
class AdminAccountManagementTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $email, string $role = 'parent', bool $verified = false): User
    {
        $user = User::create(['name' => ucfirst($role).' '.$email, 'email' => $email, 'password' => 'password123']);
        $user->forceFill(['role' => $role, 'email_verified_at' => $verified ? now() : null])->save();

        return $user;
    }

    private function actingAsAdmin(string $email = 'admin@example.com'): User
    {
        $admin = $this->makeUser($email, 'admin', true);
        Sanctum::actingAs($admin);

        return $admin;
    }

    private function adminPayload(array $extra = []): array
    {
        return $extra + [
            'name' => 'New Admin',
            'email' => 'new-admin@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ];
    }

    // ---------------------------------------------------------------- access

    public function test_guests_and_parents_cannot_use_the_new_promote_and_demote_endpoints(): void
    {
        $target = $this->makeUser('target@example.com');

        $this->postJson("/api/admin/users/{$target->id}/promote")->assertUnauthorized();
        $this->postJson("/api/admin/users/{$target->id}/demote")->assertUnauthorized();

        Sanctum::actingAs($this->makeUser('parent@example.com'));
        $this->postJson("/api/admin/users/{$target->id}/promote")->assertForbidden();
        $this->postJson("/api/admin/users/{$target->id}/demote")->assertForbidden();

        $this->assertSame('parent', $target->fresh()->role);
    }

    public function test_a_parent_cannot_create_an_administrator(): void
    {
        Sanctum::actingAs($this->makeUser('parent@example.com'));

        $this->postJson('/api/admin/users', $this->adminPayload())->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'new-admin@example.com']);
    }

    // ---------------------------------------------------------------- listing

    public function test_the_list_shows_verification_status_and_roles_without_secrets(): void
    {
        $this->actingAsAdmin();
        $this->makeUser('verified@example.com', 'parent', true);
        $this->makeUser('unverified@example.com');

        $rows = collect($this->getJson('/api/admin/users')->assertOk()->json('data'))->keyBy('email');

        $this->assertTrue($rows['verified@example.com']['email_verified']);
        $this->assertNotNull($rows['verified@example.com']['email_verified_at']);
        $this->assertFalse($rows['unverified@example.com']['email_verified']);
        $this->assertNull($rows['unverified@example.com']['email_verified_at']);
        $this->assertSame('admin', $rows['admin@example.com']['role']);
        $this->assertSame('parent', $rows['verified@example.com']['role']);
    }

    // ---------------------------------------------------------------- creating administrators

    public function test_the_role_is_always_set_by_the_server_whatever_the_client_sends(): void
    {
        Notification::fake();
        $this->actingAsAdmin();

        foreach (['parent', 'superadmin', '', null, ['admin']] as $i => $role) {
            $this->postJson('/api/admin/users', $this->adminPayload([
                'email' => "case{$i}@example.com",
                'role' => $role,
            ]))->assertCreated()->assertJsonPath('data.role', 'admin');
        }

        $this->assertSame(5, User::where('role', 'admin')->where('email', 'like', 'case%')->count());
    }

    public function test_a_client_cannot_create_an_already_verified_account(): void
    {
        Notification::fake();
        $this->actingAsAdmin();

        $id = $this->postJson('/api/admin/users', $this->adminPayload([
            'email_verified_at' => now()->toDateTimeString(),
            'email_verified' => true,
        ]))->assertCreated()->json('data.id');

        $this->assertNull(User::find($id)->email_verified_at);
    }

    public function test_the_new_administrator_gets_a_verification_email_at_their_own_address(): void
    {
        Notification::fake();
        config(['mail.default' => 'smtp']);
        $this->actingAsAdmin();

        $response = $this->postJson('/api/admin/users', $this->adminPayload())
            ->assertCreated()
            ->assertJsonPath('email_verification.sent', true)
            ->assertJsonPath('email_verification.delivery_available', true)
            ->assertJsonPath('data.email_verified', false);

        $created = User::find($response->json('data.id'));
        Notification::assertSentTo($created, VerifyEmailAddress::class);
    }

    public function test_the_response_is_honest_when_email_cannot_really_be_delivered(): void
    {
        Notification::fake();
        config(['mail.default' => 'log']);
        $this->actingAsAdmin();

        $this->postJson('/api/admin/users', $this->adminPayload())
            ->assertCreated()
            ->assertJsonPath('email_verification.delivery_available', false);
    }

    public function test_a_mail_failure_does_not_block_creating_the_account(): void
    {
        config([
            'mail.default' => 'broken',
            'mail.mailers.broken' => ['transport' => 'smtp', 'host' => '127.0.0.1', 'port' => 1, 'timeout' => 1],
        ]);
        $this->actingAsAdmin();

        $this->postJson('/api/admin/users', $this->adminPayload())
            ->assertCreated()
            ->assertJsonPath('email_verification.sent', false);

        $this->assertDatabaseHas('users', ['email' => 'new-admin@example.com', 'role' => 'admin']);
    }

    public function test_the_new_administrator_can_log_in_and_is_not_held_back_by_verification(): void
    {
        Notification::fake();
        config(['auth.verification.enforced_from' => now()->subDay()->toDateTimeString()]);
        $this->actingAsAdmin();
        $this->postJson('/api/admin/users', $this->adminPayload())->assertCreated();
        $this->app['auth']->forgetGuards();

        $token = $this->postJson('/api/login', ['email' => 'new-admin@example.com', 'password' => 'password123'])
            ->assertOk()->json('token');

        $this->withToken($token)->getJson('/api/admin/users')->assertOk();
    }

    public function test_the_password_is_hashed_and_never_returned(): void
    {
        Notification::fake();
        $this->actingAsAdmin();

        $response = $this->postJson('/api/admin/users', $this->adminPayload())->assertCreated();

        $stored = User::find($response->json('data.id'));
        $this->assertTrue(Hash::check('password123', $stored->password));
        $this->assertStringNotContainsString('password123', $response->getContent());
        $this->assertStringNotContainsString($stored->password, $response->getContent());
    }

    public function test_public_parent_registration_is_unaffected(): void
    {
        Notification::fake();

        $this->postJson('/api/register', [
            'first_name' => 'Pat', 'last_name' => 'Parent', 'email' => 'pat@example.com', 'phone' => '0917',
            'password' => 'password123', 'password_confirmation' => 'password123',
            'role' => 'admin',
        ])->assertCreated()->assertJsonPath('user.role', 'parent');
    }

    // ---------------------------------------------------------------- email changes by an admin

    public function test_changing_an_accounts_email_clears_its_verification_and_asks_the_new_address(): void
    {
        Notification::fake();
        $this->actingAsAdmin();
        $parent = $this->makeUser('old@example.com', 'parent', true);

        $this->patchJson("/api/admin/users/{$parent->id}", ['email' => 'new@example.com'])
            ->assertOk()
            ->assertJsonPath('data.email_verified', false);

        $this->assertNull($parent->fresh()->email_verified_at);
        Notification::assertSentTo($parent->fresh(), VerifyEmailAddress::class);
    }

    public function test_changing_only_the_name_keeps_the_verification(): void
    {
        Notification::fake();
        $this->actingAsAdmin();
        $parent = $this->makeUser('same@example.com', 'parent', true);

        $this->patchJson("/api/admin/users/{$parent->id}", ['name' => 'Renamed'])->assertOk();

        $this->assertNotNull($parent->fresh()->email_verified_at);
        Notification::assertNothingSent();
    }

    // ---------------------------------------------------------------- promoting

    public function test_promoting_makes_a_parent_an_administrator_and_signs_them_out(): void
    {
        $this->actingAsAdmin();
        $parent = $this->makeUser('parent@example.com');
        $token = $parent->createToken('phone')->plainTextToken;
        $parent->createToken('laptop');

        $this->postJson("/api/admin/users/{$parent->id}/promote")
            ->assertOk()
            ->assertJsonPath('data.role', 'admin');

        $this->assertSame('admin', $parent->fresh()->role);
        $this->assertSame(0, $parent->tokens()->count());

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
    }

    public function test_promoting_an_administrator_again_is_a_clear_conflict(): void
    {
        $admin = $this->actingAsAdmin();
        $other = $this->makeUser('other@example.com', 'admin');

        $this->postJson("/api/admin/users/{$other->id}/promote")
            ->assertStatus(409)->assertJsonPath('code', 'already_admin');
        $this->postJson("/api/admin/users/{$admin->id}/promote")
            ->assertStatus(409)->assertJsonPath('code', 'already_admin');
    }

    public function test_promoting_ignores_anything_in_the_request_body(): void
    {
        $this->actingAsAdmin();
        $parent = $this->makeUser('parent@example.com');
        $other = $this->makeUser('other@example.com');

        // The target is the route's account only; a body cannot redirect it.
        $this->postJson("/api/admin/users/{$parent->id}/promote", ['id' => $other->id, 'user_id' => $other->id, 'role' => 'parent'])
            ->assertOk()->assertJsonPath('data.email', 'parent@example.com');

        $this->assertSame('parent', $other->fresh()->role);
    }

    public function test_promoting_a_missing_or_malformed_target_is_a_404(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/admin/users/9999/promote')->assertNotFound();
        $this->postJson('/api/admin/users/abc/promote')->assertNotFound();
    }

    public function test_the_update_and_registration_endpoints_cannot_be_used_to_change_a_role(): void
    {
        $parent = $this->makeUser('parent@example.com');
        Sanctum::actingAs($parent);

        $this->putJson('/api/profile', ['name' => 'P', 'email' => 'parent@example.com', 'role' => 'admin'])->assertOk();
        $this->patchJson("/api/admin/users/{$parent->id}", ['role' => 'admin'])->assertForbidden();

        $this->assertSame('parent', $parent->fresh()->role);
    }

    // ---------------------------------------------------------------- demoting

    public function test_another_administrator_can_be_demoted_and_signed_out(): void
    {
        $this->actingAsAdmin();
        $other = $this->makeUser('other@example.com', 'admin');
        $other->createToken('device');

        $this->postJson("/api/admin/users/{$other->id}/demote")->assertOk()->assertJsonPath('data.role', 'parent');

        $this->assertSame(0, $other->tokens()->count());
    }

    public function test_an_administrator_cannot_remove_their_own_role(): void
    {
        $admin = $this->actingAsAdmin();
        $this->makeUser('other@example.com', 'admin');

        $this->postJson("/api/admin/users/{$admin->id}/demote")
            ->assertStatus(409)->assertJsonPath('code', 'cannot_demote_self');

        $this->assertSame('admin', $admin->fresh()->role);
    }

    public function test_demoting_a_parent_is_a_clear_conflict(): void
    {
        $this->actingAsAdmin();
        $parent = $this->makeUser('parent@example.com');

        $this->postJson("/api/admin/users/{$parent->id}/demote")
            ->assertStatus(409)->assertJsonPath('code', 'not_admin');
    }

    // ---------------------------------------------------------------- deleting

    public function test_an_admin_can_delete_an_eligible_parent_and_everything_waiting_for_it_is_removed(): void
    {
        $this->actingAsAdmin();
        $parent = $this->makeUser('parent@example.com');
        $token = $parent->createToken('phone')->plainTextToken;
        $parent->createToken('laptop');
        $parent->setPendingEmail('next@example.com');
        Password::sendResetLink(['email' => $parent->email]);

        $this->deleteJson("/api/admin/users/{$parent->id}")->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $parent->id]);
        $this->assertSame(0, PersonalAccessToken::where('tokenable_id', $parent->id)->count());
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'parent@example.com']);
        $this->assertNull($parent->pendingEmail());

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
    }

    public function test_deleting_removes_the_profile_picture_file_and_keeps_feedback(): void
    {
        Storage::fake('local');
        config(['filesystems.activity_materials.disk' => 'local']);
        Storage::disk('local')->put('profile-photos/x.jpg', 'img');
        $this->actingAsAdmin();
        $parent = $this->makeUser('parent@example.com');
        $parent->forceFill(['photo_path' => 'profile-photos/x.jpg'])->save();
        $feedback = Feedback::create(['user_id' => $parent->id, 'message' => 'Nice', 'rating' => 5]);

        $this->deleteJson("/api/admin/users/{$parent->id}")->assertOk();

        Storage::disk('local')->assertMissing('profile-photos/x.jpg');
        $this->assertDatabaseHas('feedback', ['id' => $feedback->id, 'user_id' => null]);
    }

    public function test_an_account_with_children_is_never_deleted_and_nothing_is_lost(): void
    {
        $this->actingAsAdmin();
        $parent = $this->makeUser('parent@example.com');
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Mia']);
        $activity = new Activity(['title' => 'Memory', 'instructions' => ['x'], 'materials' => [], 'difficulty' => 'Easy']);
        $activity->is_published = true;
        $activity->save();
        $progress = ActivityProgress::create(['child_id' => $child->id, 'activity_id' => $activity->id, 'status' => 'completed', 'completed_at' => now()]);
        $parent->createToken('keep');

        $this->deleteJson("/api/admin/users/{$parent->id}")
            ->assertStatus(409)->assertJsonPath('code', 'has_child_profile');

        $this->assertDatabaseHas('users', ['id' => $parent->id]);
        $this->assertDatabaseHas('children', ['id' => $child->id]);
        $this->assertDatabaseHas('activity_progress', ['id' => $progress->id]);
        // A refused deletion does not sign the person out either.
        $this->assertSame(1, $parent->tokens()->count());
    }

    public function test_an_account_with_several_children_is_also_protected(): void
    {
        $this->actingAsAdmin();
        $parent = $this->makeUser('parent@example.com');
        Child::create(['user_id' => $parent->id, 'name' => 'Mia']);
        Child::create(['user_id' => $parent->id, 'name' => 'Leo']);

        $this->deleteJson("/api/admin/users/{$parent->id}")->assertStatus(409);

        $this->assertSame(2, Child::where('user_id', $parent->id)->count());
    }

    public function test_an_administrator_cannot_delete_themselves(): void
    {
        $admin = $this->actingAsAdmin();
        $this->makeUser('other@example.com', 'admin');

        $this->deleteJson("/api/admin/users/{$admin->id}")
            ->assertStatus(409)->assertJsonPath('code', 'cannot_delete_self');

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_one_administrator_always_remains(): void
    {
        $first = $this->actingAsAdmin();
        $second = $this->makeUser('second@example.com', 'admin');

        // Deleting the other administrator is allowed while two exist...
        $this->deleteJson("/api/admin/users/{$second->id}")->assertOk();
        $this->assertSame(1, User::where('role', 'admin')->count());

        // ...and the remaining one can neither delete nor demote themselves.
        $this->deleteJson("/api/admin/users/{$first->id}")->assertStatus(409);
        $this->postJson("/api/admin/users/{$first->id}/demote")->assertStatus(409);
        $this->assertSame(1, User::where('role', 'admin')->count());
    }

    public function test_a_deleted_administrators_login_stops_working(): void
    {
        $this->actingAsAdmin();
        $other = $this->makeUser('other@example.com', 'admin');
        $token = $other->createToken('browser')->plainTextToken;

        $this->deleteJson("/api/admin/users/{$other->id}")->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/admin/users')->assertUnauthorized();
    }

    public function test_guests_and_parents_cannot_delete_accounts(): void
    {
        $target = $this->makeUser('target@example.com');

        $this->deleteJson("/api/admin/users/{$target->id}")->assertUnauthorized();

        Sanctum::actingAs($this->makeUser('parent@example.com'));
        $this->deleteJson("/api/admin/users/{$target->id}")->assertForbidden();

        $this->assertDatabaseHas('users', ['id' => $target->id]);
    }

    public function test_this_does_not_touch_the_self_service_deletion_endpoint(): void
    {
        $parent = $this->makeUser('parent@example.com');
        Sanctum::actingAs($parent);

        $this->deleteJson('/api/profile', ['password' => 'password123'])->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $parent->id]);
    }

    // ---------------------------------------------------------------- the setup/recovery command

    public function test_the_artisan_promotion_command_still_works_for_setup_and_recovery(): void
    {
        $parent = $this->makeUser('recover@example.com');

        $this->artisan('user:promote-admin', ['email' => 'recover@example.com', '--force' => true])
            ->assertSuccessful();

        $this->assertSame('admin', $parent->fresh()->role);
    }
}
