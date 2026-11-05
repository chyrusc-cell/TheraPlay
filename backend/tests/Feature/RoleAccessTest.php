<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoleAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // A route that exists only inside these tests, so the middleware can
        // be checked without adding a fake endpoint to the real application.
        Route::middleware(['api', 'auth:sanctum', 'role:admin'])
            ->get('/api/_test/admin-only', fn () => response()->json(['ok' => true]));
    }

    private function makeUser(string $email, string $role = 'parent'): User
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => $email,
            'password' => 'password123',
        ]);

        // role is set explicitly because it is not mass-assignable by clients.
        $user->forceFill(['role' => $role])->save();

        return $user;
    }

    // --- Middleware ---

    public function test_guest_gets_401_on_an_admin_endpoint(): void
    {
        $this->getJson('/api/_test/admin-only')->assertUnauthorized();
    }

    public function test_parent_gets_403_on_an_admin_endpoint(): void
    {
        Sanctum::actingAs($this->makeUser('parent@example.com'));

        $this->getJson('/api/_test/admin-only')
            ->assertForbidden()
            ->assertJsonMissing(['ok' => true]);
    }

    public function test_admin_can_access_an_admin_endpoint(): void
    {
        Sanctum::actingAs($this->makeUser('admin@example.com', 'admin'));

        $this->getJson('/api/_test/admin-only')
            ->assertOk()
            ->assertJson(['ok' => true]);
    }

    public function test_role_is_read_from_the_database_not_the_request(): void
    {
        Sanctum::actingAs($this->makeUser('parent@example.com'));

        $this->getJson('/api/_test/admin-only?role=admin', ['X-Role' => 'admin'])
            ->assertForbidden();
    }

    // --- Registration ---

    private function registrationPayload(array $extra = []): array
    {
        return array_merge([
            'first_name' => 'Sam',
            'last_name' => 'Parent',
            'email' => 'new@example.com',
            'phone' => '09171234567',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], $extra);
    }

    public function test_registration_always_creates_a_parent(): void
    {
        $this->postJson('/api/register', $this->registrationPayload())
            ->assertCreated()
            ->assertJsonPath('user.role', 'parent');

        $this->assertSame('parent', User::where('email', 'new@example.com')->value('role'));
    }

    public function test_registration_ignores_a_submitted_admin_role(): void
    {
        foreach (['role', 'is_admin', 'type'] as $field) {
            $value = $field === 'is_admin' ? true : 'admin';

            $this->postJson('/api/register', $this->registrationPayload([
                $field => $value,
                'email' => "{$field}@example.com",
            ]))
                ->assertCreated()
                ->assertJsonPath('user.role', 'parent');

            $this->assertSame(
                'parent',
                User::where('email', "{$field}@example.com")->value('role')
            );
        }

        $this->assertSame(0, User::where('role', 'admin')->count());
    }

    public function test_profile_update_cannot_change_the_role(): void
    {
        $user = $this->makeUser('parent@example.com');
        Sanctum::actingAs($user);

        $this->putJson('/api/profile', [
            'name' => 'Changed',
            'email' => 'parent@example.com',
            'role' => 'admin',
        ])->assertOk()->assertJsonPath('user.role', 'parent');

        $this->assertSame('parent', $user->fresh()->role);
    }

    // --- Role in login and /api/user ---

    public function test_login_and_user_endpoints_return_the_role_without_secrets(): void
    {
        $this->makeUser('admin@example.com', 'admin');

        $login = $this->postJson('/api/login', [
            'email' => 'admin@example.com',
            'password' => 'password123',
        ])->assertOk()->assertJsonPath('user.role', 'admin');

        $this->assertArrayNotHasKey('password', $login->json('user'));

        $this->withToken($login->json('token'))
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('role', 'admin')
            ->assertJsonMissingPath('password')
            ->assertJsonMissingPath('remember_token');
    }

    // --- Promote command ---

    public function test_promote_command_promotes_an_existing_user_after_confirmation(): void
    {
        $user = $this->makeUser('parent@example.com');

        $this->artisan('user:promote-admin', ['email' => 'parent@example.com'])
            ->expectsConfirmation("Promote Test User <parent@example.com> from 'parent' to 'admin'?", 'yes')
            ->assertSuccessful();

        $this->assertSame('admin', $user->fresh()->role);
    }

    public function test_promote_command_changes_nothing_if_not_confirmed(): void
    {
        $user = $this->makeUser('parent@example.com');

        $this->artisan('user:promote-admin', ['email' => 'parent@example.com'])
            ->expectsConfirmation("Promote Test User <parent@example.com> from 'parent' to 'admin'?", 'no')
            ->assertFailed();

        $this->assertSame('parent', $user->fresh()->role);
    }

    public function test_promote_command_rejects_unknown_and_invalid_emails(): void
    {
        $this->makeUser('parent@example.com');

        $this->artisan('user:promote-admin', ['email' => 'nobody@example.com', '--force' => true])
            ->assertFailed();

        $this->artisan('user:promote-admin', ['email' => 'not-an-email', '--force' => true])
            ->assertFailed();

        $this->assertSame(0, User::where('role', 'admin')->count());
    }

    public function test_promote_command_leaves_existing_admins_untouched(): void
    {
        $admin = $this->makeUser('admin@example.com', 'admin');

        $this->artisan('user:promote-admin', ['email' => 'admin@example.com'])
            ->assertSuccessful();

        $this->assertSame('admin', $admin->fresh()->role);
    }
}
