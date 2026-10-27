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

class ChildProfileTest extends TestCase
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

    private function makeActivity(): Activity
    {
        $category = Category::firstOrCreate(['name' => 'Fine Motor']);

        return Activity::create([
            'category_id' => $category->id,
            'title' => 'Button Practice',
            'instructions' => ['Step one'],
            'materials' => ['Board'],
            'is_published' => true,
        ]);
    }

    public function test_guests_cannot_create_a_child(): void
    {
        $this->postJson('/api/children', ['name' => 'Kid'])->assertUnauthorized();

        $this->assertSame(0, Child::count());
    }

    public function test_parent_can_create_a_child_linked_to_themselves(): void
    {
        $parent = $this->makeUser('a@example.com');
        Sanctum::actingAs($parent);

        $response = $this->postJson('/api/children', ['name' => '  Sam  '])
            ->assertCreated()
            ->assertJsonPath('data.child.name', 'Sam');

        $this->assertDatabaseHas('children', [
            'id' => $response->json('data.child.id'),
            'user_id' => $parent->id,
            'name' => 'Sam',
        ]);

        // Only safe fields come back.
        $this->assertSame(
            ['id', 'name', 'created_at'],
            array_keys($response->json('data.child'))
        );
    }

    public function test_invalid_or_missing_names_are_rejected(): void
    {
        Sanctum::actingAs($this->makeUser('a@example.com'));

        $this->postJson('/api/children', [])
            ->assertStatus(422)->assertJsonValidationErrors('name');

        $this->postJson('/api/children', ['name' => ''])
            ->assertStatus(422)->assertJsonValidationErrors('name');

        $this->postJson('/api/children', ['name' => ['not', 'a', 'string']])
            ->assertStatus(422)->assertJsonValidationErrors('name');

        $this->postJson('/api/children', ['name' => str_repeat('a', 256)])
            ->assertStatus(422)->assertJsonValidationErrors('name');

        $this->assertSame(0, Child::count());
    }

    public function test_parent_cannot_create_a_second_child(): void
    {
        $parent = $this->makeUser('a@example.com');
        Child::create(['user_id' => $parent->id, 'name' => 'First']);
        Sanctum::actingAs($parent);

        $this->postJson('/api/children', ['name' => 'Second'])
            ->assertStatus(422)
            ->assertJsonPath('code', 'child_profile_exists');

        $this->assertSame(1, Child::where('user_id', $parent->id)->count());
        $this->assertSame('First', $parent->child->name);
    }

    public function test_client_supplied_user_id_is_ignored(): void
    {
        $me = $this->makeUser('a@example.com');
        $other = $this->makeUser('b@example.com');
        Sanctum::actingAs($me);

        $this->postJson('/api/children', [
            'name' => 'Mine',
            'user_id' => $other->id,
        ])->assertCreated();

        $this->assertSame('Mine', $me->child()->first()->name);
        $this->assertNull($other->child()->first());
    }

    public function test_creating_a_child_does_not_touch_another_parents_child(): void
    {
        $me = $this->makeUser('a@example.com');
        $other = $this->makeUser('b@example.com');
        $otherChild = Child::create(['user_id' => $other->id, 'name' => 'Other']);
        Sanctum::actingAs($me);

        $this->postJson('/api/children', ['name' => 'Mine'])->assertCreated();

        $this->assertSame('Other', $otherChild->fresh()->name);
        $this->assertSame($other->id, $otherChild->fresh()->user_id);
        $this->assertSame(2, Child::count());
    }

    public function test_parent_without_a_child_can_create_one_then_complete_an_activity(): void
    {
        $activity = $this->makeActivity();
        $parent = $this->makeUser('a@example.com');
        Sanctum::actingAs($parent);

        // 1. Completion is refused with a code the frontend can act on.
        $this->postJson("/api/activities/{$activity->id}/complete")
            ->assertStatus(422)
            ->assertJsonPath('code', 'child_profile_required');

        // 2. Create the child.
        $this->postJson('/api/children', ['name' => 'Sam'])->assertCreated();

        // 3. Retry the completion.
        $this->postJson("/api/activities/{$activity->id}/complete")
            ->assertCreated()
            ->assertJsonPath('data.record.status', 'completed');

        // 4. Completing again does not duplicate the record.
        $this->postJson("/api/activities/{$activity->id}/complete")->assertOk();
        $this->assertSame(1, ActivityProgress::count());

        // 5. It appears in Progress.
        $this->getJson('/api/progress')
            ->assertOk()
            ->assertJsonCount(1, 'data.records')
            ->assertJsonPath('data.records.0.status', 'completed');
    }
}
