<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityProgress;
use App\Models\Child;
use App\Models\Feedback;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $email, string $role = 'parent', string $name = 'Test User'): User
    {
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => 'password123',
        ]);

        $user->forceFill(['role' => $role])->save();

        return $user;
    }

    private function actingAsAdmin(string $email = 'admin@example.com'): User
    {
        $admin = $this->makeUser($email, 'admin', 'Admin User');
        Sanctum::actingAs($admin);

        return $admin;
    }

    private function validPayload(array $extra = []): array
    {
        return array_merge([
            'name' => 'New Person',
            'email' => 'new@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'parent',
        ], $extra);
    }

    // --- Access control ---

    private function endpoints(User $target): array
    {
        return [
            ['getJson', '/api/admin/users'],
            ['postJson', '/api/admin/users'],
            ['getJson', "/api/admin/users/{$target->id}"],
            ['putJson', "/api/admin/users/{$target->id}"],
            ['patchJson', "/api/admin/users/{$target->id}"],
            ['deleteJson', "/api/admin/users/{$target->id}"],
        ];
    }

    public function test_guests_are_denied_on_every_endpoint(): void
    {
        $target = $this->makeUser('target@example.com');

        foreach ($this->endpoints($target) as [$method, $url]) {
            $this->$method($url, $this->validPayload())->assertUnauthorized();
        }

        $this->assertSame(1, User::count());
    }

    public function test_parents_are_denied_on_every_endpoint(): void
    {
        $parent = $this->makeUser('parent@example.com');
        $target = $this->makeUser('target@example.com');
        Sanctum::actingAs($parent);

        foreach ($this->endpoints($target) as [$method, $url]) {
            $this->$method($url, $this->validPayload(['role' => 'admin']))->assertForbidden();
        }

        $this->assertSame(2, User::count());
        $this->assertSame('parent', $parent->fresh()->role);
        $this->assertSame('parent', $target->fresh()->role);
    }

    // --- Listing ---

    public function test_admin_can_list_accounts_without_sensitive_fields(): void
    {
        $admin = $this->actingAsAdmin();
        $parent = $this->makeUser('parent@example.com');
        $parent->createToken('device');
        Child::create(['user_id' => $parent->id, 'name' => 'Kid']);

        $response = $this->getJson('/api/admin/users')->assertOk()->assertJsonCount(2, 'data');

        foreach ($response->json('data') as $row) {
            $this->assertEqualsCanonicalizing(
                ['id', 'name', 'email', 'role', 'created_at', 'has_child_profile'],
                array_keys($row)
            );
        }

        $byEmail = collect($response->json('data'))->keyBy('email');
        $this->assertTrue($byEmail['parent@example.com']['has_child_profile']);
        $this->assertFalse($byEmail['admin@example.com']['has_child_profile']);

        $body = $response->getContent();
        foreach (['password', 'remember_token', 'token', '$2y$', 'contact_number'] as $secret) {
            $this->assertStringNotContainsString($secret, $body);
        }
    }

    // The admin dashboard's "Total Users" card counts the rows of this list
    // (there is no status column and no soft deletes, so every record counts).
    public function test_the_account_list_the_dashboard_counts_matches_the_real_records(): void
    {
        $this->actingAsAdmin();
        $this->makeUser('one@example.com');
        $this->makeUser('two@example.com');

        $this->getJson('/api/admin/users')->assertOk()->assertJsonCount(3, 'data');
        $this->assertSame(3, User::count());

        $created = $this->postJson('/api/admin/users', $this->validPayload())->assertCreated();
        $this->getJson('/api/admin/users')->assertOk()->assertJsonCount(4, 'data');

        $this->deleteJson('/api/admin/users/'.$created->json('data.id'))->assertOk();
        $this->getJson('/api/admin/users')->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_logged_out_accounts_are_still_counted(): void
    {
        $this->actingAsAdmin();
        $parent = $this->makeUser('parent@example.com');
        $this->assertSame(0, $parent->tokens()->count());

        $this->getJson('/api/admin/users')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_admin_can_view_one_account(): void
    {
        $this->actingAsAdmin();
        $parent = $this->makeUser('parent@example.com');

        $this->getJson("/api/admin/users/{$parent->id}")
            ->assertOk()
            ->assertJsonPath('data.email', 'parent@example.com')
            ->assertJsonMissingPath('data.password');
    }

    // --- Creating ---

    public function test_admin_can_create_an_account_and_the_password_is_hashed(): void
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/admin/users', $this->validPayload())
            ->assertCreated()
            ->assertJsonPath('data.email', 'new@example.com')
            ->assertJsonPath('data.role', 'parent')
            ->assertJsonMissingPath('data.password');

        $stored = User::find($response->json('data.id'));

        $this->assertNotSame('password123', $stored->password);
        $this->assertTrue(Hash::check('password123', $stored->password));
    }

    public function test_admin_can_create_another_admin(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/admin/users', $this->validPayload(['role' => 'admin']))
            ->assertCreated()
            ->assertJsonPath('data.role', 'admin');
    }

    public function test_creating_an_account_validates_input(): void
    {
        $this->actingAsAdmin();
        $this->makeUser('taken@example.com');

        $cases = [
            'nothing' => [[], ['name', 'email', 'password', 'role']],
            'duplicate email' => [$this->validPayload(['email' => 'taken@example.com']), ['email']],
            'bad email' => [$this->validPayload(['email' => 'nope']), ['email']],
            'short password' => [$this->validPayload(['password' => 'short', 'password_confirmation' => 'short']), ['password']],
            'password mismatch' => [$this->validPayload(['password_confirmation' => 'different1']), ['password']],
            'unsupported role' => [$this->validPayload(['role' => 'superadmin']), ['role']],
            'professional role' => [$this->validPayload(['role' => 'professional']), ['role']],
            'name too long' => [$this->validPayload(['name' => str_repeat('a', 256)]), ['name']],
        ];

        foreach ($cases as $label => [$payload, $fields]) {
            $this->postJson('/api/admin/users', $payload)
                ->assertStatus(422, "Expected 422 for: {$label}")
                ->assertJsonValidationErrors($fields);
        }

        $this->assertSame(2, User::count());
    }

    public function test_public_registration_still_cannot_create_admins(): void
    {
        $this->postJson('/api/register', [
            'first_name' => 'Sam',
            'last_name' => 'Sneaky',
            'email' => 'sneaky@example.com',
            'phone' => '09171234567',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin',
        ])->assertCreated()->assertJsonPath('user.role', 'parent');

        $this->assertSame('parent', User::where('email', 'sneaky@example.com')->value('role'));
    }

    // --- Updating and roles ---

    public function test_admin_can_promote_a_parent_to_admin(): void
    {
        $this->actingAsAdmin();
        $parent = $this->makeUser('parent@example.com');

        $this->patchJson("/api/admin/users/{$parent->id}", ['role' => 'admin'])
            ->assertOk()
            ->assertJsonPath('data.role', 'admin');

        $this->assertSame('admin', $parent->fresh()->role);
    }

    public function test_non_admins_cannot_promote_anyone_including_themselves(): void
    {
        $parent = $this->makeUser('parent@example.com');
        Sanctum::actingAs($parent);

        $this->patchJson("/api/admin/users/{$parent->id}", ['role' => 'admin'])->assertForbidden();
        $this->putJson('/api/profile', [
            'name' => 'Parent',
            'email' => 'parent@example.com',
            'role' => 'admin',
        ])->assertOk();

        $this->assertSame('parent', $parent->fresh()->role);
    }

    public function test_updating_name_and_email_preserves_protected_fields(): void
    {
        $this->actingAsAdmin();
        $parent = $this->makeUser('parent@example.com');
        $parent->forceFill(['contact_number' => '09171234567'])->save();
        $originalPassword = $parent->fresh()->password;

        $this->patchJson("/api/admin/users/{$parent->id}", [
            'name' => 'Renamed',
            'email' => 'renamed@example.com',
            'password' => 'hacked-pass-1',
            'contact_number' => '000',
        ])->assertOk()->assertJsonPath('data.name', 'Renamed');

        $fresh = $parent->fresh();
        $this->assertSame('renamed@example.com', $fresh->email);
        $this->assertSame('parent', $fresh->role);
        $this->assertSame($originalPassword, $fresh->password);
        $this->assertSame('09171234567', $fresh->contact_number);
    }

    public function test_update_validates_input(): void
    {
        $this->actingAsAdmin();
        $this->makeUser('taken@example.com');
        $parent = $this->makeUser('parent@example.com');

        $this->patchJson("/api/admin/users/{$parent->id}", ['role' => 'superadmin'])
            ->assertStatus(422)->assertJsonValidationErrors('role');

        $this->patchJson("/api/admin/users/{$parent->id}", ['email' => 'taken@example.com'])
            ->assertStatus(422)->assertJsonValidationErrors('email');

        $this->patchJson("/api/admin/users/{$parent->id}", ['name' => ''])
            ->assertStatus(422)->assertJsonValidationErrors('name');

        // Keeping your own email is not a duplicate.
        $this->patchJson("/api/admin/users/{$parent->id}", ['email' => 'parent@example.com'])
            ->assertOk();

        $this->assertSame('parent', $parent->fresh()->role);
    }

    public function test_the_last_administrator_cannot_be_demoted(): void
    {
        $admin = $this->actingAsAdmin();

        $this->patchJson("/api/admin/users/{$admin->id}", ['role' => 'parent'])
            ->assertStatus(409)
            ->assertJsonPath('code', 'last_admin');

        $this->assertSame('admin', $admin->fresh()->role);
    }

    public function test_an_admin_can_be_demoted_when_another_admin_exists_and_logins_are_revoked(): void
    {
        $this->actingAsAdmin();
        $other = $this->makeUser('other@example.com', 'admin');
        $other->createToken('device');

        $this->patchJson("/api/admin/users/{$other->id}", ['role' => 'parent'])
            ->assertOk()
            ->assertJsonPath('data.role', 'parent');

        $this->assertSame('parent', $other->fresh()->role);
        $this->assertSame(0, $other->tokens()->count());
    }

    public function test_changing_only_the_name_does_not_revoke_logins(): void
    {
        $this->actingAsAdmin();
        $parent = $this->makeUser('parent@example.com');
        $parent->createToken('device');

        $this->patchJson("/api/admin/users/{$parent->id}", ['name' => 'Renamed'])->assertOk();

        $this->assertSame(1, $parent->tokens()->count());
    }

    // --- Deleting ---

    public function test_an_admin_cannot_delete_their_own_account(): void
    {
        $admin = $this->actingAsAdmin();
        $this->makeUser('second@example.com', 'admin');

        $this->deleteJson("/api/admin/users/{$admin->id}")
            ->assertStatus(409)
            ->assertJsonPath('code', 'cannot_delete_self');

        $this->assertNotNull($admin->fresh());
    }

    public function test_the_only_administrator_cannot_delete_themselves(): void
    {
        $admin = $this->actingAsAdmin();

        $this->deleteJson("/api/admin/users/{$admin->id}")->assertStatus(409);

        $this->assertSame(1, User::where('role', 'admin')->count());
    }

    public function test_another_admin_can_be_deleted_while_one_remains(): void
    {
        $this->actingAsAdmin();
        $other = $this->makeUser('other@example.com', 'admin');

        $this->deleteJson("/api/admin/users/{$other->id}")->assertOk();

        $this->assertNull($other->fresh());
        $this->assertSame(1, User::where('role', 'admin')->count());
    }

    public function test_deleting_a_parent_keeps_feedback_and_activities_and_removes_tokens(): void
    {
        $admin = $this->actingAsAdmin();
        $parent = $this->makeUser('parent@example.com');
        $parent->createToken('device');

        $feedback = new Feedback(['message' => 'Great', 'rating' => 5]);
        $feedback->user_id = $parent->id;
        $feedback->save();

        $activity = new Activity([
            'title' => 'Made By Parent',
            'instructions' => ['Step'],
            'materials' => [],
        ]);
        $activity->created_by = $parent->id;
        $activity->save();

        $this->deleteJson("/api/admin/users/{$parent->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Account deleted.');

        $this->assertNull($parent->fresh());
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $parent->id]);

        // Required records survive with the user reference cleared.
        $this->assertDatabaseHas('feedback', ['id' => $feedback->id, 'user_id' => null]);
        $this->assertDatabaseHas('activities', ['id' => $activity->id, 'created_by' => null]);
        $this->assertNotNull($admin->fresh());
    }

    public function test_an_account_with_a_child_profile_cannot_be_deleted(): void
    {
        $this->actingAsAdmin();
        $parent = $this->makeUser('parent@example.com');
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Kid']);
        $activity = new Activity(['title' => 'A', 'instructions' => ['s'], 'materials' => []]);
        $activity->is_published = true;
        $activity->save();
        $progress = ActivityProgress::create([
            'child_id' => $child->id,
            'activity_id' => $activity->id,
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        $this->deleteJson("/api/admin/users/{$parent->id}")
            ->assertStatus(409)
            ->assertJsonPath('code', 'has_child_profile');

        $this->assertNotNull($parent->fresh());
        $this->assertNotNull($child->fresh());
        $this->assertNotNull($progress->fresh());
    }

    // --- Missing accounts ---

    public function test_missing_accounts_return_404(): void
    {
        $this->actingAsAdmin();

        $this->getJson('/api/admin/users/9999')->assertNotFound();
        $this->patchJson('/api/admin/users/9999', ['name' => 'X'])->assertNotFound();
        $this->deleteJson('/api/admin/users/9999')->assertNotFound();
    }
}
