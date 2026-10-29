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

class ActivityCompletionTest extends TestCase
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

    private function makeActivity(bool $published = true): Activity
    {
        $category = Category::firstOrCreate(['name' => 'Fine Motor']);

        return Activity::create([
            'category_id' => $category->id,
            'title' => 'Button Practice',
            'objective' => 'Practice buttons.',
            'instructions' => ['Step one'],
            'materials' => ['Board'],
            'is_published' => $published,
        ]);
    }

    public function test_show_returns_full_activity_details(): void
    {
        $activity = $this->makeActivity();

        $this->getJson("/api/activities/{$activity->id}")
            ->assertOk()
            ->assertJsonPath('data.title', 'Button Practice')
            ->assertJsonPath('data.category', 'Fine Motor')
            ->assertJsonPath('data.instructions', ['Step one'])
            ->assertJsonPath('data.materials', ['Board']);
    }

    public function test_show_returns_404_for_missing_or_unpublished_activity(): void
    {
        $draft = $this->makeActivity(published: false);

        $this->getJson('/api/activities/9999')->assertNotFound();
        $this->getJson("/api/activities/{$draft->id}")->assertNotFound();
    }

    public function test_guests_cannot_complete_an_activity(): void
    {
        $activity = $this->makeActivity();

        $this->postJson("/api/activities/{$activity->id}/complete")
            ->assertUnauthorized();

        $this->assertSame(0, ActivityProgress::count());
    }

    public function test_user_without_a_child_cannot_complete_and_no_child_is_created(): void
    {
        $activity = $this->makeActivity();
        Sanctum::actingAs($this->makeUser('a@example.com'));

        $this->postJson("/api/activities/{$activity->id}/complete")
            ->assertStatus(422);

        $this->assertSame(0, Child::count());
        $this->assertSame(0, ActivityProgress::count());
    }

    public function test_completing_an_unknown_activity_returns_404(): void
    {
        $user = $this->makeUser('a@example.com');
        Child::create(['user_id' => $user->id, 'name' => 'Kid']);
        Sanctum::actingAs($user);

        $this->postJson('/api/activities/9999/complete')->assertNotFound();
    }

    public function test_user_can_complete_an_activity_and_repeating_does_not_duplicate(): void
    {
        $activity = $this->makeActivity();
        $user = $this->makeUser('a@example.com');
        $child = Child::create(['user_id' => $user->id, 'name' => 'Kid']);
        Sanctum::actingAs($user);

        $first = $this->postJson("/api/activities/{$activity->id}/complete")
            ->assertCreated()
            ->assertJsonPath('data.record.status', 'completed');

        $this->assertNotNull($first->json('data.record.completed_at'));

        $this->postJson("/api/activities/{$activity->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.record.id', $first->json('data.record.id'));

        $this->assertSame(1, ActivityProgress::where('child_id', $child->id)->count());

        // The saved record shows up in the Progress API.
        $this->getJson('/api/progress')
            ->assertOk()
            ->assertJsonCount(1, 'data.records')
            ->assertJsonPath('data.records.0.status', 'completed');
    }

    public function test_existing_in_progress_record_is_updated_not_duplicated(): void
    {
        $activity = $this->makeActivity();
        $user = $this->makeUser('a@example.com');
        $child = Child::create(['user_id' => $user->id, 'name' => 'Kid']);
        $record = ActivityProgress::create([
            'child_id' => $child->id,
            'activity_id' => $activity->id,
            'status' => 'in_progress',
            'started_at' => now()->subHour(),
        ]);
        Sanctum::actingAs($user);

        $this->postJson("/api/activities/{$activity->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.record.id', $record->id)
            ->assertJsonPath('data.record.status', 'completed');

        $this->assertSame(1, ActivityProgress::count());
    }

    public function test_another_parents_child_id_is_rejected_and_other_users_are_untouched(): void
    {
        $activity = $this->makeActivity();
        $me = $this->makeUser('a@example.com');
        $other = $this->makeUser('b@example.com');
        $myChild = Child::create(['user_id' => $me->id, 'name' => 'Mine']);
        $otherChild = Child::create(['user_id' => $other->id, 'name' => 'Other']);
        Sanctum::actingAs($me);

        // Someone else's child is "not found": nothing is recorded for anyone.
        $this->postJson("/api/activities/{$activity->id}/complete", [
            'child_id' => $otherChild->id,
            'user_id' => $other->id,
        ])->assertNotFound();

        $this->assertSame(0, ActivityProgress::count());

        // A forged user_id alone is ignored; the parent's own child is used.
        $this->postJson("/api/activities/{$activity->id}/complete", ['user_id' => $other->id])->assertCreated();

        $this->assertSame(1, ActivityProgress::where('child_id', $myChild->id)->count());
        $this->assertSame(0, ActivityProgress::where('child_id', $otherChild->id)->count());
    }
}
