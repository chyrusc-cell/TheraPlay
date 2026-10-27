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
