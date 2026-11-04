<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminInitializationTest extends TestCase
{
    use RefreshDatabase;

    private const EMAIL = 'theraplay.system@gmail.com';
    private const PASSWORD = 'Owner-Chosen-Pass-1';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'theraplay.admin.email' => self::EMAIL,
            'theraplay.admin.password' => self::PASSWORD,
            'mail.mailers.smtp.password' => 'mail-app-password-xyz',
        ]);
    }

    public function test_it_creates_the_verified_admin_with_a_hashed_password(): void
    {
        $this->artisan('admin:initialize')->assertSuccessful();

        $admin = User::where('email', self::EMAIL)->firstOrFail();
        $this->assertSame('admin', $admin->role);
        $this->assertNotNull($admin->email_verified_at);
        $this->assertNotSame(self::PASSWORD, $admin->password);
        $this->assertTrue(Hash::check(self::PASSWORD, $admin->password));
        $this->assertStringNotContainsString(self::PASSWORD, (string) json_encode($admin->toArray()));
    }

    public function test_running_it_again_creates_no_duplicate_and_keeps_the_password(): void
    {
        $this->artisan('admin:initialize')->assertSuccessful();
        $hash = User::where('email', self::EMAIL)->value('password');

        config(['theraplay.admin.password' => 'A-Different-Pass-2']);
        $this->artisan('admin:initialize')->assertSuccessful();

        $this->assertSame(1, User::where('email', self::EMAIL)->count());
        $this->assertSame($hash, User::where('email', self::EMAIL)->value('password'));
    }

    public function test_an_existing_unverified_admin_is_only_marked_verified(): void
    {
        $admin = User::create(['name' => 'Old', 'email' => self::EMAIL, 'password' => 'existing-pass-1']);
        $admin->forceFill(['role' => 'admin', 'email_verified_at' => null])->save();
        $hash = $admin->fresh()->password;

        $this->artisan('admin:initialize')->assertSuccessful();

        $fresh = $admin->fresh();
        $this->assertNotNull($fresh->email_verified_at);
        $this->assertSame($hash, $fresh->password);
    }

    public function test_an_existing_parent_with_that_email_is_a_conflict_and_is_not_changed(): void
    {
        $parent = User::create(['name' => 'Parent', 'email' => 'THERAPLAY.system@gmail.com', 'password' => 'parent-pass-123']);
        $parent->forceFill(['role' => 'parent', 'email_verified_at' => null])->save();
        $hash = $parent->fresh()->password;

        $this->artisan('admin:initialize')->assertFailed();

        $fresh = $parent->fresh();
        $this->assertSame('parent', $fresh->role);
        $this->assertNull($fresh->email_verified_at);
        $this->assertSame($hash, $fresh->password);
        $this->assertSame(1, User::count());
    }

    public function test_nothing_is_created_without_a_password(): void
    {
        config(['theraplay.admin.password' => null]);

        $this->artisan('admin:initialize')->assertFailed();

        $this->assertSame(0, User::count());
    }

    public function test_a_short_password_or_the_mail_app_password_is_refused(): void
    {
        config(['theraplay.admin.password' => 'short']);
        $this->artisan('admin:initialize')->assertFailed();

        config(['theraplay.admin.password' => 'mail-app-password-xyz']);
        $this->artisan('admin:initialize')->assertFailed();

        $this->assertSame(0, User::count());
    }

    public function test_the_admin_can_log_in_and_use_admin_routes_but_a_parent_cannot(): void
    {
        $this->artisan('admin:initialize')->assertSuccessful();

        $token = $this->postJson('/api/login', ['email' => self::EMAIL, 'password' => self::PASSWORD])
            ->assertOk()
            ->assertJsonPath('user.role', 'admin')
            ->json('token');

        $this->withToken($token)->getJson('/api/admin/users')->assertOk();

        $parent = User::create(['name' => 'Parent', 'email' => 'parent@example.com', 'password' => 'parent-pass-123']);
        $parent->forceFill(['role' => 'parent', 'email_verified_at' => now()])->save();
        $parentToken = $this->postJson('/api/login', ['email' => 'parent@example.com', 'password' => 'parent-pass-123'])
            ->assertOk()->json('token');

        // One test process reuses the auth guard between requests; a real request does not.
        $this->app["auth"]->forgetGuards();
        $this->withToken($parentToken)->getJson('/api/admin/users')->assertForbidden();
        $this->app["auth"]->forgetGuards();
        $this->flushHeaders()->getJson('/api/admin/users')->assertUnauthorized();
    }

    public function test_registration_cannot_use_the_admin_address_or_choose_a_role(): void
    {
        $payload = [
            'first_name' => 'Eve', 'last_name' => 'Evil', 'phone' => '0917',
            'password' => 'password123', 'password_confirmation' => 'password123',
        ];

        $this->postJson('/api/register', $payload + ['email' => 'Theraplay.System@gmail.com'])
            ->assertStatus(422)->assertJsonValidationErrors('email');
        $this->assertSame(0, User::count());

        $this->postJson('/api/register', $payload + ['email' => 'eve@example.com', 'role' => 'admin'])->assertCreated();
        $this->assertSame('parent', User::where('email', 'eve@example.com')->value('role'));
    }
}
