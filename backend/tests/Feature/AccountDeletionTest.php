<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityProgress;
use App\Models\Child;
use App\Models\Feedback;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class AccountDeletionTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $email = 'me@example.com', string $role = 'parent'): User
    {
        $user = User::create(['name' => 'Pat Parent', 'email' => $email, 'password' => 'password123']);
        $user->forceFill(['role' => $role])->save();

        return $user;
    }

    private function deleteAccount(string $password = 'password123', array $extra = [])
    {
        return $this->deleteJson('/api/profile', ['password' => $password] + $extra);
    }

    // ---------------------------------------------------------------- success

    public function test_a_parent_without_children_can_delete_their_own_account(): void
    {
        $user = $this->makeUser();
        Sanctum::actingAs($user);

        $this->deleteAccount()->assertOk()->assertJsonPath('message', 'Your account has been deleted.');

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_deleting_revokes_every_login_token_and_pending_data(): void
    {
        $user = $this->makeUser();
        $user->createToken('phone');
        $token = $user->createToken('laptop')->plainTextToken;
        $user->setPendingEmail('next@example.com');
        Password::sendResetLink(['email' => $user->email]);
        $this->assertDatabaseHas('password_reset_tokens', ['email' => 'me@example.com']);

        $this->withToken($token)->deleteJson('/api/profile', ['password' => 'password123'])->assertOk();

        $this->assertSame(0, PersonalAccessToken::where('tokenable_id', $user->id)->count());
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => 'me@example.com']);
        $this->assertNull($user->pendingEmail());

        // The old token no longer opens anything.
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
    }

    public function test_the_profile_picture_file_is_removed(): void
    {
        Storage::fake('local');
        config(['filesystems.activity_materials.disk' => 'local']);
        Storage::disk('local')->put('profile-photos/mine.jpg', 'x');
        $user = $this->makeUser();
        $user->forceFill(['photo_path' => 'profile-photos/mine.jpg'])->save();
        Sanctum::actingAs($user);

        $this->deleteAccount()->assertOk();

        Storage::disk('local')->assertMissing('profile-photos/mine.jpg');
    }

    public function test_feedback_and_activities_the_account_touched_are_kept_without_an_owner(): void
    {
        $user = $this->makeUser();
        $feedback = Feedback::create(['user_id' => $user->id, 'message' => 'Great app', 'rating' => 5]);
        Sanctum::actingAs($user);

        $this->deleteAccount()->assertOk();

        $this->assertDatabaseHas('feedback', ['id' => $feedback->id, 'user_id' => null]);
    }

    // ---------------------------------------------------------------- password

    public function test_a_wrong_password_does_not_delete_anything(): void
    {
        $user = $this->makeUser();
        Sanctum::actingAs($user);

        $this->deleteAccount('wrong-password')->assertStatus(422)->assertJsonValidationErrors('password');

        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    public function test_the_password_is_required(): void
    {
        $user = $this->makeUser();
        Sanctum::actingAs($user);

        $this->deleteJson('/api/profile')->assertStatus(422)->assertJsonValidationErrors('password');

        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    // ---------------------------------------------------------------- authorization

    public function test_a_guest_cannot_delete_anything(): void
    {
        $user = $this->makeUser();

        $this->deleteJson('/api/profile', ['password' => 'password123'])->assertUnauthorized();

        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    public function test_a_user_can_only_ever_delete_their_own_account(): void
    {
        $victim = $this->makeUser('victim@example.com');
        $attacker = $this->makeUser('attacker@example.com');
        Sanctum::actingAs($attacker);

        // The target always comes from the token; an id in the request is ignored,
        // and the victim's password is not the attacker's.
        $this->deleteAccount('password123', ['id' => $victim->id, 'user_id' => $victim->id, 'email' => 'victim@example.com'])->assertOk();

        $this->assertDatabaseHas('users', ['id' => $victim->id]);
        $this->assertDatabaseMissing('users', ['id' => $attacker->id]);
    }

    public function test_there_is_no_route_that_deletes_by_user_id(): void
    {
        $victim = $this->makeUser('victim@example.com');
        Sanctum::actingAs($this->makeUser('attacker@example.com'));

        $this->deleteJson('/api/profile/'.$victim->id, ['password' => 'password123'])->assertStatus(404);
        $this->assertDatabaseHas('users', ['id' => $victim->id]);
    }

    public function test_administrator_accounts_cannot_be_deleted_this_way(): void
    {
        $admin = $this->makeUser('admin@example.com', 'admin');
        Sanctum::actingAs($admin);

        $this->deleteAccount()->assertForbidden()->assertJsonPath('code', 'admin_account');

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
    }

    public function test_deletion_attempts_are_rate_limited(): void
    {
        Sanctum::actingAs($this->makeUser());

        for ($i = 0; $i < 5; $i++) {
            $this->deleteAccount('wrong')->assertStatus(422);
        }

        $this->deleteAccount('wrong')->assertStatus(429);
    }

    // ---------------------------------------------------------------- related data

    public function test_an_account_with_children_is_not_deleted_and_nothing_is_lost(): void
    {
        $user = $this->makeUser();
        $child = Child::create(['user_id' => $user->id, 'name' => 'Mia']);
        $activity = new Activity(['title' => 'Memory', 'instructions' => ['x'], 'materials' => [], 'difficulty' => 'Easy']);
        $activity->is_published = true;
        $activity->save();
        $progress = ActivityProgress::create(['child_id' => $child->id, 'activity_id' => $activity->id, 'status' => 'completed', 'completed_at' => now()]);
        Sanctum::actingAs($user);

        $this->deleteAccount()->assertStatus(409)->assertJsonPath('code', 'account_has_children');

        $this->assertDatabaseHas('users', ['id' => $user->id]);
        $this->assertDatabaseHas('children', ['id' => $child->id]);
        $this->assertDatabaseHas('activity_progress', ['id' => $progress->id]);
    }

    public function test_the_account_cannot_be_deleted_even_with_a_child_without_progress(): void
    {
        $user = $this->makeUser();
        Child::create(['user_id' => $user->id, 'name' => 'Mia']);
        Sanctum::actingAs($user);

        $this->deleteAccount()->assertStatus(409);

        $this->assertDatabaseHas('users', ['id' => $user->id]);
    }

    public function test_after_removing_the_children_the_account_can_be_deleted(): void
    {
        $user = $this->makeUser();
        $child = Child::create(['user_id' => $user->id, 'name' => 'Mia']);
        Sanctum::actingAs($user);

        $this->deleteJson('/api/children/'.$child->id)->assertOk();
        $this->deleteAccount()->assertOk();

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
    }

    public function test_another_accounts_data_is_untouched(): void
    {
        $other = $this->makeUser('other@example.com');
        $child = Child::create(['user_id' => $other->id, 'name' => 'Leo']);
        Sanctum::actingAs($this->makeUser());

        $this->deleteAccount()->assertOk();

        $this->assertDatabaseHas('users', ['id' => $other->id]);
        $this->assertDatabaseHas('children', ['id' => $child->id]);
    }
}
