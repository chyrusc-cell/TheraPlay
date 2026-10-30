<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LogoutTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $email): User
    {
        return User::create([
            'name' => 'Test Parent',
            'email' => $email,
            'password' => 'password123',
            'role' => 'parent',
        ]);
    }

    public function test_guests_cannot_log_out(): void
    {
        $this->postJson('/api/logout')->assertUnauthorized();
    }

    public function test_logout_revokes_only_the_current_token(): void
    {
        $user = $this->makeUser('a@example.com');
        $phone = $user->createToken('phone')->plainTextToken;
        $laptop = $user->createToken('laptop')->plainTextToken;

        $this->withToken($phone)
            ->postJson('/api/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Logged out successfully.');

        $this->assertSame(1, $user->tokens()->count());

        // Forget the user cached from the previous request.
        $this->app['auth']->forgetGuards();

        // The revoked token no longer works...
        $this->withToken($phone)->getJson('/api/user')->assertUnauthorized();

        $this->app['auth']->forgetGuards();

        // ...while the other device's token still does.
        $this->withToken($laptop)->getJson('/api/user')->assertOk();
    }

    public function test_an_admin_can_log_out_and_the_token_stops_working(): void
    {
        $admin = $this->makeUser('admin@example.com');
        $admin->forceFill(['role' => 'admin'])->save();
        $token = $admin->createToken('browser')->plainTextToken;

        $this->withToken($token)->postJson('/api/logout')->assertOk();

        $this->assertSame(0, $admin->tokens()->count());
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/admin/feedback')->assertUnauthorized();
    }

    public function test_a_manipulated_request_cannot_revoke_someone_elses_token(): void
    {
        $me = $this->makeUser('a@example.com');
        $victim = $this->makeUser('b@example.com');
        $victimToken = $victim->createToken('victim');
        $victimPlain = $victimToken->plainTextToken;
        $mine = $me->createToken('mine')->plainTextToken;

        // The only token that can be revoked is the one sent in the Authorization
        // header. Ids and tokens in the body or the query string are ignored.
        $this->withToken($mine)->postJson('/api/logout?token_id='.$victimToken->accessToken->id.'&user_id='.$victim->id, [
            'token' => $victimPlain,
            'token_id' => $victimToken->accessToken->id,
            'user_id' => $victim->id,
            'id' => $victim->id,
            'email' => 'b@example.com',
        ])->assertOk();

        $this->assertSame(0, $me->tokens()->count());
        $this->assertSame(1, $victim->tokens()->count());

        $this->app['auth']->forgetGuards();
        $this->withToken($victimPlain)->getJson('/api/user')->assertOk();
    }

    public function test_logging_out_twice_with_the_same_token_is_refused_the_second_time(): void
    {
        $user = $this->makeUser('a@example.com');
        $token = $user->createToken('t')->plainTextToken;

        $this->withToken($token)->postJson('/api/logout')->assertOk();
        $this->app['auth']->forgetGuards();

        // The app treats this 401 as "already logged out" and clears its own copy.
        $this->withToken($token)->postJson('/api/logout')->assertUnauthorized();
    }

    public function test_a_made_up_token_cannot_log_out_anyone(): void
    {
        $user = $this->makeUser('a@example.com');
        $user->createToken('t');

        $this->withToken('999|not-a-real-token')->postJson('/api/logout')->assertUnauthorized();

        $this->assertSame(1, $user->tokens()->count());
    }

    public function test_an_expired_token_is_rejected_by_logout_and_by_every_other_route(): void
    {
        config(['sanctum.expiration' => 60]);
        $user = $this->makeUser('a@example.com');
        $token = $user->createToken('t')->plainTextToken;
        \Laravel\Sanctum\PersonalAccessToken::query()->update(['created_at' => now()->subMinutes(61)]);

        $this->withToken($token)->getJson('/api/user')->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->postJson('/api/logout')->assertUnauthorized();
    }

    public function test_an_account_that_must_verify_its_email_can_still_log_out(): void
    {
        config(['auth.verification.enforced_from' => now()->subDay()->toDateTimeString()]);
        $user = $this->makeUser('new@example.com');
        $token = $user->createToken('t')->plainTextToken;

        $this->withToken($token)->getJson('/api/children')->assertForbidden();
        $this->withToken($token)->postJson('/api/logout')->assertOk();

        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_the_session_check_returns_the_role_the_app_needs_to_restore_a_login(): void
    {
        $parent = $this->makeUser('p@example.com');
        $admin = $this->makeUser('ad@example.com');
        $admin->forceFill(['role' => 'admin'])->save();

        $this->withToken($parent->createToken('t')->plainTextToken)->getJson('/api/user')
            ->assertOk()->assertJsonPath('role', 'parent')->assertJsonMissingPath('password');
        $this->app['auth']->forgetGuards();
        $this->withToken($admin->createToken('t')->plainTextToken)->getJson('/api/user')
            ->assertOk()->assertJsonPath('role', 'admin');
    }

    public function test_logout_does_not_touch_another_users_tokens(): void
    {
        $me = $this->makeUser('a@example.com');
        $other = $this->makeUser('b@example.com');
        $other->createToken('other');
        $mine = $me->createToken('mine')->plainTextToken;

        $this->withToken($mine)->postJson('/api/logout')->assertOk();

        $this->assertSame(0, $me->tokens()->count());
        $this->assertSame(1, $other->tokens()->count());
    }
}
