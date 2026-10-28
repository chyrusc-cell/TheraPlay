<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_is_rate_limited_after_repeated_failures(): void
    {
        User::create(['name' => 'P', 'email' => 'p@example.com', 'password' => 'password123']);

        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/login', ['email' => 'p@example.com', 'password' => 'wrong'])
                ->assertStatus(401);
        }

        $this->postJson('/api/login', ['email' => 'p@example.com', 'password' => 'password123'])
            ->assertStatus(429);
    }

    public function test_admins_cannot_create_a_child_profile(): void
    {
        $admin = User::create(['name' => 'A', 'email' => 'a@example.com', 'password' => 'password123']);
        $admin->forceFill(['role' => 'admin'])->save();
        Sanctum::actingAs($admin);

        $this->postJson('/api/children', ['name' => 'Kid'])->assertForbidden();
        $this->assertDatabaseCount('children', 0);
    }

    public function test_parents_can_still_create_their_child_profile(): void
    {
        Sanctum::actingAs(User::create(['name' => 'P', 'email' => 'p@example.com', 'password' => 'password123'])->fresh());

        $this->postJson('/api/children', ['name' => 'Kid'])->assertCreated();
    }
}
