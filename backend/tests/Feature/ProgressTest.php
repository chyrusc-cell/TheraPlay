<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityProgress;
use App\Models\Category;
use App\Models\Child;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProgressTest extends TestCase
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

    private function makeActivity(string $title): Activity
    {
        $category = Category::firstOrCreate(['name' => 'Fine Motor']);

        return Activity::create([
            'category_id' => $category->id,
            'title' => $title,
            'instructions' => ['Step one'],
            'materials' => ['Board'],
            'is_published' => true,
        ]);
    }

    public function test_guests_cannot_read_progress(): void
    {
        $this->getJson('/api/progress')->assertUnauthorized();
    }

    public function test_user_without_a_child_gets_empty_progress(): void
    {
        Sanctum::actingAs($this->makeUser('a@example.com'));

        $this->getJson('/api/progress')
            ->assertOk()
            ->assertExactJson(['data' => ['records' => []]]);
    }

    public function test_user_sees_only_their_own_progress(): void
    {
        $mine = $this->makeUser('a@example.com');
        $other = $this->makeUser('b@example.com');

        $myChild = Child::create(['user_id' => $mine->id, 'name' => 'Mine']);
        $otherChild = Child::create(['user_id' => $other->id, 'name' => 'Other']);

        $activity = $this->makeActivity('Button Practice');

        ActivityProgress::create([
            'child_id' => $myChild->id,
            'activity_id' => $activity->id,
            'status' => 'completed',
            'started_at' => now()->subHour(),
            'completed_at' => now(),
        ]);

        ActivityProgress::create([
            'child_id' => $otherChild->id,
            'activity_id' => $activity->id,
            'status' => 'in_progress',
            'started_at' => now(),
        ]);

        Sanctum::actingAs($mine);

        $response = $this->getJson('/api/progress')->assertOk();

        $response->assertJsonCount(1, 'data.records')
            ->assertJsonPath('data.records.0.activity_title', 'Button Practice')
            ->assertJsonPath('data.records.0.category', 'Fine Motor')
            ->assertJsonPath('data.records.0.status', 'completed');

        // No account details leak into the response.
        $this->assertStringNotContainsString('password', $response->getContent());
        $this->assertStringNotContainsString('b@example.com', $response->getContent());
    }
}
